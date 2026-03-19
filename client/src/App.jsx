import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Navbar       from "./components/Navbar";
import LandingPage  from "./pages/LandingPage";
import Discover     from "./pages/Discover";
import Matches      from "./pages/Matches";
import Chat         from "./pages/Chat";
import Profile      from "./pages/Profile";
import SyncLoader   from "./components/SyncLoader";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen text-text-secondary">Loading…</div>;
  if (!user)   return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  const { user, setUser, loading } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // If the user has logged in but hasn't synced their profile yet, trigger a sync
    if (user && !user.lastSyncedAt && !isSyncing) {
      setIsSyncing(true);
      fetch("http://localhost:5000/api/sync-profile", { method: "POST", credentials: "include" })
        .then((res) => res.json())
        .then((updatedUser) => {
          if (!updatedUser.error) setUser(updatedUser);
        })
        .finally(() => setIsSyncing(false));
    }
  }, [user, setUser, isSyncing]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-brand-pink border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Intercept the router completely while syncing the initial profile
  if (isSyncing) {
    return <SyncLoader />;
  }

  return (
    <>
      {user && <Navbar />}
      <Routes>
        <Route path="/" element={user ? <Navigate to="/discover" replace /> : <LandingPage />} />
        <Route path="/discover" element={<ProtectedRoute><Discover /></ProtectedRoute>} />
        <Route path="/matches"  element={<ProtectedRoute><Matches  /></ProtectedRoute>} />
        <Route path="/chat"     element={<ProtectedRoute><Chat     /></ProtectedRoute>} />
        <Route path="/chat/:matchId" element={<ProtectedRoute><Chat     /></ProtectedRoute>} />
        <Route path="/profile"  element={<ProtectedRoute><Profile  /></ProtectedRoute>} />
        <Route path="*"         element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
