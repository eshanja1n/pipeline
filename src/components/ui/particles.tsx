import React, { useEffect, useRef, useCallback } from "react";
import { cn } from "../../lib/utils";

interface ParticlesProps {
  className?: string;
  quantity?: number;
  staticity?: number;
  ease?: number;
  refresh?: boolean;
}

interface Circle {
  x: number;
  y: number;
  translateX: number;
  translateY: number;
  size: number;
  alpha: number;
  targetAlpha: number;
  dx: number;
  dy: number;
  magnetism: number;
}

export const Particles: React.FC<ParticlesProps> = ({
  className,
  quantity = 30,
  staticity = 50,
  ease = 50,
  refresh = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const context = useRef<CanvasRenderingContext2D | null>(null);
  const circles = useRef<Circle[]>([]);
  const mousePosition = useRef({ x: 0, y: 0 });
  const mouseMoved = useRef(false);
  const animationId = useRef<number>();

  const initCanvas = useCallback(() => {
    if (!canvasRef.current || !canvasContainerRef.current) return;

    const canvas = canvasRef.current;
    const container = canvasContainerRef.current;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    context.current = ctx;

    // Set canvas size
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Initialize particles
    circles.current = [];
    for (let i = 0; i < quantity; i++) {
      circles.current.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        translateX: 0,
        translateY: 0,
        size: Math.random() * 3 + 1,
        alpha: Math.random() * 0.6 + 0.2,
        targetAlpha: Math.random() * 0.6 + 0.2,
        dx: (Math.random() - 0.5) * 0.5,
        dy: (Math.random() - 0.5) * 0.5,
        magnetism: 0.1 + Math.random() * 4,
      });
    }
  }, [quantity]);

  const drawCircle = useCallback((circle: Circle, update = false) => {
    if (!context.current) return;

    const { x, y, translateX, translateY, size, alpha } = circle;
    const ctx = context.current;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(x + translateX, y + translateY, size, 0, 2 * Math.PI);
    ctx.fillStyle = "rgba(59, 130, 246, 0.8)";
    ctx.fill();
    ctx.restore();

    if (!update) return;

    // Mouse interaction
    if (mouseMoved.current) {
      const distance = Math.sqrt(
        Math.pow(mousePosition.current.x - (x + translateX), 2) +
        Math.pow(mousePosition.current.y - (y + translateY), 2)
      );

      if (distance < 150) {
        const forceDirectionX = (mousePosition.current.x - (x + translateX)) / distance;
        const forceDirectionY = (mousePosition.current.y - (y + translateY)) / distance;
        const maxDistance = 150;
        const force = (maxDistance - distance) / maxDistance;
        const directionX = forceDirectionX * force * circle.magnetism;
        const directionY = forceDirectionY * force * circle.magnetism;

        circle.translateX += directionX;
        circle.translateY += directionY;
      }
    }

    // Drift back to original position
    circle.translateX += (0 - circle.translateX) * (ease / 100);
    circle.translateY += (0 - circle.translateY) * (ease / 100);

    // Animate position
    circle.x += circle.dx;
    circle.y += circle.dy;

    // Bounce off edges
    if (!canvasRef.current) return;
    if (circle.x < 0 || circle.x > canvasRef.current.width) circle.dx *= -1;
    if (circle.y < 0 || circle.y > canvasRef.current.height) circle.dy *= -1;

    // Animate alpha
    circle.alpha += (circle.targetAlpha - circle.alpha) * 0.02;
    if (Math.random() > 0.995) {
      circle.targetAlpha = Math.random() * 0.6 + 0.2;
    }
  }, [ease]);

  const animate = useCallback(() => {
    if (!context.current || !canvasRef.current) return;

    context.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    circles.current.forEach((circle) => {
      drawCircle(circle, true);
    });

    animationId.current = window.requestAnimationFrame(animate);
  }, [drawCircle]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    mousePosition.current.x = e.clientX - rect.left;
    mousePosition.current.y = e.clientY - rect.top;
    mouseMoved.current = true;
  }, []);

  const handleResize = useCallback(() => {
    initCanvas();
  }, [initCanvas]);

  useEffect(() => {
    const canvas = canvasRef.current;
    
    initCanvas();
    animate();

    window.addEventListener("resize", handleResize);
    canvas?.addEventListener("mousemove", handleMouseMove);

    return () => {
      if (animationId.current) {
        window.cancelAnimationFrame(animationId.current);
      }
      window.removeEventListener("resize", handleResize);
      canvas?.removeEventListener("mousemove", handleMouseMove);
    };
  }, [initCanvas, animate, handleResize, handleMouseMove]);

  useEffect(() => {
    if (refresh) {
      initCanvas();
    }
  }, [refresh, initCanvas]);

  return (
    <div
      ref={canvasContainerRef}
      className={cn("absolute inset-0", className)}
      style={{ zIndex: 1 }}
    >
      <canvas
        ref={canvasRef}
        className="h-full w-full"
        style={{ display: 'block' }}
      />
    </div>
  );
};