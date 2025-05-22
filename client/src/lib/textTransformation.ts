import { AIModel } from "@shared/schema";

interface TransformOptions {
  text: string;
  instructions: string;
  model: AIModel;
  preset?: string;
  useStyleReference?: boolean;
  styleReferences?: any[];
  useContentReference?: boolean;
  contentReferences?: any[];
  onProgress?: (current: number, total: number) => void;
}

// Size of chunks in characters for large document processing
const CHUNK_SIZE = 8000; // ~2000 words per chunk

/**
 * Split text into chunks of approximately equal size
 * This attempts to split on paragraph or sentence boundaries when possible
 */
function splitIntoChunks(text: string, chunkSize: number = CHUNK_SIZE): string[] {
  // If text is small enough, don't chunk it
  if (text.length <= chunkSize) {
    return [text];
  }

  const chunks: string[] = [];
  let currentPosition = 0;

  while (currentPosition < text.length) {
    // Try to find a paragraph break near the chunk size
    let endPosition = Math.min(currentPosition + chunkSize, text.length);
    
    // If we're not at the end of the text yet, try to find a good break point
    if (endPosition < text.length) {
      // Look for paragraph breaks first (preferable)
      const paragraphBreak = text.lastIndexOf('\n\n', endPosition);
      if (paragraphBreak > currentPosition && (endPosition - paragraphBreak) < chunkSize / 3) {
        endPosition = paragraphBreak + 2; // Include the newlines
      } else {
        // Try to find a sentence break (period followed by space)
        const sentenceBreak = text.lastIndexOf('. ', endPosition);
        if (sentenceBreak > currentPosition && (endPosition - sentenceBreak) < chunkSize / 4) {
          endPosition = sentenceBreak + 2; // Include the period and space
        } else {
          // Last resort: find the nearest space
          const spaceBreak = text.lastIndexOf(' ', endPosition);
          if (spaceBreak > currentPosition) {
            endPosition = spaceBreak + 1; // Include the space
          }
        }
      }
    }
    
    // Add the chunk
    chunks.push(text.substring(currentPosition, endPosition));
    currentPosition = endPosition;
  }
  
  return chunks;
}

/**
 * Transform text using the server API
 * If text is large, it splits it into chunks, processes each chunk,
 * and then combines the results
 */
export async function transformText(options: TransformOptions): Promise<string> {
  try {
    const { text, instructions, model, preset } = options;
    
    // For large texts, split into chunks
    if (text.length > CHUNK_SIZE) {
      console.log(`Text is large (${text.length} chars), splitting into chunks...`);
      const chunks = splitIntoChunks(text);
      console.log(`Split into ${chunks.length} chunks`);
      
      // Process each chunk with context
      let processedText = "";
      let chunkNum = 1;
      const totalChunks = chunks.length;
      
      for (const chunk of chunks) {
        // Call progress callback if provided
        if (options.onProgress) {
          options.onProgress(chunkNum, totalChunks);
        }
        
        // Modify instructions for context when processing chunks
        const chunkInstructions = `${instructions}\n\nThis is part ${chunkNum} of ${totalChunks} from a larger document. Maintain consistent style and formatting across all parts.`;
        
        console.log(`Processing chunk ${chunkNum} of ${totalChunks} (${chunk.length} chars)`);
        
        // Try multiple times in case of errors
        let retryCount = 0;
        const maxRetries = 2;
        let success = false;
        let chunkData;
        
        while (!success && retryCount <= maxRetries) {
          try {
            // Process this chunk
            const chunkResponse = await fetch("/api/transform", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                ...options,
                text: chunk,
                instructions: chunkInstructions,
              }),
            });
    
            if (!chunkResponse.ok) {
              // If it's a 413 error (payload too large), try splitting the chunk further
              if (chunkResponse.status === 413 && chunk.length > CHUNK_SIZE / 2) {
                console.log(`Chunk ${chunkNum} too large (${chunk.length} chars), splitting further...`);
                const subChunks = splitIntoChunks(chunk, CHUNK_SIZE / 2);
                let subChunkText = "";
                
                for (let i = 0; i < subChunks.length; i++) {
                  const subChunk = subChunks[i];
                  const subChunkResponse = await fetch("/api/transform", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      ...options,
                      text: subChunk,
                      instructions: `${chunkInstructions}\n\nThis is sub-part ${i+1} of ${subChunks.length} of chunk ${chunkNum}.`,
                    }),
                  });
                  
                  if (!subChunkResponse.ok) {
                    throw new Error(`Sub-chunk transformation failed: ${subChunkResponse.statusText}`);
                  }
                  
                  const subChunkData = await subChunkResponse.json();
                  subChunkText += subChunkData.text;
                  
                  if (i < subChunks.length - 1) {
                    subChunkText += "\n\n";
                  }
                }
                
                chunkData = { text: subChunkText };
                success = true;
              } else {
                throw new Error(`Transformation of chunk ${chunkNum} failed: ${chunkResponse.statusText}`);
              }
            } else {
              chunkData = await chunkResponse.json();
              success = true;
            }
          } catch (error) {
            retryCount++;
            console.error(`Error processing chunk ${chunkNum}, attempt ${retryCount}:`, error);
            
            if (retryCount > maxRetries) {
              throw error;
            }
            
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        
        processedText += chunkData.text;
        
        // Add a separator between chunks if not at the end
        if (chunkNum < totalChunks) {
          processedText += "\n\n";
        }
        
        chunkNum++;
      }
      
      // Call progress callback for completion if provided
      if (options.onProgress) {
        options.onProgress(totalChunks, totalChunks);
      }
      
      return processedText;
    } else {
      // For smaller texts, process normally
      const response = await fetch("/api/transform", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(options),
      });

      if (!response.ok) {
        throw new Error(`Transformation failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.text;
    }
  } catch (error) {
    console.error("Text transformation error:", error);
    throw error;
  }
}

/**
 * Get predefined preset instructions
 */
export function getPresetInstructions(preset: string): string {
  const presets: Record<string, string> = {
    Academic: "Rewrite in a formal academic style with proper citations, theoretical frameworks, and scholarly tone. Use precise terminology and maintain a third-person perspective.",
    Professional: "Transform into clear, concise professional writing suitable for business communication. Use direct language, remove unnecessary words, and organize with bullet points when appropriate.",
    Creative: "Rewrite with vivid imagery, varied sentence structure, and engaging narrative elements. Add metaphors and descriptive language to create a more immersive experience.",
    Concise: "Make the text as brief as possible while preserving all key information. Aim for at least 50% reduction in length without losing essential content.",
    Elaborate: "Expand on the ideas in the text, adding depth, examples, and explanations. Develop arguments more fully and explore implications of the statements.",
    Custom: "", // Custom preset has no default instructions
  };

  return presets[preset] || "";
}
