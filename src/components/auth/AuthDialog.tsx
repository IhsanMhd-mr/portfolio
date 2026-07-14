"use client";

import React, { useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { X } from "lucide-react";
import LoginForm from "./LoginForm";

interface AuthDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthDialog({ isOpen, onClose }: AuthDialogProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const overlayRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Sync open state with URL query ?login=1
  useEffect(() => {
    if (isOpen) {
      const params = new URLSearchParams(searchParams.toString());
      if (params.get("login") !== "1") {
        params.set("login", "1");
        router.replace(`${pathname}?${params.toString()}`);
      }
    } else {
      const params = new URLSearchParams(searchParams.toString());
      if (params.get("login") === "1") {
        params.delete("login");
        const query = params.toString();
        router.replace(query ? `${pathname}?${query}` : pathname);
      }
    }
  }, [isOpen, pathname, router, searchParams]);

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Focus trap inside the modal
  useEffect(() => {
    if (!isOpen || !overlayRef.current) return;

    const modal = overlayRef.current;
    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    // Set initial focus to close button or first input
    if (closeButtonRef.current) {
      closeButtonRef.current.focus();
    }

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    modal.addEventListener("keydown", handleTabKey);
    return () => modal.removeEventListener("keydown", handleTabKey);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      onClose();
    }
  };

  // Render modal in Portal at document.body root
  return ReactDOM.createPortal(
    <div
      ref={overlayRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="relative w-full max-w-[400px] animate-scale-in">
        {/* Close Button */}
        <button
          ref={closeButtonRef}
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute top-4 right-4 z-50 p-1.5 rounded-full border border-solid border-[var(--line)] bg-[var(--bg-raised)] text-[var(--ink-soft)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-all focus-visible:outline-none"
        >
          <X size={16} />
        </button>

        {/* LoginForm wrapper */}
        <LoginForm onSuccess={onClose} />
      </div>
    </div>,
    document.body
  );
}
