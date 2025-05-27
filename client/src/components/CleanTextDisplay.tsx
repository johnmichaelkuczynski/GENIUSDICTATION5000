import React, { useMemo } from 'react';
import { MathRenderer } from './MathRenderer';

interface CleanTextDisplayProps {
  text: string;
  className?: string;
}

/**
 * Component that displays text with markdown formatting removed and LaTeX math rendered
 */
export const CleanTextDisplay: React.FC<CleanTextDisplayProps> = ({ text, className }) => {
  // Clean the text by removing markdown formatting while preserving math notation
  const cleanedText = useMemo(() => {
    if (!text) return '';
    
    // Process the text to remove markdown formatting
    let processed = text;
    
    // Remove bold formatting (but preserve LaTeX commands)
    processed = processed.replace(/\*\*(?!.*\$)(.*?)(?!\$.*)\*\*/g, '$1');
    
    // Remove italic formatting (but preserve LaTeX commands)
    processed = processed.replace(/\*(?!.*\$)(.*?)(?!\$.*)\*/g, '$1');
    
    // Remove headings (# Heading)
    processed = processed.replace(/#{1,6}\s/g, '');
    
    // Remove code blocks and inline code (but preserve LaTeX math)
    processed = processed.replace(/`{1,3}(?!.*\$)(.*?)(?!\$.*)`{1,3}/g, '$1');
    
    // Remove block quotes
    processed = processed.replace(/>\s/g, '');
    
    // Remove horizontal rules
    processed = processed.replace(/---/g, '');
    processed = processed.replace(/___/g, '');
    
    // Keep the line breaks for readability
    return processed;
  }, [text]);
  
  // Check if text contains LaTeX math notation
  const containsMath = useMemo(() => {
    return /\$.*?\$|\\\(.*?\\\)|\\\[.*?\\\]|\\begin\{.*?\}.*?\\end\{.*?\}/.test(cleanedText);
  }, [cleanedText]);
  
  return (
    <div className={className}>
      {containsMath ? (
        <MathRenderer text={cleanedText} />
      ) : (
        cleanedText
      )}
    </div>
  );
};