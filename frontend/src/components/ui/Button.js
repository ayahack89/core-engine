import React from "react";

export default function Button({ 
  children, 
  variant = "default", 
  size = "default", 
  className = "", 
  disabled = false,
  type = "button",
  onClick,
  ...props 
}) {
  const baseStyle = "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer select-none";
  
  const variants = {
    default: "bg-[#FAFAFA] text-[#0A0A0A] hover:bg-[#E4E4E7]",
    secondary: "bg-[#111111] text-[#FAFAFA] border border-[#27272A] hover:bg-[#18181B] hover:border-[#3F3F46]",
    outline: "bg-transparent text-[#FAFAFA] border border-[#27272A] hover:bg-[#18181B]",
    ghost: "bg-transparent text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#18181B]",
    accent: "bg-[#2563EB] text-[#FAFAFA] hover:bg-[#1D4ED8]",
    danger: "bg-[#EF4444] text-[#FAFAFA] hover:bg-[#DC2626]"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs gap-1.5",
    default: "px-4 py-2 text-sm gap-2",
    lg: "px-5 py-2.5 text-base gap-2.5"
  };

  return (
    <button
      type={type}
      className={`${baseStyle} ${variants[variant] || variants.default} ${sizes[size] || sizes.default} ${className}`}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
}
