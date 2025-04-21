import axios from "axios";
import FormData from "form-data";

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
    
    // Create form data for the API request
    const formData = new FormData();
    
    // Append the audio file
    formData.append("audio", audioBuffer, {
      filename: "audio.webm",
      contentType: "audio/webm",
    });
    
    // API v2 requires these parameters
    const config = {
      headers: {
        "x-gladia-key": apiKey,
        "Content-Type": "multipart/form-data",
      },
      params: {
        language_behaviour: "automatic single language",
        language: "english",
        toggle_diarization: false
      }
    };

    // Make API request to Gladia
    const response = await axios.post(
      "https://api.gladia.io/v2/transcription/",
      formData,
      config
    );

    // Extract transcribed text
    if (response.data && response.data.prediction && response.data.prediction.transcription) {
      return response.data.prediction.transcription;
    } else if (response.data && response.data.transcription) {
      return response.data.transcription;
    } else {
      console.error("Unexpected Gladia response:", JSON.stringify(response.data));
      throw new Error("Unexpected response format from Gladia API");
    }
  } catch (error) {
    console.error("Error transcribing with Gladia:", error);
    // Use fallback engines in routes.ts instead of failing here
    throw new Error(`Gladia transcription failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
