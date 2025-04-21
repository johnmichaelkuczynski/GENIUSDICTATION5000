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
    
    // Prepare form data directly with the buffer
    const formData = new FormData();
    
    // Create a Blob directly from the original audio buffer
    const file = new Blob([audioBuffer], { type: 'audio/webm' });
    
    // @ts-ignore - FormData in Node.js has a slightly different API
    formData.append('audio', file, 'audio.webm');
    formData.append('language', 'english');
    
    console.log("Sending multipart request to Gladia API with audio file");

    // Make API request to Gladia using FormData
    const response = await axios.post(
      "https://api.gladia.io/v2/transcription/",
      formData,
      {
        headers: {
          "x-gladia-key": apiKey,
          // Content-Type will be set automatically with boundary by axios when using FormData
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
