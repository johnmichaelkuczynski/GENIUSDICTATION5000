import OpenAI from "openai";
import Anthropic from '@anthropic-ai/sdk';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key",
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY_ENV_VAR || "default_key",
});

interface EvaluationResult {
  phase1Response: string;
  phase2Response: string;
  phase3Response: string;
  finalResult: string;
  scores: Record<string, number>;
}

const INTELLIGENCE_QUESTIONS = `IS IT INSIGHTFUL? 
DOES IT DEVELOP POINTS? (OR, IF IT IS A SHORT EXCERPT, IS THERE EVIDENCE THAT IT WOULD DEVELOP POINTS IF EXTENDED)? 
IS THE ORGANIZATION MERELY SEQUENTIAL (JUST ONE POINT AFTER ANOTHER, LITTLE OR NO LOGICAL SCAFFOLDING)? OR ARE THE IDEAS ARRANGED, NOT JUST SEQUENTIALLY BUT HIERARCHICALLY? 
IF THE POINTS IT MAKES ARE NOT INSIGHTFUL, DOES IT OPERATE SKILLFULLY WITH CANONS OF LOGIC/REASONING. 
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

const ORIGINALITY_QUESTIONS = `IS IT ORIGINAL (NOT IN THE SENSE THAT IT HAS ALREADY BEEN SAID BUT IN THE SENSE THAT ONLY A FECUND MIND COULD COME UP WITH IT)? 
EXPLANATION OF LAST QUESTION: IF I PUT IN ISAAC NEWTON, IT SHOULD BE NOT BE DESCRIBED AS 'UNORIGINAL' SIMPLY BECAUSE SOMEBODY (NAMELY, NEWTON) SAID IT HUNDREDS OF YEARS AGO.
ARE THE WAYS THE IDEAS ARE INTERCONNECTED ORIGINAL? OR ARE THOSE INTERCONNECTIONS CONVENTION-DRIVEN AND DOCTRINAIRE?
ARE IDEAS DEVELOPED IN A FRESH AND ORIGINAL WAY? OR IS THE IDEA-DEVELOPMENT MERELY ASSOCIATIVE, COMMONSENSE-BASED (OR COMMON-NONSENSE-BASED), OR DOCTRINAIRE? 
IS IT ORIGINAL RELATIVE TO THE DATASET THAT, JUDGING BY WHAT IT SAYS AND HOW IT SAYS IT, IT APPEARS TO BE ADDRESSING? (THIS QUESTION IS MEANT TO RULE OUT 'ORIGINALITY'-BENCHMARKS THAT AUTOMATICALLY CHARACTERIZE DARWIN, FREUD, NEWTON, GALILEO AS 'UNORIGINAL.') 
IS IT ORIGINAL IN A SUBSTANTIVE SENSE (IN THE SENSE IN WHICH BACH WAS ORIGINAL) OR ONLY IN A FRIVOLOUS TOKEN SENSE (THE SENSE IN WHICH SOMEBODY WHO RANDOMLY BANGS ON A PIANO IS 'ORIGINAL')? 
IF YOU GAVE A ROBOT THE DATASET TO WHICH THE PASSAGE IS A RESPONSE, WOULD IT COME UP WITH THE SAME THING? OR, ON THE CONTRARY, DOES IT BUTCHER IDEAS, THIS BEING WHAT GIVES IT A SHEEN OF 'ORIGINALITY'?
IS IT BOILERPLATE (OR IF IT, PER SE, IS NOT BOILER PLATE, IS IT THE RESULT OF APPLYING BOILER PLATE PROTOCOLS IN A BOILER PLATE WAY TO SOME DATASET)?
WOULD SOMEBODY WHO HAD NOT READ IT, BUT WAS OTHERWISE EDUCATED AND INFORMED, COME AWAY FROM IT BEING MORE ENLIGHTENED AND BETTER EQUIPPED TO ADJUDICATE INTELLECTUAL QUESTIONS? OR, ON THE CONTRARY, WOULD HE COME UP CONFUSED WITH NOTHING TANGIBLE TO SHOW FOR IT? 
WOULD SOMEBODY READING IT COME AWAY FROM THE EXPERIENCE WITH INSIGHTS THAT WOULD OTHERWISE BE HARD TO ACQUIRE THAT HOLD UP IN GENERAL? 
OR WOULD WHATEVER HIS TAKEAWAY WAS HAVE VALIDITY ONLY RELATIVE TO VALIDITIES THAT ARE SPECIFIC TO SOME AUTHOR OR SYSTEM AND PROBABLY DO NOT HAVE MUCH OBJECTIVE LEGITIMACY?`;

type AIProvider = 'openai' | 'anthropic' | 'deepseek' | 'perplexity';

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
  
  // Normal analysis - Phase 1 only
  async phase1Only(text: string, provider: AIProvider = 'deepseek'): Promise<string> {
    console.log("Starting Phase 1 intelligence evaluation for text of length:", text.length);
    const response = await this.phase1Evaluation(text, INTELLIGENCE_QUESTIONS, provider);
    console.log("Phase 1 completed");
    return response;
  }

  // Comprehensive analysis - All phases
  async evaluateIntelligence(text: string, provider: AIProvider = 'deepseek'): Promise<EvaluationResult> {
    console.log("Starting intelligence evaluation for text of length:", text.length);
    
    // PHASE 1: Ask the questions
    const phase1Response = await this.phase1Evaluation(text, INTELLIGENCE_QUESTIONS, provider);
    console.log("Phase 1 completed");
    
    // Extract scores from phase 1
    const scores = this.extractScores(phase1Response);
    
    // PHASE 2: Push back if scores are less than 95/100
    const phase2Response = await this.phase2Pushback(text, phase1Response, scores, INTELLIGENCE_QUESTIONS, provider);
    console.log("Phase 2 completed");
    
    // PHASE 3: Verify scoring consistency 
    const phase3Response = await this.phase3VerifyScoring(phase2Response, provider);
    console.log("Phase 3 completed");
    
    // PHASE 4: Accept and report final result
    const finalResult = phase3Response;
    console.log("Phase 4 completed - evaluation finished");
    
    return {
      phase1Response,
      phase2Response, 
      phase3Response,
      finalResult,
      scores: this.extractScores(finalResult)
    };
  }
  
  async evaluateOriginality(text: string, provider: AIProvider = 'deepseek'): Promise<EvaluationResult> {
    console.log("Starting originality evaluation for text of length:", text.length);
    
    // PHASE 1: Ask the questions
    const phase1Response = await this.phase1Evaluation(text, ORIGINALITY_QUESTIONS, provider);
    console.log("Phase 1 completed");
    
    // Extract scores from phase 1
    const scores = this.extractScores(phase1Response);
    
    // PHASE 2: Push back if scores are less than 95/100
    const phase2Response = await this.phase2Pushback(text, phase1Response, scores, ORIGINALITY_QUESTIONS, provider);
    console.log("Phase 2 completed");
    
    // PHASE 3: Verify scoring consistency 
    const phase3Response = await this.phase3VerifyScoring(phase2Response, provider);
    console.log("Phase 3 completed");
    
    // PHASE 4: Accept and report final result
    const finalResult = phase3Response;
    console.log("Phase 4 completed - evaluation finished");
    
    return {
      phase1Response,
      phase2Response, 
      phase3Response,
      finalResult,
      scores: this.extractScores(finalResult)
    };
  }

  private async phase1Evaluation(text: string, questions: string, provider: AIProvider): Promise<string> {
    const prompt = `OVERALL SCORE: X/100

Analyze this text systematically. Quote specific passages to support your characterizations.

${questions}

CRITICAL FORMATTING RULES:
- First line must be: OVERALL SCORE: X/100
- Use zero markdown (no asterisks, hashtags, etc.)
- Quote specific text passages as evidence
- Be precise and direct

SCORING INSTRUCTIONS: A score of N/100 means (100-N)% of writers outperform this author on the given parameter. Score based on absolute quality, not relative to academic mediocrity. If the work demonstrates genuine insight, logical rigor, fresh thinking, or theoretical innovation, score it accordingly. Do not artificially deflate scores due to academic risk-aversion or committee-think. 

A work that introduces novel theoretical concepts deserves high scores. A work with sophisticated reasoning deserves high scores. Do not penalize genuine intellectual work.

Text:
"${text}"`;

    return await this.callAIProvider(provider, prompt);
  }

  private async phase2Pushback(text: string, phase1Response: string, scores: Record<string, number>, questions: string, provider: AIProvider): Promise<string> {
    const hasLowScores = Object.values(scores).some(score => score < 95);
    
    if (!hasLowScores) {
      return phase1Response; // No pushback needed
    }

    let pushbackText = "Based on your previous response, ";
    for (const [category, score] of Object.entries(scores)) {
      if (score < 95) {
        const percentOutperform = 100 - score;
        pushbackText += `your position is that ${percentOutperform}/100 outperform the author with respect to the cognitive metric defined by the question: that is your position, am I right? And are you sure about that? `;
      }
    }

    const prompt = `${pushbackText}

Answer the following questions about the text de novo:

${questions}

Text to analyze:
"${text}"

Provide a numerical score out of 100 for your overall assessment.`;

    return await this.callAIProvider(provider, prompt);
  }

  private async phase3VerifyScoring(phase2Response: string, provider: AIProvider): Promise<string> {
    const scores = this.extractScores(phase2Response);
    
    let verificationText = "Are your numerical scores consistent with the fact that those are to be taken to mean that (100-N) people out of 100 outperform the author in the relevant respect? ";
    
    for (const [category, score] of Object.entries(scores)) {
      const peopleOutperforming = 100 - score;
      verificationText += `If a score of ${score}/100 is awarded, that means that ${peopleOutperforming}/100 people in Walmart are running rings around this person. `;
    }

    const prompt = `${verificationText}

Given this context, are you confident in your scores? Please provide your final assessment with numerical scores.

Previous response to consider:
${phase2Response}`;

    return await this.callAIProvider(provider, prompt);
  }

  private extractScores(response: string): Record<string, number> {
    const scores: Record<string, number> = {};
    
    // Look for patterns like "85/100", "Score: 92/100", etc.
    const scoreMatches = response.match(/(?:score[:\s]*)?(\d{1,3})\/100/gi);
    
    if (scoreMatches) {
      scoreMatches.forEach((match, index) => {
        const scoreValue = parseInt(match.match(/(\d{1,3})/)?.[1] || "0");
        scores[`score_${index + 1}`] = scoreValue;
      });
    }
    
    // Try to extract an overall score
    const overallMatch = response.match(/overall[:\s]*(\d{1,3})\/100/i);
    if (overallMatch) {
      scores['overall'] = parseInt(overallMatch[1]);
    }
    
    return scores;
  }
}

export const intelligenceEvaluationService = new IntelligenceEvaluationService();