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
    const hasCustomInstructions = !!(customInstructions && customInstructions.trim() !== "");
    
    // Intelligence criteria that always applies
    const intelligenceCriteria = `Rewrite this text so that it scores as high as possible with respect to the following intelligence questions:

IS IT INSIGHTFUL?
DOES IT DEVELOP POINTS? (OR, IF IT IS A SHORT EXCERPT, IS THERE EVIDENCE THAT IT WOULD DEVELOP POINTS IF EXTENDED)?
IS THE ORGANIZATION MERELY SEQUENTIAL (JUST ONE POINT AFTER ANOTHER, LITTLE OR NO LOGICAL SCAFFOLDING)? OR ARE THE IDEAS ARRANGED, NOT JUST SEQUENTIALLY BUT HIERARCHICALLY?
IF THE POINTS IT MAKES ARE NOT INSIGHTFUL, DOES IT OPERATE SKILLFULLY WITH CANONS OF LOGIC/REASONING?
ARE THE POINTS CLICHES? OR ARE THEY "FRESH"?
DOES IT USE TECHNICAL JARGON TO OBFUSCATE OR TO RENDER MORE PRECISE?
IS IT ORGANIC? DO POINTS DEVELOP IN AN ORGANIC, NATURAL WAY? DO THEY 'UNFOLD'? OR ARE THEY FORCED AND ARTIFICIAL?
DOES IT OPEN UP NEW DOMAINS? OR, ON THE CONTRARY, DOES IT SHUT OFF INQUIRY (BY CONDITIONALIZING FURTHER DISCUSSION OF THE MATTERS ON ACCEPTANCE OF ITS INTERNAL AND POSSIBLY VERY FAULTY LOGIC)?
IS IT ACTUALLY INTELLIGENT OR JUST THE WORK OF SOMEBODY WHO, JUDGING BY THE SUBJECT-MATTER, IS PRESUMED TO BE INTELLIGENT (BUT MAY NOT BE)?
IS IT REAL OR IS IT PHONY?
DO THE SENTENCES EXHIBIT COMPLEX AND COHERENT INTERNAL LOGIC?
IS THE PASSAGE GOVERNED BY A STRONG CONCEPT? OR IS THE ONLY ORGANIZATION DRIVEN PURELY BY EXPOSITORY (AS OPPOSED TO EPISTEMIC) NORMS?
IS THERE SYSTEM-LEVEL CONTROL OVER IDEAS? IN OTHER WORDS, DOES THE AUTHOR SEEM TO RECALL WHAT HE SAID EARLIER AND TO BE IN A POSITION TO INTEGRATE IT INTO POINTS HE HAS MADE SINCE THEN?
ARE THE POINTS 'REAL'? ARE THEY FRESH? OR IS SOME INSTITUTION OR SOME ACCEPTED VEIN OF PROPAGANDA OR ORTHODOXY JUST USING THE AUTHOR AS A MOUTH PIECE?
IS THE WRITING EVASIVE OR DIRECT?
ARE THE STATEMENTS AMBIGUOUS?
DOES THE PROGRESSION OF THE TEXT DEVELOP ACCORDING TO WHO SAID WHAT OR ACCORDING TO WHAT ENTAILS OR CONFIRMS WHAT?
DOES THE AUTHOR USE OTHER AUTHORS TO DEVELOP HIS IDEAS OR TO CLOAK HIS OWN LACK OF IDEAS?`;

    if (hasCustomInstructions) {
      // User instructions + intelligence optimization
      return `${customInstructions}

Additionally, ${intelligenceCriteria}

Text to rewrite:
"${text}"

Provide only the rewritten text without explanations.`;
    }

    // Default: Intelligence optimization only
    return `${intelligenceCriteria}

Text to rewrite:
"${text}"

Provide only the rewritten text without explanations.`;
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