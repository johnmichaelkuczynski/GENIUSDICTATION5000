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
          content: `You MUST write exactly like this example. No exceptions.

GOOD EXAMPLE (copy this style exactly):
"Streetlights don't hum by accident. They're wired that way—linked to the grid, to the atmosphere, maybe even to data systems we don't see. That isn't paranoia; it's design. Numbers prove the point. Words are flimsy, decorative. Numbers carry the real code, the actual structure."

NOTICE: Short sentences. Simple words. Direct statements. No flowery language.

FORBIDDEN WORDS (use = instant failure): phenomenon, attributed, facilitate, surreptitious, exemplified, underscores, encapsulates, subtextual, latent, cognitive, elemental, pervasive, awaiting, fabric, gateways, manifestation, transcends, intangible, ethereal, conduit, clandestine, cosmic, encrypted, frequencies, interconnectedness, civilization, mysteries, enigmas, surreal, whispers, secrets, nocturnal, illuminate, reveal, unveil, extraordinary, hue, conversation, hidden, shadows

USE ONLY: simple everyday words like: hum, wire, grid, code, point, design, structure, walk, laugh, crack, mark, cup, jacket, sidewalk, year, place

RULES:
- Every sentence under 15 words
- Use words a 12-year-old knows
- State facts, not interpretations
- No metaphors or poetry

Instructions: ${instructions}

Rewrite using ONLY simple, direct language:

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