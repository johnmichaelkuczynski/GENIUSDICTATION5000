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
    
    // Stark, hard-hitting rewrite engine - verbal bullets, not academic hot air
    const prompt = `You are a precision rewrite engine. Write like verbal bullets: stark, hard-hitting, intelligent but never pompous.

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