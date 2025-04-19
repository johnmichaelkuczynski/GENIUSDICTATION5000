import OpenAI from "openai";
import { AIModel } from "@shared/schema";
import fs from "fs";

// Initialize OpenAI client lazily to avoid errors when API key is missing
let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OpenAI API key is not configured. Please add an API key in the Settings page.");
    }
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

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

    const prompt = `
You are an expert text transformation assistant. Your task is to transform the user's text according to their instructions.
You should return ONLY the transformed text without additional commentary, explanations, or formatting.

Instructions: ${instructions}

Original Text:
${text}

Transformed Text:
`;

    const openai = getOpenAI();
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
    const openai = getOpenAI();
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
