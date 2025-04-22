import { useState, useCallback, useRef, useEffect } from "react";
import { useAppContext } from "@/context/AppContext";
import { SpeechEngine } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useDictation() {
  const { toast } = useToast();
  const [dictationStatus, setDictationStatus] = useState("Ready");
  const [hasRecordedAudio, setHasRecordedAudio] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const { 
    setOriginalText, 
    originalText, 
    selectedSpeechEngine,
    setDictationActive
  } = useAppContext();

  // Store a reference to the current dictation session using refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  // References for audio playback
  const recordedAudioBlobRef = useRef<Blob | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  
  // WebSocket references
  const wsRef = useRef<WebSocket | null>(null);
  const wsOpenRef = useRef<boolean>(false);
  const tempTextRef = useRef<string>('');

  // Check for existing audio on mount
  useEffect(() => {
    if (recordedAudioBlobRef.current) {
      setHasRecordedAudio(true);
    }
    
    // Clean up WebSocket on unmount
    return () => {
      if (wsRef.current && wsOpenRef.current) {
        wsRef.current.close();
        wsRef.current = null;
        wsOpenRef.current = false;
      }
    };
  }, []);
  
  // Process audio using server-side API
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
      
      // Append the transcribed text to the original text
      const newText = originalText ? `${originalText} ${data.text}` : data.text;
      setOriginalText(newText);
      
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
          const newText = originalText ? `${originalText} ${transcript}` : transcript;
          setOriginalText(newText);
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
  }, [selectedSpeechEngine, setOriginalText, originalText]);
  
  // Initialize the WebSocket connection for real-time transcription
  const initWebSocket = useCallback(() => {
    if (wsRef.current) {
      // Close any existing connection
      wsRef.current.close();
      wsRef.current = null;
    }
    
    // Determine WebSocket URL based on current protocol and host
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    // Create new WebSocket
    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;
    
    socket.onopen = () => {
      console.log("WebSocket connection established");
      wsOpenRef.current = true;
      
      // Send initialization message with selected engine
      socket.send(JSON.stringify({
        type: 'start_transcription',
        engine: selectedSpeechEngine,
        useBrowserRecognition: false
      }));
    };
    
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Handle different message types
        switch (data.type) {
          case 'transcription_result':
            if (data.text && data.text.trim()) {
              // Update the text in real-time
              if (data.isFinal) {
                // For final results, append to the original text
                const newText = originalText 
                  ? `${originalText}${tempTextRef.current ? ' ' + tempTextRef.current : ''} ${data.text}` 
                  : data.text;
                
                setOriginalText(newText);
                tempTextRef.current = ''; // Clear the temporary text
              } else {
                // For interim results, store in the temp ref
                tempTextRef.current = data.text;
              }
            }
            break;
            
          case 'error':
            console.error("WebSocket error:", data.message);
            // Only show errors if we're actively dictating
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
              toast({
                variant: "destructive",
                title: "Transcription Error",
                description: data.message || "An error occurred during transcription"
              });
            }
            break;
            
          case 'status':
            // We could update the UI with status messages if needed
            console.log("WebSocket status:", data.message);
            break;
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };
    
    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
      wsOpenRef.current = false;
      
      toast({
        variant: "destructive",
        title: "Connection Error",
        description: "Failed to connect to transcription service"
      });
      
      // Fall back to non-realtime transcription
      setDictationStatus("Using fallback transcription");
    };
    
    socket.onclose = () => {
      console.log("WebSocket connection closed");
      wsOpenRef.current = false;
    };
  }, [selectedSpeechEngine, originalText, setOriginalText, toast]);

  // Set up browser's native speech recognition for real-time fallback
  const setupBrowserRecognition = useCallback(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      // @ts-ignore - TypeScript doesn't know about these browser-specific APIs
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.lang = 'en-US';
      recognition.continuous = true;
      recognition.interimResults = true;
      
      recognition.onresult = (event: any) => {
        // Get the transcript from the most recent result
        const currentIndex = event.results.length - 1;
        const transcript = event.results[currentIndex][0].transcript;
        
        // Check if the result is final
        const isFinal = event.results[currentIndex].isFinal;
        
        if (isFinal) {
          // For final results, append to the original text
          const newText = originalText ? `${originalText} ${transcript}` : transcript;
          setOriginalText(newText);
          tempTextRef.current = ''; // Clear the temporary text
        } else {
          // For interim results, update the status
          setDictationStatus(`Listening: ${transcript}`);
          tempTextRef.current = transcript;
        }
      };
      
      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setDictationStatus("Recognition error: " + event.error);
      };
      
      recognition.onend = () => {
        // If we're still supposed to be recording, restart the recognition
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
          recognition.start();
        } else {
          setDictationStatus("Ready");
        }
      };
      
      return recognition;
    }
    
    return null;
  }, [originalText, setOriginalText]);

  const startDictation = useCallback(async () => {
    try {
      setDictationStatus("Listening...");
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Initialize WebSocket for real-time transcription
      initWebSocket();
      
      // Create a media recorder
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      
      // Listen for data chunks
      recorder.addEventListener("dataavailable", (event) => {
        audioChunksRef.current.push(event.data);
        
        // If WebSocket is open, send the audio chunk for real-time transcription
        if (wsRef.current && wsOpenRef.current) {
          // Convert blob to base64
          const reader = new FileReader();
          reader.readAsDataURL(event.data);
          reader.onloadend = () => {
            const base64data = reader.result?.toString().split(',')[1];
            if (base64data && wsRef.current) {
              wsRef.current.send(JSON.stringify({
                type: 'audio_data',
                audioChunk: base64data
              }));
            }
          };
        } else {
          // If WebSocket is not available, use browser's native speech recognition
          // This will be handled by the setupBrowserRecognition function
        }
      });
      
      // When recording stops, process the complete audio
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
        
        // No need to process the full audio again if we've been doing real-time
        // transcription, but we'll keep this as a fallback
        if (!wsOpenRef.current) {
          await processAudio(audioBlob);
        } else if (wsRef.current) {
          // Notify the server that we're done
          wsRef.current.send(JSON.stringify({
            type: 'stop_transcription'
          }));
        }
      });
      
      // Use browser's native speech recognition as a backup for real-time transcription
      let browserRecognition = null;
      if (!wsOpenRef.current) {
        browserRecognition = setupBrowserRecognition();
        if (browserRecognition) {
          browserRecognition.start();
        }
      }
      
      // Start recording
      recorder.start(1000); // Collect data every second
      setDictationActive(true);
      
      return true;
    } catch (error) {
      console.error("Failed to start dictation:", error);
      setDictationStatus("Error starting dictation");
      return false;
    }
  }, [selectedSpeechEngine, setDictationActive, setOriginalText, toast, initWebSocket, setupBrowserRecognition, processAudio]);

  const stopDictation = useCallback(async () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      setDictationStatus("Processing...");
      mediaRecorderRef.current.stop();
      
      // Stop all audio tracks
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      
      // Reset media recorder
      setDictationActive(false);
      
      // Close WebSocket connection if open
      if (wsRef.current && wsOpenRef.current) {
        try {
          wsRef.current.send(JSON.stringify({
            type: 'stop_transcription'
          }));
          
          // Don't close immediately to allow final messages to be received
          setTimeout(() => {
            if (wsRef.current) {
              wsRef.current.close();
              wsRef.current = null;
              wsOpenRef.current = false;
            }
          }, 1000);
        } catch (error) {
          console.error("Error closing WebSocket:", error);
        }
      }
      
      // If we have temporary text that wasn't finalized, add it now
      if (tempTextRef.current) {
        const newText = originalText ? `${originalText} ${tempTextRef.current}` : tempTextRef.current;
        setOriginalText(newText);
        tempTextRef.current = '';
      }
      
      setDictationStatus("Ready");
    }
  }, [setDictationActive, originalText, setOriginalText]);

  // Play the recorded audio
  const playRecordedAudio = useCallback(() => {
    if (!audioRef.current || !audioUrlRef.current) {
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
  }, [isPlaying, toast]);

  // Download the recorded audio
  const downloadRecordedAudio = useCallback(() => {
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