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
    
    // Use JSON payload as API is expecting application/json
    const payload = {
      audio: {
        data: base64Audio,
        mime_type: "audio/webm"
      },
      language: "english",
      model_size: "large" // Use large model for better accuracy
    };
    
    console.log("Sending JSON request to Gladia API");

    // Make API request to Gladia using JSON
    const response = await axios.post(
      "https://api.gladia.io/v2/transcription/",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          "x-gladia-key": apiKey,
        },
        timeout: 30000 // 30 seconds timeout for longer audio
      }
    );

    // Log the response for debugging
    console.log("Gladia API response received:", 
      response.status,
      response.data ? "with data" : "no data"
    );

    // Extract transcribed text
    if (response.data && response.data.transcription) {
      return response.data.transcription;
    } else if (response.data && response.data.prediction && response.data.prediction.transcription) {
      // Handle different response format versions
      return response.data.prediction.transcription;
    } else {
      console.error("Unexpected response format from Gladia API:", JSON.stringify(response.data));
      throw new Error("Unexpected response format from Gladia API");
    }
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      console.error("Gladia API Error Response:", error.response.status, error.response.data);
      
      if (error.response.data && error.response.data.validation_errors) {
        console.error("Validation errors:", JSON.stringify(error.response.data.validation_errors));
      }
      
      // Provide more context in the error message
      throw new Error(`Gladia API Error: ${error.response.status} ${JSON.stringify(error.response.data)}`);
    } else {
      console.error("Error transcribing with Gladia:", error);
      throw new Error(`Gladia transcription failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
