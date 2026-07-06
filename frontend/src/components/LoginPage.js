"use client";

import { useState } from "react";
import { Sparkles, ArrowRight, Github } from "lucide-react";
import { motion } from "framer-motion";
import Button from "./ui/Button";

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    const trimmed = username.trim();
    if (!trimmed) {
      setError("Username is required");
      return;
    }

    if (trimmed.length < 3) {
      setError("Username must be at least 3 characters");
      return;
    }

    if (!/^[a-zA-Z0-9-_]+$/.test(trimmed)) {
      setError("Username can only contain alphanumeric characters, dashes, and underscores");
      return;
    }

    setIsLoading(true);
    
    // Simulate a secure authorization delay
    setTimeout(() => {
      setIsLoading(false);
      onLogin(trimmed);
    }, 800);
  };

  const handleMockSSO = (provider) => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onLogin(`${provider}_developer`);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4 selection:bg-[#2563EB]/30 selection:text-[#FAFAFA] font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="w-full max-w-[400px] bg-[#111111] border border-[#27272A] rounded-xl p-8 shadow-2xl flex flex-col items-center select-none relative overflow-hidden"
      >
        {/* Decorative Grid Mesh Background Line */}
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#27272A] to-transparent" />

        {/* Brand Header */}
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-[#FAFAFA] text-[#0A0A0A] flex items-center justify-center shadow-md">
            <Sparkles className="w-4 h-4 text-[#0A0A0A]" />
          </div>
          <span className="font-extrabold text-[#FAFAFA] tracking-tight text-xl">Core</span>
        </div>

        {/* Title */}
        <h1 className="text-lg font-bold text-[#FAFAFA] tracking-tight text-center">
          Authorize Session
        </h1>
        <p className="text-[11px] text-[#A1A1AA] text-center mt-1.5 max-w-[280px] leading-relaxed">
          Sign in to access your secure AI engine and repository deployments.
        </p>

        {/* SSO Mock Buttons (Vercel & Cursor Look) */}
        <div className="w-full flex flex-col gap-2 mt-6">
          <button
            type="button"
            onClick={() => handleMockSSO("github")}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#18181B] text-[#FAFAFA] border border-[#27272A] hover:bg-[#27272A] hover:border-[#3F3F46] transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none select-none active:scale-[0.99]"
          >
            <Github className="w-4 h-4 text-[#FAFAFA]" />
            <span>Continue with GitHub</span>
          </button>
          
          <button
            type="button"
            onClick={() => handleMockSSO("gitlab")}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#18181B] text-[#FAFAFA] border border-[#27272A] hover:bg-[#27272A] hover:border-[#3F3F46] transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none select-none active:scale-[0.99]"
          >
            {/* Minimal SVG representation for GitLab */}
            <svg className="w-4 h-4 text-[#FC6D26]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23.955 13.587l-1.342-4.135a.827.827 0 0 0-.308-.43.834.834 0 0 0-.52-.162h-.012a.834.834 0 0 0-.518.163.827.827 0 0 0-.308.43l-2.025 6.223H5.078L3.053 9.455a.828.828 0 0 0-.308-.43.834.834 0 0 0-.52-.162H2.21a.834.834 0 0 0-.518.163.828.828 0 0 0-.308.43L.045 13.587a.822.822 0 0 0 .093.754l11.455 8.788a.633.633 0 0 0 .753 0l11.52-8.788a.822.822 0 0 0 .093-.754" />
            </svg>
            <span>Continue with GitLab</span>
          </button>
        </div>

        {/* Separator */}
        <div className="w-full flex items-center gap-3 my-5">
          <div className="h-[1px] bg-[#27272A] flex-1" />
          <span className="text-[10px] text-[#A1A1AA] uppercase tracking-wider font-semibold">or security token</span>
          <div className="h-[1px] bg-[#27272A] flex-1" />
        </div>

        {/* Credentials Form */}
        <form className="w-full flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="username" className="text-xs font-semibold text-[#FAFAFA]">
                Developer ID
              </label>
              <span className="text-[10px] text-[#A1A1AA] font-mono leading-none">sandbox-mode</span>
            </div>
            <div className="relative">
              <input
                type="text"
                id="username"
                className={`w-full bg-[#18181B] border ${error ? 'border-[#EF4444] focus:border-[#EF4444]' : 'border-[#27272A] focus:border-[#2563EB]'} hover:border-[#3F3F46] focus:outline-none rounded-lg pl-3 pr-10 py-2 text-xs text-[#FAFAFA] placeholder-[#A1A1AA] font-mono transition-all`}
                placeholder="e.g. root_admin"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (error) setError("");
                }}
                disabled={isLoading}
                autoComplete="off"
                autoFocus
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-[#111111] border border-[#27272A] px-1 py-0.5 rounded text-[8px] font-mono text-[#A1A1AA] pointer-events-none select-none">
                ↵ Enter
              </span>
            </div>
            {error && (
              <span className="text-[10px] text-[#EF4444] font-semibold mt-0.5">
                {error}
              </span>
            )}
          </div>

          <Button
            type="submit"
            variant="default"
            className="w-full py-2 h-9 text-xs font-semibold shadow-sm"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="w-4 h-4 border-2 border-[#0A0A0A]/20 border-t-[#0A0A0A] rounded-full animate-spin" />
            ) : (
              <>
                <span>Access Console</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </Button>
        </form>

        {/* Secure Environment Footer */}
        <div className="mt-8 border-t border-[#27272A]/60 pt-4 w-full text-center">
          <p className="text-[9px] text-[#A1A1AA] leading-relaxed font-mono">
            SECURE ACCESS PORTAL
            <br />
            IP logging and encryption are active.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
