"use client";

import { useEffect, useRef, useState } from "react";
import { Gamepad2, RotateCcw } from "lucide-react";
import { useTheme } from "next-themes";

interface StackGameSectionProps {
  settings?: any;
  technologies: any[];
  gameSettings?: any;
  isPreview?: boolean;
}

export default function StackGameSection({
  settings,
  technologies,
  gameSettings,
  isPreview = false,
}: StackGameSectionProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { resolvedTheme } = useTheme();

  // Use DB game settings, fallback to standard settings
  const mode = gameSettings?.mode || settings?.mode || "ROTATING_SPHERE";
  const ballCount = gameSettings?.ballCount || settings?.ballCount || 12;
  const ballSize = gameSettings?.ballSize || settings?.ballSize || 1.0;
  const fallingSpeed = gameSettings?.fallingSpeed || settings?.fallingSpeed || 1.0;
  
  const [score, setScore] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [activeMessage, setActiveMessage] = useState("Click canvas to interact");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || mode === "STATIC_FALLBACK") return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Resolve theme colors from the CSS variable system so the canvas scene
    // matches the active template + light/dark mode. Canvas 2D cannot parse
    // var() strings, so values must be read via getComputedStyle. The effect
    // re-runs on resolvedTheme change (see deps), re-reading these.
    const styles = getComputedStyle(canvas);
    const cssVar = (name: string, fallback: string) =>
      styles.getPropertyValue(name).trim() || fallback;
    const isDarkTheme = resolvedTheme !== "light";
    const accentColor = cssVar("--accent", isDarkTheme ? "#6366F1" : "#2563EB");
    const accentAltColor = cssVar("--violet", isDarkTheme ? "#818CF8" : "#7C3AED");
    const inkSoftColor = cssVar("--ink-soft", isDarkTheme ? "#9C9CA8" : "#555555");
    // Neutral overlay ink for card fills/strokes/ground (white on dark, black on light)
    const neutral = (alpha: number) =>
      isDarkTheme ? `rgba(255, 255, 255, ${alpha})` : `rgba(17, 17, 17, ${alpha})`;

    let animationId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 600);
    let height = (canvas.height = 400);

    const handleResize = () => {
      width = canvas.width = canvas.parentElement?.clientWidth || 600;
      height = canvas.height = 400;
    };
    window.addEventListener("resize", handleResize);

    // Mouse coordinate tracking
    let mouse = { x: width / 2, y: height / 2, isDown: false };
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };
    const handleMouseDown = () => {
      mouse.isDown = true;
    };
    const handleMouseUp = () => {
      mouse.isDown = false;
    };

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mouseup", handleMouseUp);

    // Touch coordinate tracking — mirrors mouse handlers so the sphere/floating-balls
    // modes rotate/repel on drag and the falling game responds to taps on touch devices.
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      mouse.x = touch.clientX - rect.left;
      mouse.y = touch.clientY - rect.top;
    };
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      mouse.x = touch.clientX - rect.left;
      mouse.y = touch.clientY - rect.top;
      mouse.isDown = true;
    };
    const handleTouchEnd = () => {
      mouse.isDown = false;
    };

    canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
    canvas.addEventListener("touchstart", handleTouchStart, { passive: true });
    canvas.addEventListener("touchend", handleTouchEnd, { passive: true });

    // Select technologies list
    const techList = technologies.filter(t => t.showInGame || t.showInStack).slice(0, ballCount);
    const fallbackTechs = ["React", "Prisma", "Postgres", "Next.js", "Docker", "CSS", "Tailwind", "Rust"];
    const displayNames = techList.length > 0 ? techList.map((t) => t.name) : fallbackTechs;

    // --- Mode 1: ROTATING SPHERE ---
    interface SphereNode {
      x3d: number;
      y3d: number;
      z3d: number;
      name: string;
    }
    const sphereNodes: SphereNode[] = [];
    if (mode === "ROTATING_SPHERE") {
      const count = displayNames.length;
      for (let i = 0; i < count; i++) {
        const phi = Math.acos(-1 + (2 * i) / count);
        const theta = Math.sqrt(count * Math.PI) * phi;
        sphereNodes.push({
          x3d: 150 * Math.sin(phi) * Math.cos(theta),
          y3d: 150 * Math.sin(phi) * Math.sin(theta),
          z3d: 150 * Math.cos(phi),
          name: displayNames[i],
        });
      }
    }

    // --- Mode 2: FLOATING BALLS ---
    interface FloatingBall {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      name: string;
      color: string;
    }
    const floatingBalls: FloatingBall[] = [];
    if (mode === "FLOATING_BALLS") {
      displayNames.forEach((name, i) => {
        floatingBalls.push({
          x: Math.random() * (width - 120) + 60,
          y: Math.random() * (height - 80) + 40,
          vx: (Math.random() - 0.5) * 3,
          vy: (Math.random() - 0.5) * 3,
          radius: 35 * ballSize,
          name,
          color: i % 2 === 0 ? accentColor : accentAltColor,
        });
      });
    }

    // --- Mode 3: FALLING STACK GAME ---
    interface FallingBlock {
      x: number;
      y: number;
      width: number;
      height: number;
      name: string;
      color: string;
      isStacked: boolean;
    }
    const blocks: FallingBlock[] = [];
    let currentBlock: FallingBlock | null = null;
    let groundHeight = 20;

    const spawnBlock = () => {
      const name = displayNames[Math.floor(Math.random() * displayNames.length)];
      currentBlock = {
        x: Math.random() * (width - 150) + 20,
        y: 0,
        width: 100,
        height: 30,
        name,
        color: accentColor,
        isStacked: false,
      };
    };

    if (mode === "FALLING_GAME" && gameStarted) {
      spawnBlock();
    }

    // --- Main Game Loop ---
    let rotationSpeedX = 0.005;
    let rotationSpeedY = 0.005;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      if (mode === "ROTATING_SPHERE") {
        // Compute rotation speeds from mouse position
        const targetSpeedX = (mouse.x - width / 2) * 0.00004;
        const targetSpeedY = (mouse.y - height / 2) * 0.00004;
        rotationSpeedX += (targetSpeedX - rotationSpeedX) * 0.05;
        rotationSpeedY += (targetSpeedY - rotationSpeedY) * 0.05;

        // Apply rotation matrix
        const radX = rotationSpeedY;
        const radY = -rotationSpeedX;

        const cosX = Math.cos(radX);
        const sinX = Math.sin(radX);
        const cosY = Math.cos(radY);
        const sinY = Math.sin(radY);

        sphereNodes.forEach((node) => {
          // Rotate X
          const y1 = node.y3d * cosX - node.z3d * sinX;
          const z1 = node.z3d * cosX + node.y3d * sinX;
          // Rotate Y
          const x2 = node.x3d * cosY - z1 * sinY;
          const z2 = z1 * cosY + node.x3d * sinY;

          node.x3d = x2;
          node.y3d = y1;
          node.z3d = z2;

          // Projection
          const scale = 250 / (250 + node.z3d);
          const x2d = width / 2 + node.x3d * scale;
          const y2d = height / 2 + node.y3d * scale;
          const opacity = (250 - node.z3d) / 350;

          // Render tag text
          ctx.font = `${Math.max(10, Math.floor(14 * scale))}px var(--font-mono, monospace)`;
          ctx.fillStyle = accentColor;
          ctx.globalAlpha = Math.min(1, Math.max(0.2, opacity));
          ctx.textAlign = "center";
          ctx.fillText(node.name, x2d, y2d);
          ctx.globalAlpha = 1;
        });

        // Informational overlay
        ctx.fillStyle = inkSoftColor;
        ctx.font = "10px var(--font-mono, monospace)";
        ctx.fillText("// DRAG OR HOVER CURSOR TO ROTATE SPHERE", width / 2, height - 15);
      } 
      else if (mode === "FLOATING_BALLS") {
        floatingBalls.forEach((ball) => {
          // Bouncing boundary logic
          ball.x += ball.vx;
          ball.y += ball.vy;

          if (ball.x - ball.radius < 0) {
            ball.x = ball.radius;
            ball.vx *= -1;
          }
          if (ball.x + ball.radius > width) {
            ball.x = width - ball.radius;
            ball.vx *= -1;
          }
          if (ball.y - ball.radius < 0) {
            ball.y = ball.radius;
            ball.vy *= -1;
          }
          if (ball.y + ball.radius > height) {
            ball.y = height - ball.radius;
            ball.vy *= -1;
          }

          // Mouse repelling physics
          const dx = ball.x - mouse.x;
          const dy = ball.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            const force = (120 - dist) / 120;
            ball.vx += (dx / dist) * force * 0.4;
            ball.vy += (dy / dist) * force * 0.4;

            // clamp speed
            const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
            if (speed > 5) {
              ball.vx = (ball.vx / speed) * 5;
              ball.vy = (ball.vy / speed) * 5;
            }
          }

          // Render sphere card
          ctx.beginPath();
          ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
          ctx.fillStyle = neutral(0.03);
          ctx.strokeStyle = neutral(0.12);
          ctx.lineWidth = 1;
          ctx.fill();
          ctx.stroke();

          // Render glow center
          const glowGrad = ctx.createRadialGradient(
            ball.x - ball.radius/3, ball.y - ball.radius/3, 5,
            ball.x, ball.y, ball.radius
          );
          glowGrad.addColorStop(0, neutral(0.15));
          glowGrad.addColorStop(1, "transparent");
          ctx.fillStyle = glowGrad;
          ctx.beginPath();
          ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
          ctx.fill();

          // Text labels
          ctx.font = "11px var(--font-mono, monospace)";
          ctx.fillStyle = ball.color;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(ball.name, ball.x, ball.y);
        });
      } 
      else if (mode === "FALLING_GAME") {
        if (!gameStarted) {
          ctx.fillStyle = neutral(0.7);
          ctx.font = "14px var(--font-mono, monospace)";
          ctx.textAlign = "center";
          ctx.fillText("// CLICK 'START STACK GAME' TO PLAY", width / 2, height / 2);
          return;
        }

        // Draw ground
        ctx.fillStyle = neutral(0.15);
        ctx.fillRect(0, height - groundHeight, width, groundHeight);

        // Draw stacked blocks
        blocks.forEach((b) => {
          ctx.fillStyle = b.color;
          ctx.fillRect(b.x, b.y, b.width, b.height);
          ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
          ctx.strokeRect(b.x, b.y, b.width, b.height);

          ctx.font = "10px var(--font-mono, monospace)";
          ctx.fillStyle = "#FFFFFF"; /* accent-text on accent-colored block */
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(b.name, b.x + b.width / 2, b.y + b.height / 2);
        });

        // Handle falling current block
        if (currentBlock) {
          // Drop block
          currentBlock.y += 1.5 * fallingSpeed;

          // Check collisions with ground
          const hitsGround = currentBlock.y + currentBlock.height >= height - groundHeight;
          
          // Check collision with stacked blocks
          let hitsBlock = false;
          let hitY = height - groundHeight;
          for (const b of blocks) {
            const xOverlap = currentBlock.x < b.x + b.width && currentBlock.x + currentBlock.width > b.x;
            if (xOverlap && currentBlock.y + currentBlock.height >= b.y) {
              hitsBlock = true;
              hitY = b.y;
              break;
            }
          }

          if (hitsGround || hitsBlock) {
            currentBlock.y = hitY - currentBlock.height;
            currentBlock.isStacked = true;
            
            // Check if stack reaches too high (game over)
            if (currentBlock.y < 50) {
              setGameStarted(false);
              setActiveMessage(`Game Over! Stack Height: ${score} blocks`);
            } else {
              blocks.push(currentBlock);
              setScore((s) => s + 1);
              spawnBlock();
            }
          }

          // Draw current dropping block
          if (currentBlock) {
            // NOTE: canvas cannot parse "var(--accent)" — must use the resolved value
            ctx.fillStyle = accentColor;
            ctx.fillRect(currentBlock.x, currentBlock.y, currentBlock.width, currentBlock.height);
            ctx.strokeStyle = "rgba(0,0,0,0.5)";
            ctx.strokeRect(currentBlock.x, currentBlock.y, currentBlock.width, currentBlock.height);

            ctx.font = "10px var(--font-mono, monospace)";
            ctx.fillStyle = "#FFFFFF"; /* accent-text on accent-colored block */
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(currentBlock.name, currentBlock.x + currentBlock.width / 2, currentBlock.y + currentBlock.height / 2);
          }
        }
      }

      animationId = requestAnimationFrame(render);
    };

    render();

    // Stacking control click handler
    const handleClick = () => {
      if (mode === "FALLING_GAME" && currentBlock && gameStarted) {
        // Make block align to mouse coordinate or shift left/right
        currentBlock.x = mouse.x - currentBlock.width / 2;
      }
    };
    canvas.addEventListener("click", handleClick);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("touchmove", handleTouchMove);
      canvas.removeEventListener("touchstart", handleTouchStart);
      canvas.removeEventListener("touchend", handleTouchEnd);
      canvas.removeEventListener("click", handleClick);
    };
  }, [mode, ballCount, ballSize, fallingSpeed, technologies, gameStarted, score, resolvedTheme]);

  // Restart Stack game helper
  const handleRestart = () => {
    setScore(0);
    setGameStarted(true);
    setActiveMessage("Stacking game active. Click canvas to drop!");
  };

  return (
    <section className="w-full py-20 px-[var(--gutter)] bg-[var(--bg-2, var(--bg))] border-t border-solid border-[var(--line)] transition-colors duration-300">
      <div className="max-w-[var(--w-content)] mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-12">
          <div>
            <p className="pm-kicker text-mono-label mb-2 text-[var(--accent)]">// 07 — INTERACTION LAB</p>
            <h2 
              className="text-h2 text-[var(--ink)]" 
              style={{ fontFamily: "var(--font-display)" }}
            >
              Technology Sandbox
            </h2>
          </div>
          {mode === "FALLING_GAME" && (
            <div className="flex items-center gap-4">
              <span className="text-mono-label text-[var(--accent)]">
                Score: {score} Blocks
              </span>
              <button
                onClick={handleRestart}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--accent)] text-[var(--bg)] hover:bg-[var(--accent-hover)] rounded-[var(--radius-sm)] font-bold text-xs cursor-pointer border-none"
              >
                <RotateCcw size={12} />
                Restart Stacker
              </button>
            </div>
          )}
        </div>

        {/* Fallback Static Grid */}
        {mode === "STATIC_FALLBACK" ? (
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 md:grid-cols-6">
            {technologies.map((tech) => (
              <div 
                key={tech.id} 
                className="p-4 border border-solid border-[var(--line)] bg-[var(--bg-raised)] rounded-[var(--radius-sm)] text-center text-small font-mono text-[var(--ink-soft)]"
              >
                {tech.name}
              </div>
            ))}
          </div>
        ) : (
          <div 
            className="w-full h-[400px] rounded-[var(--radius-md)] border border-solid border-[var(--line)] bg-[#070b14] overflow-hidden relative flex justify-center items-center"
            style={{ boxShadow: "inset 0 0 40px rgba(0,0,0,0.8)" }}
          >
            <canvas ref={canvasRef} className="block w-full h-full cursor-crosshair" />
            
            {/* Informative top overlay */}
            <div className="absolute top-4 left-4 pointer-events-none text-[10px] font-mono text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
              <Gamepad2 size={12} className="text-[var(--accent)]" />
              <span>Sandbox Mode: {mode.replace("_", " ")}</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
