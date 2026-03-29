const fs = require('fs');
const file = 'C:/Users/sciad/Git Tinder/client/src/pages/Discover.jsx';
let c = fs.readFileSync(file, 'utf8');

const replacement = unction TrendingDevs({ trending }) {
  const navigate = useNavigate();
  if (!trending || trending.length === 0) return null;

  return (
    <div className="absolute top-6 left-6 z-20 pointer-events-none flex flex-col gap-4 w-fit max-w-[200px] md:max-w-[240px]"> 
      <div className="flex flex-col gap-2">
        <h3 className="text-[10px] font-black text-black uppercase tracking-[0.2em] flex items-center gap-2 bg-brand-yellow w-fit px-2 py-1 border-2 border-black shadow-[2px_2px_0_rgba(0,0,0,1)]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-green opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-green"></span>
          </span>
          Active in the last hour
        </h3>
        <div className="grid grid-cols-5 gap-2 pb-2 pointer-events-auto">
          {trending.map((dev) => (
            <div
              key={dev.id}
              className="flex-shrink-0 group relative cursor-pointer"
              title={\@\ - \\}
              onClick={() => navigate(\/users/\\)}
            >
              <img
                src={dev.avatarUrl}
                className="w-10 h-10 md:w-11 md:h-11 rounded-full border-2 border-black shadow-[2px_2px_0_rgba(0,0,0,1)] group-hover:scale-110 transition-transform bg-white object-cover"
                alt={dev.username}
              />
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-brand-green rounded-full border-2 border-black" />
            </div>
          ))}
        </div>
      </div>

      <div className="pointer-events-auto z-50 relative mt-2">
        <SearchBar />
      </div>
    </div>
  );
}

  function MatchOverlay;

c = c.replace(/function TrendingDevs\(\{ trending \}\) \{[\s\S]*?function MatchOverlay/, replacement);
fs.writeFileSync(file, c);
console.log('REPLACED');
