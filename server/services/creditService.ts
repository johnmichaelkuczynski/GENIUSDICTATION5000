import { storage } from "../storage";

interface CreditCost {
  cost: number;
  wordCount: number;
}

export const creditService = {
  // Calculate credit cost based on word count
  // Different providers have different costs per word
  calculateCost(wordCount: number, provider: string = 'openai'): number {
    const baseWordCost = {
      'openai': 0.01,      // 1 credit per 100 words
      'anthropic': 0.01,   // 1 credit per 100 words  
      'deepseek': 0.005,   // 0.5 credits per 100 words (cheaper)
      'perplexity': 0.01,  // 1 credit per 100 words
    };
    
    const costPerWord = baseWordCost[provider as keyof typeof baseWordCost] || 0.01;
    return Math.ceil(wordCount * costPerWord);
  },

  // Check if user has sufficient credits
  async checkCredits(userId: string, requiredCredits: number): Promise<boolean> {
    const user = await storage.getUserById(userId);
    if (!user) return false;
    
    // -1 means unlimited credits (admin user)
    if (user.credits === -1) return true;
    
    return user.credits >= requiredCredits;
  },

  // Deduct credits from user account
  async deductCredits(userId: string, amount: number): Promise<boolean> {
    const user = await storage.getUserById(userId);
    if (!user) return false;
    
    // -1 means unlimited credits (admin user) - don't deduct
    if (user.credits === -1) return true;
    
    // Check if user has enough credits
    if (user.credits < amount) return false;
    
    // Deduct credits
    const newCredits = user.credits - amount;
    await storage.updateUserCredits(userId, newCredits);
    
    return true;
  },

  // Get credit cost info without deducting
  async getCostInfo(text: string, provider: string = 'openai'): CreditCost {
    const wordCount = text.trim().split(/\s+/).length;
    const cost = this.calculateCost(wordCount, provider);
    return { cost, wordCount };
  }
};
