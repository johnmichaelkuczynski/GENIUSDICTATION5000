import React, { useMemo } from 'react';

interface CleanTextDisplayProps {
  text: string;
  className?: string;
}

/**
 * Component that displays text with markdown formatting removed
 */
export const CleanTextDisplay: React.FC<CleanTextDisplayProps> = ({ text, className }) => {
  // Clean the text by removing markdown formatting
  const cleanedText = useMemo(() => {
    if (!text) return '';
    
    // Process the text to remove markdown formatting
    let processed = text;
    
    // Remove bold formatting
    processed = processed.replace(/\*\*/g, '');
    
    // Remove italic formatting
    processed = processed.replace(/\*/g, '');
    
    // Remove headings (# Heading)
    processed = processed.replace(/#{1,6}\s/g, '');
    
    // Remove code blocks and inline code
    processed = processed.replace(/`{1,3}/g, '');
    
    // Remove block quotes
    processed = processed.replace(/>\s/g, '');
    
    // Remove horizontal rules
    processed = processed.replace(/---/g, '');
    processed = processed.replace(/___/g, '');
    
    // Keep the line breaks for readability
    return processed;
  }, [text]);
  
  return (
    <div className={className}>
      {cleanedText}
    </div>
  );
};