/**
 * Math OCR service using Texify API for reliable LaTeX extraction
 */
import axios from 'axios';
import FormData from 'form-data';

interface TexifyResponse {
  text: string;
  confidence?: number;
}

/**
 * Extract mathematical notation from image using Texify API
 * @param imageBuffer The image buffer
 * @returns LaTeX formatted text
 */
export async function extractMathWithTexify(imageBuffer: Buffer): Promise<string> {
  try {
    // Create form data for the image
    const formData = new FormData();
    formData.append('file', imageBuffer, {
      filename: 'math_screenshot.png',
      contentType: 'image/png'
    });

    const response = await axios.post(
      'https://api.texify.ai/v1/predict',
      formData,
      {
        headers: {
          ...formData.getHeaders()
        },
        timeout: 30000 // 30 second timeout
      }
    );

    const result: TexifyResponse = response.data;

    if (!result.text) {
      throw new Error('No text extracted from image');
    }

    // Clean up the LaTeX output
    let cleanedText = result.text
      .trim()
      .replace(/\\begin{align\*?}/g, '$$')
      .replace(/\\end{align\*?}/g, '$$')
      .replace(/\\begin{equation\*?}/g, '$$')
      .replace(/\\end{equation\*?}/g, '$$')
      .replace(/\\\\/g, '\n') // Convert LaTeX line breaks to regular breaks
      .replace(/\n\s*\n/g, '\n\n'); // Clean up excessive newlines

    // Ensure proper display math formatting
    if (cleanedText.includes('\\') && !cleanedText.includes('$$') && !cleanedText.includes('\\(')) {
      // If it contains LaTeX but no delimiters, wrap in display math
      cleanedText = `$$${cleanedText}$$`;
    }

    return cleanedText;

  } catch (error: any) {
    console.error('Texify OCR error:', error.response?.data || error.message);
    
    if (error.response?.status === 429) {
      throw new Error('Texify API rate limit exceeded. Please try again later.');
    } else if (error.response?.status === 400) {
      throw new Error('Invalid image format. Please upload a clear image file.');
    }
    
    throw new Error(`Math OCR extraction failed: ${error.message}`);
  }
}

/**
 * Check if Texify API is available
 * @returns True if Texify API is accessible
 */
export async function isTexifyAvailable(): Promise<boolean> {
  try {
    // Just check if the API endpoint is reachable
    const response = await axios.get('https://api.texify.ai/v1/health', { timeout: 3000 });
    return response.status === 200;
  } catch (error) {
    // Texify API is currently unreachable, fall back to other OCR methods
    return false;
  }
}