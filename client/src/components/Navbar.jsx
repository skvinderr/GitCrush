import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { label: "Discover", to: "/discover" },
  { label: "Confessions", to: "/confessions" },
  { label: "Matches",  to: "/matches"  },
  { label: "Chat",     to: "/chat"     },
  { label: "Profile",  to: "/profile"  },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-bg-border"
            style={{ background: "rgba(13,13,26,0.85)", backdropFilter: "blur(24px)" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <button onClick={() => navigate("/discover")}
                  className="flex items-center gap-2 group">
            <span className="text-2xl">💘</span>
            <span className="font-bold text-lg tracking-tight">
              <span className="text-text-primary">Git</span>
              <span className="text-brand-pink">Crush</span>
            </span>
          </button>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(({ label, to }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
              >
                {label}
              </NavLink>
            ))}
          </nav>

          {/* User + Logout */}
          <div className="flex items-center gap-3">
            {user && (
              <div className="flex items-center gap-2">
                <img
                  src={user.avatarUrl}
                  alt={user.username}
                  className="w-8 h-8 rounded-full border border-bg-border ring-1 ring-brand-pink/20"
                />
                <span className="hidden sm:block text-sm font-medium text-text-secondary">
                  @{user.username}
                </span>
              </div>
            )}
            <button
              onClick={logout}
              className="px-4 py-1.5 rounded-xl text-sm font-medium text-text-secondary border border-bg-border
                         hover:border-brand-pink/40 hover:text-brand-pink transition-all duration-200"
            >
              Logout
            </button>
          </div>

        </div>
      </div>
    </header>
  );
}
