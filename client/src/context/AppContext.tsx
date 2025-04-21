import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { SpeechEngine, AIModel } from "@shared/schema";

interface StyleReference {
  id: number;
  name: string;
  description: string;
  active: boolean;
  documentCount: number;
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

  const checkApiStatus = async () => {
    try {
      const response = await fetch("/api/status");
      const data = await response.json();
      setApisConnected(data.connected);
    } catch (error) {
      console.error("Failed to check API status:", error);
      setApisConnected(false);
    }
  };

  useEffect(() => {
    checkApiStatus();
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
