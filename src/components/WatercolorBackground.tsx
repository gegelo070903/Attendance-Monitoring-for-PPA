"use client";

interface WatercolorBackgroundProps {
  className?: string;
}

export default function WatercolorBackground({ className = "" }: WatercolorBackgroundProps) {
  return (
    <div className={`fixed inset-0 pointer-events-none overflow-hidden ${className}`}>
      {/* Base white/light gray gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-white via-gray-50/50 to-white" />
      
      {/* Top blue flowing lines - subtle watercolor effect */}
      <svg 
        className="absolute top-0 left-0 w-full h-[50vh] min-h-[300px]" 
        viewBox="0 0 1920 600" 
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Subtle blue gradients */}
          <linearGradient id="blueFlow1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0038A8" stopOpacity="0.15" />
            <stop offset="50%" stopColor="#4169E1" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#87CEEB" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="blueFlow2" x1="0%" y1="0%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#0038A8" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#6495ED" stopOpacity="0.08" />
          </linearGradient>
          <linearGradient id="blueFlow3" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4169E1" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#B0C4DE" stopOpacity="0.05" />
          </linearGradient>
          
          {/* Soft blur filter */}
          <filter id="softBlur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
          </filter>
        </defs>
        
        {/* Main flowing curves - Layer 1 (back) */}
        <path 
          d="M-100,0 Q200,100 400,80 T800,120 T1200,60 T1600,100 T2020,50 L2020,0 Z" 
          fill="url(#blueFlow1)"
          filter="url(#softBlur)"
        />
        
        {/* Layer 2 */}
        <path 
          d="M-50,0 Q150,150 350,120 T750,180 T1150,100 T1550,160 T1970,80 L1970,0 Z" 
          fill="url(#blueFlow2)"
          filter="url(#softBlur)"
        />
        
        {/* Layer 3 - Thin flowing line */}
        <path 
          d="M0,200 Q300,280 600,220 T1200,300 T1920,200" 
          fill="none"
          stroke="url(#blueFlow1)"
          strokeWidth="60"
          strokeLinecap="round"
          filter="url(#softBlur)"
          opacity="0.6"
        />
        
        {/* Layer 4 - Another thin curve */}
        <path 
          d="M-100,250 Q200,350 500,280 T1100,380 T1700,280 T2020,350" 
          fill="none"
          stroke="url(#blueFlow3)"
          strokeWidth="80"
          strokeLinecap="round"
          filter="url(#softBlur)"
          opacity="0.5"
        />
        
        {/* Very subtle additional curves */}
        <path 
          d="M100,320 Q400,420 700,340 T1300,440 T1920,340" 
          fill="none"
          stroke="#0038A8"
          strokeWidth="40"
          strokeLinecap="round"
          filter="url(#softBlur)"
          opacity="0.08"
        />
        
        {/* Gentle wave fill at top */}
        <path 
          d="M0,0 L0,150 Q240,220 480,180 T960,240 T1440,160 T1920,220 L1920,0 Z" 
          fill="#0038A8"
          fillOpacity="0.12"
          filter="url(#softBlur)"
        />
      </svg>
      
      {/* Bottom red/pink flowing lines */}
      <svg 
        className="absolute bottom-0 left-0 w-full h-[50vh] min-h-[300px]" 
        viewBox="0 0 1920 600" 
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Subtle red/pink gradients */}
          <linearGradient id="redFlow1" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#CE1126" stopOpacity="0.12" />
            <stop offset="50%" stopColor="#DC143C" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#FFB6C1" stopOpacity="0.04" />
          </linearGradient>
          <linearGradient id="redFlow2" x1="100%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#CE1126" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#FF6B6B" stopOpacity="0.06" />
          </linearGradient>
          <linearGradient id="redFlow3" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#DC143C" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#FFB3B3" stopOpacity="0.04" />
          </linearGradient>
        </defs>
        
        {/* Main flowing curves - Layer 1 (back) */}
        <path 
          d="M-100,600 Q200,500 400,520 T800,480 T1200,540 T1600,500 T2020,550 L2020,600 Z" 
          fill="url(#redFlow1)"
          filter="url(#softBlur)"
        />
        
        {/* Layer 2 */}
        <path 
          d="M-50,600 Q150,450 350,480 T750,420 T1150,500 T1550,440 T1970,520 L1970,600 Z" 
          fill="url(#redFlow2)"
          filter="url(#softBlur)"
        />
        
        {/* Layer 3 - Thin flowing line */}
        <path 
          d="M0,400 Q300,320 600,380 T1200,300 T1920,400" 
          fill="none"
          stroke="url(#redFlow1)"
          strokeWidth="60"
          strokeLinecap="round"
          filter="url(#softBlur)"
          opacity="0.5"
        />
        
        {/* Layer 4 - Another thin curve */}
        <path 
          d="M-100,350 Q200,250 500,320 T1100,220 T1700,320 T2020,250" 
          fill="none"
          stroke="url(#redFlow3)"
          strokeWidth="80"
          strokeLinecap="round"
          filter="url(#softBlur)"
          opacity="0.4"
        />
        
        {/* Very subtle additional curves */}
        <path 
          d="M100,280 Q400,180 700,260 T1300,160 T1920,260" 
          fill="none"
          stroke="#CE1126"
          strokeWidth="40"
          strokeLinecap="round"
          filter="url(#softBlur)"
          opacity="0.06"
        />
        
        {/* Gentle wave fill at bottom */}
        <path 
          d="M0,600 L0,450 Q240,380 480,420 T960,360 T1440,440 T1920,380 L1920,600 Z" 
          fill="#CE1126"
          fillOpacity="0.1"
          filter="url(#softBlur)"
        />
      </svg>
    </div>
  );
}
