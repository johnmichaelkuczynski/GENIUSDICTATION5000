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
      try {
        console.log('Testing Perplexity API key:', process.env.PERPLEXITY_API_KEY ? 'Key exists' : 'Key missing');
        const response = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'sonar-pro',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3,
            max_tokens: 4000,
          }),
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Perplexity API error: ${response.status} ${response.statusText} - ${errorText}`);
        }
        
        const data = await response.json();
        return data.choices[0].message.content || "";
      } catch (error: any) {
        console.error('Perplexity API detailed error:', error);
        throw new Error(`Perplexity API error: ${error.message}`);
      }
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
    console.log("🔥 STARTING COMPREHENSIVE INTELLIGENCE EVALUATION - text length:", text.length);
    
    // PHASE 1: Ask the questions
    console.log("🚀 PHASE 1: Initial evaluation");
    const phase1Response = await this.phase1Evaluation(text, INTELLIGENCE_QUESTIONS, provider);
    console.log("✅ Phase 1 completed");
    
    // Extract scores from phase 1
    const scores = this.extractScores(phase1Response);
    console.log("📊 Extracted scores:", scores);
    
    // PHASE 2: Push back if scores are less than 95/100
    console.log("🚀 PHASE 2: Pushback protocol");
    const phase2Response = await this.phase2Pushback(text, phase1Response, scores, INTELLIGENCE_QUESTIONS, provider);
    console.log("✅ Phase 2 completed");
    
    // PHASE 3: Verify scoring consistency 
    console.log("🚀 PHASE 3: Walmart metric verification");
    const phase3Response = await this.phase3VerifyScoring(phase2Response, provider);
    console.log("✅ Phase 3 completed");
    
    // PHASE 4: Accept and report final result
    console.log("🚀 PHASE 4: Final result compilation");
    const finalResult = this.stripMarkdownFormatting(phase3Response);
    console.log("✅ Phase 4 completed - COMPREHENSIVE EVALUATION FINISHED");
    
    return {
      phase1Response: this.stripMarkdownFormatting(phase1Response),
      phase2Response: this.stripMarkdownFormatting(phase2Response), 
      phase3Response: this.stripMarkdownFormatting(phase3Response),
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
    const prompt = `CRITICAL: Your response must start with EXACTLY this line:
OVERALL SCORE: X/100

FORBIDDEN CHARACTERS - DO NOT USE ANY OF THESE:
### ** * --- -- • - (bullets) # (hashtags) _ (underscores for formatting)

Write in PLAIN TEXT ONLY. No formatting whatsoever.

Example format:
OVERALL SCORE: 95/100

This text is a philosophical critique of David Hume's skepticism regarding induction and causation. The author identifies a fundamental flaw in Hume's framework.

Category: Advanced Philosophical Scholarship

IS IT INSIGHTFUL?
Yes, the text makes a bold claim connecting Hume's skepticism to specific metaphysical commitments. Score: 92/100

ANSWER THESE QUESTIONS IN CONNECTION WITH THIS TEXT:
${questions}

Scoring guidelines:

Insight is a sniper shot, not a town hall. If the text reveals something true but unpopular, penalizing it for lacking 'balance' or 'rigor' is midwit bias. Truth often looks extreme because lies are normalized.

Hierarchy of judgment:
95-100/100: Unignorable insight. Either genius or so correct it breaks scales.
80-94/100: Strong but with friction (e.g., clumsy expression, minor gaps).
<80/100: Degrees of mediocrity or failure.

A score of N/100 (e.g. 73/100) means that (100-N)/100 (e.g. 27/100) outperform the author with respect to the parameter defined by the question. You are not grading; you are answering these questions. You do not use a risk-averse standard; you do not attempt to be diplomatic; you do not attempt to comply with risk-averse, medium-range IQ, academic norms. You do not make assumptions about the level of the paper; it could be a work of the highest excellence and genius, or it could be the work of a moron.

If a work is a work of genius, you say that, and you say why; you do not shy away from giving what might conventionally be regarded as excessively "superlative" scores; you give it the score it deserves, not the score that a midwit committee would say it deserves.

Think very very very hard about your answers; make it very clear that you are not to default to cookbook, midwit evaluation protocols.

DO NOT GIVE CREDIT MERELY FOR USE OF JARGON OR FOR REFERENCING AUTHORITIES. FOCUS ON SUBSTANCE. ONLY GIVE POINTS FOR SCHOLARLY REFERENCES/JARGON IF THEY UNAMBIGUOUSLY INCREASE SUBSTANCE.

This is not a grading app. You evaluate the intelligence of what you are given. If you are given a brilliant fragment, you give it a high score. You are not grading essays. You are not looking for completeness. Your job is to answer the questions, period, and to do so on the basis of the text given, making zero assumptions about whether it is complete or incomplete.

Do not overvalue turns of phrase. An author speaking confidently is not necessarily "shutting down modes of inquiry." By putting a clear stake in the ground, he is probably opening them. Casual speech does not mean disorganized thoughts. Don't judge a book by its cover.

Do not change the grading based on the category of the text. If a text is categorized as 'advanced scholarship', still evaluate it with respect to the general population, not with respect only to 'advanced scholarly works.'

Do not penalize boldness. Do not take points away for insights that, if correct, stand on their own. Get rid of the idea that "argumentation" is what makes something smart; it isn't. What makes something smart is that it is smart (insightful). Period.

Text:
"${text}"`;

    const response = await this.callAIProvider(provider, prompt);
    return this.stripMarkdownFormatting(response);
  }

  private stripMarkdownFormatting(text: string): string {
    return text
      .replace(/###\s*/g, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/---+/g, '')
      .replace(/--+/g, '')
      .replace(/_([^_]+)_/g, '$1')
      .replace(/#+\s*/g, '')
      .replace(/^\s*[\-\*\+]\s+/gm, '')
      .replace(/^\s*\d+\.\s+/gm, '')
      .trim();
  }

  private async phase2Pushback(text: string, phase1Response: string, scores: Record<string, number>, questions: string, provider: AIProvider): Promise<string> {
    const hasLowScores = Object.values(scores).some(score => score < 95);
    
    if (!hasLowScores) {
      return phase1Response; // No pushback needed
    }

    let pushbackText = "";
    for (const [category, score] of Object.entries(scores)) {
      if (score < 95) {
        const outperformPercent = 100 - score;
        pushbackText += `YOUR POSITION IS THAT ${outperformPercent}/100 OUTPERFORM THE AUTHOR WITH RESPECT TO THE COGNITIVE METRIC DEFINED BY THE QUESTION: THAT IS YOUR POSITION, AM I RIGHT? AND ARE YOU SURE ABOUT THAT? `;
      }
    }

    const prompt = `${pushbackText}

IN SAYING THIS, I AM NOT NECESSARILY TELLING YOU TO CHANGE YOUR SCORE, ONLY TO CAREFULLY CONSIDER IT.

ANSWER THE FOLLOWING QUESTIONS ABOUT THE TEXT DE NOVO:

${questions}

Text:
"${text}"`;

    const response = await this.callAIProvider(provider, prompt);
    return this.stripMarkdownFormatting(response);
  }

  private async phase3VerifyScoring(phase2Response: string, provider: AIProvider): Promise<string> {
    const scores = this.extractScores(phase2Response);
    
    let verificationText = "ARE YOUR NUMERICAL SCORES (N/100, E.G. 99/100, 42/100) CONSISTENT WITH THE FACT THAT THOSE ARE TO BE TAKEN TO MEAN THAT (100-N) PEOPLE OUT OF 100 OUTPERFORM THE AUTHOR IN THE RELEVANT RESPECT? ";
    
    for (const [category, score] of Object.entries(scores)) {
      const peopleOutperforming = 100 - score;
      verificationText += `SO IF A SCORE OF ${score}/100 IS AWARDED TO A PAPER, THAT MEANS THAT ${peopleOutperforming}/100 PEOPLE IN WALMART ARE RUNNING RINGS AROUND THIS PERSON. `;
    }

    const prompt = `${verificationText}

Previous response:
${phase2Response}`;

    const response = await this.callAIProvider(provider, prompt);
    return this.stripMarkdownFormatting(response);
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