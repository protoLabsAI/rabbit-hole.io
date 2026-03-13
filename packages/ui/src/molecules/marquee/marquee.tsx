"use client";

import * as React from "react";

import { cn } from "../../lib/utils";

interface MarqueeProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const Marquee = React.forwardRef<HTMLDivElement, MarqueeProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("relative flex w-full overflow-hidden", className)}
      {...props}
    >
      {children}
    </div>
  )
);
Marquee.displayName = "Marquee";

interface MarqueeContentProps extends React.HTMLAttributes<HTMLDivElement> {
  pauseOnHover?: boolean;
  reverse?: boolean;
  duration?: number;
}

const MarqueeContent = React.forwardRef<HTMLDivElement, MarqueeContentProps>(
  (
    {
      className,
      children,
      pauseOnHover = true,
      reverse = false,
      duration = 40,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn("flex min-w-full shrink-0 items-center", className)}
        style={
          {
            "--duration": `${duration}s`,
            animation: `marquee var(--duration) linear infinite ${reverse ? "reverse" : ""}`,
          } as React.CSSProperties
        }
        onMouseEnter={(e) => {
          if (pauseOnHover) {
            e.currentTarget.style.animationPlayState = "paused";
          }
        }}
        onMouseLeave={(e) => {
          if (pauseOnHover) {
            e.currentTarget.style.animationPlayState = "running";
          }
        }}
        {...props}
      >
        {children}
        {/* Duplicate for seamless loop */}
        {children}
      </div>
    );
  }
);
MarqueeContent.displayName = "MarqueeContent";

interface MarqueeFadeProps extends React.HTMLAttributes<HTMLDivElement> {
  side: "left" | "right";
}

const MarqueeFade = React.forwardRef<HTMLDivElement, MarqueeFadeProps>(
  ({ className, side, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "pointer-events-none absolute inset-y-0 z-10 w-1/4",
        side === "left"
          ? "left-0 bg-gradient-to-r"
          : "right-0 bg-gradient-to-l",
        className
      )}
      {...props}
    />
  )
);
MarqueeFade.displayName = "MarqueeFade";

const MarqueeItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex-shrink-0", className)} {...props} />
));
MarqueeItem.displayName = "MarqueeItem";

export { Marquee, MarqueeContent, MarqueeFade, MarqueeItem };
