import { SpeechEngine } from "@shared/schema";

/**
 * Initialize speech recognition using WebSpeech API as a fallback
 * This is used when the server-side speech recognition fails
 */
export function initializeBrowserSpeechRecognition(
  onResult: (text: string) => void,
  onError: (error: string) => void
): { start: () => void; stop: () => void } {
  // Check if the browser supports speech recognition
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    onError("Browser doesn't support speech recognition");
    return {
      start: () => {},
      stop: () => {},
    };
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();

  // Configure speech recognition
  recognition.lang = 'en-US';
  recognition.continuous = true;
  recognition.interimResults = false;

  // Set up event handlers
  recognition.onresult = (event) => {
    const transcript = event.results[event.results.length - 1][0].transcript;
    onResult(transcript);
  };

  recognition.onerror = (event) => {
    onError(`Speech recognition error: ${event.error}`);
  };

  return {
    start: () => recognition.start(),
    stop: () => recognition.stop(),
  };
}

/**
 * Create a speech recognition instance based on the selected engine
 */
export function createSpeechRecognition(
  engine: SpeechEngine,
  onResult: (text: string) => void,
  onError: (error: string) => void
): { start: () => Promise<void>; stop: () => Promise<void> } {
  // Use browser's WebSpeech API as a fallback
  const browserSpeech = initializeBrowserSpeechRecognition(onResult, onError);

  let recorder: MediaRecorder | null = null;
  let chunks: Blob[] = [];

  const start = async () => {
    try {
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Create and configure MediaRecorder
      recorder = new MediaRecorder(stream);
      chunks = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      recorder.onstop = async () => {
        try {
          const audioBlob = new Blob(chunks, { type: 'audio/webm' });
          await transcribeAudio(audioBlob, engine, onResult);
        } catch (error) {
          onError(`Transcription failed: ${error}`);
          // Fall back to browser speech recognition
          browserSpeech.start();
        }
      };
      
      recorder.start(1000); // Collect data every second
    } catch (error) {
      onError(`Failed to start recording: ${error}`);
      // Fall back to browser speech recognition
      browserSpeech.start();
    }
  };

  const stop = async () => {
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
      recorder.stream.getTracks().forEach(track => track.stop());
    }
    browserSpeech.stop();
  };

  return { start, stop };
}

/**
 * Transcribe audio using the selected speech engine via server API
 */
async function transcribeAudio(
  audioBlob: Blob,
  engine: SpeechEngine,
  onResult: (text: string) => void
): Promise<void> {
  const formData = new FormData();
  formData.append('audio', audioBlob);
  formData.append('engine', engine);

  const response = await fetch('/api/transcribe', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Transcription failed: ${response.statusText}`);
  }

  const data = await response.json();
  onResult(data.text);
}
