import { useState, useEffect } from "react";

const MESSAGES = [
  "Fetching your public repositories...",
  "Analyzing your commit history...",
  "Counting your stars...",
  "Running algorithms on your tech stack...",
  "Judging your README quality...",
  "Checking your space vs tabs preference...",
  "Evaluating your merge conflict survival rate...",
  "Looking for rogue console.logs...",
  "Finalizing your GitCrush profile...",
];

export default function SyncLoader({ onComplete }) {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    // Cycle messages every 2.5 seconds
    const interval = setInterval(() => {
      setMsgIndex((prev) => Math.min(prev + 1, MESSAGES.length - 1));
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg-base">
      <div className="relative mb-12">
        <div className="absolute inset-0 rounded-full blur-3xl opacity-40 animate-pulse-slow"
             style={{ background: "radial-gradient(circle, #e91e8c 0%, transparent 70%)" }} />
        
        {/* Spinning orb */}
        <div className="relative w-32 h-32 rounded-full border-2 border-brand-pink/20 border-t-brand-pink animate-spin flex items-center justify-center">
          <div className="w-24 h-24 rounded-full border-2 border-brand-purple/20 border-b-brand-purple animate-spin" style={{ animationDirection: "reverse", animationDuration: "3s" }}></div>
        </div>
        
        {/* Heart icon in center */}
        <div className="absolute inset-0 flex items-center justify-center text-4xl animate-pulse">
          💘
        </div>
      </div>

      <h2 className="text-2xl sm:text-3xl font-bold text-text-primary mb-4 animate-fade-up">
        Syncing your GitHub Profile
      </h2>
      
      <div className="h-8 overflow-hidden relative w-full max-w-md text-center">
        {MESSAGES.map((msg, idx) => (
          <p
            key={idx}
            className={`absolute w-full text-text-secondary transition-all duration-500 ${
              idx === msgIndex ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            {msg}
          </p>
        ))}
      </div>
      
      <div className="mt-8 w-64 h-1.5 bg-bg-card rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-brand-pink to-brand-purple transition-all duration-1000 ease-out"
          style={{ width: `${Math.min(100, (msgIndex + 1) * (100 / MESSAGES.length))}%` }}
        />
      </div>
    </div>
  );
}
