function ComingSoonPage({ title, icon, desc }) {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4 text-center">
      {/* Glowing circle */}
      <div className="relative mb-8">
        <div className="absolute inset-0 rounded-full blur-2xl opacity-30 animate-pulse-slow"
             style={{ background: "radial-gradient(circle, #e91e8c 0%, transparent 70%)" }} />
        <div className="relative w-24 h-24 rounded-full glass-card border border-brand-pink/20 flex items-center justify-center text-5xl">
          {icon}
        </div>
      </div>

      <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-3">
        {title}
      </h1>
      <p className="text-text-secondary max-w-sm leading-relaxed text-sm mb-6">
        {desc}
      </p>

      {/* Status badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-brand-pink/20 bg-brand-pink/10 text-brand-pink text-xs font-mono">
        <span className="w-1.5 h-1.5 rounded-full bg-brand-pink animate-pulse" />
        Coming soon — we're cooking 👨‍🍳
      </div>
    </div>
  );
}

export default function Discover() {
  return (
    <ComingSoonPage
      icon="🔍"
      title="Discover"
      desc="Swipe-style dev discovery with GitHub-powered stack matching. Your perfect code partner is waiting."
    />
  );
}
