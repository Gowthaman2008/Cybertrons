"use client";

import React from 'react';
import { TubesBackground } from "@/components/ui/neon-flow";

export default function DemoPage() {
  return (
    <div className="w-full h-screen font-sans">
      <TubesBackground>
        <div className="flex flex-col items-center justify-center w-full h-full gap-6 text-center px-4">
          <div className="space-y-2 pointer-events-auto cursor-default">
            <h1 className="text-6xl md:text-8xl font-bold tracking-tighter text-white drop-shadow-[0_0_20px_rgba(0,0,0,1)] select-none">
              Neon Flow
            </h1>
          </div>

          <div className="absolute bottom-8 flex flex-col items-center gap-2 text-white/50 animate-pulse pointer-events-none">
            <span className="text-xs uppercase tracking-widest">Move the cursor around to interact and Click to randomize.</span>
          </div>
        </div>
      </TubesBackground>
    </div>
  );
}
