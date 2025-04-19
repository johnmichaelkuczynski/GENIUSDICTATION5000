import { useState, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { ElevenLabsVoice } from "@shared/schema";

export function useTTS() {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<ElevenLabsVoice[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const { toast } = useToast();

  // Fetch available voices from the API
  const fetchVoices = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/tts/voices");
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch voices");
      }
      
      const data = await response.json();
      setAvailableVoices(data.voices);
      
      // Set default voice if available
      if (data.voices && data.voices.length > 0) {
        setSelectedVoiceId(data.voices[0].voice_id);
      }
    } catch (error) {
      console.error("Error fetching voices:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch voices",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Generate speech from text
  const generateSpeech = useCallback(async (text: string, voiceId?: string) => {
    try {
      setIsLoading(true);
      
      // Clean up previous audio
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
      
      // Use selected voice or passed voice ID
      const selectedVoice = voiceId || selectedVoiceId;
      
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          voiceId: selectedVoice,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to generate speech (${response.status})`);
      }
      
      // Get audio as blob
      const audioBlob = await response.blob();
      
      // Create a URL for the audio blob
      const audioUrl = URL.createObjectURL(audioBlob);
      audioUrlRef.current = audioUrl;
      
      // Create audio element if it doesn't exist
      if (!audioRef.current) {
        audioRef.current = new Audio();
      }
      
      // Set up event listeners
      audioRef.current.onplay = () => setIsPlaying(true);
      audioRef.current.onpause = () => setIsPlaying(false);
      audioRef.current.onended = () => setIsPlaying(false);
      
      // Set the source and load the audio
      audioRef.current.src = audioUrl;
      await audioRef.current.load();
      
      return audioUrl;
    } catch (error) {
      console.error("Error generating speech:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate speech",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [selectedVoiceId, toast]);

  // Play generated audio
  const playAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play().catch(error => {
        console.error("Error playing audio:", error);
      });
    }
  }, []);

  // Pause playing audio
  const pauseAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, []);

  // Reset audio
  const resetAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  }, []);

  // Download audio as MP3
  const downloadAudio = useCallback((fileName: string = "narration") => {
    if (audioUrlRef.current) {
      const a = document.createElement("a");
      a.href = audioUrlRef.current;
      a.download = `${fileName}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      toast({
        title: "Error",
        description: "No audio available to download",
        variant: "destructive",
      });
    }
  }, [toast]);

  return {
    isLoading,
    isPlaying,
    availableVoices,
    selectedVoiceId,
    setSelectedVoiceId,
    fetchVoices,
    generateSpeech,
    playAudio,
    pauseAudio,
    resetAudio,
    downloadAudio
  };
}