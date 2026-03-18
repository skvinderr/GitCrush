import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Navbar       from "./components/Navbar";
import LandingPage  from "./pages/LandingPage";
import Discover     from "./pages/Discover";
import Matches      from "./pages/Matches";
import Chat         from "./pages/Chat";
import Profile      from "./pages/Profile";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen text-text-secondary">Loading…</div>;
  if (!user)   return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-brand-pink border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      {user && <Navbar />}
      <Routes>
        <Route path="/" element={user ? <Navigate to="/discover" replace /> : <LandingPage />} />
        <Route path="/discover" element={<ProtectedRoute><Discover /></ProtectedRoute>} />
        <Route path="/matches"  element={<ProtectedRoute><Matches  /></ProtectedRoute>} />
        <Route path="/chat"     element={<ProtectedRoute><Chat     /></ProtectedRoute>} />
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
