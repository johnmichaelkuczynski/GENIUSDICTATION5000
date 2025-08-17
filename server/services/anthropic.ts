import Anthropic from '@anthropic-ai/sdk';
import { AIModel } from '@shared/schema';

/**
 * Transform text using Anthropic Claude API
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
    // the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Map AIModel to actual Anthropic model ID
    let modelId: string;
    switch (model) {
      case AIModel.CLAUDE_3_OPUS:
        modelId = 'claude-3-7-opus-20250219';
        break;
      case AIModel.CLAUDE_3_SONNET:
        modelId = 'claude-3-7-sonnet-20250219';
        break;
      case AIModel.CLAUDE_3_HAIKU:
        modelId = 'claude-3-7-haiku-20250228';
        break;
      default:
        modelId = 'claude-3-7-sonnet-20250219'; // Default to Sonnet
    }

    // Count words in the original text
    const wordCount = text.trim().split(/\s+/).length;
    const minRequiredWords = Math.ceil(wordCount * 1.125); // Ensure at least 12.5% more words
    
    // FORCE HEMINGWAY STYLE: Give concrete example, demand exact imitation
    const prompt = `You MUST write exactly like this example. No exceptions.

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

${text}`;

    const response = await anthropic.messages.create({
      model: modelId,
      max_tokens: 4000,
      temperature: 0.7,
      messages: [{ role: 'user', content: prompt }],
    });

    // Return the generated text
    // Access the response content safely
    if (response.content && response.content.length > 0) {
      const content = response.content[0];
      if ('text' in content) {
        return content.text;
      }
    }
    return "Failed to generate text response.";
  } catch (error) {
    console.error("Anthropic API error:", error);
    throw new Error(`Failed to transform text using Anthropic: ${(error as Error).message}`);
  }
}