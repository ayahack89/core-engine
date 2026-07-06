import React from "react";

export default function Card({ 
  children, 
  className = "", 
  onClick, 
  interactive = false,
  ...props 
}) {
  return (
    <div
      onClick={onClick}
      className={`
        bg-[#111111] 
        border border-[#27272A] 
        rounded-xl 
        p-5 
        transition-all 
        duration-200 
        ${interactive ? 'cursor-pointer hover:bg-[#18181B] hover:border-[#3F3F46] hover:-translate-y-[2px]' : ''} 
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}
