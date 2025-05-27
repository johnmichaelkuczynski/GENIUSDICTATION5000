/**
 * Component for rendering LaTeX math expressions using KaTeX
 */
import { useEffect, useRef } from 'react';
import 'katex/dist/katex.min.css';
import katex from 'katex';

interface MathRendererProps {
  text: string;
  className?: string;
}

/**
 * Renders text with LaTeX math expressions using KaTeX
 */
export function MathRenderer({ text, className = "" }: MathRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !text) return;

    const container = containerRef.current;
    
    try {
      // Split text by math delimiters
      const parts = splitMathText(text);
      container.innerHTML = '';

      parts.forEach(part => {
        if (part.type === 'math') {
          const mathElement = document.createElement('span');
          try {
            katex.render(part.content, mathElement, {
              displayMode: part.display,
              throwOnError: false,
              errorColor: '#cc0000',
              strict: false
            });
          } catch (error) {
            // Fallback to showing the raw LaTeX if rendering fails
            mathElement.textContent = part.display ? `$$${part.content}$$` : `$${part.content}$`;
            mathElement.style.color = '#cc0000';
          }
          container.appendChild(mathElement);
        } else {
          const textElement = document.createElement('span');
          textElement.textContent = part.content;
          container.appendChild(textElement);
        }
      });
    } catch (error) {
      // Fallback: just show the raw text
      container.textContent = text;
    }
  }, [text]);

  return <div ref={containerRef} className={`math-renderer ${className}`} />;
}

interface TextPart {
  type: 'text' | 'math';
  content: string;
  display: boolean;
}

/**
 * Split text into math and non-math parts
 */
function splitMathText(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let currentIndex = 0;

  // Regex to match $$ display math $$ and $ inline math $
  const mathRegex = /(\$\$[\s\S]*?\$\$|\$[^$\n]*?\$)/g;
  let match;

  while ((match = mathRegex.exec(text)) !== null) {
    // Add text before the math
    if (match.index > currentIndex) {
      const textContent = text.slice(currentIndex, match.index);
      if (textContent) {
        parts.push({
          type: 'text',
          content: textContent,
          display: false
        });
      }
    }

    // Add the math part
    const fullMatch = match[1];
    const isDisplay = fullMatch.startsWith('$$');
    const mathContent = isDisplay 
      ? fullMatch.slice(2, -2) // Remove $$ from both ends
      : fullMatch.slice(1, -1); // Remove $ from both ends

    parts.push({
      type: 'math',
      content: mathContent,
      display: isDisplay
    });

    currentIndex = match.index + fullMatch.length;
  }

  // Add remaining text
  if (currentIndex < text.length) {
    const remainingText = text.slice(currentIndex);
    if (remainingText) {
      parts.push({
        type: 'text',
        content: remainingText,
        display: false
      });
    }
  }

  return parts;
}