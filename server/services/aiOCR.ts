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
              1. Extract ALL text content exactly as it appears
              2. For mathematical expressions, write them in plain readable text (not LaTeX code)
              3. Convert symbols to their word equivalents (e.g., "π" becomes "pi", "∞" becomes "infinity")
              4. Write fractions as "a/b" format, not LaTeX markup
              5. Write superscripts as "x^2" format, not LaTeX markup
              6. NO LaTeX code, NO markup, NO code blocks - just clean readable text
              7. Maintain proper spacing and paragraph structure
              8. Return only the extracted content, no additional commentary
              
              IMPORTANT: Return clean, readable text that a human would type, not code or markup.`
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
    console.log(`Raw extracted text: "${extractedText}"`);
    
    // Clean up markup while preserving actual text content
    let cleanedText = extractedText;

    // Remove code blocks but preserve their content
    cleanedText = cleanedText.replace(/```[a-zA-Z]*\n?([\s\S]*?)```/g, '$1');
    
    // Remove LaTeX environments but preserve mathematical content inside
    cleanedText = cleanedText.replace(/\\begin\{align\}([\s\S]*?)\\end\{align\}/g, (match, content) => {
      return content.replace(/\\text\{([^}]+)\}/g, '$1').replace(/&/g, '').replace(/\\\\/g, '\n');
    });
    
    // Convert LaTeX display math to readable text
    cleanedText = cleanedText.replace(/\\\[([\s\S]*?)\\\]/g, (match, content) => {
      return content.replace(/\\text\{([^}]+)\}/g, '$1').replace(/&/g, '').replace(/\\\\/g, '\n');
    });
    
    // Convert LaTeX inline math to readable text
    cleanedText = cleanedText.replace(/\\\(([^)]*)\\\)/g, '$1');
    
    // Remove common LaTeX commands but preserve content
    cleanedText = cleanedText
      .replace(/\\text\{([^}]+)\}/g, '$1')
      .replace(/\\\\/g, '\n')
      .replace(/&/g, '')
      .replace(/\$\$([^$]*)\$\$/g, '$1')
      .replace(/\$([^$]*)\$/g, '$1')
      .replace(/\{([^}]*)\}/g, '$1')
      .replace(/\\[a-zA-Z]+/g, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/^\s*[\-\*\+]\s+/gm, '')
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .replace(/\s+/g, ' ')
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