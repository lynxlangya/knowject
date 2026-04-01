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
  const canvasRectRef = useRef<DOMRect | null>(null);

  useEffect(() => {
    const _canvas = canvasRef.current;
    if (!_canvas) return;
    const _ctx = _canvas.getContext('2d');
    if (!_ctx) return;

    // Rebind after guard so closures capture non-nullable types
    const canvas = _canvas;
    const ctx = _ctx;

    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reducedMotion = mql.matches;

    const MAX_DPR = 3;

    function resize() {
      const parent = canvas.parentElement;
      if (!parent) return;

      const rect = parent.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio, MAX_DPR);
      const w = rect.width;
      const h = rect.height;

      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      sizeRef.current = { w, h };
      canvasRectRef.current = canvas.getBoundingClientRect();
      particlesRef.current = createParticles(config.particleCount, w, h, config);
    }

    resize();

    const { colors } = config;
    const connDistSq = config.connectionDistance ** 2;
    const connDist = config.connectionDistance;
    const interRadiusSq = config.interactionRadius ** 2;
    const connDistActiveSq =
      (config.connectionDistance * config.interactionConnectionScale) ** 2;
    const connDistActive =
      config.connectionDistance * config.interactionConnectionScale;

    function draw() {
      const { w, h } = sizeRef.current;
      const particles = particlesRef.current;
      const mouse = mouseRef.current;
      ctx.clearRect(0, 0, w, h);

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

      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distSq = dx * dx + dy * dy;

          let nearMouse = false;
          let maxDistSq = connDistSq;
          let maxDist = connDist;

          if (mouse.active) {
            const aDist =
              (a.x - mouse.x) ** 2 + (a.y - mouse.y) ** 2;
            const bDist =
              (b.x - mouse.x) ** 2 + (b.y - mouse.y) ** 2;
            if (aDist < interRadiusSq || bDist < interRadiusSq) {
              nearMouse = true;
              maxDistSq = connDistActiveSq;
              maxDist = connDistActive;
            }
          }

          if (distSq > maxDistSq) continue;

          const dist = Math.sqrt(distSq);
          const opacity = config.connectionOpacityMax * (1 - dist / maxDist);
          const rgb = nearMouse
            ? colors.connectionActiveRGB
            : colors.connectionRGB;

          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(${rgb},${opacity})`;
          ctx.lineWidth = nearMouse ? 1.2 : 0.8;
          ctx.stroke();
        }
      }

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

        if (isActive) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius * 4, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${colors.glowRGB},${opacity * 0.15})`;
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${colors.particleRGB},${opacity})`;
        ctx.fill();
      }
    }

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

    draw();
    if (!reducedMotion) {
      start();
    }

    function updatePointer(clientX: number, clientY: number) {
      const rect = canvasRectRef.current;
      if (!rect) return;
      mouseRef.current = {
        x: clientX - rect.left,
        y: clientY - rect.top,
        active: true,
      };
    }

    function deactivatePointer() {
      mouseRef.current.active = false;
    }

    function onMouseMove(e: MouseEvent) {
      updatePointer(e.clientX, e.clientY);
    }

    function onTouchMove(e: TouchEvent) {
      const touch = e.touches[0];
      if (!touch) return;
      updatePointer(touch.clientX, touch.clientY);
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
        draw();
      } else if (!document.hidden) {
        start();
      }
    }

    // Use window for mouse tracking (canvas has pointer-events-none)
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseleave', deactivatePointer);
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', deactivatePointer);
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVisibilityChange);
    mql.addEventListener('change', onMotionChange);

    return () => {
      stop();
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseleave', deactivatePointer);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', deactivatePointer);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      mql.removeEventListener('change', onMotionChange);
    };
  }, [config]);

  return { canvasRef };
}
