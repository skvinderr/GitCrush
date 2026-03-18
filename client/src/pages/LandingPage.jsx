import { useEffect, useRef } from "react";

const FEATURES = [
  {
    icon: "⚡",
    title: "Match by Tech Stack",
    desc: "Connect with devs who actually know the tools you live in. TypeScript crushes find TypeScript crushes.",
    tags: ["React", "Rust", "Go", "Python"],
    color: "from-brand-pink/20 to-transparent",
    border: "hover:border-brand-pink/30",
  },
  {
    icon: "🧬",
    title: "Compatibility Score",
    desc: "Our algorithm analyses your GitHub activity, commit patterns, and repo vibes to find your perfect match.",
    tags: ["98% match", "Open source", "Night owl"],
    color: "from-brand-purple/20 to-transparent",
    border: "hover:border-brand-purple/30",
  },
  {
    icon: "🛰️",
    title: "Code Together",
    desc: "Spin up a shared coding session, pair-program, or just review each other's PRs. Love in every commit.",
    tags: ["Live share", "Code review", "Co-author"],
    color: "from-sky-500/15 to-transparent",
    border: "hover:border-sky-500/30",
  },
];

function FeatureCard({ icon, title, desc, tags, color, border, delay }) {
  return (
    <div
      className={`glass-card p-6 flex flex-col gap-4 border border-bg-border ${border} transition-all duration-300 hover:-translate-y-1 group`}
      style={{ animationDelay: delay }}
    >
      {/* Icon bg */}
      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center text-2xl border border-bg-border`}>
        {icon}
      </div>

      <div>
        <h3 className="text-base font-semibold text-text-primary mb-1">{title}</h3>
        <p className="text-sm text-text-secondary leading-relaxed">{desc}</p>
      </div>

      <div className="flex flex-wrap gap-2 mt-auto">
        {tags.map((tag) => (
          <span key={tag} className="tag-pill">{tag}</span>
        ))}
      </div>
    </div>
  );
}

function AnimatedOrb({ className, color, size, delay }) {
  return (
    <div
      className={`absolute rounded-full blur-3xl opacity-20 animate-pulse-slow pointer-events-none ${className}`}
      style={{
        background: color,
        width: size,
        height: size,
        animationDelay: delay,
      }}
    />
  );
}

export default function LandingPage() {
  const heroRef = useRef(null);

  // Subtle parallax on mouse move
  useEffect(() => {
    const handleMove = (e) => {
      if (!heroRef.current) return;
      const x = (e.clientX / window.innerWidth  - 0.5) * 20;
      const y = (e.clientY / window.innerHeight - 0.5) * 10;
      heroRef.current.style.setProperty("--mouse-x", `${x}px`);
      heroRef.current.style.setProperty("--mouse-y", `${y}px`);
    };
    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  return (
    <div className="min-h-screen flex flex-col" ref={heroRef}>
      {/* ── HERO ──────────────────────────────────────────────────── */}
      <section className="relative flex-1 flex flex-col items-center justify-center px-4 pt-24 pb-20 overflow-hidden text-center">
        {/* Background orbs */}
        <AnimatedOrb className="-top-20 left-1/2 -translate-x-1/2" color="#e91e8c" size="600px" delay="0s" />
        <AnimatedOrb className="top-1/2 -right-32"                  color="#7c3aed" size="400px" delay="1.5s" />
        <AnimatedOrb className="bottom-0 left-0"                    color="#e91e8c" size="300px" delay="3s"   />

        {/* Badge */}
        <div className="mb-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-brand-pink/30 bg-brand-pink/10 text-brand-pink text-sm font-medium animate-fade-up">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-pink animate-pulse" />
          Now in beta — join early
        </div>

        {/* Headline */}
        <h1
          className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[1.08] animate-fade-up"
          style={{ animationDelay: "0.1s" }}
        >
          <span className="block text-text-primary">Git</span>
          <span
            className="block"
            style={{
              background: "linear-gradient(135deg, #e91e8c 0%, #a855f7 50%, #e91e8c 100%)",
              backgroundSize: "200% auto",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              animation: "shimmer 3s linear infinite",
            }}
          >
            Crush
          </span>
        </h1>

        {/* Sub-headline */}
        <p
          className="mt-4 max-w-xl text-lg sm:text-xl text-text-secondary leading-relaxed animate-fade-up"
          style={{ animationDelay: "0.2s" }}
        >
          Where developers fall in love.
          <br />
          <span className="text-text-muted text-base">
            Match with devs who share your stack, your schedule, and your spacing preferences.
          </span>
        </p>

        {/* CTA Button */}
        <div className="mt-10 animate-fade-up" style={{ animationDelay: "0.3s" }}>
          <a href="http://localhost:5000/auth/github" className="btn-primary text-lg px-10 py-4">
            <span>
              <svg className="inline-block w-5 h-5 mr-2 -mt-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
              </svg>
              Login with GitHub
            </span>
          </a>
        </div>

        {/* Social proof mini-bar */}
        <div className="mt-8 flex items-center gap-3 text-text-muted text-sm animate-fade-up" style={{ animationDelay: "0.4s" }}>
          <div className="flex -space-x-2">
            {["🧑‍💻","👩‍💻","🧑‍💻","👩‍💻","🧑‍💻"].map((e, i) => (
              <div key={i} className="w-7 h-7 rounded-full bg-bg-card border border-bg-border flex items-center justify-center text-sm">
                {e}
              </div>
            ))}
          </div>
          <span>2,400+ devs already crushing</span>
        </div>
      </section>

      {/* ── FEATURE CARDS ──────────────────────────────────────────── */}
      <section className="px-4 pb-24 max-w-6xl mx-auto w-full">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-text-primary">
            Built for developers, <span className="text-brand-pink">by developers</span>
          </h2>
          <p className="mt-2 text-text-secondary text-sm">
            Not another swipe app. A real dev connection platform.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <FeatureCard key={f.title} {...f} delay={`${i * 0.1}s`} />
          ))}
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────── */}
      <footer className="border-t border-bg-border py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-text-muted">
          <div className="flex items-center gap-2">
            <span>💘</span>
            <span className="font-semibold text-text-secondary">GitCrush</span>
          </div>
          <p className="font-mono text-xs tracking-wide">
            Built for devs, by devs.{" "}
            <span className="text-brand-pink font-medium">Dark mode only.</span>
          </p>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-text-primary transition-colors">Privacy</a>
            <a href="#" className="hover:text-text-primary transition-colors">Terms</a>
            <a href="https://github.com" className="hover:text-text-primary transition-colors">GitHub ↗</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
