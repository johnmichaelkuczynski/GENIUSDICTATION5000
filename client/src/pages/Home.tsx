import React, { useState, useRef } from 'react';
import DictationSectionFixed from "@/components/DictationSectionFixed";
import DocumentDropzone from "@/components/DocumentDropzone";
import StyleLibrarySection from "@/components/StyleLibrarySection";
import ContentLibrarySection from "@/components/ContentLibrarySection";
import { GPTBypassSectionNew } from "@/components/gpt-bypass/GPTBypassSectionNew";
import { IntelligenceAnalysisTool } from "@/components/IntelligenceAnalysisTool";
import { Separator } from "@/components/ui/separator";

const Home = () => {
  const [textToGPTBypass, setTextToGPTBypass] = useState<string>('');
  const [textToMainApp, setTextToMainApp] = useState<string>('');
  const [textToIntelligenceAnalysis, setTextToIntelligenceAnalysis] = useState<string>('');
  const dictationRef = useRef<{ receiveText: (text: string) => void } | null>(null);
  const intelligenceAnalysisRef = useRef<any>(null);

  const handleSendToGPTBypass = (text: string) => {
    setTextToGPTBypass(text);
    // Scroll to GPT Bypass section
    const gptBypassElement = document.getElementById('gpt-bypass-section');
    if (gptBypassElement) {
      gptBypassElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSendToMainApp = (text: string) => {
    setTextToMainApp(text);
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Pass text to dictation component (ref functionality not implemented yet)
    // TODO: Implement ref functionality in DictationSectionFixed component
  };

  const handleSendToIntelligenceAnalysis = (text: string) => {
    setTextToIntelligenceAnalysis(text);
    // Scroll to intelligence analysis section
    const intelligenceElement = document.getElementById('intelligence-analysis-section');
    if (intelligenceElement) {
      intelligenceElement.scrollIntoView({ behavior: 'smooth' });
    }
    // Pass text to intelligence analysis component
    if (intelligenceAnalysisRef.current && intelligenceAnalysisRef.current.receiveText) {
      intelligenceAnalysisRef.current.receiveText(text);
    }
  };

  return (
    <>
      <DictationSectionFixed 
        onSendToGPTBypass={handleSendToGPTBypass}
        onSendToIntelligenceAnalysis={handleSendToIntelligenceAnalysis}
        receivedText={textToMainApp}
      />
      <DocumentDropzone />
      <StyleLibrarySection />
      <ContentLibrarySection />
      
      {/* Separator between existing app and GPT Bypass */}
      <div className="my-16">
        <Separator className="my-8" />
        <div className="text-center text-lg font-medium text-muted-foreground">
          GPT Bypass - AI Text Humanization
        </div>
        <Separator className="my-8" />
      </div>
      
      {/* GPT Bypass Section */}
      <div id="gpt-bypass-section">
        <GPTBypassSectionNew 
          onSendToMain={handleSendToMainApp}
          onSendToIntelligenceAnalysis={handleSendToIntelligenceAnalysis}
          receivedText={textToGPTBypass}
        />
      </div>
      
      {/* Separator between GPT Bypass and Intelligence Analysis */}
      <div className="my-16">
        <Separator className="my-8" />
        <div className="text-center text-lg font-medium text-muted-foreground">
          Intelligence Analysis Tool
        </div>
        <Separator className="my-8" />
      </div>
      
      {/* Intelligence Analysis Tool Section */}
      <div id="intelligence-analysis-section">
        <IntelligenceAnalysisTool 
          ref={intelligenceAnalysisRef}
          onSendToMain={handleSendToMainApp}
          onSendToGPTBypass={handleSendToGPTBypass}
          receivedText={textToIntelligenceAnalysis}
        />
      </div>
    </>
  );
};

export default Home;
