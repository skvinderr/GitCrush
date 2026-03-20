import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

function LeaderboardRow({ rank, title, subtitle, avatarUrl, stat, profileUrl }) {
  const isTop3 = rank <= 3;
  const badges = ["🏆", "🥈", "🥉"];
  const colors = [
    "bg-yellow-500/20 text-yellow-500 border-yellow-500/50 shadow-yellow-500/20",
    "bg-gray-300/20 text-gray-300 border-gray-300/50 shadow-gray-300/20",
    "bg-amber-700/20 text-amber-600 border-amber-700/50 shadow-amber-700/20"
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: rank * 0.05 }}
      className={`flex items-center justify-between p-4 mb-3 rounded-2xl border bg-bg-card transition-all ${isTop3 ? 'border-brand-pink/30 hover:border-brand-pink' : 'border-bg-border hover:border-bg-border/80'}`}
    >
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 flex items-center justify-center rounded-xl font-black text-lg border shadow-lg ${isTop3 ? colors[rank - 1] : 'bg-bg-base text-text-muted border-bg-border'}`}>
          {isTop3 ? badges[rank - 1] : `#${rank}`}
        </div>
        <img src={avatarUrl} alt="avatar" className="w-12 h-12 rounded-full border border-bg-border" />
        <div>
          <h4 className="font-bold text-white leading-tight">{title}</h4>
          {subtitle && <p className="text-xs text-text-muted">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="text-right">
          <p className="text-xl font-black text-brand-pink font-mono">{stat}</p>
        </div>
        {profileUrl && (
          <a href={profileUrl} target="_blank" rel="noreferrer" className="hidden sm:block px-4 py-2 rounded-xl border border-bg-border text-xs font-bold hover:bg-white hover:text-black transition-colors">
            Profile ↗
          </a>
        )}
      </div>
    </motion.div>
  );
}

function MatchSubmitModal({ onClose, matches }) {
  const [selectedMatch, setSelectedMatch] = useState("");
  const [story, setStory] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedMatch || !story || story.length > 200) return;
    setSubmitting(true);
    
    // Find repo URL from the selected match
    const mObj = matches.find(m => m.id === selectedMatch);
    
    try {
      const res = await fetch("http://localhost:5000/api/hall-of-merges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId: selectedMatch, story, repoUrl: mObj?.dateRepoUrl || "https://github.com" }),
        credentials: "include"
      });
      if (res.ok) {
        alert("Submitted to the Hall of Merges! Waiting for your partner to confirm.");
        onClose();
        window.location.reload(); // Quick refresh for MVP
      } else {
        const error = await res.json();
        alert(error.error || "Failed to submit.");
      }
    } catch (e) {
      console.error(e);
    }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-bg-card border border-brand-pink/30 rounded-[2rem] p-6 shadow-2xl z-10">
        <h3 className="text-2xl font-black text-white mb-2">Submit a Merge 🏛️</h3>
        <p className="text-sm text-text-secondary mb-6">Built something with a GitCrush match? Immortalize it in the Hall of Merges.</p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-text-muted uppercase mb-2">Select Match</label>
            <select 
              value={selectedMatch} 
              onChange={e => setSelectedMatch(e.target.value)} 
              className="w-full bg-[#1e1e1e] border border-bg-border rounded-xl px-4 py-3 text-sm focus:border-brand-pink focus:ring-1 focus:ring-brand-pink"
            >
              <option value="" disabled>-- Pick a match --</option>
              {matches.filter(m => m.dateRepoUrl).map(m => (
                <option key={m.id} value={m.id}>Match with @{m.profile.username}</option>
              ))}
              {matches.filter(m => m.dateRepoUrl).length === 0 && (
                <option value="" disabled>No active Date Repos found</option>
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-text-muted uppercase mb-2">How you met / What you built</label>
            <textarea
              className="w-full bg-[#1e1e1e] border border-bg-border rounded-xl p-4 text-sm focus:ring-1 focus:ring-brand-pink focus:border-brand-pink resize-none"
              rows={3}
              placeholder="Matched connecting over our mutual hatred of CSS. We built..."
              value={story}
              onChange={e => setStory(e.target.value)}
              maxLength={200}
            />
            <div className="text-right text-xs text-text-muted mt-1">{story.length}/200</div>
          </div>
          
          <button 
             onClick={handleSubmit} 
             disabled={!selectedMatch || !story || submitting}
             className="w-full btn-primary py-3 px-6 mt-4 font-bold shadow-lg shadow-brand-pink/20 disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit to Hall of Merges"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Leaderboard() {
  const [activeTab, setActiveTab] = useState("stars"); // stars, active, compatible
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [hallOfMerges, setHallOfMerges] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // For the submit form
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [userMatches, setUserMatches] = useState([]);

  useEffect(() => {
    // Fetch active leaderboard tab
    setLoading(true);
    fetch(`http://localhost:5000/api/leaderboard?type=${activeTab}`, { credentials: "include" })
      .then(r => r.json())
      .then(data => setLeaderboardData(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeTab]);

  useEffect(() => {
    // Fetch Hall of Merges
    fetch("http://localhost:5000/api/hall-of-merges", { credentials: "include" })
      .then(r => r.json())
      .then(data => setHallOfMerges(data))
      .catch(console.error);

    // Fetch user matches for the submit modal
    fetch("http://localhost:5000/api/matches", { credentials: "include" })
      .then(r => r.json())
      .then(data => {
         if (!data.error) setUserMatches(data);
      })
      .catch(console.error);
  }, []);

  return (
    <div className="min-h-screen bg-bg-base py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto flex flex-col xl:flex-row gap-12">
        
        {/* SECTION 1: LEADERBOARDS (Left Sidebar on Desktop) */}
        <div className="xl:w-5/12 shrink-0">
          <div className="sticky top-24">
            <h2 className="text-3xl font-black text-white mb-2 flex items-center gap-3">
              <span className="text-4xl">🏆</span> Weekly Leaders
            </h2>
            <p className="text-text-secondary text-sm mb-6">Top developers in the community. Resets every Monday.</p>
            
            <div className="bg-bg-card p-1 rounded-xl mb-6 inline-flex border border-bg-border shadow-inner">
              <button 
                onClick={() => setActiveTab("stars")} 
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === 'stars' ? 'bg-bg-base text-brand-pink shadow-sm' : 'text-text-muted hover:text-white'}`}
              >
                ⭐ Most Stars
              </button>
              <button 
                onClick={() => setActiveTab("active")} 
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === 'active' ? 'bg-bg-base text-brand-pink shadow-sm' : 'text-text-muted hover:text-white'}`}
              >
                💻 Most Active
              </button>
              <button 
                onClick={() => setActiveTab("compatible")} 
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === 'compatible' ? 'bg-bg-base text-brand-pink shadow-sm' : 'text-text-muted hover:text-white'}`}
              >
                💕 Compatible
              </button>
            </div>

            <div className="min-h-[400px]">
              {loading ? (
                <div className="py-20 flex justify-center"><div className="w-8 h-8 border-4 border-brand-pink/20 border-t-brand-pink rounded-full animate-spin"></div></div>
              ) : (
                <div className="space-y-1">
                  {leaderboardData.map((item, idx) => {
                    if (activeTab === "compatible") {
                      return (
                        <LeaderboardRow 
                          key={item.id} rank={idx + 1}
                          title={`@${item.user1.username} & @${item.user2.username}`}
                          subtitle="Paired automatically by genetic algorithm"
                          avatarUrl={item.user1.avatarUrl} // could do double avatar
                          stat={`${item.compatibilityScore}%`}
                        />
                      )
                    } else if (activeTab === "active") {
                      return (
                        <LeaderboardRow 
                          key={item.id} rank={idx + 1}
                          title={`@${item.username}`}
                          avatarUrl={item.avatarUrl}
                          stat={`${item.recentCommits} commits`}
                          profileUrl={`https://github.com/${item.username}`}
                        />
                      )
                    } else {
                      return (
                        <LeaderboardRow 
                          key={item.id} rank={idx + 1}
                          title={`@${item.username}`}
                          avatarUrl={item.avatarUrl}
                          stat={`${(item.totalStars / 1000).toFixed(1)}k stars`}
                          profileUrl={`https://github.com/${item.username}`}
                        />
                      )
                    }
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 2: HALL OF MERGES (Main Area) */}
        <div className="xl:border-l xl:border-bg-border xl:pl-12 flex-1">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
            <div>
              <h2 className="text-3xl font-black text-white mb-2 flex items-center gap-3">
                <span className="text-4xl">🏛️</span> Hall of Merges
              </h2>
              <p className="text-text-secondary text-sm">Legendary developer couples who actually shipped something together.</p>
            </div>
            <button 
              onClick={() => setShowSubmitModal(true)}
              className="px-6 py-2.5 bg-brand-pink/10 border border-brand-pink text-brand-pink hover:bg-brand-pink hover:text-white font-bold rounded-xl transition-colors shadow-lg shadow-brand-pink/10"
            >
              Submit a Merge ✨
            </button>
          </div>

          {hallOfMerges.length === 0 ? (
            <div className="py-20 text-center border-2 border-dashed border-bg-border rounded-[2rem]">
              <span className="text-4xl mb-4 block">👻</span>
              <p className="text-text-muted font-bold">No legendary merges yet. Be the first.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {hallOfMerges.map((merge) => (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  key={merge.id} 
                  className="bg-bg-card border border-brand-pink/20 rounded-3xl p-6 shadow-xl relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-brand-pink/5 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700"></div>
                  
                  <div className="flex justify-between items-start mb-6 relative">
                    <div className="flex items-center">
                      <img src={merge.match.user1.avatarUrl} className="w-14 h-14 rounded-full border-2 border-bg-card ring-2 ring-brand-pink/50 bg-bg-base z-10" alt="u1" />
                      <img src={merge.match.user2.avatarUrl} className="w-14 h-14 rounded-full border-2 border-bg-card ring-2 ring-brand-pink/50 bg-bg-base -ml-4 z-0" alt="u2" />
                    </div>
                    <div className="text-right">
                       <span className="text-xs font-bold text-brand-pink uppercase tracking-widest bg-brand-pink/10 px-3 py-1 rounded-full">Merged</span>
                    </div>
                  </div>

                  <h4 className="text-lg font-black text-white leading-tight mb-3">
                    @{merge.match.user1.username} <span className="text-brand-pink text-xs px-1">×</span> @{merge.match.user2.username}
                  </h4>
                  
                  <p className="text-text-secondary text-sm mb-6 leading-relaxed italic border-l-2 border-bg-border pl-3">
                    "{merge.story}"
                  </p>

                  <div className="flex items-center justify-between pt-4 border-t border-bg-border/50">
                    <span className="text-xs text-text-muted font-bold font-mono">
                      ⭐ {merge.match.user1.totalStars + merge.match.user2.totalStars} combined stars
                    </span>
                    <a href={merge.repoUrl} target="_blank" rel="noreferrer" className="text-xs font-bold px-4 py-1.5 bg-white text-black hover:bg-brand-pink hover:text-white rounded-lg transition-colors">
                      View Repo
                    </a>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

      </div>

      {showSubmitModal && <MatchSubmitModal onClose={() => setShowSubmitModal(false)} matches={userMatches} />}
    </div>
  );
}
