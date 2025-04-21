import axios from "axios";

/**
 * Transcribe audio using Gladia API
 * @param audioBuffer The raw audio data as a Buffer
 * @returns Transcribed text
 */
export async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  try {
    const apiKey = process.env.GLADIA_API_KEY;
    
    if (!apiKey) {
      throw new Error("Gladia API key not found");
    }
    
    // Convert audio buffer to base64
    const base64Audio = audioBuffer.toString('base64');
    
    // Create JSON payload for the API request (Using the updated API format)
    const payload = {
      audio: {
        data: base64Audio,
        type: "audio/webm"
      },
      language_behavior: "automatic single language",
      language: "english",
      toggle_diarization: false
    };

    // Make API request to Gladia
    const response = await axios.post(
      "https://api.gladia.io/v2/transcription/",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          "x-gladia-key": apiKey,
        },
      }
    );

    // Extract transcribed text
    if (response.data && response.data.transcription) {
      return response.data.transcription;
    } else {
      throw new Error("Unexpected response format from Gladia API");
    }
  } catch (error) {
    console.error("Error transcribing with Gladia:", error);
    throw new Error(`Gladia transcription failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
