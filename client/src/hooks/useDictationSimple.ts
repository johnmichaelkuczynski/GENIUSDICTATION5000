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
      
      // Detect device type
      const isAndroid = /Android/i.test(navigator.userAgent);
      const isMobileDevice = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      // Request user interaction first for Android
      if (isAndroid) {
        toast({
          title: "Microphone Permission",
          description: "Please allow microphone access when prompted. This is required for dictation on Android devices.",
          duration: 4000
        });
      }
      
      // Simplified audio constraints for Android compatibility
      const audioConstraints = isAndroid ? {
        audio: {
          echoCancellation: false, // Disable on Android to avoid issues
          noiseSuppression: false, // Disable on Android to avoid issues
          autoGainControl: false,  // Disable on Android to avoid issues
          sampleRate: 44100,      // Standard sample rate
          channelCount: 1         // Mono for better compatibility
        }
      } : isMobileDevice ? {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
          channelCount: 1
        }
      } : { audio: true };
      
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(audioConstraints);
      } catch (constraintError) {
        console.log("Detailed audio constraints failed, trying basic audio:", constraintError);
        // Fallback to basic audio request if constraints fail
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      
      setDictationStatus("Microphone connected - Starting recording...");
      
      // Create a media recorder with Android-optimized settings
      let recorder;
      try {
        // Try WebM format first (best for most browsers)
        recorder = new MediaRecorder(stream, { 
          mimeType: 'audio/webm;codecs=opus' 
        });
      } catch (e) {
        try {
          // Fallback to basic WebM
          recorder = new MediaRecorder(stream, { 
            mimeType: 'audio/webm' 
          });
        } catch (e2) {
          try {
            // Android fallback - try MP4
            recorder = new MediaRecorder(stream, { 
              mimeType: 'audio/mp4' 
            });
          } catch (e3) {
            // Final fallback - use default format
            recorder = new MediaRecorder(stream);
          }
        }
      }
      
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
        
        // Process audio server-side for Android or when speech recognition isn't available
        const shouldUseServerTranscription = isAndroid || (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window));
        
        if (shouldUseServerTranscription) {
          setDictationStatus("Transcribing audio...");
          
          try {
            const transcribedText = await processAudioServerSide(audioBlob);
            if (transcribedText && transcribedText.trim()) {
              const currentText = originalText || '';
              const updatedText = currentText ? `${currentText} ${transcribedText}` : transcribedText;
              setOriginalText(updatedText);
              
              toast({
                title: "Audio Transcribed",
                description: `Successfully converted ${transcribedText.split(' ').length} words to text.`,
                duration: 3000
              });
            } else {
              toast({
                title: "No Speech Detected",
                description: "Try speaking more clearly or check your microphone.",
                variant: "destructive"
              });
            }
          } catch (error) {
            console.error("Server-side transcription failed:", error);
            toast({
              title: "Transcription Error",
              description: "Could not transcribe audio. Please check your connection and try again.",
              variant: "destructive"
            });
          }
        }
        
        setDictationStatus("Ready");
      });
      
      // Start recording audio
      recorder.start(1000);
      
      // ANDROID-OPTIMIZED SPEECH RECOGNITION
      const hasSpeechRecognition = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
      
      // For Android devices, prioritize server-side transcription as it's more reliable
      if (isAndroid || !hasSpeechRecognition) {
        toast({
          title: "Audio Recording Mode", 
          description: "Recording audio for high-quality transcription. Speak clearly and tap stop when finished.",
          duration: 4000
        });
        setDictationStatus("🎤 Recording - tap STOP when done speaking");
        setDictationActive(true);
        return true;
      }
      
      // Create speech recognition with mobile optimizations
      // @ts-ignore - TypeScript doesn't know about these browser-specific APIs
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      // Configure for mobile compatibility
      recognition.lang = 'en-US';
      recognition.continuous = !isMobileDevice; // On mobile, use shorter sessions
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      
      // Mobile-specific settings
      if (isMobileDevice) {
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