import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import SearchBar from "../components/SearchBar";
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

function timeAgo(dateString) {
  const diffMs = new Date() - new Date(dateString);
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Active just now";
  if (diffMins < 60) return `Active ${diffMins} min ago`;
  const diffHrs = Math.floor(diffMins / 60);
  return `Active ${diffHrs} hr ago`;
}

function normalizeLanguages(languages) {
  if (!languages) return [];

  if (Array.isArray(languages)) {
    return languages
      .map((item) => {
        if (typeof item === "string") return { lang: item, pct: null };
        if (item && typeof item === "object") {
          return {
            lang: item.lang || item.name || "Unknown",
            pct: typeof item.pct === "number" ? item.pct : null,
          };
        }
        return null;
      })
      .filter(Boolean);
  }

  if (typeof languages === "object") {
    return Object.entries(languages)
      .map(([lang, pct]) => ({
        lang,
        pct: typeof pct === "number" ? pct : null,
      }))
      .sort((a, b) => (b.pct || 0) - (a.pct || 0));
  }

  return [];
}

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

function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function TrendingDevs({ trending }) {
  const navigate = useNavigate();
  if (!trending || trending.length === 0) return null;

  return (
    <div className="absolute top-6 left-6 right-24 z-20 pointer-events-none">
      <div className="flex flex-col gap-2 w-fit max-w-[200px] md:max-w-[240px]">
        <h3 className="text-[10px] font-black text-black uppercase tracking-[0.2em] flex items-center gap-2 bg-brand-yellow w-fit px-2 py-1 border-2 border-black shadow-[2px_2px_0_rgba(0,0,0,1)]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-green opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-green"></span>
          </span>
          Active in the last hour
        </h3>
        <div className="grid grid-cols-5 gap-2 pb-4 pointer-events-auto">
          {trending.map((dev) => (
            <div 
              key={dev.id} 
              className="flex-shrink-0 group relative cursor-pointer"
              title={`@${dev.username} - ${dev.dominantEventType || 'Active'}`}
              onClick={() => navigate(`/profile/${dev.username}`)}
            >
              <img 
                src={dev.avatarUrl} 
                className="w-10 h-10 md:w-11 md:h-11 rounded-full border-2 border-black shadow-[2px_2px_0_rgba(0,0,0,1)] group-hover:scale-110 object-cover transition-transform bg-white" 
                alt={dev.username}
              />
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-brand-green rounded-full border-2 border-black" />
            </div>
          ))}
        </div>
      </div>
      
      {/* Global Search Bar explicitly shown on Discover page */}
      <div className="pointer-events-auto z-50 mt-2 w-fit">
        <SearchBar />
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
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-brand-pink/90 backdrop-blur-sm p-6"
    >
      <motion.div 
        initial={{ scale: 0.5, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", bounce: 0.6 }}
        className="text-center bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-12 rounded-3xl"
      >
        <div className="text-8xl mb-6 drop-shadow-[4px_4px_0_rgba(0,0,0,1)]">ðŸŽ‰</div>
        <h1 className="text-4xl md:text-5xl font-black text-black mb-4 uppercase tracking-tight">
          Merge Request Approved
        </h1>
        <p className="text-xl text-black font-bold mb-10">You both swiped right! It's a mutual match.</p>
        
        <button 
          onClick={onClose}
          className="btn-primary text-xl px-12 py-5 uppercase tracking-wide"
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
            className="fixed top-0 right-0 h-full w-full max-w-sm bg-white border-l-4 border-black shadow-[-8px_0px_0px_0px_rgba(0,0,0,1)] z-50 p-6 overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-8 border-b-4 border-black pb-4">
              <h2 className="text-2xl font-black text-black flex items-center gap-2 uppercase tracking-tight"><span>ðŸŽ›ï¸</span> Filters</h2>
              <button onClick={onClose} className="p-2 bg-brand-yellow border-2 border-black rounded-sm shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:translate-x-1 hover:shadow-none transition-all font-black text-black">
                âœ•
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
                        className={`px-3 py-1.5 rounded-sm text-xs font-mono font-black transition-all border-2 border-black ${
                          isSelected 
                            ? "bg-brand-pink text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" 
                            : "bg-white text-text-muted hover:bg-brand-yellow hover:text-black hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
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
  const normalizedLanguages = normalizeLanguages(profile.languages);

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
      className="absolute top-0 w-full max-w-[420px] bg-white border-4 border-black rounded-[2rem] overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col h-[75vh] max-h-[800px] touch-none"
      style={{ zIndex, x, y, rotate, scale: swipeCardScale }}
      animate={controls}
      drag={isFront ? true : false}
      dragConstraints={{ top: 0, bottom: 0, left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      whileTap={{ cursor: "grabbing" }}
      layout
    >
      {/* Swipe Overlays */}
      <motion.div style={{ opacity: crushOpacity }} className="absolute inset-0 bg-brand-green/80 z-50 flex items-center justify-center pointer-events-none">
        <div className="border-8 border-black text-black font-black text-6xl px-8 py-4 bg-white rotate-12 shadow-[8px_8px_0_rgba(0,0,0,1)]">CRUSH</div>
      </motion.div>
      <motion.div style={{ opacity: passOpacity }} className="absolute inset-0 bg-red-400/80 z-50 flex items-center justify-center pointer-events-none">
        <div className="border-8 border-black text-black font-black text-6xl px-8 py-4 bg-white -rotate-12 shadow-[8px_8px_0_rgba(0,0,0,1)]">PASS</div>
      </motion.div>
      <motion.div style={{ opacity: superOpacity }} className="absolute inset-0 bg-brand-pink/80 z-50 flex items-center justify-center pointer-events-none">
        <div className="border-8 border-black text-black font-black text-5xl px-8 py-4 bg-brand-yellow -rotate-6 shadow-[8px_8px_0_rgba(0,0,0,1)] text-center tracking-tighter leading-none uppercase">Super<br/>Star</div>
      </motion.div>

      {/* Top Header - Avatar & Basic Info */}
      <div className="relative p-6 pt-8 shrink-0 border-b-4 border-black bg-brand-yellow/30">
        <div className="flex gap-4 items-center relative z-10">
          <img src={profile.avatarUrl} alt={profile.username} className="w-20 h-20 rounded-2xl border-4 border-black object-cover shadow-[4px_4px_0_rgba(0,0,0,1)] bg-white pointer-events-none" draggable={false} />
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h2 className="text-3xl font-black text-black leading-none break-all">@{profile.username}</h2>
              {profile.isGhost && (
                <span className="text-[10px] font-bold uppercase tracking-widest bg-brand-pink text-white px-2 py-0.5 border-2 border-black shadow-[2px_2px_0_rgba(0,0,0,1)] whitespace-nowrap">
                  Not on GitCrush yet
                </span>
              )}
              {profile.lastActiveAt && (new Date() - new Date(profile.lastActiveAt)) < 2 * 60 * 60 * 1000 && (
                <div className="flex items-center gap-1 bg-brand-green/20 border-2 border-brand-green/40 px-2 py-0.5 rounded-full mt-1 w-max">
                  <span className="w-2 h-2 bg-brand-green rounded-full animate-pulse" />
                  <span className="text-[10px] font-black text-brand-green uppercase tracking-tight">{timeAgo(profile.lastActiveAt)}</span>
                </div>
              )}
            </div>
            {profile.location && <p className="text-sm font-bold text-text-secondary mt-1 tracking-tight">ðŸ“ {profile.location}</p>}
            {profile.personalityType && (
              <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-0.5 border-2 border-black bg-brand-purple text-xs font-bold text-black uppercase tracking-wider shadow-[2px_2px_0_rgba(0,0,0,1)]">
                <span>ðŸŽ­</span> {profile.personalityType}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Match Score Bar */}
      <div className="h-2 w-full bg-white relative shrink-0 border-b-4 border-black">
        <div className={`absolute top-0 left-0 h-full bg-gradient-to-r ${scoreColor}`} style={{ width: `${profile.matchScore || 0}%` }} />
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6 scrollbar-hide bg-white relative">
        <div className="flex justify-between items-end mb-6">
           <div className="flex gap-4 font-mono text-sm text-black">
             <div className="flex flex-col items-center"><span className="text-xl font-black">{profile.repos}</span><span className="text-[10px] text-text-secondary uppercase tracking-widest font-bold">Repos</span></div>
             <div className="flex flex-col items-center"><span className="text-xl font-black">{profile.totalStars}</span><span className="text-[10px] text-text-secondary uppercase tracking-widest font-bold">Stars</span></div>
             <div className="flex flex-col items-center"><span className="text-xl font-black">{profile.followers}</span><span className="text-[10px] text-text-secondary uppercase tracking-widest font-bold">Follows</span></div>
           </div>
           
           <div className="text-right border-4 border-black bg-brand-green px-3 py-1 shadow-[4px_4px_0_rgba(0,0,0,1)] -rotate-3">
              <div className="text-3xl font-black text-black leading-none">{profile.matchScore}%</div>
              <div className="text-[10px] text-black uppercase tracking-widest font-bold mt-1">Match</div>
           </div>
        </div>

        {profile.matchReason && (
          <div className="mb-6 p-4 bg-brand-peach/30 border-4 border-black shadow-[4px_4px_0_rgba(0,0,0,1)] text-sm font-bold text-black italic">
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
            {normalizedLanguages.slice(0, 4).map((l, idx) => {
              const colorClass = languageColors[l.lang] || defaultColor;
              return (
                <span key={idx} className={`px-2.5 py-1 rounded-md text-[11px] font-mono border ${colorClass}`}>
                  {l.lang}{typeof l.pct === "number" ? ` (${l.pct}%)` : ""}
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
                <span>ðŸš©</span> Flags
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
      <div className="p-4 bg-brand-blue/30 border-t-4 border-black flex justify-evenly shrink-0 pb-6">
        <button 
          onClick={() => isFront && controls.start({ x: -500, transition: { duration: 0.3 } }).then(() => onSwipe("left", profile.id))}
          className="w-16 h-16 rounded-full bg-white border-4 border-black flex items-center justify-center text-red-500 font-black shadow-[4px_4px_0_rgba(0,0,0,1)] hover:bg-brand-yellow active:translate-y-1 active:translate-x-1 active:shadow-none transition-all z-20"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={4} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <button 
          onClick={() => isFront && controls.start({ y: -500, transition: { duration: 0.3 } }).then(() => onSwipe("super", profile.id))}
          className="w-12 h-12 mt-2 rounded-full bg-brand-pink border-4 border-black flex items-center justify-center text-white shadow-[4px_4px_0_rgba(0,0,0,1)] hover:bg-brand-yellow active:translate-y-1 active:translate-x-1 active:shadow-none transition-all z-20"
        >
          <svg className="w-6 h-6 fill-current text-white stroke-black stroke-2" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
        </button>
        <button 
          onClick={() => isFront && controls.start({ x: 500, transition: { duration: 0.3 } }).then(() => onSwipe("right", profile.id))}
          className="w-16 h-16 rounded-full bg-brand-green border-4 border-black flex items-center justify-center text-black font-black shadow-[4px_4px_0_rgba(0,0,0,1)] hover:bg-brand-yellow active:translate-y-1 active:translate-x-1 active:shadow-none transition-all z-20"
        >
          <svg className="w-8 h-8 fill-current stroke-black stroke-2" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" /></svg>
        </button>
      </div>
    </motion.div>
  );
}

export default function Discover() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMatch, setShowMatch] = useState(false);
  const [ghostInvite, setGhostInvite] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [swipeHistory, setSwipeHistory] = useState([]);

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

    fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/discover?${params.toString()}`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) setProfiles(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [filters]);

  const fetchTrending = useCallback(() => {
    fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/trending-active`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) setTrending(data);
      })
      .catch((err) => console.error("Trending fetch failed", err));
  }, []);

  // Fetch profiles and trending on mount
  useEffect(() => {
    fetchDiscover();
    fetchTrending();
  }, [fetchDiscover, fetchTrending]);

  const handleSwipe = async (direction, targetId) => {
    // Optimistically remove from state and push to history
    const swipedUser = profiles.find((p) => p.id === targetId);
    setProfiles((prev) => prev.filter(p => p.id !== targetId));
    if (swipedUser) {
      setSwipeHistory((prev) => [...prev, swipedUser]);
    }

    if (direction === "right" && swipedUser?.isGhost) {
      setGhostInvite(swipedUser);
      return;
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/swipe`, {
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

  const handleUndo = async () => {
    if (swipeHistory.length === 0) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/swipes/last`, {
        method: "DELETE",
        credentials: "include"
      });
      if (res.ok) {
        const lastUser = swipeHistory[swipeHistory.length - 1];
        setSwipeHistory((prev) => prev.slice(0, -1));
        setProfiles((prev) => [lastUser, ...prev]);
        setShowMatch(false); // Just in case a match modal was open
      }
    } catch (err) {
      console.error("Undo swipe failed", err);
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

      <TrendingDevs trending={trending} />

      {/* Floating Filter Button */}
      <button 
        onClick={() => setDrawerOpen(true)}
        className="absolute top-6 right-6 z-30 p-3 bg-brand-yellow border-4 border-black shadow-[4px_4px_0_rgba(0,0,0,1)] hover:bg-white hover:translate-y-1 hover:translate-x-1 hover:shadow-none transition-all text-black font-black"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
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
          <div className="text-6xl mb-6 opacity-50">ðŸ›‘</div>
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

      <AnimatePresence>
        {ghostInvite && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-brand-pink/90 backdrop-blur-sm p-6"
          >
            <motion.div 
              initial={{ scale: 0.5, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", bounce: 0.6 }}
              className="text-center bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-12 rounded-3xl"
            >
              <div className="text-8xl mb-6 drop-shadow-[4px_4px_0_rgba(0,0,0,1)]">ðŸ‘»</div>
              <h1 className="text-4xl md:text-5xl font-black text-black mb-4 uppercase tracking-tight">
                Invite @{ghostInvite.username}!
              </h1>
              <p className="text-xl text-black font-bold mb-10">They aren't on GitCrush yet. Copy this link to invite them via GitHub!</p>
              
              <div className="flex flex-col gap-4 max-w-sm mx-auto">
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(`https://gitcrush.dev/invite/${ghostInvite.username}`);
                    alert("Link copied to clipboard!");
                  }}
                  className="btn-primary text-xl px-12 py-5 uppercase tracking-wide"
                >
                  Copy Invite Link
                </button>
                <button 
                  onClick={() => setGhostInvite(null)}
                  className="px-12 py-4 text-xl font-black text-black uppercase tracking-wide hover:bg-brand-yellow border-4 border-transparent hover:border-black rounded-xl transition-all"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <FilterDrawer 
        isOpen={drawerOpen} 
        onClose={() => setDrawerOpen(false)} 
        filters={filters} 
        setFilters={setFilters} 
        applyFilters={fetchDiscover} 
      />

      {/* Undo Button */}
      {swipeHistory.length > 0 && (
        <button
          onClick={handleUndo}
          title="Undo last swipe"
          className="absolute bottom-6 right-6 z-30 px-6 py-3 bg-white border-4 border-black text-black shadow-[4px_4px_0_rgba(0,0,0,1)] hover:bg-brand-pink hover:translate-y-1 hover:translate-x-1 hover:shadow-none transition-all flex items-center gap-3 font-black uppercase tracking-widest text-lg pointer-events-auto"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
          Undo Swipe
        </button>
      )}
    </div>
  );
}




