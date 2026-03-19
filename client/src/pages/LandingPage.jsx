import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// --- Fake Data for the Marquee ---
const MARQUEE_MESSAGES = [
  "React dev ❤️ Node.js dev — 2,400+ couples coding together",
  "“We met on GitCrush and shipped our startup 3 months later.”",
  "No more matching with people who use 2 spaces instead of 4.",
  "Found my co-founder and my soulmate in one swipe.",
  "“He centered my div on the first date.”",
  "Vim users matching with Vim users. True love.",
];

// --- Fake Data for the 3D Swipe Demo ---
const DEMO_PROFILES = [
  { id: 1, name: "frontend_fairy", avatar: "https://avatars.githubusercontent.com/u/101?v=4", lang: "React", pct: "98%" },
  { id: 2, name: "backend_bear", avatar: "https://avatars.githubusercontent.com/u/102?v=4", lang: "Rust", pct: "92%" },
  { id: 3, name: "solidity_bro", avatar: "https://avatars.githubusercontent.com/u/104?v=4", lang: "Solidity", pct: "14%" },
];

const FEATURES = [
  {
    icon: "⚡",
    title: "Match by Tech Stack",
    desc: "Connect with devs who actually know the tools you live in. TypeScript crushes find TypeScript crushes.",
    tags: ["React", "Rust", "Go", "Python"],
    color: "from-brand-pink/20 to-brand-pink/5",
    border: "group-hover:border-brand-pink/50",
    shadow: "group-hover:shadow-[0_0_30px_rgba(233,30,140,0.2)]"
  },
  {
    icon: "🧬",
    title: "Compatibility Engine",
    desc: "Our algorithm analyses your Hub activity, commit patterns, and repo vibes to find your perfect match.",
    tags: ["98% match", "Open source", "Night owl"],
    color: "from-brand-purple/20 to-brand-purple/5",
    border: "group-hover:border-brand-purple/50",
    shadow: "group-hover:shadow-[0_0_30px_rgba(124,58,237,0.2)]"
  },
  {
    icon: "🛰️",
    title: "Code Together",
    desc: "Spin up a shared coding session, pair-program, or just review each other's PRs. Love in every commit.",
    tags: ["Live share", "Code review", "Co-author"],
    color: "from-sky-500/20 to-sky-500/5",
    border: "group-hover:border-sky-500/50",
    shadow: "group-hover:shadow-[0_0_30px_rgba(14,165,233,0.2)]"
  },
];

// --- Components ---

function ParticleBackground() {
  // Generate random static particles
  const particles = Array.from({ length: 20 }).map((_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 4 + 1,
    duration: Math.random() * 20 + 10,
    delay: Math.random() * 5,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      <div className="absolute top-1/4 -left-32 w-[600px] h-[600px] bg-brand-pink/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-brand-purple/10 rounded-full blur-[100px]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[300px] bg-sky-500/5 rounded-[100%] blur-[100px] rotate-45" />

      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-white/10"
          style={{ width: p.size, height: p.size, left: `${p.x}%`, top: `${p.y}%` }}
          animate={{
            y: [0, -50, 0],
            opacity: [0.2, 0.8, 0.2],
          }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "linear" }}
        />
      ))}
    </div>
  );
}

function DemoSwipeCard({ profile, index }) {
  // Auto swipe right animation for the top card
  const isTop = index === DEMO_PROFILES.length - 1;
  const isSecond = index === DEMO_PROFILES.length - 2;

  // The cards cycle through array positions.
  // We use keyframes to simulate exactly what happens when a user swipes.

  return (
    <motion.div
      className="absolute w-64 h-80 bg-bg-card border border-bg-border rounded-3xl shadow-2xl flex flex-col overflow-hidden"
      initial={{ scale: isTop ? 1 : 0.9, y: isTop ? 0 : 20, rotate: isTop ? 0 : -5, opacity: 0 }}
      animate={
        isTop
          ? {
              x: [0, 5, 0, 300],
              y: [0, 0, 0, 100],
              rotate: [0, -2, 0, 25],
              opacity: [1, 1, 1, 0],
              scale: 1
            }
          : isSecond
          ? {
              scale: [0.9, 0.9, 0.9, 1],
              y: [20, 20, 20, 0],
              rotate: [-5, -5, -5, 0],
              opacity: 1
            }
          : { opacity: 0 }
      }
      transition={{
        duration: 3,
        times: [0, 0.2, 0.8, 1],
        ease: "easeInOut",
        repeat: Infinity,
        repeatDelay: 0.5
      }}
      style={{ zIndex: index }}
    >
      <div className="h-32 bg-bg-base relative flex items-end justify-center pb-4">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-pink/20 to-brand-purple/20" />
        <img src={profile.avatar} alt="avatar" className="w-16 h-16 rounded-full border-2 border-bg-card relative z-10 shadow-lg translate-y-8" />
      </div>
      <div className="flex-1 px-4 pt-10 pb-4 text-center">
        <h3 className="font-bold text-text-primary text-lg">@{profile.name}</h3>
        <p className="text-xs text-text-muted mt-1 font-mono">Top Lang: {profile.lang}</p>
        
        <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          {profile.pct} Match
        </div>
      </div>
      
      {/* Fake action buttons */}
      <div className="border-t border-bg-border p-3 flex justify-around bg-bg-base/50">
        <div className="w-8 h-8 rounded-full bg-bg-card border border-bg-border flex items-center justify-center text-red-500 text-xs">✕</div>
        <div className="w-8 h-8 rounded-full bg-bg-card border border-bg-border flex items-center justify-center text-green-500 text-xs shadow-[0_0_10px_rgba(34,197,94,0.3)]">❤️</div>
      </div>
    </motion.div>
  );
}

function Marquee() {
  return (
    <div className="w-full overflow-hidden bg-bg-card border-y border-bg-border py-3 flex relative z-10">
      <motion.div
        className="flex whitespace-nowrap gap-8 px-4 items-center"
        animate={{ x: [0, -2000] }}
        transition={{ repeat: Infinity, ease: "linear", duration: 40 }}
      >
        {[...MARQUEE_MESSAGES, ...MARQUEE_MESSAGES, ...MARQUEE_MESSAGES].map((msg, idx) => (
          <span key={idx} className="text-sm font-mono text-text-muted flex items-center gap-4">
            <span>{msg}</span>
            <span className="text-brand-pink/50">✦</span>
          </span>
        ))}
      </motion.div>
    </div>
  );
}

export default function LandingPage() {
  const [demoProfiles, setDemoProfiles] = useState(DEMO_PROFILES);

  // Cycle demo profiles so the animation loops nicely
  useEffect(() => {
    const int = setInterval(() => {
      setDemoProfiles(prev => {
        const next = [...prev];
        const top = next.pop(); // remove top card
        next.unshift(top); // put it at bottom
        return next;
      });
    }, 3500); // 3s animation + 0.5s pause
    return () => clearInterval(int);
  }, []);

  const handleLogin = () => {
    window.location.href = "http://localhost:5000/auth/github";
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col bg-bg-base relative w-full overflow-hidden font-sans">
      <ParticleBackground />

      {/* --- HERO SECTION --- */}
      <div className="flex-1 flex flex-col lg:flex-row items-center justify-between px-6 lg:px-20 max-w-7xl mx-auto w-full pt-12 lg:pt-0 relative z-10">
        
        {/* Left: Text & CTA */}
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex-1 text-center lg:text-left pt-12 lg:pt-0 max-w-2xl"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-brand-pink/30 bg-brand-pink/10 text-brand-pink text-xs font-bold tracking-widest uppercase mb-6 shadow-[0_0_15px_rgba(233,30,140,0.2)]">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-pink animate-pulse" />
            Now in beta v1.0
          </div>
          
          <h1 className="text-5xl lg:text-7xl font-black text-white leading-[1.1] mb-6 tracking-tight">
            Stop merging <br className="hidden lg:block"/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-pink to-brand-purple">
               Code Alone.
            </span>
          </h1>
          
          <p className="text-lg lg:text-xl text-text-secondary leading-relaxed mb-10 max-w-xl mx-auto lg:mx-0">
            The first dating and networking app built purely for open-source developers. 
            Match with devs who share your tech stack, your coding schedule, and your indentation preferences.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-5 justify-center lg:justify-start">
            <button 
              onClick={handleLogin}
              className="relative group px-8 py-4 rounded-full bg-white text-bg-base font-bold text-lg flex items-center justify-center gap-3 overflow-hidden shadow-[0_0_30px_rgba(255,255,255,0.15)] hover:shadow-[0_0_40px_rgba(233,30,140,0.4)] transition-all"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-brand-pink to-brand-purple opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <svg className="w-6 h-6 relative z-10 group-hover:fill-white fill-bg-base transition-colors" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              <span className="relative z-10 group-hover:text-white transition-colors">Start Swiping via GitHub</span>
            </button>
            <div className="flex items-center gap-3">
              <div className="flex -space-x-3">
                {["https://avatars.githubusercontent.com/u/101?v=4", "https://avatars.githubusercontent.com/u/102?v=4", "https://avatars.githubusercontent.com/u/103?v=4", "https://avatars.githubusercontent.com/u/104?v=4"].map((img, i) => (
                   <img key={i} src={img} className="w-8 h-8 rounded-full border-2 border-bg-base z-10 relative object-cover grayscale opacity-80" alt="dev" />
                ))}
              </div>
              <div className="text-xs text-text-muted font-mono leading-tight">
                <strong className="text-white block">2,400+ devs</strong>
                already synced
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right: 3D Auto-Playing Demo */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="hidden lg:flex flex-1 items-center justify-center relative w-full h-[500px]"
        >
          {/* Decorative rings */}
          <div className="absolute w-[400px] h-[400px] border border-bg-border/50 rounded-full animate-[spin_20s_linear_infinite]" />
          <div className="absolute w-[300px] h-[300px] border border-brand-pink/20 rounded-full animate-[spin_15s_linear_infinite_reverse]" />
          
          <div className="relative w-64 h-80 flex items-center justify-center">
             {demoProfiles.map((p, i) => (
                <DemoSwipeCard key={p.id} profile={p} index={i} />
             ))}
          </div>
        </motion.div>
      </div>

      <Marquee />

      {/* --- FEATURES GRID --- */}
      <section className="relative w-full px-6 py-24 max-w-7xl mx-auto z-10">
        <div className="text-center mb-16">
           <h2 className="text-3xl md:text-5xl font-black text-white mb-4">Built for developers,<br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-pink to-brand-purple">by developers.</span></h2>
           <p className="text-text-secondary">Not another superficial swipe app. A real connection platform based on actual code.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {FEATURES.map((feat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              whileHover={{ y: -5, scale: 1.02 }}
              className={`group overflow-hidden rounded-3xl bg-bg-card/40 backdrop-blur-xl border border-bg-border ${feat.border} ${feat.shadow} transition-all duration-300 p-8 flex flex-col`}
            >
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feat.color} flex items-center justify-center text-3xl mb-6 border border-white/5`}>
                {feat.icon}
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{feat.title}</h3>
              <p className="text-text-secondary leading-relaxed mb-6 flex-1 text-sm">{feat.desc}</p>
              
              <div className="flex flex-wrap gap-2">
                {feat.tags.map(t => (
                  <span key={t} className="px-3 py-1 rounded-full bg-bg-base/80 border border-bg-border text-[11px] font-mono text-text-muted group-hover:text-text-primary transition-colors">
                    {t}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="w-full text-center py-8 border-t border-bg-border/50 bg-bg-base/80 backdrop-blur-md relative z-10">
        <p className="text-text-muted text-sm font-mono flex items-center justify-center gap-2">
           Crafted with <span className="text-brand-pink animate-pulse">❤️</span> by <a href="#" className="hover:text-white transition-colors">skvinderr</a> &bull; Dark mode only.
        </p>
      </footer>
    </div>
  );
}
