"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Laptop, Smartphone, Tablet, Upload } from "lucide-react";
import { enablePreviewModeAction } from "./actions";

type DeviceMode = "desktop" | "tablet" | "mobile";

const DEVICE_PX = {
  tablet: { width: 768, height: 1024 },
  mobile: { width: 390, height: 844 },
};

export default function PreviewPage() {
  const [device, setDevice] = useState<DeviceMode>("desktop");
  const [cookieReady, setCookieReady] = useState(false);
  const [scale, setScale] = useState(1);
  const canvasRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Securely enable preview mode cookie
    enablePreviewModeAction().then(() => {
      setCookieReady(true);
    });
  }, []);

  // Scale the fixed-px device frame to fill the available canvas — like Chrome
  // DevTools' device toolbar. The iframe's own CSS viewport stays at the real
  // device width (390/768px) so the site's own responsive breakpoints still
  // evaluate correctly; only the on-screen presentation is scaled up/down.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || device === "desktop") {
      setScale(1);
      return;
    }

    const CANVAS_PADDING = 32; // matches the canvas's own padding, kept clear of the frame
    const target = DEVICE_PX[device];

    const recompute = () => {
      const availableWidth = canvas.clientWidth - CANVAS_PADDING * 2;
      const availableHeight = canvas.clientHeight - CANVAS_PADDING * 2;
      const next = Math.min(availableWidth / target.width, availableHeight / target.height, 1);
      setScale(next > 0 ? next : 1);
    };

    recompute();
    const observer = new ResizeObserver(recompute);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [device]);

  const deviceWidths = {
    desktop: "100%",
    tablet: `${DEVICE_PX.tablet.width}px`,
    mobile: `${DEVICE_PX.mobile.width}px`,
  };

  const deviceHeights = {
    desktop: "100%",
    tablet: `${DEVICE_PX.tablet.height}px`,
    mobile: `${DEVICE_PX.mobile.height}px`,
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-[#07080d] select-none text-white z-[9999]">
      {/* 1. Preview top bar (52px height) */}
      <header
        className="h-[52px] bg-[#101623] px-6 flex items-center justify-between border-t-[3px] border-solid border-amber-500 relative"
        style={{ fontFamily: "var(--font-mono)", fontSize: "12px" }}
      >
        {/* Diagonal Stripe PREVIEW Badge */}
        <div className="flex items-center gap-4">
          <div className="bg-amber-500 text-black px-3 py-1 font-bold tracking-widest text-[10px] transform -skew-x-12 select-none uppercase">
            PREVIEW
          </div>
          <span className="text-slate-400 font-medium hidden sm:inline">
            Active Draft Layout
          </span>
        </div>

        {/* Device view controls */}
        <div className="flex items-center bg-[#1e293b] p-0.5 rounded-[var(--r-xs)] border border-solid border-slate-700">
          <button
            onClick={() => setDevice("desktop")}
            className={`p-1.5 rounded-[var(--r-xs)] transition-colors hover:text-white ${
              device === "desktop" ? "bg-[#334155] text-white" : "text-slate-400"
            }`}
            aria-label="Desktop view"
          >
            <Laptop size={16} />
          </button>
          <button
            onClick={() => setDevice("tablet")}
            className={`p-1.5 rounded-[var(--r-xs)] transition-colors hover:text-white ${
              device === "tablet" ? "bg-[#334155] text-white" : "text-slate-400"
            }`}
            aria-label="Tablet view"
          >
            <Tablet size={16} />
          </button>
          <button
            onClick={() => setDevice("mobile")}
            className={`p-1.5 rounded-[var(--r-xs)] transition-colors hover:text-white ${
              device === "mobile" ? "bg-[#334155] text-white" : "text-slate-400"
            }`}
            aria-label="Mobile view"
          >
            <Smartphone size={16} />
          </button>
        </div>

        {/* Navigation Action buttons */}
        <div className="flex items-center gap-2">
          <Link
            href="/admin/page-builder"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-[var(--r-xs)] font-semibold text-slate-300 hover:text-white transition-colors border-none"
          >
            <ArrowLeft size={14} />
            Back to Editor
          </Link>
          <Link
            href="/admin/publish-confirmation"
            className="flex items-center gap-1.5 px-4 py-1.5 bg-cyan-400 hover:opacity-90 text-black rounded-[var(--r-xs)] font-semibold transition-colors border-none"
          >
            <Upload size={14} />
            Start Publish
          </Link>
        </div>
      </header>

      {/* 2. Device preview canvas sandbox area */}
      <div ref={canvasRef} className="flex-1 bg-slate-950 flex justify-center items-center overflow-y-auto p-4 md:p-8 relative">
        <div
          className="transition-all duration-400 ease-in-out flex justify-center"
          style={
            device === "desktop"
              ? { width: deviceWidths.desktop, height: deviceHeights.desktop, maxWidth: "100%", maxHeight: "100%" }
              : {
                  // Reserve only the visually-scaled footprint in the flex layout —
                  // the real fixed-px frame lives inside, scaled via transform below.
                  width: DEVICE_PX[device].width * scale,
                  height: DEVICE_PX[device].height * scale,
                }
          }
        >
          <div
            style={
              device === "desktop"
                ? undefined
                : {
                    width: DEVICE_PX[device].width,
                    height: DEVICE_PX[device].height,
                    transform: `scale(${scale})`,
                    transformOrigin: "top left",
                  }
            }
            className={`w-full h-full bg-[#0a0f1e] overflow-hidden ${
              device !== "desktop"
                ? "border-[12px] border-solid border-slate-800 rounded-[32px] shadow-2xl relative"
                : ""
            }`}
          >
            {/* If mobile/tablet, render camera notch decoration */}
            {device === "mobile" && (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-32 h-4 bg-slate-800 rounded-full z-50 flex items-center justify-center">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-900" />
              </div>
            )}

            {cookieReady ? (
              <iframe
                src="/"
                className="w-full h-full border-none bg-transparent"
                title="Draft Site Preview"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-xs font-mono text-slate-500">
                <span>PREPARING SECURE SANDBOX PREVIEW...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
