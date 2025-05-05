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

    // Construct the message
    const prompt = `${instructions}:\n\n${text}`;

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