"use client";

import { useState } from "react";
import { Send, CheckCircle2, AlertCircle } from "lucide-react";

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("GENERAL");
  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Frontend validation
    if (!name || !email || !subject || !message) {
      setError("Please fill out all required fields.");
      setLoading(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, category, message }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setSuccess(true);
        setName("");
        setEmail("");
        setSubject("");
        setMessage("");
      } else {
        setError(data.error || "Failed to send message. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setError("A network error occurred. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div 
        className="p-8 text-center border border-solid border-[var(--line)] rounded-[var(--radius-sm)] bg-[var(--bg-raised)] space-y-4"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <div className="flex justify-center text-[var(--success, #34D399)]">
          <CheckCircle2 size={48} />
        </div>
        <h3 className="text-h3 font-semibold text-[var(--ink)]" style={{ fontFamily: "var(--font-display)" }}>
          Message Sent!
        </h3>
        <p className="text-small text-[var(--ink-soft)] max-w-sm mx-auto">
          Thank you for reaching out. Your message has been received, and I'll get back to you as soon as possible.
        </p>
        <button
          onClick={() => setSuccess(false)}
          className="mt-4 px-4 py-2 border border-solid border-[var(--line)] hover:border-[var(--accent)] hover:text-[var(--accent)] text-xs font-semibold rounded-[var(--radius-xs)] bg-[var(--bg)] text-[var(--ink)] transition-colors cursor-pointer"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form 
      onSubmit={handleSubmit} 
      className="p-8 border border-solid border-[var(--line)] rounded-[var(--radius-sm)] bg-[var(--bg-raised)] space-y-6"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <h3 className="text-h3 font-semibold text-[var(--ink)] border-b border-solid border-[var(--line)] pb-3 mb-2" style={{ fontFamily: "var(--font-display)" }}>
        Send Message
      </h3>

      {error && (
        <div className="p-4 border border-solid border-red-500/20 bg-red-500/5 text-red-400 rounded-[var(--radius-xs)] flex items-center gap-3 text-small">
          <AlertCircle size={18} className="flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        {/* Name */}
        <div className="space-y-2">
          <label className="text-[10px] font-mono text-[var(--ink-faint)] uppercase block">Name *</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="pm-input w-full px-3 py-2 border border-solid border-[var(--line)] rounded-[var(--radius-xs)] bg-[var(--bg)] text-small text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]"
            placeholder="Your name"
          />
        </div>

        {/* Email */}
        <div className="space-y-2">
          <label className="text-[10px] font-mono text-[var(--ink-faint)] uppercase block">Email *</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pm-input w-full px-3 py-2 border border-solid border-[var(--line)] rounded-[var(--radius-xs)] bg-[var(--bg)] text-small text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]"
            placeholder="your.email@example.com"
          />
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {/* Subject */}
        <div className="space-y-2">
          <label className="text-[10px] font-mono text-[var(--ink-faint)] uppercase block">Subject *</label>
          <input
            type="text"
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="pm-input w-full px-3 py-2 border border-solid border-[var(--line)] rounded-[var(--radius-xs)] bg-[var(--bg)] text-small text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]"
            placeholder="Project proposal / Question"
          />
        </div>

        {/* Category */}
        <div className="space-y-2">
          <label className="text-[10px] font-mono text-[var(--ink-faint)] uppercase block">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="pm-input w-full px-3 py-2 border border-solid border-[var(--line)] rounded-[var(--radius-xs)] bg-[var(--bg)] text-small text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]"
          >
            <option value="GENERAL">General Inquiry</option>
            <option value="OPPORTUNITY">Job / Contract Opportunity</option>
            <option value="COLLABORATION">Open-Source / Partnership</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
      </div>

      {/* Message */}
      <div className="space-y-2">
        <label className="text-[10px] font-mono text-[var(--ink-faint)] uppercase block">Message *</label>
        <textarea
          required
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="pm-input w-full px-3 py-2 border border-solid border-[var(--line)] rounded-[var(--radius-xs)] bg-[var(--bg)] text-small text-[var(--ink)] focus:outline-none focus:border-[var(--accent)] resize-y"
          placeholder="Hi Jane, I would like to discuss..."
        />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold rounded-[var(--radius-sm)] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border-none"
        style={{ color: "var(--bg)" }}
      >
        {loading ? (
          <span>Sending...</span>
        ) : (
          <>
            <Send size={16} />
            <span>Send Message</span>
          </>
        )}
      </button>
    </form>
  );
}
