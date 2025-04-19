/**
 * Helper functions for document processing
 */

/**
 * Extract text from a file based on its type
 * This is a client-side helper - actual processing happens on the server
 */
export async function extractTextFromFile(file: File): Promise<string> {
  try {
    const formData = new FormData();
    formData.append("document", file);
    
    const response = await fetch("/api/extract-text", {
      method: "POST",
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`Failed to extract text: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error("Error extracting text from file:", error);
    throw error;
  }
}

/**
 * Convert text to a downloadable document in the specified format
 */
export async function convertToDocument(
  text: string,
  format: "txt" | "docx" | "pdf",
  fileName: string
): Promise<Blob> {
  try {
    const response = await fetch("/api/generate-document", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text, format, fileName }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to generate document: ${response.statusText}`);
    }
    
    return await response.blob();
  } catch (error) {
    console.error("Error converting text to document:", error);
    throw error;
  }
}

/**
 * Download a blob as a file
 */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
