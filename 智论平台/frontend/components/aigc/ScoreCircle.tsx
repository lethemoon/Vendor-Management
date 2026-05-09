'use client';

import { useState, useEffect, useRef } from 'react';

interface ScoreCircleProps {
  score: number;
  riskLevel: 'low' | 'medium' | 'medium-high' | 'high';
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
  animated?: boolean;
}

export default function ScoreCircle({
  score,
  riskLevel,
  size = 180,
  strokeWidth = 12,
  showLabel = true,
  animated = true,
}: ScoreCircleProps) {
  const [displayScore, setDisplayScore] = useState(0);
  const [animatedOffset, setAnimatedOffset] = useState(size * Math.PI);
  const animationRef = useRef<number | null>(null);
  
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const targetOffset = circumference - (score / 100) * circumference;

  const getScoreColor = () => {
    if (score <= 20) return '#22C55E';
    if (score <= 40) return '#EAB308';
    if (score <= 60) return '#F97316';
    return '#EF4444';
  };

  const getRiskLabel = () => {
    switch (riskLevel) {
      case 'low': return '安全';
      case 'medium': return '注意';
      case 'medium-high': return '警告';
      case 'high': return '高危';
      default: return '未知';
    }
  };

  const getRiskBadgeColor = () => {
    switch (riskLevel) {
      case 'low': return 'bg-green-100 text-green-700 border-green-300';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'medium-high': return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'high': return 'bg-red-100 text-red-700 border-red-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  useEffect(() => {
    if (!animated) {
      setDisplayScore(score);
      setAnimatedOffset(targetOffset);
      return;
    }

    let startTime: number | null = null;
    const duration = 1500;

    const animateScore = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setDisplayScore(Math.round(easeOutQuart * score));
      setAnimatedOffset(circumference - easeOutQuart * (score / 100) * circumference);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animateScore);
      }
    };

    animationRef.current = requestAnimationFrame(animateScore);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [score, animated]);

  const color = getScoreColor();

  return (
    <div className="flex flex-col items-center justify-center" style={{ width: size, height: size }}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#E5E7EB"
            strokeWidth={strokeWidth}
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={animatedOffset}
            strokeLinecap="round"
            className="transition-all duration-300"
            style={{
              filter: `drop-shadow(0 0 6px ${color}40)`,
            }}
          />
        </svg>
        
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-bold tracking-tight"
            style={{
              fontSize: size * 0.22,
              color,
              lineHeight: 1,
            }}
          >
            {displayScore}%
          </span>
          
          {showLabel && (
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full border mt-1 ${getRiskBadgeColor()}`}
              style={{ fontSize: size * 0.07 }}
            >
              {getRiskLabel()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
