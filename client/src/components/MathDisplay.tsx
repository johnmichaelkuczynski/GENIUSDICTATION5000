import { useEffect, useRef } from 'react';

interface MathDisplayProps {
  text: string;
  className?: string;
}

export function MathDisplay({ text, className = '' }: MathDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div className={`whitespace-pre-wrap ${className}`}>
      {text}
    </div>
  );
}