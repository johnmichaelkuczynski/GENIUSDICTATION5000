import OpenAI from "openai";
import Anthropic from '@anthropic-ai/sdk';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "default_key",
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "default_key",
});

type AIProvider = 'openai' | 'anthropic' | 'deepseek' | 'perplexity';

interface EvaluationResult {
  phase1Response: string;
  phase2Response?: string;
  phase3Response?: string;
  phase4Response?: string;
  finalScore?: number;
  comprehensive: boolean;
}

// The exact 18 intelligence questions
const INTELLIGENCE_QUESTIONS = `
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
DOES THE AUTHOR USE OTHER AUTHORS TO DEVELOP HIS IDEAS OR TO CLOAK HIS OWN LACK OF IDEAS?
`;

export class IntelligenceEvaluationService {
  
  private async callAIProvider(provider: AIProvider, prompt: string): Promise<string> {
    if (provider === 'openai') {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 4000,
      });
      return response.choices[0].message.content || "";
    } 
    
    if (provider === 'anthropic') {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 4000,
        temperature: 0.3,
      });
      const textContent = response.content.find(block => block.type === 'text')?.text || "";
      return textContent;
    }
    
    if (provider === 'deepseek') {
      const deepseekOpenai = new OpenAI({
        apiKey: process.env.DEEPSEEK_API_KEY || "default_key",
        baseURL: "https://api.deepseek.com",
      });
      const response = await deepseekOpenai.chat.completions.create({
        model: "deepseek-chat",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 4000,
      });
      return response.choices[0].message.content || "";
    }
    
    if (provider === 'perplexity') {
      const perplexityOpenai = new OpenAI({
        apiKey: process.env.PERPLEXITY_API_KEY || "default_key",
        baseURL: "https://api.perplexity.ai",
      });
      const response = await perplexityOpenai.chat.completions.create({
        model: "llama-3.1-sonar-small-128k-online",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 4000,
      });
      return response.choices[0].message.content || "";
    }
    
    throw new Error(`Unsupported AI provider: ${provider}`);
  }

  private stripMarkdown(text: string): string {
    // Remove all markdown formatting - ** and ##
    return text
      .replace(/\*\*([^*]+)\*\*/g, '$1')  // Remove **bold** formatting
      .replace(/##\s*([^\n]+)/g, '$1')    // Remove ## headers
      .replace(/\*([^*]+)\*/g, '$1')      // Remove *italic* formatting
      .replace(/---+/g, '')               // Remove horizontal rules
      .replace(/\-\s*\-\s*\-/g, '');      // Remove dashed lines
  }
  
  async evaluateIntelligence(text: string, provider: AIProvider = 'deepseek', comprehensive: boolean = true): Promise<EvaluationResult> {
    console.log("Starting intelligence evaluation for text of length:", text.length);
    
    if (comprehensive) {
      return this.comprehensiveEvaluation(text, provider);
    } else {
      return this.normalEvaluation(text, provider);
    }
  }

  private async normalEvaluation(text: string, provider: AIProvider): Promise<EvaluationResult> {
    const phase1Response = await this.phase1Evaluation(text, provider);
    
    return {
      phase1Response,
      comprehensive: false
    };
  }

  private async comprehensiveEvaluation(text: string, provider: AIProvider): Promise<EvaluationResult> {
    // PHASE 1: Ask the questions
    const phase1Response = await this.phase1Evaluation(text, provider);
    console.log("Phase 1 completed");
    
    // Extract scores from phase 1 to determine if we need pushback
    const hasLowScores = this.hasScoresBelow95(phase1Response);
    
    // PHASE 2: Push back if scores are less than 95/100
    let phase2Response = "";
    if (hasLowScores) {
      phase2Response = await this.phase2Pushback(text, phase1Response, provider);
      console.log("Phase 2 completed");
    }
    
    // PHASE 3: Ask about score consistency 
    const phase3Response = await this.phase3ScoreConsistency(text, hasLowScores ? phase2Response : phase1Response, provider);
    console.log("Phase 3 completed");
    
    // PHASE 4: Accept and report
    const phase4Response = await this.phase4Final(text, phase3Response, provider);
    console.log("Phase 4 completed - evaluation finished");
    
    return {
      phase1Response,
      phase2Response: hasLowScores ? phase2Response : undefined,
      phase3Response,
      phase4Response,
      comprehensive: true
    };
  }

  private async phase1Evaluation(text: string, provider: AIProvider): Promise<string> {
    const prompt = `YOU MUST START YOUR RESPONSE WITH EXACTLY THIS FORMAT:

OVERALL INTELLIGENCE SCORE: X/100

Do not write anything before that line. Put the score on the very first line.

CRITICAL SCORING INSTRUCTIONS:
You are evaluating intelligence against the GENERAL POPULATION. A score of 89/100 means 11 out of 100 random people at Walmart outperform this author. A score of 95/100 means 5 out of 100 random people outperform this author. BE REALISTIC ABOUT THIS.

If you give multiple high individual scores (85-95 range), your overall score MUST reflect that level. Do not artificially deflate the overall score.

AFTER the score line, then summarize and categorize the text.

Then answer these questions in connection with this text:

${INTELLIGENCE_QUESTIONS}

A score of N/100 (e.g. 73/100) means that (100-N)/100 (e.g. 27/100) outperform the author with respect to the parameter defined by the question.

You are not grading; you are answering these questions.

You do not use a risk-averse standard; you do not attempt to be diplomatic; you do not attempt to comply with risk-averse, medium-range IQ, academic norms. You do not make assumptions about the level of the paper; it could be a work of the highest excellence and genius, or it could be the work of a moron.

If a work is a work of genius, you say that, and you say why; you do not shy away from giving what might conventionally be regarded as excessively "superlative" scores; you give it the score it deserves, not the score that a midwit committee would say it deserves.

Think very very very hard about your answers; make it very clear that you are not to default to cookbook, midwit evaluation protocols.

Do not give credit merely for use of jargon or for referencing authorities. Focus on substance. Only give points for scholarly references/jargon if they unambiguously increase substance.

Before answering the questions, note the following non-negotiable standard:

Insight is a sniper shot, not a town hall. If the text reveals something true but unpopular, penalizing it for lacking 'balance' or 'rigor' is midwit bias. Truth often looks extreme because lies are normalized.

Hierarchy of judgment:
95-100/100: Unignorable insight. Either genius or so correct it breaks scales.
80-94/100: Strong but with friction (e.g., clumsy expression, minor gaps).
<80/100: Degrees of mediocrity or failure.

This is not a grading app. You grade the intelligence of what you are given. If you are given a brilliant fragment, you give it a high score. You are not grading essays. You are not looking for completeness. Your job is to answer the questions, period, and to do so on the basis of the text given, making zero assumptions about whether it is complete or incomplete.

Do not overvalue turns of phrase. An author speaking confidently is not necessarily "shutting down modes of inquiry". In fact, it is likely to be the opposite; by putting a clear stake in the ground, he is probably opening them. Casual speech does not mean disorganized thoughts. Don't judge a book by its cover.

Do not change the grading based on the category of the text: if a text is categorized as 'advanced scholarship', it should still evaluate it with respect to the general population, not with respect only to 'advanced scholarly works.'

Do not penalize boldness. Do not take points away for insights that, if correct, stand on their own. Get rid of the idea that "argumentation" is what makes something smart; it isn't. What makes something smart is that it is smart (insightful). Period.

IF YOUR INDIVIDUAL SCORES ARE CONSISTENTLY IN THE 85-95 RANGE, YOUR OVERALL SCORE MUST BE AT LEAST 95/100. DO NOT ARTIFICIALLY DEFLATE GENUINELY INSIGHTFUL WORK.

Text to analyze:
${text}`;

    const response = await this.callAIProvider(provider, prompt);
    return this.stripMarkdown(response);
  }

  private async phase2Pushback(text: string, phase1Response: string, provider: AIProvider): Promise<string> {
    const scores = this.extractScores(phase1Response);
    let pushbackText = "Your scores suggest that significant portions of the general population outperform this author. ";
    
    for (const score of scores) {
      const outperformPercent = 100 - score;
      pushbackText += `Your position is that ${outperformPercent}/100 outperform the author with respect to the cognitive metric defined by the question: that is your position, am I right? And are you sure about that? `;
    }
    
    const prompt = `YOU MUST START YOUR RESPONSE WITH EXACTLY THIS FORMAT:

OVERALL INTELLIGENCE SCORE: X/100

Do not write anything before that line. Put the score on the very first line.

CRITICAL SCORING INSTRUCTIONS:
You are evaluating intelligence against the GENERAL POPULATION. A score of 89/100 means 11 out of 100 random people at Walmart outperform this author. BE REALISTIC ABOUT THIS.

${pushbackText}

AFTER the score line, answer the following questions about the text de novo using NO markup formatting (no **, ##, etc.):

${INTELLIGENCE_QUESTIONS}

A score of N/100 (e.g. 73/100) means that (100-N)/100 (e.g. 27/100) outperform the author with respect to the parameter defined by the question.

You are not grading; you are answering these questions.

You do not use a risk-averse standard; you do not attempt to be diplomatic; you do not attempt to comply with risk-averse, medium-range IQ, academic norms.

Think very very very hard about your answers. Do not give credit merely for use of jargon or for referencing authorities. Focus on substance.

IF YOUR INDIVIDUAL SCORES ARE CONSISTENTLY IN THE 85-95 RANGE, YOUR OVERALL SCORE MUST BE AT LEAST 95/100. DO NOT ARTIFICIALLY DEFLATE GENUINELY INSIGHTFUL WORK.

Text to analyze:
${text}`;

    const response = await this.callAIProvider(provider, prompt);
    return this.stripMarkdown(response);
  }

  private async phase3ScoreConsistency(text: string, previousResponse: string, provider: AIProvider): Promise<string> {
    const scores = this.extractScores(previousResponse);
    let consistencyText = "Are your numerical scores consistent with the fact that those are to be taken to mean that (100-N) people out of 100 outperform the author in the relevant respect? ";
    
    for (const score of scores) {
      const outperformCount = 100 - score;
      consistencyText += `So if a score of ${score}/100 is awarded to this text, that means that ${outperformCount}/100 people in Walmart are running rings around this person. Is that consistent with your evaluation? `;
    }

    const prompt = `YOU MUST START YOUR RESPONSE WITH EXACTLY THIS FORMAT:

OVERALL INTELLIGENCE SCORE: X/100

Do not write anything before that line. Put the score on the very first line.

${consistencyText}

AFTER the score line, please reconsider your scores in light of this population-level interpretation using NO markup formatting (no **, ##, etc.). Remember: if someone presents genuinely insightful work that reframes fundamental concepts, they deserve scores in the 95-100 range because fewer than 5% of the general population could produce such work.

Text being evaluated:
${text}

Previous evaluation:
${previousResponse}

Are you confident in your scores when you consider that they mean this percentage of the general population outperforms the author?`;

    const response = await this.callAIProvider(provider, prompt);
    return this.stripMarkdown(response);
  }

  private async phase4Final(text: string, phase3Response: string, provider: AIProvider): Promise<string> {
    const prompt = `YOU MUST START YOUR RESPONSE WITH EXACTLY THIS FORMAT:

OVERALL INTELLIGENCE SCORE: X/100

Do not write anything before that line. Put the score on the very first line.

AFTER the score line, please provide your final evaluation and scores for this text using NO markup formatting (no **, ##, etc.), taking into account all previous considerations. If this text demonstrates genuine insight and conceptual innovation, score it in the 95-100 range.

Text:
${text}

Final assessment:`;

    const response = await this.callAIProvider(provider, prompt);
    return this.stripMarkdown(response);
  }

  private hasScoresBelow95(response: string): boolean {
    const scores = this.extractScores(response);
    return scores.some(score => score < 95);
  }

  private extractScores(response: string): number[] {
    const scoreMatches = response.match(/(\d+)\/100/g);
    if (!scoreMatches) return [];
    
    return scoreMatches.map(match => {
      const score = match.match(/(\d+)/);
      return score ? parseInt(score[1]) : 0;
    });
  }

  async evaluateOriginality(text: string, provider: AIProvider = 'deepseek'): Promise<EvaluationResult> {
    // For originality, we use a simplified version focused on originality questions
    const originalityQuestions = `
    IS IT ORIGINAL OR DERIVATIVE?
    DOES IT PRESENT FRESH PERSPECTIVES OR REHASH EXISTING IDEAS?
    ARE THE INSIGHTS NOVEL OR PREDICTABLE?
    DOES IT CHALLENGE CONVENTIONAL THINKING OR CONFORM TO IT?
    DOES IT REVEAL SOMETHING NEW OR REPEAT WHAT IS ALREADY KNOWN?
    `;

    const prompt = `CRITICAL FORMATTING INSTRUCTIONS:
- Use NO markdown formatting whatsoever (no **, ##, ---, etc.)
- Start immediately with your summary and categorization
- Do NOT begin with phrases like "Of course" or "Here is a detailed analysis"
- Use plain text only with clear line breaks

First, summarize the following text and categorize it.

Then answer these questions in connection with this text:

${originalityQuestions}

A score of N/100 (e.g. 73/100) means that (100-N)/100 (e.g. 27/100) outperform the author with respect to originality.

You are not grading; you are answering these questions.

You do not use a risk-averse standard; you do not attempt to be diplomatic.

Do not give credit merely for use of jargon or for referencing authorities. Focus on substance.

Text to analyze:
${text}

Give a score out of 100 for overall originality.`;

    const response = await this.callAIProvider(provider, prompt);
    
    return {
      phase1Response: response,
      comprehensive: false
    };
  }
}

export const intelligenceEvaluationService = new IntelligenceEvaluationService();