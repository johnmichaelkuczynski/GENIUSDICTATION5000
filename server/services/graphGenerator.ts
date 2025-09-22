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
          content: `You are a mathematical function generator. Convert natural language descriptions into appropriate mathematical equations for graphing.

Rules:
1. Generate equations using standard mathematical notation: x^2, sin(x), cos(x), log(x), ln(x), sqrt(x), abs(x), pi, e
2. Use x as the variable for functions
3. For exponential growth/decay, use exponential functions like e^(k*x) or a*e^(b*x)
4. For economic/population data, consider logistic growth: L/(1+e^(-k*(x-x0)))
5. For periodic phenomena, use trigonometric functions
6. For polynomial relationships, use appropriate degree polynomials
7. Suggest appropriate graph settings (xMin, xMax, yMin, yMax, step)

Respond with JSON in this exact format:
{
  "equation": "mathematical equation using x",
  "description": "brief explanation of the function",
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

/**
 * Get suggested equations for common graph types
 */
export function getSuggestedEquations(): Array<{ name: string; equation: string; description: string }> {
  return [
    {
      name: "Economic Growth",
      equation: "100*e^(0.03*x)",
      description: "Exponential economic growth at 3% per year"
    },
    {
      name: "Population Growth", 
      equation: "1000/(1+9*e^(-0.1*x))",
      description: "Logistic population growth with carrying capacity"
    },
    {
      name: "Radioactive Decay",
      equation: "100*e^(-0.693*x/5.73)",
      description: "Decay of Carbon-14 (half-life 5,730 years)"
    },
    {
      name: "Bacterial Growth",
      equation: "10*e^(0.5*x)",
      description: "Exponential bacterial reproduction"
    },
    {
      name: "Projectile Motion",
      equation: "-4.9*x^2+20*x+100",
      description: "Height of projectile over time"
    },
    {
      name: "Damped Oscillation",
      equation: "e^(-0.1*x)*cos(x)",
      description: "Oscillation with exponential decay"
    }
  ];
}