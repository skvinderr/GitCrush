import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { motion } from "framer-motion";

function timeFormatter(dateString) {
  const d = new Date(dateString);
  const now = new Date();
  const diffMs = now - d;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDays === 1) return `Yesterday`;
  return `${diffDays}d ago`;
}

function ConfessionCard({ confession, currentUserId, onUpdate }) {
  const [reported, setReported] = useState(false);

  const handleReact = async (emoji) => {
    try {
      const res = await fetch(`http://localhost:5000/api/confessions/${confession.id}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
        credentials: "include"
      });
      if (res.ok) {
        onUpdate(await res.json());
      }
    } catch(e) {}
  };

  const handleReport = async () => {
    if (reported) return;
    if (!window.confirm("Are you sure you want to report this confession?")) return;
    try {
      const res = await fetch(`http://localhost:5000/api/confessions/${confession.id}/report`, {
        method: "POST", credentials: "include"
      });
      if (res.ok) {
        setReported(true);
        alert("Reported. Thank you for keeping the community safe.");
      }
    } catch(e) {}
  };

  const reactions = confession.reactions || { "💀": [], "🔥": [], "👀": [], "✅": [], "🚀": [] };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} 
      className="bg-bg-card border border-bg-border rounded-[2rem] p-6 shadow-xl mb-6 relative overflow-hidden"
    >
      <div className="flex items-center gap-4 mb-4">
        <img 
          src={confession.user.avatarUrl} 
          alt={confession.user.username} 
          className="w-12 h-12 rounded-full border border-bg-border ring-2 ring-brand-purple/20 bg-bg-base"
        />
        <div className="flex-1">
          <h4 className={`font-bold ${confession.isAnonymous ? 'text-brand-purple' : 'text-text-primary'}`}>
            {confession.isAnonymous ? "Anonymous Developer" : `@${confession.user.username}`}
          </h4>
          <span className="text-xs text-text-muted font-mono">{timeFormatter(confession.createdAt)}</span>
        </div>
        <button 
           onClick={handleReport}
           className={`text-xs px-3 py-1.5 rounded-full border border-bg-border transition-colors ${reported ? 'text-red-500 bg-red-500/10' : 'text-text-muted hover:text-white hover:border-red-500/50'}`}
        >
          {reported ? 'Reported' : 'Report 🚩'}
        </button>
      </div>

      <p className="text-text-primary text-lg leading-relaxed mb-6 whitespace-pre-wrap">
        {confession.text}
      </p>

      <div className="flex flex-wrap gap-2 pt-4 border-t border-bg-border/50">
        {["💀", "🔥", "👀", "✅", "🚀"].map(emoji => {
          const reactors = reactions[emoji] || [];
          const hasReacted = reactors.includes(currentUserId);
          return (
            <button
              key={emoji}
              onClick={() => handleReact(emoji)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm transition-all duration-200 ${
                hasReacted 
                  ? "bg-brand-pink/20 border-brand-pink/50 text-white" 
                  : "bg-bg-base border-bg-border text-text-secondary hover:border-text-muted"
              }`}
            >
              <span>{emoji}</span>
              <span className="font-bold">{reactors.length}</span>
            </button>
          )
        })}
      </div>
    </motion.div>
  );
}

export default function Confessions() {
  const { user } = useAuth();
  const [confessions, setConfessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("top"); // "top" or "new"
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Form states
  const [text, setText] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchConfessions = async (pageNum, sortMode, isLoadMore = false) => {
    if (!isLoadMore) setLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/confessions?sort=${sortMode}&page=${pageNum}`, {
        credentials: "include"
      });
      const data = await res.json();
      
      if (data.length < 20) setHasMore(false);
      else setHasMore(true);

      if (isLoadMore) {
        setConfessions(prev => [...prev, ...data]);
      } else {
        setConfessions(data);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    setPage(1);
    fetchConfessions(1, sort, false);
  }, [sort]);

  const handleLoadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchConfessions(next, sort, true);
  };

  const handlePost = async () => {
    if (text.length < 20 || text.length > 280) return;
    setSubmitting(true);
    try {
      const res = await fetch("http://localhost:5000/api/confessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, isAnonymous }),
        credentials: "include"
      });
      
      if (res.ok) {
        setText("");
        // Instantly refresh the current feed sorting
        setPage(1);
        fetchConfessions(1, sort, false);
      }
    } catch(e) {}
    setSubmitting(false);
  };

  const updateConfessionInList = (updatedConfession) => {
    setConfessions(prev => prev.map(c => c.id === updatedConfession.id ? { ...c, reactions: updatedConfession.reactions } : c));
  };

  return (
    <div className="min-h-screen bg-bg-base py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-black text-white tracking-tight mb-2 flex items-center justify-center gap-3">
            <span className="text-4xl">🤫</span>
            Tech Confessions
          </h1>
          <p className="text-text-secondary text-lg">Confess your dev sins. Judgment-free zone.*</p>
          <p className="text-text-muted text-xs mt-1">*Just kidding, we will all silently judge you.</p>
        </div>

        {/* Post Form */}
        <div className="bg-gradient-to-br from-bg-card to-bg-base border border-brand-purple/30 rounded-[2rem] p-6 shadow-2xl shadow-brand-purple/5 mb-12">
          <textarea
            className="w-full bg-[#1e1e1e] border border-bg-border rounded-xl p-4 font-mono text-sm text-gray-300 focus:ring-1 focus:ring-brand-purple focus:border-brand-purple resize-none placeholder:text-text-muted"
            rows={4}
            placeholder="I once dropped production database because..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={280}
          />
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-4 gap-4">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={isAnonymous} 
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="w-5 h-5 rounded border-bg-border text-brand-purple focus:ring-brand-purple bg-bg-base"
                />
                <span className={`text-sm font-bold transition-colors ${isAnonymous ? 'text-brand-purple' : 'text-text-muted group-hover:text-text-secondary'}`}>
                  {isAnonymous ? "🎭 Post Anonymously" : "👤 Post Publicly"}
                </span>
              </label>
              <span className={`text-xs font-mono font-bold ${text.length < 20 ? 'text-red-400' : 'text-text-muted'}`}>
                {text.length}/280
              </span>
            </div>
            
            <button
              onClick={handlePost}
              disabled={submitting || text.length < 20 || text.length > 280}
              className="w-full sm:w-auto px-8 py-3 bg-brand-purple hover:bg-brand-pink text-white font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Confessing..." : "Confess"}
            </button>
          </div>
          {text.length > 0 && text.length < 20 && (
            <p className="text-red-400 text-xs mt-3 font-medium">Too short to count as a real confession.</p>
          )}
        </div>

        {/* Sort Tabs */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <button 
            onClick={() => setSort("top")}
            className={`px-6 py-2 rounded-full font-bold transition-colors ${sort === "top" ? "bg-white text-bg-base" : "bg-bg-card text-text-muted hover:text-white"}`}
          >
            🔥 Top Sins
          </button>
          <button 
            onClick={() => setSort("new")}
            className={`px-6 py-2 rounded-full font-bold transition-colors ${sort === "new" ? "bg-white text-bg-base" : "bg-bg-card text-text-muted hover:text-white"}`}
          >
            ✨ Newest
          </button>
        </div>

        {/* Feed */}
        {loading ? (
          <div className="flex justify-center py-20">
             <div className="w-10 h-10 border-4 border-brand-purple/20 border-t-brand-purple rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="space-y-2">
            {confessions.length === 0 ? (
              <p className="text-center text-text-muted py-10">No confessions yet. Be the first to sin.</p>
            ) : (
              confessions.map((c) => (
                <ConfessionCard key={c.id} confession={c} currentUserId={user.id} onUpdate={updateConfessionInList} />
              ))
            )}

            {hasMore && confessions.length > 0 && (
              <div className="pt-6 pb-20 flex justify-center">
                <button 
                  onClick={handleLoadMore}
                  className="px-6 py-2 rounded-full border border-bg-border text-text-muted hover:text-white font-bold transition-colors"
                >
                  Load More Sins 👇
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
