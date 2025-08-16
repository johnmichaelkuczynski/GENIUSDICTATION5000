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
  errata?: Array<{
    quote: string;
    issue: string;
    correction: string;
  }>;
}

/**
 * Directly assess text using OpenAI
 * @param text The text to analyze
 * @returns Assessment result with probability and human-readable assessment
 */
export async function directAssess(opts: { inputText: string; styleText?: string; params?: Record<string, unknown> }): Promise<AssessmentResult> {
  return await directAssessText(opts.inputText);
}

export async function directAssessText(text: string): Promise<AssessmentResult> {
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
    
    ${text.slice(0, 3000)}${text.length > 3000 ? "..." : ""}
    
    Provide your analysis in this JSON format:
    {
      "probability": [number between 0 and 1],
      "isAIGenerated": [boolean],
      "intelligenceScore": [number between 0-100],
      "surfaceAnalysis": {
        "grammar": [assessment with score and quoted examples],
        "lexicalPrecision": [assessment with score and quoted examples],
        "stylistic": [assessment with score and quoted examples]
      },
      "deepAnalysis": {
        "conceptualDepth": [assessment with score and quoted examples],
        "logicalStructure": [assessment with score and quoted examples],
        "originality": [assessment with score and quoted examples] 
      },
      "errata": [array of objects with format {"quote": "problematic text", "issue": "description of issue", "correction": "suggested fix"}],
      "psychologicalProfile": [detailed profile of author based on writing style],
      "assessment": [multi-paragraph detailed analysis with quotes from the text],
      "recommendations": [detailed specific recommendations for improvement]
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
      
      // Get assessment, recommendations, and errata
      const assessment = parsedResponse.assessment || generateDefaultAssessment(probability);
      const recommendations = parsedResponse.recommendations || "";
      const errata = parsedResponse.errata || [];
      
      // Generate human likelihood text
      const humanLikelihood = getHumanLikelihood(probability);
      
      return {
        isAIGenerated,
        probability,
        burstiness: 1 - probability, // Approximate burstiness as inverse of AI probability
        humanLikelihood,
        assessment,
        recommendations,
        errata
      };
    } catch (parseError) {
      console.error("Error parsing AI assessment response:", parseError);
      
      // No fallback assessments allowed
      throw parseError;
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
  throw new Error("CANNED_FALLBACK_BLOCKED: directAssessment must route to provider call.");
}