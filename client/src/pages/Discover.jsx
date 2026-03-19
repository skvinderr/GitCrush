import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { motion, useMotionValue, useTransform, useAnimation, AnimatePresence } from "framer-motion";

// Helper for GitHub-style language colors
const languageColors = {
  JavaScript: "bg-yellow-400/20 text-yellow-400 border-yellow-400/30",
  TypeScript: "bg-blue-400/20 text-blue-400 border-blue-400/30",
  Python: "bg-blue-300/20 text-blue-300 border-blue-300/30",
  Rust: "bg-orange-500/20 text-orange-500 border-orange-500/30",
  Go: "bg-teal-400/20 text-teal-400 border-teal-400/30",
  Java: "bg-red-400/20 text-red-400 border-red-400/30",
  HTML: "bg-orange-600/20 text-orange-500 border-orange-600/30",
  CSS: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};
const defaultColor = "bg-brand-purple/20 text-brand-purple border-brand-purple/30";

function MiniHeatmap() {
  // Generate a fake 12-week heatmap (12 columns x 7 rows)
  const cols = 12;
  const rows = 7;
  const squares = Array.from({ length: cols * rows }).map((_, i) => {
    const intensity = Math.random();
    let bg = "bg-bg-border/30"; // empty
    if (intensity > 0.8) bg = "bg-emerald-400"; // high
    else if (intensity > 0.6) bg = "bg-emerald-500/80"; // med
    else if (intensity > 0.4) bg = "bg-emerald-600/60"; // low
    else if (intensity > 0.2) bg = "bg-emerald-800/40"; // very low
    return <div key={i} className={`w-2 h-2 rounded-[1px] ${bg}`} />;
  });

  return (
    <div className="flex flex-col gap-[2px]">
      <div className="flex text-[8px] text-text-muted mb-1 uppercase tracking-widest font-bold">Activity Heatmap</div>
      <div className="grid grid-cols-[repeat(12,minmax(0,1fr))] gap-[2px] w-fit">
        {squares}
      </div>
    </div>
  );
}

function MatchOverlay({ onClose }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg-base/90 backdrop-blur-xl p-6"
    >
      <motion.div 
        initial={{ scale: 0.5, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", bounce: 0.6 }}
        className="text-center"
      >
        <div className="text-8xl mb-6 drop-shadow-2xl">🎉</div>
        <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500 mb-4 drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]">
          Merge Request Approved
        </h1>
        <p className="text-xl text-text-secondary mb-10">You both swiped right! It's a mutual match.</p>
        
        <button 
          onClick={onClose}
          className="btn-primary text-lg px-8 py-4 shadow-xl hover:scale-105 transition-transform"
        >
          Keep Swiping
        </button>
      </motion.div>
    </motion.div>
  );
}

function FilterDrawer({ isOpen, onClose, filters, setFilters, applyFilters }) {
  const languageOptions = ["JavaScript", "TypeScript", "Python", "Rust", "Go", "Java", "C++", "Ruby", "PHP"];
  const intentOptions = ["Romantic", "Co-founder", "Collaborator", "Friendship"];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />
          <motion.div
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-sm bg-bg-card border-l border-bg-border shadow-2xl z-50 p-6 overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-bold text-text-primary flex items-center gap-2"><span>🎛️</span> Filters</h2>
              <button onClick={onClose} className="p-2 bg-bg-base rounded-full hover:bg-bg-border/50 text-text-muted hover:text-text-primary transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="space-y-6">
              {/* Intent */}
              <div>
                <h3 className="text-sm font-bold text-text-secondary uppercase tracking-widest mb-3 border-b border-bg-border pb-1">Looking For</h3>
                <div className="flex flex-col gap-2">
                  {intentOptions.map(intent => (
                    <label key={intent} className="flex items-center gap-3 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-bg-border text-brand-pink focus:ring-brand-pink bg-bg-base"
                        checked={filters.intents.includes(intent)}
                        onChange={(e) => {
                          if (e.target.checked) setFilters({ ...filters, intents: [...filters.intents, intent] });
                          else setFilters({ ...filters, intents: filters.intents.filter(i => i !== intent) });
                        }}
                      />
                      <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">{intent}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Experience */}
              <div>
                <h3 className="text-sm font-bold text-text-secondary uppercase tracking-widest mb-3 border-b border-bg-border pb-1">Experience Level</h3>
                <select 
                  className="w-full bg-bg-base border border-bg-border rounded-lg p-2.5 text-sm text-text-primary focus:border-brand-pink outline-none"
                  value={filters.exp}
                  onChange={(e) => setFilters({ ...filters, exp: e.target.value })}
                >
                  <option value="Any">Any Experience</option>
                  <option value="Junior">Junior (0-3 yrs)</option>
                  <option value="Mid">Mid-Level (3-7 yrs)</option>
                  <option value="Senior">Senior (7+ yrs)</option>
                </select>
              </div>

              {/* Languages */}
              <div>
                <h3 className="text-sm font-bold text-text-secondary uppercase tracking-widest mb-3 border-b border-bg-border pb-1">Top Languages</h3>
                <div className="flex flex-wrap gap-2">
                  {languageOptions.map(lang => {
                    const isSelected = filters.langs.includes(lang);
                    return (
                      <button
                        key={lang}
                        onClick={() => {
                          if (isSelected) setFilters({ ...filters, langs: filters.langs.filter(l => l !== lang) });
                          else if (filters.langs.length < 3) setFilters({ ...filters, langs: [...filters.langs, lang] });
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-mono font-semibold transition-all border ${
                          isSelected 
                            ? "bg-brand-pink text-white border-brand-pink shadow-[0_0_10px_rgba(233,30,140,0.5)]" 
                            : "bg-bg-base text-text-muted border-bg-border hover:border-brand-pink/50 hover:text-text-primary"
                        }`}
                      >
                        {lang}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-text-muted mt-2 italic">* Select up to 3 languages</p>
              </div>
            </div>

            <div className="mt-10 pt-6 border-t border-bg-border">
              <button 
                onClick={() => { applyFilters(); onClose(); }}
                className="w-full btn-primary py-3 flex items-center justify-center gap-2"
              >
                Apply Filters & Refresh
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function SwipeCard({ profile, isFront, zIndex, onSwipe }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const [bioExpanded, setBioExpanded] = useState(false);
  const controls = useAnimation();

  // Animations
  const rotate = useTransform(x, [-300, 300], [-15, 15]);
  const crushOpacity = useTransform(x, [10, 150], [0, 1]);
  const passOpacity = useTransform(x, [-10, -150], [0, 1]);
  const superOpacity = useTransform(y, [-10, -150], [0, 1]); // Swipe up

  const handleDragEnd = async (event, info) => {
    const swipeThreshold = 100;
    const velocityThreshold = 500;
    
    const isSwipeRight = info.offset.x > swipeThreshold || info.velocity.x > velocityThreshold;
    const isSwipeLeft = info.offset.x < -swipeThreshold || info.velocity.x < -velocityThreshold;
    const isSwipeUp = info.offset.y < -swipeThreshold || info.velocity.y < -velocityThreshold;

    if (isSwipeRight && Math.abs(info.offset.x) > Math.abs(info.offset.y)) {
      await controls.start({ x: 500, opacity: 0, transition: { duration: 0.3 } });
      onSwipe("right", profile.id);
    } else if (isSwipeLeft && Math.abs(info.offset.x) > Math.abs(info.offset.y)) {
      await controls.start({ x: -500, opacity: 0, transition: { duration: 0.3 } });
      onSwipe("left", profile.id);
    } else if (isSwipeUp && Math.abs(info.offset.y) > Math.abs(info.offset.x)) {
      await controls.start({ y: -500, opacity: 0, transition: { duration: 0.3 } });
      onSwipe("super", profile.id);
    } else {
      // Snap back
      controls.start({ x: 0, y: 0, transition: { type: "spring", stiffness: 300, damping: 20 } });
    }
  };

  // Allow passing keyboard triggers manually if needed
  useEffect(() => {
    if (isFront) {
      const handleKeyDown = (e) => {
        if (e.key === "ArrowRight") {
          controls.start({ x: 500, opacity: 0, transition: { duration: 0.3 } }).then(() => onSwipe("right", profile.id));
        } else if (e.key === "ArrowLeft") {
          controls.start({ x: -500, opacity: 0, transition: { duration: 0.3 } }).then(() => onSwipe("left", profile.id));
        } else if (e.key === "ArrowUp") {
          controls.start({ y: -500, opacity: 0, transition: { duration: 0.3 } }).then(() => onSwipe("super", profile.id));
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isFront, profile.id, controls, onSwipe]);

  const swipeCardScale = isFront ? 1 : 0.95;
  const swipeCardY = isFront ? 0 : 20;

  const scoreColor = 
    profile.matchScore >= 75 ? "from-green-400 to-emerald-600" :
    profile.matchScore >= 50 ? "from-yellow-400 to-amber-600" :
    "from-orange-400 to-red-600";

  return (
    <motion.div
      className="absolute top-0 w-full max-w-[420px] bg-bg-card border border-bg-border rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[75vh] max-h-[800px] touch-none"
      style={{ zIndex, x, y, rotate, scale: swipeCardScale }}
      animate={controls}
      drag={isFront ? true : false}
      dragConstraints={{ top: 0, bottom: 0, left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      whileTap={{ cursor: "grabbing" }}
      layout
    >
      {/* Swipe Overlays */}
      <motion.div style={{ opacity: crushOpacity }} className="absolute inset-0 bg-green-500/20 backdrop-blur-[2px] z-50 flex items-center justify-center pointer-events-none">
        <div className="border-4 border-green-500 text-green-500 font-black text-4xl p-4 rounded-xl rotate-12 bg-bg-base/80">CRUSH</div>
      </motion.div>
      <motion.div style={{ opacity: passOpacity }} className="absolute inset-0 bg-red-500/20 backdrop-blur-[2px] z-50 flex items-center justify-center pointer-events-none">
        <div className="border-4 border-red-500 text-red-500 font-black text-4xl p-4 rounded-xl -rotate-12 bg-bg-base/80">PASS</div>
      </motion.div>
      <motion.div style={{ opacity: superOpacity }} className="absolute inset-0 bg-brand-pink/20 backdrop-blur-[2px] z-50 flex items-center justify-center pointer-events-none">
        <div className="border-4 border-brand-pink text-brand-pink font-black text-4xl p-4 rounded-xl -rotate-6 bg-bg-base/80">SUPER STAR</div>
      </motion.div>

      {/* Top Header - Avatar & Basic Info */}
      <div className="relative p-6 pt-8 bg-bg-base/30 shrink-0 border-b border-bg-border">
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-pink/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex gap-4 items-center relative z-10">
          <img src={profile.avatarUrl} alt={profile.username} className="w-20 h-20 rounded-full border-2 border-bg-border shadow-md pointer-events-none" draggable={false} />
          <div>
            <h2 className="text-2xl font-black text-text-primary leading-none">@{profile.username}</h2>
            {profile.location && <p className="text-sm text-text-muted mt-1">📍 {profile.location}</p>}
            {profile.personalityType && (
              <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-0.5 rounded-full border border-brand-purple/20 bg-brand-purple/10 text-[10px] font-bold text-brand-purple-soft uppercase tracking-wider">
                <span>🎭</span> {profile.personalityType}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Match Score Bar */}
      <div className="h-1.5 w-full bg-bg-base relative shrink-0">
        <div className={`absolute top-0 left-0 h-full bg-gradient-to-r ${scoreColor}`} style={{ width: `${profile.matchScore || 0}%` }} />
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-5 scrollbar-hide bg-bg-card relative">
        <div className="flex justify-between items-end mb-5">
           <div className="flex gap-4 font-mono text-sm text-text-secondary">
             <div className="flex flex-col"><span className="text-text-primary font-bold">{profile.repos}</span><span className="text-[10px] text-text-muted uppercase tracking-widest">Repos</span></div>
             <div className="flex flex-col"><span className="text-text-primary font-bold">{profile.totalStars}</span><span className="text-[10px] text-text-muted uppercase tracking-widest">Stars</span></div>
             <div className="flex flex-col"><span className="text-text-primary font-bold">{profile.followers}</span><span className="text-[10px] text-text-muted uppercase tracking-widest">Follows</span></div>
           </div>
           
           <div className="text-right">
              <div className="text-3xl font-black text-text-primary leading-none">{profile.matchScore}%</div>
              <div className="text-[10px] text-text-muted uppercase tracking-widest font-bold mt-1">Match</div>
           </div>
        </div>

        {profile.matchReason && (
          <div className="mb-5 p-3 rounded-xl bg-bg-base border border-bg-border/50 text-sm italic text-text-primary">
            " {profile.matchReason} "
          </div>
        )}

        <div className="mb-5">
          <p className={`text-text-secondary text-[15px] leading-relaxed relative ${!bioExpanded && 'line-clamp-2'}`}>
            {profile.customBio || profile.aiBio || profile.bio || "No bio specified."}
          </p>
          {(profile.customBio || profile.aiBio || profile.bio) && (
            <button onClick={() => setBioExpanded(!bioExpanded)} className="text-xs text-brand-pink mt-1 hover:underline relative z-10 cursor-pointer">
              {bioExpanded ? "Show less" : "Read more"}
            </button>
          )}
        </div>

        {/* Coding Languages */}
        <div className="mb-5">
          <div className="flex flex-wrap gap-2">
            {(profile.languages || []).slice(0, 4).map((l, idx) => {
              const colorClass = languageColors[l.lang] || defaultColor;
              return (
                <span key={idx} className={`px-2.5 py-1 rounded-md text-[11px] font-mono border ${colorClass}`}>
                  {l.lang} ({l.pct}%)
                </span>
              );
            })}
          </div>
        </div>

        {/* Heatmap & Red Flags side by side */}
        <div className="flex flex-row justify-between items-start mb-2 gap-4">
          <MiniHeatmap />
          
          {profile.redFlags && profile.redFlags.length > 0 && (
            <div className="flex-1 text-right">
              <div className="text-[10px] text-red-400/80 mb-1 uppercase tracking-widest font-bold flex items-center justify-end gap-1">
                <span>🚩</span> Flags
              </div>
              <ul className="space-y-1">
                {profile.redFlags.map((flag, idx) => (
                  <li key={idx} className="text-[10px] text-red-400/60 leading-tight line-clamp-2">
                    {flag}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-4 bg-bg-base/30 border-t border-bg-border flex justify-evenly shrink-0 pb-6">
        <button 
          onClick={() => isFront && controls.start({ x: -500, transition: { duration: 0.3 } }).then(() => onSwipe("left", profile.id))}
          className="w-14 h-14 rounded-full bg-bg-card border border-bg-border flex items-center justify-center text-red-500 hover:bg-red-500/10 hover:border-red-500 shadow-xl transition-colors z-20"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <button 
          onClick={() => isFront && controls.start({ y: -500, transition: { duration: 0.3 } }).then(() => onSwipe("super", profile.id))}
          className="w-10 h-10 mt-2 rounded-full bg-bg-card border border-bg-border flex items-center justify-center text-brand-pink hover:bg-brand-pink/10 hover:border-brand-pink shadow-xl transition-colors z-20"
        >
          <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
        </button>
        <button 
          onClick={() => isFront && controls.start({ x: 500, transition: { duration: 0.3 } }).then(() => onSwipe("right", profile.id))}
          className="w-14 h-14 rounded-full bg-bg-card border border-bg-border flex items-center justify-center text-green-500 hover:bg-green-500/10 hover:border-green-500 shadow-xl transition-colors z-20"
        >
          <svg className="w-6 h-6 fill-current" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" /></svg>
        </button>
      </div>
    </motion.div>
  );
}

export default function Discover() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMatch, setShowMatch] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Filter state
  const [filters, setFilters] = useState({
    intents: [],
    langs: [],
    exp: "Any"
  });

  const fetchDiscover = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.intents.length > 0) params.append("intent", filters.intents.join(","));
    if (filters.langs.length > 0) params.append("langs", filters.langs.join(","));
    if (filters.exp !== "Any") params.append("exp", filters.exp);

    fetch(`http://localhost:5000/api/discover?${params.toString()}`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) setProfiles(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [filters]);

  // Fetch profiles on mount
  useEffect(() => {
    fetchDiscover();
  }, [fetchDiscover]);

  const handleSwipe = async (direction, targetId) => {
    // Optimistically remove from state
    setProfiles((prev) => prev.filter(p => p.id !== targetId));

    try {
      const res = await fetch("http://localhost:5000/api/swipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ targetUserId: targetId, direction })
      });
      const data = await res.json();
      
      if (data.isMatch) {
        setShowMatch(true);
      }
    } catch (err) {
      console.error("Swipe failed", err);
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-brand-pink/20 border-t-brand-pink rounded-full animate-spin"></div>
        <p className="text-text-muted font-mono animate-pulse">Running git fetch...</p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center relative overflow-hidden bg-bg-base select-none">
      {/* Background decor */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-pink/5 rounded-full blur-[100px] -z-10 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-brand-purple/5 rounded-full blur-[100px] -z-10 pointer-events-none" />

      {/* Floating Filter Button */}
      <button 
        onClick={() => setDrawerOpen(true)}
        className="absolute top-6 right-6 z-30 p-3 bg-bg-card/80 backdrop-blur-md rounded-2xl border border-bg-border shadow-2xl hover:bg-bg-border/50 transition-colors text-text-secondary hover:text-text-primary"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
        {(filters.intents.length > 0 || filters.langs.length > 0 || filters.exp !== "Any") && (
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping pos-absolute inline-flex h-full w-full rounded-full bg-brand-pink opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-brand-pink"></span>
          </span>
        )}
      </button>

      {/* Empty State */}
      {profiles.length === 0 && (
        <div className="text-center px-4 max-w-sm">
          <div className="text-6xl mb-6 opacity-50">🛑</div>
          <h2 className="text-2xl font-bold text-text-primary mb-3">No more devs in your area!</h2>
          <p className="text-text-secondary mb-6">Looks like you've swiped through everyone, or your filters are too strict. Try loosening them up or \`git pull --all\` later.</p>
          <button onClick={() => {
            setFilters({ intents: [], langs: [], exp: "Any" });
            fetchDiscover();
          }} className="btn-primary px-6 py-2.5">
            Reset Filters & Refresh
          </button>
        </div>
      )}

      {/* Card Stack Area */}
      {profiles.length > 0 && (
        <div className="relative w-full max-w-[420px] h-[75vh] max-h-[800px] flex items-center justify-center perspective-[1000px]">
          <AnimatePresence>
            {/* Render up to 3 cards for performance, reversed so first is on top */}
            {profiles.slice(0, 3).reverse().map((profile, i, arr) => {
              const isFront = i === arr.length - 1;
              return (
                <SwipeCard 
                  key={profile.id} 
                  profile={profile} 
                  zIndex={i} 
                  isFront={isFront} 
                  onSwipe={handleSwipe} 
                />
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {showMatch && <MatchOverlay onClose={() => setShowMatch(false)} />}
      </AnimatePresence>

      <FilterDrawer 
        isOpen={drawerOpen} 
        onClose={() => setDrawerOpen(false)} 
        filters={filters} 
        setFilters={setFilters} 
        applyFilters={fetchDiscover} 
      />
    </div>
  );
}
