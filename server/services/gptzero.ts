/**
 * Service for interacting with the GPTZero API to detect AI-generated content
 */

import fetch from 'node-fetch';

interface GPTZeroResponse {
  documents: Array<{
    completely_generated_prob: number;
    average_generated_prob: number;
    overall_burstiness: number;
    paragraphs: Array<{
      completely_generated_prob: number;
      generated_prob: number;
      burstiness: number;
      text: string;
    }>;
  }>;
}

interface AIDetectionResult {
  isAIGenerated: boolean;
  probability: number;
  burstiness: number;
  humanLikelihood: string;
  rawResponse?: any;
}

/**
 * Detect if text is AI-generated using GPTZero API
 * @param text The text to analyze
 * @returns AI detection result
 */
export async function detectAIContent(text: string): Promise<AIDetectionResult> {
  if (!text || text.trim().length < 10) {
    throw new Error("INSUFFICIENT_TEXT_LENGTH");
  }

  try {
    const response = await fetch('https://api.gptzero.me/v2/predict/text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Api-Key': process.env.GPTZERO_API_KEY || ''
      },
      body: JSON.stringify({
        document: text,
        truncation_size: 250000 // maximum supported by GPTZero
      })
    });

    if (!response.ok) {
      throw new Error(`GPTZero API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as GPTZeroResponse;
    
    // Get the first document from response (there should only be one)
    const document = data.documents[0];
    
    // The probability that the entire text is AI-generated
    const probability = document.completely_generated_prob;
    
    // Burstiness is a measure of perplexity variance - more human writing is "burstier"
    const burstiness = document.overall_burstiness;
    
    // Determine if the text is likely AI-generated (using GPTZero's threshold of 0.5)
    const isAIGenerated = probability > 0.5;
    
    // Create a human-readable assessment
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
      burstiness,
      humanLikelihood,
      rawResponse: data
    };
  } catch (error) {
    console.error("Error detecting AI content:", error);
    throw error;
  }
}