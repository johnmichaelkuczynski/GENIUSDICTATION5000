/**
 * OCR service using Tesseract for reliable text and math extraction
 */
import tesseract from 'node-tesseract-ocr';
import sharp from 'sharp';

/**
 * Extract text from image using Tesseract OCR
 * @param imageBuffer The image buffer
 * @returns Extracted text
 */
export async function extractTextWithTesseract(imageBuffer: Buffer): Promise<string> {
  try {
    // Preprocess image for better OCR accuracy
    const processedImageBuffer = await sharp(imageBuffer)
      .greyscale()
      .normalize()
      .sharpen()
      .png()
      .toBuffer();

    // Configure Tesseract for best text + math recognition
    const config = {
      lang: 'eng',
      oem: 1,
      psm: 6, // Uniform block of text
      tessjs_create_hocr: '0',
      tessjs_create_tsv: '0',
      preserve_interword_spaces: '1'
    };

    const text = await tesseract.recognize(processedImageBuffer, config);
    
    if (!text || text.trim().length === 0) {
      throw new Error('No text could be extracted from the image');
    }

    // Clean up the extracted text
    const cleanedText = text
      .replace(/\n\s*\n/g, '\n\n') // Clean up excessive newlines
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();

    return cleanedText;

  } catch (error: any) {
    console.error('Tesseract OCR error:', error);
    throw new Error(`OCR extraction failed: ${error.message}`);
  }
}

/**
 * Process mathematical expressions in text
 * This is a basic implementation that can be enhanced with ML models
 * @param text The extracted text
 * @returns Text with improved math formatting
 */
export function enhanceMathNotation(text: string): string {
  // Basic patterns for common mathematical expressions
  let enhanced = text;

  // Convert common mathematical patterns to LaTeX
  enhanced = enhanced
    // Fractions: a/b -> \frac{a}{b}
    .replace(/(\w+)\s*\/\s*(\w+)/g, '\\(\\frac{$1}{$2}\\)')
    // Limits: lim -> \lim
    .replace(/\blim\b/gi, '\\(\\lim\\)')
    // Integrals: integral -> \int
    .replace(/\bintegral\b/gi, '\\(\\int\\)')
    // Derivatives: d/dx -> \frac{d}{dx}
    .replace(/d\s*\/\s*d(\w+)/g, '\\(\\frac{d}{d$1}\\)')
    // Summation: sum -> \sum
    .replace(/\bsum\b/gi, '\\(\\sum\\)')
    // Pi: pi -> \pi
    .replace(/\bpi\b/gi, '\\(\\pi\\)')
    // Infinity: infinity -> \infty
    .replace(/\binfinity\b/gi, '\\(\\infty\\)')
    // Squared: x^2 -> x^{2}
    .replace(/(\w+)\^(\d+)/g, '\\($1^{$2}\\)')
    // Square root: sqrt -> \sqrt
    .replace(/\bsqrt\s*\(([^)]+)\)/gi, '\\(\\sqrt{$1}\\)');

  return enhanced;
}

/**
 * Check if Tesseract is available
 * @returns True if Tesseract is installed and working
 */
export async function isTesseractAvailable(): Promise<boolean> {
  try {
    // Create a simple test image buffer (1x1 white pixel)
    const testBuffer = await sharp({
      create: {
        width: 100,
        height: 50,
        channels: 3,
        background: { r: 255, g: 255, b: 255 }
      }
    }).png().toBuffer();

    await tesseract.recognize(testBuffer, { lang: 'eng' });
    return true;
  } catch (error) {
    console.error('Tesseract availability check failed:', error);
    return false;
  }
}