import { useCallback } from "react";

export function useDocumentProcessor() {
  // Process a document file and extract its text content
  const processDocument = useCallback(async (file: File): Promise<string> => {
    try {
      const formData = new FormData();
      formData.append("document", file);
      
      const response = await fetch("/api/extract-text", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Failed to process document: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.text;
    } catch (error) {
      console.error("Error processing document:", error);
      throw error;
    }
  }, []);

  // Download a document with the transformed text
  const downloadDocument = useCallback(async (text: string, format: 'txt' | 'docx' | 'pdf', fileName: string): Promise<void> => {
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
      
      // Get the blob and create a download link
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generating document:", error);
      throw error;
    }
  }, []);

  return {
    processDocument,
    downloadDocument,
  };
}
