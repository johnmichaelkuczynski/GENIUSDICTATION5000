import { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathDisplayProps {
  text: string;
  className?: string;
}

export function MathDisplay({ text, className = '' }: MathDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Process the text to render LaTeX math expressions
    const processedText = renderMathInText(text);
    containerRef.current.innerHTML = processedText;
  }, [text]);

  return (
    <div 
      ref={containerRef}
      className={`math-display whitespace-pre-wrap ${className}`}
    />
  );
}

function renderMathInText(text: string): string {
  // Match inline math $...$ and display math $$...$$
  const mathRegex = /(\$\$[\s\S]*?\$\$|\$[^$\n]*?\$)/g;
  
  return text.replace(mathRegex, (match) => {
    try {
      const isDisplayMath = match.startsWith('$$');
      const mathContent = isDisplayMath 
        ? match.slice(2, -2).trim()
        : match.slice(1, -1).trim();
      
      const rendered = katex.renderToString(mathContent, {
        displayMode: isDisplayMath,
        throwOnError: false,
        strict: false
      });
      
      return rendered;
    } catch (error) {
      // If LaTeX rendering fails, return the original text
      return match;
    }
  });
}

export { renderMathInText };