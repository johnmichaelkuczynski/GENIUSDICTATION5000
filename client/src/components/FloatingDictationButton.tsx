import { useState, useEffect } from "react";
import { useAppContext } from "@/context/AppContext";
import { useDictation } from "@/hooks/useDictation";
import { Button } from "@/components/ui/button";

const FloatingDictationButton = () => {
  const { 
    dictationActive, 
    setDictationActive,
    selectedSpeechEngine,
    selectedAIModel
  } = useAppContext();
  
  const [controlsVisible, setControlsVisible] = useState(false);
  const { startDictation, stopDictation, dictationStatus } = useDictation();

  const toggleDictation = async () => {
    if (dictationActive) {
      await stopDictation();
      setDictationActive(false);
    } else {
      await startDictation();
      setDictationActive(true);
    }
  };

  const toggleControls = () => {
    setControlsVisible(!controlsVisible);
  };

  useEffect(() => {
    // Add keyboard shortcut for Alt+D to toggle dictation
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key === 'd') {
        toggleDictation();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [dictationActive]);

  // Close controls when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const floatingButton = document.getElementById('floating-dictation-button');
      const dictationControls = document.getElementById('dictation-controls');
      
      if (
        controlsVisible &&
        floatingButton && 
        dictationControls && 
        !floatingButton.contains(target) && 
        !dictationControls.contains(target)
      ) {
        setControlsVisible(false);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [controlsVisible]);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Main Floating Button */}
      <Button
        id="floating-dictation-button"
        onClick={dictationActive ? toggleDictation : toggleControls}
        size="icon"
        className={`w-14 h-14 rounded-full shadow-lg ${
          dictationActive ? 'animate-pulse bg-red-500 hover:bg-red-600' : 'bg-primary hover:bg-primary/90'
        }`}
      >
        <i className={`${dictationActive ? 'ri-stop-line' : 'ri-mic-line'} text-2xl`}></i>
      </Button>
      
      {/* Extended Controls */}
      {controlsVisible && (
        <div 
          id="dictation-controls" 
          className="absolute bottom-16 right-0 bg-card rounded-lg shadow-lg p-3 w-64"
        >
          <div className="flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Universal Dictation</h3>
              <div className="flex items-center space-x-1">
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                <span className="text-xs text-muted-foreground">Ready</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
                <i className="ri-settings-line"></i>
              </Button>
              <span>{selectedSpeechEngine} • {selectedAIModel}</span>
            </div>
            
            <div className="text-xs text-muted-foreground">
              Click mic to dictate directly into any text field
            </div>
            
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <div className="text-xs">
                <span className="font-medium">Shortcut:</span> 
                <span className="bg-accent/10 px-1 py-0.5 rounded">Alt+D</span>
              </div>
              <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground hover:text-foreground">
                <i className="ri-question-line"></i> Help
              </Button>
            </div>
          </div>
          
          <Button 
            onClick={toggleDictation}
            className="w-full mt-3"
            size="sm"
          >
            Start Dictation
          </Button>
        </div>
      )}
    </div>
  );
};

export default FloatingDictationButton;
