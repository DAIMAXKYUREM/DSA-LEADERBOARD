import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { useAuth } from "./context/AuthContext";
import { Navbar } from "./components/layout/Navbar";
import { Leaderboard } from "./pages/Leaderboard";
import { Profile } from "./pages/Profile";
import { Tasks } from "./pages/Tasks";
import { LoginRequired } from "./components/LoginRequired";

function LoginRoute() {
  const { user } = useAuth();
  if (user) return <Navigate to="/profile" replace />;
  return (
    <div className="max-w-6xl mx-auto py-10 px-4">
      <LoginRequired message="Authenticate to access the CP Master system." />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-brand-bg font-sans text-brand-text selection:bg-[#333] flex flex-col">
          <Navbar />
          <main className="flex-grow">
            <Routes>
              <Route path="/" element={<Leaderboard />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/login" element={<LoginRoute />} />
            </Routes>
          </main>
          <footer className="py-6 text-center text-brand-text-muted text-[10px] uppercase tracking-widest border-t border-brand-border mt-auto">
            CP Master &copy; {new Date().getFullYear()}
          </footer>
        </div>
      </Router>
    </AuthProvider>
  );
}
