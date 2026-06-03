import { type ReactNode, useEffect, useRef } from "react";

interface LiquidGlassProps {
  children: ReactNode;
  className?: string;
}

/**
 * Wrapper that applies animated CSS backdrop-filter
 * to create a flowing liquid glass distortion on the background.
 */
export function LiquidGlass({ children, className }: LiquidGlassProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let frame = 0;
    const animate = () => {
      frame++;
      const t = frame * 0.0003;
      const blur = 10 + Math.sin(t * 0.7) * 3;
      const saturate = 1.3 + Math.cos(t * 0.5) * 0.2;
      const contrast = 1.08 + Math.sin(t * 0.6) * 0.04;
      const brightness = 1.04 + Math.cos(t * 0.4) * 0.02;
      const hue = Math.sin(t * 0.3) * 5;

      const value = `blur(${blur.toFixed(1)}px) saturate(${saturate.toFixed(2)}) contrast(${contrast.toFixed(2)}) brightness(${brightness.toFixed(2)}) hue-rotate(${hue.toFixed(1)}deg)`;
      el.style.setProperty("backdrop-filter", value);
      el.style.setProperty("-webkit-backdrop-filter", value);

      requestAnimationFrame(animate);
    };

    const raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        background:
          "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 40%, rgba(255,255,255,0.08) 100%)",
        border: "1px solid rgba(255,255,255,0.1)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.08)",
      }}
    >
      {children}
    </div>
  );
}
