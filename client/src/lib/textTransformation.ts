import { AIModel } from "@shared/schema";

interface TransformOptions {
  text: string;
  instructions: string;
  model: AIModel;
  preset?: string;
}

/**
 * Transform text using the server API
 */
export async function transformText(options: TransformOptions): Promise<string> {
  try {
    const response = await fetch("/api/transform", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(options),
    });

    if (!response.ok) {
      throw new Error(`Transformation failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error("Text transformation error:", error);
    throw error;
  }
}

/**
 * Get predefined preset instructions
 */
export function getPresetInstructions(preset: string): string {
  const presets: Record<string, string> = {
    Academic: "Rewrite in a formal academic style with proper citations, theoretical frameworks, and scholarly tone. Use precise terminology and maintain a third-person perspective.",
    Professional: "Transform into clear, concise professional writing suitable for business communication. Use direct language, remove unnecessary words, and organize with bullet points when appropriate.",
    Creative: "Rewrite with vivid imagery, varied sentence structure, and engaging narrative elements. Add metaphors and descriptive language to create a more immersive experience.",
    Concise: "Make the text as brief as possible while preserving all key information. Aim for at least 50% reduction in length without losing essential content.",
    Elaborate: "Expand on the ideas in the text, adding depth, examples, and explanations. Develop arguments more fully and explore implications of the statements.",
    Intelligent: "Rewrite in the style of someone who is extremely intelligent but who is not long-winded and who is not a pedant and who is explaining this in an effective and brisk manner to people of modest intelligence.",
    Custom: "", // Custom preset has no default instructions
  };

  return presets[preset] || "";
}
