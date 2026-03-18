import { useAuth } from "../context/AuthContext";

export default function Profile() {
  const { user } = useAuth();

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4 text-center">
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-full blur-2xl opacity-30 animate-pulse-slow"
             style={{ background: "radial-gradient(circle, #e91e8c 0%, transparent 70%)" }} />
        {user?.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.username}
            className="relative w-24 h-24 rounded-full border-2 border-brand-pink/40 ring-4 ring-brand-pink/10"
          />
        ) : (
          <div className="relative w-24 h-24 rounded-full glass-card border border-brand-pink/20 flex items-center justify-center text-5xl">
            👤
          </div>
        )}
      </div>

      {user && (
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-text-primary">@{user.username}</h1>
          {user.bio && <p className="text-text-secondary text-sm mt-1 max-w-xs">{user.bio}</p>}
          <div className="flex items-center justify-center gap-6 mt-4 text-sm">
            <div className="text-center">
              <div className="font-bold text-text-primary text-lg">{user.repos}</div>
              <div className="text-text-muted text-xs">Repos</div>
            </div>
            <div className="w-px h-8 bg-bg-border" />
            <div className="text-center">
              <div className="font-bold text-text-primary text-lg">{user.followers}</div>
              <div className="text-text-muted text-xs">Followers</div>
            </div>
            <div className="w-px h-8 bg-bg-border" />
            <div className="text-center">
              <div className="font-bold text-text-primary text-lg">{user.following}</div>
              <div className="text-text-muted text-xs">Following</div>
            </div>
          </div>
        </div>
      )}

      <p className="text-text-secondary max-w-sm leading-relaxed text-sm mb-6">
        Full profile editing, tech stack badges, and match preferences coming soon.
      </p>
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-brand-pink/20 bg-brand-pink/10 text-brand-pink text-xs font-mono">
        <span className="w-1.5 h-1.5 rounded-full bg-brand-pink animate-pulse" />
        Coming soon — profile builder in progress
      </div>
    </div>
  );
}
