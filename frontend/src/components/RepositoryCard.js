import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { GitBranch, Star, Trash2, MoreHorizontal, ExternalLink, Settings, Terminal, Activity } from "lucide-react";
import Badge from "./ui/Badge";
import Button from "./ui/Button";

const FRAMEWORKS = {
  nextjs: { name: "Next.js", color: "text-[#FAFAFA] bg-[#111111] border-[#27272A]" },
  react: { name: "React", color: "text-[#61DAFB] bg-[#1E2638] border-[#2C3852]" },
  javascript: { name: "JavaScript", color: "text-[#F7DF1E] bg-[#2A291A] border-[#3F3E26]" },
  html: { name: "HTML5", color: "text-[#E34F26] bg-[#2B1B18] border-[#402924]" }
};

export default function RepositoryCard({ 
  repo, 
  username, 
  onOpenProject, 
  onDelete, 
  onDeploy 
}) {
  const [isStarred, setIsStarred] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getRelativeTime = (isoString) => {
    if (!isoString) return "Recently";
    const date = new Date(isoString);
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const framework = FRAMEWORKS[repo.framework] || FRAMEWORKS.nextjs;
  const owner = username || "Core";

  return (
    <motion.div
      layoutId={repo.id}
      whileHover={{ y: -2, scale: 1.02 }}
      transition={{ duration: 0.12, ease: "easeOut" }}
      className="bg-[#111111] border border-[#27272A] hover:border-[#3F3F46] rounded-xl p-5 flex flex-col justify-between h-[230px] shadow-sm hover:shadow-md cursor-pointer transition-colors"
      onClick={(e) => {
        // Don't open if clicked on interactive buttons
        if (e.target.closest("button") || e.target.closest("a") || e.target.closest(".menu-container")) return;
        onOpenProject(repo);
      }}
    >
      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-2">
          <div className="flex items-center gap-2 overflow-hidden">
            {/* Owner Avatar */}
            <div className="w-5 h-5 rounded-full bg-[#27272A] border border-[#3F3F46] flex items-center justify-center text-[10px] font-bold text-[#A1A1AA] flex-shrink-0">
              {owner.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors leading-none truncate max-w-[80px]">
              {owner}
            </span>
            <span className="text-[#3F3F46] select-none text-xs">/</span>
            <h3 className="text-sm font-bold text-[#FAFAFA] truncate leading-none hover:text-[#2563EB] transition-colors">
              {repo.name}
            </h3>
            <Badge variant={repo.visibility === "public" ? "public" : "private"} className="flex-shrink-0 ml-1">
              {repo.visibility}
            </Badge>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => setIsStarred(!isStarred)}
              className="p-1.5 rounded-lg border border-[#27272A] bg-transparent text-[#A1A1AA] hover:text-yellow-500 hover:border-[#3F3F46] transition-all cursor-pointer"
              title={isStarred ? "Starred" : "Star Repository"}
            >
              <Star className={`w-3.5 h-3.5 ${isStarred ? 'fill-yellow-500 text-yellow-500' : ''}`} />
            </button>
            
            {/* Dropdown Menu */}
            <div className="relative menu-container" ref={menuRef}>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-1.5 rounded-lg border border-[#27272A] bg-transparent text-[#A1A1AA] hover:text-[#FAFAFA] hover:border-[#3F3F46] transition-all cursor-pointer"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>

              {isMenuOpen && (
                <div className="absolute right-0 mt-1 z-50 w-44 rounded-lg bg-[#111111] border border-[#27272A] shadow-xl p-1 animate-in fade-in duration-100">
                  <button 
                    onClick={() => {
                      onOpenProject(repo);
                      setIsMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-[#18181B] text-xs text-[#FAFAFA] transition-colors duration-100 cursor-pointer text-left"
                  >
                    <Terminal className="w-3.5 h-3.5 text-[#A1A1AA]" />
                    <span>Open Workspace</span>
                  </button>
                  <button 
                    onClick={() => {
                      if (onDeploy) onDeploy(repo);
                      setIsMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-[#18181B] text-xs text-[#FAFAFA] transition-colors duration-100 cursor-pointer text-left"
                  >
                    <Activity className="w-3.5 h-3.5 text-[#A1A1AA]" />
                    <span>Trigger Build</span>
                  </button>
                  <button className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-[#18181B] text-xs text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors duration-100 cursor-pointer text-left">
                    <Settings className="w-3.5 h-3.5" />
                    <span>Project Settings</span>
                  </button>
                  <div className="h-px bg-[#27272A] my-1" />
                  <button 
                    onClick={() => {
                      onDelete(repo.id);
                      setIsMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-[rgba(239,68,68,0.1)] text-xs text-[#EF4444] transition-colors duration-100 cursor-pointer text-left"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete project</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-[#A1A1AA] line-clamp-2 mt-2 leading-relaxed min-h-[32px]">
          {repo.description || "No description provided."}
        </p>
      </div>

      {/* Footer Info */}
      <div className="border-t border-[#27272A] pt-4 mt-auto">
        <div className="flex items-center justify-between text-[11px] text-[#A1A1AA]">
          <div className="flex items-center gap-3">
            {/* Framework Badge */}
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium border ${framework.color}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              {framework.name}
            </span>

            {/* Branch */}
            <span className="flex items-center gap-1 hover:text-[#FAFAFA] transition-colors">
              <GitBranch className="w-3 h-3 flex-shrink-0" />
              <span className="truncate max-w-[60px]">{repo.branch || "main"}</span>
            </span>
          </div>

          <span className="text-[10px] text-[#A1A1AA]">
            {getRelativeTime(repo.updatedAt)}
          </span>
        </div>

        {/* Deploy Quick Action */}
        <div className="flex items-center justify-between mt-3">
          <span className="text-[10px] text-[#A1A1AA] truncate max-w-[130px]">
            Commit: <span className="font-mono text-[#FAFAFA]">3f8e4a9</span>
          </span>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => onDeploy ? onDeploy(repo) : onOpenProject(repo)}
            className="h-7 px-2.5 text-[11px]"
          >
            <span>Deploy</span>
            <ExternalLink className="w-3 h-3 ml-0.5" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
