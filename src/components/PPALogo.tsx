"use client";

import Image from "next/image";

interface PPALogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export default function PPALogo({ className = "", size = 48, showText = false }: PPALogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Image
        src="/images/ppa-logo-nobg.png"
        alt="Philippine Ports Authority Logo"
        width={size}
        height={size}
        className="object-contain"
        priority
      />
      
      {showText && (
        <div className="flex flex-col">
          <span className="font-bold text-ppa-navy text-sm leading-tight">Philippine Ports</span>
          <span className="font-bold text-ppa-navy text-sm leading-tight">Authority</span>
        </div>
      )}
    </div>
  );
}

// Alternative simple logo for smaller sizes
export function PPALogoSimple({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <Image
      src="/images/ppa-logo-nobg.png"
      alt="PPA Logo"
      width={size}
      height={size}
      className={`object-contain ${className}`}
    />
  );
}
