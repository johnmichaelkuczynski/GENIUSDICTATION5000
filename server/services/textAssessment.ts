/**
 * Service for performing text assessment with or without GPTZero
 */

import OpenAI from "openai";
import { detectAIContent } from "./gptzero";

interface TextAssessmentResult {
  isAIGenerated: boolean;
  probability: number;
  burstiness: number;
  humanLikelihood: string;
  assessment: string;
  rawResponse?: any;
}

// Configure OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Perform text assessment using available services
 * @param text The text to analyze
 * @returns Assessment result
 */
export async function assessText(text: string): Promise<TextAssessmentResult> {
  if (!text || text.trim().length < 10) {
    throw new Error("INSUFFICIENT_TEXT_LENGTH");
  }

  try {
    // First try GPTZero if API key is available
    if (process.env.GPTZERO_API_KEY) {
      try {
        const gptzeroResult = await detectAIContent(text);
        
        // Generate an assessment based on GPTZero results
        let assessment = generateAssessment(gptzeroResult.probability);
        
        return {
          ...gptzeroResult,
          assessment
        };
      } catch (error) {
        console.log("GPTZero detection failed, falling back to OpenAI:", error);
        // Fall through to OpenAI fallback
      }
    }
    
    // Fallback to OpenAI for assessment
    if (process.env.OPENAI_API_KEY) {
      const openaiAssessment = await assessTextWithOpenAI(text);
      return openaiAssessment;
    }
    
    // If no services are available, throw error
    throw new Error("NO_ASSESSMENT_SERVICES_AVAILABLE");
    
  } catch (error) {
    console.error("Error in text assessment:", error);
    throw error;
  }
}

/**
 * Use OpenAI to assess text quality and characteristics
 */
async function assessTextWithOpenAI(text: string): Promise<TextAssessmentResult> {
  try {
    const prompt = `Analyze this text and provide an assessment of its quality, style, and characteristics. 
    Also, on a scale from 0.0 to 1.0, how likely do you think this text was AI-generated?
    
    TEXT TO ANALYZE:
    ${text.slice(0, 2000)}${text.length > 2000 ? "..." : ""}
    
    ASSESSMENT:`;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a text analysis expert who evaluates writing style, quality, and characteristics." },
        { role: "user", content: prompt }
      ],
      temperature: 0.5,
      max_tokens: 500
    });
    
    const assessmentText = response.choices[0]?.message?.content || "Unable to generate assessment.";
    console.log("Got OpenAI assessment text:", assessmentText);
    
    // Extract a probability estimate from the response if possible
    let probability = 0.5; // Default to 0.5 (uncertain)
    const probabilityMatch = assessmentText.match(/(\d+(\.\d+)?)\/10|(\d+(\.\d+)?)%|(\d+(\.\d+)?)\s*out of\s*10|(\d+(\.\d+)?)\s*on a scale|score of\s*(\d+(\.\d+)?)|rating of\s*(\d+(\.\d+)?)|probability of\s*(\d+(\.\d+)?)|likelihood of\s*(\d+(\.\d+)?)|(\d+(\.\d+)?)\s*likelihood|(\d+(\.\d+)?)\s*probability|(\d+(\.\d+)?)\s*AI-generated/i);
    
    if (probabilityMatch) {
      const extractedValue = parseFloat(probabilityMatch[0].replace(/[^0-9.]/g, ''));
      if (probabilityMatch[0].includes('%')) {
        probability = extractedValue / 100;
      } else if (probabilityMatch[0].includes('/10') || probabilityMatch[0].includes('out of 10')) {
        probability = extractedValue / 10;
      } else if (!isNaN(extractedValue) && extractedValue <= 1) {
        probability = extractedValue;
      } else if (!isNaN(extractedValue) && extractedValue > 1 && extractedValue <= 10) {
        probability = extractedValue / 10;
      }
    }
    
    const isAIGenerated = probability > 0.5;
    
    // Determine human likelihood description based on probability
    let humanLikelihood: string;
    if (probability < 0.2) {
      humanLikelihood = "Very likely human-written";
    } else if (probability < 0.4) {
      humanLikelihood = "Likely human-written";
    } else if (probability < 0.6) {
      humanLikelihood = "Uncertain";
    } else if (probability < 0.8) {
      humanLikelihood = "Likely AI-generated";
    } else {
      humanLikelihood = "Very likely AI-generated";
    }
    
    return {
      isAIGenerated,
      probability,
      burstiness: 0.5, // We don't have burstiness from OpenAI
      humanLikelihood,
      assessment: assessmentText,
      rawResponse: response
    };
  } catch (error) {
    console.error("Error assessing text with OpenAI:", error);
    throw error;
  }
}

/**
 * Generate a helpful assessment message based on AI generation probability
 */
function generateAssessment(probability: number): string {
  throw new Error("CANNED_FALLBACK_BLOCKED: textAssessment must route to provider call.");
}