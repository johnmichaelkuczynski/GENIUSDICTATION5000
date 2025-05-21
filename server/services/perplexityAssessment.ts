/**
 * Service for performing text assessment using Perplexity Llama models
 */

import fetch from 'node-fetch';

interface AssessmentResult {
  isAIGenerated: boolean;
  probability: number;
  burstiness: number;
  humanLikelihood: string;
  assessment: string;
  intelligenceScore?: number;
  surfaceAnalysis?: any;
  deepAnalysis?: any;
  psychologicalProfile?: string;
}

/**
 * Directly assess text using Perplexity API
 * @param text The text to analyze
 * @returns Assessment result with probability and human-readable assessment
 */
export async function assessWithPerplexity(text: string): Promise<AssessmentResult> {
  if (!text || text.trim().length < 50) {
    return {
      isAIGenerated: false,
      probability: 0,
      burstiness: 0.5,
      humanLikelihood: "Not enough text to analyze",
      assessment: "The text is too short to provide a meaningful assessment."
    };
  }

  try {
    const systemPrompt = `You are an expert text analyst specializing in evaluating writing quality and detecting AI-generated content. 
    Create a comprehensive formal intelligence assessment report for the provided text.

    Your assessment should include:
    1. An overall intelligence score (0-100)
    2. Surface-level analysis (grammar, syntax, lexical precision, stylistic control)
    3. Deep-level analysis (conceptual depth, inferential continuity, semantic compression, logical architecture, originality)
    4. A probability score from 0.0 to 1.0 representing how likely the text is AI-generated (0 = definitely human, 1 = definitely AI)
    5. Psychological profile indicators about the author
    6. A detailed conclusion about the text's quality and characteristics
    7. Specific recommendations for improvement`;

    const userPrompt = `Please analyze this text and provide a formal intelligence assessment report:
    
    ${text.slice(0, 3000)}${text.length > 3000 ? "..." : ""}`;

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 2000,
        temperature: 0.3,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`Perplexity API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const responseText = data.choices[0].message.content;
    console.log("Perplexity assessment response (preview):", responseText.substring(0, 200) + "...");
    
    // Parse the response to extract structured data
    const intelligenceScoreMatch = responseText.match(/intelligence score:?\s*(\d+)[\s\/\\]+100/i) || 
                                 responseText.match(/score:?\s*(\d+)[\s\/\\]+100/i);
    const intelligenceScore = intelligenceScoreMatch ? parseInt(intelligenceScoreMatch[1]) : 75;

    const probabilityMatch = responseText.match(/AI-generated.+?(\d+(?:\.\d+)?)%/i) || 
                          responseText.match(/probability:?\s*(\d+(?:\.\d+)?)%/i) ||
                          responseText.match(/(\d+(?:\.\d+)?)%\s+likely/i);
    let probability = probabilityMatch ? parseFloat(probabilityMatch[1]) / 100 : 0.5;
    
    // Ensure probability is within bounds
    probability = Math.min(Math.max(probability, 0), 1);

    // Determine if AI-generated based on probability
    const isAIGenerated = probability > 0.5;
    
    // Generate human likelihood description
    const humanLikelihood = getHumanLikelihood(probability);
    
    // Extract psychological profile if available
    const psychologicalProfileMatch = responseText.match(/psychological profile.+?:(.*?)(?:\n\n|\n[A-Z]|$)/i);
    const psychologicalProfile = psychologicalProfileMatch ? psychologicalProfileMatch[1].trim() : undefined;

    return {
      isAIGenerated,
      probability,
      burstiness: 1 - probability, // Approximate burstiness as inverse of AI probability
      humanLikelihood,
      assessment: responseText,
      intelligenceScore,
      psychologicalProfile
    };
  } catch (error) {
    console.error("Error assessing text with Perplexity:", error);
    throw error;
  }
}

/**
 * Generate a human likelihood description based on probability
 */
function getHumanLikelihood(probability: number): string {
  if (probability < 0.2) {
    return "Very likely human-written";
  } else if (probability < 0.4) {
    return "Likely human-written";
  } else if (probability < 0.6) {
    return "Uncertain";
  } else if (probability < 0.8) {
    return "Likely AI-generated";
  } else {
    return "Very likely AI-generated";
  }
}