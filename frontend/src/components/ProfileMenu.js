import React, { useState, useRef, useEffect } from "react";
import { LogOut, User, Settings } from "lucide-react";

export default function ProfileMenu({ username, onLogout }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={menuRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between p-2 rounded-lg bg-[#111111] border border-[#27272A] hover:bg-[#18181B] hover:border-[#3F3F46] cursor-pointer transition-all duration-150 select-none"
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="w-7 h-7 rounded-full bg-[#2563EB] flex items-center justify-center text-xs font-black text-[#FAFAFA] flex-shrink-0">
            {username ? username.charAt(0).toUpperCase() : "U"}
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-xs font-bold text-[#FAFAFA] leading-tight truncate">{username}</span>
            <span className="text-[9px] text-[#A1A1AA] leading-none">Developer</span>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="absolute bottom-full left-0 right-0 mb-1.5 z-50 rounded-lg bg-[#111111] border border-[#27272A] shadow-xl p-1 animate-in fade-in duration-100">
          <button className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-[#18181B] text-xs text-[#FAFAFA] transition-colors duration-100 cursor-pointer text-left">
            <User className="w-3.5 h-3.5 text-[#A1A1AA]" />
            <span>My Profile</span>
          </button>
          <button className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-[#18181B] text-xs text-[#FAFAFA] transition-colors duration-100 cursor-pointer text-left">
            <Settings className="w-3.5 h-3.5 text-[#A1A1AA]" />
            <span>Account Settings</span>
          </button>
          <div className="h-px bg-[#27272A] my-1" />
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-[rgba(239,68,68,0.1)] text-xs text-[#EF4444] transition-colors duration-100 cursor-pointer text-left"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log out</span>
          </button>
        </div>
      )}
    </div>
  );
}
