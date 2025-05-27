/**
 * Service for interacting with Azure OpenAI API for math-aware text processing
 */
import { OpenAI } from 'openai';

const azureOpenAI = new OpenAI({
  apiKey: process.env.AZURE_OPENAI_KEY,
  baseURL: process.env.AZURE_OPENAI_ENDPOINT,
  defaultQuery: { 'api-version': '2024-02-15-preview' },
  defaultHeaders: {
    'api-key': process.env.AZURE_OPENAI_KEY,
  },
});

export interface MathTextOptions {
  text: string;
  instructions: string;
  includeMath?: boolean;
  outputFormat?: 'latex' | 'text' | 'mixed';
}

/**
 * Transform text with math awareness using Azure OpenAI
 * @param options Configuration for the math-aware text transformation
 * @returns Transformed text with proper LaTeX formatting
 */
export async function transformMathText({
  text,
  instructions,
  includeMath = true,
  outputFormat = 'mixed'
}: MathTextOptions): Promise<string> {
  try {
    const systemPrompt = includeMath 
      ? `You are an expert in mathematics and technical writing. When processing text:
1. Preserve all mathematical expressions and convert them to proper LaTeX notation using $ for inline math and $$ for display math
2. Ensure mathematical notation is clear and properly formatted
3. Maintain the mathematical integrity while following the given instructions
4. Use standard LaTeX commands for mathematical symbols and expressions
5. Format the output as ${outputFormat === 'latex' ? 'pure LaTeX' : outputFormat === 'text' ? 'plain text' : 'mixed text with LaTeX math notation'}`
      : `You are a professional text editor. Process the given text according to the instructions while maintaining clarity and readability.`;

    const userPrompt = `${instructions}\n\nText to process:\n${text}`;

    const response = await azureOpenAI.chat.completions.create({
      model: 'gpt-4o', // Use the model deployed in Azure
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    return response.choices[0]?.message?.content || text;
  } catch (error) {
    console.error('Azure OpenAI API error:', error);
    throw new Error(`Azure OpenAI transformation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract and format mathematical expressions from text
 * @param text The text containing mathematical expressions
 * @returns Text with properly formatted LaTeX math notation
 */
export async function formatMathExpressions(text: string): Promise<string> {
  try {
    const response = await azureOpenAI.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a mathematical expression formatter. Your task is to:
1. Identify mathematical expressions in the text
2. Convert them to proper LaTeX notation
3. Use $ for inline math and $$ for display math
4. Preserve all non-mathematical text exactly as provided
5. Ensure proper mathematical notation using standard LaTeX commands`
        },
        {
          role: 'user',
          content: `Format the mathematical expressions in this text using LaTeX notation:\n\n${text}`
        }
      ],
      temperature: 0.1,
      max_tokens: 1500,
    });

    return response.choices[0]?.message?.content || text;
  } catch (error) {
    console.error('Math formatting error:', error);
    throw new Error(`Math formatting failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}