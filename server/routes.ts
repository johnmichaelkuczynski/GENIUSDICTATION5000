import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import passport from "./auth";
import bcrypt from "bcryptjs";
import { users } from "@shared/schema";
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
  detectAIResponseSchema,
  insertDocumentSchema, 
  insertRewriteJobSchema, 
  rewriteRequestSchema,
  type RewriteRequest, 
  type RewriteResponse,
  type RewriteRequestValidated
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
import { assessText } from "./services/textAssessment";
import { directAssessText } from "./services/directAssessment";
import { assessWithAnthropic } from "./services/anthropicAssessment";
import { assessWithPerplexity } from "./services/perplexityAssessment";
import { extractTextFromImage, isMathpixConfigured } from "./services/mathpix";
import { extractTextWithTesseract, enhanceMathNotation, isTesseractAvailable } from "./services/tesseractOCR";
import { aiProviderService } from "./services/aiProviders";
import { extractTextWithAI, isAIOCRAvailable } from "./services/aiOCR";
import { sendProcessedText } from "./services/sendgrid";
// Texify service removed - service no longer exists

// GPT Bypass imports
import { fileProcessorService } from "./services/fileProcessor";
import { textChunkerService } from "./services/textChunker";
import { detectAIContent as detectAIContentFn } from "./services/gptzero";
import { intelligentRewriteService } from "./services/intelligentRewrite";
import { generateGraphFromDescription } from "./services/graphGenerator";

// Create a simple service wrapper for consistency
const gptZeroService = {
  analyzeText: async (text: string) => {
    const result = await detectAIContentFn(text);
    return {
      aiScore: Math.round(result.probability * 100),
      isAIGenerated: result.isAIGenerated,
      humanLikelihood: result.humanLikelihood
    };
  },
  analyzeBatch: async (texts: string[]) => {
    const results = await Promise.all(texts.map(text => detectAIContentFn(text)));
    return results.map(result => ({
      aiScore: Math.round(result.probability * 100),
      isAIGenerated: result.isAIGenerated,
      humanLikelihood: result.humanLikelihood
    }));
  }
};

// Set up multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB limit
});

// Configure multer for GPT Bypass file uploads
const gptBypassUpload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});

function cleanMarkup(text: string): string {
  return text
    // Remove markdown bold/italic markers
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
    // Remove markdown headers
    .replace(/^#{1,6}\s+/gm, '')
    // Remove inline code backticks
    .replace(/`([^`]+)`/g, '$1')
    // Remove code block markers
    .replace(/```[\s\S]*?```/g, (match) => {
      return match.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '');
    })
    // Remove other common markdown symbols
    .replace(/~~([^~]+)~~/g, '$1') // strikethrough
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
    .replace(/>\s+/gm, '') // blockquotes
    // Remove excessive whitespace and clean up
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

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
      deepseek: !!process.env.DEEPSEEK_API_KEY,
      gptzero: !!gptzeroKey,
      mathpix: mathpixConfigured,
      tesseract: tesseractAvailable
    };
    
    // At least one service must be available
    const connected = services.gladia || services.openai || services.deepgram;
    
    // We need at least one AI service (OpenAI, Anthropic, Perplexity, or DeepSeek) for text transformation
    const aiConnected = services.openai || services.anthropic || services.perplexity || services.deepseek;
    
    res.json({ connected: connected && aiConnected, services });
  });

  // Authentication routes
  
  // Register endpoint
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }
      
      // Check if user already exists
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");
      const [existingUser] = await db.select().from(users).where(eq(users.username, username));
      
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create user
      const [newUser] = await db.insert(users).values({
        username,
        password: hashedPassword,
      }).returning();
      
      // Log in the user
      req.login(newUser, (err) => {
        if (err) {
          return res.status(500).json({ message: "Registration successful but login failed" });
        }
        
        res.json({
          id: newUser.id,
          username: newUser.username,
        });
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Registration failed" });
    }
  });
  
  // Login endpoint
  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ message: "Authentication error" });
      }
      
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }
      
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Login failed" });
        }
        
        res.json({
          id: user.id,
          username: user.username,
        });
      });
    })(req, res, next);
  });
  
  // Logout endpoint
  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });
  
  // Get current user
  app.get("/api/auth/user", (req, res) => {
    if (req.isAuthenticated()) {
      const user = req.user as any;
      res.json({
        id: user.id,
        username: user.username,
      });
    } else {
      res.status(401).json({ message: "Not authenticated" });
    }
  });

  // Text transformation endpoint
  app.post("/api/transform", async (req, res) => {
    try {
      const result = transformRequestSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.message });
      }

      const { text, instructions, model = AIModel.GPT4O } = result.data;

      // Determine provider based on model
      let provider = 'openai'; // default
      if (model.includes('Claude')) provider = 'anthropic';
      else if (model.includes('Perplexity')) provider = 'perplexity'; 
      else if (model.includes('DeepSeek')) provider = 'deepseek';

      const transformedText = await aiProviderService.rewrite(provider, {
        inputText: text,
        customInstructions: instructions || "REWRITE SO THAT THE OUTPUT SCORES MAXIMALLY HIGH WITH RESPECT TO THE FOLLOWING QUESTIONS: IS IT INSIGHTFUL? DOES IT DEVELOP POINTS? (OR, IF IT IS A SHORT EXCERPT, IS THERE EVIDENCE THAT IT WOULD DEVELOP POINTS IF EXTENDED)? IS THE ORGANIZATION MERELY SEQUENTIAL (JUST ONE POINT AFTER ANOTHER, LITTLE OR NO LOGICAL SCAFFOLDING)? OR ARE THE IDEAS ARRANGED, NOT JUST SEQUENTIALLY BUT HIERARCHICALLY? IF THE POINTS IT MAKES ARE NOT INSIGHTFUL, DOES IT OPERATE SKILLFULLY WITH CANONS OF LOGIC/REASONING. ARE THE POINTS CLICHES? OR ARE THEY FRESH? DOES IT USE TECHNICAL JARGON TO OBFUSCATE OR TO RENDER MORE PRECISE? IS IT ORGANIC? DO POINTS DEVELOP IN AN ORGANIC, NATURAL WAY? DO THEY UNFOLD? OR ARE THEY FORCED AND ARTIFICIAL? DOES IT OPEN UP NEW DOMAINS? OR, ON THE CONTRARY, DOES IT SHUT OFF INQUIRY (BY CONDITIONALIZING FURTHER DISCUSSION OF THE MATTERS ON ACCEPTANCE OF ITS INTERNAL AND POSSIBLY VERY FAULTY LOGIC)? IS IT ACTUALLY INTELLIGENT OR JUST THE WORK OF SOMEBODY WHO, JUDGING BY THE SUBJECT-MATTER, IS PRESUMED TO BE INTELLIGENT (BUT MAY NOT BE)? IS IT REAL OR IS IT PHONY? DO THE SENTENCES EXHIBIT COMPLEX AND COHERENT INTERNAL LOGIC? IS THE PASSAGE GOVERNED BY A STRONG CONCEPT? OR IS THE ONLY ORGANIZATION DRIVEN PURELY BY EXPOSITORY (AS OPPOSED TO EPISTEMIC) NORMS? IS THERE SYSTEM-LEVEL CONTROL OVER IDEAS? IN OTHER WORDS, DOES THE AUTHOR SEEM TO RECALL WHAT HE SAID EARLIER AND TO BE IN A POSITION TO INTEGRATE IT INTO POINTS HE HAS MADE SINCE THEN? ARE THE POINTS REAL? ARE THEY FRESH? OR IS SOME INSTITUTION OR SOME ACCEPTED VEIN OF PROPAGANDA OR ORTHODOXY JUST USING THE AUTHOR AS A MOUTH PIECE? IS THE WRITING EVASIVE OR DIRECT? ARE THE STATEMENTS AMBIGUOUS? DOES THE PROGRESSION OF THE TEXT DEVELOP ACCORDING TO WHO SAID WHAT OR ACCORDING TO WHAT ENTAILS OR CONFIRMS WHAT? DOES THE AUTHOR USE OTHER AUTHORS TO DEVELOP HIS IDEAS OR TO CLOAK HIS OWN LACK OF IDEAS?"
      });

      res.json({ text: transformedText, model });
    } catch (error) {
      console.error("Error transforming text:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to transform text"
      });
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

  // Document generation endpoint with graph separation support
  app.post("/api/generate-document", async (req, res) => {
    try {
      const { text, format, fileName = "document", separateGraphs = false } = req.body;

      if (!text || !format) {
        return res.status(400).json({ error: "Text and format are required" });
      }

      let documentBuffer;
      
      if (separateGraphs && format === "pdf") {
        // Extract graphs and generate combined document with graphs on top
        const extractGraphsFromText = (text: string) => {
          const graphs = [];
          const svgPattern = /\*\*Figure: Mathematical Visualization\*\*\s*\n\n(<svg[^]*?<\/svg>)\s*\n\n\*The above graph[^]*?\*\n\n/g;
          let match;
          let graphIndex = 1;
          
          while ((match = svgPattern.exec(text)) !== null) {
            const svgContent = match[1];
            const titleMatch = svgContent.match(/<text[^>]*class="graph-title"[^>]*>([^<]+)<\/text>/);
            const title = titleMatch ? titleMatch[1] : `Mathematical Visualization ${graphIndex}`;
            
            graphs.push({
              svg: svgContent,
              title: title,
              caption: "The above graph illustrates the mathematical relationship described in the analysis."
            });
            graphIndex++;
          }
          return graphs;
        };
        
        const removeGraphsFromText = (text: string) => {
          const svgPattern = /\*\*Figure: Mathematical Visualization\*\*\s*\n\n<svg[^]*?<\/svg>\s*\n\n\*The above graph[^]*?\*\n\n/g;
          return text.replace(svgPattern, '').trim();
        };
        
        const graphs = extractGraphsFromText(text);
        const cleanText = removeGraphsFromText(text);
        
        // Generate combined HTML with graphs on top, text below
        const currentDate = new Date().toLocaleDateString();
        const combinedHTML = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>${fileName}</title>
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
            <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
            <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>
            <style>
              @page { margin: 2cm; size: A4; }
              @media print { .no-print { display: none !important; } .page-break { page-break-before: always; } }
              body { font-family: 'Times New Roman', serif; font-size: 14px; line-height: 1.6; margin: 0; padding: 20px; background: white; color: #000; }
              .header { text-align: center; margin-bottom: 3em; border-bottom: 2px solid #333; padding-bottom: 1em; }
              .title { font-size: 2em; font-weight: bold; margin-bottom: 0.5em; }
              .date { font-size: 1em; color: #666; }
              .graphs-section { margin-bottom: 4em; }
              .graph-container { margin: 3em 0; page-break-inside: avoid; text-align: center; border: 1px solid #ddd; padding: 2em; border-radius: 8px; background: #fafafa; }
              .text-section { white-space: pre-wrap; word-wrap: break-word; }
              svg { max-width: 100%; height: auto; }
              .print-controls { position: fixed; top: 20px; right: 20px; background: #007bff; color: white; border: none; padding: 15px 25px; border-radius: 5px; cursor: pointer; font-size: 16px; z-index: 1000; box-shadow: 0 2px 10px rgba(0,0,0,0.2); }
              .print-controls:hover { background: #0056b3; }
              h1, h2, h3, h4, h5, h6 { page-break-after: avoid; margin-top: 1.5em; margin-bottom: 0.5em; }
              .katex { font-size: 1em; }
              .katex-display { margin: 1em 0; page-break-inside: avoid; }
            </style>
          </head>
          <body>
            <button class="print-controls no-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
            
            <div class="header">
              <div class="title">${fileName}</div>
              <div class="date">${currentDate}</div>
            </div>
            
            ${graphs.length > 0 ? `
              <div class="graphs-section">
                <h2 style="text-align: center; margin-bottom: 2em; font-size: 1.5em; font-weight: bold;">Mathematical Visualizations</h2>
                ${graphs.map((graph, index) => `
                  <div class="graph-container">
                    <h3 style="margin-bottom: 1em; font-size: 1.2em; font-weight: bold;">${graph.title}</h3>
                    <div class="graph-content" style="margin: 1em 0;">${graph.svg}</div>
                    <p style="margin-top: 1em; font-style: italic; color: #666; font-size: 0.9em;">${graph.caption}</p>
                  </div>
                `).join('')}
              </div>
              <div class="page-break"></div>
            ` : ''}
            
            <div class="text-section">
              <h2 style="margin-bottom: 1em;">Analysis</h2>
              ${cleanText.replace(/\n\n/g, '</p><p>').replace(/^/, '<p>').replace(/$/, '</p>').replace(/<p><\/p>/g, '')}
            </div>
            
            <script>
              document.addEventListener("DOMContentLoaded", function() {
                if (window.renderMathInElement) {
                  renderMathInElement(document.body, {
                    delimiters: [
                      {left: "$$", right: "$$", display: true},
                      {left: "$", right: "$", display: false},
                      {left: "\\\\[", right: "\\\\]", display: true},
                      {left: "\\\\(", right: "\\\\)", display: false}
                    ],
                    throwOnError: false
                  });
                }
              });
            </script>
          </body>
          </html>
        `;
        
        documentBuffer = Buffer.from(combinedHTML, 'utf8');
      } else {
        // Use existing document generation
        documentBuffer = await generateDocument(text, format, fileName);
      }
      
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

      const { text, voice, speed } = result.data;

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

      // Get available voices from Azure Speech
      const azureVoices = await getAvailableVoices();
      
      // Transform Azure voices to ElevenLabs format for frontend compatibility
      const voices = azureVoices.slice(0, 10).map((voice: any, index: number) => ({
        voice_id: voice.ShortName || `azure-voice-${index}`,
        name: voice.DisplayName || voice.LocalName || voice.Name || `Voice ${index + 1}`,
        category: voice.Locale || 'General',
        settings: {
          stability: 0.5,
          similarity_boost: 0.8,
          style: 0.0,
          use_speaker_boost: true
        }
      }));
      
      res.json({ voices });
    } catch (error) {
      console.error("Error fetching voices:", error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error("Error details:", errorMsg, errorStack);
      res.status(500).json({ error: "Failed to fetch voices", details: errorMsg });
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

      const { text } = result.data;
      const provider = req.body.provider || 'openai';

      // First, try using GPTZero if it's available
      if (process.env.GPTZERO_API_KEY) {
        try {
          // Detect if text is AI-generated using GPTZero
          const detectionResult = await detectAIContentFn(text);
          
          // Return raw detection result without canned assessment
          return res.json(detectionResult);
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
        // No fallbacks allowed - must fail if provider fails
        throw providerError;
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
    throw new Error("CANNED_FALLBACK_BLOCKED: route must not short-circuit assessment.");
  }

  app.post("/api/settings/api-keys", async (req, res) => {
    try {
      const result = apiKeyRequestSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.message });
      }

      const { keys } = result.data;
      const { gladiaKey, openaiKey, deepgramKey, elevenLabsKey, anthropicKey, perplexityKey, gptzeroKey } = keys;

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

  // =============================================================================
  // GPT BYPASS ROUTES - Advanced AI Text Rewriting System
  // =============================================================================
  
  // File upload endpoint for GPT Bypass
  app.post("/api/gpt-bypass/upload", gptBypassUpload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      await fileProcessorService.validateFile(req.file);
      const processedFile = await fileProcessorService.processFile(req.file.path, req.file.originalname);
      
      // Analyze with GPTZero
      const gptZeroResult = await gptZeroService.analyzeText(processedFile.content);
      
      // Create document record
      const document = await storage.createDocument({
        filename: processedFile.filename,
        content: processedFile.content,
        wordCount: processedFile.wordCount,
        aiScore: gptZeroResult.aiScore,
      });

      // Generate chunks if text is long enough
      const chunks = processedFile.wordCount > 500 
        ? textChunkerService.chunkText(processedFile.content)
        : [];

      // Analyze chunks if they exist
      if (chunks.length > 0) {
        const chunkTexts = chunks.map(chunk => chunk.content);
        const chunkResults = await gptZeroService.analyzeBatch(chunkTexts);
        
        chunks.forEach((chunk, index) => {
          chunk.aiScore = chunkResults[index].aiScore;
        });
      }

      res.json({
        document,
        chunks,
        aiScore: gptZeroResult.aiScore,
        needsChunking: processedFile.wordCount > 500,
      });
    } catch (error) {
      console.error('File upload error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: errorMsg });
    }
  });

  // Text analysis endpoint for GPT Bypass (for direct text input)
  app.post("/api/gpt-bypass/analyze-text", async (req, res) => {
    try {
      const { text } = req.body;
      
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ message: "Text is required" });
      }

      const gptZeroResult = await gptZeroService.analyzeText(text);
      const wordCount = text.trim().split(/\s+/).length;
      
      // Generate chunks if text is long enough
      const chunks = wordCount > 500 ? textChunkerService.chunkText(text) : [];
      
      // Analyze chunks if they exist
      if (chunks.length > 0) {
        const chunkTexts = chunks.map(chunk => chunk.content);
        const chunkResults = await gptZeroService.analyzeBatch(chunkTexts);
        
        chunks.forEach((chunk, index) => {
          chunk.aiScore = chunkResults[index].aiScore;
        });
      }

      res.json({
        aiScore: gptZeroResult.aiScore,
        wordCount,
        chunks,
        needsChunking: wordCount > 500,
      });
    } catch (error) {
      console.error('Text analysis error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: errorMsg });
    }
  });

  // Main rewrite endpoint for GPT Bypass
  app.post("/api/gpt-bypass/rewrite", async (req, res) => {
    try {
      // Validate request using Zod schema
      const validationResult = rewriteRequestSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid request", 
          errors: validationResult.error.errors 
        });
      }
      
      const rewriteRequest = validationResult.data;

      // Analyze input text
      const inputAnalysis = await gptZeroService.analyzeText(rewriteRequest.inputText);
      
      // Build enhanced style text from selected samples
      let enhancedStyleText = rewriteRequest.styleText || '';
      
      // Add selected style samples to style text
      if (rewriteRequest.selectedStyleSamples && rewriteRequest.selectedStyleSamples.length > 0) {
        console.log('🔥 Processing', rewriteRequest.selectedStyleSamples.length, 'selected style samples');
        
        // For now, just log the selected samples - full implementation would fetch from storage
        console.log('🔥 Selected style sample IDs:', rewriteRequest.selectedStyleSamples);
        // TODO: Implement proper sample retrieval and enhancement
        // const styleSamples = await storage.getStyleSamplesByIds(rewriteRequest.selectedStyleSamples);
        // if (styleSamples.length > 0) {
        //   const samplesText = styleSamples.map(sample => 
        //     `--- STYLE SAMPLE: ${sample.name} ---\n${sample.content}\n`
        //   ).join('\n');
        //   enhancedStyleText = enhancedStyleText ? 
        //     `${enhancedStyleText}\n\n${samplesText}` : samplesText;
        // }
      }
      
      // Build enhanced content mix from selected samples
      let enhancedContentMix = rewriteRequest.contentMixText || '';
      
      // Add selected content samples to content mix
      if (rewriteRequest.selectedContentSamples && rewriteRequest.selectedContentSamples.length > 0) {
        console.log('🔥 Processing', rewriteRequest.selectedContentSamples.length, 'selected content samples');
        
        // For now, just log the selected samples - full implementation would fetch from storage
        console.log('🔥 Selected content sample IDs:', rewriteRequest.selectedContentSamples);
        // TODO: Implement proper sample retrieval and enhancement
        // const contentSamples = await storage.getContentSamplesByIds(rewriteRequest.selectedContentSamples);
        // if (contentSamples.length > 0) {
        //   const samplesText = contentSamples.map(sample => 
        //     `--- CONTENT SAMPLE: ${sample.name} ---\n${sample.content}\n`
        //   ).join('\n');
        //   enhancedContentMix = enhancedContentMix ? 
        //     `${enhancedContentMix}\n\n${samplesText}` : samplesText;
        // }
      }
      
      // Create rewrite job with granular sample selection
      const rewriteJob = await storage.createRewriteJob({
        inputText: rewriteRequest.inputText,
        styleText: enhancedStyleText,
        contentMixText: enhancedContentMix,
        customInstructions: rewriteRequest.customInstructions,
        selectedPresets: rewriteRequest.selectedPresets,
        provider: rewriteRequest.provider,
        chunks: [],
        selectedChunkIds: rewriteRequest.selectedChunkIds,
        mixingMode: rewriteRequest.mixingMode,
        selectedStyleSamples: rewriteRequest.selectedStyleSamples,
        selectedContentSamples: rewriteRequest.selectedContentSamples,
        inputAiScore: inputAnalysis.aiScore,
        status: "processing",
      });

      try {
        
      // Perform rewrite with enhanced samples
      const rewrittenText = await aiProviderService.rewrite(rewriteRequest.provider, {
        inputText: rewriteRequest.inputText,
        styleText: enhancedStyleText,
        contentMixText: enhancedContentMix,
        customInstructions: rewriteRequest.customInstructions,
        selectedPresets: rewriteRequest.selectedPresets,
        mixingMode: rewriteRequest.mixingMode,
      });

        // Analyze output text
        const outputAnalysis = await gptZeroService.analyzeText(rewrittenText);

        // Clean markup from rewritten text
        const cleanedRewrittenText = cleanMarkup(rewrittenText);

        // Update job with results
        await storage.updateRewriteJob(rewriteJob.id, {
          outputText: cleanedRewrittenText,
          outputAiScore: outputAnalysis.aiScore,
          status: "completed",
        });

        const response: RewriteResponse = {
          rewrittenText: cleanedRewrittenText,
          inputAiScore: inputAnalysis.aiScore,
          outputAiScore: outputAnalysis.aiScore,
          jobId: rewriteJob.id,
        };

        res.json(response);
      } catch (error) {
        // Update job with error status
        await storage.updateRewriteJob(rewriteJob.id, {
          status: "failed",
        });
        throw error;
      }
    } catch (error) {
      console.error('Rewrite error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: errorMsg });
    }
  });

  // Re-rewrite endpoint for GPT Bypass
  app.post("/api/gpt-bypass/re-rewrite/:jobId", async (req, res) => {
    try {
      const { jobId } = req.params;
      const { customInstructions, selectedPresets, provider, styleText } = req.body;
      
      console.log("🔥 RE-HUMANIZE - Style text from request:", !!styleText, "Length:", styleText?.length || 0);
      
      const originalJob = await storage.getRewriteJob(jobId);
      if (!originalJob || !originalJob.outputText) {
        return res.status(404).json({ message: "Original job not found or incomplete" });
      }

      // Create new rewrite job using the previous output as input and current style text
      const finalStyleText = styleText || originalJob.styleText || undefined;
      console.log("🔥 RE-HUMANIZE - Final style text used:", !!finalStyleText, "Length:", finalStyleText?.length || 0);
      
      const rewriteJob = await storage.createRewriteJob({
        inputText: originalJob.outputText,
        styleText: finalStyleText,
        contentMixText: originalJob.contentMixText || undefined,
        customInstructions: customInstructions || originalJob.customInstructions,
        selectedPresets: selectedPresets || originalJob.selectedPresets,
        provider: provider || originalJob.provider,
        chunks: [],
        selectedChunkIds: [],
        mixingMode: originalJob.mixingMode || undefined,
        inputAiScore: originalJob.outputAiScore,
        status: "processing",
      });

      try {
        // Perform re-rewrite using current style text from Box B
        const rewrittenText = await aiProviderService.rewrite(provider || originalJob.provider, {
          inputText: originalJob.outputText,
          styleText: finalStyleText,
          contentMixText: originalJob.contentMixText || undefined,
          customInstructions: customInstructions || originalJob.customInstructions,
          selectedPresets: selectedPresets || originalJob.selectedPresets,
          mixingMode: originalJob.mixingMode || undefined,
        });

        // Analyze new output
        const outputAnalysis = await gptZeroService.analyzeText(rewrittenText);

        // Clean markup from output
        const cleanedRewrittenText = cleanMarkup(rewrittenText);

        // Update job with results
        await storage.updateRewriteJob(rewriteJob.id, {
          outputText: cleanedRewrittenText,
          outputAiScore: outputAnalysis.aiScore,
          status: "completed",
        });

        const response: RewriteResponse = {
          rewrittenText: cleanedRewrittenText,
          inputAiScore: originalJob.outputAiScore || 0,
          outputAiScore: outputAnalysis.aiScore,
          jobId: rewriteJob.id,
        };

        res.json(response);
      } catch (error) {
        await storage.updateRewriteJob(rewriteJob.id, { status: "failed" });
        throw error;
      }
    } catch (error) {
      console.error('Re-rewrite error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: errorMsg });
    }
  });

  // Get rewrite job status for GPT Bypass
  app.get("/api/gpt-bypass/jobs/:jobId", async (req, res) => {
    try {
      const { jobId } = req.params;
      const job = await storage.getRewriteJob(jobId);
      
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      res.json(job);
    } catch (error) {
      console.error('Get job error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: errorMsg });
    }
  });

  // List recent jobs for GPT Bypass
  app.get("/api/gpt-bypass/jobs", async (req, res) => {
    try {
      const jobs = await storage.listRewriteJobs();
      res.json(jobs);
    } catch (error) {
      console.error('List jobs error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: errorMsg });
    }
  });

  // Chat endpoint for GPT Bypass
  app.post("/api/gpt-bypass/chat", async (req, res) => {
    try {
      const { message, provider, context } = req.body;
      
      if (!message || !provider) {
        return res.status(400).json({ error: "Message and provider are required" });
      }

      console.log(`🔥 CHAT REQUEST - Provider: ${provider}, Message: "${message}"`);
      console.log(`🔥 CHAT CONTEXT:`, context);

      // Build context-aware system instructions
      let contextInfo = "";
      let providerName = "";
      
      switch (provider) {
        case 'openai':
          providerName = "OpenAI's GPT-4o";
          break;
        case 'anthropic':
          providerName = "Anthropic's Claude Sonnet 4";
          break;
        case 'deepseek':
          providerName = "DeepSeek Chat";
          break;
        case 'perplexity':
          providerName = "Perplexity's Sonar model";
          break;
      }

      if (context) {
        contextInfo = "\n\nCONTEXT - You have access to the following content from the GPT Bypass text rewriting application:\n";
        
        if (context.inputText) {
          contextInfo += `\nINPUT TEXT (Box A - text to be rewritten): "${context.inputText}"\n`;
        }
        
        if (context.styleText) {
          contextInfo += `\nSTYLE SAMPLE (Box B - writing style to mimic): "${context.styleText}"\n`;
        }
        
        if (context.contentMixText) {
          contextInfo += `\nCONTENT REFERENCE (Box C - content to blend/mix): "${context.contentMixText}"\n`;
        }
        
        if (context.outputText) {
          contextInfo += `\nREWRITTEN OUTPUT (Box D - current rewrite result): "${context.outputText}"\n`;
        }
        
        contextInfo += `\nYou can help analyze, improve, or work with any of this content. You understand the text rewriting workflow and can provide insights about style analysis, content mixing, and rewriting strategies.`;
      }

      const systemInstructions = `You are ${providerName}, a helpful AI assistant integrated into a GPT Bypass text rewriting application. Answer the user's question directly and clearly. If asked which LLM you are, respond that you are ${providerName}.${contextInfo}`;

      let response: string;
      
      switch (provider) {
        case 'openai':
          response = await aiProviderService.rewriteWithOpenAI({ 
            inputText: message,
            customInstructions: systemInstructions
          });
          break;
        case 'anthropic':
          response = await aiProviderService.rewriteWithAnthropic({ 
            inputText: message,
            customInstructions: systemInstructions
          });
          break;
        case 'deepseek':
          response = await aiProviderService.rewriteWithDeepSeek({ 
            inputText: message,
            customInstructions: systemInstructions
          });
          break;
        case 'perplexity':
          response = await aiProviderService.rewriteWithPerplexity({ 
            inputText: message,
            customInstructions: systemInstructions
          });
          break;
        default:
          return res.status(400).json({ error: "Invalid provider" });
      }

      console.log(`🔥 CHAT RESPONSE - Length: ${response?.length || 0}`);
      res.json({ response: cleanMarkup(response) });
    } catch (error: any) {
      console.error('Chat error:', error);
      res.status(500).json({ 
        error: `API Error: ${error.message}`,
        details: error.toString()
      });
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
  
  // Intelligence Evaluation endpoints
  app.post("/api/evaluate-intelligence", async (req, res) => {
    try {
      const { text, provider = 'deepseek', comprehensive = true } = req.body;
      
      if (!text) {
        return res.status(400).json({ error: 'Text is required' });
      }

      console.log("Starting intelligence evaluation via API");
      const { intelligenceEvaluationService } = await import('./services/intelligenceEvaluationNew.js');
      const result = await intelligenceEvaluationService.evaluateIntelligence(text, provider, comprehensive);
      
      res.json(result);
    } catch (error: any) {
      console.error('Intelligence evaluation error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/evaluate-originality", async (req, res) => {
    try {
      const { text, provider = 'deepseek' } = req.body;
      
      if (!text) {
        return res.status(400).json({ error: 'Text is required' });
      }

      console.log("Starting originality evaluation via API");
      const { intelligenceEvaluationService } = await import('./services/intelligenceEvaluationNew.js');
      const result = await intelligenceEvaluationService.evaluateOriginality(text, provider);
      
      res.json(result);
    } catch (error: any) {
      console.error('Originality evaluation error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Intelligent rewrite endpoint
  app.post("/api/intelligent-rewrite", async (req, res) => {
    try {
      const { text, customInstructions, provider = 'deepseek' } = req.body;
      
      if (!text) {
        return res.status(400).json({ error: 'Text is required' });
      }

      console.log("Starting intelligent rewrite via API");
      const rewrittenText = await intelligentRewriteService.rewrite({
        text,
        customInstructions,
        provider
      });
      
      // Clean markup from rewritten text
      const cleanedRewrittenText = cleanMarkup(rewrittenText);
      
      res.json({ rewrittenText: cleanedRewrittenText });
    } catch (error: any) {
      console.error('Intelligent rewrite error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Generate graph from natural language description
  app.post("/api/generate-graph", async (req, res) => {
    try {
      const { description } = req.body;
      
      if (!description || typeof description !== 'string') {
        return res.status(400).json({ error: 'Description is required' });
      }

      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ error: 'OpenAI API key not configured' });
      }

      console.log("Generating graph from description:", description);
      const result = await generateGraphFromDescription(description);
      
      res.json(result);
    } catch (error: any) {
      console.error('Graph generation error:', error);
      res.status(500).json({ error: error.message || 'Failed to generate graph' });
    }
  });
  
  return httpServer;
}
