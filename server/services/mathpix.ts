/**
 * Service for interacting with Mathpix API for OCR text and math extraction from images
 */
import axios from 'axios';

export interface MathpixResult {
  text: string;
  latex?: string;
  confidence: number;
  hasmath: boolean;
}

/**
 * Extract text and math from image using Mathpix OCR
 * @param imageBuffer The image buffer to process
 * @returns Extracted text with LaTeX math notation
 */
export async function extractTextFromImage(imageBuffer: Buffer): Promise<MathpixResult> {
  try {
    const base64Image = imageBuffer.toString('base64');
    
    const response = await axios.post('https://api.mathpix.com/v3/text', {
      src: `data:image/jpeg;base64,${base64Image}`,
      formats: ['text', 'latex_styled'],
      data_options: {
        include_asciimath: true,
        include_latex: true,
        include_svg: false
      }
    }, {
      headers: {
        'app_id': process.env.MATHPIX_APP_ID,
        'app_key': process.env.MATHPIX_APP_KEY,
        'Content-Type': 'application/json'
      }
    });

    const { text, latex_styled, confidence, is_printed, is_handwritten } = response.data;
    
    return {
      text: text || '',
      latex: latex_styled || '',
      confidence: confidence || 0,
      hasmath: !!(latex_styled && latex_styled.length > 0)
    };
  } catch (error) {
    console.error('Mathpix API error:', error);
    throw new Error(`Mathpix OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check if Mathpix service is available
 * @returns Boolean indicating if the service is accessible
 */
export async function checkMathpixStatus(): Promise<boolean> {
  try {
    // Create a simple test image (1x1 pixel) to check API connectivity
    const testImageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
    
    await axios.post('https://api.mathpix.com/v3/text', {
      src: `data:image/png;base64,${testImageBuffer.toString('base64')}`,
      formats: ['text']
    }, {
      headers: {
        'app_id': process.env.MATHPIX_APP_ID,
        'app_key': process.env.MATHPIX_APP_KEY,
        'Content-Type': 'application/json'
      },
      timeout: 5000
    });
    
    return true;
  } catch (error) {
    console.error('Mathpix status check failed:', error);
    return false;
  }
}