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
    const outlineColor = cssVar("--sandbox-outline", "rgba(0, 0, 0, 0.3)");
    const accentTextColor = cssVar("--accent-text", "#FFFFFF");
    // Fixed black/white for floating-ball labels — ball.color text on a same-hue tinted
    // disc/glow was low-contrast, and a background-matched halo (tried, reverted) still
    // read poorly against the glow. Flat black-on-light / white-on-dark is simplest and
    // most reliable.
    const ballLabelColor = isDarkTheme ? "#FFFFFF" : "#000000";
    // Canvas 2D cannot resolve var() inside a font shorthand any more than it
    // can inside a color — every `ctx.font` string below previously embedded
    // the literal text "var(--font-mono, monospace)", which is not a valid
    // CSS font-family value, so the canvas silently fell back to its default
    // font. Resolve the family once, the same way colors are resolved above.
    const fontMono = cssVar("--font-mono", "monospace");
    // Neutral overlay ink for card fills/strokes/ground. Sourced from a theme
    // token like every other color here; it is stored as space-separated RGB
    // channels rather than a color because this helper is parameterized by
    // alpha and Canvas 2D cannot parse var().
    const neutralRgb = cssVar(
      "--sandbox-neutral-rgb",
      isDarkTheme ? "255 255 255" : "17 17 17"
    );
    const [nr, ng, nb] = neutralRgb.split(/[\s,]+/);
    const neutral = (alpha: number) => `rgba(${nr}, ${ng}, ${nb}, ${alpha})`;
    // accentColor/accentAltColor above are always resolved hex ("#RRGGBB"), never a raw
    // var() string, so a hex parser is safe here — used to tint each floating ball's own
    // glass disc with its label color instead of the shared neutral tone.
    const hexToRgba = (hex: string, alpha: number) => {
      const h = hex.replace("#", "");
      const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
      const r = parseInt(full.slice(0, 2), 16);
      const g = parseInt(full.slice(2, 4), 16);
      const b = parseInt(full.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    let animationId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 600);
    let height = (canvas.height = 400);

    /**
     * Perspective divisor used by the ROTATING_SPHERE projection. Kept as a
     * named constant because the radius below is solved against it.
     */
    const PERSPECTIVE = 250;

    /**
     * Sphere radius in px, derived from the canvas width.
     *
     * The projection magnifies a node's horizontal offset by up to
     * PERSPECTIVE / (PERSPECTIVE - radius) for the nearest node, so a radius
     * that looks right on a ~1100px desktop canvas throws labels far outside a
     * ~375px phone canvas (a hardcoded 150 projected to width/2 + 375 = 562px
     * on a 375px canvas, i.e. entirely off-screen).
     *
     * Solving `extent = r * P / (P - r)` for r gives `r = extent * P / (P + extent)`,
     * so we pick the largest radius whose worst-case extent still fits, and keep
     * 150 as the desktop cap so wide canvases are unchanged.
     */
    const sphereRadius = () => {
      const maxExtent = Math.max(60, width / 2 - 48); // 48px keeps centred labels inside
      return Math.min(150, (maxExtent * PERSPECTIVE) / (PERSPECTIVE + maxExtent));
    };

    const handleResize = () => {
      width = canvas.width = canvas.parentElement?.clientWidth || 600;
      height = canvas.height = 400;
    };
    window.addEventListener("resize", handleResize);

    // Unified pointer tracking — one set of handlers covers mouse, touch and pen,
    // replacing the previous duplicated mouse*/touch* pairs.
    const mouse = { x: width / 2, y: height / 2 };

    // Global pause: pressing anywhere inside the canvas freezes every floating
    // ball; releasing resumes them at the speed they had on page load.
    let isPaused = false;
    let capturedPointerId: number | null = null;

    const updatePointer = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };

    /**
     * The single release path — idempotent, so every termination route
     * (pointerup, pointercancel, effect teardown) can call it unconditionally.
     */
    const releasePause = () => {
      if (capturedPointerId === null) return;

      // Restore each ball's page-load speed while keeping the direction it was
      // travelling in when it froze. `floatingBalls` is declared further down;
      // this closure only ever runs from an event, long after initialization.
      for (const ball of floatingBalls) {
        const speed = Math.hypot(ball.vx, ball.vy);
        if (speed === 0) {
          // A zero vector has no direction to preserve — pick a fresh one.
          const angle = Math.random() * Math.PI * 2;
          ball.vx = Math.cos(angle) * ball.initialSpeed;
          ball.vy = Math.sin(angle) * ball.initialSpeed;
        } else {
          ball.vx = (ball.vx / speed) * ball.initialSpeed;
          ball.vy = (ball.vy / speed) * ball.initialSpeed;
        }
      }

      isPaused = false;
      if (canvas.hasPointerCapture(capturedPointerId)) {
        canvas.releasePointerCapture(capturedPointerId);
      }
      capturedPointerId = null;
    };

    const handlePointerMove = (e: PointerEvent) => {
      updatePointer(e);
    };

    const handlePointerDown = (e: PointerEvent) => {
      updatePointer(e);
      // A single pointer owns the pause; a second finger must not re-capture it.
      if (capturedPointerId !== null) return;
      capturedPointerId = e.pointerId;
      isPaused = true;
      // Capture routes later pointer events here even once the cursor leaves the
      // canvas, so a release outside the element still unfreezes the scene.
      canvas.setPointerCapture(e.pointerId);
    };

    // Only the pointer that began the pause may end it, so a second finger
    // lifting cannot unfreeze the scene early.
    const handlePointerRelease = (e: PointerEvent) => {
      if (e.pointerId !== capturedPointerId) return;
      releasePause();
    };

    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointerup", handlePointerRelease);
    canvas.addEventListener("pointercancel", handlePointerRelease);

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
        // Unit vectors: the radius is applied at projection time so it can
        // follow the canvas width (including across a resize) instead of being
        // baked in here.
        sphereNodes.push({
          x3d: Math.sin(phi) * Math.cos(theta),
          y3d: Math.sin(phi) * Math.sin(theta),
          z3d: Math.cos(phi),
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
      /** Speed at spawn — what a release restores the ball to. */
      initialSpeed: number;
      radius: number;
      name: string;
      color: string;
    }
    const floatingBalls: FloatingBall[] = [];
    if (mode === "FLOATING_BALLS") {
      displayNames.forEach((name, i) => {
        // Same spawn velocities as before, captured so the magnitude can be
        // restored later without changing any spawn behavior.
        const vx = (Math.random() - 0.5) * 3;
        const vy = (Math.random() - 0.5) * 3;
        floatingBalls.push({
          x: Math.random() * (width - 120) + 60,
          y: Math.random() * (height - 80) + 40,
          vx,
          vy,
          initialSpeed: Math.hypot(vx, vy),
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

        // Radius is read per frame so a resize takes effect immediately.
        const r = sphereRadius();

        sphereNodes.forEach((node) => {
          // Rotate X (unit vectors — rotation preserves magnitude)
          const y1 = node.y3d * cosX - node.z3d * sinX;
          const z1 = node.z3d * cosX + node.y3d * sinX;
          // Rotate Y
          const x2 = node.x3d * cosY - z1 * sinY;
          const z2 = z1 * cosY + node.x3d * sinY;

          node.x3d = x2;
          node.y3d = y1;
          node.z3d = z2;

          // Projection — scale the unit vector up to the responsive radius
          const zWorld = node.z3d * r;
          const scale = PERSPECTIVE / (PERSPECTIVE + zWorld);
          const x2d = width / 2 + node.x3d * r * scale;
          const y2d = height / 2 + node.y3d * r * scale;
          const opacity = (PERSPECTIVE - zWorld) / 350;

          // Render tag text
          ctx.font = `${Math.max(10, Math.floor(14 * scale))}px ${fontMono}`;
          ctx.fillStyle = accentColor;
          ctx.globalAlpha = Math.min(1, Math.max(0.2, opacity));
          ctx.textAlign = "center";
          ctx.fillText(node.name, x2d, y2d);
          ctx.globalAlpha = 1;
        });

        // Informational overlay
        ctx.fillStyle = inkSoftColor;
        ctx.font = `10px ${fontMono}`;
        ctx.fillText("// DRAG OR HOVER CURSOR TO ROTATE SPHERE", width / 2, height - 15);
      } 
      else if (mode === "FLOATING_BALLS") {
        // While paused, skip the whole simulation step (integration + collision): position
        // is left exactly as it was and velocity stays untouched, which is what lets a
        // release preserve the ball's pre-press direction. Drawing below still runs every frame.
        if (!isPaused) {
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
          });

          // Ball-to-ball collision — all balls share one radius (35 * ballSize), so this
          // is the equal-mass case: separate the overlap and swap the normal velocity
          // component (tangential component untouched). O(n^2) is fine at this ball count.
          for (let i = 0; i < floatingBalls.length; i++) {
            for (let j = i + 1; j < floatingBalls.length; j++) {
              const a = floatingBalls[i];
              const b = floatingBalls[j];
              const dx = b.x - a.x;
              const dy = b.y - a.y;
              const dist = Math.hypot(dx, dy);
              const minDist = a.radius + b.radius;
              if (dist > 0 && dist < minDist) {
                const nx = dx / dist;
                const ny = dy / dist;
                const overlap = (minDist - dist) / 2;
                a.x -= nx * overlap;
                a.y -= ny * overlap;
                b.x += nx * overlap;
                b.y += ny * overlap;

                const relVel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
                a.vx += relVel * nx;
                a.vy += relVel * ny;
                b.vx -= relVel * nx;
                b.vy -= relVel * ny;
              }
            }
          }
        }

        // Draw pass — always runs, even while paused, so frozen balls still render.
        floatingBalls.forEach((ball) => {
          // Render sphere card, tinted with the ball's own color instead of a shared neutral
          // tone, so each ball reads as its own colored glass orb.
          ctx.beginPath();
          ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
          ctx.fillStyle = hexToRgba(ball.color, 0.14);
          ctx.strokeStyle = hexToRgba(ball.color, 0.45);
          ctx.lineWidth = 1;
          ctx.fill();
          ctx.stroke();

          // Render glow center
          const glowGrad = ctx.createRadialGradient(
            ball.x - ball.radius/3, ball.y - ball.radius/3, 5,
            ball.x, ball.y, ball.radius
          );
          glowGrad.addColorStop(0, hexToRgba(ball.color, 0.35));
          glowGrad.addColorStop(1, "transparent");
          ctx.fillStyle = glowGrad;
          ctx.beginPath();
          ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
          ctx.fill();

          // Text labels
          ctx.font = `11px ${fontMono}`;
          ctx.fillStyle = ballLabelColor;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(ball.name, ball.x, ball.y);
        });
      } 
      else if (mode === "FALLING_GAME") {
        if (!gameStarted) {
          ctx.fillStyle = neutral(0.7);
          ctx.font = `14px ${fontMono}`;
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
          ctx.strokeStyle = outlineColor;
          ctx.strokeRect(b.x, b.y, b.width, b.height);

          ctx.font = `10px ${fontMono}`;
          ctx.fillStyle = accentTextColor;
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
            ctx.strokeStyle = outlineColor;
            ctx.strokeRect(currentBlock.x, currentBlock.y, currentBlock.width, currentBlock.height);

            ctx.font = `10px ${fontMono}`;
            ctx.fillStyle = accentTextColor;
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
      // Terminate any in-flight interaction so no pointer capture outlives this
      // effect (e.g. when the sandbox mode or theme changes mid-press).
      releasePause();
      window.removeEventListener("resize", handleResize);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointerup", handlePointerRelease);
      canvas.removeEventListener("pointercancel", handlePointerRelease);
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
            className="w-full h-[400px] rounded-[var(--radius-md)] border border-solid border-[var(--sandbox-glass-border)] bg-[var(--sandbox-glass)] backdrop-blur-[var(--sandbox-glass-blur)] overflow-hidden relative flex justify-center items-center transition-colors duration-300"
            style={{ boxShadow: "var(--sandbox-shadow)" }}
          >
            {/* Ambient glass glow blobs — sit below the canvas in DOM/paint order */}
            <div
              className="pointer-events-none absolute -top-24 -left-16 w-72 h-72 rounded-full blur-3xl"
              style={{ background: "var(--sandbox-glow-a)" }}
            />
            <div
              className="pointer-events-none absolute -bottom-24 -right-16 w-72 h-72 rounded-full blur-3xl"
              style={{ background: "var(--sandbox-glow-b)" }}
            />
            {/* Top highlight sheen */}
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-1/2"
              style={{ background: "linear-gradient(to bottom, var(--sandbox-highlight), transparent)" }}
            />

            {/* touch-action:none keeps the browser from claiming a touch drag as a
                page scroll, so pointer events reach the sandbox intact. */}
            <canvas
              ref={canvasRef}
              className="block w-full h-full cursor-crosshair relative"
              style={{ touchAction: "none" }}
            />

            {/* Informative top overlay */}
            <div className="absolute top-4 left-4 pointer-events-none text-[10px] font-mono text-[var(--sandbox-label)] uppercase tracking-widest flex items-center gap-1.5">
              <Gamepad2 size={12} className="text-[var(--accent)]" />
              <span>Sandbox Mode: {mode.replace("_", " ")}</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
