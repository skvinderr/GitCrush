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
      className="bg-white border-4 border-black p-8 shadow-[8px_8px_0_rgba(0,0,0,1)] mb-8 relative overflow-hidden"
    >
      <div className="flex items-center gap-4 mb-4">
        <img 
          src={confession.user.avatarUrl} 
          alt={confession.user.username} 
          className="w-14 h-14 border-4 border-black bg-white shadow-[2px_2px_0_rgba(0,0,0,1)]"
        />
        <div className="flex-1">
          <h4 className={`font-black text-lg uppercase tracking-tight ${confession.isAnonymous ? 'text-brand-purple' : 'text-black'}`}>
            {confession.isAnonymous ? "Anonymous User" : `@${confession.user.username}`}
          </h4>
          <span className="text-sm text-black font-bold font-mono">{timeFormatter(confession.createdAt)}</span>
        </div>
        <button 
           onClick={handleReport}
           className={`text-xs px-3 py-1.5 border-2 border-black font-black uppercase tracking-widest transition-all shadow-[2px_2px_0_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${reported ? 'text-white bg-black' : 'text-black bg-white hover:bg-red-500 hover:text-white'}`}
        >
          {reported ? 'Reported' : 'Report 🚩'}
        </button>
      </div>

      <p className="text-black text-xl font-bold leading-relaxed mb-8 whitespace-pre-wrap border-l-4 border-black pl-4">
        {confession.text}
      </p>

      <div className="flex flex-wrap gap-3 pt-6 border-t-4 border-black border-dashed">
        {["💀", "🔥", "👀", "✅", "🚀"].map(emoji => {
          const reactors = reactions[emoji] || [];
          const hasReacted = reactors.includes(currentUserId);
          return (
            <button
              key={emoji}
              onClick={() => handleReact(emoji)}
              className={`flex items-center gap-2 px-4 py-2 border-2 border-black text-base font-black transition-all shadow-[4px_4px_0_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none ${
                hasReacted 
                  ? "bg-brand-pink text-white border-black" 
                  : "bg-white text-black hover:bg-brand-yellow"
              }`}
            >
              <span className="text-lg">{emoji}</span>
              <span>{reactors.length}</span>
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
    <div className="min-h-screen bg-brand-peach/20 py-12 px-4 sm:px-6 lg:px-8 border-l-4 border-black">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 items-start">
        {/* Left/Sidebar Form (Sticky) */}
        <div className="w-full lg:w-1/3 xl:w-1/4 sticky top-24 z-10">
          <div className="mb-8 text-left">
            <h1 className="text-4xl lg:text-5xl font-black text-black tracking-tighter mb-4 flex items-center gap-3 uppercase">
              <span className="text-4xl lg:text-5xl drop-shadow-[4px_4px_0_rgba(0,0,0,1)]">🤫</span>
              Tech Confessions
            </h1>
            <p className="text-black font-bold text-lg uppercase tracking-widest">Confess your dev sins. Judgment-free zone.*</p>
            <p className="text-black font-bold text-xs mt-2 bg-brand-yellow inline-block px-3 py-1 border-2 border-black shadow-[2px_2px_0_rgba(0,0,0,1)] -rotate-2">*Just kidding, we will all silently judge you.</p>
          </div>

          <div className="bg-brand-purple border-4 border-black p-6 shadow-[8px_8px_0_rgba(0,0,0,1)] mb-12">
            <h3 className="text-white font-black text-xl mb-4 uppercase tracking-widest drop-shadow-[2px_2px_0_rgba(0,0,0,1)]">Confess Here 👇</h3>
            <textarea
              className="w-full bg-white border-4 border-black p-4 font-mono text-sm lg:text-base font-bold text-black focus:outline-none shadow-[4px_4px_0_rgba(0,0,0,1)] resize-none placeholder:text-black/50"
              rows={5}
              placeholder="I once dropped production database because..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={280}
            />
            <div className="flex flex-col mt-4 gap-4">
              <label className="flex items-center gap-3 cursor-pointer group bg-white border-2 border-black px-4 py-2 shadow-[2px_2px_0_rgba(0,0,0,1)] hover:bg-brand-yellow transition-colors">
                <input 
                  type="checkbox" 
                  checked={isAnonymous} 
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="w-5 h-5 border-2 border-black text-black focus:ring-0 cursor-pointer"
                />
                <span className={`text-sm font-black uppercase tracking-widest text-black`}>
                  {isAnonymous ? "🎭 Anonymous" : "👤 Public"}
                </span>
              </label>

              <div className="flex justify-between items-center">
                <span className={`text-xs font-mono font-black border-2 border-black px-2 py-1 bg-white shadow-[2px_2px_0_rgba(0,0,0,1)] ${text.length < 20 ? 'text-red-500 bg-red-100' : 'text-black'}`}>
                  {text.length}/280
                </span>
                <button
                  onClick={handlePost}
                  disabled={submitting || text.length < 20 || text.length > 280}
                  className="px-6 py-2 bg-brand-yellow border-4 border-black text-black font-black uppercase tracking-widest shadow-[4px_4px_0_rgba(0,0,0,1)] hover:bg-white hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed text-base"
                >
                  {submitting ? "Pushing..." : "Confess"}
                </button>
              </div>
            </div>
            {text.length > 0 && text.length < 20 && (
              <p className="text-white bg-black border-2 border-black px-3 py-1 font-bold inline-block text-xs mt-4 uppercase tracking-widest shadow-[2px_2px_0_rgba(0,0,0,1)]">Too short to count as a confession.</p>
            )}
          </div>
        </div>

        {/* Right/Main Area (Feed) */}
        <div className="flex-1 w-full max-w-2xl mx-auto lg:max-w-none">
          {/* Sort Tabs */}
          <div className="flex items-center justify-start gap-4 mb-8">
            <button 
              onClick={() => setSort("top")}
              className={`px-6 py-2 font-black text-base border-4 border-black shadow-[4px_4px_0_rgba(0,0,0,1)] uppercase tracking-widest transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-none ${sort === "top" ? "bg-black text-white border-black" : "bg-white text-black hover:bg-brand-yellow"}`}
            >
              🔥 Top Sins
            </button>
            <button 
              onClick={() => setSort("new")}
              className={`px-6 py-2 font-black text-base border-4 border-black shadow-[4px_4px_0_rgba(0,0,0,1)] uppercase tracking-widest transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-none ${sort === "new" ? "bg-black text-white border-black" : "bg-white text-black hover:bg-brand-yellow"}`}
            >
              ✨ Newest
            </button>
          </div>

          {/* Feed */}
          {loading ? (
            <div className="flex justify-center py-20">
               <div className="w-16 h-16 border-4 border-black border-t-brand-purple rounded-full animate-spin"></div>
            </div>
          ) : (
          <div className="space-y-4">
            {confessions.length === 0 ? (
              <p className="text-center font-black text-black uppercase tracking-wider bg-white py-10 border-4 border-black shadow-[8px_8px_0_rgba(0,0,0,1)]">No confessions yet. Be the first to sin.</p>
            ) : (
              confessions.map((c) => (
                <ConfessionCard key={c.id} confession={c} currentUserId={user.id} onUpdate={updateConfessionInList} />
              ))
            )}

            {hasMore && confessions.length > 0 && (
              <div className="pt-8 pb-24 flex justify-center">
                <button 
                  onClick={handleLoadMore}
                  className="px-10 py-4 border-4 border-black bg-white text-black font-black uppercase tracking-widest shadow-[8px_8px_0_rgba(0,0,0,1)] hover:bg-brand-yellow hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all text-xl"
                >
                  Load More Sins 👇
                </button>
              </div>
            )}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
