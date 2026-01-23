"use client";

interface PPALogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export default function PPALogo({ className = "", size = 48, showText = false }: PPALogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Compass Rose Background */}
        <circle cx="50" cy="50" r="45" fill="white" stroke="#0d3a5c" strokeWidth="2"/>
        
        {/* North Point */}
        <path d="M50 5 L55 35 L50 30 L45 35 Z" fill="#0d3a5c"/>
        
        {/* South Point */}
        <path d="M50 95 L55 65 L50 70 L45 65 Z" fill="#1a5f8a"/>
        
        {/* East Point */}
        <path d="M95 50 L65 45 L70 50 L65 55 Z" fill="#1a5f8a"/>
        
        {/* West Point */}
        <path d="M5 50 L35 45 L30 50 L35 55 Z" fill="#0d3a5c"/>
        
        {/* Inner Circle with Philippine Flag Colors */}
        <circle cx="50" cy="50" r="25" fill="white" stroke="#0d3a5c" strokeWidth="1.5"/>
        
        {/* Blue Section (top left) */}
        <path d="M50 25 A25 25 0 0 0 25 50 L50 50 Z" fill="#0d3a5c"/>
        
        {/* Red Section (bottom left) */}
        <path d="M25 50 A25 25 0 0 0 50 75 L50 50 Z" fill="#c41e3a"/>
        
        {/* White Triangle with Sun */}
        <path d="M50 25 L50 75 L75 50 Z" fill="white" stroke="#d4a418" strokeWidth="0.5"/>
        
        {/* Sun */}
        <circle cx="58" cy="50" r="6" fill="#d4a418"/>
        
        {/* Sun Rays */}
        <g fill="#d4a418">
          <rect x="57" y="40" width="2" height="5" transform="rotate(0 58 50)"/>
          <rect x="57" y="55" width="2" height="5"/>
          <rect x="65" y="49" width="5" height="2"/>
          <rect x="62" y="42" width="4" height="1.5" transform="rotate(45 64 43)"/>
          <rect x="62" y="56" width="4" height="1.5" transform="rotate(-45 64 57)"/>
        </g>
        
        {/* Stars */}
        <circle cx="52" cy="32" r="2" fill="#d4a418"/>
        <circle cx="52" cy="68" r="2" fill="#d4a418"/>
        <circle cx="70" cy="50" r="2" fill="#d4a418"/>
        
        {/* Water Waves */}
        <path d="M30 55 Q35 52 40 55 Q45 58 50 55" stroke="#3387bf" strokeWidth="1.5" fill="none"/>
        <path d="M30 60 Q35 57 40 60 Q45 63 50 60" stroke="#3387bf" strokeWidth="1.5" fill="none"/>
      </svg>
      
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
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Simplified compass design */}
      <circle cx="50" cy="50" r="48" fill="white"/>
      <circle cx="50" cy="50" r="45" fill="none" stroke="#0d3a5c" strokeWidth="3"/>
      
      {/* Compass points */}
      <path d="M50 8 L56 40 L50 35 L44 40 Z" fill="#0d3a5c"/>
      <path d="M50 92 L56 60 L50 65 L44 60 Z" fill="#c41e3a"/>
      <path d="M92 50 L60 44 L65 50 L60 56 Z" fill="#d4a418"/>
      <path d="M8 50 L40 44 L35 50 L40 56 Z" fill="#1a5f8a"/>
      
      {/* Center circle */}
      <circle cx="50" cy="50" r="15" fill="#0d3a5c"/>
      <circle cx="50" cy="50" r="10" fill="white"/>
      <circle cx="50" cy="50" r="5" fill="#d4a418"/>
    </svg>
  );
}
