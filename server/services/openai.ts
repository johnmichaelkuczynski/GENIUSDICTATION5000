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
    
    const prompt = `
You are an expert text transformation assistant. Your task is to transform the user's text according to their instructions.
You should return ONLY the transformed text without additional commentary, explanations, or formatting.

IMPORTANT: Your transformed text MUST be LONGER than the original text. The original text has approximately ${wordCount} words. 
Your response MUST be at least ${minRequiredWords} words to be acceptable. This is a non-negotiable requirement.

Instructions: ${instructions}

Original Text:
${text}

Transformed Text:
`;

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
