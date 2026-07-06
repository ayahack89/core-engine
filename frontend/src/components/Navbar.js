import React from "react";
import { Bell, Plus, Menu, SlidersHorizontal, ArrowUpDown, LogOut } from "lucide-react";
import Button from "./ui/Button";
import SearchBar from "./SearchBar";
import FilterDropdown from "./FilterDropdown";

export default function Navbar({ 
  searchQuery, 
  setSearchQuery, 
  visibilityFilter, 
  setVisibilityFilter, 
  sortOrder, 
  setSortOrder, 
  onNewRepoClick, 
  username,
  onMenuToggle,
  onLogout
}) {
  const visibilityOptions = [
    { value: "all", label: "All Visibilities" },
    { value: "public", label: "Public" },
    { value: "private", label: "Private" }
  ];

  const sortOptions = [
    { value: "updated", label: "Recently Updated" },
    { value: "name", label: "Alphabetical" }
  ];

  return (
    <header className="sticky top-0 z-30 h-16 w-full bg-[#0A0A0A]/95 backdrop-blur border-b border-[#27272A] flex items-center justify-between px-6 select-none">
      {/* Left side info: Mobile Menu Trigger & Current Context */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="p-1.5 rounded-lg border border-[#27272A] bg-[#111111] hover:bg-[#18181B] text-[#A1A1AA] hover:text-[#FAFAFA] md:hidden cursor-pointer transition-colors"
          title="Toggle Navigation Menu"
        >
          <Menu className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[#FAFAFA]">Overview</span>
          <span className="text-[#27272A] text-xs hidden md:inline">|</span>
          <span className="text-xs text-[#A1A1AA] font-medium hidden md:inline">
            Manage AI projects and models
          </span>
        </div>
      </div>

      {/* Right side controls: Search, filters, CTA, notifications */}
      <div className="flex items-center gap-3 w-full max-w-4xl justify-end">
        {/* Repository Search */}
        <SearchBar 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search... (/)"
          id="repo-search-input"
          className="max-w-[140px] sm:max-w-[200px] lg:max-w-[280px]"
        />

        {/* Visibility Filter Dropdown */}
        <FilterDropdown
          value={visibilityFilter}
          onChange={(e) => setVisibilityFilter(e.target.value)}
          options={visibilityOptions}
          icon={SlidersHorizontal}
          className="hidden sm:block"
        />

        {/* Sort Dropdown */}
        <FilterDropdown
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          options={sortOptions}
          icon={ArrowUpDown}
          className="hidden md:block"
        />

        {/* Create Repo Button */}
        <Button 
          variant="default" 
          size="sm" 
          onClick={onNewRepoClick} 
          className="h-8 text-xs font-semibold px-2.5 py-1"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden xs:inline">New Project</span>
        </Button>

        {/* Divider */}
        <span className="w-px h-5 bg-[#27272A] mx-0.5" />

        {/* Notifications */}
        <button
          className="p-1.5 rounded-lg border border-[#27272A] bg-[#111111] hover:bg-[#18181B] hover:border-[#3F3F46] text-[#A1A1AA] hover:text-[#FAFAFA] transition-all relative cursor-pointer"
          title="Notifications"
        >
          <Bell className="w-3.5 h-3.5" />
          <span className="absolute top-1 right-1 w-1 h-1 bg-[#2563EB] rounded-full" />
        </button>

        {/* Avatar */}
        <div className="w-7 h-7 rounded-full bg-[#2563EB] text-[#FAFAFA] border border-[#27272A] flex items-center justify-center font-bold text-xs" title={username}>
          {username ? username.charAt(0).toUpperCase() : "U"}
        </div>

        {/* Sign Out Action Button */}
        <button
          onClick={onLogout}
          className="p-1.5 rounded-lg border border-[#27272A] bg-[#111111] hover:bg-[rgba(239,68,68,0.08)] text-[#A1A1AA] hover:text-[#EF4444] hover:border-[rgba(239,68,68,0.2)] transition-all cursor-pointer flex items-center gap-1.5"
          title="Sign Out Session"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="text-[10px] font-semibold hidden lg:inline">Sign Out</span>
        </button>
      </div>
    </header>
  );
}
