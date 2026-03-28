import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

function LeaderboardRow({ rank, title, subtitle, avatarUrl, stat, profileUrl }) {
  const isTop3 = rank <= 3;
  const badges = ["🏆", "🥈", "🥉"];
  const colors = [
    "bg-brand-yellow text-black border-2 border-black shadow-[2px_2px_0_rgba(0,0,0,1)]",
    "bg-gray-200 text-black border-2 border-black shadow-[2px_2px_0_rgba(0,0,0,1)]",
    "bg-brand-peach text-black border-2 border-black shadow-[2px_2px_0_rgba(0,0,0,1)]"
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: rank * 0.05 }}
      className={`flex items-center justify-between p-4 mb-4 border-4 border-black bg-white shadow-[4px_4px_0_rgba(0,0,0,1)] transition-all hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[8px_8px_0_rgba(0,0,0,1)]`}
    >
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 flex items-center justify-center font-black text-xl ${isTop3 ? colors[rank - 1] : 'bg-white text-black border-4 border-black shadow-[2px_2px_0_rgba(0,0,0,1)]'}`}>
          {isTop3 ? badges[rank - 1] : `#${rank}`}
        </div>
        <img src={avatarUrl} alt="avatar" className="w-14 h-14 border-4 border-black bg-white shadow-[2px_2px_0_rgba(0,0,0,1)]" />
        <div>
          <h4 className="font-black text-black leading-tight uppercase tracking-tight text-lg">{title}</h4>
          {subtitle && <p className="text-xs font-bold text-black uppercase tracking-widest">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="text-right">
          <p className="text-2xl font-black text-black font-mono uppercase">{stat}</p>
        </div>
        {profileUrl && (
          <a href={profileUrl} target="_blank" rel="noreferrer" className="hidden sm:flex btn-primary px-4 py-2 text-xs items-center gap-1">
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
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/hall-of-merges`, {
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
      <div className="relative w-full max-w-md bg-brand-peach/50 border-4 border-black rounded-none p-8 shadow-[12px_12px_0_rgba(0,0,0,1)] z-10">
        <h3 className="text-3xl font-black text-black mb-2 uppercase tracking-tight flex items-center justify-between">Submit a Merge 🏛️ <button onClick={onClose} className="text-xl font-black mb-2 hover:scale-125 transition-transform">X</button></h3>
        <p className="text-sm font-bold text-black mb-8 border-l-4 border-black pl-3 bg-white py-2">Built something with a GitCrush match? Immortalize it in the Hall of Merges.</p>
        
        <div className="space-y-6">
          <div>
            <label className="block text-xs font-black text-black uppercase tracking-widest mb-2">Select Match</label>
            <select 
              value={selectedMatch} 
              onChange={e => setSelectedMatch(e.target.value)} 
              className="w-full bg-white border-4 border-black px-4 py-3 text-sm font-bold text-black shadow-[4px_4px_0_rgba(0,0,0,1)] focus:outline-none"
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
            <label className="block text-xs font-black text-black uppercase tracking-widest mb-2">How you met / What you built</label>
            <textarea
              className="w-full bg-white border-4 border-black p-4 text-sm font-bold text-black shadow-[4px_4px_0_rgba(0,0,0,1)] focus:outline-none resize-none"
              rows={3}
              placeholder="Matched connecting over our mutual hatred of CSS. We built..."
              value={story}
              onChange={e => setStory(e.target.value)}
              maxLength={200}
            />
            <div className={`text-right text-xs font-black mt-2 font-mono uppercase ${story.length >= 200 ? 'text-red-600' : 'text-black'}`}>{story.length}/200</div>
          </div>
          
          <button 
             onClick={handleSubmit} 
             disabled={!selectedMatch || !story || submitting}
             className="w-full btn-primary py-4 px-6 mt-6 font-black shadow-[4px_4px_0_rgba(0,0,0,1)] text-lg uppercase tracking-widest disabled:opacity-50 hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
          >
            {submitting ? "Submitting..." : "Submit to Merges"}
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
    fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/leaderboard?type=${activeTab}`, { credentials: "include" })
      .then(r => r.json())
      .then(data => setLeaderboardData(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeTab]);

  useEffect(() => {
    // Fetch Hall of Merges
    fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/hall-of-merges`, { credentials: "include" })
      .then(r => r.json())
      .then(data => setHallOfMerges(data))
      .catch(console.error);

    // Fetch user matches for the submit modal
    fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/matches`, { credentials: "include" })
      .then(r => r.json())
      .then(data => {
         if (!data.error) setUserMatches(data);
      })
      .catch(console.error);
  }, []);

  return (
    <div className="min-h-screen bg-brand-blue/20 py-12 px-4 sm:px-6 lg:px-8 border-l-4 border-black">
      <div className="max-w-7xl mx-auto flex flex-col xl:flex-row gap-12">
        
        {/* SECTION 1: LEADERBOARDS (Left Sidebar on Desktop) */}
        <div className="xl:w-5/12 shrink-0">
          <div className="sticky top-24">
            <h2 className="text-5xl font-black text-black mb-4 flex items-center gap-3 tracking-tighter uppercase">
              <span className="text-5xl drop-shadow-[4px_4px_0_rgba(0,0,0,1)]">🏆</span> Weekly Leaders
            </h2>
            <p className="text-black font-bold text-lg mb-8 bg-white border-2 border-black inline-block px-4 py-2 shadow-[4px_4px_0_rgba(0,0,0,1)] -rotate-1">Top developers in the community. Resets Monday.</p>
            
            <div className="bg-white border-4 border-black p-2 mb-8 inline-flex shadow-[8px_8px_0_rgba(0,0,0,1)] gap-2 flex-wrap sm:flex-nowrap">
              <button 
                onClick={() => setActiveTab("stars")} 
                className={`px-6 py-3 font-black text-sm uppercase tracking-widest transition-all ${activeTab === 'stars' ? 'bg-brand-yellow font-black border-2 border-black text-black shadow-[2px_2px_0_rgba(0,0,0,1)]' : 'border-2 border-transparent text-black hover:bg-brand-peach'}`}
              >
                ⭐ Stars
              </button>
              <button 
                onClick={() => setActiveTab("active")} 
                className={`px-6 py-3 font-black text-sm uppercase tracking-widest transition-all ${activeTab === 'active' ? 'bg-brand-yellow font-black border-2 border-black text-black shadow-[2px_2px_0_rgba(0,0,0,1)]' : 'border-2 border-transparent text-black hover:bg-brand-peach'}`}
              >
                💻 Active
              </button>
              <button 
                onClick={() => setActiveTab("compatible")} 
                className={`px-6 py-3 font-black text-sm uppercase tracking-widest transition-all ${activeTab === 'compatible' ? 'bg-brand-yellow font-black border-2 border-black text-black shadow-[2px_2px_0_rgba(0,0,0,1)]' : 'border-2 border-transparent text-black hover:bg-brand-peach'}`}
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
        <div className="xl:border-l-4 xl:border-black xl:pl-12 flex-1 pt-12 xl:pt-0">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-10 gap-6">
            <div>
              <h2 className="text-5xl font-black text-black mb-4 flex items-center gap-3 tracking-tighter uppercase">
                <span className="text-5xl drop-shadow-[4px_4px_0_rgba(0,0,0,1)]">🏛️</span> Hall of Merges
              </h2>
              <p className="text-black font-bold text-lg bg-brand-peach border-2 border-black inline-block px-4 py-2 shadow-[4px_4px_0_rgba(0,0,0,1)] rotate-1">Legendary developers who shipped together.</p>
            </div>
            <button 
              onClick={() => setShowSubmitModal(true)}
              className="btn-primary px-8 py-4 text-lg uppercase tracking-widest shadow-[4px_4px_0_rgba(0,0,0,1)] font-black hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all border-4 border-black border-dashed bg-brand-pink text-white"
            >
              Submit a Merge ✨
            </button>
          </div>

          {hallOfMerges.length === 0 ? (
            <div className="py-24 mt-8 text-center border-4 border-black border-dashed bg-white shadow-[8px_8px_0_rgba(0,0,0,1)]">
              <span className="text-6xl mb-6 block drop-shadow-[4px_4px_0_rgba(0,0,0,1)]">👻</span>
              <p className="text-black text-xl font-black uppercase tracking-widest">No legendary merges yet. Be the first.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {hallOfMerges.map((merge) => (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  key={merge.id} 
                  className="bg-white border-4 border-black p-8 shadow-[8px_8px_0_rgba(0,0,0,1)] relative group transition-all hover:translate-y-1 hover:translate-x-1 hover:shadow-none"
                >
                  <div className="flex justify-between items-start mb-8 relative">
                    <div className="flex items-center">
                      <img src={merge.match.user1.avatarUrl} className="w-16 h-16 border-4 border-black bg-white shadow-[2px_2px_0_rgba(0,0,0,1)] z-10 rounded-[4px] object-cover" alt="u1" />
                      <img src={merge.match.user2.avatarUrl} className="w-16 h-16 border-4 border-black bg-white shadow-[2px_2px_0_rgba(0,0,0,1)] -ml-6 z-0 rounded-[4px] object-cover" alt="u2" />
                    </div>
                    <div className="text-right">
                       <span className="text-xs font-black text-black font-mono uppercase tracking-widest bg-brand-yellow border-2 border-black px-3 py-1 shadow-[2px_2px_0_rgba(0,0,0,1)]">Merged</span>
                    </div>
                  </div>

                  <h4 className="text-xl font-black text-black leading-tight mb-4 uppercase tracking-tighter">
                    @{merge.match.user1.username} <span className="text-brand-pink text-3xl font-normal mx-1 leading-none align-middle">×</span> @{merge.match.user2.username}
                  </h4>
                  
                  <p className="text-black font-bold text-base mb-8 leading-relaxed italic border-l-4 border-black pl-4 my-2">
                    "{merge.story}"
                  </p>

                  <div className="flex items-center justify-between pt-6 border-t-4 border-black border-dashed">
                    <span className="text-sm text-black font-black font-mono uppercase">
                      ⭐ {merge.match.user1.totalStars + merge.match.user2.totalStars} stars
                    </span>
                    <a href={merge.repoUrl} target="_blank" rel="noreferrer" className="btn-primary text-xs px-6 py-2 shadow-[2px_2px_0_rgba(0,0,0,1)]">
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
