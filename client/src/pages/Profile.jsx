import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function Profile() {
  const { user, setUser } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [customBioText, setCustomBioText] = useState(user?.customBio || "");
  const [bioExpanded, setBioExpanded] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch("http://localhost:5000/api/sync-profile", { method: "POST", credentials: "include" });
      const updatedUser = await res.json();
      if (!updatedUser.error) {
        setUser(updatedUser);
      }
    } catch (e) {
      console.error("Sync failed", e);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      const res = await fetch("http://localhost:5000/api/regenerate-bio", { method: "POST", credentials: "include" });
      const updatedUser = await res.json();
      if (!updatedUser.error) {
        setUser(updatedUser);
      } else {
        alert(updatedUser.error); // Show error like "Maximum 5 regenerations reached"
      }
    } catch (e) {
      console.error("Regen failed", e);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleSaveBio = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/me/bio", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ customBio: customBioText }),
      });
      const updatedUser = await res.json();
      if (!updatedUser.error) {
        setUser(updatedUser);
        setIsEditingBio(false);
      }
    } catch (e) {
      console.error("Save generic bio failed", e);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Header Profile Section */}
      <div className="flex flex-col md:flex-row items-center gap-8 mb-12 bg-bg-card border border-bg-border rounded-3xl p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-pink/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        
        <img
          src={user.avatarUrl}
          alt={user.username}
          className="w-32 h-32 rounded-full border-4 border-bg-card ring-2 ring-brand-pink/50 z-10"
        />

        <div className="flex-1 text-center md:text-left z-10 w-full">
          <h1 className="text-3xl font-black text-text-primary mb-2">@{user.username}</h1>
          
          {/* Bio Section */}
          <div className="mb-4 relative">
            {isEditingBio ? (
              <div className="flex flex-col gap-2 max-w-lg mx-auto md:mx-0">
                <textarea 
                  className="w-full bg-bg-base/50 border border-bg-border rounded-lg p-3 text-sm text-text-primary focus:outline-none focus:border-brand-pink min-h-[100px]"
                  value={customBioText}
                  onChange={(e) => setCustomBioText(e.target.value)}
                  placeholder="Write your own catchy bio..."
                />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setIsEditingBio(false)} className="text-xs text-text-muted hover:text-text-primary px-3 py-1">Cancel</button>
                  <button onClick={handleSaveBio} className="btn-primary text-xs px-4 py-1.5 rounded-md">Save</button>
                </div>
              </div>
            ) : (
              <div className="max-w-xl mx-auto md:mx-0">
                <p className={`text-text-secondary text-base italic leading-relaxed ${!bioExpanded && 'line-clamp-2'}`}>
                  "{user.customBio || user.aiBio || user.bio || "Still syncing a bio..."}"
                </p>
                <div className="flex items-center justify-center md:justify-start gap-4 mt-2">
                  {!user.customBio && user.aiBio && (
                    <span className="text-[10px] uppercase tracking-widest text-brand-purple-soft/70 font-bold border border-brand-purple/20 px-2 py-0.5 rounded-full">✨ AI Generated</span>
                  )}
                  {(user.customBio || user.aiBio) && (
                    <button onClick={() => setBioExpanded(!bioExpanded)} className="text-xs text-brand-pink hover:underline">
                      {bioExpanded ? "Show less" : "Read more"}
                    </button>
                  )}
                  <button onClick={() => { setCustomBioText(user.customBio || user.aiBio || user.bio || ""); setIsEditingBio(true); }} className="text-xs text-text-muted hover:text-text-primary underline">
                    {user.customBio ? "Edit Bio" : "Write my own"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Personality Badge */}
          {user.personalityType && (
            <div className="inline-flex items-center gap-2 mb-4 px-4 py-1.5 rounded-full border border-brand-purple/40 bg-brand-purple/15 text-sm font-semibold text-text-primary">
              <span className="text-brand-purple-soft">🎭</span>
              {user.personalityType}
            </div>
          )}
          
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm font-mono text-text-muted">
            <span className="flex items-center gap-1">📦 {user.repos} repos</span>
            <span className="flex items-center gap-1">👥 {user.followers} followers</span>
            <span className="flex items-center gap-1">⭐ {user.totalStars} total stars</span>
          </div>
        </div>

        <div className="flex flex-col gap-3 z-10 w-full sm:w-auto mt-6 md:mt-0">
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="btn-primary px-6 py-3 whitespace-nowrap disabled:opacity-50 w-full"
          >
            {isSyncing ? "Syncing..." : "🔄 Refresh Data"}
          </button>
          
          {(!user.customBio && user.bioRegenerations < 5) && (
            <button
              onClick={handleRegenerate}
              disabled={isRegenerating || isSyncing}
              className="px-6 py-2.5 rounded-xl border border-bg-border bg-bg-base/50 text-sm font-semibold text-text-secondary hover:text-text-primary hover:border-brand-purple/50 transition-colors disabled:opacity-50 whitespace-nowrap w-full flex items-center justify-center gap-2"
            >
              🪄 {isRegenerating ? "Generating..." : `Regenerate Bio (${5 - (user.bioRegenerations || 0)} left)`}
            </button>
          )}
        </div>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {/* Experience Score */}
        <div className="glass-card p-6 flex flex-col items-center justify-center text-center">
          <div className="text-text-muted text-xs uppercase tracking-wider font-bold mb-2">Exp Score</div>
          <div className="text-4xl font-black bg-gradient-to-br from-brand-pink to-brand-purple bg-clip-text text-transparent">
            {user.experienceScore || 0}<span className="text-xl">/10</span>
          </div>
        </div>

        {/* Longest Streak */}
        <div className="glass-card p-6 flex flex-col items-center justify-center text-center">
          <div className="text-text-muted text-xs uppercase tracking-wider font-bold mb-2">Longest Streak</div>
          <div className="text-4xl font-black text-text-primary">
            {user.longestStreak || 0} <span className="text-xl text-brand-pink">🔥</span>
          </div>
        </div>

        {/* Activity Pattern */}
        <div className="glass-card p-6 flex flex-col items-center justify-center text-center">
          <div className="text-text-muted text-xs uppercase tracking-wider font-bold mb-2">Active Time</div>
          <div className="text-2xl font-black text-text-primary capitalize mt-2">
            {user.commitPattern || "Unknown"}
            {user.commitPattern === "night" ? " 🦉" : " ☕"}
          </div>
        </div>

        {/* Current Streak */}
        <div className="glass-card p-6 flex flex-col items-center justify-center text-center">
          <div className="text-text-muted text-xs uppercase tracking-wider font-bold mb-2">Current Streak</div>
          <div className="text-4xl font-black text-text-primary">
            {user.currentStreak || 0} <span className="text-xl text-green-400">⚡</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Languages */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
            <span className="text-emerald-400">{'</>'}</span> Top Languages
          </h3>
          <div className="space-y-4">
            {user.languages && user.languages.length > 0 ? (
              user.languages.map((lang, idx) => (
                <div key={idx} className="relative">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-semibold text-text-secondary">{lang.lang}</span>
                    <span className="text-text-muted">{lang.pct}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-bg-card rounded-full overflow-hidden">
                    <div className="h-full bg-brand-pink rounded-full" style={{ width: `${lang.pct}%` }} />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-text-muted text-sm">No language data synced yet.</p>
            )}
          </div>
        </div>

        {/* Topics */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
            <span className="text-sky-400">#</span> Fav Topics
          </h3>
          <div className="flex flex-wrap gap-2">
            {user.topics && user.topics.length > 0 ? (
              user.topics.map((topic, idx) => (
                <span key={idx} className="tag-pill border-brand-purple/30 bg-brand-purple/10 text-brand-purple-soft">
                  {topic}
                </span>
              ))
            ) : (
              <p className="text-text-muted text-sm">No topics found on public repos.</p>
            )}
          </div>
        </div>
      </div>

      {/* Personality + Red Flags Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {/* Personality Card */}
        {user.personalityType && (
          <div className="glass-card p-6">
            <h3 className="text-lg font-bold text-text-primary mb-2 flex items-center gap-2">
              <span>🎭</span> Dev Archetype
            </h3>
            <p className="text-xl font-black mb-2" style={{ background: "linear-gradient(135deg, #e91e8c, #a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              {user.personalityType}
            </p>
            <p className="text-text-secondary text-sm leading-relaxed">{user.personalityDesc}</p>
          </div>
        )}

        {/* Red Flags Card */}
        {user.redFlags && user.redFlags.length > 0 && (
          <div className="glass-card p-6 border border-red-500/10">
            <h3 className="text-lg font-bold text-text-primary mb-3 flex items-center gap-2">
              <span>🚩</span> Red Flags
              <span className="text-xs font-normal text-text-muted ml-1">(purely for dating science)</span>
            </h3>
            <ul className="space-y-2">
              {user.redFlags.map((flag, idx) => (
                <li key={idx} className="text-sm text-red-400/90 bg-red-500/5 border border-red-500/10 rounded-xl px-3 py-2">
                  {flag}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

    </div>
  );
}
