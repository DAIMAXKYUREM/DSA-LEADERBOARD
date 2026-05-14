import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { signInWithGoogle, signOut } from "../../lib/firebase";
import { Trophy, LogIn, LogOut, UserCircle } from "lucide-react";

export function Navbar() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleLogin = () => {
    navigate("/login");
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate("/");
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <nav className="h-20 border-b border-brand-border flex items-center justify-between px-6 md:px-10">
      <div className="flex items-center gap-6 md:gap-8">
        <Link to="/" className="flex items-center space-x-2">
          <Trophy className="h-5 w-5 text-brand-gold" />
          <span className="text-xl font-bold tracking-tighter font-serif italic hidden sm:block">CP Master.</span>
        </Link>
        
        <div className="flex items-center space-x-6 sm:pl-8 sm:border-l border-brand-border h-8">
          <Link to="/" className="text-[11px] font-bold text-brand-text-muted hover:text-white uppercase tracking-wider transition-colors">
            Leaderboard
          </Link>
          {user && (
            <>
              <Link to="/tasks" className="text-[11px] font-bold text-brand-text-muted hover:text-white uppercase tracking-wider transition-colors">
                Goals
              </Link>
              <Link to="/profile" className="text-[11px] font-bold flex items-center space-x-1.5 text-brand-text-muted hover:text-white uppercase tracking-wider transition-colors">
                <UserCircle className="w-3.5 h-3.5" />
                <span>Profile</span>
              </Link>
            </>
          )}
        </div>
      </div>
      
      <div className="flex items-center">
        {user ? (
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              {user.photoURL ? (
                <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full border border-brand-border-dark" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-brand-badge-bg border border-brand-border-dark flex items-center justify-center text-xs font-bold text-brand-text">
                  {user.displayName?.charAt(0) || "U"}
                </div>
              )}
              <div className="hidden md:block">
                <div className="text-sm font-semibold">{user.displayName}</div>
                <div className="text-[10px] text-brand-text-muted uppercase tracking-widest">Active User</div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-[11px] font-bold flex items-center space-x-1.5 text-brand-text-muted hover:text-red-400 uppercase tracking-wider transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        ) : (
          <button
            onClick={handleLogin}
            className="bg-white text-black text-[11px] font-bold flex items-center space-x-2 px-5 py-2.5 rounded-full uppercase tracking-wider hover:bg-gray-200 transition-colors"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Login</span>
          </button>
        )}
      </div>
    </nav>
  );
}
