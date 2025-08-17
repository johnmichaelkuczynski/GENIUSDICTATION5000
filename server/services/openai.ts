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
    
    // FORCE STARK HEMINGWAY STYLE - exact example to copy
    const prompt = `Copy this writing style EXACTLY:

PERFECT EXAMPLE:
"Streetlights hum because they were built to. The wiring ties into the grid and into systems we aren't meant to see. That isn't speculation. It's design. Numbers prove it. Words are decoration; numbers are the code. Look at the coffee cups—logos, marks, signals—and watch how people clutch them without a thought. I told a man in a blue coat. He laughed. Of course he did. People laugh when truth brushes too close. Meanwhile the same crack opens in the same spot on the sidewalk, year after year. That isn't chance. It's a signal. Ignore it, and you miss the point."

Copy this EXACT style:
- Short declarative sentences
- Simple, concrete words
- Direct statements of fact
- No flowery language whatsoever
- Active voice only

Instructions: ${instructions}

Rewrite this text in that exact style:

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
