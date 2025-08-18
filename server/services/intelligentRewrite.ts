import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

const DEFAULT_MODEL_STR = "claude-sonnet-4-20250514";

// Initialize AI clients
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface RewriteParams {
  text: string;
  customInstructions?: string;
  provider?: string;
}

export class IntelligentRewriteService {
  
  private buildRewritePrompt(text: string, customInstructions?: string): string {
    const baseInstructions = `Rewrite this text so that it scores significantly higher on an intelligence evaluation protocol while preserving existing content as much as possible.

The evaluation criteria you should optimize for include:
- Is it insightful? (not clichés, fresh perspectives)
- Does it develop points? (evidence of logical development)
- Is the organization hierarchical? (not just sequential, but logically scaffolded)
- Does it operate skillfully with logic/reasoning?
- Are the points fresh rather than clichéd?
- Does it use technical terms to render more precise (not obfuscate)?
- Is it organic? (points unfold naturally, not forced/artificial)
- Does it open up new domains of inquiry?
- Is it actually intelligent (not just presumed intelligent by subject matter)?
- Is it real rather than phony?
- Do sentences exhibit complex and coherent internal logic?
- Is it governed by a strong concept (not just expository organization)?
- Is there system-level control over ideas? (author integrates earlier points)
- Are the points real and fresh (not institutional propaganda)?
- Is the writing direct rather than evasive?
- Are statements unambiguous?
- Does progression develop according to logical entailment (not just citations)?
- Does the author use other authors to develop ideas (not cloak lack of ideas)?

CONDITION A: Rightsize the passage to score higher on these evaluation criteria
CONDITION B: Preserve existing content as much as Condition A allows

${customInstructions ? `\nAdditional custom instructions (weight these heavily but balance with Conditions A & B): ${customInstructions}` : ''}

Text to rewrite:
"${text}"

Provide only the rewritten text without explanations.`;

    return baseInstructions;
  }

  async rewriteWithOpenAI(params: RewriteParams): Promise<string> {
    const prompt = this.buildRewritePrompt(params.text, params.customInstructions);
    
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      });

      return response.choices[0].message.content || "";
    } catch (error: any) {
      throw new Error(`OpenAI API error: ${error.message}`);
    }
  }

  async rewriteWithAnthropic(params: RewriteParams): Promise<string> {
    const prompt = this.buildRewritePrompt(params.text, params.customInstructions);
    
    try {
      const response = await anthropic.messages.create({
        model: DEFAULT_MODEL_STR,
        messages: [
          { role: "user", content: prompt }
        ],
        max_tokens: 4000,
        temperature: 0.7,
      });

      const textContent = response.content.find(block => block.type === 'text')?.text || "";
      return textContent;
    } catch (error: any) {
      throw new Error(`Anthropic API error: ${error.message}`);
    }
  }

  async rewriteWithPerplexity(params: RewriteParams): Promise<string> {
    const prompt = this.buildRewritePrompt(params.text, params.customInstructions);
    
    try {
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: "llama-3.1-sonar-small-128k-online",
          messages: [
            { role: "user", content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 4000,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Perplexity API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0].message.content || "";
    } catch (error: any) {
      throw new Error(`Perplexity API error: ${error.message}`);
    }
  }

  async rewriteWithDeepSeek(params: RewriteParams): Promise<string> {
    const prompt = this.buildRewritePrompt(params.text, params.customInstructions);
    
    try {
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            { role: "user", content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 4000,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`DeepSeek API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0].message.content || "";
    } catch (error: any) {
      throw new Error(`DeepSeek API error: ${error.message}`);
    }
  }

  async rewrite(params: RewriteParams): Promise<string> {
    const provider = params.provider || 'deepseek';
    
    switch (provider) {
      case 'openai':
        return this.rewriteWithOpenAI(params);
      case 'anthropic':
        return this.rewriteWithAnthropic(params);
      case 'perplexity':
        return this.rewriteWithPerplexity(params);
      case 'deepseek':
        return this.rewriteWithDeepSeek(params);
      default:
        throw new Error(`Unsupported AI provider: ${provider}`);
    }
  }
}

export const intelligentRewriteService = new IntelligentRewriteService();