import React, { useState, useRef } from 'react';
import DictationSectionFixed from "@/components/DictationSectionFixed";
import DocumentDropzone from "@/components/DocumentDropzone";
import StyleLibrarySection from "@/components/StyleLibrarySection";
import ContentLibrarySection from "@/components/ContentLibrarySection";
import { GPTBypassSectionNew } from "@/components/gpt-bypass/GPTBypassSectionNew";
import { Separator } from "@/components/ui/separator";

const Home = () => {
  const [textToGPTBypass, setTextToGPTBypass] = useState<string>('');
  const [textToMainApp, setTextToMainApp] = useState<string>('');
  const dictationRef = useRef<any>(null);

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
    // Pass text to dictation component
    if (dictationRef.current && dictationRef.current.receiveText) {
      dictationRef.current.receiveText(text);
    }
  };

  return (
    <>
      <DictationSectionFixed 
        ref={dictationRef}
        onSendToGPTBypass={handleSendToGPTBypass}
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
          receivedText={textToGPTBypass}
        />
      </div>
    </>
  );
};

export default Home;
