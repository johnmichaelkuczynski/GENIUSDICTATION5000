import { useState, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ElevenLabsVoice } from '@shared/schema';

/**
 * Hook for handling text-to-speech functionality
 */
export function useTTS() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<ElevenLabsVoice[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('');
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  /**
   * Fetch available ElevenLabs voices
   */
  const fetchVoices = useCallback(async () => {
    try {
      const response = await fetch('/api/tts/voices');
      
      // Handle various error scenarios
      if (!response.ok) {
        // Try to parse the error message from the response
        let errorMessage = 'Failed to fetch voices';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          // If we can't parse JSON, try to get the text response
          try {
            const errorText = await response.text();
            errorMessage = errorText || errorMessage;
          } catch {
            // If all else fails, use the status text
            errorMessage = response.statusText || errorMessage;
          }
        }
        
        // Special case for missing ElevenLabs API key
        if (errorMessage.includes('ElevenLabs API key is not configured') || 
            response.status === 400) {
          throw new Error('ElevenLabs API key is required for text-to-speech. Please add it in Settings.');
        }
        
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      setAvailableVoices(data.voices || []);
      
      // Set Charlie as the default voice if available, otherwise use the first voice
      if (data.voices?.length > 0 && !selectedVoiceId) {
        // Look for a voice named "Charlie"
        const charlieVoice = data.voices.find((voice: ElevenLabsVoice) => voice.name.toLowerCase() === "charlie");
        
        if (charlieVoice) {
          setSelectedVoiceId(charlieVoice.voice_id);
          console.log("Charlie voice set as default:", charlieVoice);
        } else {
          setSelectedVoiceId(data.voices[0].voice_id);
          console.log("Charlie voice not found, using default:", data.voices[0].name);
        }
      }
    } catch (error) {
      console.error('Error fetching voices:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to fetch voices',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      
      // Set empty voices array to prevent further errors
      setAvailableVoices([]);
    }
  }, [toast, selectedVoiceId]);

  /**
   * Generate speech from text
   */
  const generateSpeech = useCallback(async (text: string, voiceId?: string) => {
    if (!text) return;
    
    setIsLoading(true);
    
    try {
      // Clean up previous audio if any
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
      
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          voiceId: voiceId || selectedVoiceId,
        }),
      });
      
      if (!response.ok) {
        // Try to parse the error message from the response
        let errorMessage = 'Failed to generate speech';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          // If we can't parse JSON, try to get the text response
          try {
            const errorText = await response.text();
            errorMessage = errorText || errorMessage;
          } catch {
            // If all else fails, use the status text
            errorMessage = response.statusText || errorMessage;
          }
        }
        
        // Special case for missing ElevenLabs API key
        if (errorMessage.includes('ElevenLabs API key is not configured') || 
            response.status === 400) {
          throw new Error('ElevenLabs API key is required for text-to-speech. Please add it in Settings.');
        }
        
        throw new Error(errorMessage);
      }
      
      // Create audio object from blob
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Create and store audio element
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audioUrlRef.current = audioUrl;
      
      // Add event listeners
      audio.addEventListener('ended', () => {
        setIsPlaying(false);
      });
      
      audio.addEventListener('error', (e) => {
        console.error('Audio playback error:', e);
        setIsPlaying(false);
        toast({
          variant: 'destructive',
          title: 'Playback Error',
          description: 'Failed to play the generated audio',
        });
      });
      
      return audio;
    } catch (error) {
      console.error('Error generating speech:', error);
      toast({
        variant: 'destructive',
        title: 'Speech Generation Failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast, selectedVoiceId]);

  /**
   * Play the generated audio
   */
  const playAudio = useCallback(() => {
    if (!audioRef.current) return;
    
    audioRef.current.play()
      .then(() => {
        setIsPlaying(true);
      })
      .catch((error) => {
        console.error('Error playing audio:', error);
        setIsPlaying(false);
        toast({
          variant: 'destructive',
          title: 'Playback Error',
          description: 'Failed to play the audio',
        });
      });
  }, [toast]);

  /**
   * Pause the playing audio
   */
  const pauseAudio = useCallback(() => {
    if (!audioRef.current) return;
    
    audioRef.current.pause();
    setIsPlaying(false);
  }, []);

  /**
   * Reset audio playback to the beginning
   */
  const resetAudio = useCallback(() => {
    if (!audioRef.current) return;
    
    audioRef.current.currentTime = 0;
    setIsPlaying(false);
  }, []);

  /**
   * Download the generated audio
   */
  const downloadAudio = useCallback((fileName: string = 'audio') => {
    if (!audioUrlRef.current) {
      toast({
        variant: 'destructive',
        title: 'Download Failed',
        description: 'No audio available to download',
      });
      return;
    }
    
    const a = document.createElement('a');
    a.href = audioUrlRef.current;
    a.download = `${fileName}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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
    downloadAudio,
  };
}