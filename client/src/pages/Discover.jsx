import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

function UserCard({ profile, onSkip, onLike }) {
  const [matchData, setMatchData] = useState(null);
  const [bioExpanded, setBioExpanded] = useState(false);

  useEffect(() => {
    fetch(`http://localhost:5000/api/compatibility/${profile.id}`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setMatchData(data))
      .catch(console.error);
  }, [profile.id]);

  const scoreColor = 
    matchData?.score >= 75 ? "from-green-400 to-emerald-600" :
    matchData?.score >= 50 ? "from-yellow-400 to-amber-600" :
    "from-orange-400 to-red-600";

  return (
    <div className="w-full max-w-md mx-auto relative bg-bg-card border border-bg-border rounded-[2rem] overflow-hidden shadow-2xl flex flex-col h-[75vh] max-h-[800px]">
      
      {/* Top Graphic Area */}
      <div className="relative h-48 bg-bg-base/50 flex-shrink-0 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-pink/20 to-brand-purple/20 blur-xl"></div>
        <img 
          src={profile.avatarUrl} 
          alt={profile.username}
          className="w-32 h-32 rounded-full border-4 border-bg-card shadow-lg relative z-10"
        />
        {profile.personalityType && (
          <div className="absolute bottom-4 right-4 bg-bg-card/90 backdrop-blur-md px-3 py-1 rounded-full border border-bg-border text-xs font-bold shadow-lg z-10 flex items-center gap-1">
            <span>🎭</span> {profile.personalityType}
          </div>
        )}
      </div>

      {/* Match Score Bar */}
      <div className="h-1.5 w-full bg-bg-base relative overflow-hidden">
        <div 
          className={`absolute top-0 left-0 h-full bg-gradient-to-r ${scoreColor} transition-all duration-1000`}
          style={{ width: matchData ? `${matchData.score}%` : "0%" }}
        />
      </div>

      {/* Content scroll area */}
      <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-black text-text-primary">@{profile.username}</h2>
            <div className="flex gap-3 text-xs text-text-muted mt-1 font-mono">
              <span title="Total Repos">📦 {profile.repos}</span>
              <span title="Followers">👥 {profile.followers}</span>
              <span title="Total Stars">⭐ {profile.totalStars}</span>
            </div>
          </div>
          {matchData && (
            <div className="text-right">
              <div className="text-2xl font-black text-text-primary">{matchData.score}%</div>
              <div className="text-[10px] uppercase text-text-muted tracking-wide font-bold">Match</div>
            </div>
          )}
        </div>

        {/* AI Bio or Custom Bio */}
        <div className="mb-6 relative">
          <p className={`text-text-secondary text-base italic leading-relaxed ${!bioExpanded && 'line-clamp-3'}`}>
            "{profile.customBio || profile.aiBio || profile.bio || "No bio written yet. Probably too busy pushing code."}"
          </p>
          {(profile.customBio || profile.aiBio || profile.bio) && (
            <button onClick={() => setBioExpanded(!bioExpanded)} className="text-xs text-brand-pink mt-1 hover:underline">
              {bioExpanded ? "Show less" : "Read more"}
            </button>
          )}
        </div>

        {/* Compatibility Engine Explanation */}
        {matchData && matchData.explanation && (
          <div className="mb-6 p-4 rounded-xl bg-brand-purple/5 border border-brand-purple/20">
            <h4 className="text-xs uppercase tracking-wider font-bold text-brand-purple-soft mb-1 flex items-center gap-1">
              <span>🔮</span> Compatibility AI
            </h4>
            <p className="text-sm text-text-primary leading-snug">
              {matchData.explanation}
            </p>
          </div>
        )}

        {/* Tech Stack */}
        <div className="mb-6">
          <h4 className="text-sm font-bold text-text-primary mb-2 flex items-center gap-1 text-sky-400">
            <span>⚡</span> Tech Stack
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {profile.languages && profile.languages.length > 0 ? (
              profile.languages.map((l, idx) => (
                <span key={idx} className="px-2.5 py-1 rounded-md bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-mono">
                  {l.lang} ({l.pct}%)
                </span>
              ))
            ) : (
              <span className="text-xs text-text-muted">No public languages found.</span>
            )}
          </div>
        </div>

        {/* Red Flags */}
        {profile.redFlags && profile.redFlags.length > 0 && (
          <div className="mb-4">
             <h4 className="text-sm font-bold text-text-primary mb-2 flex items-center gap-1 text-red-400">
              <span>🚩</span> Red Flags
            </h4>
            <ul className="space-y-1.5">
              {profile.redFlags.map((flag, idx) => (
                <li key={idx} className="text-xs text-red-400/90 bg-red-500/5 border border-red-500/10 rounded-lg px-2.5 py-1.5 line-clamp-1">
                  {flag}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Action Buttons (Fixed at bottom) */}
      <div className="p-4 bg-bg-card border-t border-bg-border flex justify-evenly shrink-0">
        <button 
          onClick={onSkip}
          className="w-14 h-14 rounded-full bg-bg-base border border-bg-border flex items-center justify-center text-2xl hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-500 transition-all shadow-lg hover:scale-110"
        >
          ✕
        </button>
        <button 
          onClick={onLike}
          className="w-14 h-14 rounded-full bg-bg-base border border-bg-border flex items-center justify-center text-2xl hover:bg-green-500/10 hover:border-green-500/50 hover:text-green-500 transition-all shadow-lg hover:scale-110"
        >
          ❤️
        </button>
      </div>

    </div>
  );
}

export default function Discover() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:5000/api/discover", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) setProfiles(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleNext = () => {
    setCurrentIndex((prev) => prev + 1);
  };

  const handleLike = () => {
    // In a real app, this would hit a POST /api/like endpoint
    handleNext();
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-brand-pink/20 border-t-brand-pink rounded-full animate-spin"></div>
      </div>
    );
  }

  if (profiles.length === 0 || currentIndex >= profiles.length) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center text-center px-4">
        <div className="text-6xl mb-4 opacity-50">🧭</div>
        <h2 className="text-2xl font-bold text-text-primary mb-2">You've reached the end!</h2>
        <p className="text-text-secondary">Check back later for more developers in your area.</p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-8 px-4 relative overflow-hidden">
      {/* Background decor */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-pink/5 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-purple/5 rounded-full blur-3xl -z-10" />

      <UserCard 
        profile={profiles[currentIndex]} 
        onSkip={handleNext} 
        onLike={handleLike} 
      />
    </div>
  );
}
