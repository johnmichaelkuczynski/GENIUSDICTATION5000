import * as mammoth from 'mammoth';
import { PDFDocument } from 'pdf-lib';
import { PDFExtract, PDFExtractOptions } from 'pdf.js-extract';
import * as docx from 'docx';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { PDFDocument as PDFLib } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

/**
 * Extract text from various document formats
 * @param documentBuffer The document buffer
 * @param fileName The document file name
 * @param fileType The document MIME type
 * @returns The extracted text
 */
export async function extractTextFromDocument(
  documentBuffer: Buffer,
  fileName: string,
  fileType: string
): Promise<string> {
  try {
    // Extract text based on document type
    if (fileType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')) {
      return extractTextFromPDF(documentBuffer);
    } else if (
      fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      fileName.toLowerCase().endsWith('.docx')
    ) {
      return extractTextFromDOCX(documentBuffer);
    } else if (fileType === 'text/plain' || fileName.toLowerCase().endsWith('.txt')) {
      return documentBuffer.toString('utf-8');
    } else {
      throw new Error(`Unsupported file type: ${fileType}`);
    }
  } catch (error) {
    console.error('Error extracting text from document:', error);
    throw new Error(`Failed to extract text: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Extract text from PDF document
 * @param pdfBuffer The PDF document buffer
 * @returns The extracted text
 */
async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
  try {
    // Create a temporary file for the PDF
    const tempFilePath = `/tmp/pdf-${Date.now()}.pdf`;
    fs.writeFileSync(tempFilePath, pdfBuffer);

    const pdfExtract = new PDFExtract();
    const options: PDFExtractOptions = {};
    
    const data = await pdfExtract.extract(tempFilePath, options);
    
    // Clean up the temporary file
    fs.unlinkSync(tempFilePath);
    
    // Combine all page content
    let text = '';
    data.pages.forEach(page => {
      page.content.forEach(item => {
        text += item.str + ' ';
      });
      text += '\n\n';
    });
    
    return text.trim();
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error(`PDF text extraction failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Extract text from DOCX document
 * @param docxBuffer The DOCX document buffer
 * @returns The extracted text
 */
async function extractTextFromDOCX(docxBuffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer: docxBuffer });
    return result.value;
  } catch (error) {
    console.error('Error extracting text from DOCX:', error);
    throw new Error(`DOCX text extraction failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Generate document in various formats
 * @param text The text content
 * @param format The target format (txt, docx, pdf)
 * @param fileName The output file name (without extension)
 * @returns Buffer containing the generated document
 */
export async function generateDocument(
  text: string,
  format: 'txt' | 'docx' | 'pdf',
  fileName: string = 'document'
): Promise<Buffer> {
  try {
    switch (format) {
      case 'txt':
        return Buffer.from(text, 'utf-8');
      
      case 'docx':
        return generateDOCX(text, fileName);
      
      case 'pdf':
        // For PDF, we'll return HTML content that can be printed by the browser
        return generatePrintableHTML(text, fileName);
      
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  } catch (error) {
    console.error(`Error generating ${format} document:`, error);
    throw new Error(`Document generation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Generate a DOCX document
 * @param text The text content
 * @param fileName The output file name
 * @returns Buffer containing the DOCX document
 */
async function generateDOCX(text: string, fileName: string): Promise<Buffer> {
  try {
    // Split text into paragraphs
    const paragraphs = text.split('\n').map(paragraph => {
      return new Paragraph({
        children: [new TextRun(paragraph.trim() || ' ')],
      });
    });

    // Create document
    const doc = new Document({
      sections: [{
        properties: {},
        children: paragraphs
      }]
    });

    // Generate document as buffer
    return await Packer.toBuffer(doc);
  } catch (error) {
    console.error('Error generating DOCX:', error);
    throw new Error(`DOCX generation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Generate a PDF document with proper LaTeX math rendering
 * @param text The text content with LaTeX notation
 * @param fileName The output file name
 * @returns Buffer containing the PDF document
 */
/**
 * Generate printable HTML content for browser's native PDF functionality
 * @param text The text content with LaTeX notation
 * @param fileName The output file name
 * @returns Buffer containing the HTML content
 */
async function generatePrintableHTML(text: string, fileName: string): Promise<Buffer> {
  try {
    // Create HTML content with KaTeX for math rendering
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${fileName}</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
        <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
        <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>
        <style>
          @media print {
            body { margin: 0.5in; }
            .no-print { display: none; }
          }
          body {
            font-family: 'Times New Roman', serif;
            font-size: 12pt;
            line-height: 1.6;
            margin: 1in;
            color: #000;
            max-width: none;
            background: white;
          }
          h1, h2, h3 {
            color: #000;
            margin-top: 1.5em;
            margin-bottom: 0.5em;
            page-break-after: avoid;
          }
          p {
            margin-bottom: 1em;
            text-align: justify;
            orphans: 3;
            widows: 3;
          }
          .katex {
            font-size: 1em;
            color: #000;
          }
          .katex-display {
            margin: 1em 0;
            page-break-inside: avoid;
          }
          .print-button {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #007bff;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            z-index: 1000;
          }
          .print-button:hover {
            background: #0056b3;
          }
        </style>
      </head>
      <body>
        <button class="print-button no-print" onclick="window.print()">Print / Save as PDF</button>
        ${text.split('\n').map(line => 
          line.trim() ? `<p>${line.trim()}</p>` : ''
        ).join('')}
        
        <script>
          document.addEventListener("DOMContentLoaded", function() {
            renderMathInElement(document.body, {
              delimiters: [
                {left: "$$", right: "$$", display: true},
                {left: "$", right: "$", display: false},
                {left: "\\\\[", right: "\\\\]", display: true},
                {left: "\\\\(", right: "\\\\)", display: false}
              ],
              throwOnError: false
            });
          });
        </script>
      </body>
      </html>
    `;
    
    return Buffer.from(htmlContent, 'utf-8');
  } catch (error) {
    console.error('Error generating printable HTML:', error);
    throw new Error('Failed to generate printable HTML document');
  }
}

/**
 * Convert LaTeX math notation to readable text for PDF
 */
function convertLaTeXForPDF(text: string): string {
  let converted = text;
  
  // Convert common LaTeX math symbols to Unicode
  const latexMappings: Record<string, string> = {
    '\\lim': 'lim',
    '\\to': '→',
    '\\infty': '∞',
    '\\frac': '',
    '\\left': '',
    '\\right': '',
    '\\{': '{',
    '\\}': '}',
    '\\[': '',
    '\\]': '',
    '\\(': '',
    '\\)': '',
    '\\cdot': '·',
    '\\times': '×',
    '\\div': '÷',
    '\\pm': '±',
    '\\mp': '∓',
    '\\leq': '≤',
    '\\geq': '≥',
    '\\neq': '≠',
    '\\approx': '≈',
    '\\equiv': '≡',
    '\\alpha': 'α',
    '\\beta': 'β',
    '\\gamma': 'γ',
    '\\delta': 'δ',
    '\\epsilon': 'ε',
    '\\theta': 'θ',
    '\\lambda': 'λ',
    '\\mu': 'μ',
    '\\pi': 'π',
    '\\sigma': 'σ',
    '\\tau': 'τ',
    '\\phi': 'φ',
    '\\omega': 'ω',
    '\\partial': '∂',
    '\\nabla': '∇',
    '\\sum': '∑',
    '\\prod': '∏',
    '\\int': '∫',
    '\\sqrt': '√',
    '^2': '²',
    '^3': '³',
    '_1': '₁',
    '_2': '₂',
    '_3': '₃',
    '_n': 'ₙ',
    '_x': 'ₓ',
    '_i': 'ᵢ',
    '_j': 'ⱼ'
  };
  
  // Apply mappings
  for (const [latex, unicode] of Object.entries(latexMappings)) {
    converted = converted.replace(new RegExp(latex.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), unicode);
  }
  
  // Handle fractions - convert \frac{a}{b} to a/b
  converted = converted.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)');
  
  // Clean up remaining LaTeX artifacts
  converted = converted.replace(/\$+/g, ''); // Remove dollar signs
  converted = converted.replace(/\\[a-zA-Z]+/g, ''); // Remove remaining LaTeX commands
  converted = converted.replace(/[{}]/g, ''); // Remove remaining braces
  converted = converted.replace(/\s+/g, ' ').trim(); // Clean up whitespace
  
  return converted;
}
/**
 * Generate a formatted assessment report document
 * @param text The report content
 * @param format The target format (txt, docx, pdf)
 * @param fileName The output file name (without extension)
 * @returns Buffer containing the generated document
 */
export async function generateAssessmentReport(
  text: string,
  format: 'txt' | 'docx' | 'pdf',
  fileName: string = 'intelligence-assessment'
): Promise<Buffer> {
  try {
    switch (format) {
      case 'txt':
        return Buffer.from(text, 'utf-8');
      
      case 'docx':
        return generateFormattedDOCX(text, fileName);
      
      case 'pdf':
        return generateFormattedPDF(text, fileName);
      
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  } catch (error) {
    console.error(`Error generating ${format} assessment report:`, error);
    throw new Error(`Report generation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Generate a professionally formatted DOCX document for assessment reports
 * @param text The report content
 * @param fileName The output file name
 * @returns Buffer containing the DOCX document
 */
async function generateFormattedDOCX(text: string, fileName: string): Promise<Buffer> {
  try {
    // Parse report sections
    const sections = text.split('==================================').map(section => section.trim());
    const title = sections[0] || 'INTELLIGENCE ASSESSMENT REPORT';
    
    // Create paragraphs with formatting based on content structure
    const paragraphs: Paragraph[] = [];
    
    // Add title
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'INTELLIGENCE ASSESSMENT REPORT',
            bold: true,
            size: 32, // 16pt
          }),
        ],
        spacing: {
          after: 300,
        },
      })
    );
    
    // Add date 
    const dateMatch = text.match(/Date: (.*)/);
    if (dateMatch && dateMatch[1]) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Date: ${dateMatch[1]}`,
              size: 24, // 12pt
            }),
          ],
          spacing: {
            after: 400,
          },
        })
      );
    }
    
    // Process each section
    sections.forEach((section) => {
      // Skip empty sections
      if (!section.trim()) return;
      
      // Extract section title if available
      const lines = section.split('\n');
      if (lines.length > 0) {
        const sectionTitle = lines[0].trim();
        
        // Add section title as heading
        if (sectionTitle && !sectionTitle.startsWith('Date:')) {
          paragraphs.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: sectionTitle,
                  bold: true,
                  size: 28, // 14pt
                }),
              ],
              spacing: {
                before: 400,
                after: 200,
              },
            })
          );
        }
        
        // Add section content
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line) {
            // Check if it's a subsection
            if (line.includes(':') && line.length < 50 && !line.startsWith('•') && !line.startsWith('-')) {
              paragraphs.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: line,
                      bold: true,
                      size: 24, // 12pt
                    }),
                  ],
                  spacing: {
                    before: 200,
                    after: 100,
                  },
                })
              );
            } else {
              // Regular paragraph
              paragraphs.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: line,
                      size: 24, // 12pt
                    }),
                  ],
                  spacing: {
                    after: 100,
                  },
                })
              );
            }
          } else {
            // Add empty line for spacing
            paragraphs.push(
              new Paragraph({
                children: [new TextRun('')],
                spacing: { after: 100 },
              })
            );
          }
        }
      }
    });

    // Create document
    const doc = new Document({
      sections: [{
        properties: {},
        children: paragraphs
      }]
    });

    // Generate document as buffer
    return await Packer.toBuffer(doc);
  } catch (error) {
    console.error('Error generating formatted DOCX:', error);
    throw new Error(`Formatted DOCX generation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Generate a professionally formatted PDF document for assessment reports
 * @param text The report content
 * @param fileName The output file name
 * @returns Buffer containing the PDF document
 */
async function generateFormattedPDF(text: string, fileName: string): Promise<Buffer> {
  try {
    // Create a new PDF document
    const pdfDoc = await PDFLib.create();
    const page = pdfDoc.addPage([612, 792]); // US Letter
    
    // Set page dimensions
    const { width, height } = page.getSize();
    
    // Add text to the page
    const fontSize = 12;
    const margin = 50;
    const maxWidth = width - 2 * margin;
    
    // Split text into lines that fit within page width
    const lines: string[] = [];
    const paragraphs = text.split('\n');
    
    for (const paragraph of paragraphs) {
      // Simple text wrapping logic - this is a basic approach
      // For more sophisticated text layout, consider using a library
      // that handles proper text wrapping
      let currentLine = '';
      const words = paragraph.split(' ');
      
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const estimatedWidth = testLine.length * (fontSize * 0.6); // Rough estimate
        
        if (estimatedWidth > maxWidth) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      
      if (currentLine) {
        lines.push(currentLine);
      }
      
      // Add empty line between paragraphs
      if (paragraph.trim()) {
        lines.push('');
      }
    }
    
    // Draw text on page
    let y = height - margin;
    for (const line of lines) {
      if (y < margin) {
        // Add a new page if we reach the bottom margin
        const newPage = pdfDoc.addPage();
        y = newPage.getSize().height - margin;
      }
      
      page.drawText(line, {
        x: margin,
        y,
        size: fontSize
      });
      
      y -= fontSize * 1.5; // Line spacing
    }
    
    // Serialize the PDF to bytes
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error(`PDF generation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
