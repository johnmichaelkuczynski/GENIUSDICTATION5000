import { Router } from 'express';
import { intelligenceEvaluationService } from '../services/intelligenceEvaluation.js';

const router = Router();

router.post('/evaluate-intelligence', async (req, res) => {
  try {
    const { text, provider = 'openai', abbreviated = false } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    console.log("🔥 API ROUTE - provider:", provider, "abbreviated:", abbreviated, "text length:", text.length);
    const result = await intelligenceEvaluationService.evaluateIntelligence(text, provider, abbreviated);
    
    res.json(result);
  } catch (error: any) {
    console.error('Intelligence evaluation error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/evaluate-originality', async (req, res) => {
  try {
    const { text, provider = 'openai' } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    console.log("Starting originality evaluation via API");
    const result = await intelligenceEvaluationService.evaluateOriginality(text, provider);
    
    res.json(result);
  } catch (error: any) {
    console.error('Originality evaluation error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;