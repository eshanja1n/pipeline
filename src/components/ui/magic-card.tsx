import React, { useCallback, useEffect, useRef } from "react";
import { cn } from "../../lib/utils";

interface MagicCardProps {
  children: React.ReactNode;
  className?: string;
  gradientSize?: number;
  gradientColor?: string;
  gradientOpacity?: number;
}

export const MagicCard: React.FC<MagicCardProps> = ({
  children,
  className,
  gradientSize = 200,
  gradientColor = "#262626",
  gradientOpacity = 0.8,
}) => {
  const divRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (divRef.current !== e.target) return;

      const x = e.clientX - (e.target as HTMLElement).offsetLeft;
      const y = e.clientY - (e.target as HTMLElement).offsetTop;

      divRef.current?.style.setProperty("--x", `${x}px`);
      divRef.current?.style.setProperty("--y", `${y}px`);
    },
    []
  );

  useEffect(() => {
    const currentDiv = divRef.current;
    currentDiv?.addEventListener("mousemove", handleMouseMove);

    return () => {
      currentDiv?.removeEventListener("mousemove", handleMouseMove);
    };
  }, [handleMouseMove]);

  return (
    <div
      ref={divRef}
      className={cn(
        "group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-xl",
        "before:absolute before:inset-0 before:z-0 before:opacity-0 before:transition-opacity before:duration-500 group-hover:before:opacity-100",
        "before:bg-[radial-gradient(var(--gradientSize,200px)_circle_at_var(--x,50%)_var(--y,50%),var(--gradientColor,theme(colors.gray.400))_0%,transparent_50%)]",
        className
      )}
      style={
        {
          "--gradientSize": `${gradientSize}px`,
          "--gradientColor": gradientColor,
          "--gradientOpacity": gradientOpacity,
        } as React.CSSProperties
      }
    >
      <div className="relative z-10">{children}</div>
    </div>
  );
};