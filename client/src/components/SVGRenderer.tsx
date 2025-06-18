import React from 'react';

interface SVGRendererProps {
  text: string;
  className?: string;
}

/**
 * Component that renders text with embedded SVG graphs properly displayed
 */
export const SVGRenderer: React.FC<SVGRendererProps> = ({ text, className }) => {
  // Split text into parts and identify SVG sections
  const renderContent = () => {
    if (!text) return null;

    // Look for SVG content between the figure markers
    const svgPattern = /\*\*Figure: Mathematical Visualization\*\*\s*\n\n(<svg[^]*?<\/svg>)\s*\n\n\*The above graph[^]*?\*\n\n/g;
    
    let lastIndex = 0;
    const parts: JSX.Element[] = [];
    let match;

    while ((match = svgPattern.exec(text)) !== null) {
      // Add text before the SVG
      if (match.index > lastIndex) {
        const beforeText = text.substring(lastIndex, match.index);
        if (beforeText.trim()) {
          parts.push(
            <div key={`text-${lastIndex}`} className="whitespace-pre-wrap">
              {beforeText}
            </div>
          );
        }
      }

      // Add the SVG as rendered content
      const svgContent = match[1];
      parts.push(
        <div key={`svg-${match.index}`} className="my-6 p-4 bg-gray-50 rounded-lg border">
          <div className="text-center mb-4">
            <h4 className="text-lg font-semibold text-gray-800">Mathematical Visualization</h4>
          </div>
          <div 
            className="flex justify-center"
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
          <div className="text-center mt-4 text-sm text-gray-600 italic">
            The above graph illustrates the mathematical relationship described in the analysis.
          </div>
        </div>
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text after the last SVG
    if (lastIndex < text.length) {
      const remainingText = text.substring(lastIndex);
      if (remainingText.trim()) {
        parts.push(
          <div key={`text-${lastIndex}`} className="whitespace-pre-wrap">
            {remainingText}
          </div>
        );
      }
    }

    // If no SVG found, return original text
    if (parts.length === 0) {
      return <div className="whitespace-pre-wrap">{text}</div>;
    }

    return <>{parts}</>;
  };

  return (
    <div className={className}>
      {renderContent()}
    </div>
  );
};