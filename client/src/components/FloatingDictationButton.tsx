import { useState, useEffect, useCallback } from "react";
import { useAppContext } from "@/context/AppContext";
import { useDictation } from "@/hooks/useDictation";
import { Button } from "@/components/ui/button";

const FloatingDictationButton = () => {
  // App Context
  const { 
    dictationActive, 
    setDictationActive,
    selectedSpeechEngine,
    selectedAIModel
  } = useAppContext();
  
  // Component State
  const [controlsVisible, setControlsVisible] = useState(false);
  
  // Custom hooks
  const { 
    startDictation, 
    stopDictation, 
    dictationStatus,
    hasRecordedAudio,
    isPlaying: isOriginalAudioPlaying,
    playRecordedAudio
  } = useDictation();

  // Handlers as callbacks to ensure consistent hook order
  const toggleDictation = useCallback(async () => {
    if (dictationActive) {
      await stopDictation();
      setDictationActive(false);
    } else {
      await startDictation();
      setDictationActive(true);
    }
  }, [dictationActive, startDictation, stopDictation, setDictationActive]);

  const toggleControls = useCallback(() => {
    setControlsVisible(prev => !prev);
  }, []);

  // Add keyboard shortcut for Alt+D to toggle dictation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key === 'd') {
        toggleDictation();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [toggleDictation]);

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
        className={`w-16 h-16 rounded-full shadow-xl ${
          dictationActive 
            ? 'animate-pulse bg-red-500 hover:bg-red-600 ring-4 ring-red-300' 
            : 'bg-purple-600 hover:bg-purple-700 ring-4 ring-purple-300'
        }`}
      >
        <i className={`${dictationActive ? 'ri-stop-line' : 'ri-mic-line'} text-2xl text-white`}></i>
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
            
            {/* Add button to listen to last recording if available */}
            {hasRecordedAudio && (
              <div className="pt-2">
                <Button 
                  onClick={playRecordedAudio}
                  className="w-full"
                  variant="secondary"
                  size="sm"
                >
                  <i className={`${isOriginalAudioPlaying ? "ri-pause-fill" : "ri-play-fill"} mr-1.5`}></i>
                  {isOriginalAudioPlaying ? "Pause Original Dictation" : "Play Original Dictation"}
                </Button>
              </div>
            )}
            
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
