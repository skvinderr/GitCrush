export default function Matches() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4 text-center">
      <div className="relative mb-8">
        <div className="absolute inset-0 rounded-full blur-2xl opacity-30 animate-pulse-slow"
             style={{ background: "radial-gradient(circle, #a855f7 0%, transparent 70%)" }} />
        <div className="relative w-24 h-24 rounded-full glass-card border border-brand-purple-soft/20 flex items-center justify-center text-5xl">
          💞
        </div>
      </div>
      <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-3">Matches</h1>
      <p className="text-text-secondary max-w-sm leading-relaxed text-sm mb-6">
        All your mutual connections live here. See who swiped right on your commit history.
      </p>
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-brand-purple/20 bg-brand-purple/10 text-brand-purple-soft text-xs font-mono">
        <span className="w-1.5 h-1.5 rounded-full bg-brand-purple-soft animate-pulse" />
        Coming soon — we're cooking 👨‍🍳
      </div>
    </div>
  );
}
