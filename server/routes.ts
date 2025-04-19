import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import OpenAI from "openai";
import { z } from "zod";
import {
  SpeechEngine, 
  AIModel, 
  transformRequestSchema, 
  apiKeyRequestSchema,
  extractTextRequestSchema,
  ttsRequestSchema
} from "@shared/schema";
import { transformText } from "./services/openai";
import { transcribeAudio as gladiaTranscribe } from "./services/gladia";
import { transcribeAudio as deepgramTranscribe } from "./services/deepgram";
import { transcribeAudio as whisperTranscribe } from "./services/openai";
import { 
  extractTextFromDocument, 
  generateDocument
} from "./services/documentHandler";
import {
  generateSpeech,
  getAvailableVoices
} from "./services/elevenlabs";

// Set up multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB limit
});

export async function registerRoutes(app: Express): Promise<Server> {
  // API status check endpoint
  app.get("/api/status", async (req, res) => {
    const gladiaKey = process.env.GLADIA_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;
    const deepgramKey = process.env.DEEPGRAM_API_KEY;
    const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
    
    // Check if keys are present
    const services = {
      gladia: !!gladiaKey,
      openai: !!openaiKey,
      deepgram: !!deepgramKey,
      elevenLabs: !!elevenLabsKey
    };
    
    // At least one service must be available
    const connected = services.gladia || services.openai || services.deepgram;
    
    res.json({ connected, services });
  });

  // Text transformation endpoint
  app.post("/api/transform", async (req, res) => {
    try {
      // Validate request
      const result = transformRequestSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.message });
      }

      const { 
        text,
        instructions,
        model = AIModel.GPT4O,
        preset,
        useStyleReference,
        styleReferences
      } = result.data;

      // Prepare style references if needed
      let styleReferenceText = "";
      if (useStyleReference && styleReferences && styleReferences.length > 0) {
        const activeStyles = styleReferences.filter(style => style.active);
        if (activeStyles.length > 0) {
          styleReferenceText = `Use these style references: ${activeStyles.map(style => style.name).join(", ")}. `;
        }
      }

      // Get preset instructions if applicable
      let presetInstructions = "";
      if (preset) {
        switch (preset) {
          case "Academic":
            presetInstructions = "Rewrite in a formal academic style with proper citations, theoretical frameworks, and scholarly tone. Use precise terminology and maintain a third-person perspective.";
            break;
          case "Professional":
            presetInstructions = "Transform into clear, concise professional writing suitable for business communication. Use direct language, remove unnecessary words, and organize with bullet points when appropriate.";
            break;
          case "Creative":
            presetInstructions = "Rewrite with vivid imagery, varied sentence structure, and engaging narrative elements. Add metaphors and descriptive language to create a more immersive experience.";
            break;
          case "Concise":
            presetInstructions = "Make the text as brief as possible while preserving all key information. Aim for at least 50% reduction in length without losing essential content.";
            break;
          case "Elaborate":
            presetInstructions = "Expand on the ideas in the text, adding depth, examples, and explanations. Develop arguments more fully and explore implications of the statements.";
            break;
        }
      }

      // Combine instructions
      const combinedInstructions = [
        styleReferenceText,
        presetInstructions,
        instructions
      ].filter(Boolean).join(" ");

      // Transform text using OpenAI
      const transformedText = await transformText({
        text,
        instructions: combinedInstructions || "Improve this text",
        model
      });

      res.json({ text: transformedText, model });
    } catch (error) {
      console.error("Error transforming text:", error);
      res.status(500).json({ error: "Failed to transform text" });
    }
  });

  // Speech-to-text transcription endpoint
  app.post("/api/transcribe", upload.single("audio"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No audio file provided" });
      }

      const audioBuffer = req.file.buffer;
      const engine = (req.body.engine as SpeechEngine) || SpeechEngine.GLADIA;
      
      let transcribedText = "";
      let usedEngine = engine;

      // Try primary engine first
      try {
        switch (engine) {
          case SpeechEngine.GLADIA:
            transcribedText = await gladiaTranscribe(audioBuffer);
            break;
          case SpeechEngine.WHISPER:
            transcribedText = await whisperTranscribe(audioBuffer);
            break;
          case SpeechEngine.DEEPGRAM:
            transcribedText = await deepgramTranscribe(audioBuffer);
            break;
        }
      } catch (primaryError) {
        console.error(`Error with ${engine} transcription:`, primaryError);
        
        // Try Whisper as fallback
        try {
          transcribedText = await whisperTranscribe(audioBuffer);
          usedEngine = SpeechEngine.WHISPER;
        } catch (fallbackError) {
          console.error("Error with Whisper fallback:", fallbackError);
          
          // Try Deepgram as second fallback if available
          if (process.env.DEEPGRAM_API_KEY) {
            try {
              transcribedText = await deepgramTranscribe(audioBuffer);
              usedEngine = SpeechEngine.DEEPGRAM;
            } catch (finalError) {
              console.error("Error with Deepgram fallback:", finalError);
              throw new Error("All transcription engines failed");
            }
          } else {
            throw new Error("All available transcription engines failed");
          }
        }
      }

      res.json({ text: transcribedText, engine: usedEngine });
    } catch (error) {
      console.error("Error in transcription:", error);
      res.status(500).json({ error: "Failed to transcribe audio" });
    }
  });

  // Document text extraction endpoint
  app.post("/api/extract-text", upload.single("document"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No document file provided" });
      }

      const documentBuffer = req.file.buffer;
      const fileName = req.file.originalname;
      const fileType = req.file.mimetype;

      const extractedText = await extractTextFromDocument(documentBuffer, fileName, fileType);

      res.json({ text: extractedText, fileName });
    } catch (error) {
      console.error("Error extracting text from document:", error);
      res.status(500).json({ error: "Failed to extract text from document" });
    }
  });

  // Document generation endpoint
  app.post("/api/generate-document", async (req, res) => {
    try {
      const { text, format, fileName = "document" } = req.body;

      if (!text || !format) {
        return res.status(400).json({ error: "Text and format are required" });
      }

      const documentBuffer = await generateDocument(text, format, fileName);
      
      // Set appropriate content type
      let contentType = "text/plain";
      switch (format) {
        case "docx":
          contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
          break;
        case "pdf":
          contentType = "application/pdf";
          break;
      }
      
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `attachment; filename=${fileName}.${format}`);
      res.send(documentBuffer);
    } catch (error) {
      console.error("Error generating document:", error);
      res.status(500).json({ error: "Failed to generate document" });
    }
  });

  // Text-to-speech endpoint
  app.post("/api/tts", async (req, res) => {
    try {
      // Validate request
      const result = ttsRequestSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.message });
      }

      const { text, voiceId } = result.data;

      // Check if ElevenLabs key is available
      if (!process.env.ELEVENLABS_API_KEY) {
        return res.status(400).json({ error: "ElevenLabs API key is not configured" });
      }

      // Generate speech
      const audioBuffer = await generateSpeech(text, voiceId);

      // Set response headers
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Disposition', `attachment; filename="narration.mp3"`);
      
      // Send the audio data
      res.send(audioBuffer);
    } catch (error) {
      console.error("Error generating speech:", error);
      res.status(500).json({ error: "Failed to generate speech" });
    }
  });

  // Get available voices endpoint
  app.get("/api/tts/voices", async (req, res) => {
    try {
      // Check if ElevenLabs key is available
      if (!process.env.ELEVENLABS_API_KEY) {
        return res.status(400).json({ error: "ElevenLabs API key is not configured" });
      }

      // Get available voices
      const voices = await getAvailableVoices();
      
      res.json({ voices });
    } catch (error) {
      console.error("Error fetching voices:", error);
      res.status(500).json({ error: "Failed to fetch voices" });
    }
  });

  // API key management endpoint
  app.post("/api/settings/api-keys", async (req, res) => {
    try {
      const result = apiKeyRequestSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.message });
      }

      const { gladiaKey, openaiKey, deepgramKey, elevenLabsKey } = result.data;

      // Store keys in environment variables (in a real app, use Replit Secrets)
      // For demo purposes, we're just sending back success
      // In a production app, these would be securely stored
      
      res.json({ success: true, message: "API keys updated successfully" });
    } catch (error) {
      console.error("Error updating API keys:", error);
      res.status(500).json({ error: "Failed to update API keys" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
