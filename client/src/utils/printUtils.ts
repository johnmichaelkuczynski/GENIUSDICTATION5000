/**
 * Utility functions for printing and PDF generation
 */

export interface PrintOptions {
  title?: string;
  includeDate?: boolean;
  fontSize?: 'small' | 'medium' | 'large';
  margins?: 'narrow' | 'normal' | 'wide';
}

/**
 * Open a print-optimized window with the content
 */
export function openPrintWindow(content: string, options: PrintOptions = {}): void {
  const {
    title = 'Document',
    includeDate = true,
    fontSize = 'medium',
    margins = 'normal'
  } = options;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to use the print function');
    return;
  }

  const currentDate = new Date().toLocaleDateString();
  
  const fontSizeMap = {
    small: '12px',
    medium: '14px',
    large: '16px'
  };

  const marginMap = {
    narrow: '1cm',
    normal: '2cm',
    wide: '3cm'
  };

  const htmlContent = `
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
          margin: ${marginMap[margins]};
          size: A4;
        }
        
        @media print {
          body {
            font-family: 'Times New Roman', serif;
            font-size: ${fontSizeMap[fontSize]};
            line-height: 1.6;
            color: #000;
            background: white;
          }
          
          .no-print {
            display: none !important;
          }
          
          .page-break {
            page-break-before: always;
          }
          
          .page-break-avoid {
            page-break-inside: avoid;
          }
        }
        
        body {
          font-family: 'Times New Roman', serif;
          font-size: ${fontSizeMap[fontSize]};
          line-height: 1.6;
          margin: 0;
          padding: 20px;
          background: white;
          color: #000;
        }
        
        .header {
          text-align: center;
          margin-bottom: 2em;
          border-bottom: 1px solid #ccc;
          padding-bottom: 1em;
        }
        
        .title {
          font-size: 1.5em;
          font-weight: bold;
          margin-bottom: 0.5em;
        }
        
        .date {
          font-size: 0.9em;
          color: #666;
        }
        
        .content {
          white-space: pre-wrap;
          word-wrap: break-word;
        }
        
        .math-display {
          text-align: center;
          margin: 1em 0;
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
        
        .graph-container {
          text-align: center;
          margin: 2em 0;
          page-break-inside: avoid;
          border: 1px solid #ddd;
          padding: 1em;
          border-radius: 5px;
        }
        
        .graph-title {
          font-weight: bold;
          margin-bottom: 1em;
        }
        
        .graph-caption {
          font-style: italic;
          margin-top: 1em;
          font-size: 0.9em;
          color: #666;
        }
        
        svg {
          max-width: 100%;
          height: auto;
        }
        
        h1, h2, h3, h4, h5, h6 {
          page-break-after: avoid;
          margin-top: 1.5em;
          margin-bottom: 0.5em;
        }
        
        p {
          margin-bottom: 1em;
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
        ${includeDate ? `<div class="date">${currentDate}</div>` : ''}
      </div>
      
      <div class="content">${processContentForPrint(content)}</div>
      
      <script>
        document.addEventListener("DOMContentLoaded", function() {
          // Initialize KaTeX rendering
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
          
          // Auto-print after a short delay for better rendering
          setTimeout(() => {
            const shouldAutoPrint = new URLSearchParams(window.location.search).get('autoprint');
            if (shouldAutoPrint === 'true') {
              window.print();
            }
          }, 1000);
        });
        
        // Handle print dialog
        window.addEventListener('afterprint', function() {
          const closeAfterPrint = new URLSearchParams(window.location.search).get('close');
          if (closeAfterPrint === 'true') {
            window.close();
          }
        });
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
  printWindow.focus();
}

/**
 * Process content for print formatting
 */
function processContentForPrint(content: string): string {
  let processedContent = content;
  
  // Process SVG graphs for print
  processedContent = processedContent.replace(
    /\*\*Figure: Mathematical Visualization\*\*\s*\n\n(<svg[^]*?<\/svg>)\s*\n\n\*The above graph[^]*?\*\n\n/g,
    (match, svgContent) => {
      return `<div class="graph-container page-break-avoid">
        <div class="graph-title">Mathematical Visualization</div>
        ${svgContent}
        <div class="graph-caption">The above graph illustrates the mathematical relationship described in the analysis.</div>
      </div>`;
    }
  );
  
  // Convert markdown headers to HTML
  processedContent = processedContent.replace(/^### (.*$)/gm, '<h3>$1</h3>');
  processedContent = processedContent.replace(/^## (.*$)/gm, '<h2>$1</h2>');
  processedContent = processedContent.replace(/^# (.*$)/gm, '<h1>$1</h1>');
  
  // Convert paragraphs
  processedContent = processedContent.replace(/\n\n/g, '</p><p>');
  processedContent = '<p>' + processedContent + '</p>';
  
  // Clean up empty paragraphs
  processedContent = processedContent.replace(/<p><\/p>/g, '');
  processedContent = processedContent.replace(/<p>\s*<\/p>/g, '');
  
  return processedContent;
}

/**
 * Quick print function for immediate use
 */
export function quickPrint(content: string, title?: string): void {
  openPrintWindow(content, { 
    title: title || 'Document',
    includeDate: true,
    fontSize: 'medium',
    margins: 'normal'
  });
}