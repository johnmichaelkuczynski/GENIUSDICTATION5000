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
