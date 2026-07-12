"use client";

import { useState, useEffect, useRef } from "react";
import styles from "./WorkspacePage.module.css";

// Markdown block parser
function parseMarkdown(text) {
  if (!text) return [];
  const lines = text.split('\n');
  const blocks = [];
  
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    
    // 1. Code block
    if (line.trim().startsWith('```')) {
      const match = line.trim().match(/^```(\w+)?/);
      const language = match ? match[1] : '';
      let codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push({
        type: 'code',
        language: language || 'text',
        content: codeLines.join('\n')
      });
      i++; // skip closing ```
      continue;
    }
    
    // 2. Table
    if (line.trim().startsWith('|')) {
      let tableLines = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      if (tableLines.length >= 2) {
        const headers = tableLines[0].split('|').map(s => s.trim()).filter((s, idx, arr) => idx > 0 && idx < arr.length - 1);
        const rows = tableLines.slice(2).map(rowLine => {
          return rowLine.split('|').map(s => s.trim()).filter((s, idx, arr) => idx > 0 && idx < arr.length - 1);
        });
        blocks.push({
          type: 'table',
          headers,
          rows
        });
      } else {
        tableLines.forEach(l => {
          blocks.push({ type: 'paragraph', content: l });
        });
      }
      continue;
    }
    
    // 3. Blockquote
    if (line.startsWith('> ')) {
      let bqLines = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        bqLines.push(lines[i].substring(2));
        i++;
      }
      blocks.push({
        type: 'blockquote',
        content: bqLines.join('\n')
      });
      continue;
    }
    
    // 4. Headers
    if (line.startsWith('# ')) {
      blocks.push({ type: 'header', level: 1, content: line.substring(2) });
      i++;
      continue;
    }
    if (line.startsWith('## ')) {
      blocks.push({ type: 'header', level: 2, content: line.substring(3) });
      i++;
      continue;
    }
    if (line.startsWith('### ')) {
      blocks.push({ type: 'header', level: 3, content: line.substring(4) });
      i++;
      continue;
    }
    if (line.startsWith('#### ')) {
      blocks.push({ type: 'header', level: 4, content: line.substring(5) });
      i++;
      continue;
    }
    
    // 5. Lists (unordered and ordered)
    const listMatch = line.match(/^(\s*)([-*]|\d+\.)\s(.*)/);
    if (listMatch) {
      const items = [];
      while (i < lines.length) {
        const l = lines[i];
        const match = l.match(/^(\s*)([-*]|\d+\.)\s(.*)/);
        if (!match) break;
        
        const isTask = match[3].startsWith('[ ]') || match[3].startsWith('[x]') || match[3].startsWith('[X]');
        const checked = match[3].startsWith('[x]') || match[3].startsWith('[X]');
        const textContent = isTask ? match[3].substring(3).trim() : match[3];
        
        items.push({
          indent: match[1].length,
          marker: match[2],
          content: textContent,
          isTask,
          checked
        });
        i++;
      }
      blocks.push({
        type: 'list',
        items
      });
      continue;
    }
    
    // 6. Empty line
    if (!line.trim()) {
      blocks.push({ type: 'empty' });
      i++;
      continue;
    }
    
    // 7. Paragraph
    blocks.push({ type: 'paragraph', content: line });
    i++;
  }
  
  return blocks;
}

// Custom code block with copy button
function CodeBlock({ language, content }) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div style={{
      border: '1px solid #27272a',
      borderRadius: '6px',
      overflow: 'hidden',
      margin: '0.75rem 0',
      backgroundColor: '#09090b',
      fontFamily: 'monospace'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.35rem 0.75rem',
        backgroundColor: '#18181b',
        borderBottom: '1px solid #27272a',
        fontSize: '0.7rem',
        color: '#a1a1aa'
      }}>
        <span>{language.toUpperCase()}</span>
        <button 
          onClick={handleCopy}
          style={{
            background: 'none',
            border: 'none',
            color: copied ? '#10b981' : '#a1a1aa',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.7rem'
          }}
        >
          {copied ? (
            <>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              Copy
            </>
          )}
        </button>
      </div>
      <pre style={{
        margin: 0,
        padding: '1rem',
        overflowX: 'auto',
        fontSize: '0.85rem',
        lineHeight: '1.5',
        color: '#e4e4e7',
        backgroundColor: '#09090b'
      }}>
        <code>{content}</code>
      </pre>
    </div>
  );
}

// React Markdown component
function Markdown({ content }) {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!content) return null;
  const blocks = parseMarkdown(content);
  
  const renderInline = (str) => {
    if (!str) return '';
    let formatted = str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    formatted = formatted.replace(/__(.*?)__/g, "<strong>$1</strong>");
    formatted = formatted.replace(/\*(.*?)\*/g, "<em>$1</em>");
    formatted = formatted.replace(/_(.*?)_/g, "<em>$1</em>");
    formatted = formatted.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: #818cf8; text-decoration: underline;">$1</a>');
    formatted = formatted.replace(/`(.*?)`/g, '<code style="background-color: #18181b; color: #fb7185; padding: 0.15rem 0.35rem; border-radius: 4px; font-family: monospace; font-size: 0.9em;">$1</code>');
    
    return <span dangerouslySetInnerHTML={{ __html: formatted }} />;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {blocks.map((block, idx) => {
        switch (block.type) {
          case 'header':
            if (block.level === 1) return <h1 key={idx} style={{ fontSize: '1.65rem', fontWeight: '700', color: '#ffffff', marginTop: '1.75rem', marginBottom: '0.85rem', borderBottom: '1px solid #27272a', paddingBottom: '0.35rem' }}>{renderInline(block.content)}</h1>;
            if (block.level === 2) return <h2 key={idx} style={{ fontSize: '1.35rem', fontWeight: '600', color: '#ffffff', marginTop: '1.4rem', marginBottom: '0.7rem' }}>{renderInline(block.content)}</h2>;
            if (block.level === 3) return <h3 key={idx} style={{ fontSize: '1.15rem', fontWeight: '600', color: '#ffffff', marginTop: '1.2rem', marginBottom: '0.6rem' }}>{renderInline(block.content)}</h3>;
            return <h4 key={idx} style={{ fontSize: '1.025rem', fontWeight: '600', color: '#ffffff', marginTop: '1rem', marginBottom: '0.5rem' }}>{renderInline(block.content)}</h4>;
            
          case 'code':
            return <CodeBlock key={idx} language={block.language} content={block.content} />;
            
          case 'table':
            return (
              <div key={idx} style={{ overflowX: 'auto', margin: '1.25rem 0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', color: '#ededed' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #3f3f46', backgroundColor: '#18181b' }}>
                      {block.headers.map((h, hidx) => (
                        <th key={hidx} style={{ padding: '0.6rem 0.8rem', textAlign: 'left', fontWeight: '600', border: '1px solid #27272a' }}>{renderInline(h)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, ridx) => (
                      <tr key={ridx} style={{ borderBottom: '1px solid #27272a', backgroundColor: ridx % 2 === 0 ? '#0c0c0f' : '#141417' }}>
                        {row.map((cell, cidx) => (
                          <td key={cidx} style={{ padding: '0.6rem 0.8rem', border: '1px solid #27272a' }}>{renderInline(cell)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
            
          case 'blockquote':
            return (
              <blockquote key={idx} style={{ borderLeft: '4px solid #6366f1', paddingLeft: '1rem', color: '#a1a1aa', margin: '1rem 0', fontStyle: 'italic' }}>
                {renderInline(block.content)}
              </blockquote>
            );
            
          case 'list':
            return (
              <ul key={idx} style={{ paddingLeft: '1.25rem', margin: '0.65rem 0', listStyleType: 'none' }}>
                {block.items.map((item, iidx) => {
                  const paddingLeft = `${item.indent * 12}px`;
                  if (item.isTask) {
                    return (
                      <li key={iidx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingLeft, marginBottom: '0.35rem' }}>
                        <input type="checkbox" checked={item.checked} readOnly style={{ accentColor: '#6366f1', cursor: 'default' }} />
                        <span>{renderInline(item.content)}</span>
                      </li>
                    );
                  }
                  const isOrdered = /^\d/.test(item.marker);
                  return (
                    <li key={iidx} style={{ display: 'flex', gap: '0.5rem', paddingLeft, marginBottom: '0.35rem' }}>
                      <span style={{ color: '#a1a1aa', minWidth: '1rem', fontSize: '0.95rem' }}>{isOrdered ? item.marker : '•'}</span>
                      <span>{renderInline(item.content)}</span>
                    </li>
                  );
                })}
              </ul>
            );
            
          case 'empty':
            return <div key={idx} style={{ height: '0.5rem' }} />;
            
          case 'paragraph':
          default:
            return <p key={idx} style={{ fontSize: '0.95rem', lineHeight: '1.65', marginBottom: '0.85rem', color: '#e4e4e7' }}>{renderInline(block.content)}</p>;
        }
      })}
    </div>
  );
}

export default function WorkspacePage({ project, username, onBack }) {
  // Navigation & view states: "requirements" (Phase 1) or "ide" (Phase 2)
  const [viewMode, setViewMode] = useState("requirements");
  const [selectedModel, setSelectedModel] = useState("nvidia/nemotron-3-ultra-550b-a55b:free");

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

  // New Requirements Extensions States
  const [requirementsHistory, setRequirementsHistory] = useState([]);
  const [activeHistoryVersion, setActiveHistoryVersion] = useState(null);
  const [historicalContent, setHistoricalContent] = useState("");

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

  const SUGGESTIONS = [
    "Define User Roles & Permissions",
    "Propose Tech Stack & Database Schema",
    "Design Core API Endpoints",
    "Detail Authentication & Security Flows"
  ];

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
          setRequirementsHistory(data.requirements_history || []);
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
  // Centralized stream helper for chat requests
  const streamChatMessage = async (msgText, chatType) => {
    const isReq = chatType === "requirements";
    const setMessages = isReq ? setReqMessages : setIdeMessages;
    const setIsSending = isReq ? setIsSendingReq : setIsSendingIde;
    
    setIsSending(true);
    
    const tempUserMsg = {
      id: Date.now(),
      project_id: project.id,
      role: "user",
      content: msgText,
      chat_type: chatType,
      created_at: new Date().toISOString()
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    
    const assistantTempId = Date.now() + 1;
    const tempAssistantMsg = {
      id: assistantTempId,
      role: "assistant",
      content: "",
      chat_type: chatType,
      created_at: new Date().toISOString()
    };
    setMessages((prev) => [...prev, tempAssistantMsg]);
    
    try {
      const response = await fetch(`http://localhost:8000/api/v1/projects/${project.id}/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          content: msgText, 
          chat_type: chatType,
          model: selectedModel
        })
      });
      
      if (!response.ok) {
        throw new Error("Failed to start stream");
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";
      let remainder = "";
      let isDbCommitted = false;
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          if (remainder) {
            processSSELine(remainder);
          }
          break;
        }
        
        const chunk = remainder + decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        remainder = lines.pop() || "";
        
        for (const line of lines) {
          processSSELine(line);
        }
      }
      
      function processSSELine(line) {
        if (!line.startsWith("data: ")) return;
        const dataStr = line.slice(6).trim();
        if (!dataStr) return;
        try {
          const dataJson = JSON.parse(dataStr);
          if (dataJson.error) {
            setMessages((prev) => 
              prev.map(m => m.id === assistantTempId ? { ...m, content: "Error: " + dataJson.error } : m)
            );
            return;
          }
          if (dataJson.done) {
            isDbCommitted = true;
            return;
          }
          if (dataJson.content) {
            accumulatedText += dataJson.content;
            
            let chatReply = "";
            let requirements = "";
            
            const chatRegex = /===\s*CHAT_?REPLY\s*===/i;
            const reqRegex = /===\s*REQUIREMENTS\s*===/i;
            
            const chatMatch = accumulatedText.match(chatRegex);
            const reqMatch = accumulatedText.match(reqRegex);
            
            if (chatMatch && reqMatch) {
              const chatIndex = chatMatch.index;
              const reqIndex = reqMatch.index;
              const chatEnd = chatIndex + chatMatch[0].length;
              const reqEnd = reqIndex + reqMatch[0].length;
              
              if (chatIndex < reqIndex) {
                chatReply = accumulatedText.substring(chatEnd, reqIndex);
                requirements = accumulatedText.substring(reqEnd);
              } else {
                requirements = accumulatedText.substring(reqEnd, chatIndex);
                chatReply = accumulatedText.substring(chatEnd);
              }
            } else if (chatMatch) {
              const chatEnd = chatMatch.index + chatMatch[0].length;
              chatReply = accumulatedText.substring(chatEnd);
            } else if (reqMatch) {
              const reqEnd = reqMatch.index + reqMatch[0].length;
              requirements = accumulatedText.substring(reqEnd);
            } else {
              chatReply = accumulatedText;
            }
            
            setMessages((prev) => 
              prev.map(m => m.id === assistantTempId ? { ...m, content: chatType === "coder" ? accumulatedText : chatReply } : m)
            );
            
            if (isReq && requirements) {
              setRequirementsContent(requirements);
              setTempRequirements(requirements);
              setRequirementsGenerated(true);
            }
          }
        } catch (e) {
          // Ignore json parse error for split lines
        }
      }
      
      // Wait for DB commit to complete
      if (!isDbCommitted) {
        await new Promise(resolve => setTimeout(resolve, 500));
      } else {
        await new Promise(resolve => setTimeout(resolve, 150));
      }
      
      // Resync history and chat to get correct IDs & versions from database
      if (isReq) {
        const refreshResponse = await fetch(`http://localhost:8000/api/v1/projects/${project.id}/chat?chat_type=requirements`);
        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          setReqMessages(data.messages);
          setRequirementsHistory(data.requirements_history || []);
          if (data.requirements_content) {
            setRequirementsContent(data.requirements_content);
            setTempRequirements(data.requirements_content);
          }
        }
      } else {
        const refreshResponse = await fetch(`http://localhost:8000/api/v1/projects/${project.id}/chat?chat_type=coder`);
        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          setIdeMessages(data.messages);
        }
      }
      
    } catch (err) {
      console.error("Error streaming chat:", err);
      setMessages((prev) => 
        prev.map(m => m.id === assistantTempId ? { ...m, content: "Network error occurred. Please try again." } : m)
      );
    } finally {
      setIsSending(false);
    }
  };

  // Send Requirements Gathering Message (Phase 1)
  const handleSendReqMessage = async (e) => {
    e?.preventDefault();
    const msgText = reqInputMessage.trim();
    if (!msgText || isSendingReq) return;
    setReqInputMessage("");
    await streamChatMessage(msgText, "requirements");
  };

  // Triggered by clicking Suggestion Chips
  const handleSuggestionClick = async (suggestionText) => {
    if (isSendingReq) return;
    await streamChatMessage(suggestionText, "requirements");
  };

  // Select requirements history revision to preview in right panel
  const handleSelectHistoryVersion = (rev) => {
    if (rev === null) {
      setActiveHistoryVersion(null);
      setHistoricalContent("");
    } else {
      setActiveHistoryVersion(rev.version);
      setHistoricalContent(rev.content);
    }
  };

  // Revert/Restore requirements to specific version
  const handleRevertVersion = async (version) => {
    if (!window.confirm(`Are you sure you want to revert requirements to Version ${version}?`)) {
      return;
    }
    try {
      const response = await fetch(`http://localhost:8000/api/v1/projects/${project.id}/requirements/revert/${version}`, {
        method: "POST"
      });
      if (response.ok) {
        const data = await response.json();
        setRequirementsContent(data.requirements_content);
        setTempRequirements(data.requirements_content);
        setRequirementsHistory(data.requirements_history);
        setReqMessages(data.messages);
        setActiveHistoryVersion(null);
        setHistoricalContent("");
      }
    } catch (err) {
      console.error("Error reverting version:", err);
    }
  };

  // Reset chat and requirements.md
  const handleResetChat = async () => {
    if (!window.confirm("Are you sure you want to clear the chat and reset specifications to initial state? This cannot be undone.")) {
      return;
    }
    try {
      const response = await fetch(`http://localhost:8000/api/v1/projects/${project.id}/chat/reset`, {
        method: "POST"
      });
      if (response.ok) {
        const data = await response.json();
        setReqMessages(data.messages);
        setRequirementsContent(data.requirements_content);
        setTempRequirements(data.requirements_content);
        setRequirementsHistory(data.requirements_history);
        setRequirementsGenerated(data.requirements_generated);
        setActiveHistoryVersion(null);
        setHistoricalContent("");
      }
    } catch (err) {
      console.error("Error resetting chat:", err);
    }
  };

  // Compile Phase 1 Interview transcript to requirements.md manually
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
        // Refresh history
        const fetchHistory = await fetch(`http://localhost:8000/api/v1/projects/${project.id}/chat?chat_type=requirements`);
        if (fetchHistory.ok) {
          const resJson = await fetchHistory.json();
          setRequirementsHistory(resJson.requirements_history || []);
        }
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
        // Refresh requirements history after manual save
        const historyResponse = await fetch(`http://localhost:8000/api/v1/projects/${project.id}/chat?chat_type=requirements`);
        if (historyResponse.ok) {
          const data = await historyResponse.json();
          setRequirementsHistory(data.requirements_history || []);
        }
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
    await streamChatMessage(msgText, "coder");
  };

  // Render markdown tags inline
  const renderResponseMarkdown = (text) => {
    return <Markdown content={text} />;
  };

  const renderSpecsMarkdown = (text) => {
    return <Markdown content={text} />;
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
              <h2>{project.name.toUpperCase()}</h2>
              <div className={styles.projectMeta}>
                <span className={styles.metaBadge}>{project.framework}</span>
                <span className={styles.metaBadge}>{project.visibility}</span>
              </div>
            </div>

            <div>
              <h4 className={styles.sectionTitle}>File Explorer</h4>
              <div className={styles.fileList}>
                <button 
                  className={`${styles.fileItem} ${activeHistoryVersion === null ? styles.fileItemActive : ""}`}
                  onClick={() => handleSelectHistoryVersion(null)}
                  style={{ cursor: "pointer" }}
                >
                  📄 requirements.md (Live)
                </button>
              </div>
            </div>

            <div className={styles.historySection}>
              <h4 className={styles.sectionTitle}>Change History</h4>
              <div className={styles.historyList}>
                {requirementsHistory.length === 0 ? (
                  <div style={{ fontSize: "0.75rem", color: "#52525b", padding: "0.5rem" }}>
                    No revisions yet.
                  </div>
                ) : (
                  requirementsHistory.map((rev) => (
                    <button
                      key={rev.id}
                      className={`${styles.historyItem} ${activeHistoryVersion === rev.version ? styles.historyItemActive : ""}`}
                      onClick={() => handleSelectHistoryVersion(rev)}
                    >
                      <div className={styles.historyItemHeader}>
                        <span className={styles.historyVersion}>v{rev.version}</span>
                        <span className={styles.historyTime}>
                          {new Date(rev.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className={styles.historySummary} title={rev.summary || `Version ${rev.version}`}>
                        {rev.summary || `Update version ${rev.version}`}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
            
            <button 
              className={styles.startNewChatBtn}
              onClick={handleResetChat}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
              Start a New Chat
            </button>
          </div>

          <div className={styles.reqSidebarFooter}>
            <button 
              className={styles.downloadButton} 
              onClick={handleDownloadRequirements}
              disabled={!requirementsContent}
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
            <h3>Phase 1: Query Optimizer Engine</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <select 
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className={styles.modelSelect}
              >
                <option value="nvidia/nemotron-3-ultra-550b-a55b:free">Nemotron 550B (Free)</option>
                <option value="meta-llama/llama-3-8b-instruct:free">Llama 3 8B (Free)</option>
                <option value="mistralai/mistral-7b-instruct:free">Mistral 7B (Free)</option>
                <option value="google/gemma-2-9b-it:free">Gemma 2 9B (Free)</option>
                <option value="qwen/qwen-2-7b-instruct:free">Qwen 2 7B (Free)</option>
                <option value="microsoft/phi-3-medium-128k-instruct:free">Phi 3 Medium (Free)</option>
              </select>
              <div className={styles.aiStatus}>
                <span className={styles.aiStatusDot} />
                <span>AI Analyst Active</span>
              </div>
            </div>
          </div>

          <div className={styles.chatMessages}>
            {reqMessages.length === 0 ? (
              <div className={styles.emptyPreview}>
                <h4>Product Analyst Interview</h4>
                <p>Discuss your application goal, target users, and key features to optimize specifications.</p>
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
            {activeHistoryVersion === null && (
              <div className={styles.suggestionChips}>
                {SUGGESTIONS.map((s, idx) => (
                  <button
                    key={idx}
                    className={styles.suggestionChip}
                    onClick={() => handleSuggestionClick(s)}
                    disabled={isSendingReq}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {requirementsContent && (
              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <button className={styles.launchWorkspaceBtn} onClick={handleLaunchIDE} style={{ padding: "0.45rem", fontSize: "0.75rem", boxShadow: "none" }}>
                  Launch Cursor IDE Workspace →
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
          {activeHistoryVersion !== null && (
            <div className={styles.historyBanner}>
              <span className={styles.historyBannerText}>
                ⚠️ Viewing Version {activeHistoryVersion} (Historical Archive)
              </span>
              <div className={styles.historyBannerActions}>
                <button
                  className={styles.historyBannerBtn}
                  onClick={() => handleSelectHistoryVersion(null)}
                >
                  Back to Live
                </button>
                <button
                  className={`${styles.historyBannerBtn} ${styles.historyBannerBtnPrimary}`}
                  onClick={() => handleRevertVersion(activeHistoryVersion)}
                >
                  Restore this Version
                </button>
              </div>
            </div>
          )}

          <div className={styles.previewHeader}>
            <div className={styles.previewTitle}>
              📄 requirements.md {activeHistoryVersion !== null ? `(v${activeHistoryVersion})` : "(Live)"}
            </div>
            {activeHistoryVersion === null && requirementsContent && (
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

          <div style={{ flexGrow: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
            {isGeneratingReq ? (
              <div className={styles.emptyPreview}>
                <span className={styles.inlineSpinner} style={{ width: "32px", height: "32px", marginBottom: "1rem" }} />
                <h4>Compiling requirements...</h4>
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
                  {renderSpecsMarkdown(activeHistoryVersion !== null ? historicalContent : requirementsContent)}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <select 
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className={styles.modelSelect}
              >
                <option value="nvidia/nemotron-3-ultra-550b-a55b:free">Nemotron 550B (Free)</option>
                <option value="meta-llama/llama-3-8b-instruct:free">Llama 3 8B (Free)</option>
                <option value="mistralai/mistral-7b-instruct:free">Mistral 7B (Free)</option>
                <option value="google/gemma-2-9b-it:free">Gemma 2 9B (Free)</option>
                <option value="qwen/qwen-2-7b-instruct:free">Qwen 2 7B (Free)</option>
                <option value="microsoft/phi-3-medium-128k-instruct:free">Phi 3 Medium (Free)</option>
              </select>
              <div className={styles.aiStatus}>
                <span className={styles.aiStatusDot} />
                <span>Phase 2 Broker</span>
              </div>
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
