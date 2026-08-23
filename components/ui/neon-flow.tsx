import React, { useEffect, useRef, useState } from 'react';
import { cn } from "@/lib/utils";

// Helper for random green colors
const randomGreens = (count: number) => {
  const greenShades = ["#53bc28", "#83f36e", "#39FF14", "#00FF66", "#2ecc71", "#1abc9c", "#27ae60", "#2E8B57", "#ADFF2F"];
  return new Array(count)
    .fill(0)
    .map(() => greenShades[Math.floor(Math.random() * greenShades.length)]);
};

interface TubesBackgroundProps {
  children?: React.ReactNode;
  className?: string;
  enableClickInteraction?: boolean;
}

export function TubesBackground({ 
  children, 
  className,
  enableClickInteraction = true 
}: TubesBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const tubesRef = useRef<any>(null);

  useEffect(() => {
    let mounted = true;
    let cleanup: (() => void) | undefined;

    const initTubes = async () => {
      if (!canvasRef.current) return;

      try {
        const cdnUrl = 'https://cdn.jsdelivr.net/npm/threejs-components@0.0.19/build/cursors/tubes1.min.js';
        const module = await import(
          /* webpackIgnore: true */
          // @ts-ignore
          cdnUrl
        );
        const TubesCursor = module.default;

        if (!mounted) return;

        const app = TubesCursor(canvasRef.current, {
          tubes: {
            colors: ["#39FF14", "#53bc28", "#83f36e"],
            lights: {
              intensity: 200,
              colors: ["#83f36e", "#39FF14", "#00FF66", "#2ecc71"]
            }
          }
        });

        tubesRef.current = app;
        setIsLoaded(true);

        cleanup = () => {
          // If the library has a destroy method, call it
          if (app && typeof app.destroy === 'function') {
            app.destroy();
          }
        };

      } catch (error) {
        console.error("Failed to load TubesCursor:", error);
      }
    };

    initTubes();

    return () => {
      mounted = false;
      if (cleanup) cleanup();
    };
  }, []);

  const handleClick = () => {
    if (!enableClickInteraction || !tubesRef.current) return;
    
    const colors = randomGreens(3);
    const lightsColors = randomGreens(4);
    
    tubesRef.current.tubes.setColors(colors);
    tubesRef.current.tubes.setLightsColors(lightsColors);
  };

  return (
    <div 
      className={cn("relative w-full h-full min-h-[400px] overflow-hidden bg-black", className)}
      onClick={handleClick}
    >
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 w-full h-full block z-0"
        style={{ touchAction: 'none' }}
      />
      
      {/* Content Overlay */}
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </div>
  );
}

export default TubesBackground;
