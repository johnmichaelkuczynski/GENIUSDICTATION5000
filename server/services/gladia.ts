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
      audio_file_format: "webm", // Required field with the correct audio format
      audio: {
        data: base64Audio,
      },
      language_behavior: "automatic single language",
      language: "english",
      toggle_diarization: false,
      output_format: "json", // Ensure we get JSON formatted results
      enable_direct_translation: false
    };

    console.log("Sending request to Gladia API with parameters:", JSON.stringify({
      audio_file_format: payload.audio_file_format, 
      language: payload.language,
      language_behavior: payload.language_behavior,
      toggle_diarization: payload.toggle_diarization,
      output_format: payload.output_format,
      audio_data_length: base64Audio.length
    }));

    // Make API request to Gladia
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
