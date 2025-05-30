/**
 * Service for interacting with the AssemblyAI API for audio transcription
 */

interface AssemblyAITranscriptResponse {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'error';
  text?: string;
  error?: string;
}

/**
 * Transcribe audio using AssemblyAI API
 * @param audioBuffer The raw audio data as a Buffer
 * @returns Transcribed text
 */
export async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  try {
    if (!process.env.ASSEMBLYAI_API_KEY) {
      throw new Error('AssemblyAI API key is not configured');
    }

    const apiKey = process.env.ASSEMBLYAI_API_KEY;
    const baseUrl = 'https://api.assemblyai.com/v2';

    // Step 1: Upload audio file
    const uploadResponse = await fetch(`${baseUrl}/upload`, {
      method: 'POST',
      headers: {
        'authorization': apiKey,
        'content-type': 'application/octet-stream',
      },
      body: audioBuffer,
    });

    if (!uploadResponse.ok) {
      throw new Error(`Failed to upload audio: ${uploadResponse.statusText}`);
    }

    const uploadData = await uploadResponse.json();
    const audioUrl = uploadData.upload_url;

    // Step 2: Request transcription
    const transcriptResponse = await fetch(`${baseUrl}/transcript`, {
      method: 'POST',
      headers: {
        'authorization': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        audio_url: audioUrl,
        language_detection: true,
        punctuate: true,
        format_text: true,
      }),
    });

    if (!transcriptResponse.ok) {
      throw new Error(`Failed to request transcription: ${transcriptResponse.statusText}`);
    }

    const transcriptData = await transcriptResponse.json();
    const transcriptId = transcriptData.id;

    // Step 3: Poll for completion
    let transcript: AssemblyAITranscriptResponse;
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes timeout

    do {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      
      const statusResponse = await fetch(`${baseUrl}/transcript/${transcriptId}`, {
        headers: {
          'authorization': apiKey,
        },
      });

      if (!statusResponse.ok) {
        throw new Error(`Failed to check transcription status: ${statusResponse.statusText}`);
      }

      transcript = await statusResponse.json();
      attempts++;

      if (attempts >= maxAttempts) {
        throw new Error('Transcription timeout - please try again with a shorter audio file');
      }
    } while (transcript.status === 'queued' || transcript.status === 'processing');

    if (transcript.status === 'error') {
      throw new Error(`Transcription failed: ${transcript.error || 'Unknown error'}`);
    }

    return transcript.text || '';
  } catch (error) {
    console.error('AssemblyAI transcription error:', error);
    throw error;
  }
}