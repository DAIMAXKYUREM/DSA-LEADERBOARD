import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { UserProfile, Platform } from "../types";
import { cn } from "../lib/utils";
import { format, subDays } from "date-fns";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

import { LoginRequired } from "../components/LoginRequired";

export function Profile() {
  const { user, profile, refreshProfile } = useAuth();
  
  const [handles, setHandles] = useState<Record<Platform, string>>({
    leetcode: profile?.handles?.leetcode || "",
    codeforces: profile?.handles?.codeforces || "",
    codechef: profile?.handles?.codechef || "",
    cses: profile?.handles?.cses || "",
  });
  const [csesToken, setCsesToken] = useState(profile?.tokens?.cses || "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (!user) {
    return (
      <div className="max-w-6xl mx-auto py-10 px-4">
        <LoginRequired message="You need to log in to view and manage your profile." />
      </div>
    );
  }

  const handleSync = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const stats: Record<Platform, number> = {
        leetcode: profile?.stats?.leetcode || 0,
        codeforces: profile?.stats?.codeforces || 0,
        codechef: profile?.stats?.codechef || 0,
        cses: profile?.stats?.cses || 0,
      };
      
      const userDetails: Partial<Record<Platform, any>> = profile?.details || {};

      let totalSolved = 0;

      // Fetch LeetCode
      if (handles.leetcode) {
        const res = await fetch(`/api/platform/leetcode/${handles.leetcode}`);
        if (res.ok) {
          const data = await res.json();
          stats.leetcode = data.solved || 0;
          if (data.details) userDetails.leetcode = data.details;
        } else {
          throw new Error("Failed to fetch LeetCode. Check handle.");
        }
      } else { stats.leetcode = 0; }

      // Fetch Codeforces
      if (handles.codeforces) {
        const res = await fetch(`/api/platform/codeforces/${handles.codeforces}`);
        if (res.ok) {
          const data = await res.json();
          stats.codeforces = data.solved || 0;
          if (data.details) userDetails.codeforces = data.details;
        } else {
          throw new Error("Failed to fetch Codeforces. Check handle.");
        }
      } else { stats.codeforces = 0; }

      // Fetch CodeChef
      if (handles.codechef) {
        const res = await fetch(`/api/platform/codechef/${handles.codechef}`);
        if (res.ok) {
          const data = await res.json();
          stats.codechef = data.solved || 0;
          if (data.details) userDetails.codechef = data.details;
        } else {
          throw new Error("Failed to fetch CodeChef. Check handle.");
        }
      } else { stats.codechef = 0; }

      // Fetch CSES
      if (csesToken) {
        const fetchUrl = `/api/platform/cses/_?token=${encodeURIComponent(csesToken)}`;
        const res = await fetch(fetchUrl);
        if (res.ok) {
          const data = await res.json();
          stats.cses = data.solved || 0;
          if (data.details) userDetails.cses = data.details;
        } else {
          throw new Error("Failed to fetch CSES. Check token.");
        }
      } else { stats.cses = 0; }

      totalSolved = stats.leetcode + stats.codeforces + stats.codechef + stats.cses;

      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);

      const todayStr = format(new Date(), 'yyyy-MM-dd');

      if (!snap.exists()) {
        const history = { [todayStr]: totalSolved };
        await setDoc(userRef, {
          uid: user.uid,
          displayName: user.displayName || "Anonymous User",
          photoURL: user.photoURL || "",
          handles,
          tokens: { cses: csesToken },
          stats,
          details: userDetails,
          history,
          totalSolved,
          lastSyncedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        
        // Write initial daily stat as 0 changed
        const statId = `${user.uid}_${todayStr}`;
        await setDoc(doc(db, "daily_stats", statId), {
          uid: user.uid,
          date: todayStr,
          solvedToday: 0,
          totalSolved,
          displayName: user.displayName || "Anonymous User",
          photoURL: user.photoURL || "",
          updatedAt: serverTimestamp(),
        });
      } else {
        const data = snap.data() as UserProfile;
        const history = data.history || {};
        
        // Compute diff for solvedToday 
        const pastDates = Object.keys(history).filter(d => d < todayStr).sort();
        const lastDate = pastDates.length > 0 ? pastDates[pastDates.length - 1] : null;
        
        let solvedToday = 0;
        if (lastDate) {
          solvedToday = totalSolved - history[lastDate];
          if (solvedToday < 0) solvedToday = 0; // Prevent negative leaps if someone resets account
        }

        history[todayStr] = totalSolved;
        
        await updateDoc(userRef, {
          handles,
          tokens: { cses: csesToken },
          stats,
          details: userDetails,
          totalSolved,
          history,
          lastSyncedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        
        // Update daily stat
        const statId = `${user.uid}_${todayStr}`;
        const dailyRef = doc(db, "daily_stats", statId);
        const dSnap = await getDoc(dailyRef);
        
        if (dSnap.exists()) {
          await updateDoc(dailyRef, {
            solvedToday,
            totalSolved,
            displayName: user.displayName || "Anonymous User",
            photoURL: user.photoURL || "",
            updatedAt: serverTimestamp()
          });
        } else {
          await setDoc(dailyRef, {
            uid: user.uid,
            date: todayStr,
            solvedToday,
            totalSolved,
            displayName: user.displayName || "Anonymous User",
            photoURL: user.photoURL || "",
            updatedAt: serverTimestamp()
          });
        }
      }

      await refreshProfile();
      setMessage({ type: "success", text: "Profile and stats synced successfully!" });
    } catch (e: any) {
      console.error(e);
      setMessage({ type: "error", text: e.message || "An unknown error occurred" });
    } finally {
      setLoading(false);
    }
  };

  // Prepare chart data
  const chartData = [];
  if (profile?.history) {
    for (let i = 6; i >= 0; i--) {
      const d = subDays(new Date(), i);
      const dStr = format(d, 'yyyy-MM-dd');
      
      const pastDates = Object.keys(profile.history).filter(k => k <= dStr).sort();
      const lastKnownVal = pastDates.length > 0 ? profile.history[pastDates[pastDates.length - 1]] : 0;
      
      const valBeforePastDates = Object.keys(profile.history).filter(k => k < dStr).sort();
      const valBefore = valBeforePastDates.length > 0 ? profile.history[valBeforePastDates[valBeforePastDates.length - 1]] : lastKnownVal;
      
      const dailyEarned = lastKnownVal - valBefore;

      chartData.push({
        date: format(d, 'MMM dd'),
        solved: Math.max(dailyEarned, 0),
        total: lastKnownVal
      });
    }
  }

  return (
    <div className="max-w-6xl mx-auto py-10 px-4 flex flex-col space-y-8">
      <h2 className="text-3xl font-serif italic mb-2 text-brand-text">Personal Statistics</h2>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Stats Section */}
        <div className="lg:col-span-5 flex flex-col space-y-6">
          <div className="bg-brand-card p-8 rounded-lg border border-brand-border flex flex-col gap-8 h-full">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b border-brand-border pb-6 gap-4">
              <div className="flex flex-col">
                <div className="text-lg font-semibold text-brand-text">{profile?.displayName || user.displayName}</div>
                <div className="text-[10px] text-brand-text-muted uppercase tracking-widest mt-1">Profile Overview</div>
              </div>
              <div className="flex flex-col sm:items-end">
                <div className="text-6xl font-light tracking-tighter text-brand-text">{profile?.totalSolved || 0}</div>
                <div className="text-[10px] text-brand-text-muted uppercase tracking-widest mt-2">Total Solved</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm font-mono tracking-tight flex-1">
              <div className="p-5 border border-brand-border rounded bg-brand-input hover:border-brand-border-dark transition-colors flex flex-col justify-center">
                <div className="text-brand-text-muted text-[10px] uppercase tracking-widest mb-2">LeetCode</div>
                <div className="text-2xl text-brand-text">{profile?.stats?.leetcode || 0}</div>
              </div>
              <div className="p-5 border border-brand-border rounded bg-brand-input hover:border-brand-border-dark transition-colors flex flex-col justify-center">
                <div className="text-brand-text-muted text-[10px] uppercase tracking-widest mb-2">Codeforces</div>
                <div className="text-2xl text-brand-text">{profile?.stats?.codeforces || 0}</div>
              </div>
              <div className="p-5 border border-brand-border rounded bg-brand-input hover:border-brand-border-dark transition-colors flex flex-col justify-center">
                <div className="text-brand-text-muted text-[10px] uppercase tracking-widest mb-2">CodeChef</div>
                <div className="text-2xl text-brand-text">{profile?.stats?.codechef || 0}</div>
              </div>
              <div className="p-5 border border-brand-border rounded bg-brand-input hover:border-brand-border-dark transition-colors flex flex-col justify-center">
                <div className="text-brand-text-muted text-[10px] uppercase tracking-widest mb-2">CSES</div>
                <div className="text-2xl text-brand-text">{profile?.stats?.cses || 0}</div>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap gap-2 mt-auto">
              {profile && <span className="bg-brand-badge-bg border border-brand-border-dark rounded px-3 py-1.5 text-[10px] font-medium uppercase tracking-widest text-green-500">Sync Active</span>}
              {profile?.details?.codeforces?.rank && (
                <span className="bg-brand-badge-bg border border-brand-border-dark rounded px-3 py-1.5 text-[10px] font-medium uppercase tracking-widest text-amber-500">
                  CF: {profile.details.codeforces.rank}
                </span>
              )}
              {profile?.details?.codechef?.stars && (
                <span className="bg-brand-badge-bg border border-brand-border-dark rounded px-3 py-1.5 text-[10px] font-medium uppercase tracking-widest text-blue-400">
                  CC: {profile.details.codechef.stars}
                </span>
              )}
              {profile?.details?.leetcode?.ranking && (
                <span className="bg-brand-badge-bg border border-brand-border-dark rounded px-3 py-1.5 text-[10px] font-medium uppercase tracking-widest text-orange-400">
                  LC Rank: {profile.details.leetcode.ranking}
                </span>
              )}
              {profile?.details?.cses?.ranking && profile.details.cses.ranking !== "Unranked" && (
                <span className="bg-brand-badge-bg border border-brand-border-dark rounded px-3 py-1.5 text-[10px] font-medium uppercase tracking-widest text-purple-400">
                  CSES Rank: {profile.details.cses.ranking}
                </span>
              )}
              {profile?.details?.cses?.firstSubmission && (
                <span className="bg-brand-badge-bg border border-brand-border-dark rounded px-3 py-1.5 text-[10px] font-medium uppercase tracking-widest text-pink-400">
                  Started: {profile.details.cses.firstSubmission.split(' ')[0]}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Edit Section */}
        <div className="lg:col-span-7 flex flex-col space-y-6">
          <div className="bg-brand-card p-8 border border-brand-border rounded-lg h-full flex flex-col">
            <div className="flex items-baseline justify-between mb-8">
              <h2 className="text-2xl font-serif italic text-brand-text">Platform Settings</h2>
              <span className="text-[10px] text-brand-text-muted uppercase tracking-widest">Connect Accounts</span>
            </div>
            
            {message && (
              <div className={cn("p-4 mb-6 rounded border flex items-center space-x-3 text-sm", 
                  message.type === "success" ? "bg-green-950/20 border-green-900/50 text-green-400" : "bg-red-950/20 border-red-900/50 text-red-400"
              )}>
                {message.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                <span>{message.text}</span>
              </div>
            )}

            <div className="space-y-6 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col space-y-2">
                  <label className="text-[10px] font-medium text-brand-text-muted uppercase tracking-widest ml-1">LeetCode Handle</label>
                  <input
                    type="text"
                    value={handles.leetcode}
                    onChange={(e) => setHandles({ ...handles, leetcode: e.target.value })}
                    className="bg-brand-input border border-brand-border rounded-md px-4 py-3 text-sm text-brand-text focus:outline-none focus:border-brand-text-muted transition-colors font-mono"
                    placeholder="username"
                  />
                </div>
                <div className="flex flex-col space-y-2">
                  <label className="text-[10px] font-medium text-brand-text-muted uppercase tracking-widest ml-1">Codeforces Handle</label>
                  <input
                    type="text"
                    value={handles.codeforces}
                    onChange={(e) => setHandles({ ...handles, codeforces: e.target.value })}
                    className="bg-brand-input border border-brand-border rounded-md px-4 py-3 text-sm text-brand-text focus:outline-none focus:border-brand-text-muted transition-colors font-mono"
                    placeholder="username"
                  />
                </div>
                <div className="flex flex-col space-y-2">
                  <label className="text-[10px] font-medium text-brand-text-muted uppercase tracking-widest ml-1">CodeChef Handle</label>
                  <input
                    type="text"
                    value={handles.codechef}
                    onChange={(e) => setHandles({ ...handles, codechef: e.target.value })}
                    className="bg-brand-input border border-brand-border rounded-md px-4 py-3 text-sm text-brand-text focus:outline-none focus:border-brand-text-muted transition-colors font-mono"
                    placeholder="username"
                  />
                </div>
                <div className="flex flex-col space-y-2">
                  <label className="text-[10px] font-medium text-brand-text-muted uppercase tracking-widest ml-1">CSES Token (Optional PHPSESSID)</label>
                  <input
                    type="password"
                    value={csesToken}
                    onChange={(e) => setCsesToken(e.target.value)}
                    className="bg-brand-input border border-brand-border rounded-md px-4 py-3 text-sm text-brand-text focus:outline-none focus:border-brand-text-muted transition-colors font-mono placeholder:opacity-50"
                    placeholder="Enter PHPSESSID cookie to view private solver stats"
                  />
                </div>
              </div>
            </div>

            <div className="pt-8 mt-auto flex justify-end">
              <button
                onClick={handleSync}
                disabled={loading}
                className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-white text-black rounded-full px-8 py-3 text-[11px] font-bold uppercase tracking-wider hover:bg-gray-200 disabled:opacity-50 transition-colors"
              >
                {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                <span>{loading ? "Syncing..." : "Run Global Sync"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      {profile?.history && chartData.length > 0 && (
        <div className="bg-brand-card p-8 border border-brand-border rounded-lg mt-8">
          <div className="flex items-baseline justify-between mb-8">
            <h2 className="text-2xl font-serif italic text-brand-text">7-Day Progress</h2>
            <span className="text-[10px] text-brand-text-muted uppercase tracking-widest">Daily Problems Solved</span>
          </div>
          <div className="h-64 w-full text-brand-text">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSolved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d4af37" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#d4af37" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="date" 
                  stroke="#333333" 
                  tick={{ fill: '#666666', fontSize: 10, fontFamily: 'monospace' }} 
                  axisLine={false} 
                  tickLine={false} 
                />
                <YAxis 
                  stroke="#333333" 
                  tick={{ fill: '#666666', fontSize: 10, fontFamily: 'monospace' }} 
                  axisLine={false} 
                  tickLine={false} 
                  allowDecimals={false}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0c0c0c', border: '1px solid #1f1f1f', borderRadius: '4px', fontSize: '12px' }}
                  itemStyle={{ color: '#d4af37', fontFamily: 'monospace' }}
                  labelStyle={{ color: '#666666', marginBottom: '4px', fontFamily: 'monospace', textTransform: 'uppercase', fontSize: '10px' }}
                  cursor={{ stroke: '#333333', strokeWidth: 1, strokeDasharray: '4 4' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="solved" 
                  stroke="#d4af37" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorSolved)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
