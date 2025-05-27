import { MathJax } from 'better-react-mathjax';

interface MathDisplayProps {
  text: string;
  className?: string;
}

export function MathDisplay({ text, className = '' }: MathDisplayProps) {
  return (
    <div className={`whitespace-pre-wrap ${className}`}>
      <MathJax>{text}</MathJax>
    </div>
  );
}