import axios from "axios";

/**
 * Transcribe audio using Deepgram API
 * @param audioBuffer The raw audio data as a Buffer
 * @returns Transcribed text
 */
export async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  try {
    const apiKey = process.env.DEEPGRAM_API_KEY;
    
    if (!apiKey) {
      throw new Error("Deepgram API key not found");
    }
    
    // Make API request to Deepgram
    const response = await axios.post(
      "https://api.deepgram.com/v1/listen?model=nova-2&language=en&smart_format=true",
      audioBuffer,
      {
        headers: {
          "Content-Type": "audio/webm",
          "Authorization": `Token ${apiKey}`,
        },
      }
    );

    // Extract transcribed text
    if (response.data && response.data.results && response.data.results.channels && response.data.results.channels.length > 0) {
      const transcript = response.data.results.channels[0].alternatives[0].transcript;
      return transcript || "";
    } else {
      throw new Error("Unexpected response format from Deepgram API");
    }
  } catch (error) {
    console.error("Error transcribing with Deepgram:", error);
    throw new Error(`Deepgram transcription failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
