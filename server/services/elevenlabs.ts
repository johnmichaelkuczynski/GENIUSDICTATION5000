/**
 * Service for interacting with the ElevenLabs API to generate text-to-speech
 */

import axios from 'axios';
import { ElevenLabsVoice } from '@shared/schema';

const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1';

/**
 * Get a list of available voices from ElevenLabs
 * @returns Array of available voices
 */
export async function getAvailableVoices(): Promise<ElevenLabsVoice[]> {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      throw new Error('ELEVENLABS_API_KEY is not defined');
    }

    const response = await axios.get(`${ELEVENLABS_API_BASE}/voices`, {
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
    });

    return response.data.voices;
  } catch (error) {
    console.error('Error fetching ElevenLabs voices:', error);
    throw error;
  }
}

/**
 * Generate speech audio from text using ElevenLabs TTS API
 * @param text The text to convert to speech
 * @param voiceId The ID of the voice to use (optional - will use default if not provided)
 * @returns Buffer containing the audio data
 */
export async function generateSpeech(text: string, voiceId?: string): Promise<Buffer> {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      throw new Error('ELEVENLABS_API_KEY is not defined');
    }

    // Use default voice if none provided (Rachel - a natural sounding voice)
    const voice = voiceId || '21m00Tcm4TlvDq8ikWAM';

    const response = await axios.post(
      `${ELEVENLABS_API_BASE}/text-to-speech/${voice}`,
      {
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      },
      {
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        responseType: 'arraybuffer',
      }
    );

    return Buffer.from(response.data);
  } catch (error) {
    console.error('Error generating speech with ElevenLabs:', error);
    throw error;
  }
}