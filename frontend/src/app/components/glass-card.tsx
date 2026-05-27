"use client";

import { ComponentPropsWithoutRef, ReactNode } from "react";

type GlassCardProps = ComponentPropsWithoutRef<"div"> & {
  children: ReactNode;
};

export default function GlassCard({ children, className = "", ...props }: GlassCardProps) {
  return (
    <div className={`glassCard ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}
