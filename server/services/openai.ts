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
