import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { io } from "socket.io-client";
import { motion, AnimatePresence } from "framer-motion";
import hljs from "highlight.js";
import "highlight.js/styles/atom-one-dark.css"; // Beautiful dark theme

const AVAILABLE_REACTIONS = ["⭐", "🔥", "💀", "👀", "🚀"];

const CHALLENGE_PROMPTS = [
  "FizzBuzz but make it interesting — fizz for primes, buzz for fibonacci numbers",
  "Write a function that roasts a variable name. Input: 'x1', Output: 'Did you really name it x1?'",
  "Given an array of commit messages, return only the ones that are actual descriptions (not 'fix', 'wip', 'asdf', 'update')",
  "Write the world's most passive-aggressive comment for a function that divides by zero",
  "Reverse a string. But without using any built-in reverse function. And write it in the most unreadable one-liner possible.",
  "Write a function isPairProgrammingCompatible(dev1, dev2) — you define the inputs and logic",
  "Calculate the 'bus factor' score of a fake 3-person team given their commit counts",
  "Write a function that converts a GitHub username to a horoscope sign based on account creation month",
  "Given an array of tech stack names, return them sorted by 'how much they'd annoy a senior dev at a standup'",
  "Write a decorator/wrapper that makes any function print a sarcastic loading message before running"
];

// Helper to format relative time
function timeFormatter(dateString) {
  const d = new Date(dateString);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function Chat() {
  const { matchId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [partner, setPartner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inputVal, setInputVal] = useState("");
  
  // Sockets & UI states
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);

  // Modals / context menus
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [reactionMenu, setReactionMenu] = useState(null); // { messageId, x, y }

  // 1. Fetch exact match info & initial messages
  useEffect(() => {
    if (!matchId) {
      navigate("/matches");
      return;
    }

    const fetchMessages = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/messages/${matchId}`, { credentials: "include" });
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setMessages(data);

        // Find partner info from the first non-system message or by fetching the match object
        // For simplicity, we assume we can extract partner from a message if available
        const partnerMsg = data.find(m => m.senderId !== user.id && m.type !== 'system');
        if (partnerMsg) {
          setPartner(partnerMsg.sender);
        } else {
          // If no partner messages yet, fetch matches to find partner profile
          const mRes = await fetch(`http://localhost:5000/api/matches`, { credentials: "include" });
          const mData = await mRes.json();
          const matchObj = mData.find(m => m.id === matchId);
          if (matchObj) setPartner(matchObj.profile);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [matchId, navigate, user.id]);

  // 2. Setup Sockets
  useEffect(() => {
    socketRef.current = io("http://localhost:5000", {
      withCredentials: true
    });

    const socket = socketRef.current;

    socket.on("connect", () => {
      socket.emit("join_room", { matchId });
    });

    socket.on("message_received", (msg) => {
      setMessages((prev) => [...prev, msg]);
      
      // If it's not from me, mark it as read
      if (msg.senderId !== user.id) {
        socket.emit("mark_read", { matchId });
      }
    });

    socket.on("message_updated", (updatedMsg) => {
      setMessages((prev) => prev.map(m => m.id === updatedMsg.id ? { ...m, reactions: updatedMsg.reactions } : m));
    });

    socket.on("typing_indicator", ({ userId, isTyping: typingStatus }) => {
      if (userId !== user.id) setIsTyping(typingStatus);
    });

    socket.on("messages_read", ({ readBy }) => {
      setMessages((prev) => prev.map(m => (!m.readAt && m.senderId !== readBy) ? { ...m, readAt: new Date().toISOString() } : m));
    });

    // Initial mark read
    socket.emit("mark_read", { matchId });

    return () => socket.disconnect();
  }, [matchId, user.id]);

  // 3. Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // 4. Highlight.js after render
  useEffect(() => {
    document.querySelectorAll('pre code').forEach((el) => {
      hljs.highlightElement(el);
    });
  }, [messages]);

  // Handle typing indicator emission
  const handleInputChange = (e) => {
    setInputVal(e.target.value);
    
    if (socketRef.current) {
      socketRef.current.emit("typing_indicator", { matchId, isTyping: true });
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socketRef.current.emit("typing_indicator", { matchId, isTyping: false });
      }, 1500);
    }
  };

  const sendMessage = (content, type = "text", language = null) => {
    if (!content.trim()) return;
    socketRef.current.emit("send_message", { matchId, content, type, language });
    setInputVal("");
    if (type === "code") setShowCodeModal(false);
  };

  const handleContextMenu = (e, msgId) => {
    e.preventDefault();
    setReactionMenu({ messageId: msgId, x: e.clientX, y: e.clientY });
  };

  const addReaction = (emoji) => {
    if (reactionMenu) {
      socketRef.current.emit("add_reaction", { messageId: reactionMenu.messageId, emoji });
      setReactionMenu(null);
    }
  };

  // Click outside to close context menu
  useEffect(() => {
    const closeMenu = () => setReactionMenu(null);
    window.addEventListener("click", closeMenu);
    return () => window.removeEventListener("click", closeMenu);
  }, []);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-brand-pink/20 border-t-brand-pink rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-bg-base relative">
      
      {/* Header */}
      <div className="h-16 shrink-0 bg-bg-card border-b border-bg-border flex items-center px-6 justify-between z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/matches")} className="w-8 h-8 rounded-full hover:bg-bg-border flex items-center justify-center text-text-muted transition-colors mr-2">
            ←
          </button>
          {partner && (
            <>
              <div className="relative">
                <img src={partner.avatarUrl} alt={partner.username} className="w-10 h-10 rounded-full border border-bg-border object-cover" />
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-bg-card rounded-full"></span>
              </div>
              <div>
                <h3 className="text-text-primary font-bold leading-tight max-w-[150px] sm:max-w-xs truncate">@{partner.username}</h3>
                <p className="text-xs font-mono text-green-400">Online — building</p>
              </div>
            </>
          )}
        </div>
        {partner && (
           <a href={`https://github.com/${partner.username}`} target="_blank" rel="noreferrer" className="px-4 py-1.5 rounded-full border border-bg-border text-xs text-text-secondary hover:text-white hover:border-brand-pink transition-colors font-bold tracking-wide">
             View GitHub ↗
           </a>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scrollbar-hide">
        {messages.map((msg, idx) => {
          const isMe = msg.senderId === user.id;

          // Render System Message
          if (msg.type === "system") {
            return (
              <div key={msg.id} className="flex justify-center w-full my-6">
                <div className="bg-bg-card/50 border border-bg-border px-6 py-3 rounded-2xl flex items-center gap-3 backdrop-blur-sm max-w-lg text-center shadow-lg">
                  <span className="text-2xl animate-bounce">🧊</span>
                  <div className="text-sm">
                    <span className="text-brand-pink font-bold">ICEBREAKER: </span>
                    <span className="text-text-primary italic">"{msg.content.replace("You just matched! Here's an icebreaker: ", "")}"</span>
                  </div>
                </div>
              </div>
            );
          }

          if (msg.type === "challenge") {
            return (
              <div key={msg.id} className="flex justify-center w-full my-8">
                <ChallengeCard matchId={matchId} partner={partner} socket={socketRef.current} />
              </div>
            );
          }

          return (
            <div 
              key={msg.id} 
              className={`flex ${isMe ? 'justify-end' : 'justify-start'} group w-full relative`}
              onContextMenu={(e) => handleContextMenu(e, msg.id)}
            >
              {!isMe && partner && (
                <img src={partner.avatarUrl} className="w-8 h-8 rounded-full border border-bg-border mr-3 shrink-0 self-end mb-1" alt="avatar" />
              )}
              
              <div className={`flex flex-col max-w-[85%] sm:max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
                {/* The Bubble */}
                <div className={`relative px-4 py-2.5 shadow-sm
                  ${msg.type === 'code' ? 'bg-[#282c34] text-gray-300 w-full overflow-hidden' : 
                    isMe ? 'bg-gradient-to-br from-brand-pink/90 to-brand-purple/90 text-white' : 'bg-bg-card text-text-primary'}
                  ${isMe ? 'rounded-[20px] rounded-br-[4px]' : 'rounded-[20px] rounded-bl-[4px] border border-bg-border'}`}
                >
                  {/* Content Renderer */}
                  {msg.type === 'text' && (
                    <RepoLinkDetector text={msg.content} />
                  )}

                  {msg.type === 'code' && (
                    <div className="flex flex-col">
                      <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-700">
                        <span className="text-xs font-mono text-gray-500 uppercase">{msg.language || 'code'}</span>
                        <button 
                          onClick={() => navigator.clipboard.writeText(msg.content)}
                          className="text-xs text-gray-500 hover:text-white transition-colors flex items-center gap-1"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                          Copy
                        </button>
                      </div>
                      <pre className="text-sm font-mono m-0 p-0 overflow-x-auto bg-transparent"><code className={`language-${msg.language || 'plaintext'}`}>{msg.content}</code></pre>
                    </div>
                  )}

                  {/* Reaction Badges Inline */}
                  {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                    <div className={`absolute -bottom-4 ${isMe ? 'right-2' : 'left-2'} flex gap-1 z-10`}>
                      {Object.entries(msg.reactions).map(([emoji, users]) => (
                        <div key={emoji} className="bg-bg-card border border-bg-border rounded-full px-1.5 py-0.5 text-xs flex items-center shadow-md">
                          {emoji} <span className="ml-1 text-[10px] text-text-muted">{users.length}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Metadata row under bubble */}
                <div className={`flex items-center gap-2 mt-1 px-1.5 opacity-0 group-hover:opacity-100 transition-opacity ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <span className="text-[10px] text-text-muted font-mono">{timeFormatter(msg.createdAt)}</span>
                  {isMe && (
                     <span className={`text-[10px] font-bold tracking-widest ${msg.readAt ? 'text-brand-pink' : 'text-text-muted'}`}>
                       {msg.readAt ? '✓✓' : '✓'}
                     </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex justify-start w-full">
            <div className="bg-bg-card border border-bg-border rounded-full px-4 py-3 flex gap-1">
              <span className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="shrink-0 bg-bg-base border-t border-bg-border p-4">
        <form 
          className="flex items-end gap-3 max-w-4xl mx-auto relative bg-bg-card border border-bg-border rounded-2xl p-2 transition-all focus-within:border-brand-pink/50 focus-within:shadow-[0_0_20px_rgba(233,30,140,0.1)]"
          onSubmit={(e) => { e.preventDefault(); sendMessage(inputVal); }}
        >
          {/* Action buttons left */}
          <button type="button" onClick={() => setShowCodeModal(true)} className="p-2 shrink-0 text-text-muted hover:text-brand-pink transition-colors rounded-xl hover:bg-brand-pink/10" title="Send snippet">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
          </button>

          {/* Text Area auto-resizing hack */}
          <textarea
            value={inputVal}
            onChange={handleInputChange}
            placeholder="Commit a message... (paste GitHub URLs for repo cards)"
            className="flex-1 bg-transparent border-none focus:ring-0 text-text-primary resize-none max-h-32 min-h-[44px] py-3 text-[15px] placeholder:text-text-muted scrollbar-hide"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(inputVal);
              }
            }}
          />

          {/* Send right */}
          <button 
            type="submit" 
            disabled={!inputVal.trim()}
            className="w-11 h-11 shrink-0 bg-brand-pink rounded-xl flex items-center justify-center text-white disabled:opacity-50 disabled:bg-bg-border transition-all hover:shadow-lg hover:shadow-brand-pink/20"
          >
            <svg className="w-5 h-5 ml-1" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
           </button>
        </form>
      </div>

      {/* Code Modal Overlay */}
      <AnimatePresence>
        {showCodeModal && <CodeSnippetModal onClose={() => setShowCodeModal(false)} onSend={(code, lang) => sendMessage(code, "code", lang)} />}
      </AnimatePresence>

      {/* Reaction Context Menu */}
      <AnimatePresence>
        {reactionMenu && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={{ position: "fixed", top: reactionMenu.y - 60, left: reactionMenu.x - 100 }}
            className="bg-bg-card border border-bg-border rounded-full shadow-2xl p-2 flex gap-2 z-50"
            onClick={(e) => e.stopPropagation()}
          >
            {AVAILABLE_REACTIONS.map(emoji => (
              <button 
                key={emoji} 
                onClick={() => addReaction(emoji)}
                className="w-10 h-10 rounded-full hover:bg-bg-base text-xl flex items-center justify-center transition-transform hover:scale-125"
              >
                {emoji}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Helper to auto-detect GitHub links and render RepoCards within text
function RepoLinkDetector({ text }) {
  const githubRegex = /(https?:\/\/github\.com\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+)/g;
  const parts = text.split(githubRegex);

  return (
    <div className="whitespace-pre-wrap word-break leading-relaxed text-[15px]">
      {parts.map((part, i) => {
        if (part.match(githubRegex)) {
          return <EmbeddedRepoCard key={i} url={part} />;
        }
        return <span key={i}>{part}</span>;
      })}
    </div>
  );
}

// Fetches summary data from GitHub API and renders a card
function EmbeddedRepoCard({ url }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    try {
      // Remove trailing slash if any and extract owner/repo
      const cleanUrl = url.endsWith('/') ? url.slice(0, -1) : url;
      const [, , , owner, repo] = cleanUrl.split('/');
      if (owner && repo) {
        fetch(`https://api.github.com/repos/${owner}/${repo}`)
          .then(r => r.ok ? r.json() : null)
          .then(setData)
          .catch(() => {});
      }
    } catch(e) {}
  }, [url]);

  return (
    <div className="my-2 border border-bg-border/50 bg-bg-base/30 rounded-xl overflow-hidden max-w-sm block">
      <a href={url} target="_blank" rel="noreferrer" className="block p-4 hover:bg-bg-border/20 transition-colors">
        <div className="flex items-center gap-2 mb-2">
           <svg className="w-4 h-4 text-text-muted shrink-0" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"/></svg>
           <h4 className="font-bold text-brand-pink text-sm truncate">{data ? data.full_name : url.replace('https://github.com/','')}</h4>
        </div>
        {data && (
          <>
            <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed mb-3">{data.description}</p>
            <div className="flex items-center gap-4 text-[10px] text-text-muted font-mono">
              {data.language && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span>{data.language}</span>}
              <span className="flex items-center gap-1">⭐ {data.stargazers_count}</span>
            </div>
          </>
        )}
      </a>
    </div>
  );
}

function CodeSnippetModal({ onClose, onSend }) {
  const [code, setCode] = useState("");
  const [lang, setLang] = useState("javascript");

  const commonLangs = ["javascript", "typescript", "python", "rust", "go", "java", "cpp", "json", "html", "css", "bash"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ y: 50, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 20, opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-2xl bg-bg-card border border-bg-border rounded-[2rem] shadow-2xl p-6 flex flex-col z-10 h-[60vh] max-h-[600px]"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold flex items-center gap-2"><span className="text-brand-pink">{'</>'}</span> Send Code Snippet</h3>
          <select value={lang} onChange={(e)=>setLang(e.target.value)} className="bg-bg-base border border-bg-border text-sm rounded-lg px-3 py-1.5 focus:border-brand-pink focus:ring-0">
             {commonLangs.map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}
          </select>
        </div>
        
        <textarea 
          autoFocus
          className="flex-1 w-full bg-[#1e1e1e] border border-bg-border rounded-xl p-4 font-mono text-sm text-gray-300 focus:ring-1 focus:ring-brand-pink focus:border-brand-pink resize-none mb-4"
          placeholder="Paste your code here..."
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        
        <div className="flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="px-5 py-2 rounded-xl text-text-muted hover:text-white transition-colors text-sm font-bold">Cancel</button>
          <button onClick={() => onSend(code, lang)} disabled={!code.trim()} className="btn-primary px-6 py-2">Push Code</button>
        </div>
      </motion.div>
    </div>
  );
}

function ChallengeCard({ matchId, partner, socket }) {
  const [challenge, setChallenge] = useState(null);
  const [code, setCode] = useState("");
  const [lang, setLang] = useState("javascript");
  const [submitting, setSubmitting] = useState(false);

  const fetchChallenge = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/challenges/${matchId}`, { credentials: "include" });
      if (res.ok) {
        setChallenge(await res.json());
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchChallenge();
    if (socket) {
      socket.on("challenge_updated", fetchChallenge);
      return () => socket.off("challenge_updated", fetchChallenge);
    }
  }, [matchId, socket]);

  // Apply highlight.js on reveal
  useEffect(() => {
    if (challenge?.revealedAt) {
      setTimeout(() => {
        document.querySelectorAll('.challenge-reveal pre code').forEach((el) => {
          hljs.highlightElement(el);
        });
      }, 100);
    }
  }, [challenge?.revealedAt]);

  if (!challenge) return null;

  const prompt = CHALLENGE_PROMPTS[challenge.promptId];
  const isRevealed = !!challenge.revealedAt;
  
  // The backend obscures the OTHER user's solution as 'HIDDEN' if not revealed format.
  // We can figure out if WE submitted if either user1Solution or user2Solution is NOT 'HIDDEN' and NOT null.
  const ourSolution = (challenge.user1Solution && challenge.user1Solution !== 'HIDDEN') ? challenge.user1Solution : 
                      (challenge.user2Solution && challenge.user2Solution !== 'HIDDEN') ? challenge.user2Solution : null;
  const hasSubmitted = !!ourSolution;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`http://localhost:5000/api/challenges/${matchId}/submit`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language: lang }),
        credentials: "include"
      });
      if (res.ok) {
        socket?.emit("notify_challenge_update", { matchId });
        fetchChallenge();
      }
    } catch(e) {}
    setSubmitting(false);
  };

  return (
    <div className="w-full max-w-3xl bg-bg-card border-2 border-brand-pink/30 rounded-[2rem] shadow-2xl overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-pink to-brand-purple" />
      <div className="p-6 border-b border-bg-border bg-bg-base/30 text-center">
        <h3 className="text-xl font-black text-white flex items-center justify-center gap-2">
          <span>⚔️</span> Pair Programming Icebreaker
        </h3>
        <p className="text-brand-pink font-mono text-sm mt-3 bg-brand-pink/10 p-4 rounded-xl border border-brand-pink/20">
          {prompt}
        </p>
      </div>

      <div className="p-6">
        {!hasSubmitted ? (
          // STATE 1: Unsubmitted (Writing Code)
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-text-muted uppercase tracking-widest">Your Solution</span>
              <select value={lang} onChange={(e)=>setLang(e.target.value)} className="bg-bg-base border border-bg-border text-xs rounded-md px-2 py-1 focus:border-brand-pink focus:ring-0">
                 {["javascript", "typescript", "python", "rust", "go"].map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}
              </select>
            </div>
            <textarea
              className="w-full h-40 bg-[#1e1e1e] border-none rounded-xl p-4 font-mono text-sm text-gray-300 focus:ring-1 focus:ring-brand-pink resize-none"
              placeholder="Write your one-liner here..."
              value={code}
              onChange={e => setCode(e.target.value)}
            />
            <button 
              onClick={handleSubmit} 
              disabled={submitting || !code.trim()} 
              className="btn-primary py-3 flex justify-center items-center gap-2"
            >
              {submitting ? "Pushing..." : "Submit to Reveal Partner's Code"}
            </button>
          </div>
        ) : !isRevealed ? (
          // STATE 2: Waiting for partner
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 border-4 border-brand-pink/20 border-t-brand-pink rounded-full animate-spin mb-4"></div>
            <h4 className="text-lg font-bold text-white mb-2">Code Pushed! 🚀</h4>
            <p className="text-text-secondary">
              Waiting for <span className="text-brand-pink font-bold">@{partner?.username}</span> to submit their solution...
            </p>
          </div>
        ) : (
          // STATE 3: Revealed (Side by Side)
          <div className="challenge-reveal flex flex-col md:flex-row gap-4">
            {/* User 1's Code */}
            <div className="flex-1 bg-bg-base rounded-xl border border-bg-border overflow-hidden flex flex-col">
               <div className="bg-bg-card p-2 border-b border-bg-border flex items-center justify-between">
                 <span className="text-xs font-bold text-text-primary px-2">Solution 1</span>
               </div>
               <pre className="p-4 m-0 text-sm overflow-x-auto bg-[#282c34] flex-1">
                 <code className={`language-${challenge.user1Language || 'javascript'}`}>{challenge.user1Solution}</code>
               </pre>
            </div>
            {/* User 2's Code */}
            <div className="flex-1 bg-bg-base rounded-xl border border-bg-border overflow-hidden flex flex-col">
               <div className="bg-bg-card p-2 border-b border-bg-border flex items-center justify-between">
                 <span className="text-xs font-bold text-text-primary px-2">Solution 2</span>
               </div>
               <pre className="p-4 m-0 text-sm overflow-x-auto bg-[#282c34] flex-1">
                 <code className={`language-${challenge.user2Language || 'javascript'}`}>{challenge.user2Solution}</code>
               </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
