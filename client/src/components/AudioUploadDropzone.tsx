import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDictation } from "@/hooks/useDictation";
import { useToast } from "@/hooks/use-toast";

interface UploadedAudio {
  id: string;
  name: string;
  type: string;
  size: number;
  file: File;
}

const AudioUploadDropzone = () => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedAudio[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const { uploadAudio } = useDictation();

  // Handle file drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files).filter(file => {
      return file.type.startsWith('audio/');
    });
    
    if (files.length > 0) {
      handleFiles(files);
    } else {
      toast({
        variant: "destructive",
        title: "Invalid File Type",
        description: "Please upload audio files only (MP3, WAV, etc.)",
      });
    }
  };

  // Handle file selection from file dialog
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      
      // Filter for audio files
      const audioFiles = files.filter(file => file.type.startsWith('audio/'));
      
      if (audioFiles.length > 0) {
        handleFiles(audioFiles);
      } else {
        toast({
          variant: "destructive",
          title: "Invalid File Type",
          description: "Please upload audio files only (MP3, WAV, etc.)",
        });
      }
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

  // Process an audio file
  const handleProcessFile = async (file: UploadedAudio) => {
    setIsProcessing(true);
    try {
      await uploadAudio(file.file);
      toast({
        title: "Audio Processed",
        description: `"${file.name}" has been transcribed successfully.`
      });
    } catch (error) {
      console.error("Error processing audio:", error);
      toast({
        variant: "destructive",
        title: "Processing Error",
        description: "Failed to process audio. Please try again.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Set up drag and drop event listeners
  useEffect(() => {
    const dropzone = document.getElementById('audio-dropzone');
    
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
          <h2 className="text-lg font-medium mb-4">Audio File Upload</h2>
          
          {/* File Dropzone */}
          <div 
            id="audio-dropzone" 
            className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition ${
              isDragging ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent/5'
            }`}
            onDrop={handleDrop}
            onClick={() => document.getElementById('audio-file-upload')?.click()}
          >
            <i className="ri-upload-cloud-2-line text-4xl text-muted-foreground mb-2"></i>
            <p className="text-sm text-muted-foreground mb-1">Drag and drop audio files here, or click to browse</p>
            <p className="text-xs text-muted-foreground">Supports MP3, WAV, and other audio formats</p>
            <input 
              id="audio-file-upload" 
              type="file" 
              className="hidden" 
              accept="audio/*" 
              multiple 
              onChange={handleFileSelect}
            />
          </div>
          
          {/* File List */}
          {uploadedFiles.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium mb-2">Uploaded Audio Files</h3>
              <ul className="divide-y divide-border">
                {uploadedFiles.map(file => (
                  <li key={file.id} className="py-3 flex justify-between items-center">
                    <div className="flex items-center">
                      <i className="ri-music-line text-primary mr-2"></i>
                      <span className="text-sm">{file.name}</span>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleProcessFile(file)}
                        disabled={isProcessing}
                      >
                        {isProcessing ? (
                          <span className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></span>
                        ) : (
                          <i className="ri-edit-line"></i>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:text-red-500"
                        onClick={() => handleDeleteFile(file.id)}
                        disabled={isProcessing}
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

export default AudioUploadDropzone;