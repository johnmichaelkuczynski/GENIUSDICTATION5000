/**
 * Utility functions for extracting and processing SVG graphs from text
 */

export interface ExtractedGraph {
  svg: string;
  title: string;
  caption: string;
}

/**
 * Extract SVG graphs from text content
 */
export function extractGraphsFromText(text: string): ExtractedGraph[] {
  const graphs: ExtractedGraph[] = [];
  
  // Pattern to match SVG graphs with their surrounding context
  const svgPattern = /\*\*Figure: Mathematical Visualization\*\*\s*\n\n(<svg[^]*?<\/svg>)\s*\n\n\*The above graph[^]*?\*\n\n/g;
  
  let match;
  let graphIndex = 1;
  
  while ((match = svgPattern.exec(text)) !== null) {
    const svgContent = match[1];
    
    // Extract title from SVG if available
    const titleMatch = svgContent.match(/<text[^>]*class="graph-title"[^>]*>([^<]+)<\/text>/);
    const title = titleMatch ? titleMatch[1] : `Mathematical Visualization ${graphIndex}`;
    
    graphs.push({
      svg: svgContent,
      title: title,
      caption: "The above graph illustrates the mathematical relationship described in the analysis."
    });
    
    graphIndex++;
  }
  
  return graphs;
}

/**
 * Remove graphs from text content, leaving clean text
 */
export function removeGraphsFromText(text: string): string {
  const svgPattern = /\*\*Figure: Mathematical Visualization\*\*\s*\n\n<svg[^]*?<\/svg>\s*\n\n\*The above graph[^]*?\*\n\n/g;
  return text.replace(svgPattern, '').trim();
}

/**
 * Generate HTML for graphs section
 */
export function generateGraphsHTML(graphs: ExtractedGraph[]): string {
  if (graphs.length === 0) {
    return '';
  }

  return `
    <div class="graphs-section">
      <h2 style="text-align: center; margin-bottom: 2em; font-size: 1.5em; font-weight: bold;">Mathematical Visualizations</h2>
      ${graphs.map((graph, index) => `
        <div class="graph-container" style="margin: 3em 0; page-break-inside: avoid; text-align: center; border: 1px solid #ddd; padding: 2em; border-radius: 8px;">
          <h3 style="margin-bottom: 1em; font-size: 1.2em; font-weight: bold;">${graph.title}</h3>
          <div class="graph-content" style="margin: 1em 0;">
            ${graph.svg}
          </div>
          <p style="margin-top: 1em; font-style: italic; color: #666; font-size: 0.9em;">${graph.caption}</p>
        </div>
      `).join('')}
    </div>
  `;
}

/**
 * Generate combined document HTML with graphs first, then text
 */
export function generateCombinedDocumentHTML(
  text: string, 
  graphs: ExtractedGraph[], 
  title: string = "Mathematical Document"
): string {
  const cleanText = removeGraphsFromText(text);
  const graphsHTML = generateGraphsHTML(graphs);
  const currentDate = new Date().toLocaleDateString();

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
      <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
      <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>
      <style>
        @page {
          margin: 2cm;
          size: A4;
        }
        
        @media print {
          .no-print { display: none !important; }
          .page-break { page-break-before: always; }
          .page-break-avoid { page-break-inside: avoid; }
        }
        
        body {
          font-family: 'Times New Roman', serif;
          font-size: 14px;
          line-height: 1.6;
          margin: 0;
          padding: 20px;
          background: white;
          color: #000;
        }
        
        .header {
          text-align: center;
          margin-bottom: 3em;
          border-bottom: 2px solid #333;
          padding-bottom: 1em;
        }
        
        .title {
          font-size: 2em;
          font-weight: bold;
          margin-bottom: 0.5em;
        }
        
        .date {
          font-size: 1em;
          color: #666;
        }
        
        .graphs-section {
          margin-bottom: 4em;
        }
        
        .text-section {
          white-space: pre-wrap;
          word-wrap: break-word;
        }
        
        .graph-container {
          margin: 3em 0;
          page-break-inside: avoid;
          text-align: center;
          border: 1px solid #ddd;
          padding: 2em;
          border-radius: 8px;
          background: #fafafa;
        }
        
        svg {
          max-width: 100%;
          height: auto;
        }
        
        .print-controls {
          position: fixed;
          top: 20px;
          right: 20px;
          background: #007bff;
          color: white;
          border: none;
          padding: 15px 25px;
          border-radius: 5px;
          cursor: pointer;
          font-size: 16px;
          z-index: 1000;
          box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        }
        
        .print-controls:hover {
          background: #0056b3;
        }
        
        h1, h2, h3, h4, h5, h6 {
          page-break-after: avoid;
          margin-top: 1.5em;
          margin-bottom: 0.5em;
        }
        
        .katex {
          font-size: 1em;
        }
        
        .katex-display {
          margin: 1em 0;
          page-break-inside: avoid;
        }
      </style>
    </head>
    <body>
      <button class="print-controls no-print" onclick="window.print()">
        🖨️ Print / Save as PDF
      </button>
      
      <div class="header">
        <div class="title">${title}</div>
        <div class="date">${currentDate}</div>
      </div>
      
      ${graphsHTML}
      
      ${graphs.length > 0 ? '<div class="page-break"></div>' : ''}
      
      <div class="text-section">
        <h2 style="margin-bottom: 1em;">Analysis</h2>
        ${processTextForPrint(cleanText)}
      </div>
      
      <script>
        document.addEventListener("DOMContentLoaded", function() {
          if (window.renderMathInElement) {
            renderMathInElement(document.body, {
              delimiters: [
                {left: "$$", right: "$$", display: true},
                {left: "$", right: "$", display: false},
                {left: "\\\\[", right: "\\\\]", display: true},
                {left: "\\\\(", right: "\\\\)", display: false}
              ],
              throwOnError: false
            });
          }
        });
      </script>
    </body>
    </html>
  `;
}

/**
 * Process text content for print display
 */
function processTextForPrint(text: string): string {
  let processedText = text;
  
  // Convert LaTeX expressions to readable format
  processedText = processedText
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)')
    .replace(/\\beta/g, 'β')
    .replace(/\\gamma/g, 'γ')
    .replace(/\\alpha/g, 'α')
    .replace(/\\delta/g, 'δ')
    .replace(/\\lambda/g, 'λ')
    .replace(/\\mu/g, 'μ')
    .replace(/\\sigma/g, 'σ')
    .replace(/\\theta/g, 'θ')
    .replace(/\\phi/g, 'φ')
    .replace(/\\psi/g, 'ψ')
    .replace(/\\omega/g, 'ω')
    .replace(/\\pi/g, 'π');
  
  // Convert markdown headers to HTML
  processedText = processedText.replace(/^### (.*$)/gm, '<h3>$1</h3>');
  processedText = processedText.replace(/^## (.*$)/gm, '<h2>$1</h2>');
  processedText = processedText.replace(/^# (.*$)/gm, '<h1>$1</h1>');
  
  // Convert paragraphs
  processedText = processedText.replace(/\n\n/g, '</p><p>');
  processedText = '<p>' + processedText + '</p>';
  
  // Clean up empty paragraphs
  processedText = processedText.replace(/<p><\/p>/g, '');
  processedText = processedText.replace(/<p>\s*<\/p>/g, '');
  
  return processedText;
}