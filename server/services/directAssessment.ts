/**
 * Service for performing direct text assessment using OpenAI
 */

import OpenAI from "openai";

// Configure OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface AssessmentResult {
  isAIGenerated: boolean;
  probability: number;
  burstiness: number;
  humanLikelihood: string;
  assessment: string;
  recommendations?: string;
}

/**
 * Directly assess text using OpenAI
 * @param text The text to analyze
 * @returns Assessment result with probability and human-readable assessment
 */
export async function directAssessText(text: string): Promise<AssessmentResult> {
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
    6. A detailed two-paragraph assessment:
       - Paragraph 1: Analysis of the text's quality, characteristics, style, and overall evaluation
       - Paragraph 2: Specific recommendations for improvement and enhancement`;

    const userPrompt = `Please analyze this text and provide a formal intelligence assessment report:
    
    ${text.slice(0, 3000)}${text.length > 3000 ? "..." : ""}
    
    Provide your analysis in this JSON format:
    {
      "probability": [number between 0 and 1],
      "isAIGenerated": [boolean],
      "intelligenceScore": [number between 0-100],
      "surfaceAnalysis": {
        "grammar": [short assessment with score],
        "lexicalPrecision": [short assessment with score],
        "stylistic": [short assessment with score]
      },
      "deepAnalysis": {
        "conceptualDepth": [short assessment with score],
        "logicalStructure": [short assessment with score],
        "originality": [short assessment with score] 
      },
      "psychologicalProfile": [brief profile of author based on writing],
      "assessment": [paragraph 1: detailed analysis of the text],
      "recommendations": [paragraph 2: specific recommendations for improvement]
    }`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.5,
      response_format: { type: "json_object" }
    });

    const responseText = response.choices[0]?.message?.content || "{}";
    console.log("OpenAI assessment response:", responseText);
    
    try {
      const parsedResponse = JSON.parse(responseText);
      
      // Get probability and ensure it's in the correct range
      const probability = Math.min(Math.max(parsedResponse.probability || 0.5, 0), 1);
      
      // Determine if the text is AI-generated
      const isAIGenerated = parsedResponse.isAIGenerated || probability > 0.5;
      
      // Get assessment and recommendations
      const assessment = parsedResponse.assessment || generateDefaultAssessment(probability);
      const recommendations = parsedResponse.recommendations || "";
      
      // Generate human likelihood text
      const humanLikelihood = getHumanLikelihood(probability);
      
      return {
        isAIGenerated,
        probability,
        burstiness: 1 - probability, // Approximate burstiness as inverse of AI probability
        humanLikelihood,
        assessment,
        recommendations
      };
    } catch (parseError) {
      console.error("Error parsing AI assessment response:", parseError);
      
      // Fallback to basic assessment
      return {
        isAIGenerated: false,
        probability: 0.5,
        burstiness: 0.5,
        humanLikelihood: "Assessment unclear",
        assessment: "We couldn't analyze your text properly. You can still provide context and rewrite instructions below."
      };
    }
  } catch (error) {
    console.error("Error assessing text with OpenAI:", error);
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

/**
 * Generate a default assessment based on probability
 */
function generateDefaultAssessment(probability: number): string {
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