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
  
  // Mobile-optimized dictation start function
  const startDictation = useCallback(async () => {
    try {
      setDictationStatus("Requesting microphone access...");
      
      // Mobile-specific microphone request with constraints
      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      const audioConstraints = isMobile ? {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000, // Lower sample rate for mobile
          channelCount: 1 // Mono for better mobile performance
        }
      } : { audio: true };
      
      const stream = await navigator.mediaDevices.getUserMedia(audioConstraints);
      
      setDictationStatus("Microphone connected - Starting recording...");
      
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
        
        // If speech recognition isn't available (mobile fallback), transcribe server-side
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
          setDictationStatus("Transcribing audio...");
          
          try {
            const transcribedText = await processAudioServerSide(audioBlob);
            if (transcribedText) {
              const currentText = originalText || '';
              const updatedText = currentText ? `${currentText} ${transcribedText}` : transcribedText;
              setOriginalText(updatedText);
              
              toast({
                title: "Audio Transcribed",
                description: "Your speech has been converted to text successfully.",
                duration: 3000
              });
            }
          } catch (error) {
            console.error("Server-side transcription failed:", error);
            toast({
              title: "Transcription Error",
              description: "Could not transcribe audio. Please try again or check your connection.",
              variant: "destructive"
            });
          }
        }
        
        setDictationStatus("Ready");
      });
      
      // Start recording audio
      recorder.start(1000);
      
      // ANDROID-OPTIMIZED SPEECH RECOGNITION
      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isAndroid = /Android/i.test(navigator.userAgent);
      
      // Check for speech recognition with Android-specific handling
      const hasSpeechRecognition = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
      
      if (!hasSpeechRecognition) {
        if (isAndroid) {
          toast({
            title: "Using Audio Recording",
            description: "Recording audio for server transcription. Speak clearly and tap stop when finished.",
            duration: 4000
          });
          setDictationStatus("Recording audio - tap stop when done");
          return true;
        } else {
          toast({
            title: "Speech Recognition Not Available",
            description: "Try using Chrome browser for speech recognition support."
          });
          setDictationStatus("Recording audio for transcription...");
          return true;
        }
      }
      
      // Create speech recognition with mobile optimizations
      // @ts-ignore - TypeScript doesn't know about these browser-specific APIs
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      // Configure for mobile compatibility
      recognition.lang = 'en-US';
      recognition.continuous = !isMobile; // On mobile, use shorter sessions
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      
      // Mobile-specific settings
      if (isMobile) {
        recognition.continuous = false; // Shorter sessions on mobile
        recognition.interimResults = false; // Reduce processing on mobile
      }
      
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

// Process audio using server-side transcription for mobile devices
async function processAudioServerSide(audioBlob: Blob): Promise<string> {
  try {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    
    const response = await fetch('/api/transcribe', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`Transcription failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.text || '';
  } catch (error) {
    console.error('Server-side transcription error:', error);
    throw error;
  }
}