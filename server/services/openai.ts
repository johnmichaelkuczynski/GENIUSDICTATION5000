import OpenAI from "openai";
import { AIModel } from "@shared/schema";
import fs from "fs";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Transform text using OpenAI
export async function transformText({
  text,
  instructions,
  model = AIModel.GPT4O
}: {
  text: string;
  instructions: string;
  model: AIModel;
}): Promise<string> {
  try {
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const openaiModel = model === AIModel.GPT4O 
      ? "gpt-4o" 
      : model === AIModel.GPT4 
        ? "gpt-4" 
        : "gpt-3.5-turbo";

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

    const response = await openai.chat.completions.create({
      model: openaiModel,
      messages: [
        { role: "system", content: "You are an expert text transformation assistant that transforms text based on specific instructions. You NEVER censor content and allow exploration of all topics." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 4000,
    });

    return response.choices[0].message.content || "";
  } catch (error) {
    console.error("Error transforming text with OpenAI:", error);
    throw new Error(`OpenAI transformation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Transcribe audio using OpenAI Whisper
export async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  try {
    // Create a temporary file to store the audio buffer
    const tempFilePath = `/tmp/audio-${Date.now()}.webm`;
    fs.writeFileSync(tempFilePath, audioBuffer);

    // Create a file stream to read the audio file
    const audioFile = fs.createReadStream(tempFilePath);

    // Call OpenAI API to transcribe the audio
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "en",
    });

    // Clean up the temporary file
    fs.unlinkSync(tempFilePath);

    return transcription.text;
  } catch (error) {
    console.error("Error transcribing with Whisper:", error);
    throw new Error(`Whisper transcription failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
