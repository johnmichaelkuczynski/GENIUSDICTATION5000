/**
 * Service for OCR text and math extraction using Mathpix API
 */
import axios from 'axios';
import FormData from 'form-data';

interface MathpixResponse {
  text: string;
  latex_styled?: string;
  confidence?: number;
  confidence_rate?: number;
}

/**
 * Extract text and mathematical notation from image using Mathpix OCR
 * @param imageBuffer The image buffer (screenshot, photo, etc.)
 * @returns Extracted text with LaTeX math notation
 */
export async function extractTextFromImage(imageBuffer: Buffer): Promise<string> {
  const mathpixAppId = process.env.MATHPIX_APP_ID;
  const mathpixAppKey = process.env.MATHPIX_APP_KEY;

  if (!mathpixAppId || !mathpixAppKey) {
    throw new Error('Mathpix API credentials not configured. Please set MATHPIX_APP_ID and MATHPIX_APP_KEY environment variables.');
  }

  try {
    // Create form data for the image
    const formData = new FormData();
    formData.append('file', imageBuffer, {
      filename: 'screenshot.png',
      contentType: 'image/png'
    });

    // Mathpix OCR options for best text + math extraction
    formData.append('options_json', JSON.stringify({
      math_inline_delimiters: ['\\(', '\\)'],
      math_display_delimiters: ['$$', '$$'],
      rm_spaces: true,
      rm_fonts: false,
      formats: ['text', 'latex_styled']
    }));

    const response = await axios.post(
      'https://api.mathpix.com/v3/text',
      formData,
      {
        headers: {
          'app_id': mathpixAppId,
          'app_key': mathpixAppKey,
          ...formData.getHeaders()
        },
        timeout: 30000 // 30 second timeout
      }
    );

    const result: MathpixResponse = response.data;

    if (!result.text) {
      throw new Error('No text extracted from image');
    }

    // Return the extracted text with proper LaTeX formatting
    return result.text;

  } catch (error: any) {
    console.error('Mathpix OCR error:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      throw new Error('Invalid Mathpix API credentials. Please check your MATHPIX_APP_ID and MATHPIX_APP_KEY.');
    } else if (error.response?.status === 429) {
      throw new Error('Mathpix API rate limit exceeded. Please try again later.');
    } else if (error.response?.status === 400) {
      throw new Error('Invalid image format. Please upload a clear image file (PNG, JPG, etc.).');
    }
    
    throw new Error(`OCR extraction failed: ${error.message}`);
  }
}

/**
 * Check if Mathpix API is properly configured
 * @returns True if API credentials are available
 */
export function isMathpixConfigured(): boolean {
  return !!(process.env.MATHPIX_APP_ID && process.env.MATHPIX_APP_KEY);
}