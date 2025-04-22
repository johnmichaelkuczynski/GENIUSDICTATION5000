import { useState, useCallback, useRef } from "react";
import { useAppContext } from "@/context/AppContext";
import { useToast } from "@/hooks/use-toast";

/**
 * A simplified dictation hook that focuses on reliability
 */
export function useDictationSimple() {
  const { toast } = useToast();
  const { 
    originalText, 
    setOriginalText, 
    setDictationActive 
  } = useAppContext();
  
  const [dictationStatus, setDictationStatus] = useState("Ready");
  const [hasRecordedAudio, setHasRecordedAudio] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Refs for managing state
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordedAudioBlobRef = useRef<Blob | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const recognitionRef = useRef<any>(null);
  
  // Extremely simple dictation start function that prioritizes reliability
  const startDictation = useCallback(async () => {
    try {
      setDictationStatus("Listening...");
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Create a media recorder just for saving audio
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      
      // Listen for data chunks to save audio
      recorder.addEventListener("dataavailable", (event) => {
        audioChunksRef.current.push(event.data);
      });
      
      // Save the audio when recording stops
      recorder.addEventListener("stop", async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        
        // Save the audio blob for playback
        recordedAudioBlobRef.current = audioBlob;
        setHasRecordedAudio(true);
        
        // Clean up any previous audio
        if (audioUrlRef.current) {
          URL.revokeObjectURL(audioUrlRef.current);
        }
        
        // Create and store the audio URL
        const audioUrl = URL.createObjectURL(audioBlob);
        audioUrlRef.current = audioUrl;
        audioRef.current = new Audio(audioUrl);
        
        setDictationStatus("Ready");
      });
      
      // Start recording audio
      recorder.start(1000);
      
      // SIMPLIFIED SPEECH RECOGNITION
      // Use the Web Speech API directly
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        toast({
          title: "Speech Recognition Not Available",
          description: "Your browser doesn't support speech recognition. Try Chrome or Edge."
        });
        return false;
      }
      
      // Create speech recognition
      // @ts-ignore - TypeScript doesn't know about these browser-specific APIs
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      // Configure for best results
      recognition.lang = 'en-US';
      recognition.continuous = true; // Keep listening
      recognition.interimResults = true; // Show results as you speak
      
      // CRITICAL: save entire text and never reset it
      let fullText = originalText || '';
      
      // When we get results, ALWAYS APPEND, never reset
      recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          // Show interim results as status
          if (!event.results[i].isFinal) {
            const interimTranscript = event.results[i][0].transcript;
            setDictationStatus(`Listening: ${interimTranscript}`);
          } else {
            // For final results, ALWAYS append to existing text
            const finalTranscript = event.results[i][0].transcript;
            fullText = fullText ? `${fullText} ${finalTranscript}` : finalTranscript;
            setOriginalText(fullText); // Update the main text field
          }
        }
      };
      
      // Handle errors quietly
      recognition.onerror = (event: any) => {
        console.log("Speech recognition error detected: " + event.error);
        // Don't display errors to users, just keep going
      };
      
      // If recognition ends, restart it automatically while we're recording
      recognition.onend = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
          recognition.start();
        }
      };
      
      // Start recognition
      recognition.start();
      recognitionRef.current = recognition;
      
      // Enable dictation in UI
      setDictationActive(true);
      
      return true;
    } catch (error) {
      console.error("Failed to start dictation:", error);
      setDictationStatus("Error: microphone access denied");
      return false;
    }
  }, [originalText, setDictationActive, setOriginalText, toast]);

  // Simple stop function - just stop everything
  const stopDictation = useCallback(() => {
    // Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      
      // Stop all audio tracks
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    
    // Stop speech recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore errors when stopping
      }
      recognitionRef.current = null;
    }
    
    // Update UI
    setDictationActive(false);
    setDictationStatus("Processing...");
    
    // Brief timeout before showing "Ready" to give feedback
    setTimeout(() => {
      setDictationStatus("Ready");
    }, 500);
    
  }, [setDictationActive]);

  // Play the recorded audio
  const playRecordedAudio = useCallback(() => {
    if (!audioRef.current && recordedAudioBlobRef.current) {
      // Create audio element if needed
      const url = URL.createObjectURL(recordedAudioBlobRef.current);
      audioUrlRef.current = url;
      const audio = new Audio(url);
      
      audio.addEventListener("ended", () => {
        setIsPlaying(false);
      });
      
      audioRef.current = audio;
    }
    
    if (!audioRef.current) {
      toast({
        title: "No recorded audio",
        description: "Record some dictation first"
      });
      return;
    }
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(() => {
          toast({
            title: "Playback error",
            description: "Could not play the audio"
          });
        });
    }
  }, [isPlaying, toast]);

  // Download the recorded audio
  const downloadRecordedAudio = useCallback(() => {
    if (!recordedAudioBlobRef.current) {
      toast({
        title: "No recorded audio",
        description: "Record some dictation first"
      });
      return;
    }
    
    const url = URL.createObjectURL(recordedAudioBlobRef.current);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dictation.webm";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [toast]);

  return {
    startDictation,
    stopDictation,
    dictationStatus,
    hasRecordedAudio,
    isPlaying,
    playRecordedAudio,
    downloadRecordedAudio
  };
}

// Process audio using local API if needed
async function processAudio(audioBlob: Blob): Promise<string> {
  // The simplified version doesn't need server-side processing
  return "";
}