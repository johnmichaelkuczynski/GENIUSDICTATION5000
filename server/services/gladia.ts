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
    formData.append("audio", audioBuffer, {
      filename: "audio.webm",
      contentType: "audio/webm",
    });
    formData.append("language", "english");
    formData.append("toggle_diarization", "false");

    // Make API request to Gladia
    const response = await axios.post(
      "https://api.gladia.io/v2/transcription/",
      formData,
      {
        headers: {
          ...formData.getHeaders(),
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
