// Settings.jsx
import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function Settings() {
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState(false);

  const toggleSetting = async (field) => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: !user[field] }),
        credentials: "include",
      });
      const data = await res.json();
      if (!data.error) setUser(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto p-6 font-mono space-y-8">
      <h1 className="text-4xl font-black bg-brand-pink text-black p-4 border-4 border-black inline-block shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        Settings
      </h1>

      <div className="space-y-6">
        {/* PRIVACY */}
        <section className="bg-bg-dark border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <h2 className="text-2xl font-bold bg-brand-cyan text-black px-2 inline-block mb-4">Privacy</h2>
          
          <div className="space-y-4">
            <label className="flex items-center justify-between p-4 border-2 border-slate-600 bg-black/50 hover:border-brand-pink transition-colors cursor-pointer">
              <span>Show Contribution Heatmap on Card</span>
              <input 
                type="checkbox" 
                className="w-6 h-6 border-2 border-black accent-brand-pink"
                checked={!user.hideHeatmap}
                onChange={() => toggleSetting("hideHeatmap")}
                disabled={loading}
              />
            </label>
            <label className="flex items-center justify-between p-4 border-2 border-slate-600 bg-black/50 hover:border-brand-cyan transition-colors cursor-pointer">
              <span>Show Profile Stats on Card</span>
              <input 
                type="checkbox" 
                className="w-6 h-6 border-2 border-black accent-brand-cyan"
                checked={!user.hideStats}
                onChange={() => toggleSetting("hideStats")}
                disabled={loading}
              />
            </label>
          </div>
        </section>

        {/* ACCOUNT */}
        <section className="bg-bg-dark border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <h2 className="text-2xl font-bold bg-brand-yellow text-black px-2 inline-block mb-4">Account</h2>
          <div className="p-4 border-2 border-slate-600 flex justify-between items-center bg-black/50">
            <div>
              <p className="font-bold">Connected GitHub Account</p>
              <p className="text-slate-400">@{user.username}</p>
            </div>
            <button className="px-4 py-2 bg-brand-yellow text-black font-bold border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
              Disconnect
            </button>
          </div>
        </section>

        {/* SUBSCRIPTION */}
        <section className="bg-bg-dark border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <h2 className="text-2xl font-bold bg-green-500 text-black px-2 inline-block mb-4">Subscription</h2>
          <div className="p-4 border-2 border-slate-600 bg-black/50">
            <p className="font-bold">Current Plan: Individual User (Free)</p>
            <button className="mt-4 w-full px-4 py-3 bg-green-400 text-black font-bold border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
              Manage Subscription (Stripe)
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
