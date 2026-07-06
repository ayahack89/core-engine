import React from "react";
import { Search } from "lucide-react";

export default function SearchBar({ value, onChange, placeholder = "Search...", id = "search-input", className = "" }) {
  return (
    <div className={`relative w-full ${className}`}>
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#A1A1AA] pointer-events-none" />
      <input
        type="text"
        id={id}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="w-full bg-[#111111] border border-[#27272A] hover:border-[#3F3F46] focus:border-[#2563EB] focus:outline-none rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#FAFAFA] placeholder-[#A1A1AA] transition-all"
      />
    </div>
  );
}
