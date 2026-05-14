import { useEffect, useState } from "react";
import { collection, query, orderBy, limit, onSnapshot, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import { UserProfile, DailyStat } from "../types";
import { format } from "date-fns";
import { cn } from "../lib/utils";

type TabType = "global" | "daily";

export function Leaderboard() {
  const [tab, setTab] = useState<TabType>("global");
  const [sortOption, setSortOption] = useState<"total" | "leetcode" | "codeforces" | "codechef" | "cses">("total");
  const [globalUsers, setGlobalUsers] = useState<UserProfile[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    if (tab === "global") {
      const q = query(
        collection(db, "users"),
        orderBy(sortOption === "total" ? "totalSolved" : `stats.${sortOption}`, "desc"),
        limit(100)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const data: UserProfile[] = [];
        snapshot.forEach((doc) => {
          data.push(doc.data() as UserProfile);
        });
        setGlobalUsers(data);
        setLoading(false);
      }, (error) => {
        console.error("Firestore Error: ", error);
        const errInfo = {
          error: error instanceof Error ? error.message : String(error),
          operationType: "list",
          path: "users",
          authInfo: {}
        };
        throw new Error(JSON.stringify(errInfo));
      });

      return () => unsubscribe();
    } else {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const q = query(
        collection(db, "daily_stats"),
        where("date", "==", todayStr),
        orderBy("solvedToday", "desc"),
        limit(100)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const data: DailyStat[] = [];
        snapshot.forEach((doc) => {
          data.push(doc.data() as DailyStat);
        });
        setDailyStats(data);
        setLoading(false);
      }, (error) => {
        console.error("Firestore Error: ", error);
        const errInfo = {
          error: error instanceof Error ? error.message : String(error),
          operationType: "list",
          path: "daily_stats",
          authInfo: {}
        };
        throw new Error(JSON.stringify(errInfo));
      });

      return () => unsubscribe();
    }
  }, [tab, sortOption]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 flex flex-col space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-baseline justify-between mb-2 gap-4">
        <h1 className="text-3xl font-serif italic text-brand-text">The Elite</h1>
        <div className="flex items-center space-x-2 bg-brand-input p-1 rounded border border-brand-border">
          <button 
            onClick={() => setTab("global")}
            className={cn(
              "px-4 py-1.5 text-[10px] uppercase tracking-widest rounded transition-colors font-medium",
              tab === "global" ? "bg-brand-card text-white shadow-sm" : "text-brand-text-muted hover:text-brand-text"
            )}
          >
            All-Time
          </button>
          <button 
            onClick={() => setTab("daily")}
            className={cn(
              "px-4 py-1.5 text-[10px] uppercase tracking-widest rounded transition-colors font-medium",
              tab === "daily" ? "bg-brand-card text-white shadow-sm" : "text-brand-text-muted hover:text-brand-text"
            )}
          >
            Today
          </button>
        </div>
      </div>

      <div className="bg-brand-card border border-brand-border rounded-lg overflow-hidden flex-1 flex flex-col">
        {loading ? (
          <div className="p-12 text-center text-brand-text-muted font-medium animate-pulse text-sm uppercase tracking-widest">
            Loading rank data...
          </div>
        ) : tab === "global" && globalUsers.length === 0 ? (
          <div className="p-12 text-center text-brand-text-muted text-sm uppercase tracking-widest">
            No users found. Be the first to join the leaderboard!
          </div>
        ) : tab === "daily" && dailyStats.length === 0 ? (
          <div className="p-12 text-center text-brand-text-muted text-sm uppercase tracking-widest">
            No daily syncs yet. Go to your profile to sync your stats!
          </div>
        ) : tab === "global" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="text-[10px] text-brand-text-muted uppercase tracking-widest border-b border-brand-border bg-brand-bg/50">
                <tr>
                  <th className="p-4 font-normal text-center w-20">Rank</th>
                  <th className="p-4 font-normal">Solver</th>
                  <th 
                    className={cn("p-4 font-normal text-right cursor-pointer hover:text-brand-text transition-colors select-none", sortOption === "leetcode" && "text-brand-text font-bold")}
                    onClick={() => setSortOption("leetcode")}
                  >
                    LC {sortOption === "leetcode" && "↓"}
                  </th>
                  <th 
                    className={cn("p-4 font-normal text-right cursor-pointer hover:text-brand-text transition-colors select-none", sortOption === "codeforces" && "text-brand-text font-bold")}
                    onClick={() => setSortOption("codeforces")}
                  >
                    CF {sortOption === "codeforces" && "↓"}
                  </th>
                  <th 
                    className={cn("p-4 font-normal text-right cursor-pointer hover:text-brand-text transition-colors select-none", sortOption === "codechef" && "text-brand-text font-bold")}
                    onClick={() => setSortOption("codechef")}
                  >
                    CC {sortOption === "codechef" && "↓"}
                  </th>
                  <th 
                    className={cn("p-4 font-normal text-right cursor-pointer hover:text-brand-text transition-colors select-none", sortOption === "cses" && "text-brand-text font-bold")}
                    onClick={() => setSortOption("cses")}
                  >
                    CSES {sortOption === "cses" && "↓"}
                  </th>
                  <th 
                    className={cn("p-4 font-normal text-right cursor-pointer hover:text-brand-text transition-colors select-none", sortOption === "total" && "text-brand-text font-bold")}
                    onClick={() => setSortOption("total")}
                  >
                    Total {sortOption === "total" && "↓"}
                  </th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {globalUsers.map((u, i) => (
                  <tr key={u.uid} className="border-b border-brand-card-hover hover:bg-brand-card-hover transition-colors">
                    <td className="p-4 font-mono text-xs text-center">
                      {i === 0 ? <span className="text-brand-gold font-bold">01</span> :
                       i === 1 ? <span className="text-brand-accent font-bold">02</span> :
                       i === 2 ? <span className="text-amber-700 font-bold">03</span> :
                       <span className="text-brand-text-muted">{(i + 1).toString().padStart(2, '0')}</span>}
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        {u.photoURL ? (
                          <img src={u.photoURL} alt="" className="w-8 h-8 rounded-full border border-brand-border" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-brand-badge-bg border border-brand-border flex items-center justify-center text-brand-text-muted text-xs font-bold">
                            {u.displayName?.charAt(0) || "U"}
                          </div>
                        )}
                        <span className="font-medium text-brand-text tracking-wide">{u.displayName}</span>
                      </div>
                    </td>
                    <td className={cn("p-4 whitespace-nowrap text-right font-mono text-xs text-brand-text-faded transition-colors", sortOption === "leetcode" && "text-brand-text font-medium")}>
                      {u.stats?.leetcode || 0}
                    </td>
                    <td className={cn("p-4 whitespace-nowrap text-right font-mono text-xs text-brand-text-faded transition-colors", sortOption === "codeforces" && "text-brand-text font-medium")}>
                      {u.stats?.codeforces || 0}
                    </td>
                    <td className={cn("p-4 whitespace-nowrap text-right font-mono text-xs text-brand-text-faded transition-colors", sortOption === "codechef" && "text-brand-text font-medium")}>
                      {u.stats?.codechef || 0}
                    </td>
                    <td className={cn("p-4 whitespace-nowrap text-right font-mono text-xs text-brand-text-faded transition-colors", sortOption === "cses" && "text-brand-text font-medium")}>
                      {u.stats?.cses || 0}
                    </td>
                    <td className={cn("p-4 whitespace-nowrap text-right font-mono font-medium transition-colors text-brand-text", sortOption === "total" && "font-bold text-white")}>
                      {u.totalSolved || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="text-[10px] text-brand-text-muted uppercase tracking-widest border-b border-brand-border bg-brand-bg/50">
                <tr>
                  <th className="p-4 font-normal text-center w-20">Rank</th>
                  <th className="p-4 font-normal">Solver</th>
                  <th className="p-4 font-normal text-right">Total Solved Today</th>
                  <th className="p-4 font-normal text-right">All-Time</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {dailyStats.map((u, i) => (
                  <tr key={u.uid} className="border-b border-brand-card-hover hover:bg-brand-card-hover transition-colors">
                    <td className="p-4 font-mono text-xs text-center">
                      {i === 0 ? <span className="text-brand-gold font-bold">01</span> :
                       i === 1 ? <span className="text-brand-accent font-bold">02</span> :
                       i === 2 ? <span className="text-amber-700 font-bold">03</span> :
                       <span className="text-brand-text-muted">{(i + 1).toString().padStart(2, '0')}</span>}
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        {u.photoURL ? (
                          <img src={u.photoURL} alt="" className="w-8 h-8 rounded-full border border-brand-border" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-brand-badge-bg border border-brand-border flex items-center justify-center text-brand-text-muted text-xs font-bold">
                            {u.displayName?.charAt(0) || "U"}
                          </div>
                        )}
                        <span className="font-medium text-brand-text tracking-wide">{u.displayName}</span>
                      </div>
                    </td>
                    <td className="p-4 whitespace-nowrap text-right font-mono text-lg font-bold text-green-500">
                      +{u.solvedToday}
                    </td>
                    <td className="p-4 whitespace-nowrap text-right font-mono text-xs text-brand-text-faded">
                      {u.totalSolved || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
