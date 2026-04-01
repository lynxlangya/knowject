import { useEffect, useRef } from 'react';
import type { FlowMeshConfig } from './constants';

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseOpacity: number;
}

interface Pulse {
  nodeA: Node;
  nodeB: Node;
  progress: number;       // 0 → 1
  speed: number;           // 每帧 progress 增量
}

export function useFlowMesh(config: FlowMeshConfig) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<Node[]>([]);
  const pulsesRef = useRef<Pulse[]>([]);
  const animFrameRef = useRef(0);
  const mouseRef = useRef({ x: 0, y: 0, active: false });
  const prevMouseActiveRef = useRef(false);
  const sizeRef = useRef({ w: 0, h: 0 });
  const canvasRectRef = useRef<DOMRect | null>(null);
  const timeRef = useRef(0);
  const nextPulseTimeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;

    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reducedMotion = mql.matches;

    const MAX_DPR = 3;

    // ── 流场函数 ─────────────────────────────────────────────
    function flowAt(x: number, y: number, t: number) {
      const s = config.flowFieldScale;
      const vx =
        Math.sin(x * s + t) * Math.cos(y * s + t * 0.5);
      const vy =
        Math.cos(x * s - t * 0.3) * Math.sin(y * s + t);
      const len = Math.sqrt(vx * vx + vy * vy) || 1;
      return { x: vx / len, y: vy / len };
    }

    // ── 节点创建 ─────────────────────────────────────────────
    function createNodes(count: number, w: number, h: number): Node[] {
      const nodes: Node[] = [];
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed =
          config.speedMin +
          Math.random() * (config.speedMax - config.speedMin);
        nodes.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius:
            config.nodeRadiusMin +
            Math.random() * (config.nodeRadiusMax - config.nodeRadiusMin),
          baseOpacity: 0.3 + Math.random() * 0.3,
        });
      }
      return nodes;
    }

    // ── 节点运动（流场驱动） ─────────────────────────────────
    function moveNodes(nodes: Node[], t: number, w: number, h: number) {
      for (const node of nodes) {
        const flow = flowAt(node.x, node.y, t);
        // 混合当前速度与流场方向，实现平滑过渡
        node.vx = node.vx * 0.95 + flow.x * 0.05;
        node.vy = node.vy * 0.95 + flow.y * 0.05;
        node.x += node.vx;
        node.y += node.vy;
        // 边界绕行（流场在边缘自然转向，此处安全兜底）
        if (node.x < 0) node.x = w;
        if (node.x > w) node.x = 0;
        if (node.y < 0) node.y = h;
        if (node.y > h) node.y = 0;
      }
    }

    // ── 脉冲触发 ─────────────────────────────────────────────
    function triggerPulse() {
      const nodes = nodesRef.current;
      if (nodes.length < 2) return;
      const i = Math.floor(Math.random() * nodes.length);
      const j = Math.floor(Math.random() * (nodes.length - 1));
      const a = nodes[i];
      const b = nodes[j === i ? nodes.length - 1 : j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist === 0) return;
      pulsesRef.current.push({
        nodeA: a,
        nodeB: b,
        progress: 0,
        speed: 0.012 / dist, // 约 1.2% 连线长度 / frame
      });
    }

    function triggerMousePulse(mx: number, my: number) {
      const nodes = nodesRef.current;
      const interR = config.interactionRadius;
      // 找到鼠标附近最近的 2-3 个节点
      const nearby = nodes
        .map((n) => ({
          n,
          d: Math.sqrt((n.x - mx) ** 2 + (n.y - my) ** 2),
        }))
        .filter(({ d }) => d < interR)
        .sort((a, b) => a.d - b.d)
        .slice(0, 3);
      // 两两之间触发脉冲
      for (let k = 0; k < nearby.length - 1; k++) {
        const a = nearby[k].n;
        const b = nearby[k + 1].n;
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist === 0) continue;
        pulsesRef.current.push({
          nodeA: a,
          nodeB: b,
          progress: 0,
          speed: 0.018 / dist,
        });
      }
    }

    // ── Resize ──────────────────────────────────────────────
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
      nodesRef.current = createNodes(config.nodeCount, w, h);
      pulsesRef.current = [];
      timeRef.current = 0;
      nextPulseTimeRef.current =
        Date.now() +
        config.pulseIntervalMin +
        Math.random() * (config.pulseIntervalMax - config.pulseIntervalMin);
    }

    resize();

    const connDistSq = config.connectionDistance ** 2;
    const connDist = config.connectionDistance;
    const interRadiusSq = config.interactionRadius ** 2;

    // ── 绘制 ─────────────────────────────────────────────────
    function draw() {
      const { w, h } = sizeRef.current;
      const nodes = nodesRef.current;
      const mouse = mouseRef.current;
      const { colors } = config;
      ctx.clearRect(0, 0, w, h);

      if (!reducedMotion) {
        timeRef.current += config.flowFieldSpeed;
        moveNodes(nodes, timeRef.current, w, h);

        // 定时触发脉冲
        if (Date.now() >= nextPulseTimeRef.current) {
          triggerPulse();
          nextPulseTimeRef.current =
            Date.now() +
            config.pulseIntervalMin +
            Math.random() * (config.pulseIntervalMax - config.pulseIntervalMin);
        }

        // 推进脉冲
        pulsesRef.current = pulsesRef.current.filter((p) => {
          p.progress += p.speed;
          return p.progress < 1;
        });
      }

      // 绘制连线
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distSq = dx * dx + dy * dy;
          if (distSq > connDistSq) continue;

          const dist = Math.sqrt(distSq);

          // 检查鼠标激活
          let nearMouse = false;
          let opacityBoost = 0;
          if (mouse.active) {
            // 鼠标进入时触发一次神经放电脉冲
            if (!prevMouseActiveRef.current) {
              triggerMousePulse(mouse.x, mouse.y);
            }
            const aDist = (a.x - mouse.x) ** 2 + (a.y - mouse.y) ** 2;
            const bDist = (b.x - mouse.x) ** 2 + (b.y - mouse.y) ** 2;
            if (aDist < interRadiusSq || bDist < interRadiusSq) {
              nearMouse = true;
              opacityBoost = 0.25;
            }
          }

          // 计算脉冲经过时的亮度增益
          let pulseBoost = 0;
          let pulseWidth = 0;
          for (const p of pulsesRef.current) {
            if (p.nodeA === a && p.nodeB === b) {
              // 高斯峰，progress=0.5 时最强
              const centered = p.progress - 0.5;
              pulseBoost = Math.max(pulseBoost, 0.7 * Math.exp(-centered * centered * 20));
              pulseWidth = Math.max(pulseWidth, p.progress * 1.5);
            }
          }

          const baseOpacity =
            config.connectionOpacityMax * (1 - dist / connDist);
          const totalOpacity = Math.min(
            1,
            baseOpacity + opacityBoost + pulseBoost
          );
          const lineWidth = nearMouse ? 1.0 : 0.5;

          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(${colors.connectionRGB},${totalOpacity})`;
          ctx.lineWidth = lineWidth + pulseWidth;
          ctx.stroke();
        }
      }

      // 绘制节点
      for (const node of nodes) {
        let opacity = node.baseOpacity;
        let isActive = false;

        if (mouse.active) {
          const dx = node.x - mouse.x;
          const dy = node.y - mouse.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < interRadiusSq) {
            const dist = Math.sqrt(distSq);
            const proximity = 1 - dist / config.interactionRadius;
            opacity = Math.min(
              1,
              opacity +
                config.interactionBrightnessBoost * proximity
            );
            isActive = true;
          }
        }

        if (isActive) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius * 4, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${colors.glowRGB},${opacity * 0.12})`;
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${colors.nodeRGB},${opacity})`;
        ctx.fill();
      }

      // 更新上次鼠标活跃状态（用于检测进入事件）
      prevMouseActiveRef.current = mouse.active;
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
    if (!reducedMotion) start();

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
      if (document.hidden) stop();
      else if (!reducedMotion) start();
    }
    function onMotionChange(e: MediaQueryListEvent) {
      reducedMotion = e.matches;
      if (reducedMotion) {
        stop();
        draw();
      } else if (!document.hidden) start();
    }

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
