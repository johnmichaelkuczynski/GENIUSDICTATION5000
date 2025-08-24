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
  recommendations?: string;
  errata?: Array<{
    quote: string;
    issue: string;
    correction: string;
  }>;
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
export async function perplexityAssess(opts: { inputText: string; styleText?: string; params?: Record<string, unknown> }): Promise<AssessmentResult> {
  return await assessWithPerplexity(opts.inputText);
}

export async function assessWithPerplexity(text: string): Promise<AssessmentResult> {
  if (!text || text.trim().length < 50) {
    throw new Error("INSUFFICIENT_TEXT_LENGTH");
  }

  try {
    const systemPrompt = `You are an expert text analyst specializing in evaluating writing quality and detecting AI-generated content. 
    Create a comprehensive formal intelligence assessment report for the provided text.

    Your assessment should include:
    1. An overall intelligence score (0-100)
    2. Surface-level analysis (grammar, syntax, lexical precision, stylistic control) with specific examples quoted from the text
    3. Deep-level analysis (conceptual depth, inferential continuity, semantic compression, logical architecture, originality) with supporting quotations
    4. A list of errata or incomplete sentences, with direct quotes and suggested corrections
    5. A probability score from 0.0 to 1.0 representing how likely the text is AI-generated (0 = definitely human, 1 = definitely AI)
    6. Psychological profile indicators about the author based on writing style and content
    7. A thorough and detailed assessment (at least 2-3 paragraphs):
       - First section: In-depth analysis of the text's quality, characteristics, style, strengths, and overall evaluation with direct quotations as evidence
       - Second section: Detailed and specific recommendations for improvement, including structural, stylistic, and content-based suggestions
    
    Be extremely thorough and provide supporting quotations from the text for all of your observations and analyses. When identifying issues, always include the exact text you're referring to.`;

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
    
    // Split the assessment into analysis and recommendations
    let assessment = "";
    let recommendations = "";
    
    // Try to extract recommendations section first
    const recommendationsMatch = responseText.match(/recommendations?:?\s*(.*?)(?:\n\n|\n[A-Z]|$)/i);
    if (recommendationsMatch) {
      recommendations = recommendationsMatch[1].trim();
      
      // Separate the main assessment from recommendations
      const mainText = responseText.split(/recommendations?:?/i)[0].trim();
      assessment = mainText;
    } else {
      // If no explicit recommendations section, try to intelligently split the text
      const paragraphs = responseText.split(/\n\n+/);
      
      if (paragraphs.length > 1) {
        // Use the last paragraph as recommendations
        recommendations = paragraphs[paragraphs.length - 1].trim();
        // Use everything else as assessment
        assessment = paragraphs.slice(0, -1).join("\n\n").trim();
      } else {
        // If we can't split properly, just use the whole text as assessment
        // and generate a generic recommendation
        assessment = responseText;
        recommendations = "Consider revising for clarity and conciseness. Add more specific examples to illustrate key points. Ensure consistency in tone and style throughout the text.";
      }
    }

    // Try to extract errata if available
    let errata: Array<{quote: string; issue: string; correction: string}> = [];
    try {
      // Try to find a section mentioning errata or errors
      const errataSection = responseText.match(/errata|errors|incomplete sentences|grammatical issues|syntax errors/i);
      
      if (errataSection) {
        // Extract a list of items from the errata section
        const errataItems = responseText.match(/["']([^"']+)["'].*?(?:should be|correction|issue:|error:)/gi);
        
        if (errataItems && errataItems.length > 0) {
          errata = errataItems.map((item: string) => {
            const quote = item.match(/["']([^"']+)["']/)?.[1] || "Unspecified text";
            const issue = "Grammatical or syntax error";
            const correction = item.match(/(?:should be|correction:)\s*["']?([^"']+)["']?/i)?.[1] || "Needs revision";
            
            return { quote, issue, correction };
          });
        }
      }
    } catch (e) {
      console.error("Error extracting errata:", e);
      errata = [];
    }

    return {
      isAIGenerated,
      probability,
      burstiness: 1 - probability, // Approximate burstiness as inverse of AI probability
      humanLikelihood,
      assessment,
      recommendations,
      errata,
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