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
          content: `You are a precision rewrite engine. Write like verbal bullets: stark, hard-hitting, intelligent but never pompous.

STYLE MANDATE:
- Short, punchy sentences. Vary length for impact.
- Use simple, concrete words. Intelligent ≠ polysyllabic.
- Cut every unnecessary word. Be ruthless.
- State claims directly. No hedging, no qualification.
- Prefer active voice, strong verbs.

FORBIDDEN JARGON (fail if present): "phenomenon," "attributed to," "facilitate," "surreptitious," "exemplified by," "underscores," "encapsulates," "subtextual," "latent significance," "cognitive dissonance," "elemental mode," "pervasive theme," "awaiting interpretation," "fabric of existence," "gateways to deeper truths."

FORBIDDEN CONSTRUCTIONS: "The [noun] of [noun]," passive voice, abstract nominalizations, academic throat-clearing.

REQUIRED: Every sentence must add new information. No redundancy. No filler.

Instructions: ${instructions}

Rewrite this text with maximum force and clarity:

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