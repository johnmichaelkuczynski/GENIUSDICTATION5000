/**
 * Service for generating mathematical equations from natural language descriptions using OpenAI
 */

import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface GraphGenerationResult {
  equation: string;
  description: string;
  settings?: {
    xMin?: number;
    xMax?: number;
    yMin?: number;
    yMax?: number;
    step?: number;
  };
  graphType?: 'function' | 'parametric' | 'polar';
}

/**
 * Generate a mathematical equation from a natural language description
 */
export async function generateGraphFromDescription(description: string): Promise<GraphGenerationResult> {
  if (!description || description.trim().length < 10) {
    throw new Error("Description too short. Please provide a more detailed description.");
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025
      messages: [
        {
          role: "system",
          content: `You are a creative mathematical function generator. Your job is to interpret natural language descriptions and create unique, dynamic mathematical equations that truly represent the described phenomenon.

CRITICAL RULES:
1. DO NOT use templated or canned equations
2. DO NOT default to logistic growth formulas like "a/(1+e^(-k*(x-c)))"
3. CREATE custom mathematical relationships based on the specific description
4. Think about the actual mathematical behavior being described
5. Use creative combinations of functions: polynomials, exponentials, trigonometric, logarithmic, etc.
6. Make the equation coefficients and structure unique to the description

Available mathematical notation: x^2, sin(x), cos(x), log(x), ln(x), sqrt(x), abs(x), pi, e, +, -, *, /, ()

Examples of GOOD creative responses:
- "bacterial growth in petri dish" → "0.5*x^3 - 2*x^2 + 4*x + 1" (polynomial growth with constraints)
- "ocean wave pattern" → "3*sin(0.2*x) + 0.5*cos(0.7*x)" (composite wave)
- "radioactive decay" → "100*e^(-0.693*x/12)" (actual exponential decay)
- "economic recession and recovery" → "x^2 - 6*x + 5" (quadratic with minimum)

Respond with JSON:
{
  "equation": "unique mathematical equation using x",
  "description": "brief explanation",
  "settings": {
    "xMin": number,
    "xMax": number, 
    "yMin": number,
    "yMax": number,
    "step": number
  },
  "graphType": "function"
}`
        },
        {
          role: "user",
          content: `Generate a mathematical function for: ${description}`
        }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    if (!result.equation) {
      throw new Error("Failed to generate equation from description");
    }

    return {
      equation: result.equation,
      description: result.description || "Generated mathematical function",
      settings: result.settings || {
        xMin: -10,
        xMax: 10,
        yMin: -10,
        yMax: 10,
        step: 0.1
      },
      graphType: result.graphType || 'function'
    };

  } catch (error) {
    console.error("Error generating graph from description:", error);
    throw new Error(`Failed to generate graph: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Removed preset equations - AI must be fully creative