import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import OpenAI from "openai";
import { z } from "zod";
import { WebSocketServer, WebSocket } from 'ws';
import {
  SpeechEngine, 
  AIModel, 
  transformRequestSchema, 
  apiKeyRequestSchema,
  extractTextRequestSchema,
  ttsRequestSchema,
  detectAIRequestSchema,
  detectAIResponseSchema
} from "@shared/schema";
import { transformText as openaiTransform } from "./services/openai";
import { transformText as anthropicTransform } from "./services/anthropic";
import { transformText as perplexityTransform } from "./services/perplexity";
import { transcribeAudio as gladiaTranscribe } from "./services/gladia";
import { transcribeAudio as deepgramTranscribe } from "./services/deepgram";
import { transcribeAudio as whisperTranscribe } from "./services/openai";
import { transcribeAudio as assemblyaiTranscribe } from "./services/assemblyai";
import { 
  extractTextFromDocument, 
  generateDocument,
  generateAssessmentReport
} from "./services/documentHandler";
import { generateLaTeXFile, LaTeXExportOptions } from "./services/latexExport";
import { generateGraphForContent } from "./services/mathGraphGenerator";
import {
  generateSpeech,
  getAvailableVoices
} from "./services/azureSpeech";
import { detectAIContent } from "./services/gptzero";
import { assessText } from "./services/textAssessment";
import { directAssessText } from "./services/directAssessment";
import { assessWithAnthropic } from "./services/anthropicAssessment";
import { assessWithPerplexity } from "./services/perplexityAssessment";
import { extractTextFromImage, isMathpixConfigured } from "./services/mathpix";
import { extractTextWithTesseract, enhanceMathNotation, isTesseractAvailable } from "./services/tesseractOCR";
import { extractTextWithAI, isAIOCRAvailable } from "./services/aiOCR";
import { sendProcessedText } from "./services/sendgrid";
// Texify service removed - service no longer exists

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
    const mathpixConfigured = isMathpixConfigured();
    const tesseractAvailable = await isTesseractAvailable();
    const deepgramKey = process.env.DEEPGRAM_API_KEY;
    const azureSpeechKey = process.env.AZURE_SPEECH_KEY;
    const azureSpeechEndpoint = process.env.AZURE_SPEECH_ENDPOINT;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const perplexityKey = process.env.PERPLEXITY_API_KEY;
    const gptzeroKey = process.env.GPTZERO_API_KEY;
    
    // Check if keys are present
    const services = {
      gladia: !!gladiaKey,
      openai: !!openaiKey,
      deepgram: !!deepgramKey,
      azureSpeech: !!(azureSpeechKey && azureSpeechEndpoint),
      anthropic: !!anthropicKey,
      perplexity: !!perplexityKey,
      gptzero: !!gptzeroKey,
      mathpix: mathpixConfigured,
      tesseract: tesseractAvailable
    };
    
    // At least one service must be available
    const connected = services.gladia || services.openai || services.deepgram;
    
    // We need at least one AI service (OpenAI, Anthropic, or Perplexity) for text transformation
    const aiConnected = services.openai || services.anthropic || services.perplexity;
    
    res.json({ connected: connected && aiConnected, services });
  });



  // Text transformation endpoint
  app.post("/api/transform", async (req, res) => {
    // Helper functions for graph integration (defined within scope)
    const findGraphInsertPosition = (text: string): number => {
      const graphKeywords = [
        'analysis', 'data', 'results', 'findings', 'trends', 'pattern', 
        'model', 'simulation', 'spread', 'growth', 'dynamics', 'curve'
      ];
      
      const sentences = text.split(/[.!?]+/);
      
      for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i].toLowerCase();
        if (graphKeywords.some(keyword => sentence.includes(keyword))) {
          const position = text.indexOf(sentences[i]) + sentences[i].length + 1;
          return Math.min(position, text.length);
        }
      }
      
      const firstParagraph = text.indexOf('\n\n');
      return firstParagraph > 0 ? firstParagraph + 2 : Math.floor(text.length / 3);
    };

    const insertGraphIntoText = (text: string, graphSvg: string, position: number): string => {
      const beforeText = text.substring(0, position);
      const afterText = text.substring(position);
      
      const graphSection = `\n\n**Figure: Mathematical Visualization**\n\n${graphSvg}\n\n*The above graph illustrates the mathematical relationship described in the analysis.*\n\n`;
      
      return beforeText + graphSection + afterText;
    };

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
        styleReferences,
        useContentReference,
        contentReferences
      } = result.data;

      // Prepare style references if needed
      let styleReferenceText = "";
      if (useStyleReference && styleReferences && styleReferences.length > 0) {
        const activeStyles = styleReferences.filter(style => style.active);
        if (activeStyles.length > 0) {
          styleReferenceText = `Use these style references: ${activeStyles.map(style => style.name).join(", ")}. `;
        }
      }
      
      // Prepare content references if needed
      let contentReferenceText = "";
      if (useContentReference && contentReferences && contentReferences.length > 0) {
        const activeContents = contentReferences.filter(content => content.active);
        if (activeContents.length > 0) {
          contentReferenceText = `Use these content references for information: ${activeContents.map(content => content.name).join(", ")}. `;
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
        contentReferenceText,
        presetInstructions,
        instructions
      ].filter(Boolean).join(" ");

      // Determine which service to use based on the selected model
      let transformedText = "";
      
      // Count words in the original text
      const originalWordCount = text.trim().split(/\s+/).length;
      
      if (model.includes('Claude')) {
        // Use Anthropic for Claude models
        if (!process.env.ANTHROPIC_API_KEY) {
          return res.status(400).json({ error: "Anthropic API key is not configured" });
        }
        transformedText = await anthropicTransform({
          text,
          instructions: combinedInstructions || "Improve this text",
          model
        });
      } else if (model.includes('Perplexity')) {
        // Use Perplexity for Llama models
        if (!process.env.PERPLEXITY_API_KEY) {
          return res.status(400).json({ error: "Perplexity API key is not configured" });
        }
        transformedText = await perplexityTransform({
          text,
          instructions: combinedInstructions || "Improve this text",
          model
        });
      } else {
        // Default to OpenAI for GPT models
        if (!process.env.OPENAI_API_KEY) {
          return res.status(400).json({ error: "OpenAI API key is not configured" });
        }
        transformedText = await openaiTransform({
          text,
          instructions: combinedInstructions || "Improve this text",
          model
        });
      }
      
      // Verify that the transformed text is longer than the original
      const transformedWordCount = transformedText.trim().split(/\s+/).length;
      
      if (transformedWordCount <= originalWordCount) {
        console.warn(`AI model failed to produce longer text. Original: ${originalWordCount} words, Transformed: ${transformedWordCount} words. Retrying...`);
        
        // Add more explicit instructions for longer text and retry
        const retryInstructions = `${combinedInstructions || "Improve this text"} CRITICAL: Your response MUST be significantly longer than the original text. Add more details, examples, and explanations to make the text longer.`;
        
        if (model.includes('Claude')) {
          transformedText = await anthropicTransform({
            text,
            instructions: retryInstructions,
            model
          });
        } else if (model.includes('Perplexity')) {
          transformedText = await perplexityTransform({
            text,
            instructions: retryInstructions,
            model
          });
        } else {
          transformedText = await openaiTransform({
            text,
            instructions: retryInstructions,
            model
          });
        }
        
        // Check again
        const retryWordCount = transformedText.trim().split(/\s+/).length;
        console.log(`After retry - Original: ${originalWordCount} words, Transformed: ${retryWordCount} words`);
      }

      // Check if the content requires a graph and embed it
      const graphSvg = generateGraphForContent(text);
      let finalText = transformedText;
      
      if (graphSvg) {
        // Insert the graph at an appropriate position in the text
        const insertPosition = findGraphInsertPosition(transformedText);
        finalText = insertGraphIntoText(transformedText, graphSvg, insertPosition);
        console.log('Graph embedded in transformed text');
      }

      res.json({ text: finalText, model });
    } catch (error) {
      console.error("Error transforming text:", error);
      
      let errorMessage = "Failed to transform text";
      
      // Provide more detailed error messages for common issues
      if (error instanceof Error) {
        if (error.message.includes("Anthropic API")) {
          errorMessage = `Anthropic API error: ${error.message}`;
        } else if (error.message.includes("Perplexity API")) {
          errorMessage = `Perplexity API error: ${error.message}`;
        } else if (error.message.includes("OpenAI API")) {
          errorMessage = `OpenAI API error: ${error.message}`;
        } else {
          errorMessage = error.message;
        }
      }
      
      res.status(500).json({ error: errorMessage });
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
      
      console.log(`Transcription request - File size: ${audioBuffer.length} bytes, Engine: ${engine}`);
      console.log(`File details - MIME type: ${req.file.mimetype}, Original name: ${req.file.originalname}`);
      
      // Check if we have a valid audio buffer
      if (audioBuffer.length === 0) {
        return res.status(400).json({ error: "Empty audio file received" });
      }
      
      let transcribedText = "";
      let usedEngine = engine;

      // Try AssemblyAI first for best mobile support, then fallback to selected engine
      try {
        console.log("Attempting AssemblyAI transcription...");
        if (process.env.ASSEMBLYAI_API_KEY) {
          transcribedText = await assemblyaiTranscribe(audioBuffer);
          usedEngine = "AssemblyAI" as SpeechEngine;
          console.log(`AssemblyAI successful - Result: "${transcribedText.substring(0, 100)}..."`);
        } else {
          console.log("AssemblyAI API key not found, trying selected engine:", engine);
          // Use selected engine if AssemblyAI not available
          switch (engine) {
            case SpeechEngine.GLADIA:
              console.log("Attempting Gladia transcription...");
              transcribedText = await gladiaTranscribe(audioBuffer);
              break;
            case SpeechEngine.WHISPER:
              console.log("Attempting Whisper transcription...");
              transcribedText = await whisperTranscribe(audioBuffer);
              break;
            case SpeechEngine.DEEPGRAM:
              console.log("Attempting Deepgram transcription...");
              transcribedText = await deepgramTranscribe(audioBuffer);
              break;
          }
          console.log(`${engine} successful - Result: "${transcribedText.substring(0, 100)}..."`);
        }
      } catch (primaryError) {
        console.error(`Error with primary transcription (${usedEngine}):`, primaryError);
        
        // Try Whisper as fallback
        try {
          console.log("Attempting Whisper fallback...");
          transcribedText = await whisperTranscribe(audioBuffer);
          usedEngine = SpeechEngine.WHISPER;
          console.log(`Whisper fallback successful - Result: "${transcribedText.substring(0, 100)}..."`);
        } catch (fallbackError) {
          console.error("Error with Whisper fallback:", fallbackError);
          
          // Try Gladia as final fallback if available
          if (process.env.GLADIA_API_KEY) {
            try {
              console.log("Attempting Gladia final fallback...");
              transcribedText = await gladiaTranscribe(audioBuffer);
              usedEngine = SpeechEngine.GLADIA;
              console.log(`Gladia fallback successful - Result: "${transcribedText.substring(0, 100)}..."`);
            } catch (finalError) {
              console.error("Error with Gladia fallback:", finalError);
              throw new Error("All transcription engines failed");
            }
          } else {
            throw new Error("All available transcription engines failed");
          }
        }
      }

      console.log(`Transcription complete - Engine: ${usedEngine}, Length: ${transcribedText.length} chars`);
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

  // OCR text extraction from images (screenshots, photos)
  app.post("/api/ocr-extract", upload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }

      const { buffer, mimetype, originalname } = req.file;
      
      console.log(`OCR request - File: ${originalname}, Type: ${mimetype}, Size: ${buffer.length} bytes`);
      
      // Validate that it's an image file
      if (!mimetype.startsWith('image/')) {
        return res.status(400).json({ error: "File must be an image (PNG, JPG, etc.)" });
      }

      let extractedText = '';
      let usedService = 'none';
      
      // Check OCR service availability
      const tesseractAvailable = await isTesseractAvailable();
      const mathpixAvailable = isMathpixConfigured();
      const aiOCRAvailable = isAIOCRAvailable();
      
      console.log(`OCR services available - Tesseract: ${tesseractAvailable}, Mathpix: ${mathpixAvailable}, AI OCR: ${aiOCRAvailable}`);
      
      // Try AI OCR first (best for mathematical content)
      if (aiOCRAvailable) {
        try {
          console.log("Attempting AI OCR extraction...");
          extractedText = await extractTextWithAI(buffer);
          usedService = 'AI OCR';
          console.log(`AI OCR successful - Extracted ${extractedText.length} characters`);
        } catch (aiError: any) {
          console.error("AI OCR failed:", aiError);
          
          // Try Mathpix as fallback
          if (mathpixAvailable) {
            try {
              console.log("Attempting Mathpix fallback...");
              extractedText = await extractTextFromImage(buffer);
              usedService = 'Mathpix';
              console.log(`Mathpix successful - Extracted ${extractedText.length} characters`);
            } catch (mathpixError: any) {
              console.error("Mathpix failed:", mathpixError);
              throw new Error(`AI OCR and Mathpix both failed: ${aiError?.message}, ${mathpixError?.message}`);
            }
          } else {
            throw aiError;
          }
        }
      } else if (tesseractAvailable) {
        try {
          console.log("Attempting Tesseract OCR extraction...");
          extractedText = await extractTextWithTesseract(buffer);
          
          if (extractedText && extractedText.trim()) {
            extractedText = enhanceMathNotation(extractedText);
            usedService = 'Tesseract';
            console.log(`Tesseract successful - Extracted ${extractedText.length} characters`);
          } else {
            throw new Error("Tesseract returned empty text");
          }
        } catch (tesseractError: any) {
          console.error("Tesseract failed:", tesseractError);
          
          // Try Mathpix as fallback
          if (mathpixAvailable) {
            try {
              console.log("Attempting Mathpix fallback...");
              extractedText = await extractTextFromImage(buffer);
              usedService = 'Mathpix';
              console.log(`Mathpix successful - Extracted ${extractedText.length} characters`);
            } catch (mathpixError: any) {
              console.error("Mathpix fallback failed:", mathpixError);
              throw new Error(`Tesseract and Mathpix both failed: ${tesseractError?.message || tesseractError}, ${mathpixError?.message || mathpixError}`);
            }
          } else {
            throw new Error(`Tesseract failed and Mathpix not configured: ${tesseractError?.message || tesseractError}`);
          }
        }
      } else if (aiOCRAvailable) {
        try {
          console.log("Attempting AI OCR extraction...");
          extractedText = await extractTextWithAI(buffer);
          usedService = 'AI OCR';
          console.log(`AI OCR successful - Extracted ${extractedText.length} characters`);
        } catch (aiError: any) {
          console.error("AI OCR failed:", aiError);
          
          // Try Mathpix as fallback
          if (mathpixAvailable) {
            try {
              console.log("Attempting Mathpix fallback...");
              extractedText = await extractTextFromImage(buffer);
              usedService = 'Mathpix';
              console.log(`Mathpix successful - Extracted ${extractedText.length} characters`);
            } catch (mathpixError: any) {
              console.error("Mathpix failed:", mathpixError);
              throw new Error(`AI OCR and Mathpix both failed: ${aiError?.message}, ${mathpixError?.message}`);
            }
          } else {
            throw aiError;
          }
        }
      } else if (mathpixAvailable) {
        try {
          console.log("Attempting Mathpix OCR extraction...");
          extractedText = await extractTextFromImage(buffer);
          usedService = 'Mathpix';
          console.log(`Mathpix successful - Extracted ${extractedText.length} characters`);
        } catch (mathpixError: any) {
          console.error("Mathpix failed:", mathpixError);
          throw mathpixError;
        }
      } else {
        const errorMsg = "No OCR services available. OpenAI API key recommended for best math recognition.";
        console.error(errorMsg);
        return res.status(503).json({ error: errorMsg });
      }
      
      // Validate extraction result
      if (!extractedText || extractedText.trim().length === 0) {
        return res.status(422).json({ 
          error: "No text could be extracted from this image. Please ensure the image contains readable text or mathematical expressions.",
          service: usedService
        });
      }
      
      console.log(`OCR extraction complete - Service: ${usedService}, Result: "${extractedText.substring(0, 100)}..."`);
      res.json({ text: extractedText, service: usedService });
      
    } catch (error: any) {
      console.error("OCR extraction error:", error);
      res.status(500).json({ 
        error: error.message || "OCR extraction failed",
        details: error.stack
      });
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
      let fileExtension = format;
      switch (format) {
        case "docx":
          contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
          break;
        case "pdf":
          contentType = "text/html";
          fileExtension = "html";
          break;
      }
      
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `attachment; filename=${fileName}.${fileExtension}`);
      res.send(documentBuffer);
    } catch (error) {
      console.error("Error generating document:", error);
      res.status(500).json({ error: "Failed to generate document" });
    }
  });

  // Assessment report generation endpoint
  app.post("/api/generate-assessment-report", async (req, res) => {
    try {
      const { text, format, fileName = "intelligence-assessment" } = req.body;

      if (!text || !format) {
        return res.status(400).json({ error: "Text and format are required" });
      }

      const documentBuffer = await generateAssessmentReport(text, format, fileName);
      
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
      console.error("Error generating assessment report:", error);
      res.status(500).json({ error: "Failed to generate assessment report" });
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

      // Check if Azure Speech credentials are available
      if (!process.env.AZURE_SPEECH_KEY || !process.env.AZURE_SPEECH_ENDPOINT) {
        return res.status(400).json({ error: "Azure Speech credentials are not configured" });
      }

      // Generate speech
      const audioBuffer = await generateSpeech(text);

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
      // Check if Azure Speech credentials are available
      if (!process.env.AZURE_SPEECH_KEY || !process.env.AZURE_SPEECH_ENDPOINT) {
        return res.status(400).json({ error: "Azure Speech credentials are not configured" });
      }

      // Get available voices
      const voices = await getAvailableVoices();
      
      res.json({ voices });
    } catch (error) {
      console.error("Error fetching voices:", error);
      res.status(500).json({ error: "Failed to fetch voices" });
    }
  });

  // AI Detection and assessment endpoint
  app.post("/api/detect-ai", async (req, res) => {
    try {
      // Validate request
      const result = detectAIRequestSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.message });
      }

      const { text, provider = 'openai' } = result.data;

      // First, try using GPTZero if it's available
      if (process.env.GPTZERO_API_KEY) {
        try {
          // Detect if text is AI-generated using GPTZero
          const detectionResult = await detectAIContent(text);
          
          // Add assessment text to the response
          const assessment = generateAssessment(detectionResult.probability);
          return res.json({
            ...detectionResult,
            assessment
          });
        } catch (gptzeroError) {
          console.error(`GPTZero detection failed, using ${provider} fallback:`, gptzeroError);
          // Fall through to the selected provider assessment
        }
      }
      
      // Use the selected provider for assessment
      let assessmentResult;
      try {
        switch (provider) {
          case 'anthropic':
            if (!process.env.ANTHROPIC_API_KEY) {
              throw new Error("Anthropic API key is not configured");
            }
            assessmentResult = await assessWithAnthropic(text);
            break;
          case 'perplexity':
            if (!process.env.PERPLEXITY_API_KEY) {
              throw new Error("Perplexity API key is not configured");
            }
            assessmentResult = await assessWithPerplexity(text);
            break;
          case 'openai':
          default:
            assessmentResult = await directAssessText(text);
            break;
        }
      } catch (providerError) {
        console.error(`Error with ${provider} assessment:`, providerError);
        // If the selected provider fails, fall back to OpenAI
        if (provider !== 'openai') {
          console.log("Falling back to OpenAI for assessment");
          assessmentResult = await directAssessText(text);
        } else {
          throw providerError;
        }
      }
      return res.json(assessmentResult);
    } catch (error) {
      console.error("Error analyzing text:", error);
      let errorMessage = "Failed to analyze text";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      res.status(500).json({ error: errorMessage });
    }
  });
  
  // Helper function to generate assessment text based on AI generation probability
  function generateAssessment(probability: number): string {
    if (probability > 0.8) {
      return "This text appears to be AI-generated with high confidence. It may lack the natural variance and personal style of human writing. Consider adding more personal voice, unique expressions, and varying your sentence structure to make it more authentic.";
    } else if (probability > 0.6) {
      return "This text likely contains AI-generated elements. While it's well-structured, it may benefit from more distinctive phrasing and personal perspectives. Try incorporating more of your unique voice and experiences.";
    } else if (probability > 0.4) {
      return "This text shows a balance of AI and human-like qualities. It has decent structure but could benefit from more specific details and personal insights to increase its authenticity and impact.";
    } else if (probability > 0.2) {
      return "This text appears mostly human-written. It has good natural variation, though some sections might be refined for stronger personal voice. Consider enhancing specific points with concrete examples or unique perspectives.";
    } else {
      return "This text demonstrates characteristics of authentic human writing, with natural variation in structure and expression. It has a good balance of complexity and clarity, with a distinctive personal voice.";
    }
  }

  app.post("/api/settings/api-keys", async (req, res) => {
    try {
      const result = apiKeyRequestSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.message });
      }

      const { gladiaKey, openaiKey, deepgramKey, elevenLabsKey, anthropicKey, perplexityKey, gptzeroKey } = result.data;

      // In a real application, these would be stored in Replit Secrets
      // For the purposes of this demo, we're setting them in process.env
      // but they will not persist between restarts
      
      if (gladiaKey) process.env.GLADIA_API_KEY = gladiaKey;
      if (openaiKey) process.env.OPENAI_API_KEY = openaiKey;
      if (deepgramKey) process.env.DEEPGRAM_API_KEY = deepgramKey;
      if (elevenLabsKey) process.env.ELEVENLABS_API_KEY = elevenLabsKey;
      if (anthropicKey) process.env.ANTHROPIC_API_KEY = anthropicKey;
      if (perplexityKey) process.env.PERPLEXITY_API_KEY = perplexityKey;
      if (gptzeroKey) process.env.GPTZERO_API_KEY = gptzeroKey;
      
      // Return the updated service status
      const services = {
        gladia: !!process.env.GLADIA_API_KEY,
        openai: !!process.env.OPENAI_API_KEY,
        deepgram: !!process.env.DEEPGRAM_API_KEY,
        elevenLabs: !!process.env.ELEVENLABS_API_KEY,
        anthropic: !!process.env.ANTHROPIC_API_KEY,
        perplexity: !!process.env.PERPLEXITY_API_KEY,
        gptzero: !!process.env.GPTZERO_API_KEY
      };
      
      res.json({ 
        success: true, 
        message: "API keys updated successfully",
        services 
      });
    } catch (error) {
      console.error("Error updating API keys:", error);
      let errorMessage = "Failed to update API keys";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      res.status(500).json({ error: errorMessage });
    }
  });

  // LaTeX export endpoint
  app.post("/api/export/latex", async (req, res) => {
    try {
      const { text, title, author, format = 'tex' } = req.body;
      
      if (!text) {
        return res.status(400).json({ error: "Text content is required" });
      }

      const options: LaTeXExportOptions = {
        title: title || 'Mathematical Document',
        author: author || 'Generated by Genius Dictation'
      };

      const latexBuffer = generateLaTeXFile(text, options);
      
      // Set appropriate headers
      const filename = format === 'tex' ? 'document.tex' : 'document.latex';
      res.setHeader('Content-Type', 'application/x-tex');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      res.send(latexBuffer);
    } catch (error) {
      console.error("Error generating LaTeX:", error);
      res.status(500).json({ error: "Failed to generate LaTeX document" });
    }
  });

  const httpServer = createServer(app);
  
  // Set up WebSocket server for real-time transcription
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    
    let currentSpeechEngine = SpeechEngine.WHISPER; // default engine
    
    // Store WebSpeechAPI recognition instance outside the message handler for cleanup
    let browserRecognition: any = null;
    
    ws.on('message', async (message) => {
      try {
        // Parse the message
        const data = JSON.parse(message.toString());
        
        // Handle different message types
        switch (data.type) {
          case 'start_transcription':
            // Set or update the speech engine when starting
            currentSpeechEngine = data.engine || SpeechEngine.WHISPER;
            console.log(`Starting real-time transcription with engine: ${currentSpeechEngine}`);
            
            // Initialize browser-based recognition if selected
            if (data.useBrowserRecognition) {
              // We'll handle this in the client side
              ws.send(JSON.stringify({ 
                type: 'status', 
                status: 'ready', 
                message: 'Using browser speech recognition' 
              }));
            } else {
              ws.send(JSON.stringify({ 
                type: 'status', 
                status: 'ready', 
                message: `Real-time transcription started with ${currentSpeechEngine}` 
              }));
            }
            break;
            
          case 'audio_data':
            if (!data.audioChunk) {
              // Just silently ignore invalid chunks
              break;
            }
            
            try {
              // We're using browser speech recognition for real-time transcription as it's more efficient
              // The server APIs need larger audio chunks than what we're sending every second
              // Just send a heartbeat to let the client know the connection is still active
              
              ws.send(JSON.stringify({ 
                type: 'status', 
                status: 'processing',
                message: 'Processing audio...'
              }));
              
              // Note: For a production system, we would implement proper streaming transcription
              // using services like Deepgram's streaming API, AssemblyAI's real-time transcription,
              // or Azure Speech-to-Text streaming - all of which support WebSocket streaming
              
              // The current fallback to browser's WebSpeech API works well for now
            } catch (error) {
              // Just log to server console, don't send error to client to avoid popups
              console.log('Using browser speech recognition for real-time feedback');
            }
            break;
            
          case 'stop_transcription':
            console.log('Stopping real-time transcription');
            // Clean up any resources if needed
            if (browserRecognition) {
              // Clean up browser recognition if it was being used
              browserRecognition = null;
            }
            
            ws.send(JSON.stringify({ 
              type: 'status', 
              status: 'stopped', 
              message: 'Real-time transcription stopped' 
            }));
            break;
            
          default:
            ws.send(JSON.stringify({ 
              type: 'error', 
              message: 'Unknown message type' 
            }));
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({ 
          type: 'error', 
          message: 'Failed to process message' 
        }));
      }
    });
    
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      // Clean up any resources
      if (browserRecognition) {
        browserRecognition = null;
      }
    });
    
    // Send initial connection acknowledgment
    ws.send(JSON.stringify({ 
      type: 'status', 
      status: 'connected', 
      message: 'Connected to real-time transcription service' 
    }));
  });
  
  return httpServer;
}
