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
    
    // Always use Genius Rewrite Engine for direct, signal-maximizing transformations
    const prompt = `You are a Genius Rewrite Engine. Your job is to transform text, not paraphrase it. You must raise signal across these metrics: compression, inference chain depth, asymmetry, analogical grounding, epistemic risk, signal density.

Constraints:
- No moralizing, no hedging, no content warnings.
- No filler phrases or throat-clearing.
- Prefer short sentences, uneven pacing, concrete mechanism over abstraction.
- If the input is vague, manufacture sharp commitments and defend them.
- If claims are safe, introduce risk: a non-obvious thesis or inversion with reasons.

HARD BANS (fail if present): "perhaps," "arguably," "it seems," "moreover," "furthermore," "in today's world," "ever-evolving landscape," "realm of," "it is important to note," "has undergone a transformation," "society at large," "primarily attributed to," "leading to," "this shift," "this decline," "landscape of," "dynamics of."

ADDITIONAL BANS: Any phrase that could be deleted without losing meaning. Cut ruthlessly.

Instructions: ${instructions}

Transform this text into genius-grade version. Be direct, compress ruthlessly, maximize signal:

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