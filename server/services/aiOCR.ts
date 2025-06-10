/**
 * AI-powered OCR service using OpenAI Vision for mathematical content extraction
 */
import OpenAI from 'openai';

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Extract text and mathematical expressions from images using AI vision
 * @param imageBuffer The image buffer
 * @returns Extracted text with proper LaTeX formatting
 */
export async function extractTextWithAI(imageBuffer: Buffer): Promise<string> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    console.log('Starting AI OCR extraction with OpenAI Vision...');
    
    // Convert buffer to base64
    const base64Image = imageBuffer.toString('base64');
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Extract all text and mathematical expressions from this image. 
              
              Requirements:
              1. Preserve the exact text content and structure
              2. Convert mathematical expressions to proper LaTeX notation using \\(...\\) for inline math
              3. Use proper LaTeX commands for symbols (e.g., \\frac{a}{b}, \\sqrt{x}, \\pi, \\infty, etc.)
              4. Maintain proper spacing and line breaks
              5. If there are equations, format them clearly
              6. Return only the extracted content, no additional commentary
              
              Focus on accuracy and proper mathematical notation.`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 1000,
      temperature: 0.1, // Low temperature for more consistent output
    });

    const extractedText = response.choices[0]?.message?.content;
    
    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('No text could be extracted from the image');
    }

    console.log(`AI OCR successful - Extracted ${extractedText.length} characters`);
    
    // Clean up the extracted text
    const cleanedText = extractedText
      .replace(/```[^`]*```/g, '') // Remove any code blocks
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold markdown
      .replace(/\*([^*]+)\*/g, '$1') // Remove italic markdown
      .replace(/^\s*[\-\*]\s+/gm, '') // Remove bullet points
      .replace(/\n\s*\n/g, '\n\n') // Clean up excessive newlines
      .trim();

    return cleanedText;

  } catch (error: any) {
    console.error('AI OCR error:', error);
    throw new Error(`AI OCR extraction failed: ${error.message}`);
  }
}

/**
 * Check if AI OCR is available
 * @returns True if OpenAI API key is configured
 */
export function isAIOCRAvailable(): boolean {
  return !!process.env.OPENAI_API_KEY;
}