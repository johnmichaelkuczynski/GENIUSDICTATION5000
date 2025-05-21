/**
 * Service for interacting with the Azure Speech API to generate text-to-speech
 */

import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

/**
 * Generate speech audio from text using Azure Speech API
 * @param text The text to convert to speech
 * @returns Buffer containing the audio data
 */
export async function generateSpeech(text: string): Promise<Buffer> {
  try {
    const apiKey = process.env.AZURE_SPEECH_KEY;
    const endpoint = process.env.AZURE_SPEECH_ENDPOINT;
    
    if (!apiKey || !endpoint) {
      throw new Error('Azure Speech credentials are not configured');
    }

    // For Azure Speech, we need to get an access token first
    const tokenUrl = `${endpoint}/sts/v1.0/issuetoken`;
    const tokenResponse = await axios.post(
      tokenUrl,
      {},
      {
        headers: {
          'Ocp-Apim-Subscription-Key': apiKey,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    const accessToken = tokenResponse.data;
    
    // Now we can make the actual TTS request
    const ttsEndpoint = `${endpoint}/cognitiveservices/v1`;
    const requestId = uuidv4();
    
    const ssml = `
      <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
        <voice name="en-US-JennyNeural">
          ${text}
        </voice>
      </speak>
    `;
    
    const ttsResponse = await axios.post(
      ttsEndpoint,
      ssml,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
          'User-Agent': 'TextToSpeechApp',
          'X-RequestId': requestId
        },
        responseType: 'arraybuffer'
      }
    );
    
    return Buffer.from(ttsResponse.data);
  } catch (error) {
    console.error('Error generating speech with Azure Speech:', error);
    throw error;
  }
}

/**
 * Get a list of available voices from Azure Speech
 * This is a simplified implementation that returns a few predefined voices
 */
export async function getAvailableVoices() {
  // For simplicity, we're hardcoding a few common voices
  // In a production app, you would call the Azure API to get the complete list
  return [
    { voice_id: 'en-US-JennyNeural', name: 'Jenny (Female)' },
    { voice_id: 'en-US-GuyNeural', name: 'Guy (Male)' },
    { voice_id: 'en-US-AriaNeural', name: 'Aria (Female)' },
    { voice_id: 'en-GB-SoniaNeural', name: 'Sonia (British Female)' }
  ];
}