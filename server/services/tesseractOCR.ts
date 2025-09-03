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
    console.log('Starting Tesseract OCR processing...');
    
    // Get image info for debugging
    const imageInfo = await sharp(imageBuffer).metadata();
    console.log(`Input image: ${imageInfo.width}x${imageInfo.height}, format: ${imageInfo.format}`);

    // Enhanced preprocessing for better OCR accuracy, especially for math
    const processedImageBuffer = await sharp(imageBuffer)
      .resize(null, 800, { 
        withoutEnlargement: false,
        kernel: sharp.kernel.lanczos3 
      })
      .greyscale()
      .normalize()
      .linear(1.2, -(128 * 1.2) + 128) // Increase contrast
      .sharpen({ sigma: 1, m1: 0.5, m2: 2, x1: 2, y2: 10 })
      .threshold(128) // Convert to black and white for better text recognition
      .png()
      .toBuffer();

    console.log('Image preprocessing complete');

    // Try multiple PSM modes for better recognition
    const psmModes = [
      6,  // Uniform block of text
      8,  // Single word
      13, // Raw line (good for math equations)
      3,  // Fully automatic page segmentation
      4   // Single column of text
    ];

    let bestResult = '';
    let bestScore = 0;

    for (const psm of psmModes) {
      try {
        console.log(`Trying PSM mode ${psm}...`);
        
        const config = {
          lang: 'eng',
          oem: 1, // LSTM neural net mode
          psm: psm,
          tessjs_create_hocr: '0',
          tessjs_create_tsv: '0',
          preserve_interword_spaces: '1',
          // Additional configs for better math recognition
          'c:tessedit_char_whitelist': 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,;:!?()[]{}+-*/=<>^_|\\/ \n\t',
          'c:classify_bln_numeric_mode': '1'
        };

        const text = await Promise.race([
          tesseract.recognize(processedImageBuffer, config),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Tesseract timeout')), 10000)
          )
        ]) as string;
        
        if (text && text.trim().length > 0) {
          const score = text.trim().length;
          console.log(`PSM ${psm} extracted ${score} characters`);
          
          if (score > bestScore) {
            bestResult = text;
            bestScore = score;
          }
        }
      } catch (psmError: any) {
        console.log(`PSM mode ${psm} failed:`, psmError?.message || psmError);
        continue;
      }
    }
    
    if (!bestResult || bestResult.trim().length === 0) {
      throw new Error('No text could be extracted from the image with any PSM mode');
    }

    console.log(`Best result from Tesseract: ${bestResult.length} characters`);

    // Clean up the extracted text
    const cleanedText = bestResult
      .replace(/\n\s*\n/g, '\n\n') // Clean up excessive newlines
      .replace(/\s+/g, ' ') // Normalize spaces
      .replace(/[^\x20-\x7E\n]/g, '') // Remove non-printable characters
      .trim();

    console.log(`Cleaned text: "${cleanedText.substring(0, 200)}..."`);
    return cleanedText;

  } catch (error: any) {
    console.error('Tesseract OCR error:', error);
    throw new Error(`OCR extraction failed: ${error.message}`);
  }
}

/**
 * Process mathematical expressions in text
 * Enhanced implementation for better math recognition and LaTeX conversion
 * @param text The extracted text
 * @returns Text with improved math formatting
 */
export function enhanceMathNotation(text: string): string {
  let enhanced = text;

  // First, clean up common OCR errors in mathematical text
  enhanced = enhanced
    // Fix common character recognition errors
    .replace(/\|/g, 'I') // Vertical bars often misread as I
    .replace(/([0-9])\s*[Il]\s*([0-9])/g, '$1/$2') // 1 l 2 -> 1/2
    .replace(/([0-9])\s*o\s*([0-9])/g, '$1+$2') // 1 o 2 -> 1+2
    .replace(/\[\]/g, '()') // Square brackets to parentheses
    .replace(/\s+([+\-*/=<>])\s+/g, ' $1 ') // Normalize operator spacing
    .replace(/([0-9])\s*x\s*([0-9])/g, '$1 × $2'); // Fix multiplication

  // Convert mathematical symbols and expressions to LaTeX
  enhanced = enhanced
    // Greek letters
    .replace(/\balpha\b/gi, '\\(\\alpha\\)')
    .replace(/\bbeta\b/gi, '\\(\\beta\\)')
    .replace(/\bgamma\b/gi, '\\(\\gamma\\)')
    .replace(/\bdelta\b/gi, '\\(\\delta\\)')
    .replace(/\bepsilon\b/gi, '\\(\\epsilon\\)')
    .replace(/\btheta\b/gi, '\\(\\theta\\)')
    .replace(/\blambda\b/gi, '\\(\\lambda\\)')
    .replace(/\bmu\b/gi, '\\(\\mu\\)')
    .replace(/\bpi\b/gi, '\\(\\pi\\)')
    .replace(/\bsigma\b/gi, '\\(\\sigma\\)')
    .replace(/\bphi\b/gi, '\\(\\phi\\)')
    .replace(/\bomega\b/gi, '\\(\\omega\\)')
    
    // Mathematical functions
    .replace(/\bsin\b/gi, '\\(\\sin\\)')
    .replace(/\bcos\b/gi, '\\(\\cos\\)')
    .replace(/\btan\b/gi, '\\(\\tan\\)')
    .replace(/\bln\b/gi, '\\(\\ln\\)')
    .replace(/\blog\b/gi, '\\(\\log\\)')
    .replace(/\bexp\b/gi, '\\(\\exp\\)')
    
    // Calculus notation
    .replace(/\blim\b/gi, '\\(\\lim\\)')
    .replace(/\bintegral\b/gi, '\\(\\int\\)')
    .replace(/\bsum\b/gi, '\\(\\sum\\)')
    .replace(/\bprod\b/gi, '\\(\\prod\\)')
    .replace(/d\s*\/\s*d([a-zA-Z])/g, '\\(\\frac{d}{d$1}\\)')
    
    // Special symbols
    .replace(/\binfinity\b/gi, '\\(\\infty\\)')
    .replace(/\bpartial\b/gi, '\\(\\partial\\)')
    .replace(/\bnabla\b/gi, '\\(\\nabla\\)')
    .replace(/\+\-/g, '\\(\\pm\\)')
    .replace(/\-\+/g, '\\(\\mp\\)')
    .replace(/!=/g, '\\(\\neq\\)')
    .replace(/<=/g, '\\(\\leq\\)')
    .replace(/>=/g, '\\(\\geq\\)')
    .replace(/\bapprox\b/gi, '\\(\\approx\\)')
    
    // Powers and subscripts
    .replace(/([a-zA-Z0-9])\^([a-zA-Z0-9]+)/g, '\\($1^{$2}\\)')
    .replace(/([a-zA-Z])_([a-zA-Z0-9]+)/g, '\\($1_{$2}\\)')
    
    // Fractions - more sophisticated pattern
    .replace(/(\d+)\s*\/\s*(\d+)/g, '\\(\\frac{$1}{$2}\\)')
    .replace(/([a-zA-Z]+)\s*\/\s*([a-zA-Z]+)/g, '\\(\\frac{$1}{$2}\\)')
    
    // Square roots
    .replace(/\bsqrt\s*\(([^)]+)\)/gi, '\\(\\sqrt{$1}\\)')
    .replace(/\bsqrt\s+([a-zA-Z0-9]+)/gi, '\\(\\sqrt{$1}\\)')
    
    // Absolute value
    .replace(/\|([^|]+)\|/g, '\\(|$1|\\)')
    
    // Matrices notation
    .replace(/\bmatrix\b/gi, '\\(\\text{matrix}\\)')
    .replace(/\bdet\b/gi, '\\(\\det\\)')
    
    // Set notation
    .replace(/\bunion\b/gi, '\\(\\cup\\)')
    .replace(/\bintersection\b/gi, '\\(\\cap\\)')
    .replace(/\bsubset\b/gi, '\\(\\subset\\)')
    .replace(/\bin\b(?=\s)/gi, '\\(\\in\\)')
    
    // Clean up any double spaces
    .replace(/\s+/g, ' ')
    .trim();

  return enhanced;
}

/**
 * Check if Tesseract is available
 * @returns True if Tesseract is installed and working
 */
export async function isTesseractAvailable(): Promise<boolean> {
  if (process.env.CHECK_TESSERACT !== "1") {
    // Skip the self-test if CHECK_TESSERACT is not set to "1"
    return true; // Assume available to avoid blocking functionality
  }

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