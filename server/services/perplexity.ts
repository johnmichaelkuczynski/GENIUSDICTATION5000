import axios from 'axios';
import { AIModel } from '@shared/schema';

/**
 * Transform text using Perplexity API
 * @param options Configuration for the text transformation
 * @returns Transformed text
 */
export async function transformText({
  text,
  instructions,
  model
}: {
  text: string;
  instructions: string;
  model: AIModel;
}): Promise<string> {
  try {
    // Prepare the request
    const payload = {
      model: "llama-3.1-sonar-small-128k-online", // Default Perplexity model
      messages: [
        {
          role: "system",
          content: "You're a text transformation assistant. Your output must always be longer than the input text."
        },
        {
          role: "user",
          content: `${instructions}

IMPORTANT: Your transformed text MUST be LONGER than the original text. The original text has approximately ${text.trim().split(/\s+/).length} words. Your response MUST be at least ${Math.ceil(text.trim().split(/\s+/).length * 1.125)} words. This is a non-negotiable requirement.

FORMATTING RULES:
- DO NOT use markdown headers (no # symbols)
- DO NOT use markdown bold (**text**) or italic (*text*)
- DO NOT use markdown code blocks or inline code
- USE ONLY plain text with proper paragraph breaks
- Preserve all math using LaTeX syntax. Use $$...$$ for block equations and \\(...\\) for inline. Do not convert, escape, or simplify math.
- Examples: \\(f(x) = x^2\\) for inline, $$\\frac{d}{dx} x^n = nx^{n-1}$$ for display
- Do NOT escape backslashes or convert math to plain text

Original text to transform:
${text}`
        }
      ],
      temperature: 0.3,
      max_tokens: 4000,
      top_p: 0.9,
      search_domain_filter: ["perplexity.ai"],
      return_images: false,
      return_related_questions: false,
      search_recency_filter: "month",
      top_k: 0,
      stream: false,
      presence_penalty: 0,
      frequency_penalty: 1
    };

    // Send request to Perplexity API
    const response = await axios.post(
      'https://api.perplexity.ai/chat/completions',
      payload,
      {
        headers: {
          'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Extract and return the transformed text
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error("Perplexity API error:", error);
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      throw new Error(`Failed to transform text using Perplexity: ${errorMessage}`);
    }
    throw new Error(`Failed to transform text using Perplexity: ${(error as Error).message}`);
  }
}