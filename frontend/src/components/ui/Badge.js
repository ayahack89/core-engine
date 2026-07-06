import React from "react";

export default function Badge({ children, variant = "default", className = "" }) {
  const baseStyle = "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all duration-150";
  
  const variants = {
    default: "bg-[#18181B] border-[#27272A] text-[#A1A1AA]",
    public: "bg-[rgba(34,197,94,0.06)] border-[rgba(34,197,94,0.15)] text-[#22C55E]",
    private: "bg-[#18181B] border-[#27272A] text-[#FAFAFA]",
    accent: "bg-[rgba(37,99,235,0.06)] border-[rgba(37,99,235,0.15)] text-[#2563EB]",
    danger: "bg-[rgba(239,68,68,0.06)] border-[rgba(239,68,68,0.15)] text-[#EF4444]"
  };

  return (
    <span className={`${baseStyle} ${variants[variant] || variants.default} ${className}`}>
      {children}
    </span>
  );
}
