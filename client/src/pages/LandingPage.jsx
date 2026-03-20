import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// --- Fake Data for Testimonials ---
const TESTIMONIALS = [
  {
    quote: "GitCrush's genetic algorithm really made the difference — I felt like I got a good sense of a dev's vibe from their commit history, and it was easy to jump right into a pair programming session.",
    author: "Helena Ann",
    role: "Senior Frontend Engineer"
  },
  {
    quote: "No more matching with people who use 2 spaces instead of 4. Found my co-founder and my soulmate in one swipe. Highly recommend the Date Repos feature.",
    author: "David Stack",
    role: "Fullstack Developer"
  },
  {
    quote: "He centered my div on the first date. We just launched our first open source project together from the Hall of Merges.",
    author: "Sarah CSS",
    role: "UI/UX Designer"
  }
];

const HOW_IT_WORKS = [
  { step: "1", title: "Authenticate", desc: "Log in with GitHub. We instantly fetch your top languages, repos, and commit patterns.", color: "bg-brand-blue" },
  { step: "2", title: "Analyze", desc: "Our proprietary MatchEngine analyzes thousands of data points to find your genetic coding twin.", color: "bg-brand-yellow" },
  { step: "3", title: "Connect", desc: "Swipe right on developers who share your tech stack and coding philosophies.", color: "bg-brand-green" },
  { step: "4", title: "Collab", desc: "Spin up a shared 'Date Repo' to build something incredible together.", color: "bg-brand-purple" },
];

export default function LandingPage() {
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  const handleLogin = () => {
    window.location.href = "http://localhost:5000/auth/github";
  };

  const nextTestimonial = () => {
    setActiveTestimonial((prev) => (prev + 1) % TESTIMONIALS.length);
  };
  const prevTestimonial = () => {
    setActiveTestimonial((prev) => (prev - 1 + TESTIMONIALS.length) % TESTIMONIALS.length);
  };

  return (
    <div className="bg-bg-base min-h-screen text-black overflow-hidden font-sans">
      
      {/* ─── HEADER / NAV ─── */}
      <header className="w-full bg-white border-b-4 border-black px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-8">
          <div className="text-3xl font-black tracking-tighter uppercase flex items-center gap-2">
            <span className="text-brand-pink drop-shadow-[2px_2px_0_rgba(0,0,0,1)]">Git</span>
            Crush
          </div>
          <nav className="hidden md:flex items-center gap-6 font-bold text-sm">
            <a href="#how" className="hover:underline decoration-2 underline-offset-4">How it works</a>
            <a href="#testimonials" className="hover:underline decoration-2 underline-offset-4">Success Stories</a>
          </nav>
        </div>
        <div className="flex gap-4">
          <button onClick={handleLogin} className="hidden sm:block px-6 py-2 font-black border-2 border-black bg-white hover:bg-brand-yellow shadow-brutal transition-transform active:translate-y-1 active:translate-x-1 active:shadow-none">
            Log In
          </button>
          <button onClick={handleLogin} className="px-6 py-2 font-black border-2 border-black bg-brand-pink text-black shadow-brutal transition-transform hover:bg-brand-yellow active:translate-y-1 active:translate-x-1 active:shadow-none">
            Sign Up
          </button>
        </div>
      </header>

      {/* ─── HERO SECTION ─── */}
      <section className="relative w-full max-w-7xl mx-auto px-6 py-20 lg:py-32 flex flex-col items-center text-center">
        {/* Decorative Floating Elements */}
        <motion.div animate={{ y: [0, -20, 0] }} transition={{ repeat: Infinity, duration: 4 }} className="absolute top-10 left-[10%] w-20 h-20 bg-brand-yellow border-4 border-black shadow-brutal rotate-12 flex items-center justify-center text-3xl z-0 hidden lg:flex">✨</motion.div>
        <motion.div animate={{ y: [0, 20, 0] }} transition={{ repeat: Infinity, duration: 5 }} className="absolute bottom-20 left-[5%] w-16 h-16 bg-brand-blue border-4 border-black shadow-brutal -rotate-12 flex items-center justify-center text-2xl z-0 hidden lg:flex">💻</motion.div>
        <motion.div animate={{ y: [0, -15, 0], rotate: [0, 45, 0] }} transition={{ repeat: Infinity, duration: 6 }} className="absolute top-32 right-[10%] w-24 h-24 rounded-full bg-brand-pink border-4 border-black shadow-brutal flex items-center justify-center text-4xl z-0 hidden lg:flex">💖</motion.div>

        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black leading-tight tracking-tighter max-w-5xl relative z-10 mb-6">
          Find Your <span className="text-brand-pink drop-shadow-[4px_4px_0_rgba(0,0,0,1)]">Perfect Match</span> in the Terminal.
        </h1>
        <p className="text-lg md:text-xl font-bold text-text-secondary max-w-2xl mb-10 border-l-4 border-brand-yellow pl-4 text-left mx-auto">
          We're committed to helping developers find love every day. Our genetic algorithm matches you based on your GitHub commits, tech stack, and coding philosophies.
        </p>
        
        <button onClick={handleLogin} className="btn-primary text-xl px-12 py-5 z-10 relative">
          Join GitCrush ❤️
        </button>

        {/* Hero Illustration */}
        <div className="w-full max-w-5xl mt-24 relative flex justify-center items-end">
          {/* Heart Graphic */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 md:w-96 md:h-96 bg-brand-pink/20 rounded-full border-4 border-black shadow-brutal flex items-center justify-center -z-10">
            <div className="w-40 h-40 bg-white border-4 border-black rounded-3xl rotate-12 shadow-brutal flex items-center justify-center text-6xl">❤️‍🔥</div>
          </div>
          
          {/* Avatar Cards */}
          <motion.div 
            initial={{ x: -100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ type: "spring", bounce: 0.5 }}
            className="w-48 md:w-64 bg-brand-green border-4 border-black shadow-brutal p-4 rounded-2xl mr-auto sm:mr-32 -rotate-6 z-10 hidden sm:block">
            <div className="w-full aspect-square bg-white border-2 border-black rounded-xl mb-4 overflow-hidden">
               <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="avatar" className="w-full h-full object-cover" />
            </div>
            <h3 className="font-black text-xl">@FrontendFelix</h3>
            <p className="font-bold text-sm opacity-80 mt-1">Loves React & Tailwind</p>
          </motion.div>

          <motion.div 
            initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
            className="w-48 md:w-64 bg-brand-blue border-4 border-black shadow-brutal p-4 rounded-2xl ml-auto sm:ml-32 rotate-6 z-10 hidden sm:block mt-12">
             <div className="w-full aspect-square bg-white border-2 border-black rounded-xl mb-4 overflow-hidden">
               <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Mia" alt="avatar" className="w-full h-full object-cover" />
            </div>
            <h3 className="font-black text-xl">@BackendMia</h3>
            <p className="font-bold text-sm opacity-80 mt-1">Rust & Postgres Evangelist</p>
          </motion.div>
        </div>
      </section>

      {/* ─── HOW SECTION ─── */}
      <section id="how" className="w-full border-t-4 border-black bg-brand-yellow/10">
        <div className="max-w-7xl mx-auto px-6 py-24 flex flex-col lg:flex-row items-center gap-16">
          <div className="lg:w-1/3">
            <h2 className="text-5xl font-black mb-4">How Our App <span className="text-brand-pink border-b-4 border-black">Work?</span></h2>
            <p className="font-bold text-lg mb-8">We parse your GitHub data to find singles whose `package.json` perfectly aligns with yours. Stop swiping on faces, start swiping on code.</p>
            <div className="w-24 h-24 rounded-full bg-brand-blue border-4 border-black shadow-brutal flex items-center justify-center text-4xl mt-8">⚙️</div>
          </div>
          <div className="lg:w-2/3 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {HOW_IT_WORKS.map((item, idx) => (
              <motion.div 
                whileHover={{ scale: 1.05 }}
                key={idx} 
                className={`p-8 border-4 border-black shadow-brutal ${item.color} ${idx % 2 !== 0 ? 'sm:mt-12' : ''}`}
              >
                <div className="w-10 h-10 rounded-full bg-white border-2 border-black font-black flex items-center justify-center text-lg mb-4 shadow-[2px_2px_0_1px_rgba(0,0,0,1)]">
                  {item.step}
                </div>
                <h3 className="text-2xl font-black mb-2">{item.title}</h3>
                <p className="font-bold text-sm">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ─── */}
      <section id="testimonials" className="w-full border-t-4 border-black bg-white py-24 px-6 overflow-hidden relative">
         <div className="absolute top-0 right-0 w-64 h-64 bg-brand-pink rounded-full blur-[100px] opacity-30 pointer-events-none" />
         
         <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-16">
            <div className="md:w-1/2">
              <h2 className="text-5xl font-black mb-12 relative inline-block">
                What Our <span className="text-brand-pink">Users Say</span>
                <span className="absolute -top-6 -right-10 text-brand-yellow text-4xl animate-spin-slow">❉</span>
              </h2>

              <AnimatePresence mode="wait">
                <motion.div 
                  key={activeTestimonial}
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                  className="mb-8"
                >
                  <p className="text-2xl md:text-3xl font-bold leading-snug italic relative">
                    <span className="text-brand-pink text-6xl absolute -top-8 -left-8 opacity-50 font-serif">“</span>
                    {TESTIMONIALS[activeTestimonial].quote}
                  </p>
                  <div className="mt-8 border-l-4 border-brand-purple pl-4">
                    <h4 className="font-black text-brand-purple text-lg">{TESTIMONIALS[activeTestimonial].author}</h4>
                    <p className="font-bold text-text-muted text-sm">{TESTIMONIALS[activeTestimonial].role}</p>
                  </div>
                </motion.div>
              </AnimatePresence>

              <div className="flex gap-4 mt-8">
                <button onClick={prevTestimonial} className="w-12 h-12 rounded-full border-2 border-black bg-white flex items-center justify-center font-black shadow-brutal hover:bg-brand-blue active:translate-y-1 active:shadow-none">&larr;</button>
                <button onClick={nextTestimonial} className="w-12 h-12 rounded-full border-2 border-black bg-white flex items-center justify-center font-black shadow-brutal hover:bg-brand-pink active:translate-y-1 active:shadow-none">&rarr;</button>
              </div>
            </div>

            <div className="md:w-1/2 flex justify-center mt-12 md:mt-0 relative">
               {/* 3D Illustration / Asset replacement */}
               <div className="w-72 h-[400px] bg-brand-purple border-4 border-black shadow-brutal rounded-t-full flex items-center justify-center flex-col p-8 relative overflow-hidden">
                 <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                 <div className="w-32 h-32 bg-brand-yellow rounded-full border-4 border-black shadow-brutal mb-8 flex items-center justify-center text-6xl rotate-12 z-10">👍</div>
                 <div className="w-full h-32 bg-white border-2 border-black shadow-brutal rounded-2xl p-4 flex flex-col gap-2 z-10">
                    <div className="h-4 w-3/4 bg-gray-200 rounded-full" />
                    <div className="h-4 w-1/2 bg-gray-200 rounded-full" />
                    <div className="h-4 w-full bg-brand-pink rounded-full mt-4" />
                 </div>
               </div>
            </div>
         </div>
      </section>

      {/* ─── FOOTER CTA ─── */}
      <section className="w-full border-t-4 border-black bg-brand-pink p-12 text-center relative overflow-hidden">
        <div className="absolute top-10 right-10 w-16 h-16 bg-white border-4 border-black rounded-lg rotate-45" />
        <div className="absolute bottom-10 left-10 w-20 h-20 bg-brand-yellow border-4 border-black rounded-full" />
        
        <div className="relative z-10 max-w-2xl mx-auto bg-white border-4 border-black shadow-brutal p-12 rounded-3xl -rotate-2 hover:rotate-0 transition-transform duration-300">
          <h2 className="text-4xl font-black mb-4">Find Your <span className="text-brand-purple">GitCrush</span></h2>
          <p className="font-bold text-lg mb-8">Ready to exit Vim and enter a relationship? Join thousands of developers seeking true love in open source.</p>
          <button onClick={handleLogin} className="px-10 py-5 bg-black text-white font-black text-xl shadow-[4px_4px_0_0_#FFE200] hover:-translate-y-1 active:translate-y-1 transition-transform border-4 border-black">
            Login with GitHub 🚀
          </button>
        </div>
      </section>
    </div>
  );
}
