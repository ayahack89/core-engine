import React from "react";
import { 
  FolderGit2, 
  Puzzle, 
  Activity, 
  Settings, 
  Database, 
  CreditCard, 
  Users, 
  UserPlus, 
  Search, 
  LogOut, 
  X,
  Sparkles
} from "lucide-react";
import WorkspaceSwitcher from "./WorkspaceSwitcher";

import ProfileMenu from "./ProfileMenu";

export default function Sidebar({ 
  username, 
  activeTab, 
  setActiveTab, 
  onLogout, 
  onInviteClick, 
  onSearchClick,
  isOpen,
  onClose
}) {
  
  const mainNavItems = [
    { id: "repositories", label: "Repositories", icon: FolderGit2 },
    { id: "integrations", label: "Integrations", icon: Puzzle },
    { id: "activity", label: "Activity", icon: Activity },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const systemNavItems = [
    { id: "storage", label: "Storage", icon: Database },
    { id: "billing", label: "Billing", icon: CreditCard },
    { id: "members", label: "Members", icon: Users },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
        />
      )}

      <aside className={`
        w-[260px] h-screen bg-[#0A0A0A] border-r border-[#27272A] flex flex-col justify-between p-4 fixed top-0 z-50 select-none
        transition-transform duration-300 ease-in-out md:translate-x-0
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
        left-0
      `}>
        <div className="flex flex-col gap-5 text-[#FAFAFA]">
          {/* Logo & Brand */}
          <div className="flex items-center justify-between px-2 py-1">
            <div className="flex items-center gap-2.5">
              <div className="relative w-7 h-7 flex items-center justify-center bg-[#FAFAFA] text-[#0A0A0A] rounded-lg font-black tracking-tighter text-sm overflow-hidden">
                <Sparkles className="w-4 h-4 text-[#0a0a0a]" />
              </div>
              <span className="font-extrabold text-[#FAFAFA] tracking-tight text-lg">Core</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#18181B] text-[#2563EB] border border-[#27272A] font-semibold">
                PRO
              </span>
            </div>

            {/* Mobile Close Button */}
            <button 
              onClick={onClose}
              className="p-1 rounded-md hover:bg-[#18181B] text-[#A1A1AA] hover:text-[#FAFAFA] md:hidden transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Workspace Switcher */}
          <div className="px-1">
            <WorkspaceSwitcher username={username} />
          </div>

          {/* Search Bar Shortcut */}
          <button
            onClick={() => {
              onSearchClick();
              onClose();
            }}
            className="flex items-center justify-between w-full px-3 py-1.5 rounded-lg bg-[#111111] border border-[#27272A] hover:bg-[#18181B] text-[#A1A1AA] hover:text-[#FAFAFA] transition-all text-xs cursor-pointer select-none"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5" />
              <span>Search workspace...</span>
            </div>
            <kbd className="bg-[#18181B] border border-[#27272A] px-1.5 py-0.2 rounded text-[10px] text-[#A1A1AA] font-mono leading-none">
              /
            </kbd>
          </button>

          {/* Main Nav Items */}
          <div className="flex flex-col gap-1">
            <p className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider px-3 mb-1">Navigation</p>
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    onClose();
                  }}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all relative cursor-pointer text-left
                    ${isActive 
                      ? "bg-[#111111] text-[#FAFAFA] border-l-2 border-[#2563EB] pl-2.5 font-bold" 
                      : "text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#111111] border-l-2 border-transparent pl-2.5"
                    }
                  `}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#2563EB]' : 'text-[#A1A1AA]'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Divider */}
          <div className="h-px bg-[#27272A] mx-1" />

          {/* System Settings Items */}
          <div className="flex flex-col gap-1">
            <p className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider px-3 mb-1">System</p>
            {systemNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    onClose();
                  }}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all relative cursor-pointer text-left
                    ${isActive 
                      ? "bg-[#111111] text-[#FAFAFA] border-l-2 border-[#2563EB] pl-2.5 font-bold" 
                      : "text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#111111] border-l-2 border-transparent pl-2.5"
                    }
                  `}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#2563EB]' : 'text-[#A1A1AA]'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
            
            {/* Invite User CTA */}
            <button
              onClick={() => {
                onInviteClick();
                onClose();
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#111111] border-l-2 border-transparent pl-2.5 transition-all cursor-pointer text-left"
            >
              <UserPlus className="w-4 h-4 text-[#A1A1AA]" />
              <span>Invite Users</span>
            </button>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="flex flex-col gap-4 mt-auto">
          {/* Resource Usage indicator */}
          <div className="p-3 bg-[#111111] border border-[#27272A] rounded-xl flex flex-col gap-2">
            <div className="flex items-center justify-between text-[10px] font-semibold">
              <span className="text-[#A1A1AA]">Usage (Pro Plan)</span>
              <span className="text-[#FAFAFA]">74%</span>
            </div>
            <div className="w-full h-1.5 bg-[#18181B] rounded-full overflow-hidden border border-[#27272A]">
              <div className="h-full bg-[#2563EB] rounded-full transition-all duration-300" style={{ width: "74%" }} />
            </div>
            <p className="text-[9px] text-[#A1A1AA] leading-tight">
              Next billing date: Aug 1, 2026.
            </p>
          </div>

          {/* Profile Menu Dropdown */}
          <ProfileMenu username={username} onLogout={onLogout} />
        </div>
      </aside>
    </>
  );
}
