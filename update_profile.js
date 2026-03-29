const fs = require('fs');
const file = 'C:/Users/sciad/Git Tinder/client/src/pages/Profile.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'import { useAuth } from "../context/AuthContext";',
  'import { useAuth } from "../context/AuthContext";\nimport { SwipeCard } from "./Discover";'
);

const newRender =   if (loading) return <div className="p-8 text-center text-xl font-mono">Loading Profile...</div>;
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
              const res = await fetch(\\/api/swipe\, {
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
            Already Matched! ??
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 font-mono space-y-8 pb-32">;

content = content.replace(/  if \(loading\).*?return \(\s*<div className="max-w-4xl mx-auto p-6 font-mono space-y-8 pb-32">/s, newRender);

fs.writeFileSync(file, content, 'utf8');
console.log("Replaced Profile.jsx rendering");
