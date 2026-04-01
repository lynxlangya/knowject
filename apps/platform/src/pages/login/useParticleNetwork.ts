import { useEffect, useRef } from 'react';
import type { ParticleNetworkConfig } from './constants';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseOpacity: number;
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function createParticles(
  count: number,
  width: number,
  height: number,
  config: ParticleNetworkConfig,
): Particle[] {
  const particles: Particle[] = [];

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = rand(config.speedMin, config.speedMax);
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: rand(config.particleRadiusMin, config.particleRadiusMax),
      baseOpacity: rand(0.2, 0.5),
    });
  }

  return particles;
}

export function useParticleNetwork(config: ParticleNetworkConfig) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef(0);
  const mouseRef = useRef({ x: 0, y: 0, active: false });
  const sizeRef = useRef({ w: 0, h: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    /* ── Reduced motion ──────────────────────────── */
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reducedMotion = mql.matches;

    /* ── Resize / DPR ────────────────────────────── */
    const MAX_DPR = 3;

    function resize() {
      const parent = canvas!.parentElement;
      if (!parent) return;

      const rect = parent.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio, MAX_DPR);
      const w = rect.width;
      const h = rect.height;

      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      sizeRef.current = { w, h };
      particlesRef.current = createParticles(config.particleCount, w, h, config);
    }

    resize();

    /* ── Draw logic ──────────────────────────────── */
    const { colors } = config;
    const connDistSq = config.connectionDistance ** 2;
    const interRadiusSq = config.interactionRadius ** 2;
    const connDistActiveSq =
      (config.connectionDistance * config.interactionConnectionScale) ** 2;

    function draw() {
      const { w, h } = sizeRef.current;
      const particles = particlesRef.current;
      const mouse = mouseRef.current;
      ctx!.clearRect(0, 0, w, h);

      // Update positions (skip if reduced motion — static frame)
      if (!reducedMotion) {
        for (const p of particles) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0 || p.x > w) p.vx *= -1;
          if (p.y < 0 || p.y > h) p.vy *= -1;
          p.x = Math.max(0, Math.min(w, p.x));
          p.y = Math.max(0, Math.min(h, p.y));
        }
      }

      // Connections (O(n^2), n=65 ≈ 2080 checks — trivial)
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distSq = dx * dx + dy * dy;

          // Check if either particle is near cursor
          let nearMouse = false;
          let maxDistSq = connDistSq;

          if (mouse.active) {
            const aDist =
              (a.x - mouse.x) ** 2 + (a.y - mouse.y) ** 2;
            const bDist =
              (b.x - mouse.x) ** 2 + (b.y - mouse.y) ** 2;
            if (aDist < interRadiusSq || bDist < interRadiusSq) {
              nearMouse = true;
              maxDistSq = connDistActiveSq;
            }
          }

          if (distSq > maxDistSq) continue;

          const dist = Math.sqrt(distSq);
          const maxDist = Math.sqrt(maxDistSq);
          const opacity = config.connectionOpacityMax * (1 - dist / maxDist);
          const rgb = nearMouse
            ? colors.connectionActiveRGB
            : colors.connectionRGB;

          ctx!.beginPath();
          ctx!.moveTo(a.x, a.y);
          ctx!.lineTo(b.x, b.y);
          ctx!.strokeStyle = `rgba(${rgb},${opacity})`;
          ctx!.lineWidth = nearMouse ? 1.2 : 0.8;
          ctx!.stroke();
        }
      }

      // Draw particles
      for (const p of particles) {
        let opacity = p.baseOpacity;
        let isActive = false;

        if (mouse.active) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < interRadiusSq) {
            const proximity = 1 - Math.sqrt(distSq) / config.interactionRadius;
            opacity = Math.min(
              1,
              opacity + config.interactionBrightnessBoost * proximity,
            );
            isActive = true;
          }
        }

        // Glow for active particles
        if (isActive) {
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, p.radius * 4, 0, Math.PI * 2);
          ctx!.fillStyle = `rgba(${colors.glowRGB},${opacity * 0.15})`;
          ctx!.fill();
        }

        // Particle dot
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        const rgb = isActive ? colors.particleActiveRGB : colors.particleRGB;
        ctx!.fillStyle = `rgba(${rgb},${opacity})`;
        ctx!.fill();
      }
    }

    /* ── Animation loop ──────────────────────────── */
    let running = false;

    function loop() {
      if (!running) return;
      draw();
      animFrameRef.current = requestAnimationFrame(loop);
    }

    function start() {
      if (running) return;
      running = true;
      loop();
    }

    function stop() {
      running = false;
      cancelAnimationFrame(animFrameRef.current);
    }

    // Initial draw (static frame for reduced-motion, or start loop)
    draw();
    if (!reducedMotion) {
      start();
    }

    /* ── Event listeners ─────────────────────────── */
    function onMouseMove(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        active: true,
      };
    }

    function onMouseLeave() {
      mouseRef.current = { ...mouseRef.current, active: false };
    }

    function onTouchMove(e: TouchEvent) {
      const touch = e.touches[0];
      if (!touch) return;
      const rect = canvas!.getBoundingClientRect();
      mouseRef.current = {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
        active: true,
      };
    }

    function onTouchEnd() {
      mouseRef.current = { ...mouseRef.current, active: false };
    }

    function onVisibilityChange() {
      if (document.hidden) {
        stop();
      } else if (!reducedMotion) {
        start();
      }
    }

    function onMotionChange(e: MediaQueryListEvent) {
      reducedMotion = e.matches;
      if (reducedMotion) {
        stop();
        draw(); // freeze to static
      } else if (!document.hidden) {
        start();
      }
    }

    // Use window for mouse tracking (canvas has pointer-events-none)
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseleave', onMouseLeave);
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVisibilityChange);
    mql.addEventListener('change', onMotionChange);

    return () => {
      stop();
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseleave', onMouseLeave);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      mql.removeEventListener('change', onMotionChange);
    };
  }, [config]);

  return { canvasRef };
}
