import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { SpeechEngine, AIModel } from "@shared/schema";

interface StyleReference {
  id: number;
  name: string;
  description: string;
  active: boolean;
  documentCount: number;
}

interface ApiServices {
  gladia: boolean;
  openai: boolean;
  deepgram: boolean;
  elevenLabs: boolean;
  anthropic: boolean;
  perplexity: boolean;
}

type AppContextType = {
  dictationActive: boolean;
  setDictationActive: (active: boolean) => void;
  originalText: string;
  setOriginalText: (text: string) => void;
  processedText: string;
  setProcessedText: (text: string) => void;
  customInstructions: string;
  setCustomInstructions: (instructions: string) => void;
  useStyleReference: boolean;
  setUseStyleReference: (use: boolean) => void;
  selectedSpeechEngine: SpeechEngine;
  setSelectedSpeechEngine: (engine: SpeechEngine) => void;
  selectedAIModel: AIModel;
  setSelectedAIModel: (model: AIModel) => void;
  styleReferences: StyleReference[];
  setStyleReferences: (references: StyleReference[]) => void;
  apisConnected: boolean;
  setApisConnected: (connected: boolean) => void;
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
  selectedPreset: string;
  setSelectedPreset: (preset: string) => void;
  availableServices: ApiServices;
  checkApiStatus: () => Promise<void>;
};

const defaultStyleReferences: StyleReference[] = [
  {
    id: 1,
    name: "Academic Writing",
    description: "Formal academic style with emphasis on theoretical frameworks, methodological rigor, and precise terminology. Uses third-person perspective and passive voice.",
    active: true,
    documentCount: 3,
  },
  {
    id: 2,
    name: "Professional Emails",
    description: "Concise and direct business communication style. Clear subject lines, professional greeting, and actionable conclusions. Moderate formality with personal touches.",
    active: false,
    documentCount: 5,
  },
];

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [dictationActive, setDictationActive] = useState(false);
  const [originalText, setOriginalText] = useState("");
  const [processedText, setProcessedText] = useState("");
  const [customInstructions, setCustomInstructions] = useState("Rewrite in the style of an academic paper with a focus on theoretical frameworks. Expand on the implications for human-AI collaboration.");
  const [useStyleReference, setUseStyleReference] = useState(true);
  const [selectedSpeechEngine, setSelectedSpeechEngine] = useState<SpeechEngine>(SpeechEngine.GLADIA);
  const [selectedAIModel, setSelectedAIModel] = useState<AIModel>(AIModel.GPT4O);
  const [styleReferences, setStyleReferences] = useState<StyleReference[]>(defaultStyleReferences);
  const [apisConnected, setApisConnected] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState("Academic");
  const [availableServices, setAvailableServices] = useState<ApiServices>({
    gladia: false,
    openai: false,
    deepgram: false,
    elevenLabs: false,
    anthropic: false,
    perplexity: false
  });

  const checkApiStatus = async () => {
    try {
      const response = await fetch("/api/status");
      const data = await response.json();
      setApisConnected(data.connected);
      
      // Update available services if provided in response
      if (data.services) {
        setAvailableServices(data.services);
        
        // If the currently selected model's service is not available, switch to an available one
        if (selectedAIModel.includes('Claude') && !data.services.anthropic) {
          // Switch to GPT-4o if OpenAI is available, otherwise Perplexity if available
          if (data.services.openai) {
            setSelectedAIModel(AIModel.GPT4O);
          } else if (data.services.perplexity) {
            setSelectedAIModel(AIModel.PERPLEXITY_LLAMA_SONAR);
          }
        } else if (selectedAIModel.includes('GPT') && !data.services.openai) {
          // Switch to Claude if Anthropic is available, otherwise Perplexity if available
          if (data.services.anthropic) {
            setSelectedAIModel(AIModel.CLAUDE_3_SONNET);
          } else if (data.services.perplexity) {
            setSelectedAIModel(AIModel.PERPLEXITY_LLAMA_SONAR);
          }
        } else if (selectedAIModel.includes('Perplexity') && !data.services.perplexity) {
          // Switch to GPT-4o if OpenAI is available, otherwise Claude if available
          if (data.services.openai) {
            setSelectedAIModel(AIModel.GPT4O);
          } else if (data.services.anthropic) {
            setSelectedAIModel(AIModel.CLAUDE_3_SONNET);
          }
        }
        
        // Same logic for speech engine
        if (selectedSpeechEngine === SpeechEngine.GLADIA && !data.services.gladia) {
          if (data.services.openai) {
            setSelectedSpeechEngine(SpeechEngine.WHISPER);
          } else if (data.services.deepgram) {
            setSelectedSpeechEngine(SpeechEngine.DEEPGRAM);
          }
        } else if (selectedSpeechEngine === SpeechEngine.WHISPER && !data.services.openai) {
          if (data.services.gladia) {
            setSelectedSpeechEngine(SpeechEngine.GLADIA);
          } else if (data.services.deepgram) {
            setSelectedSpeechEngine(SpeechEngine.DEEPGRAM);
          }
        } else if (selectedSpeechEngine === SpeechEngine.DEEPGRAM && !data.services.deepgram) {
          if (data.services.gladia) {
            setSelectedSpeechEngine(SpeechEngine.GLADIA);
          } else if (data.services.openai) {
            setSelectedSpeechEngine(SpeechEngine.WHISPER);
          }
        }
      }
    } catch (error) {
      console.error("Failed to check API status:", error);
      setApisConnected(false);
    }
  };

  useEffect(() => {
    checkApiStatus();
    
    // Set up regular status checks every 30 seconds
    const intervalId = setInterval(checkApiStatus, 30000);
    
    // Clean up on unmount
    return () => clearInterval(intervalId);
  }, []);

  return (
    <AppContext.Provider
      value={{
        dictationActive,
        setDictationActive,
        originalText,
        setOriginalText,
        processedText,
        setProcessedText,
        customInstructions,
        setCustomInstructions,
        useStyleReference,
        setUseStyleReference,
        selectedSpeechEngine,
        setSelectedSpeechEngine,
        selectedAIModel,
        setSelectedAIModel,
        styleReferences,
        setStyleReferences,
        apisConnected,
        setApisConnected,
        isProcessing,
        setIsProcessing,
        selectedPreset,
        setSelectedPreset,
        availableServices,
        checkApiStatus
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
}
