import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { ParticleBall } from './ParticleBall';
import { signInWithGoogle } from '../lib/firebase';
import { LogIn } from 'lucide-react';

interface LoginRequiredProps {
  message?: string;
}

export function LoginRequired({ message = "Authentication Required" }: LoginRequiredProps) {
  const handleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="relative w-full h-[80vh] min-h-[500px] flex items-center justify-center overflow-hidden rounded-xl border border-brand-border bg-[#050505]">
      {/* 3D Canvas Background */}
      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [0, 0, 8], fov: 60 }}>
          <fog attach="fog" args={['#050505', 4, 12]} />
          <ambientLight intensity={0.5} />
          <Suspense fallback={null}>
            <ParticleBall count={30000} />
          </Suspense>
          <OrbitControls 
            enableZoom={false} 
            enablePan={false} 
            autoRotate 
            autoRotateSpeed={0.5} 
            maxPolarAngle={Math.PI / 1.5}
            minPolarAngle={Math.PI / 3}
          />
        </Canvas>
      </div>

      {/* Overlay UI */}
      <div className="relative z-10 flex flex-col items-center bg-[#050505]/70 pb-10 pt-12 px-12 rounded-2xl border border-brand-border-dark backdrop-blur-md shadow-2xl">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-3 font-serif italic text-brand-gold tracking-tighter">System Locked</h2>
          <p className="text-brand-text-muted text-[10px] uppercase tracking-widest font-mono">
            {message}
          </p>
        </div>
        
        <button
          onClick={handleLogin}
          className="group relative overflow-hidden bg-brand-bg text-brand-text border border-brand-border px-8 py-3 rounded-full text-[11px] font-bold uppercase tracking-wider hover:bg-brand-card transition-all duration-300"
        >
          <div className="absolute inset-0 w-1/4 h-full bg-gradient-to-r from-transparent via-brand-gold/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
          <div className="flex items-center space-x-2 relative z-10">
            <LogIn className="w-4 h-4 text-brand-gold group-hover:scale-110 transition-transform" />
            <span>Initialize Login Sequence</span>
          </div>
        </button>
      </div>
    </div>
  );
}
