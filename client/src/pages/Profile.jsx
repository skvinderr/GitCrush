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
      <div className="flex flex-col md:flex-row items-center gap-8 mb-12 bg-white border-4 border-black rounded-[2rem] shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] p-8 relative overflow-hidden">
        <img
          src={user.avatarUrl}
          alt={user.username}
          className="w-32 h-32 rounded-2xl border-4 border-black bg-white shadow-[4px_4px_0_rgba(0,0,0,1)] z-10"
        />

        <div className="flex-1 text-center md:text-left z-10 w-full">
          <h1 className="text-4xl font-black text-black mb-2 uppercase break-all">@{user.username}</h1>
          
          {/* Bio Section */}
          <div className="mb-4 relative">
            {isEditingBio ? (
              <div className="flex flex-col gap-2 max-w-lg mx-auto md:mx-0 mt-2">
                <textarea 
                  className="w-full bg-white border-4 border-black p-3 text-sm text-black font-bold focus:outline-none shadow-[4px_4px_0_rgba(0,0,0,1)] min-h-[100px]"
                  value={customBioText}
                  onChange={(e) => setCustomBioText(e.target.value)}
                  placeholder="Write your own catchy bio..."
                />
                <div className="flex gap-2 justify-end mt-2">
                  <button onClick={() => setIsEditingBio(false)} className="text-xs font-black text-black hover:text-brand-pink px-3 py-1 underline">Cancel</button>
                  <button onClick={handleSaveBio} className="btn-primary text-sm px-6 py-2 shadow-[2px_2px_0_rgba(0,0,0,1)] rounded-none">Save Bio</button>
                </div>
              </div>
            ) : (
              <div className="max-w-xl mx-auto md:mx-0 mt-2">
                <p className={`text-black font-bold text-base italic leading-relaxed border-l-4 border-brand-yellow pl-4 ${!bioExpanded && 'line-clamp-2'}`}>
                  "{user.customBio || user.aiBio || user.bio || "Still syncing a bio..."}"
                </p>
                <div className="flex items-center justify-center md:justify-start gap-4 mt-4">
                  {!user.customBio && user.aiBio && (
                     <span className="text-[10px] uppercase tracking-widest text-black font-black border-2 border-black bg-brand-yellow shadow-[2px_2px_0_rgba(0,0,0,1)] px-2 py-1">✨ AI Generated</span>
                  )}
                  {(user.customBio || user.aiBio) && (
                    <button onClick={() => setBioExpanded(!bioExpanded)} className="text-xs font-black text-brand-pink hover:text-black hover:underline uppercase">
                      {bioExpanded ? "Show less" : "Read more"}
                    </button>
                  )}
                  <button onClick={() => { setCustomBioText(user.customBio || user.aiBio || user.bio || ""); setIsEditingBio(true); }} className="text-xs font-black text-black hover:text-brand-pink underline uppercase">
                    {user.customBio ? "Edit Bio" : "Write my own"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Personality Badge */}
          {user.personalityType && (
            <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 border-2 border-black bg-brand-purple shadow-[2px_2px_0_rgba(0,0,0,1)] text-sm font-black text-black uppercase tracking-tight">
              <span>🎭</span>
              {user.personalityType}
            </div>
          )}
          
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm font-black text-black font-mono">
            <span className="flex items-center gap-1">📦 {user.repos} repos</span>
            <span className="flex items-center gap-1">👥 {user.followers} followers</span>
            <span className="flex items-center gap-1">⭐ {user.totalStars} total stars</span>
          </div>
        </div>

        <div className="flex flex-col gap-4 z-10 w-full sm:w-auto mt-6 md:mt-0 items-stretch">
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="btn-primary"
          >
            {isSyncing ? "Syncing..." : "🔄 Refresh Data"}
          </button>
          
          {(!user.customBio && user.bioRegenerations < 5) && (
            <button
              onClick={handleRegenerate}
              disabled={isRegenerating || isSyncing}
              className="px-6 py-3 border-4 border-black bg-brand-yellow font-black text-black shadow-[4px_4px_0_rgba(0,0,0,1)] hover:bg-white hover:translate-y-1 hover:translate-x-1 hover:shadow-none transition-all disabled:opacity-50 flex items-center justify-center gap-2 uppercase tracking-wide"
            >
              🪄 {isRegenerating ? "Generating..." : `Regenerate Bio (${5 - (user.bioRegenerations || 0)})`}
            </button>
          )}
        </div>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Experience Score */}
        <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 flex flex-col items-center justify-center text-center">
          <div className="text-black text-xs uppercase tracking-widest font-black mb-2">Exp Score</div>
          <div className="text-5xl font-black text-black">
            {user.experienceScore || 0}<span className="text-xl">/10</span>
          </div>
        </div>

        {/* Longest Streak */}
        <div className="bg-brand-yellow/30 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 flex flex-col items-center justify-center text-center">
          <div className="text-black text-xs uppercase tracking-widest font-black mb-2">Longest Streak</div>
          <div className="text-5xl font-black text-black">
            {user.longestStreak || 0} <span className="text-2xl text-brand-pink -rotate-12 inline-block">🔥</span>
          </div>
        </div>

        {/* Activity Pattern */}
        <div className="bg-brand-blue/30 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 flex flex-col items-center justify-center text-center">
          <div className="text-black text-xs uppercase tracking-widest font-black mb-2">Active Time</div>
          <div className="text-3xl font-black text-black capitalize mt-2">
            {user.commitPattern || "Unknown"}
            {user.commitPattern === "night" ? " 🦉" : " ☕"}
          </div>
        </div>

        {/* Current Streak */}
        <div className="bg-brand-green border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 flex flex-col items-center justify-center text-center">
          <div className="text-black text-xs uppercase tracking-widest font-black mb-2">Current Streak</div>
          <div className="text-5xl font-black text-black">
            {user.currentStreak || 0} <span className="text-2xl">⚡</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Languages */}
        <div className="bg-brand-yellow/30 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8">
          <h3 className="text-2xl font-black text-black mb-6 flex items-center gap-3 uppercase tracking-tight">
            <span className="text-black">{'</>'}</span> Top Languages
          </h3>
          <div className="space-y-6">
            {user.languages && user.languages.length > 0 ? (
              user.languages.map((lang, idx) => (
                <div key={idx} className="relative">
                  <div className="flex justify-between text-base mb-2">
                    <span className="font-black text-black uppercase tracking-wide">{lang.lang}</span>
                    <span className="text-black font-black font-mono">{lang.pct}%</span>
                  </div>
                  <div className="w-full h-3 border-2 border-black bg-white overflow-hidden shadow-[2px_2px_0_rgba(0,0,0,1)]">
                    <div className="h-full bg-brand-pink border-r-2 border-black" style={{ width: `${lang.pct}%` }} />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-black font-bold">No language data synced yet.</p>
            )}
          </div>
        </div>

        {/* Topics */}
        <div className="bg-brand-blue/30 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8">
          <h3 className="text-2xl font-black text-black mb-6 flex items-center gap-3 uppercase tracking-tight">
            <span className="text-black">#</span> Fav Topics
          </h3>
          <div className="flex flex-wrap gap-3">
            {user.topics && user.topics.length > 0 ? (
              user.topics.map((topic, idx) => (
                <span key={idx} className="tag-pill text-sm font-black text-black uppercase tracking-wider">
                  {topic}
                </span>
              ))
            ) : (
              <p className="text-black font-bold">No topics found on public repos.</p>
            )}
          </div>
        </div>
      </div>

      {/* Personality + Red Flags Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
        {/* Personality Card */}
        {user.personalityType && (
          <div className="bg-brand-peach border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8">
            <h3 className="text-2xl font-black text-black mb-4 flex items-center gap-3 uppercase tracking-tight">
              <span>🎭</span> Dev Archetype
            </h3>
            <p className="text-3xl font-black mb-4 text-black uppercase tracking-tighter">
              {user.personalityType}
            </p>
            <p className="text-black font-bold text-base leading-relaxed border-l-4 border-black pl-4">
              {user.personalityDesc}
            </p>
          </div>
        )}

        {/* Red Flags Card */}
        {user.redFlags && user.redFlags.length > 0 && (
          <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8">
            <h3 className="text-2xl font-black text-black mb-6 flex items-center gap-3 uppercase tracking-tight">
              <span>🚩</span> Red Flags
              <span className="text-xs font-bold text-black ml-2 uppercase">(For science)</span>
            </h3>
            <ul className="space-y-4">
              {user.redFlags.map((flag, idx) => (
                <li key={idx} className="text-base font-black text-white bg-red-500 border-4 border-black shadow-[4px_4px_0_rgba(0,0,0,1)] px-4 py-3 -rotate-1 hover:rotate-0 transition-transform cursor-default">
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
