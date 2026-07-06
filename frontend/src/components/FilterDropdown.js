import React from "react";
import { SlidersHorizontal } from "lucide-react";

export default function FilterDropdown({ 
  value, 
  onChange, 
  options = [], 
  icon: Icon = SlidersHorizontal,
  className = "" 
}) {
  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={onChange}
        className="appearance-none bg-[#111111] border border-[#27272A] hover:bg-[#18181B] hover:border-[#3F3F46] text-xs text-[#FAFAFA] rounded-lg px-3 py-1.5 pr-8 focus:outline-none cursor-pointer transition-colors"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <Icon className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#A1A1AA] pointer-events-none" />
    </div>
  );
}
