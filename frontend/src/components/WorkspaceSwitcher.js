import React, { useState, useRef, useEffect } from "react";
import { ChevronsUpDown, Check, Plus } from "lucide-react";

export default function WorkspaceSwitcher({ username }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  const workspaces = [
    { id: "core", name: "Core AI", type: "Team", avatar: "C" },
    { id: "personal", name: username || "Personal", type: "Hobby", avatar: username ? username.charAt(0).toUpperCase() : "P" }
  ];

  const [selected, setSelected] = useState(workspaces[0]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#111111] border border-[#27272A] hover:bg-[#18181B] hover:border-[#3F3F46] text-sm text-[#FAFAFA] font-medium transition-all duration-150 cursor-pointer select-none"
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="w-5 h-5 rounded bg-[#2563EB] flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-[#FAFAFA]">
            {selected.avatar}
          </div>
          <span className="truncate text-xs">{selected.name}</span>
          <span className="text-[9px] px-1 py-0.2 rounded bg-[#18181B] text-[#A1A1AA] border border-[#27272A] flex-shrink-0">
            {selected.type}
          </span>
        </div>
        <ChevronsUpDown className="w-3.5 h-3.5 text-[#A1A1AA] flex-shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 mt-1.5 z-50 rounded-lg bg-[#111111] border border-[#27272A] shadow-xl p-1 animate-in fade-in duration-100">
          <p className="text-[9px] font-semibold text-[#A1A1AA] px-2 py-1 uppercase tracking-wider">Workspaces</p>
          {workspaces.map((ws) => (
            <button
              key={ws.id}
              onClick={() => {
                setSelected(ws);
                setIsOpen(false);
              }}
              className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md hover:bg-[#18181B] text-sm text-[#FAFAFA] transition-colors duration-100 cursor-pointer text-left"
            >
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-[#2563EB] flex items-center justify-center text-[10px] font-bold text-[#FAFAFA]">
                  {ws.avatar}
                </div>
                <div>
                  <p className="font-semibold text-xs text-[#FAFAFA] leading-tight">{ws.name}</p>
                  <p className="text-[9px] text-[#A1A1AA]">{ws.type}</p>
                </div>
              </div>
              {selected.id === ws.id && <Check className="w-3.5 h-3.5 text-[#22C55E]" />}
            </button>
          ))}
          <div className="h-px bg-[#27272A] my-1" />
          <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[#18181B] text-xs text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors duration-100 cursor-pointer text-left">
            <Plus className="w-3.5 h-3.5" />
            <span>Create team...</span>
          </button>
        </div>
      )}
    </div>
  );
}
