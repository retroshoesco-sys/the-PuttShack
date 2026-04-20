import { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp,
  increment,
  getDocs,
  limit,
} from 'firebase/firestore';
import { 
  onAuthStateChanged, 
  GoogleAuthProvider, 
  signInWithPopup 
} from 'firebase/auth';
import { db, auth } from './lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Player, Session } from './types';
import { 
  Plus, 
  Minus, 
  Trophy, 
  Users, 
  Flag as GolfCourse, 
  ChevronRight, 
  Activity,
  LogIn,
  AlertTriangle
} from 'lucide-react';
import React from 'react';
import { cn } from './lib/utils';
import { v4 as uuidv4 } from 'uuid';

const COLORS = [
  'text-cyan-400 border-cyan-400 bg-cyan-400/10',
  'text-magenta-400 border-magenta-400 bg-magenta-400/10',
  'text-lime-400 border-lime-400 bg-lime-400/10',
  'text-yellow-400 border-yellow-400 bg-yellow-400/10',
  'text-orange-400 border-orange-400 bg-orange-400/10',
  'text-purple-400 border-purple-400 bg-purple-400/10',
];

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // 1. Auth Setup 
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (user) {
        setAuthError(null);
      }
      setIsLoading(false);
    });
    return () => unsubAuth();
  }, []);

  const login = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error(err);
      setAuthError(err.message);
    }
  };

  // 2. Load or Create Live Session (Preserved logic)
  useEffect(() => {
    if (!user) return;

    async function initSession() {
      try {
        const sessionsRef = collection(db, 'sessions');
        const q = query(sessionsRef, orderBy('createdAt', 'desc'), limit(1));
        const querySnapshot = await getDocs(q);

        let sessionId = '';
        if (querySnapshot.empty) {
          const newSession = {
            name: 'Main Tournament',
            status: 'active',
            createdAt: serverTimestamp(),
          };
          const docRef = await addDoc(sessionsRef, newSession);
          sessionId = docRef.id;
          setCurrentSession({ ...newSession, id: sessionId } as Session);
        } else {
          const sDoc = querySnapshot.docs[0];
          sessionId = sDoc.id;
          setCurrentSession({ id: sessionId, ...sDoc.data() } as Session);
        }

        // Sync players
        const playersRef = collection(db, 'sessions', sessionId, 'players');
        const pq = query(playersRef, orderBy('score', 'asc'));
        const unsubPlayers = onSnapshot(pq, (snapshot) => {
          const playersData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as Player));
          setPlayers(playersData);
        }, (err) => {
          console.error("Snapshot error:", err);
          if (err.message.includes('permission')) {
            setAuthError("Sync blocked by security rules.");
          }
        });

        return () => unsubPlayers();
      } catch (err: any) {
        console.error("Session init error:", err);
        setAuthError(err.message);
      }
    }

    initSession();
  }, [user]);

  const addPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim() || !currentSession) return;

    const playersRef = collection(db, 'sessions', currentSession.id, 'players');
    
    await addDoc(playersRef, {
      name: newPlayerName.trim(),
      score: 0,
      color: 'accent', // Standardized for this theme
      joinedAt: serverTimestamp(),
    });

    setNewPlayerName('');
  };

  const updateScore = async (playerId: string, delta: number) => {
    if (!currentSession) return;
    const playerRef = doc(db, 'sessions', currentSession.id, 'players', playerId);
    await updateDoc(playerRef, {
      score: increment(delta)
    });
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0B0D0F] text-white p-6 gap-8">
        <div className="text-center">
          <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter mb-4">Putt<span className="text-[#00FF41]">Shack</span></h1>
          <p className="opacity-50 font-mono text-sm tracking-widest uppercase">Live Tournament Grid</p>
        </div>

        <div className="bg-white text-black p-8 md:p-12 shadow-[20px_20px_0_rgba(255,255,255,0.1)] flex flex-col items-center gap-8 max-w-md w-full">
          <Users className="w-16 h-16 opacity-20" />
          <div className="text-center flex flex-col gap-2">
            <h2 className="text-2xl font-black uppercase italic tracking-tight">Identity Required</h2>
            <p className="text-sm opacity-60">Authorize your device to start tracking scores on the live grid.</p>
          </div>
          
          <button 
            onClick={login}
            className="w-full bg-black text-white py-6 font-black uppercase tracking-[0.2em] text-sm flex items-center justify-center gap-3 hover:bg-neutral-800 transition-all active:scale-95"
          >
            <LogIn className="w-5 h-5" />
            Connect via Google
          </button>

          {authError && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 text-red-600 text-xs flex gap-3 items-start">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}
        </div>
        
        <p className="text-[10px] opacity-20 uppercase font-black tracking-[0.5em] mt-12 text-center max-w-sm">
          Secured by Google Identity • Real-Time Competitive Grid System
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0B0D0F] text-[#00FF41] gap-6">
        <Activity className="w-16 h-16 animate-spin" />
        <p className="font-display font-black text-4xl tracking-tighter uppercase">Syncing Grid...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0D0F] text-white font-sans selection:bg-[#00FF41] selection:text-black p-6 md:p-10 flex flex-col">
      {/* Header Section */}
      <header className="flex flex-col md:flex-row justify-between items-baseline mb-12 border-b-4 border-[#00FF41] pb-6 gap-6">
        <div>
          <h1 className="text-[80px] md:text-[120px] font-black leading-[0.85] tracking-tighter uppercase whitespace-pre">
            Leader<br/>Board
          </h1>
        </div>
        <div className="text-left md:text-right flex flex-col gap-1">
          <div className="flex items-center md:justify-end gap-2 text-[#00FF41] font-mono text-sm uppercase tracking-widest">
            <Activity className="w-4 h-4 animate-pulse" />
            <span>Session Live</span>
          </div>
          <p className="text-5xl md:text-7xl font-black tracking-tight">{currentSession?.id.slice(0, 6).toUpperCase()}</p>
          <p className="text-[10px] opacity-50 uppercase font-bold tracking-widest">Live Sync v24.1.0</p>
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="grid grid-cols-1 md:grid-cols-12 gap-10 lg:gap-16 flex-grow">
        
        {/* Leaderboard Column */}
        <section className="md:col-span-12 lg:col-span-8 flex flex-col gap-3">
          <div className="grid grid-cols-12 px-4 py-2 opacity-50 uppercase text-[10px] font-black tracking-[0.2em] border-b border-white/10">
            <div className="col-span-2">Rank</div>
            <div className="col-span-6">Player</div>
            <div className="col-span-4 text-right">Score</div>
          </div>
          
          <div className="flex flex-col gap-2">
            <AnimatePresence mode="popLayout">
              {players.map((player, index) => (
                <motion.div
                  layout
                  key={player.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "grid grid-cols-12 items-center px-6 py-4 transition-all duration-300",
                    index === 0 
                      ? "bg-[#00FF41] text-black shadow-[8px_8px_0_rgba(0,255,65,0.2)]" 
                      : "bg-white/5 border border-white/10 hover:bg-white/10"
                  )}
                >
                  <div className="col-span-2 text-2xl font-black font-mono">
                    {(index + 1).toString().padStart(2, '0')}
                  </div>
                  <div className="col-span-6 flex flex-col overflow-hidden">
                    <span className="text-xl md:text-3xl font-black uppercase tracking-tighter truncate">
                      {player.name}
                    </span>
                    {index === 0 && <span className="text-[8px] font-black tracking-widest uppercase">Current Champion</span>}
                  </div>
                  <div className="col-span-4 flex items-center justify-end gap-4">
                    <div className="flex items-center gap-1 opacity-0 hover:opacity-100 transition-opacity">
                       <button onClick={() => updateScore(player.id, -1)} className="p-1 hover:bg-black/10 rounded transition-colors"><Minus className="w-4 h-4"/></button>
                       <button onClick={() => updateScore(player.id, 1)} className="p-1 hover:bg-black/10 rounded transition-colors"><Plus className="w-4 h-4"/></button>
                    </div>
                    <span className="text-3xl md:text-5xl font-black tracking-tighter">
                      {player.score > 0 ? `+${player.score}` : player.score}
                    </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {players.length === 0 && (
              <div className="py-20 text-center border-2 border-dashed border-white/10 opacity-30">
                <Users className="w-12 h-12 mx-auto mb-4" />
                <p className="font-display font-black uppercase tracking-widest">Waiting for entries</p>
              </div>
            )}
          </div>
        </section>

        {/* Controls Sidebar */}
        <section className="md:col-span-12 lg:col-span-4 flex flex-col gap-8">
          <div className="bg-white text-black p-8 flex flex-col gap-6 shadow-[12px_12px_0_rgba(255,255,255,0.1)]">
            <h2 className="text-xs font-black uppercase tracking-[0.3em] flex items-center gap-2">
              <Users className="w-4 h-4" />
              Add Contender
            </h2>
            <form onSubmit={addPlayer} className="flex flex-col gap-6">
              <div className="border-b-4 border-black pb-2 focus-within:border-[#00FF41] transition-colors">
                <p className="text-[10px] font-black uppercase mb-1 opacity-60">Display Name</p>
                <input
                  type="text"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  placeholder="TYPE NAME..."
                  className="w-full bg-transparent text-3xl font-black uppercase tracking-tighter outline-none placeholder:opacity-20"
                />
              </div>
              <button 
                type="submit"
                className="bg-black text-white py-5 font-black uppercase tracking-widest text-sm hover:bg-neutral-800 transition-colors active:scale-95"
              >
                Join Tournament
              </button>
            </form>
          </div>

          <div className="border-2 border-white/20 p-8 flex-grow flex flex-col justify-end gap-8 bg-gradient-to-t from-white/5 to-transparent">
            <div>
              <p className="text-[10px] uppercase font-black tracking-widest opacity-40 mb-3 flex items-center gap-2">
                <GolfCourse className="w-3 h-3" />
                Current Venue
              </p>
              <p className="text-3xl font-black uppercase tracking-tighter">Puttshack South<br/><span className="text-[#00FF41]">Hole #14</span></p>
            </div>
            
            <div className="flex justify-between items-end border-t border-white/10 pt-6">
              <div>
                <p className="text-[10px] uppercase font-black tracking-widest opacity-40 mb-1">Local Condition</p>
                <p className="text-sm font-bold uppercase">72°F / Optimal</p>
              </div>
              <Trophy className="w-8 h-8 text-[#00FF41] opacity-50" />
            </div>
          </div>
        </section>
      </main>

      {/* Footer Ticker */}
      <footer className="mt-16 pt-8 overflow-hidden border-t border-white/10">
        <div className="whitespace-nowrap animate-marquee flex">
          <div className="uppercase font-black text-xs tracking-[0.5em] opacity-20 flex gap-20 items-center pr-20">
            <span>NEXT HOLE: THE WINDMILL</span>
            <span>DRINKS SPECIAL: LIME MARGARITA</span>
            <span>PAR FOR THIS COURSE IS 42</span>
            <span>SESSION ID: {currentSession?.id}</span>
            <span>ENJOY THE GAME</span>
          </div>
          <div className="uppercase font-black text-xs tracking-[0.5em] opacity-20 flex gap-20 items-center pr-20">
            <span>NEXT HOLE: THE WINDMILL</span>
            <span>DRINKS SPECIAL: LIME MARGARITA</span>
            <span>PAR FOR THIS COURSE IS 42</span>
            <span>SESSION ID: {currentSession?.id}</span>
            <span>ENJOY THE GAME</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
