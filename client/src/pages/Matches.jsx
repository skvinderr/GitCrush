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
        className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
      />
      <motion.div 
        initial={{ y: 100, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 50, opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-2xl bg-bg-card border border-bg-border rounded-[2rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col z-10"
      >
        <button onClick={onClose} className="absolute top-4 right-4 w-10 h-10 bg-bg-base/50 backdrop-blur-md rounded-full flex items-center justify-center text-text-muted hover:text-white border border-bg-border z-20 transition-colors">
          ✕
        </button>

        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {/* Header */}
          <div className="relative h-40 bg-bg-base flex justify-center items-end pb-8">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-pink/20 to-brand-purple/20 blur-2xl" />
            <img src={p.avatarUrl} alt={p.username} className="w-28 h-28 rounded-full border-4 border-bg-card shadow-xl relative z-10 translate-y-12" />
            <div className={`absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${isHighMatch ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'}`}>
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isHighMatch ? 'bg-green-400' : 'bg-yellow-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isHighMatch ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
              </span>
              {match.compatibilityScore}% Match
            </div>
          </div>

          <div className="px-8 pt-16 pb-8">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-black text-text-primary">@{p.username}</h2>
              {p.personalityType && (
                <div className="text-brand-pink text-sm font-bold uppercase tracking-widest mt-1">
                  🎭 {p.personalityType}
                </div>
              )}
            </div>

            <p className="text-text-secondary text-center italic mb-8 max-w-md mx-auto leading-relaxed">
              "{p.customBio || p.aiBio || p.bio || "Busy writing code."}"
            </p>

            {/* AI Explanation Box */}
            <div className="mb-8 p-5 bg-bg-base rounded-2xl border border-bg-border relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-brand-pink to-brand-purple" />
              <h3 className="text-xs uppercase tracking-widest font-bold text-text-muted mb-2 flex items-center gap-2">
                <span>🤖</span> The AI Verdict
              </h3>
              <p className="text-text-primary leading-snug">
                {match.compatExplanation}
              </p>
            </div>

            {/* Match Breakdown */}
            <h3 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
              <span>📊</span> Compatibility Breakdown
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {categories.map((cat, i) => {
                const pct = Math.round((cat.score / cat.max) * 100);
                return (
                  <div key={i} className="bg-bg-base/50 p-3 rounded-xl border border-bg-border/50">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">{cat.name}</span>
                      <span className="text-xs font-mono text-text-muted">{cat.score}/{cat.max}</span>
                    </div>
                    <div className="h-1.5 w-full bg-bg-base rounded-full overflow-hidden">
                      <div className="h-full bg-brand-pink transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-center flex-wrap gap-2 mb-8">
              {p.languages?.slice(0, 4).map(l => (
                <span key={l.lang} className="px-3 py-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg text-xs font-mono">
                  {l.lang} ({Math.round(l.pct)}%)
                </span>
              ))}
            </div>

          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-bg-base border-t border-bg-border shrink-0 flex flex-col md:flex-row gap-3">
          <button className="flex-1 btn-primary py-3.5 shadow-lg shadow-brand-pink/20" onClick={() => alert("Feature 9 coming soon!")}>
            Create Date Repo ✨
          </button>
          <button 
            onClick={() => {
              if (window.confirm("Are you sure? This will close the PR permanently.")) {
                onUnmatch(match.id);
              }
            }} 
            className="md:w-auto w-full px-6 py-3.5 rounded-full border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors font-bold text-sm"
          >
            Close PR (Unmatch)
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
    fetch("http://localhost:5000/api/matches", { credentials: "include" })
      .then(r => r.json())
      .then(data => {
        if (!data.error) setMatches(data);
        setLoading(false);
      })
      .catch(console.error);
  }, []);

  const handleUnmatch = async (id) => {
    try {
      await fetch(`http://localhost:5000/api/matches/${id}`, { method: "DELETE", credentials: "include" });
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
        <h1 className="text-3xl font-black text-text-primary flex items-center gap-3">
          Merged PRs
          <span className="bg-brand-pink text-white text-sm px-3 py-1 rounded-full shadow-lg shadow-brand-pink/20">
            {matches.length}
          </span>
        </h1>
        <p className="text-text-secondary mt-2">Your mutual matches and ongoing collaborations.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-bg-card rounded-xl border border-bg-border mb-8 max-w-sm">
        <button 
          onClick={() => setActiveTab("new")}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'new' ? 'bg-bg-base text-text-primary shadow-sm' : 'text-text-muted hover:text-text-secondary'}`}
        >
          New Matches
        </button>
        <button 
          onClick={() => setActiveTab("conversations")}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'conversations' ? 'bg-bg-base text-text-primary shadow-sm' : 'text-text-muted hover:text-text-secondary'}`}
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
                    className={`bg-bg-card border rounded-2xl overflow-hidden relative group transition-all hover:shadow-2xl hover:shadow-brand-pink/5 hover:-translate-y-1 ${isNew ? 'border-green-500/30' : 'border-bg-border'}`}
                  >
                    {isNew && <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-[40px] pointer-events-none" />}
                    
                    <div className="p-5">
                      {/* Avatars */}
                      <div className="flex items-center -space-x-4 mb-4">
                        <img src="https://github.com/github.png" className="w-14 h-14 rounded-full border-2 border-bg-card z-0 relative grayscale opacity-50" title="You" alt="You" />
                        <img src={p.avatarUrl} className="w-14 h-14 rounded-full border-2 border-bg-card z-10 relative shadow-md" alt={p.username} />
                        
                        <div className="ml-6 flex-1 text-right">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-widest ${match.compatibilityScore >= 75 ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-500'}`}>
                            {match.compatibilityScore}% Match
                          </span>
                        </div>
                      </div>

                      <h3 className="text-lg font-bold text-text-primary">@{p.username}</h3>
                      <p className="text-xs text-text-muted mt-0.5 font-mono">{timeAgo(match.createdAt)}</p>
                      
                      <p className="text-sm text-text-secondary mt-3 line-clamp-2 leading-relaxed">
                        {match.compatExplanation}
                      </p>
                    </div>

                    <div className="border-t border-bg-border bg-bg-base/30 p-2 flex gap-2">
                       <button onClick={() => setSelectedMatch(match)} className="flex-1 py-2 rounded-lg text-xs font-bold text-text-primary bg-bg-base hover:bg-bg-border border border-bg-border transition-colors">
                         View profile
                       </button>
                       <button onClick={() => navigate(`/chat/${match.id}`)} className="flex-1 py-2 rounded-lg text-xs font-bold text-white bg-brand-pink hover:bg-brand-pink-hover transition-colors shadow-lg shadow-brand-pink/20">
                         Open chat
                       </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center py-20 px-4 bg-bg-card border border-bg-border border-dashed rounded-3xl">
            <div className="text-5xl mb-4 opacity-50">🌱</div>
            <h3 className="text-xl font-bold text-text-primary mb-2">No new matches yet</h3>
            <p className="text-text-secondary max-w-sm mx-auto mb-6">Keep swiping — there are thousands of devs waiting for your code review.</p>
            <div className="inline-flex items-center gap-2 text-xs font-mono text-brand-pink bg-brand-pink/10 px-4 py-2 rounded-lg">
              <span>💡 Tip:</span> Super Star someone to go straight to the top of their deck
            </div>
          </div>
        )
      ) : (
        <div className="text-center py-20 px-4 bg-bg-card border border-bg-border border-dashed rounded-3xl">
          <div className="text-5xl mb-4 opacity-50">💬</div>
          <h3 className="text-xl font-bold text-text-primary mb-2">No active PR discussions</h3>
          <p className="text-text-secondary max-w-sm mx-auto">You have matches but haven't said hello yet. Someone has to open the PR first.</p>
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {selectedMatch && <MatchDetailModal match={selectedMatch} onClose={() => setSelectedMatch(null)} onUnmatch={handleUnmatch} />}
      </AnimatePresence>
    </div>
  );
}
