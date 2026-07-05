"use client";

import { useState, useEffect } from "react";
import styles from "./DashboardPage.module.css";

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
  const [repos, setRepos] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // New Repo Form State
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newFramework, setNewFramework] = useState("nextjs");
  const [newVisibility, setNewVisibility] = useState("private");
  const [formError, setFormError] = useState("");

  // Load repos from backend or localstorage fallback
  useEffect(() => {
    const loadRepos = async () => {
      try {
        const response = await fetch("http://localhost:8000/api/v1/projects/");
        if (response.ok) {
          const data = await response.json();
          setRepos(data);
          return;
        }
      } catch (err) {
        console.warn("Backend not running or unreachable, falling back to localStorage:", err);
      }

      // Fallback
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
    };
    loadRepos();
  }, [username]);

  // Save repos helper
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
      setFormError("Repository name must only contain lowercase letters, numbers, dashes, and underscores.");
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
        // Fallback to local creation if backend fails
        const newRepo = {
          id: `${trimmedName}-${Date.now()}`,
          ...payload,
          updatedAt: new Date().toISOString(),
          branch: "main"
        };
        const updated = [newRepo, ...repos];
        saveRepos(updated);
      }
      // Reset Form & Close Modal
      setNewName("");
      setNewDesc("");
      setNewFramework("nextjs");
      setNewVisibility("private");
      setIsModalOpen(false);
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
    }
  };

  // Filter logic
  const filteredRepos = repos.filter(repo => {
    const matchesSearch = repo.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          repo.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesVisibility = visibilityFilter === "all" || repo.visibility === visibilityFilter;
    return matchesSearch && matchesVisibility;
  });

  const getRelativeTime = (isoString) => {
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

  return (
    <div className={styles.dashboard}>
      {/* Top Navbar */}
      <nav className={styles.navbar}>
        <div className={styles.navLeft}>
          <svg className={styles.logo} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="38" stroke="currentColor" strokeWidth="10" />
            <circle cx="50" cy="50" r="15" fill="currentColor" />
          </svg>
          <span className={styles.brandName}>Core</span>
        </div>

        <div className={styles.navTabs}>
          <span className={`${styles.navTab} ${styles.activeTab}`}>Overview</span>
          <span className={styles.navTab}>Integrations</span>
          <span className={styles.navTab}>Activity</span>
          <span className={styles.navTab}>Settings</span>
        </div>

        <div className={styles.navRight}>
          <a 
            href="https://github.com/new" 
            target="_blank" 
            rel="noopener noreferrer" 
            className={styles.feedbackLink}
          >
            Feedback
          </a>
          <span className={styles.navDot}></span>
          <div className={styles.profileBadge} onClick={onLogout} title="Click to Sign Out">
            <div className={styles.avatar}>
              {username.charAt(0).toUpperCase()}
            </div>
            <span className={styles.profileUsername}>{username}</span>
          </div>
        </div>
      </nav>

      {/* Sub Header / Action Area */}
      <div className={styles.subheader}>
        <div className={styles.subheaderContainer}>
          <div className={styles.searchBarContainer}>
            <svg className={styles.searchIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input 
              type="text" 
              placeholder="Search repositories..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <div className={styles.filterControls}>
            <select 
              value={visibilityFilter} 
              onChange={(e) => setVisibilityFilter(e.target.value)}
              className={styles.selectFilter}
            >
              <option value="all">All Visibilities</option>
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>

            <button 
              className={styles.createButton}
              onClick={() => setIsModalOpen(true)}
            >
              Add New...
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Repository Grid */}
      <main className={styles.mainContent}>
        <div className={styles.grid}>
          {/* Plus Card for adding repo */}
          <div className={styles.plusCard} onClick={() => setIsModalOpen(true)}>
            <div className={styles.plusIconWrapper}>
              <svg className={styles.plusIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </div>
            <span className={styles.plusCardTitle}>Create New Repository</span>
            <p className={styles.plusCardDesc}>Bootstrap a new project template instantly.</p>
          </div>

          {/* Render Repo Cards */}
          {filteredRepos.map(repo => {
            const framework = FRAMEWORKS.find(f => f.id === repo.framework) || FRAMEWORKS[0];
            return (
              <div 
                key={repo.id} 
                className={styles.repoCard}
                style={{ cursor: "pointer" }}
                onClick={(e) => {
                  if (e.target.closest(`.${styles.deleteButton}`)) return;
                  onOpenProject(repo);
                }}
              >
                <div className={styles.repoCardHeader}>
                  <div className={styles.repoTitleArea}>
                    <h3 className={styles.repoName}>{repo.name}</h3>
                    <span className={`${styles.visibilityBadge} ${repo.visibility === "public" ? styles.publicBadge : styles.privateBadge}`}>
                      {repo.visibility}
                    </span>
                  </div>
                  
                  <button 
                    onClick={() => handleDeleteRepo(repo.id)} 
                    className={styles.deleteButton}
                    title="Delete Repository"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.deleteIcon}>
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>

                <p className={styles.repoDescription}>{repo.description}</p>

                <div className={styles.repoCardFooter}>
                  <div className={styles.footerLeft}>
                    {/* Dynamic Framework Badge */}
                    <span 
                      className={styles.frameworkBadge}
                      style={{ 
                        color: framework.color, 
                        backgroundColor: framework.bg,
                        borderColor: framework.border
                      }}
                    >
                      <span className={styles.frameworkDot} style={{ backgroundColor: framework.color }} />
                      {framework.name}
                    </span>

                    <span className={styles.branchInfo}>
                      <svg className={styles.branchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="6" y1="3" x2="6" y2="15"></line>
                        <circle cx="18" cy="6" r="3"></circle>
                        <circle cx="6" cy="18" r="3"></circle>
                        <path d="M18 9a9 9 0 0 1-9 9"></path>
                      </svg>
                      {repo.branch}
                    </span>
                  </div>

                  <span className={styles.updatedTime}>
                    {getRelativeTime(repo.updatedAt)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredRepos.length === 0 && (
          <div className={styles.emptyState}>
            <svg className={styles.emptyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
            <h3>No repositories found</h3>
            <p>Try refining your search query or visibility filter.</p>
          </div>
        )}
      </main>

      {/* Create New Repo Modal */}
      {isModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Create New Repository</h2>
              <button className={styles.closeModalButton} onClick={() => setIsModalOpen(false)}>&times;</button>
            </div>

            <form onSubmit={handleCreateRepo} className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label htmlFor="repo-name">Repository Name <span className={styles.required}>*</span></label>
                <input 
                  type="text" 
                  id="repo-name" 
                  placeholder="e.g. nextjs-dashboard"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className={styles.modalInput}
                  autoComplete="off"
                  autoFocus
                />
                <span className={styles.inputHelp}>Must be lowercase, alphanumeric, with dashes/underscores.</span>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="repo-desc">Description</label>
                <textarea 
                  id="repo-desc" 
                  placeholder="Tell us about this project..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className={styles.modalTextarea}
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="repo-framework">Framework Preset</label>
                  <select 
                    id="repo-framework" 
                    value={newFramework}
                    onChange={(e) => setNewFramework(e.target.value)}
                    className={styles.modalSelect}
                  >
                    {FRAMEWORKS.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="repo-visibility">Visibility</label>
                  <select 
                    id="repo-visibility" 
                    value={newVisibility}
                    onChange={(e) => setNewVisibility(e.target.value)}
                    className={styles.modalSelect}
                  >
                    <option value="private">Private</option>
                    <option value="public">Public</option>
                  </select>
                </div>
              </div>

              {formError && <div className={styles.modalError}>{formError}</div>}

              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelButton} onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className={styles.submitButton}>
                  Create Repo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
