import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { SpeechEngine, AIModel } from "@shared/schema";

interface StyleReference {
  id: number;
  name: string;
  description: string;
  active: boolean;
  documentCount: number;
}

interface ContentReference {
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
  deepseek: boolean;
  mathpix: boolean;
  tesseract: boolean;
  texify: boolean;
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
  useContentReference: boolean;
  setUseContentReference: (use: boolean) => void;
  selectedSpeechEngine: SpeechEngine;
  setSelectedSpeechEngine: (engine: SpeechEngine) => void;
  selectedAIModel: AIModel;
  setSelectedAIModel: (model: AIModel) => void;
  styleReferences: StyleReference[];
  setStyleReferences: (references: StyleReference[]) => void;
  contentReferences: ContentReference[];
  setContentReferences: (references: ContentReference[]) => void;
  apisConnected: boolean;
  setApisConnected: (connected: boolean) => void;
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
  selectedPreset: string;
  setSelectedPreset: (preset: string) => void;
  availableServices: ApiServices;
  checkApiStatus: () => Promise<void>;
};

const defaultStyleReferences: StyleReference[] = [];
const defaultContentReferences: ContentReference[] = [];

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [dictationActive, setDictationActive] = useState(false);
  const [originalText, setOriginalText] = useState("");
  const [processedText, setProcessedText] = useState("");
  const [customInstructions, setCustomInstructions] = useState("Write like Hemingway meets hard news. Simple words only. Short sentences. Cut 50% of words. No academic language.");
  const [useStyleReference, setUseStyleReference] = useState(true);
  const [useContentReference, setUseContentReference] = useState(true);
  const [selectedSpeechEngine, setSelectedSpeechEngine] = useState<SpeechEngine>(SpeechEngine.GLADIA);
  const [selectedAIModel, setSelectedAIModel] = useState<AIModel>(AIModel.DEEPSEEK);
  const [styleReferences, setStyleReferences] = useState<StyleReference[]>(defaultStyleReferences);
  const [contentReferences, setContentReferences] = useState<ContentReference[]>(defaultContentReferences);
  const [apisConnected, setApisConnected] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState("Academic");
  const [availableServices, setAvailableServices] = useState<ApiServices>({
    gladia: false,
    openai: false,
    deepgram: false,
    elevenLabs: false,
    anthropic: false,
    perplexity: false,
    deepseek: false,
    mathpix: false,
    tesseract: false,
    texify: false
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
        useContentReference,
        setUseContentReference,
        selectedSpeechEngine,
        setSelectedSpeechEngine,
        selectedAIModel,
        setSelectedAIModel,
        styleReferences,
        setStyleReferences,
        contentReferences,
        setContentReferences,
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
