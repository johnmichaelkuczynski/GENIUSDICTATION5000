import { useState, useCallback, useRef } from "react";
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

  // Store a reference to the current dictation session
  let mediaRecorder: MediaRecorder | null = null;
  let audioChunks: Blob[] = [];
  
  // References for audio playback
  const recordedAudioBlobRef = useRef<Blob | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  const startDictation = useCallback(async () => {
    try {
      setDictationStatus("Listening...");
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Create a media recorder
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];
      
      // Listen for data chunks
      mediaRecorder.addEventListener("dataavailable", (event) => {
        audioChunks.push(event.data);
      });
      
      // When recording stops, process the audio
      mediaRecorder.addEventListener("stop", async () => {
        const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
        
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
        
        await processAudio(audioBlob);
      });
      
      // Start recording
      mediaRecorder.start(1000); // Collect data every second
      setDictationActive(true);
      
      return true;
    } catch (error) {
      console.error("Failed to start dictation:", error);
      setDictationStatus("Error starting dictation");
      return false;
    }
  }, [selectedSpeechEngine, setDictationActive, setOriginalText]);

  const stopDictation = useCallback(async () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      setDictationStatus("Processing...");
      mediaRecorder.stop();
      
      // Stop all audio tracks
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
      
      // Reset media recorder
      mediaRecorder = null;
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
      
      // Append the transcribed text to the original text
      setOriginalText(prevText => {
        const newText = prevText ? `${prevText} ${data.text}` : data.text;
        return newText;
      });
      
      setDictationStatus("Transcribed");
    } catch (error) {
      console.error("Failed to process audio:", error);
      
      // Fallback to browser's speech recognition if available
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        recognition.lang = 'en-US';
        recognition.continuous = false;
        recognition.interimResults = false;
        
        recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          setOriginalText(prevText => prevText ? `${prevText} ${transcript}` : transcript);
        };
        
        recognition.onerror = (event) => {
          console.error("Speech recognition error:", event.error);
          setDictationStatus("Failed to recognize speech");
        };
        
        recognition.start();
      } else {
        setDictationStatus("Failed to transcribe audio");
      }
    }
  }, [selectedSpeechEngine, setOriginalText]);

  // Play the recorded audio
  const playRecordedAudio = useCallback(() => {
    if (!audioUrlRef.current) {
      toast({
        variant: "destructive",
        title: "No recorded audio",
        description: "There is no recorded audio available to play",
      });
      return;
    }

    if (isPlaying) {
      // If already playing, pause it
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    } else {
      // Create a new audio element if not exists
      if (!audioRef.current) {
        const audio = new Audio(audioUrlRef.current);
        
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
      }
      
      // Play the audio
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
  }, [isPlaying, toast]);

  // Download the recorded audio
  const downloadRecordedAudio = useCallback(() => {
    if (!recordedAudioBlobRef.current) {
      toast({
        variant: "destructive",
        title: "No recorded audio",
        description: "There is no recorded audio available to download",
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
