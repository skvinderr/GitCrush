import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import SearchBar from "./SearchBar";

const navItems = [
  { label: "Discover", to: "/discover" },
  { label: "Confessions", to: "/confessions" },
  { label: "Leaderboard", to: "/leaderboard" },
  { label: "Matches",  to: "/matches"  },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b-4 border-black" style={{ boxShadow: "0px 4px 0px 0px rgba(0,0,0,1)" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <button onClick={() => navigate("/discover")}
                  className="flex items-center gap-2 group hover:-translate-y-1 transition-transform">
            <span className="text-2xl drop-shadow-[2px_2px_0_rgba(0,0,0,1)]">💘</span>
            <span className="font-black text-xl tracking-tight uppercase">
              <span className="text-black">Git</span>
              <span className="text-brand-pink drop-shadow-[2px_2px_0_rgba(0,0,0,1)]">Crush</span>
            </span>
          </button>
          <SearchBar />

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-2">
            {navItems.map(({ label, to }) => (
              <NavLink key={to} to={to} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
                {label}
              </NavLink>
            ))}
          </nav>

          {/* User + Logout */}
          <div className="flex items-center gap-4">
            {user && (
              <button 
                onClick={() => navigate("/profile")}
                className="flex items-center gap-2 bg-brand-yellow/30 px-3 py-1 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-brand-yellow/50 hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
              >
                <img
                  src={user.avatarUrl}
                  alt={user.username}
                  className="w-8 h-8 rounded-full border-2 border-black bg-white"
                />
                <span className="hidden sm:block text-sm font-black text-black">
                  @{user.username}
                </span>
              </button>
          <SearchBar />
            )}
            <button
              onClick={logout}
              className="px-4 py-2 text-sm font-black text-black border-2 border-black bg-brand-pink shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-brand-yellow hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none transition-all"
            >
              Logout
            </button>
          <SearchBar />
          </div>

        </div>
      </div>
    </header>
  );
}

