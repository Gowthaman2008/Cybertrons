"use client";
import React, { useRef, useEffect, useState } from "react";

interface SparklesCoreProps {
  id?: string;
  background?: string;
  minSize?: number;
  maxSize?: number;
  particleDensity?: number;
  className?: string;
  particleColor?: string;
  speed?: number;
}

export function SparklesCore({
  id = "sparkles",
  background = "transparent",
  minSize = 0.6,
  maxSize = 1.4,
  particleDensity = 100,
  className = "",
  particleColor = "#00FF66",
  speed = 0.5,
}: SparklesCoreProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Array<{
      x: number;
      y: number;
      size: number;
      alpha: number;
      speedX: number;
      speedY: number;
      growth: number;
    }> = [];

    const handleResize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * (window.devicePixelRatio || 1);
      canvas.height = rect.height * (window.devicePixelRatio || 1);
      ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
      initParticles();
    };

    const initParticles = () => {
      const rect = canvas.getBoundingClientRect();
      // Multiply density factor to achieve nice coverage
      const count = Math.floor((rect.width * rect.height * particleDensity) / 800000);
      particles = [];
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * rect.width,
          y: Math.random() * rect.height,
          size: Math.random() * (maxSize - minSize) + minSize,
          alpha: Math.random() * 0.8 + 0.2,
          speedX: (Math.random() - 0.5) * speed * 0.4,
          speedY: -(Math.random() * speed + 0.1),
          growth: Math.random() > 0.5 ? 0.015 : -0.015,
        });
      }
    };

    const animate = () => {
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      
      ctx.fillStyle = particleColor;
      particles.forEach((p) => {
        // Move particle
        p.x += p.speedX;
        p.y += p.speedY;

        // Reset if offscreen
        if (p.y < 0) {
          p.y = rect.height;
          p.x = Math.random() * rect.width;
        }
        if (p.x < 0 || p.x > rect.width) {
          p.x = Math.random() * rect.width;
        }

        // Twinkle effect (alpha oscillation)
        p.alpha += p.growth;
        if (p.alpha > 0.95 || p.alpha < 0.15) {
          p.growth = -p.growth;
        }

        // Draw particle
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    window.addEventListener("resize", handleResize);
    handleResize();
    animate();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isClient, particleDensity, minSize, maxSize, particleColor, speed]);

  return (
    <canvas
      ref={canvasRef}
      id={id}
      style={{ background }}
      className={className}
    />
  );
}

export default SparklesCore;
