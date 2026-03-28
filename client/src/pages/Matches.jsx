import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

// Helper for formatting relative time
function timeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  if (diffInSeconds < 60) return "just now";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d ago`;
}

// 6-category static mock distribution for the UI breakdown. In a real scenario, this would come from the Match object.
const categories = [
  { name: "Tech Stack", score: 22, max: 25 },
  { name: "Commit Habits", score: 15, max: 20 },
  { name: "Topic Overlap", score: 18, max: 20 },
  { name: "Experience Gap", score: 10, max: 15 },
  { name: "Yin & Yang", score: 8, max: 10 },
  { name: "Community Status", score: 7, max: 10 },
];

function MatchDetailModal({ match, onClose, onUnmatch }) {
  const p = match.profile;
  const isHighMatch = match.compatibilityScore >= 75;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-brand-pink/60 backdrop-blur-sm cursor-pointer z-0"
      />
      <motion.div 
        initial={{ y: 100, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 50, opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-2xl bg-white border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] rounded-[2rem] overflow-hidden max-h-[90vh] flex flex-col z-10"
      >
        <button onClick={onClose} className="absolute top-4 right-4 w-10 h-10 bg-brand-yellow border-2 border-black rounded-sm flex items-center justify-center font-black text-black shadow-[2px_2px_0_rgba(0,0,0,1)] hover:translate-y-1 hover:translate-x-1 hover:shadow-none transition-all z-20">
          ✕
        </button>

        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {/* Header */}
          <div className="relative h-40 bg-brand-blue/30 border-b-4 border-black flex justify-center items-end pb-8">
            <img src={p.avatarUrl} alt={p.username} className="w-28 h-28 rounded-2xl border-4 border-black shadow-[4px_4px_0_rgba(0,0,0,1)] bg-white relative z-10 translate-y-12" />
            <div className={`absolute top-4 left-4 px-4 py-2 text-sm font-black border-2 border-black flex items-center gap-2 shadow-[2px_2px_0_rgba(0,0,0,1)] bg-white text-black`}>
              <span className="relative flex h-3 w-3">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isHighMatch ? 'bg-brand-green' : 'bg-brand-yellow'}`}></span>
                <span className={`relative inline-flex rounded-full h-3 w-3 border border-black ${isHighMatch ? 'bg-brand-green' : 'bg-brand-yellow'}`}></span>
              </span>
              {match.compatibilityScore}% Match
            </div>
          </div>

          <div className="px-8 pt-16 pb-8 bg-white">
            <div className="text-center mb-6">
              <h2 className="text-4xl font-black text-black">@{p.username}</h2>
              {p.personalityType && (
                <div className="text-brand-purple font-black uppercase tracking-widest mt-1">
                  🎭 {p.personalityType}
                </div>
              )}
            </div>

            <p className="text-black text-center font-bold italic mb-8 max-w-md mx-auto leading-relaxed border-l-4 border-brand-yellow pl-4 border-r-4 pr-4">
              "{p.customBio || p.aiBio || p.bio || "Busy writing code."}"
            </p>

            {/* AI Explanation Box */}
            <div className="mb-8 p-5 bg-brand-peach border-4 border-black shadow-[4px_4px_0_rgba(0,0,0,1)] relative overflow-hidden -rotate-1">
              <h3 className="text-xs uppercase tracking-widest font-black text-black mb-2 flex items-center gap-2">
                <span>🤖</span> The AI Verdict
              </h3>
              <p className="text-black font-bold leading-snug">
                {match.compatExplanation}
              </p>
            </div>

            {/* Match Breakdown */}
            <h3 className="text-xl font-black text-black mb-4 flex items-center gap-2">
              <span>📊</span> Compatibility Breakdown
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {categories.map((cat, i) => {
                const pct = Math.round((cat.score / cat.max) * 100);
                return (
                  <div key={i} className="bg-brand-yellow/20 p-4 border-2 border-black shadow-[2px_2px_0_rgba(0,0,0,1)]">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-black text-black uppercase tracking-wider">{cat.name}</span>
                      <span className="text-xs font-mono font-bold text-black">{cat.score}/{cat.max}</span>
                    </div>
                    <div className="h-3 w-full bg-white border-2 border-black overflow-hidden relative">
                      <div className="h-full bg-brand-pink border-r-2 border-black transition-all absolute top-0 left-0" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-center flex-wrap gap-2 mb-8">
              {p.languages?.slice(0, 4).map(l => (
                <span key={l.lang} className="px-3 py-1.5 bg-brand-green border-2 border-black shadow-[2px_2px_0_rgba(0,0,0,1)] text-black text-xs font-bold font-mono">
                  {l.lang} ({Math.round(l.pct)}%)
                </span>
              ))}
            </div>

          </div>
        </div>

        {/* Footer Actions */}
        {/* Footer Actions */}
        {/* Footer Actions */}
        <div className="p-6 bg-brand-purple/20 border-t-4 border-black shrink-0 flex flex-col md:flex-row gap-4">
          {match.dateRepoUrl ? (
            <a href={match.dateRepoUrl} target="_blank" rel="noreferrer" className="flex-1 btn-primary py-4 text-center text-sm flex items-center justify-center gap-2">
              <svg className="w-5 h-5 fill-black" viewBox="0 0 24 24"><path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"/></svg>
              View Sandbox ↗
            </a>
          ) : (
            <button 
               className="flex-1 btn-primary py-4" 
               onClick={async () => {
                 try {
                   const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/matches/${match.id}/date-repo-invite`, { method: "POST", credentials: "include" });
                   if (res.ok) {
                     alert("Invite sent! Open the chat to see their response.");
                     onClose();
                   } else {
                     const errData = await res.json();
                     alert(errData.error || "Failed to send invite");
                   }
                 } catch(e) {}
               }}
            >
              Create Date Repo ✨
            </button>
          )}
          <button 
            onClick={() => {
              if (window.confirm("Are you sure? This will close the PR permanently.")) {
                onUnmatch(match.id);
              }
            }} 
            className="md:w-32 w-full px-6 py-4 bg-white border-2 border-black font-black text-black shadow-[4px_4px_0_rgba(0,0,0,1)] hover:bg-red-400 hover:translate-y-1 hover:translate-x-1 hover:shadow-none transition-all text-sm"
          >
            Unmatch
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function Matches() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("new"); // "new" or "conversations"
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState(null);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/matches`, { credentials: "include" })
      .then(r => r.json())
      .then(data => {
        if (!data.error) setMatches(data);
        setLoading(false);
      })
      .catch(console.error);
  }, []);

  const handleUnmatch = async (id) => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/matches/${id}`, { method: "DELETE", credentials: "include" });
      setMatches(prev => prev.filter(m => m.id !== id));
      setSelectedMatch(null);
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-brand-pink/20 border-t-brand-pink rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 min-h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-black text-black flex items-center gap-3">
          Merged PRs
          <span className="bg-brand-pink border-2 border-black text-black font-black text-lg px-3 py-1 shadow-[2px_2px_0_rgba(0,0,0,1)] -rotate-6">
            {matches.length}
          </span>
        </h1>
        <p className="text-black font-bold mt-2">Your mutual matches and ongoing collaborations.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-2 bg-white rounded-none border-4 border-black mb-8 max-w-sm shadow-[4px_4px_0_rgba(0,0,0,1)]">
        <button 
          onClick={() => setActiveTab("new")}
          className={`flex-1 py-2 text-sm font-black transition-all border-2 border-transparent ${activeTab === 'new' ? 'bg-brand-yellow text-black border-black shadow-[2px_2px_0_rgba(0,0,0,1)]' : 'text-black hover:bg-brand-blue/20'}`}
        >
          New Matches
        </button>
        <button 
          onClick={() => setActiveTab("conversations")}
          className={`flex-1 py-2 text-sm font-black transition-all border-2 border-transparent ${activeTab === 'conversations' ? 'bg-brand-yellow text-black border-black shadow-[2px_2px_0_rgba(0,0,0,1)]' : 'text-black hover:bg-brand-blue/20'}`}
        >
          Conversations
        </button>
      </div>

      {/* Grid */}
      {activeTab === "new" ? (
        matches.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {matches.map(match => {
                const p = match.profile;
                const isNew = new Date(match.createdAt) > new Date(Date.now() - 24 * 60 * 60 * 1000); // within 24hrs

                return (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    key={match.id} 
                    className={`bg-white border-4 border-black shadow-brutal flex flex-col relative group transition-all hover:-translate-y-2 hover:-translate-x-1 hover:shadow-[12px_12px_0_rgba(0,0,0,1)]`}
                  >
                    <div className="p-6 flex-1">
                      {/* Avatars */}
                      <div className="flex items-center -space-x-4 mb-6">
                        <img src="https://github.com/github.png" className="w-16 h-16 rounded-full border-4 border-black bg-white z-0 relative shadow-[2px_2px_0_rgba(0,0,0,1)]" title="You" alt="You" />
                        <img src={p.avatarUrl} className="w-16 h-16 rounded-full border-4 border-black bg-white z-10 relative shadow-[2px_2px_0_rgba(0,0,0,1)]" alt={p.username} />
                        
                        <div className="ml-6 flex-1 text-right">
                          <span className={`inline-block px-3 py-1 border-2 border-black shadow-[2px_2px_0_rgba(0,0,0,1)] text-[10px] uppercase font-black tracking-widest ${match.compatibilityScore >= 75 ? 'bg-brand-green text-black' : 'bg-brand-yellow text-black'}`}>
                            {match.compatibilityScore}% Match
                          </span>
                        </div>
                      </div>

                      <h3 className="text-2xl font-black text-black">@{p.username}</h3>
                      <p className="text-xs text-text-muted mt-0.5 font-bold">{timeAgo(match.createdAt)}</p>
                      
                      <p className="text-sm font-bold text-text-secondary mt-3 line-clamp-2 leading-relaxed border-l-4 border-brand-pink pl-3">
                        {match.compatExplanation}
                      </p>
                    </div>

                    <div className="border-t-4 border-black bg-brand-yellow/20 p-4 flex gap-3">
                       <button onClick={() => setSelectedMatch(match)} className="flex-1 py-3 bg-white border-2 border-black font-black text-black shadow-brutal hover:bg-brand-blue hover:translate-y-1 hover:translate-x-1 hover:shadow-none transition-all outline-none">
                         View profile
                       </button>
                       <button onClick={() => navigate(`/chat/${match.id}`)} className="flex-1 py-3 bg-brand-pink border-2 border-black font-black text-black shadow-brutal hover:bg-brand-yellow hover:translate-y-1 hover:translate-x-1 hover:shadow-none transition-all outline-none">
                         Open chat
                       </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center py-20 px-4 bg-white border-4 border-black border-dashed shadow-brutal">
            <div className="text-5xl mb-4 opacity-50 drop-shadow-[2px_2px_0_rgba(0,0,0,1)]">🌱</div>
            <h3 className="text-2xl font-black text-black mb-2">No new matches yet</h3>
            <p className="text-black font-bold max-w-sm mx-auto mb-6">Keep swiping — there are thousands of devs waiting for your code review.</p>
            <div className="inline-flex items-center gap-2 text-xs font-mono text-black font-bold bg-brand-yellow px-4 py-2 border-2 border-black shadow-[2px_2px_0_rgba(0,0,0,1)]">
              <span>💡 Tip:</span> Super Star someone to go straight to the top of their deck
            </div>
          </div>
        )
      ) : (
        <div className="text-center py-20 px-4 bg-white border-4 border-black shadow-brutal border-dashed">
          <div className="text-5xl mb-4 opacity-50 drop-shadow-[2px_2px_0_rgba(0,0,0,1)]">💬</div>
          <h3 className="text-2xl font-black text-black mb-2">No active PR discussions</h3>
          <p className="text-black font-bold max-w-sm mx-auto">You have matches but haven't said hello yet. Someone has to open the PR first.</p>
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {selectedMatch && <MatchDetailModal match={selectedMatch} onClose={() => setSelectedMatch(null)} onUnmatch={handleUnmatch} />}
      </AnimatePresence>
    </div>
  );
}
