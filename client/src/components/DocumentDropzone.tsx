import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDocumentProcessor } from "@/hooks/useDocumentProcessor";
import { useAppContext } from "@/context/AppContext";

interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  file: File;
}

const DocumentDropzone = () => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const { processDocument } = useDocumentProcessor();
  const { setOriginalText } = useAppContext();

  // Handle file drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files).filter(file => {
      const fileType = file.type;
      return fileType === 'application/pdf' || 
             fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
             fileType === 'text/plain';
    });
    
    if (files.length > 0) {
      handleFiles(files);
    }
  };

  // Handle file selection from file dialog
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      handleFiles(files);
    }
  };

  // Process selected files
  const handleFiles = (files: File[]) => {
    const newFiles = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      type: file.type,
      size: file.size,
      file
    }));
    
    setUploadedFiles(prev => [...prev, ...newFiles]);
    
    // Process the first file automatically
    if (newFiles.length > 0) {
      handleProcessFile(newFiles[0]);
    }
  };

  // Delete a file
  const handleDeleteFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== id));
  };

  // Process a file
  const handleProcessFile = async (file: UploadedFile) => {
    try {
      const text = await processDocument(file.file);
      setOriginalText(text);
    } catch (error) {
      console.error("Error processing document:", error);
    }
  };

  // Set up drag and drop event listeners
  useEffect(() => {
    const dropzone = document.getElementById('document-dropzone');
    
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    };
    
    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
    };
    
    if (dropzone) {
      dropzone.addEventListener('dragover', handleDragOver);
      dropzone.addEventListener('dragleave', handleDragLeave);
      
      return () => {
        dropzone.removeEventListener('dragover', handleDragOver);
        dropzone.removeEventListener('dragleave', handleDragLeave);
      };
    }
  }, []);

  return (
    <section className="mb-8">
      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-medium mb-4">Document Processing</h2>
          
          {/* File Dropzone */}
          <div 
            id="document-dropzone" 
            className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition ${
              isDragging ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent/5'
            }`}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-upload')?.click()}
          >
            <i className="ri-upload-cloud-2-line text-4xl text-muted-foreground mb-2"></i>
            <p className="text-sm text-muted-foreground mb-1">Drag and drop files here, or click to browse</p>
            <p className="text-xs text-muted-foreground">Supports PDF, DOCX, and TXT files</p>
            <input 
              id="file-upload" 
              type="file" 
              className="hidden" 
              accept=".pdf,.docx,.txt" 
              multiple 
              onChange={handleFileSelect}
            />
          </div>
          
          {/* File List */}
          {uploadedFiles.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium mb-2">Uploaded Files</h3>
              <ul className="divide-y divide-border">
                {uploadedFiles.map(file => (
                  <li key={file.id} className="py-3 flex justify-between items-center">
                    <div className="flex items-center">
                      <i className={`ri-file-${
                        file.type.includes('pdf') ? 'pdf' : file.type.includes('word') ? 'word' : 'text'
                      }-line text-primary mr-2`}></i>
                      <span className="text-sm">{file.name}</span>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleProcessFile(file)}
                      >
                        <i className="ri-edit-line"></i>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:text-red-500"
                        onClick={() => handleDeleteFile(file.id)}
                      >
                        <i className="ri-delete-bin-line"></i>
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
};

export default DocumentDropzone;
