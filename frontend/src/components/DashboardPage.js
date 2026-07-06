"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  FolderGit2, 
  Globe, 
  Lock, 
  CloudLightning, 
  Database, 
  Zap, 
  Plus, 
  X, 
  BookOpen, 
  ExternalLink,
  Github,
  Command,
  ArrowRight,
  Grid,
  List,
  UserPlus,
  SlidersHorizontal,
  ArrowUpDown,
  Laptop
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import StatsCard from "./StatsCard";
import RepositoryCard from "./RepositoryCard";
import LoadingSkeleton from "./LoadingSkeleton";
import FilterDropdown from "./FilterDropdown";
import Button from "./ui/Button";
import Card from "./ui/Card";
import Badge from "./ui/Badge";

const FRAMEWORKS = [
  { id: "nextjs", name: "Next.js", color: "#ffffff", bg: "#000000", border: "#333333" },
  { id: "react", name: "React", color: "#61dafb", bg: "#1f2a35", border: "#2d3e4f" },
  { id: "javascript", name: "JavaScript", color: "#f7df1e", bg: "#2a2717", border: "#3c3821" },
  { id: "html", name: "HTML5", color: "#e34f26", bg: "#2d1b18", border: "#3e2420" }
];

const INITIAL_REPOS = [
  {
    id: "core-engine",
    name: "core-engine",
    description: "The core engine dashboard and Next.js frontend base layer.",
    framework: "nextjs",
    visibility: "private",
    updatedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 mins ago
    branch: "main"
  },
  {
    id: "system-design",
    name: "system-design",
    description: "Architecture blueprints and high-level structural specifications.",
    framework: "javascript",
    visibility: "public",
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), // 4 hours ago
    branch: "master"
  }
];

export default function DashboardPage({ username, onLogout, onOpenProject }) {
  // Repo lists
  const [repos, setRepos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Layout and view states
  const [activeSidebarTab, setActiveSidebarTab] = useState("repositories");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [viewType, setViewType] = useState("grid"); // "grid" | "list"

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState("all");
  const [frameworkFilter, setFrameworkFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("updated"); // "updated" | "name"

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  // Toast Notification
  const [notification, setNotification] = useState({ show: false, message: "", type: "success" });

  // Create Repo Form State
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newFramework, setNewFramework] = useState("nextjs");
  const [newVisibility, setNewVisibility] = useState("private");
  const [formError, setFormError] = useState("");

  // Invite user Form State
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviteError, setInviteError] = useState("");

  const createModalRef = useRef(null);
  const inviteModalRef = useRef(null);

  // Load repos from backend or localstorage fallback
  useEffect(() => {
    const loadRepos = async () => {
      setIsLoading(true);
      // Simulate 600ms loading skeleton block for visual polish
      const timer = setTimeout(async () => {
        try {
          const response = await fetch("http://localhost:8000/api/v1/projects/");
          if (response.ok) {
            const data = await response.json();
            setRepos(data);
            setIsLoading(false);
            return;
          }
        } catch (err) {
          console.warn("Backend unreachable, loading from localStorage:", err);
        }

        const saved = localStorage.getItem(`repos_${username}`);
        if (saved) {
          try {
            setRepos(JSON.parse(saved));
          } catch (e) {
            setRepos(INITIAL_REPOS);
          }
        } else {
          setRepos(INITIAL_REPOS);
          localStorage.setItem(`repos_${username}`, JSON.stringify(INITIAL_REPOS));
        }
        setIsLoading(false);
      }, 600);

      return () => clearTimeout(timer);
    };

    loadRepos();
  }, [username]);

  // Keyboard shortcut listener ('/' focuses search)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "/" && document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "TEXTAREA") {
        e.preventDefault();
        const input = document.getElementById("repo-search-input");
        if (input) input.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Auto-dismiss notifications after 3.5 seconds
  useEffect(() => {
    if (notification.show) {
      const timer = setTimeout(() => {
        setNotification({ show: false, message: "", type: "success" });
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [notification.show]);

  // Handle modal outside clicks
  useEffect(() => {
    function handleClickOutside(event) {
      if (createModalRef.current && !createModalRef.current.contains(event.target)) {
        setIsCreateModalOpen(false);
      }
      if (inviteModalRef.current && !inviteModalRef.current.contains(event.target)) {
        setIsInviteModalOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const saveRepos = (newRepos) => {
    setRepos(newRepos);
    localStorage.setItem(`repos_${username}`, JSON.stringify(newRepos));
  };

  const handleCreateRepo = (e) => {
    e.preventDefault();
    setFormError("");

    const trimmedName = newName.trim().toLowerCase();
    if (!trimmedName) {
      setFormError("Repository name is required.");
      return;
    }

    if (!/^[a-z0-9-_]+$/.test(trimmedName)) {
      setFormError("Use lowercase alphanumeric, dashes, and underscores only.");
      return;
    }

    if (repos.some(r => r.name === trimmedName)) {
      setFormError("A repository with this name already exists.");
      return;
    }

    const payload = {
      name: trimmedName,
      description: newDesc.trim() || "No description provided.",
      framework: newFramework,
      visibility: newVisibility
    };

    const createOnBackend = async () => {
      try {
        const response = await fetch("http://localhost:8000/api/v1/projects/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (response.ok) {
          const data = await response.json();
          const updated = [data, ...repos];
          saveRepos(updated);
          return true;
        }
      } catch (err) {
        console.error("Failed to create on backend:", err);
      }
      return false;
    };

    createOnBackend().then(success => {
      if (!success) {
        // Fallback local creation
        const newRepo = {
          id: `${trimmedName}-${Date.now()}`,
          ...payload,
          updatedAt: new Date().toISOString(),
          branch: "main"
        };
        const updated = [newRepo, ...repos];
        saveRepos(updated);
      }
      setNewName("");
      setNewDesc("");
      setNewFramework("nextjs");
      setNewVisibility("private");
      setIsCreateModalOpen(false);
      showNotification(`Repository "${trimmedName}" created successfully!`, "success");
    });
  };

  const handleDeleteRepo = (id) => {
    if (confirm("Are you sure you want to delete this repository?")) {
      const deleteOnBackend = async () => {
        try {
          await fetch(`http://localhost:8000/api/v1/projects/${id}`, {
            method: "DELETE"
          });
        } catch (err) {
          console.error("Failed to delete on backend:", err);
        }
      };
      deleteOnBackend();
      const updated = repos.filter(r => r.id !== id);
      saveRepos(updated);
      showNotification("Repository deleted successfully.", "error");
    }
  };

  const handleDeploy = (repo) => {
    showNotification(`Deployment initiated for ${repo.name} (main)...`, "success");
  };

  const handleInviteSubmit = (e) => {
    e.preventDefault();
    setInviteError("");

    if (!inviteEmail || !inviteEmail.includes("@")) {
      setInviteError("Please enter a valid email address.");
      return;
    }

    setInviteEmail("");
    setIsInviteModalOpen(false);
    showNotification(`Invitation sent to ${inviteEmail}`, "success");
  };

  const showNotification = (message, type = "success") => {
    setNotification({ show: true, message, type });
  };

  // Filter & Sort computation
  const filteredRepos = repos.filter(repo => {
    const matchesSearch = repo.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          repo.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesVisibility = visibilityFilter === "all" || repo.visibility === visibilityFilter;
    const matchesFramework = frameworkFilter === "all" || repo.framework === frameworkFilter;
    
    return matchesSearch && matchesVisibility && matchesFramework;
  });

  const sortedRepos = [...filteredRepos].sort((a, b) => {
    if (sortOrder === "name") {
      return a.name.localeCompare(b.name);
    }
    // Default: Sort by updatedAt ISO string desc
    return new Date(b.updatedAt) - new Date(a.updatedAt);
  });

  // Stats calculation
  const totalCount = repos.length;
  const publicCount = repos.filter(r => r.visibility === "public").length;
  const privateCount = repos.filter(r => r.visibility === "private").length;
  const deployCount = totalCount * 3 + 1; // Simulated deployments based on repo size
  const storageUsed = `${(totalCount * 1.4 + 0.8).toFixed(1)} GB`;
  const apiRequests = `${(totalCount * 86.4 + 12.2).toFixed(1)}K`;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#FAFAFA] flex">
      
      {/* Sidebar */}
      <Sidebar 
        username={username}
        activeTab={activeSidebarTab}
        setActiveTab={setActiveSidebarTab}
        onLogout={onLogout}
        onInviteClick={() => setIsInviteModalOpen(true)}
        onSearchClick={() => {
          const input = document.getElementById("repo-search-input");
          if (input) input.focus();
        }}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Container */}
      <div className="flex-1 md:ml-[260px] min-h-screen flex flex-col overflow-x-hidden">
        
        {/* Navbar */}
        <Navbar 
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          visibilityFilter={visibilityFilter}
          setVisibilityFilter={setVisibilityFilter}
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
          onNewRepoClick={() => setIsCreateModalOpen(true)}
          username={username}
          onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)}
          onLogout={onLogout}
        />

        {/* Inner Content Area */}
        <main className="flex-1 p-6 md:p-8 lg:p-10 max-w-[1400px] w-full mx-auto flex flex-col gap-8 animate-in fade-in duration-300">
          
          {/* Welcome Intro Section */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#27272A] pb-6">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-[#FAFAFA]">
                Workspace Console
              </h1>
              <p className="text-xs text-[#A1A1AA] mt-1 font-mono">
                Session owner: {username} &mdash; console authenticated.
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
              <span className="text-xs font-semibold text-[#FAFAFA] font-mono">Engine Status: Operational</span>
            </div>
          </div>

          {/* Stats Dashboard Grid */}
          <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatsCard 
              icon={FolderGit2} 
              title="Total Repos" 
              value={totalCount} 
              description="Active code repositories" 
              trend="Stable"
            />
            <StatsCard 
              icon={Globe} 
              title="Public Projects" 
              value={publicCount} 
              description="Accessible by internet"
              trend={publicCount > 0 ? `+${publicCount}` : undefined}
            />
            <StatsCard 
              icon={Lock} 
              title="Private Projects" 
              value={privateCount} 
              description="Secure internal projects"
              trend={privateCount > 0 ? `+${privateCount}` : undefined}
            />
            <StatsCard 
              icon={CloudLightning} 
              title="Deployments Today" 
              value={deployCount} 
              description="Automated Vercel builds" 
              trend="+12%" 
              trendDirection="up"
            />
            <StatsCard 
              icon={Database} 
              title="Storage Used" 
              value={storageUsed} 
              description="Database and assets storage" 
              trend="+0.6GB"
              trendDirection="up"
            />
            <StatsCard 
              icon={Zap} 
              title="API Requests" 
              value={apiRequests} 
              description="Requests this billing period" 
              trend="+24.2%" 
              trendDirection="up"
            />
          </section>

          {/* Repository Section header and filter row */}
          <section className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <h2 className="text-base font-bold text-[#FAFAFA]">Repositories</h2>
                <Badge variant="default" className="font-bold text-[#A1A1AA]">
                  {sortedRepos.length}
                </Badge>
              </div>

              {/* View layout Toggle and advanced search controls */}
              <div className="flex items-center gap-3">
                
                {/* Framework Selector */}
                <FilterDropdown
                  value={frameworkFilter}
                  onChange={(e) => setFrameworkFilter(e.target.value)}
                  options={[
                    { value: "all", label: "All Frameworks" },
                    ...FRAMEWORKS.map(fw => ({ value: fw.id, label: fw.name }))
                  ]}
                  icon={SlidersHorizontal}
                />

                {/* Grid/List Toggle */}
                <div className="flex items-center bg-[#111111] border border-[#27272A] rounded-lg p-0.5">
                  <button
                    onClick={() => setViewType("grid")}
                    className={`p-1.5 rounded-md transition-colors cursor-pointer ${viewType === "grid" ? "bg-[#18181B] text-[#FAFAFA]" : "text-[#A1A1AA] hover:text-[#FAFAFA]"}`}
                    title="Grid View"
                  >
                    <Grid className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setViewType("list")}
                    className={`p-1.5 rounded-md transition-colors cursor-pointer ${viewType === "list" ? "bg-[#18181B] text-[#FAFAFA]" : "text-[#A1A1AA] hover:text-[#FAFAFA]"}`}
                    title="List View"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Repositories display area */}
            {isLoading ? (
              <LoadingSkeleton />
            ) : sortedRepos.length > 0 || searchQuery !== "" || visibilityFilter !== "all" || frameworkFilter !== "all" ? (
              
              // Handle filtering results empty state
              sortedRepos.length === 0 ? (
                <div className="border border-dashed border-[#27272A] bg-[#111111]/30 rounded-xl p-12 text-center flex flex-col items-center justify-center min-h-[300px]">
                  <SlidersHorizontal className="w-8 h-8 text-[#A1A1AA] mb-3 opacity-60" />
                  <h3 className="text-sm font-bold text-[#FAFAFA]">No repositories match your filters</h3>
                  <p className="text-xs text-[#A1A1AA] mt-1 max-w-[280px]">
                    Try clearing your search query or setting the visibility filter to "All Visibilities".
                  </p>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="mt-4"
                    onClick={() => {
                      setSearchQuery("");
                      setVisibilityFilter("all");
                      setFrameworkFilter("all");
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              ) : viewType === "grid" ? (
                
                // GRID VIEW
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  
                  {/* Create New Card */}
                  <motion.div
                    whileHover={{ y: -2, scale: 1.02 }}
                    transition={{ duration: 0.12, ease: "easeOut" }}
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-transparent border-2 border-dashed border-[#27272A] hover:border-[#3F3F46] rounded-xl p-5 flex flex-col items-center justify-center text-center h-[230px] cursor-pointer group transition-all"
                  >
                    <div className="w-9 h-9 rounded-full bg-[#111111] border border-[#27272A] flex items-center justify-center mb-3 group-hover:bg-[#18181B] group-hover:border-[#3F3F46] transition-colors">
                      <Plus className="w-4 h-4 text-[#A1A1AA] group-hover:text-[#FAFAFA] transition-colors" />
                    </div>
                    <h4 className="text-sm font-bold text-[#FAFAFA] group-hover:text-[#2563EB] transition-colors">
                      Create Repository
                    </h4>
                    <p className="text-xs text-[#A1A1AA] mt-1.5 max-w-[190px] leading-relaxed">
                      Deploy a new web application or AI microservice template.
                    </p>
                  </motion.div>

                  {/* Render Cards */}
                  <AnimatePresence mode="popLayout">
                    {sortedRepos.map(repo => (
                      <RepositoryCard 
                        key={repo.id}
                        repo={repo}
                        username={username}
                        onOpenProject={onOpenProject}
                        onDelete={handleDeleteRepo}
                        onDeploy={handleDeploy}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                
                // LIST VIEW
                <div className="bg-[#111111] border border-[#27272A] rounded-xl overflow-hidden divide-y divide-[#27272A] select-none">
                  {sortedRepos.map(repo => (
                    <div
                      key={repo.id}
                      onClick={() => onOpenProject(repo)}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 hover:bg-[#18181B] cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-5 h-5 rounded-full bg-[#27272A] flex items-center justify-center text-[10px] font-bold text-[#A1A1AA]">
                          {username ? username.charAt(0).toUpperCase() : "C"}
                        </div>
                        <div className="flex flex-col overflow-hidden">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-[#A1A1AA]">{username || "Core"}</span>
                            <span className="text-[#3F3F46] text-xs">/</span>
                            <span className="text-sm font-bold text-[#FAFAFA] truncate">{repo.name}</span>
                            <Badge variant={repo.visibility === "public" ? "public" : "private"}>
                              {repo.visibility}
                            </Badge>
                          </div>
                          <span className="text-xs text-[#A1A1AA] mt-0.5 truncate max-w-[400px]">
                            {repo.description}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-6 text-xs text-[#A1A1AA]">
                        <span className="px-2 py-0.5 rounded border border-[#27272A] bg-[#0A0A0A] text-[10px] font-medium uppercase tracking-tight">
                          {repo.framework}
                        </span>
                        <span className="hidden sm:inline">
                          branch: <span className="font-mono text-[#FAFAFA]">{repo.branch || "main"}</span>
                        </span>
                        <span className="text-[11px] text-[#A1A1AA]">
                          Updated {new Date(repo.updatedAt).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                        </span>

                        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleDeploy(repo)}
                            className="h-7 text-[10px] px-2"
                          >
                            Deploy
                          </Button>
                          <button
                            onClick={() => handleDeleteRepo(repo.id)}
                            className="p-1.5 rounded-md hover:bg-[#111111] text-[#A1A1AA] hover:text-[#EF4444] border border-transparent hover:border-[#27272A] transition-all cursor-pointer"
                          >
                            <Trash2Icon className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              
              // ABSOLUTE EMPTY STATE (No repos at all)
              <div className="border border-dashed border-[#27272A] rounded-xl p-16 text-center flex flex-col items-center justify-center min-h-[400px] select-none bg-[#111111]/10">
                {/* Custom Vector Illustration */}
                <div className="w-16 h-16 rounded-2xl bg-[#111111] border border-[#27272A] flex items-center justify-center mb-6">
                  <Laptop className="w-8 h-8 text-[#2563EB]" />
                </div>
                <h3 className="text-lg font-bold text-[#FAFAFA]">Create your first repository</h3>
                <p className="text-xs text-[#A1A1AA] mt-2 max-w-[320px] leading-relaxed">
                  To get started, create a fresh repository template preconfigured with Next.js, React, and deployment scripts.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 mt-6">
                  <Button 
                    variant="accent" 
                    onClick={() => setIsCreateModalOpen(true)}
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Repository</span>
                  </Button>
                  <a 
                    href="https://github.com/new" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold rounded-lg bg-[#111111] text-[#FAFAFA] border border-[#27272A] hover:bg-[#18181B] hover:border-[#3F3F46] gap-2 active:scale-95 transition-all"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-[#A1A1AA]" />
                    <span>Read Documentation</span>
                  </a>
                </div>
              </div>
            )}
          </section>
        </main>
      </div>

      {/* CREATE NEW REPO MODAL */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateModalOpen(false)}
              className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            />

            {/* Modal Dialog Box */}
            <motion.div
              ref={createModalRef}
              initial={{ opacity: 0, y: 15, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="bg-[#111111] border border-[#27272A] rounded-xl w-full max-w-md overflow-hidden relative shadow-2xl z-10"
            >
              <div className="flex items-center justify-between p-5 border-b border-[#27272A]">
                <div>
                  <h3 className="text-sm font-bold text-[#FAFAFA]">Create New Repository</h3>
                  <p className="text-[10px] text-[#A1A1AA] mt-0.5">Bootstrap a brand new workspace project</p>
                </div>
                <button 
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-1 rounded-md hover:bg-[#18181B] text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateRepo} className="p-5 flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="repo-name" className="text-xs font-semibold text-[#FAFAFA]">
                    Repository Name <span className="text-[#EF4444]">*</span>
                  </label>
                  <input
                    type="text"
                    id="repo-name"
                    placeholder="e.g., ai-summarizer"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full bg-[#18181B] border border-[#27272A] hover:border-[#3F3F46] focus:border-[#2563EB] focus:outline-none rounded-lg px-3 py-2 text-xs text-[#FAFAFA] transition-all"
                    autoComplete="off"
                    autoFocus
                  />
                  <span className="text-[9px] text-[#A1A1AA]">
                    Use lowercase letters, numbers, dashes, and underscores only.
                  </span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="repo-desc" className="text-xs font-semibold text-[#FAFAFA]">Description</label>
                  <textarea
                    id="repo-desc"
                    placeholder="Briefly describe this repository's purpose..."
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    className="w-full bg-[#18181B] border border-[#27272A] hover:border-[#3F3F46] focus:border-[#2563EB] focus:outline-none rounded-lg px-3 py-2 text-xs text-[#FAFAFA] h-20 resize-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="repo-framework" className="text-xs font-semibold text-[#FAFAFA]">Framework Preset</label>
                    <select
                      id="repo-framework"
                      value={newFramework}
                      onChange={(e) => setNewFramework(e.target.value)}
                      className="w-full bg-[#18181B] border border-[#27272A] hover:border-[#3F3F46] focus:outline-none rounded-lg px-2.5 py-2 text-xs text-[#FAFAFA] cursor-pointer"
                    >
                      {FRAMEWORKS.map(fw => (
                        <option key={fw.id} value={fw.id}>{fw.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="repo-visibility" className="text-xs font-semibold text-[#FAFAFA]">Visibility</label>
                    <select
                      id="repo-visibility"
                      value={newVisibility}
                      onChange={(e) => setNewVisibility(e.target.value)}
                      className="w-full bg-[#18181B] border border-[#27272A] hover:border-[#3F3F46] focus:outline-none rounded-lg px-2.5 py-2 text-xs text-[#FAFAFA] cursor-pointer"
                    >
                      <option value="private">Private</option>
                      <option value="public">Public</option>
                    </select>
                  </div>
                </div>

                {formError && (
                  <p className="text-[10px] text-[#EF4444] font-semibold bg-[#EF4444]/5 border border-[#EF4444]/10 p-2 rounded">
                    {formError}
                  </p>
                )}

                <div className="flex items-center justify-end gap-2 border-t border-[#27272A] pt-4 mt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsCreateModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="default" 
                    size="sm" 
                    type="submit"
                  >
                    Create Project
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* INVITE USERS MODAL */}
      <AnimatePresence>
        {isInviteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsInviteModalOpen(false)}
              className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            />

            {/* Modal Dialog Box */}
            <motion.div
              ref={inviteModalRef}
              initial={{ opacity: 0, y: 15, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="bg-[#111111] border border-[#27272A] rounded-xl w-full max-w-md overflow-hidden relative shadow-2xl z-10"
            >
              <div className="flex items-center justify-between p-5 border-b border-[#27272A]">
                <div>
                  <h3 className="text-sm font-bold text-[#FAFAFA]">Invite Members</h3>
                  <p className="text-[10px] text-[#A1A1AA] mt-0.5">Add collaborators to Core AI team</p>
                </div>
                <button 
                  onClick={() => setIsInviteModalOpen(false)}
                  className="p-1 rounded-md hover:bg-[#18181B] text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleInviteSubmit} className="p-5 flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="invite-email" className="text-xs font-semibold text-[#FAFAFA]">
                    Email Address <span className="text-[#EF4444]">*</span>
                  </label>
                  <input
                    type="email"
                    id="invite-email"
                    placeholder="colleague@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full bg-[#18181B] border border-[#27272A] hover:border-[#3F3F46] focus:border-[#2563EB] focus:outline-none rounded-lg px-3 py-2 text-xs text-[#FAFAFA] transition-all"
                    autoComplete="off"
                    autoFocus
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="invite-role" className="text-xs font-semibold text-[#FAFAFA]">Role</label>
                  <select
                    id="invite-role"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full bg-[#18181B] border border-[#27272A] hover:border-[#3F3F46] focus:outline-none rounded-lg px-2.5 py-2 text-xs text-[#FAFAFA] cursor-pointer"
                  >
                    <option value="member">Member (Can deploy and view repositories)</option>
                    <option value="admin">Admin (Full administrative permissions)</option>
                    <option value="billing">Billing (Can manage subscriptions and plan settings)</option>
                  </select>
                </div>

                {inviteError && (
                  <p className="text-[10px] text-[#EF4444] font-semibold bg-[#EF4444]/5 border border-[#EF4444]/10 p-2 rounded">
                    {inviteError}
                  </p>
                )}

                <div className="flex items-center justify-end gap-2 border-t border-[#27272A] pt-4 mt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsInviteModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="accent" 
                    size="sm" 
                    type="submit"
                  >
                    Send Invitation
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TOAST SYSTEM */}
      <AnimatePresence>
        {notification.show && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-[#111111] border border-[#27272A] px-4 py-3 rounded-lg shadow-xl text-xs select-none"
          >
            <span className={`w-2 h-2 rounded-full ${notification.type === 'success' ? 'bg-[#22C55E]' : 'bg-[#EF4444]'} animate-pulse`} />
            <span className="text-[#FAFAFA] font-semibold">{notification.message}</span>
            <button 
              onClick={() => setNotification({ show: false, message: "" })} 
              className="text-[#A1A1AA] hover:text-[#FAFAFA] ml-2 cursor-pointer transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

// Inline trash icon component for simple import
function Trash2Icon({ className }) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  );
}
