import { MathJax } from 'better-react-mathjax';

interface MathDisplayProps {
  text: string;
  className?: string;
}

export function MathDisplay({ text, className = '' }: MathDisplayProps) {
  // Remove all markdown formatting and convert to clean text with proper LaTeX
  const cleanText = text
    // Remove markdown headers
    .replace(/^#{1,6}\s+/gm, '')
    // Remove markdown bold/italic
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    // Remove markdown code blocks
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    // Clean up extra whitespace
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();

  return (
    <div className={`whitespace-pre-wrap text-black bg-white leading-relaxed ${className}`} style={{ color: '#000', backgroundColor: '#fff' }}>
      <MathJax>{cleanText}</MathJax>
    </div>
  );
}