import { useState, useEffect } from "react";
import { collection, query, where, getDocs, setDoc, doc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import { Task, TaskType, Platform } from "../types";
import { Plus, Target, CheckCircle2 } from "lucide-react";
import { cn } from "../lib/utils";
import { format, addDays } from "date-fns";

import { LoginRequired } from "../components/LoginRequired";

export function Tasks() {
  const { user, profile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Create Form State
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<TaskType>("overall");
  const [targetDays, setTargetDays] = useState(7);
  const [targetTotal, setTargetTotal] = useState(50);
  const [targetPlatforms, setTargetPlatforms] = useState<Record<Platform, number>>({
    leetcode: 10,
    codeforces: 0,
    codechef: 0,
    cses: 0
  });

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "tasks"),
      where("uid", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Task[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Task);
      });
      // Sort by creation date
      data.sort((a, b) => b.createdAt - a.createdAt);
      setTasks(data);
      setLoading(false);
    }, (error) => {
      console.error(error);
      const { getAuth } = require("firebase/auth");
      const auth = getAuth();
      const errInfo = {
        error: error instanceof Error ? error.message : String(error),
        operationType: "list",
        path: "tasks",
        authInfo: {
          uid: auth.currentUser?.uid,
          emailVerified: auth.currentUser?.emailVerified
        }
      };
      throw new Error(JSON.stringify(errInfo));
    });

    return () => unsubscribe();
  }, [user]);

  if (!user) {
    return (
      <div className="max-w-6xl mx-auto py-10 px-4">
        <LoginRequired message="You need to log in to view and manage your goals." />
      </div>
    );
  }

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    const startDate = format(new Date(), 'yyyy-MM-dd');
    const endDate = format(addDays(new Date(), targetDays), 'yyyy-MM-dd');

    const newTask: Task = {
      uid: user.uid,
      title,
      type,
      targetDays,
      startDate,
      endDate,
      startState: {
        totalSolved: profile.totalSolved || 0,
        leetcode: profile.stats?.leetcode || 0,
        codeforces: profile.stats?.codeforces || 0,
        codechef: profile.stats?.codechef || 0,
        cses: profile.stats?.cses || 0,
      },
      status: "active",
      createdAt: Date.now(), // Server timestamp might be out of sync if used this way in rules, wait we must use serverTimestamp but rules check for strict equality. We will rely on serverTimestamp for update but rules say `incoming().createdAt == request.time`.
      updatedAt: Date.now(), // This will be overwritten by serverTimestamp in our save call
    };

    if (type === "overall") {
      newTask.targetTotal = targetTotal;
    } else {
      newTask.targetPlatforms = targetPlatforms;
    }

    try {
      const docRef = doc(collection(db, "tasks"));
      await setDoc(docRef, {
        ...newTask,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setIsCreating(false);
      setTitle("");
      setTargetTotal(50);
    } catch (error) {
      console.error(error);
      const errInfo = {
        error: error instanceof Error ? error.message : String(error),
        operationType: "create",
        path: "tasks",
        authInfo: {}
      };
      throw new Error(JSON.stringify(errInfo));
    }
  };

  const getProgress = (task: Task) => {
    if (!profile) return { completed: 0, remaining: 1, total: 1 };
    
    if (task.type === "overall" && task.targetTotal) {
      const current = profile.totalSolved || 0;
      const start = task.startState.totalSolved || 0;
      const done = Math.max(0, current - start);
      return {
        completed: Math.min(done, task.targetTotal),
        remaining: Math.max(0, task.targetTotal - done),
        total: task.targetTotal
      };
    } else if (task.type === "platform" && task.targetPlatforms) {
      let totalTarget = 0;
      let totalDone = 0;
      
      const platforms: Platform[] = ['leetcode', 'codeforces', 'codechef', 'cses'];
      platforms.forEach(p => {
        const pTarget = task.targetPlatforms![p] || 0;
        totalTarget += pTarget;
        
        const currentP = profile.stats?.[p] || 0;
        const startP = task.startState[p] || 0;
        const doneP = Math.max(0, currentP - startP);
        totalDone += Math.min(doneP, pTarget);
      });
      
      return {
        completed: Math.min(totalDone, totalTarget),
        remaining: Math.max(0, totalTarget - totalDone),
        total: totalTarget
      };
    }
    
    return { completed: 0, remaining: 1, total: 1 };
  };

  if (loading) {
    return <div className="max-w-6xl mx-auto py-10 px-4 text-center text-brand-text-muted mt-20 text-sm uppercase tracking-widest animate-pulse">Loading goals...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto py-10 px-4 flex flex-col space-y-8">
      <div className="flex items-baseline justify-between mb-2">
        <h1 className="text-3xl font-serif italic text-brand-text">Active Goals</h1>
        {!isCreating && (
          <button 
            onClick={() => setIsCreating(true)}
            className="flex items-center space-x-2 bg-white text-black px-5 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-wider hover:bg-gray-200 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Goal</span>
          </button>
        )}
      </div>

      {isCreating && (
        <div className="bg-brand-card p-8 border border-brand-border rounded-lg animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex justify-between items-baseline border-b border-brand-border pb-6 mb-6">
            <h2 className="text-xl font-serif italic text-brand-text">Create a Goal</h2>
            <button onClick={() => setIsCreating(false)} className="text-[10px] text-brand-text-muted uppercase tracking-widest hover:text-brand-text transition-colors">Cancel</button>
          </div>
          
          <form onSubmit={handleCreateTask} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className="text-[10px] font-medium text-brand-text-muted uppercase tracking-widest block ml-1">Goal Name</label>
                <input
                  required
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. 100 Days of Code"
                  className="w-full bg-brand-input border border-brand-border rounded-md px-4 py-3 text-sm text-brand-text focus:outline-none focus:border-brand-text-muted transition-colors"
                />
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-medium text-brand-text-muted uppercase tracking-widest block ml-1">Target End In (Days)</label>
                <input
                  required
                  type="number"
                  min="1"
                  max="365"
                  value={targetDays}
                  onChange={(e) => setTargetDays(parseInt(e.target.value))}
                  className="w-full bg-brand-input border border-brand-border rounded-md px-4 py-3 text-sm text-brand-text focus:outline-none focus:border-brand-text-muted transition-colors font-mono"
                />
              </div>
              
              <div className="space-y-4 md:col-span-2">
                <label className="text-[10px] font-medium text-brand-text-muted uppercase tracking-widest block ml-1">Goal Type</label>
                <div className="flex gap-4">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input 
                      type="radio" 
                      name="type" 
                      checked={type === "overall"} 
                      onChange={() => setType("overall")} 
                      className="accent-brand-text"
                    />
                    <span className="text-sm font-medium">Overall Total</span>
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input 
                      type="radio" 
                      name="type" 
                      checked={type === "platform"} 
                      onChange={() => setType("platform")} 
                      className="accent-brand-text"
                    />
                    <span className="text-sm font-medium">Platform Specific</span>
                  </label>
                </div>
              </div>

              {type === "overall" ? (
                <div className="space-y-4 md:col-span-2 max-w-sm">
                  <label className="text-[10px] font-medium text-brand-text-muted uppercase tracking-widest block ml-1">Total Problems to Solve</label>
                  <input
                    required
                    type="number"
                    min="1"
                    value={targetTotal}
                    onChange={(e) => setTargetTotal(parseInt(e.target.value))}
                    className="w-full bg-brand-input border border-brand-border rounded-md px-4 py-3 text-sm text-brand-text focus:outline-none focus:border-brand-text-muted transition-colors font-mono"
                  />
                </div>
              ) : (
                <div className="space-y-4 md:col-span-2">
                  <label className="text-[10px] font-medium text-brand-text-muted uppercase tracking-widest block ml-1">Problems Per Platform</label>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {(['leetcode', 'codeforces', 'codechef', 'cses'] as Platform[]).map(p => (
                      <div key={p}>
                        <div className="text-[10px] text-brand-text-muted mb-2 uppercase tracking-widest">{p}</div>
                        <input
                          type="number"
                          min="0"
                          value={targetPlatforms[p]}
                          onChange={(e) => setTargetPlatforms(prev => ({ ...prev, [p]: parseInt(e.target.value) || 0 }))}
                          className="w-full bg-brand-input border border-brand-border rounded-md px-4 py-3 text-sm text-brand-text focus:outline-none focus:border-brand-text-muted transition-colors font-mono"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-end pt-4">
              <button 
                type="submit"
                className="bg-white text-black px-8 py-3 rounded-full text-[11px] font-bold uppercase tracking-wider hover:bg-gray-200 transition-colors"
              >
                Launch Goal
              </button>
            </div>
          </form>
        </div>
      )}

      {tasks.length === 0 && !isCreating ? (
        <div className="p-12 border border-brand-border border-dashed rounded-lg text-center flex flex-col items-center justify-center space-y-4">
          <Target className="w-12 h-12 text-brand-border-dark" />
          <h3 className="text-xl font-serif italic text-brand-text">No active goals</h3>
          <p className="text-sm text-brand-text-muted max-w-sm">You haven't set any problem solving goals yet. Create one to stay motivated and track your daily progress.</p>
          <button 
            onClick={() => setIsCreating(true)}
            className="mt-6 border border-brand-border text-brand-text px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider hover:bg-brand-card transition-colors"
          >
            Start your first goal
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {tasks.map(task => {
            const progress = getProgress(task);
            const isCompleted = progress.completed >= progress.total;
            const percent = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;
            
            const chartData = [
              { name: "Completed", value: progress.completed, fill: "#d4af37" },
              { name: "Remaining", value: progress.remaining, fill: "#1a1a1a" }
            ];

            return (
              <div key={task.id} className="bg-brand-card p-6 md:p-8 border border-brand-border rounded-lg flex flex-col relative overflow-hidden group">
                {isCompleted && (
                  <div className="absolute top-0 right-0 bg-green-500 text-black px-4 py-1.5 rounded-bl-lg text-[10px] font-bold uppercase tracking-widest flex items-center space-x-1 shadow-sm z-10">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Completed</span>
                  </div>
                )}
                
                <div className="flex justify-between items-start mb-4 z-10">
                  <div>
                    <h3 className="text-xl font-medium text-brand-text mb-1">{task.title}</h3>
                    <div className="text-[10px] font-medium text-brand-text-muted uppercase tracking-widest">
                      {task.type === "overall" ? "Global Progress" : "Platform Split"} &bull; {task.targetDays} Days Target
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-light font-mono tracking-tighter text-brand-text">
                      {percent}%
                    </div>
                  </div>
                </div>

                <div className="mt-4 mb-2 z-10">
                  <div className="flex justify-between text-[10px] uppercase tracking-widest text-brand-text-muted mb-2 font-mono">
                    <span>{progress.completed} Solved</span>
                    <span>{progress.total} Target</span>
                  </div>
                  <div className="w-full bg-brand-border h-3 rounded-full overflow-hidden flex relative">
                    <div 
                      className="bg-white h-full transition-all duration-1000 ease-out relative" 
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>

                {task.type === "platform" && task.targetPlatforms && (
                  <div className="mt-8 space-y-5 z-10">
                    {(['leetcode', 'codeforces', 'codechef', 'cses'] as Platform[]).map(p => {
                      const target = task.targetPlatforms![p] || 0;
                      if (!target) return null;
                      
                      const start = task.startState[p] || 0;
                      const curr = profile?.stats?.[p] || 0;
                      const done = Math.max(0, curr - start);
                      const pDone = Math.min(done, target);
                      const pPercent = target > 0 ? Math.round((pDone / target) * 100) : 0;
                      
                      return (
                        <div key={p} className="flex flex-col space-y-2">
                          <div className="flex justify-between text-[10px] items-center">
                            <span className="text-brand-text uppercase tracking-widest font-medium">{p}</span>
                            <span className="font-mono text-brand-text-muted">{pDone} / {target}</span>
                          </div>
                          <div className="w-full bg-brand-border-dark h-1.5 rounded-full overflow-hidden">
                            <div 
                              className="bg-brand-text-muted h-full transition-all duration-1000 ease-out" 
                              style={{ width: `${pPercent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                <div className="mt-auto pt-6 flex items-center justify-between z-10 text-[10px] font-mono text-brand-text-muted">
                  <span>Started: {format(new Date(task.startDate), 'MMM dd')}</span>
                  <span>Ends: {format(new Date(task.endDate), 'MMM dd')}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
