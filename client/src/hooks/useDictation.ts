import { useState, useCallback, useRef, useEffect } from "react";
import { useAppContext } from "@/context/AppContext";
import { SpeechEngine } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useDictation() {
  const { toast } = useToast();
  const [dictationStatus, setDictationStatus] = useState("Ready");
  const [hasRecordedAudio, setHasRecordedAudio] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioSource, setAudioSource] = useState<"recording" | "upload" | null>(null);
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(true); // Toggle for real-time mode
  
  const { 
    setOriginalText, 
    originalText, 
    selectedSpeechEngine,
    setDictationActive
  } = useAppContext() as {
    setOriginalText: (text: string | ((prevText: string) => string)) => void;
    originalText: string;
    selectedSpeechEngine: SpeechEngine;
    setDictationActive: (active: boolean) => void;
  };

  // Store a reference to the current dictation session using refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const webSocketRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  // References for audio playback
  const recordedAudioBlobRef = useRef<Blob | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const serverAudioUrlRef = useRef<string | null>(null);

  // Check for existing audio on mount
  useEffect(() => {
    if (recordedAudioBlobRef.current) {
      setHasRecordedAudio(true);
    }
  }, []);

  // Initialize WebSocket connection for real-time transcription
  const initWebSocket = useCallback(() => {
    // Close any existing connection
    if (webSocketRef.current) {
      webSocketRef.current.close();
      webSocketRef.current = null;
    }
    
    // Create WebSocket connection
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);
    
    socket.onopen = () => {
      console.log("WebSocket connection established");
    };
    
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'transcription') {
          // Update the transcription text in real-time
          if (data.text) {
            if (data.isFinal) {
              // For final transcription, append it
              setOriginalText((prevText: string) => {
                return prevText ? `${prevText} ${data.text}` : data.text;
              });
            } else {
              // For interim transcription, update or append based on context
              setOriginalText((prevText: string) => {
                // If we have prior text that seems to be part of the same utterance,
                // replace the last sentence with the new transcription
                if (prevText && prevText.trim().endsWith('...')) {
                  // Find the last complete sentence and replace everything after it
                  const lastSentenceIndex = Math.max(
                    prevText.lastIndexOf('. '),
                    prevText.lastIndexOf('! '),
                    prevText.lastIndexOf('? ')
                  );
                  
                  if (lastSentenceIndex > 0) {
                    return prevText.substring(0, lastSentenceIndex + 2) + data.text;
                  }
                }
                
                // Otherwise, just append the new text
                return prevText ? `${prevText} ${data.text}...` : `${data.text}...`;
              });
            }
          }
        }
        else if (data.type === 'error') {
          console.error("WebSocket error:", data.message);
          toast({
            variant: "destructive",
            title: "Transcription Error",
            description: data.message || "An error occurred during real-time transcription.",
          });
        }
      } catch (error) {
        console.error("Error processing WebSocket message:", error);
      }
    };
    
    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
      toast({
        variant: "destructive",
        title: "Connection Error",
        description: "Failed to establish real-time transcription connection. Falling back to batch mode.",
      });
      setIsRealTimeEnabled(false);
    };
    
    socket.onclose = () => {
      console.log("WebSocket connection closed");
    };
    
    webSocketRef.current = socket;
  }, [setOriginalText, toast]);

  const startDictation = useCallback(async () => {
    try {
      setDictationStatus("Listening...");
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // Create a media recorder
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      
      // If real-time mode is enabled, initialize WebSocket
      if (isRealTimeEnabled) {
        initWebSocket();
        
        // When WebSocket is ready, start recording and sending audio chunks
        if (webSocketRef.current) {
          // Send start signal to server
          webSocketRef.current.send(JSON.stringify({ type: 'start' }));
        }
      }
      
      // Listen for data chunks
      recorder.addEventListener("dataavailable", (event) => {
        // Store chunks for later processing
        audioChunksRef.current.push(event.data);
        
        // If in real-time mode and WebSocket is connected, send the chunks
        if (isRealTimeEnabled && webSocketRef.current && webSocketRef.current.readyState === WebSocket.OPEN) {
          // Convert blob to base64
          const reader = new FileReader();
          reader.readAsDataURL(event.data);
          reader.onloadend = () => {
            const base64data = reader.result?.toString().split(',')[1];
            if (base64data && webSocketRef.current) {
              webSocketRef.current.send(JSON.stringify({
                type: 'audio',
                audio: base64data
              }));
            }
          };
        }
      });
      
      // When recording stops, process the audio
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
        
        // Create a new audio element for playback
        const audio = new Audio(audioUrl);
        
        audio.addEventListener("ended", () => {
          setIsPlaying(false);
        });
        
        audio.addEventListener("error", (e) => {
          console.error("Audio playback error:", e);
          setIsPlaying(false);
          toast({
            variant: "destructive",
            title: "Playback Error",
            description: "Failed to play the recorded audio",
          });
        });
        
        audioRef.current = audio;
        
        // If not in real-time mode or WebSocket failed, process audio in batch mode
        if (!isRealTimeEnabled || !webSocketRef.current || webSocketRef.current.readyState !== WebSocket.OPEN) {
          await processAudio(audioBlob);
        }
      });
      
      // Start recording
      recorder.start(1000); // Collect data every second
      setDictationActive(true);
      
      return true;
    } catch (error) {
      console.error("Failed to start dictation:", error);
      setDictationStatus("Error starting dictation");
      return false;
    }
  }, [selectedSpeechEngine, setDictationActive, setOriginalText, toast, isRealTimeEnabled, initWebSocket]);

  const stopDictation = useCallback(async () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      setDictationStatus("Processing...");
      mediaRecorderRef.current.stop();
      
      // Stop all audio tracks
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      
      // Reset media recorder
      setDictationActive(false);
      setDictationStatus("Ready");
    }
  }, [setDictationActive]);

  const processAudio = useCallback(async (audioBlob: Blob) => {
    try {
      // Create form data with the audio blob
      const formData = new FormData();
      formData.append("audio", audioBlob);
      formData.append("engine", selectedSpeechEngine);
      
      // Send audio to transcription endpoint
      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.statusText}`);
      }
      
      const data = await response.json();

      // Store server-side audio URL if available
      if (data.audioUrl) {
        serverAudioUrlRef.current = data.audioUrl;
        setAudioSource("recording");
      }
      
      // Append the transcribed text to the original text
      setOriginalText((prevText: string) => {
        const newText = prevText ? `${prevText} ${data.text}` : data.text;
        return newText;
      });
      
      setDictationStatus("Transcribed");
    } catch (error) {
      console.error("Failed to process audio:", error);
      
      // Fallback to browser's speech recognition if available
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        // @ts-ignore - TypeScript doesn't know about these browser-specific APIs
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        recognition.lang = 'en-US';
        recognition.continuous = false;
        recognition.interimResults = false;
        
        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setOriginalText((prevText: string) => {
            return prevText ? `${prevText} ${transcript}` : transcript;
          });
        };
        
        recognition.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
          setDictationStatus("Failed to recognize speech");
        };
        
        recognition.start();
      } else {
        setDictationStatus("Failed to transcribe audio");
      }
    }
  }, [selectedSpeechEngine, setOriginalText]);

  // Upload an audio file for transcription
  const uploadAudio = useCallback(async (file: File) => {
    try {
      setDictationStatus("Processing uploaded audio...");
      
      // Create a form with the audio file
      const formData = new FormData();
      formData.append("audio", file);
      formData.append("engine", selectedSpeechEngine);
      
      // Send to transcription endpoint
      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Audio upload failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Store server-side audio URL if available
      if (data.audioUrl) {
        serverAudioUrlRef.current = data.audioUrl;
        
        // Create an audio element for the server audio
        const audio = new Audio(data.audioUrl);
        audio.addEventListener("ended", () => {
          setIsPlaying(false);
        });
        
        audio.addEventListener("error", (e) => {
          console.error("Audio playback error:", e);
          setIsPlaying(false);
          toast({
            variant: "destructive",
            title: "Playback Error",
            description: "Failed to play the uploaded audio",
          });
        });
        
        audioRef.current = audio;
        setHasRecordedAudio(true);
        setAudioSource("upload");
      }
      
      // Set original text from transcription
      setOriginalText(data.text);
      
      setDictationStatus("Transcribed");
      
      toast({
        title: "Audio Uploaded",
        description: "Your audio file has been successfully transcribed.",
      });
      
      return true;
    } catch (error) {
      console.error("Failed to upload audio:", error);
      setDictationStatus("Failed to process uploaded audio");
      
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: "Failed to process the uploaded audio file. Please try again.",
      });
      
      return false;
    }
  }, [selectedSpeechEngine, setOriginalText, toast]);

  // Play the recorded audio
  const playRecordedAudio = useCallback(() => {
    // First, try to play server-side audio if available
    if (serverAudioUrlRef.current && (!audioRef.current || audioSource === "upload")) {
      if (!audioRef.current) {
        const audio = new Audio(serverAudioUrlRef.current);
        
        audio.addEventListener("ended", () => {
          setIsPlaying(false);
        });
        
        audio.addEventListener("error", (e) => {
          console.error("Audio playback error:", e);
          setIsPlaying(false);
          toast({
            variant: "destructive",
            title: "Playback Error",
            description: "Failed to play the audio",
          });
        });
        
        audioRef.current = audio;
      }
    }
    // Then try local blob
    else if (!audioRef.current || !audioUrlRef.current) {
      // If there is a recorded blob but no audio element, create one
      if (recordedAudioBlobRef.current && !audioRef.current) {
        const url = URL.createObjectURL(recordedAudioBlobRef.current);
        audioUrlRef.current = url;
        
        const audio = new Audio(url);
        audio.addEventListener("ended", () => {
          setIsPlaying(false);
        });
        
        audio.addEventListener("error", (e) => {
          console.error("Audio playback error:", e);
          setIsPlaying(false);
          toast({
            variant: "destructive",
            title: "Playback Error",
            description: "Failed to play the recorded audio",
          });
        });
        
        audioRef.current = audio;
      } else {
        toast({
          variant: "destructive",
          title: "No recorded audio",
          description: "There is no recorded audio available to play. Please record some dictation first.",
        });
        return;
      }
    }

    if (isPlaying) {
      // If already playing, pause it
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    } else {
      // Play the audio
      if (audioRef.current) {
        audioRef.current.play()
          .then(() => {
            setIsPlaying(true);
          })
          .catch((error) => {
            console.error("Error playing audio:", error);
            setIsPlaying(false);
            toast({
              variant: "destructive",
              title: "Playback Error",
              description: "Failed to play the audio",
            });
          });
      }
    }
  }, [isPlaying, toast, audioSource]);

  // Download the recorded audio
  const downloadRecordedAudio = useCallback(() => {
    // Try server-side URL first if it's the primary source
    if (serverAudioUrlRef.current && audioSource === "upload") {
      // For server-side URLs, we need to fetch the audio first
      const a = document.createElement("a");
      a.href = serverAudioUrlRef.current;
      a.download = "original-audio.webm";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }
    
    // Otherwise use local blob
    if (!recordedAudioBlobRef.current) {
      toast({
        variant: "destructive",
        title: "No recorded audio",
        description: "There is no recorded audio available to download. Please record some dictation first.",
      });
      return;
    }
    
    const blob = recordedAudioBlobRef.current;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "original-dictation.webm";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [toast, audioSource]);

  return {
    startDictation,
    stopDictation,
    uploadAudio,
    dictationStatus,
    hasRecordedAudio,
    isPlaying,
    playRecordedAudio,
    downloadRecordedAudio,
    audioSource
  };
}
