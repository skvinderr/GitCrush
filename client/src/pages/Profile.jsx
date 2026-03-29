import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { SwipeCard } from "./Discover";

export default function Profile() {
  const { user: authUser, setUser } = useAuth();
  const { username } = useParams();
  const navigate = useNavigate();

  const isOwnProfile = !username || username === authUser?.username;
  const [profileData, setProfileData] = useState(null);
  const [isMatched, setIsMatched] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [savingField, setSavingField] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  useEffect(() => {
    if (isOwnProfile) {
      if (!authUser) { setLoading(false); return; }
      fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/me`, { credentials: "include" })
        .then((res) => res.json())
        .then((data) => {
          if (!data.error) {
            setProfileData(data);
            setUser(data);
          }
        })
        .finally(() => setLoading(false));
    } else {
      fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/users/${username}`, { credentials: "include" })
        .then((res) => res.json())
        .then((data) => {
          if (!data.error) {
            setProfileData(data.user);
            setIsMatched(data.isMatched);
          } else {
            console.error(data.error);
          }
        })
        .finally(() => setLoading(false));
    }
  }, [username, isOwnProfile, authUser]);

  const handleSyncGit = async () => {
    setSyncing(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/sync-profile`, {
        method: "POST",
        credentials: "include",
      });
      const updatedUser = await res.json();
      if (!updatedUser.error) {
        setProfileData((prev) => ({...prev, ...updatedUser}));
        setUser(updatedUser);
      }
    } catch(err) {
      console.error(err);
    }
    setSyncing(false);
  };

  const handleRegenBio = async () => {
    setSavingField('bio');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/regenerate-bio`, {
        method: "POST",
        credentials: "include",
      });
      const updatedUser = await res.json();
      if (!updatedUser.error) {
        setProfileData((prev) => ({...prev, ...updatedUser}));
        setUser(updatedUser);
      }
    } catch(err) { console.error(err); }
    setSavingField(null);
  };

  const updateProfile = async (updates) => {
    setSavingField(Object.keys(updates)[0]);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      const data = await res.json();
      if (!data.error) {
        setProfileData((prev) => ({ ...prev, ...updates }));
        setUser((prev) => ({ ...prev, ...updates }));
      }
    } catch (err) { console.error(err); }
    setSavingField(null);
  };

  const handleDelete = async () => {
    if (deleteConfirm !== authUser.username) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/me`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setUser(null);
        navigate("/");
      }
    } catch (e) { console.error(e); }
  };

  if (loading) return <div className="p-8 text-center text-xl font-mono">Loading Profile...</div>;
  if (!profileData) return <div className="p-8 text-center text-xl font-mono">Profile not found.</div>;

  if (!isOwnProfile) {
    return (
      <div className="relative flex justify-center items-center py-10 min-h-[calc(100vh-80px)] w-full max-w-md mx-auto">
        <SwipeCard 
          profile={profileData} 
          isFront={true} 
          zIndex={10} 
          onSwipe={async (direction, targetId) => {
            try {
              const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/swipe`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ targetUserId: targetId, direction }),
                credentials: "include",
              });
              const data = await res.json();
              if (data.match) {
                navigate('/matches');
              } else {
                navigate('/discover');
              }
            } catch(e) {
              console.error(e);
              navigate('/discover');
            }
          }}
        />
        {isMatched && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-brand-yellow text-black font-black px-6 py-2 border-4 border-black z-50 whitespace-nowrap shadow-[4px_4px_0_rgba(0,0,0,1)] -rotate-3 text-xl hover:rotate-0 transition-transform cursor-pointer" onClick={() => navigate('/matches')}>
            Already Matched! 💖
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 font-mono space-y-8 pb-32">
      {/* 1. HEADER */}
      <section className="bg-bg-dark border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row items-center gap-8">
        <div className="flex-shrink-0 relative">
          <img src={profileData.avatarUrl} alt="avatar" className="w-32 h-32 md:w-48 md:h-48 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-sm object-cover bg-brand-pink" />
          {profileData.totalStars > 100 && (
            <div className="absolute -top-4 -right-4 bg-brand-yellow text-black border-4 border-black px-2 py-1 font-black transform rotate-12 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              PRO
            </div>
          )}
        </div>
        
        <div className="flex-1 space-y-4 text-center md:text-left">
          <h1 className="text-4xl font-black text-brand-cyan">{profileData.username}</h1>
          <div className="text-slate-300 min-h-[60px]">
            {isOwnProfile ? (
              <textarea 
                className="w-full bg-black/50 border-2 border-slate-600 p-2 text-white disabled:opacity-50"
                value={profileData.customBio !== null ? profileData.customBio : profileData.aiBio || ""}
                onChange={(e) => setProfileData(prev => ({...prev, customBio: e.target.value}))}
                onBlur={(e) => updateProfile({ customBio: e.target.value })}
                placeholder="Write your custom bio..."
                rows={3}
              />
            ) : (
              <p className="p-2 border-l-4 border-brand-pink bg-black/50 italic text-sm">{profileData.customBio || profileData.aiBio}</p>
            )}
          </div>
          
          {isOwnProfile && (
            <div className="flex flex-wrap justify-center md:justify-start gap-4 pt-2">
              <button onClick={() => navigate('/discover')} className="bg-brand-cyan text-black px-4 py-2 font-bold border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
                Preview My Card
              </button>
              <button 
                onClick={handleSyncGit}
                disabled={syncing}
                className="bg-brand-pink text-black px-4 py-2 font-bold border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all disabled:opacity-50"
              >
                {syncing ? 'Syncing...' : 'Sync GitHub'}
              </button>
            </div>
          )}

          {!isOwnProfile && (
            <div className="pt-2">
              {isMatched ? (
                <div className="space-y-4">
                  <div className="bg-brand-yellow text-black px-4 py-2 font-black border-2 border-black inline-block shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    Matched! ??
                  </div>
                  <button onClick={() => navigate('/matches')} className="block bg-brand-cyan text-black px-6 py-2 font-bold border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
                    Open Chat
                  </button>
                </div>
              ) : (
                <button className="bg-brand-yellow text-black px-6 py-3 font-bold border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center gap-2">
                  <span>Send a Super Star ?</span>
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* 2. STATS */}
      {isOwnProfile && profileData.stats && (
        <section className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="bg-bg-dark border-4 border-black p-4 text-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <div className="text-4xl font-black text-brand-cyan">{profileData.profileViews}</div>
            <div className="text-sm uppercase font-bold text-slate-400 mt-2">Profile Views</div>
          </div>
          <div className="bg-bg-dark border-4 border-black p-4 text-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <div className="text-4xl font-black text-brand-pink">{profileData.stats.crushesReceived}</div>
            <div className="text-sm uppercase font-bold text-slate-400 mt-2">Total Crushes</div>
          </div>
          <div className="bg-bg-dark border-4 border-black p-4 text-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <div className="text-4xl font-black text-brand-yellow">{profileData.stats.totalMatches}</div>
            <div className="text-sm uppercase font-bold text-slate-400 mt-2">Total Matches</div>
          </div>
          <div className="bg-bg-dark border-4 border-black p-4 text-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <div className="text-4xl font-black text-green-400">{profileData.stats.matchRate}%</div>
            <div className="text-sm uppercase font-bold text-slate-400 mt-2">Match Rate</div>
          </div>
        </section>
      )}

      {/* 3. EDIT PROFILE (Only Own) */}
      {isOwnProfile && (
        <section className="bg-bg-dark border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-6">
          <div className="flex justify-between items-center bg-brand-yellow text-black px-4 py-2 border-2 border-black">
            <h2 className="text-2xl font-black">Edit Details</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-slate-400 font-bold mb-2">Intent (Looking for)</label>
              <select 
                multiple 
                className="w-full bg-black/50 border-2 border-slate-600 p-2 text-white h-32"
                value={profileData.intent || []}
                onChange={(e) => {
                  const vals = Array.from(e.target.selectedOptions, option => option.value);
                  setProfileData(p => ({...p, intent: vals}));
                }}
                onBlur={(e) => {
                  const vals = Array.from(e.target.selectedOptions, option => option.value);
                  updateProfile({ intent: vals });
                }}
              >
                <option value="Romantic">Romantic</option>
                <option value="Co-founder">Co-founder</option>
                <option value="Collaborator">Collaborator</option>
                <option value="Friendship">Friendship</option>
              </select>
              <p className="text-xs text-slate-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div>
                 <label className="block text-slate-400 font-bold mb-2">Experience Level Matching</label>
                 <select 
                   className="w-full bg-black/50 border-2 border-slate-600 p-2 text-white"
                   value={profileData.lookingFor || "Any"}
                   onChange={(e) => {
                     setProfileData(p => ({...p, lookingFor: e.target.value}));
                     updateProfile({ lookingFor: e.target.value });
                   }}
                 >
                   <option value="Any">Any</option>
                   <option value="Similar to me">Similar to me</option>
                   <option value="More experienced">More experienced</option>
                   <option value="Less experienced">Less experienced</option>
                 </select>
               </div>
               
               <div>
                  <label className="block text-slate-400 font-bold mb-2">Location</label>
                  <input type="text" 
                    className="w-full bg-black/50 border-2 border-slate-600 p-2 text-white" 
                    placeholder="Earth" 
                    value={profileData.location || ""}
                    onChange={(e) => setProfileData(p => ({...p, location: e.target.value}))}
                    onBlur={(e) => updateProfile({ location: e.target.value })}
                  />
               </div>

               <div>
                 <label className="block text-slate-400 font-bold mb-2">Age (Optional)</label>
                 <input type="number" 
                   className="w-full bg-black/50 border-2 border-slate-600 p-2 text-white" 
                   value={profileData.age || ""}
                   onChange={(e) => setProfileData(p => ({...p, age: parseInt(e.target.value) || null}))}
                   onBlur={(e) => updateProfile({ age: parseInt(e.target.value) || null })}
                 />
               </div>
            </div>

            <div className="pt-4 border-t-2 border-slate-800 flex justify-between items-center">
              <div>
                <p className="font-bold">Hide Profile</p>
                <p className="text-sm text-slate-500">Pause from appearing in discover</p>
              </div>
              <input type="checkbox" className="w-6 h-6 border-2 border-black accent-brand-pink cursor-pointer" 
                checked={profileData.isHidden} 
                onChange={() => updateProfile({ isHidden: !profileData.isHidden })}
              />
            </div>
          </div>
          
          <div className="pt-4 border-t-2 border-slate-800">
             <button 
                onClick={handleRegenBio} 
                className="w-full bg-brand-pink text-black px-4 py-3 font-bold border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all disabled:opacity-50 flex justify-center items-center gap-2"
                disabled={profileData.bioRegenerations >= 5 || savingField === 'bio'}
              >
               <span>Regenerate AI Bio</span>
               <span className="bg-black text-brand-pink px-2 py-0.5 rounded-sm text-xs">
                 {5 - (profileData.bioRegenerations || 0)} left
               </span>
             </button>
          </div>
        </section>
      )}

      {/* 4. REPO VISIBILITY (Only Own) */}
      {isOwnProfile && (
        <section className="bg-bg-dark border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex justify-between items-center bg-brand-cyan text-black px-4 py-2 border-2 border-black mb-6">
            <h2 className="text-2xl font-black">Repo Visibility</h2>
          </div>
          
          <div className="p-4 bg-black/50 border-2 border-brand-yellow mb-6">
            <p className="text-brand-yellow font-bold">Manage which repositories show up on your card.</p>
          </div>

          <div className="space-y-4">
            {(profileData.repos || []).length > 0 ? (
              profileData.repos.map((repo, idx) => (
                <div key={repo.id || idx} className="flex justify-between items-center p-4 border-2 border-slate-700 bg-black/50">
                  <div>
                    <h3 className="font-bold text-white">{repo.name}</h3>
                    <p className="text-sm text-slate-400">{repo.description || "No description"}</p>
                  </div>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <span className="text-sm text-slate-300">Visible</span>
                    <input 
                      type="checkbox"
                      className="w-5 h-5 border-2 border-black accent-brand-cyan"
                      checked={!repo.hidden}
                      onChange={async (e) => {
                        const hidden = !e.target.checked;
                        try {
                          const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/me/repo-visibility`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ repoId: repo.id || repo.name, hidden }),
                            credentials: "include",
                          });
                          const updated = await res.json();
                          if (!updated.error) {
                            setProfileData((prev) => ({ ...prev, repos: updated.repos }));
                            setUser((prev) => ({ ...prev, repos: updated.repos }));
                          }
                        } catch (err) { console.error(err); }
                      }}
                    />
                  </label>
                </div>
              ))
            ) : (
              <div className="text-slate-400 p-4 border-2 border-slate-700">
                Sync GitHub to display repositories here.
              </div>
            )}
          </div>
        </section>
      )}

      {/* 5. DANGER ZONE (Only Own) */}
      {isOwnProfile && (
        <section className="border-4 border-red-500 p-8 shadow-[8px_8px_0px_0px_rgba(239,68,68,1)] bg-black/50">
          <h2 className="text-2xl font-black text-red-500 mb-4 bg-red-950/50 inline-block px-2 border-2 border-red-500">Danger Zone</h2>
          <p className="text-slate-300 mb-6 font-bold">Deleting your account is permanent. All matches, messages, and swipes will be destroyed.</p>
          
          <div className="bg-red-950/20 p-4 border-2 border-red-900 flex flex-col gap-4">
            <label className="text-sm text-red-400 uppercase font-black">Type your username to confirm</label>
            <input 
              type="text" 
              className="bg-black border-2 border-red-500 p-3 text-white font-bold outline-none focus:border-red-400"
              placeholder={authUser.username}
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
            />
            <button 
              onClick={handleDelete}
              disabled={deleteConfirm !== authUser.username}
              className="w-full bg-red-600 text-white font-black py-4 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              NUKE ACCOUNT
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
