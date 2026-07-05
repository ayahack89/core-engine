"use client";

import { useState, useEffect, useRef } from "react";
import styles from "./WorkspacePage.module.css";

export default function WorkspacePage({ project, username, onBack }) {
  // Navigation & view states: "requirements" (Phase 1) or "ide" (Phase 2)
  const [viewMode, setViewMode] = useState("requirements");

  // Setup / Loading Overlay states
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupProgress, setSetupProgress] = useState(0);
  const [setupLog, setSetupLog] = useState("Initializing environment...");
  const [logLines, setLogLines] = useState([]);

  // Phase 1 (Requirements) states
  const [reqMessages, setReqMessages] = useState([]);
  const [reqInputMessage, setReqInputMessage] = useState("");
  const [isSendingReq, setIsSendingReq] = useState(false);
  const [requirementsGenerated, setRequirementsGenerated] = useState(false);
  const [requirementsContent, setRequirementsContent] = useState("");
  const [isGeneratingReq, setIsGeneratingReq] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [tempRequirements, setTempRequirements] = useState("");
  const [isSavingDoc, setIsSavingDoc] = useState(false);

  // Phase 2 (IDE Workspace) states
  const [files, setFiles] = useState([]);
  const [openTabs, setOpenTabs] = useState([]);
  const [activeFile, setActiveFile] = useState(null);
  const [fileContent, setFileContent] = useState("");
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [isSavingFile, setIsSavingFile] = useState(false);

  const [ideMessages, setIdeMessages] = useState([]);
  const [ideInputMessage, setIdeInputMessage] = useState("");
  const [isSendingIde, setIsSendingIde] = useState(false);

  const reqMessagesEndRef = useRef(null);
  const ideMessagesEndRef = useRef(null);

  // Scroll chats to bottom
  useEffect(() => {
    reqMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [reqMessages, isSendingReq]);

  useEffect(() => {
    ideMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ideMessages, isSendingIde]);

  // Load Phase 1 Requirements & Chat History on Mount
  useEffect(() => {
    const fetchRequirementsData = async () => {
      try {
        const response = await fetch(`http://localhost:8000/api/v1/projects/${project.id}/chat?chat_type=requirements`);
        if (response.ok) {
          const data = await response.json();
          setReqMessages(data.messages);
          setRequirementsGenerated(data.requirements_generated);
          setRequirementsContent(data.requirements_content || "");
          setTempRequirements(data.requirements_content || "");
        }
      } catch (err) {
        console.error("Error loading requirements specs:", err);
      }
    };
    fetchRequirementsData();
  }, [project.id]);

  // Load Coder Chat History when switching to IDE mode
  useEffect(() => {
    if (viewMode !== "ide") return;

    const fetchIdeCoderData = async () => {
      try {
        const response = await fetch(`http://localhost:8000/api/v1/projects/${project.id}/chat?chat_type=coder`);
        if (response.ok) {
          const data = await response.json();
          setIdeMessages(data.messages);
        }
      } catch (err) {
        console.error("Error loading coder chat history:", err);
      }
    };
    fetchIdeCoderData();
  }, [project.id, viewMode]);

  // Fetch list of workspace files (Explorer)
  const fetchWorkspaceFileList = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/projects/${project.id}/files`);
      if (response.ok) {
        const filenames = await response.json();
        setFiles(filenames);
      }
    } catch (err) {
      console.error("Error listing project files:", err);
    }
  };

  // Switch from Analyst View to IDE View (Trigger dependency simulation loader)
  const handleLaunchIDE = () => {
    setSetupLoading(true);
    setSetupProgress(0);
    const initialLog = "[system] Initializing build context for project: " + project.name;
    setLogLines([initialLog]);

    // Ensure requirements.md exists on disk before opening
    const ensureRequirementsOnDisk = async () => {
      try {
        if (!requirementsContent) {
          // Put standard starting content if not generated yet
          const defaultText = "# Requirements Specification\n\n- Project: " + project.name + "\n- Framework: " + project.framework + "\n- Visibility: " + project.visibility + "\n\n## 1. Overview\nBootstrap specification document compiled.\n";
          await fetch(`http://localhost:8000/api/v1/projects/${project.id}/files/write`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path: "requirements.md", content: defaultText })
          });
        }
      } catch (e) {
        console.error("Error ensuring file on disk:", e);
      }
    };
    ensureRequirementsOnDisk();

    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 8) + 4;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setTimeout(async () => {
          await fetchWorkspaceFileList();
          setSetupLoading(false);
          setViewMode("ide");
          handleOpenFile("requirements.md");
        }, 500);
      }
      setSetupProgress(progress);

      // Add log lines matching SaaS build behaviors
      setLogLines((prev) => {
        const nextLogs = [...prev];
        if (progress > 15 && nextLogs.length === 1) {
          nextLogs.push("[build] npm install --silent (fetching platform configs)...");
        } else if (progress > 30 && nextLogs.length === 2) {
          nextLogs.push("[build] Resolved 384 nodes in 1.15s");
          nextLogs.push("[system] Generating Python virtual environment context...");
        } else if (progress > 50 && nextLogs.length === 4) {
          nextLogs.push("[env] Pip installed requirements.txt (fastapi, uvicorn)");
          nextLogs.push("[db] sqlite3 database: generated schema migration graphs...");
        } else if (progress > 75 && nextLogs.length === 6) {
          nextLogs.push("[db] Migration: 001_create_projects_table.sql completed successfully.");
          nextLogs.push("[ai] Initialized Coder AI agent broker context...");
        } else if (progress > 90 && nextLogs.length === 8) {
          nextLogs.push("[system] Hot-reloaded workspace. Ready to deploy.");
        }
        return nextLogs;
      });

      if (progress < 25) {
        setSetupLog("Scanning workspace directories & linking package managers...");
      } else if (progress < 50) {
        setSetupLog("Installing compiler nodes & framework dependencies...");
      } else if (progress < 75) {
        setSetupLog("Constructing virtual environment paths...");
      } else {
        setSetupLog("Syncing files database. Ready to engineering code!");
      }
    }, 150);
  };

  // Send Requirements Gathering Message (Phase 1)
  const handleSendReqMessage = async (e) => {
    e.preventDefault();
    const msgText = reqInputMessage.trim();
    if (!msgText || isSendingReq) return;

    setReqInputMessage("");
    setIsSendingReq(true);

    const tempUserMsg = {
      id: Date.now(),
      project_id: project.id,
      role: "user",
      content: msgText,
      chat_type: "requirements",
      created_at: new Date().toISOString()
    };
    setReqMessages((prev) => [...prev, tempUserMsg]);

    try {
      const response = await fetch(`http://localhost:8000/api/v1/projects/${project.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: msgText, chat_type: "requirements" })
      });

      if (response.ok) {
        const data = await response.json();
        setReqMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== tempUserMsg.id);
          return [...filtered, tempUserMsg, data];
        });
      }
    } catch (err) {
      console.error("Network error sending requirements message:", err);
    } finally {
      setIsSendingReq(false);
    }
  };

  // Compile Phase 1 Interview transcript to requirements.md
  const handleGenerateRequirements = async () => {
    if (isGeneratingReq) return;
    setIsGeneratingReq(true);

    try {
      const response = await fetch(`http://localhost:8000/api/v1/projects/${project.id}/requirements/generate`, {
        method: "POST"
      });

      if (response.ok) {
        const data = await response.json();
        setRequirementsGenerated(true);
        setRequirementsContent(data.requirements);
        setTempRequirements(data.requirements);
      } else {
        alert("Conversation history is required before compiling specifications.");
      }
    } catch (err) {
      console.error("Error generating specifications:", err);
    } finally {
      setIsGeneratingReq(false);
    }
  };

  // Save manual modifications to requirements.md from Analyst View (Phase 1)
  const handleSaveRequirementsText = async () => {
    if (isSavingDoc) return;
    setIsSavingDoc(true);

    try {
      const response = await fetch(`http://localhost:8000/api/v1/projects/${project.id}/requirements/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: tempRequirements })
      });

      if (response.ok) {
        setRequirementsContent(tempRequirements);
        setEditMode(false);
      }
    } catch (err) {
      console.error("Error saving specifications changes:", err);
    } finally {
      setIsSavingDoc(false);
    }
  };

  // Trigger browser download for requirements.md
  const handleDownloadRequirements = () => {
    window.open(`http://localhost:8000/api/v1/projects/${project.id}/requirements/download`, "_blank");
  };

  // Open workspace file inside Coder IDE editor tabs (Phase 2)
  const handleOpenFile = async (filepath) => {
    if (!filepath) return;
    setIsLoadingFile(true);
    setActiveFile(filepath);

    if (!openTabs.includes(filepath)) {
      setOpenTabs((prev) => [...prev, filepath]);
    }

    try {
      const response = await fetch(
        `http://localhost:8000/api/v1/projects/${project.id}/files/read?path=${encodeURIComponent(filepath)}`
      );
      if (response.ok) {
        const data = await response.json();
        setFileContent(data.content);
      }
    } catch (err) {
      console.error("Error reading file:", err);
    } finally {
      setIsLoadingFile(false);
    }
  };

  // Close an IDE tab
  const handleCloseTab = (e, filepath) => {
    e.stopPropagation();
    const updatedTabs = openTabs.filter((t) => t !== filepath);
    setOpenTabs(updatedTabs);

    if (activeFile === filepath) {
      if (updatedTabs.length > 0) {
        handleOpenFile(updatedTabs[updatedTabs.length - 1]);
      } else {
        setActiveFile(null);
        setFileContent("");
      }
    }
  };

  // Save any edited file inside IDE editor viewport (Phase 2)
  const handleSaveFile = async () => {
    if (!activeFile || isSavingFile) return;
    setIsSavingFile(true);

    try {
      const response = await fetch(`http://localhost:8000/api/v1/projects/${project.id}/files/write`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: activeFile,
          content: fileContent
        })
      });

      if (response.ok) {
        // Sync back requirementsContent if requirements.md was saved inside the IDE
        if (activeFile === "requirements.md") {
          setRequirementsContent(fileContent);
          setTempRequirements(fileContent);
          setRequirementsGenerated(true);
        }
      }
    } catch (err) {
      console.error("Error saving file content:", err);
    } finally {
      setIsSavingFile(false);
    }
  };

  // Send Code / Implementation Question to Coder Assistant (Phase 2)
  const handleSendIdeMessage = async (e) => {
    e.preventDefault();
    const msgText = ideInputMessage.trim();
    if (!msgText || isSendingIde) return;

    setIdeInputMessage("");
    setIsSendingIde(true);

    const tempUserMsg = {
      id: Date.now(),
      project_id: project.id,
      role: "user",
      content: msgText,
      chat_type: "coder",
      created_at: new Date().toISOString()
    };
    setIdeMessages((prev) => [...prev, tempUserMsg]);

    try {
      const response = await fetch(`http://localhost:8000/api/v1/projects/${project.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: msgText, chat_type: "coder" })
      });

      if (response.ok) {
        const data = await response.json();
        setIdeMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== tempUserMsg.id);
          return [...filtered, tempUserMsg, data];
        });
      }
    } catch (err) {
      console.error("Network error sending coding message:", err);
    } finally {
      setIsSendingIde(false);
    }
  };

  // Render markdown tags inline
  const renderResponseMarkdown = (text) => {
    if (!text) return null;
    const lines = text.split("\n");
    return lines.map((line, i) => {
      let formatted = line
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/`(.*?)`/g, "<code>$1</code>");
      return (
        <p key={i} style={{ marginBottom: "0.45rem" }} dangerouslySetInnerHTML={{ __html: formatted }} />
      );
    });
  };

  const renderSpecsMarkdown = (text) => {
    if (!text) return null;
    const lines = text.split("\n");
    const formatInline = (str) => {
      let formatted = str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/`(.*?)`/g, "<code>$1</code>");
      return <span dangerouslySetInnerHTML={{ __html: formatted }} />;
    };

    let insideCode = false;
    let codeContent = [];

    return lines.map((line, i) => {
      if (line.trim().startsWith("```")) {
        if (insideCode) {
          insideCode = false;
          const content = codeContent.join("\n");
          codeContent = [];
          return (
            <pre key={`code-${i}`} style={{ background: "#0c0c0f", padding: "1rem", borderRadius: "6px", overflowX: "auto", border: "1px solid #1a1a22", margin: "1rem 0" }}>
              <code>{content}</code>
            </pre>
          );
        } else {
          insideCode = true;
          return null;
        }
      }

      if (insideCode) {
        codeContent.push(line);
        return null;
      }

      if (line.startsWith("# ")) {
        return <h1 key={i}>{formatInline(line.substring(2))}</h1>;
      }
      if (line.startsWith("## ")) {
        return <h2 key={i}>{formatInline(line.substring(3))}</h2>;
      }
      if (line.startsWith("### ")) {
        return <h3 key={i}>{formatInline(line.substring(4))}</h3>;
      }
      if (line.startsWith("- ") || line.startsWith("* ")) {
        return (
          <li key={i} style={{ marginLeft: "1.5rem", listStyleType: "disc", marginBottom: "0.25rem" }}>
            {formatInline(line.substring(2))}
          </li>
        );
      }
      if (/^\d+\.\s/.test(line)) {
        return (
          <li key={i} style={{ marginLeft: "1.5rem", listStyleType: "decimal", marginBottom: "0.25rem" }}>
            {formatInline(line.replace(/^\d+\.\s/, ""))}
          </li>
        );
      }
      if (line.startsWith("> ")) {
        return (
          <blockquote key={i} style={{ borderLeft: "4px solid #6366f1", paddingLeft: "1rem", color: "#9ca3af", margin: "1rem 0", fontStyle: "italic" }}>
            {formatInline(line.substring(2))}
          </blockquote>
        );
      }
      if (!line.trim()) {
        return <div key={i} style={{ height: "0.75rem" }} />;
      }
      return <p key={i} style={{ marginBottom: "0.85rem" }}>{formatInline(line)}</p>;
    });
  };

  // --- RENDER BOOTSTRAP OVERLAY LOADING SCREEN ---
  if (setupLoading) {
    return (
      <div className={styles.setupContainer}>
        <div className={styles.setupCard}>
          <svg className={styles.setupLogo} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="38" stroke="currentColor" strokeWidth="8" />
            <circle cx="50" cy="50" r="16" fill="currentColor" />
          </svg>
          <h1>Configuring Environment</h1>
          <p>Installing project dependencies, generating workspace files, and setting up coding agent brokers...</p>
          <div style={{ width: "100%", textAlign: "left" }}>
            <div style={{ fontSize: "0.8rem", color: "#a1a1aa", marginBottom: "0.5rem", fontFamily: "monospace" }}>
              {setupLog}
            </div>
            <div style={{ width: "100%", height: "4px", backgroundColor: "#1c1c1f", borderRadius: "2px", overflow: "hidden" }}>
              <div 
                style={{ 
                  height: "100%", 
                  background: "linear-gradient(90deg, #6366f1 0%, #a855f7 100%)", 
                  width: `${setupProgress}%`,
                  transition: "width 0.2s ease" 
                }} 
              />
            </div>
            <div style={{ fontSize: "0.75rem", color: "#52525b", marginTop: "0.5rem", textAlign: "right" }}>
              {setupProgress}%
            </div>
          </div>

          {/* SaaS Terminal Console log screen */}
          <div className={styles.consoleBox}>
            {logLines.map((line, idx) => (
              <div key={idx} style={{ fontFamily: "monospace" }}>
                {line}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- VIEW MODE 1: PHASE 1 REQUIREMENTS INTERVIEW ---
  if (viewMode === "requirements") {
    return (
      <div className={styles.reqLayout}>
        {/* Left Sidebar */}
        <div className={styles.reqSidebar}>
          <div className={styles.reqSidebarHeader}>
            <button className={styles.backButton} onClick={onBack}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              Dashboard
            </button>
          </div>

          <div className={styles.reqSidebarContent}>
            <div className={styles.projectInfo}>
              <h2>{project.name}</h2>
              <div className={styles.projectMeta}>
                <span className={styles.metaBadge}>{project.framework}</span>
                <span className={styles.metaBadge}>{project.visibility}</span>
              </div>
            </div>

            <div>
              <h4 className={styles.sectionTitle}>Drafts</h4>
              <div className={styles.fileList}>
                <button 
                  className={`${styles.fileItem} ${requirementsGenerated ? styles.fileItemActive : ""}`}
                  onClick={handleLaunchIDE}
                  style={{ cursor: "pointer" }}
                  title="Click to directly launch Cursor IDE workspace"
                >
                  📄 requirements.md
                </button>
              </div>
            </div>
          </div>

          <div className={styles.reqSidebarFooter}>
            <button 
              className={styles.downloadButton} 
              onClick={handleDownloadRequirements}
              disabled={!requirementsGenerated}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Download Specs
            </button>
          </div>
        </div>

        {/* Center Panel (Requirement Gathering Chat) */}
        <div className={styles.chatPane}>
          <div className={styles.chatHeader}>
            <h3>Phase 1: Product Analyst Chat</h3>
            <div className={styles.aiStatus}>
              <span className={styles.aiStatusDot} />
              <span>Interview Mode</span>
            </div>
          </div>

          <div className={styles.chatMessages}>
            {reqMessages.length === 0 ? (
              <div className={styles.emptyPreview}>
                <h4>Product Analyst Interview</h4>
                <p>Discuss your application goal, target users, and key features. Click the send message input to start.</p>
              </div>
            ) : (
              reqMessages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`${styles.messageRow} ${msg.role === "user" ? styles.messageRowUser : ""}`}
                >
                  <div className={`${styles.messageBubble} ${msg.role === "user" ? styles.messageBubbleUser : styles.messageBubbleAssistant}`}>
                    {msg.role === "user" ? msg.content : renderResponseMarkdown(msg.content)}
                  </div>
                </div>
              ))
            )}
            {isSendingReq && (
              <div className={styles.messageRow}>
                <div className={`${styles.messageBubble} ${styles.messageBubbleAssistant}`} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <span className={styles.inlineSpinner} />
                  <span style={{ fontSize: "0.75rem" }}>Analyst thinking...</span>
                </div>
              </div>
            )}
            <div ref={reqMessagesEndRef} />
          </div>

          <div className={styles.chatInputContainer}>
            {requirementsGenerated && (
              <div className={styles.launchWorkspaceBanner}>
                <div className={styles.launchWorkspaceTitle}>✅ Phase 1: Requirements Compiled</div>
                <div className={styles.launchWorkspaceDesc}>
                  Your system requirements specifications are compiled successfully inside requirements.md. 
                  Launch the developer workspace to begin writing codebase code.
                </div>
                <button className={styles.launchWorkspaceBtn} onClick={handleLaunchIDE}>
                  Launch Cursor IDE Workspace →
                </button>
              </div>
            )}

            {reqMessages.length > 0 && !requirementsGenerated && (
              <div className={styles.generateBanner}>
                <span className={styles.generateBannerText}>Compile gathered requirements?</span>
                <button 
                  className={styles.generateButton}
                  onClick={handleGenerateRequirements}
                  disabled={isGeneratingReq}
                >
                  {isGeneratingReq ? "Generating..." : "Generate specs"}
                </button>
              </div>
            )}

            <form onSubmit={handleSendReqMessage} className={styles.inputWrapper}>
              <input
                type="text"
                className={styles.chatInput}
                placeholder="Ask analyst questions..."
                value={reqInputMessage}
                onChange={(e) => setReqInputMessage(e.target.value)}
                disabled={isSendingReq}
              />
              <button type="submit" className={styles.sendButton} disabled={!reqInputMessage.trim() || isSendingReq}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
            </form>
          </div>
        </div>

        {/* Right Panel (Markdown Viewer / Editor) */}
        <div className={styles.previewPane}>
          <div className={styles.previewHeader}>
            <div className={styles.previewTitle}>📄 requirements.md</div>
            {requirementsGenerated && (
              <div className={styles.editorActions}>
                {editMode ? (
                  <>
                    <button className={styles.actionButton} onClick={() => { setTempRequirements(requirementsContent); setEditMode(false); }} disabled={isSavingDoc}>Cancel</button>
                    <button className={`${styles.actionButton} ${styles.actionButtonPrimary}`} onClick={handleSaveRequirementsText} disabled={isSavingDoc}>
                      {isSavingDoc ? "Saving..." : "Save"}
                    </button>
                  </>
                ) : (
                  <button className={styles.actionButton} onClick={() => setEditMode(true)}>Edit</button>
                )}
              </div>
            )}
          </div>

          <div style={{ flexGrow: 1, overflow: "hidden", position: "relative" }}>
            {isGeneratingReq ? (
              <div className={styles.emptyPreview}>
                <span className={styles.inlineSpinner} style={{ width: "32px", height: "32px", marginBottom: "1rem" }} />
                <h4>Compiling requirements...</h4>
              </div>
            ) : !requirementsGenerated ? (
              <div className={styles.emptyPreview}>
                <h4>No Document Compiled</h4>
                <p>Chat with the Product Analyst. Once you have alignment, click "Generate specs" below the chat pane.</p>
              </div>
            ) : editMode ? (
              <textarea
                className={styles.markdownEditor}
                value={tempRequirements}
                onChange={(e) => setTempRequirements(e.target.value)}
                disabled={isSavingDoc}
              />
            ) : (
              <div className={styles.previewContent}>
                <div className={styles.markdownBody}>
                  {renderSpecsMarkdown(requirementsContent)}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    );
  }

  // --- VIEW MODE 2: PHASE 2 DOCKED CURSOR IDE ---
  return (
    <div className={styles.workspaceLayout}>
      <div className={styles.mainContainer}>
        
        {/* Activity Bar far left */}
        <div className={styles.activityBar}>
          <div className={`${styles.activityIcon} ${styles.activityIconActive}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="9" y1="3" x2="9" y2="21"></line>
            </svg>
          </div>
          <div className={styles.activityIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
          <div className={styles.activityIcon} onClick={() => setViewMode("requirements")} title="Review Requirements (Phase 1)">
            {/* View Requirements document (Phase 1) */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
            </svg>
          </div>
          <div className={styles.activityIcon} onClick={onBack} title="Back to Dashboard">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </div>
        </div>

        {/* Sidebar Explorer */}
        <div className={styles.explorer}>
          <div className={styles.explorerHeader}>
            <h4>Explorer</h4>
            <span style={{ fontSize: "0.7rem", color: "#52525b" }}>{project.framework}</span>
          </div>

          <div className={styles.explorerTree}>
            <div style={{ fontSize: "0.75rem", fontWeight: "600", color: "#e4e4e7", padding: "0.25rem 0.5rem", userSelect: "none" }}>
              📁 {project.name.toUpperCase()}
            </div>
            {files.map((filepath) => (
              <button
                key={filepath}
                className={`${styles.treeItem} ${activeFile === filepath ? styles.treeItemActive : ""}`}
                onClick={() => handleOpenFile(filepath)}
              >
                📄 {filepath}
              </button>
            ))}
          </div>
        </div>

        {/* Code Editor (Center Panel) */}
        <div className={styles.editorPane}>
          <div className={styles.editorTabs}>
            {openTabs.map((tab) => (
              <div
                key={tab}
                className={`${styles.tab} ${activeFile === tab ? styles.tabActive : ""}`}
                onClick={() => handleOpenFile(tab)}
              >
                <span>{tab.split("/").pop()}</span>
                <span className={styles.tabClose} onClick={(e) => handleCloseTab(e, tab)}>&times;</span>
              </div>
            ))}
          </div>

          {activeFile ? (
            <>
              <div className={styles.editorToolbar}>
                <div className={styles.editorPath}>{project.name} / {activeFile}</div>
                <div className={styles.editorActions}>
                  <button 
                    className={`${styles.editorBtn} ${styles.editorBtnPrimary}`} 
                    onClick={handleSaveFile}
                    disabled={isSavingFile || isLoadingFile}
                  >
                    {isSavingFile ? "Saving..." : "Save File"}
                  </button>
                </div>
              </div>

              <div className={styles.editorViewport}>
                {isLoadingFile ? (
                  <div className={styles.editorSkeleton}>
                    <div className={styles.skeletonLine} style={{ width: "80%" }} />
                    <div className={styles.skeletonLine} style={{ width: "95%" }} />
                    <div className={styles.skeletonLine} style={{ width: "65%" }} />
                  </div>
                ) : (
                  <>
                    <div className={styles.lineNumbers}>
                      {fileContent.split("\n").map((_, lineIdx) => (
                        <div key={lineIdx}>{lineIdx + 1}</div>
                      ))}
                    </div>

                    <textarea
                      className={styles.codeArea}
                      value={fileContent}
                      onChange={(e) => setFileContent(e.target.value)}
                      spellCheck="false"
                    />
                  </>
                )}
              </div>
            </>
          ) : (
            <div className={styles.emptyEditor}>
              <svg className={styles.emptyEditorIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9.75L16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
              </svg>
              <h3>Workspace Loaded</h3>
              <p>Click files in the Explorer to inspect the codebase or modify requirements.</p>
            </div>
          )}
        </div>

        {/* Cursor AI chat assistant (Right panel) */}
        <div className={styles.aiPanel}>
          <div className={styles.aiHeader}>
            <h3>Cursor AI Coder</h3>
            <div className={styles.aiStatus}>
              <span className={styles.aiStatusDot} />
              <span>Phase 2 Broker</span>
            </div>
          </div>

          <div className={styles.aiMessages}>
            {ideMessages.length === 0 ? (
              <div className={styles.emptyEditor} style={{ padding: "2rem" }}>
                <p style={{ color: "#71717a", fontSize: "0.8rem", textAlign: "center" }}>
                  Discuss software implementation details, code layouts, or run instructions here with the Coder Agent.
                </p>
              </div>
            ) : (
              ideMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`${styles.msgRow} ${msg.role === "user" ? styles.msgRowUser : ""}`}
                >
                  <div className={`${styles.msgBubble} ${msg.role === "user" ? styles.msgBubbleUser : styles.msgBubbleAssistant}`}>
                    {msg.role === "user" ? msg.content : renderResponseMarkdown(msg.content)}
                  </div>
                </div>
              ))
            )}
            {isSendingIde && (
              <div className={styles.msgRow}>
                <div className={`${styles.msgBubble} ${styles.msgBubbleAssistant}`} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <span className={styles.inlineSpinner} />
                  <span style={{ fontSize: "0.75rem" }}>Coder thinking...</span>
                </div>
              </div>
            )}
            <div ref={ideMessagesEndRef} />
          </div>

          <div className={styles.aiInputArea}>
            <form onSubmit={handleSendIdeMessage} className={styles.aiForm}>
              <input
                type="text"
                className={styles.aiInput}
                placeholder="Ask coder helper to write code..."
                value={ideInputMessage}
                onChange={(e) => setIdeInputMessage(e.target.value)}
                disabled={isSendingIde}
              />
              <button type="submit" className={styles.aiSendBtn} disabled={!ideInputMessage.trim() || isSendingIde}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
            </form>
          </div>
        </div>

      </div>

      {/* Status Bar */}
      <div className={styles.statusBar}>
        <div className={styles.statusLeft}>
          <div className={styles.statusItem} style={{ color: "#10b981" }}>
            <span>●</span>
            <span>Connected</span>
          </div>
          <div className={styles.statusItem}>
            <span>git:</span>
            <span style={{ color: "#e4e4e7" }}>main</span>
          </div>
        </div>

        <div className={styles.statusRight}>
          {isSavingFile && (
            <div className={`${styles.statusItem} ${styles.statusSyncing}`}>
              <span>🔄</span>
              <span>Saving disk file...</span>
            </div>
          )}
          <div className={styles.statusItem}>
            <span>UTF-8</span>
          </div>
          <div className={styles.statusItem}>
            <span>{project.framework === "nextjs" ? "JavaScript" : "Python"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
