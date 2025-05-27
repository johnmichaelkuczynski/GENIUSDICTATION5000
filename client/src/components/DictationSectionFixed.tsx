import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SpeechEngine, AIModel } from "@shared/schema";
import { useAppContext } from "@/context/AppContext";
import { useTransformation } from "@/hooks/useTransformationEnhanced";
import { useDictationSimple } from "@/hooks/useDictationSimple";
import { useTTS } from "@/hooks/useTTS";
import { useDocumentProcessor } from "@/hooks/useDocumentProcessor";
import { useAIDetection } from "@/hooks/useAIDetection";
import { CleanTextDisplay } from "@/components/CleanTextDisplay";
import { removeMarkdownFormatting } from "@/lib/textCleaner";
import { AIDetectionIndicator } from "@/components/AIDetectionIndicator";
import { TextAssessmentDialog } from "@/components/TextAssessmentDialog";
import { ManualAssessmentDialog } from "@/components/ManualAssessmentDialog";
import { AssessmentModelSelector, AssessmentModel } from "@/components/AssessmentModelSelector";
import { ScreenshotUpload } from "@/components/ScreenshotUpload";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Helper function to count words in a string
const countWords = (text: string): number => {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
};

const DictationSection = () => {
  const {
    originalText,
    setOriginalText,
    processedText,
    setProcessedText,
    customInstructions,
    setCustomInstructions,
    useStyleReference,
    setUseStyleReference,
    useContentReference,
    setUseContentReference,
    selectedSpeechEngine,
    setSelectedSpeechEngine,
    selectedAIModel,
    setSelectedAIModel,
    dictationActive,
    setDictationActive,
    isProcessing,
    selectedPreset,
    setSelectedPreset,
    availableServices,
    contentReferences,
    setContentReferences
  } = useAppContext();

  const { transformText, cancelTransformation, clearAll, processingProgress, isChunkedProcessing } = useTransformation();
  const { 
    dictationStatus, 
    startDictation, 
    stopDictation, 
    hasRecordedAudio,
    isPlaying: isOriginalAudioPlaying,
    playRecordedAudio,
    downloadRecordedAudio
  } = useDictationSimple();
  const { processDocument } = useDocumentProcessor();
  const { toast } = useToast();
  const { 
    detectAI, 
    clearDetectionResult, 
    isDetecting: isDetectingAI, 
    detectionResult: aiDetectionResult 
  } = useAIDetection();
  const {
    detectAI: detectOutputAI,
    clearDetectionResult: clearOutputDetectionResult,
    isDetecting: isDetectingOutputAI,
    detectionResult: outputAiDetectionResult
  } = useAIDetection();
  const { 
    isLoading: isTtsLoading, 
    isPlaying, 
    availableVoices, 
    selectedVoiceId, 
    setSelectedVoiceId, 
    fetchVoices, 
    generateSpeech, 
    playAudio, 
    pauseAudio, 
    resetAudio, 
    downloadAudio 
  } = useTTS();
  
  // Toggle dictation on/off
  const toggleDictation = useCallback(async () => {
    if (dictationActive) {
      stopDictation();
      // No need to set dictationActive as the hook handles it
    } else {
      const success = await startDictation();
      if (!success) {
        // If speech recognition failed to start, reset UI
        setDictationActive(false);
      }
    }
  }, [dictationActive, startDictation, stopDictation, setDictationActive]);

  const [currentTab, setCurrentTab] = useState("direct-dictation");
  const [showVoiceSelect, setShowVoiceSelect] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [contentDocuments, setContentDocuments] = useState<{ id: string; name: string; content: string; contentId: number }[]>([]);
  const [selectedContentId, setSelectedContentId] = useState<number | null>(null);
  const [isAddDocDialogOpen, setIsAddDocDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAssessmentDialogOpen, setIsAssessmentDialogOpen] = useState(false);
  const [newContentName, setNewContentName] = useState("");
  const [newContentDescription, setNewContentDescription] = useState("");
  const [newDocumentName, setNewDocumentName] = useState("");
  const [newDocumentContent, setNewDocumentContent] = useState("");
  const [shouldAutoAssess, setShouldAutoAssess] = useState(false);
  const [selectedAssessmentModel, setSelectedAssessmentModel] = useState<AssessmentModel>('openai');
  const [availableModels, setAvailableModels] = useState({
    openai: false,
    anthropic: false,
    perplexity: false
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const contentFileInputRef = useRef<HTMLInputElement>(null);
  const dropzoneRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Calculate word counts using memoization to avoid recalculating on every render
  const originalWordCount = useMemo(() => countWords(originalText), [originalText]);
  const processedWordCount = useMemo(() => countWords(processedText), [processedText]);

  // Handlers
  const handleTransformText = async () => {
    try {
      console.log("Transforming text with:", { originalText, customInstructions });
      
      // First check if we have text to transform
      if (!originalText || originalText.trim().length === 0) {
        toast({
          title: "No Text to Transform",
          description: "Please enter or dictate some text first",
          variant: "destructive"
        });
        return;
      }
      
      // Show a toast notification to indicate transformation is starting
      toast({
        title: "Starting Transformation",
        description: "Your text is being processed...",
        duration: 3000,
      });
      
      // Direct API call approach since the hook method is having issues
      const response = await fetch("/api/transform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: originalText,
          instructions: customInstructions || "Improve this text",
          model: selectedAIModel,
          preset: selectedPreset,
          useStyleReference,
          useContentReference
        })
      });
      
      if (!response.ok) {
        throw new Error(`Transformation failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      setProcessedText(result.text);
      
      // Show success toast
      toast({
        title: "Transformation Complete",
        description: "Your text has been transformed successfully.",
        duration: 3000,
      });
    } catch (error) {
      console.error("Error transforming text:", error);
      toast({
        title: "Transformation Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    }
  };

  const handleCancelTransformation = () => {
    cancelTransformation();
  };

  const handleClearAll = () => {
    clearAll();
    clearDetectionResult();
    clearOutputDetectionResult();
  };

  const handleClearOriginal = () => {
    setOriginalText("");
    clearDetectionResult();
  };

  const handleCopyOriginal = () => {
    navigator.clipboard.writeText(originalText);
  };

  const handleCopyProcessed = () => {
    navigator.clipboard.writeText(processedText);
  };
  
  const handleClearProcessed = () => {
    // Clear the processed text in the app context
    setProcessedText("");
    // Also clear any AI detection result for the processed text
    clearOutputDetectionResult();
  };
  
  // AI Detection handlers
  const handleDetectInputAI = useCallback(async () => {
    if (originalText.trim().length > 0) {
      const result = await detectAI(originalText, selectedAssessmentModel);
      // We no longer automatically show the assessment dialog
      // The user must explicitly click the "Get Assessment" button
    } else {
      toast({
        title: "No text to analyze",
        description: "Please enter or dictate some text first",
        variant: "destructive"
      });
    }
  }, [originalText, detectAI, toast, shouldAutoAssess]);
  
  // Handler for submitting context and custom instructions
  const handleSubmitContext = useCallback(async (context: string, instructions: string) => {
    // Combine context and instructions into a more comprehensive prompt
    let combinedInstructions = "";
    
    if (context) {
      combinedInstructions += `Context: ${context}\n\n`;
    }
    
    if (instructions) {
      combinedInstructions += instructions;
    } else {
      // Provide default instructions if none specified
      combinedInstructions += "Improve this text based on the given context while preserving the original meaning.";
    }
    
    // Set the custom instructions in the app context
    setCustomInstructions(combinedInstructions);
    
    // Show toast notification that transformation is starting
    toast({
      title: "Applying Instructions",
      description: "Transforming text with your context and instructions...",
      duration: 3000,
    });
    
    try {
      // Direct API call to transform the text
      const response = await fetch("/api/transform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: originalText,
          instructions: combinedInstructions,
          model: selectedAIModel,
          preset: selectedPreset,
          useStyleReference,
          useContentReference
        })
      });
      
      if (!response.ok) {
        throw new Error(`Transformation failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      setProcessedText(result.text);
      
      toast({
        title: "Transformation Complete",
        description: "Your text has been transformed with the provided context and instructions.",
        duration: 3000,
      });
    } catch (error) {
      console.error("Error applying context and instructions:", error);
      toast({
        title: "Transformation Failed",
        description: error instanceof Error ? error.message : "Failed to apply instructions",
        variant: "destructive"
      });
    }
  }, [setCustomInstructions, originalText, selectedAIModel, selectedPreset, useStyleReference, useContentReference, toast, setProcessedText]);
  
  const handleDetectOutputAI = useCallback(async () => {
    if (processedText.trim().length > 0) {
      await detectOutputAI(processedText);
    } else {
      toast({
        title: "No processed text to analyze",
        description: "Please transform your text first",
        variant: "destructive"
      });
    }
  }, [processedText, detectOutputAI, toast, clearOutputDetectionResult]);
  
  // File upload handlers
  const handleFileUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      // Check file type
      const fileType = file.type;
      const isDocumentFile = 
        fileType === 'application/pdf' || 
        fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        fileType === 'text/plain';
        
      const isAudioFile = 
        fileType === 'audio/mpeg' || // mp3
        fileType === 'audio/mp4' || 
        fileType === 'audio/wav' ||
        fileType === 'audio/x-wav' ||
        fileType === 'audio/webm' ||
        fileType === 'audio/ogg';
        
      if (!isDocumentFile && !isAudioFile) {
        toast({
          title: "Unsupported file format",
          description: "Please upload a PDF, DOCX, TXT, or audio file (MP3, WAV, etc.).",
          variant: "destructive"
        });
        return;
      }
      
      try {
        setIsUploading(true);
        
        if (isDocumentFile) {
          // Process document file
          const extractedText = await processDocument(file);
          setOriginalText(extractedText);
          toast({
            title: "File uploaded successfully",
            description: `Text extracted from ${file.name}`,
          });
          
          // Automatically run AI detection if there's enough text
          // We still run detection in the background but NEVER auto-open the dialog
          if (extractedText.trim().length >= 50 && shouldAutoAssess) {
            setTimeout(() => {
              detectAI(extractedText);
              // Removed automatic dialog opening
            }, 500);
          }
        } else if (isAudioFile) {
          // Process audio file using the dictation API
          const formData = new FormData();
          formData.append("audio", file);
          
          const response = await fetch("/api/transcribe", {
            method: "POST",
            body: formData,
          });
          
          if (!response.ok) {
            throw new Error(`Failed to transcribe audio: ${response.statusText}`);
          }
          
          const data = await response.json();
          setOriginalText(data.text);
          toast({
            title: "Audio transcribed successfully",
            description: `Speech transcribed from ${file.name}`,
          });
          
          // We can still run AI detection in the background but won't show the dialog automatically
          if (data.text.trim().length >= 50 && shouldAutoAssess) {
            setTimeout(() => {
              detectAI(data.text);
              // Removed the automatic dialog opening
            }, 500);
          }
        }
      } catch (error) {
        console.error("Error processing file:", error);
        const errorMessage = isAudioFile 
          ? "Could not transcribe the audio file."
          : "Could not extract text from the document.";
          
        toast({
          title: `Error processing ${isAudioFile ? 'audio' : 'document'}`,
          description: errorMessage,
          variant: "destructive"
        });
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = ""; // Reset input to allow uploading the same file again
        }
      }
    }
  };

  const handleDownloadProcessed = () => {
    const blob = new Blob([processedText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "processed-text.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Handle voice selection
  const handleVoiceSelect = (voiceId: string) => {
    setSelectedVoiceId(voiceId);
    setShowVoiceSelect(false);
  };

  // Handle play/pause narration
  const handlePlayNarration = async () => {
    if (!processedText) return;
    
    if (isPlaying) {
      pauseAudio();
    } else {
      if (!selectedVoiceId && availableVoices.length > 0) {
        setSelectedVoiceId(availableVoices[0].voice_id);
      }
      
      await generateSpeech(processedText, selectedVoiceId || undefined);
      playAudio();
    }
  };

  // Fetch available voices when processed text is available
  useEffect(() => {
    if (processedText) {
      fetchVoices();
    }
  }, [fetchVoices, processedText]);
  
  // Add keyboard shortcut for Alt+D to toggle dictation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key === 'd') {
        toggleDictation();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [toggleDictation]);
  
  // Check which AI models are available
  useEffect(() => {
    const checkApiStatus = async () => {
      try {
        const response = await fetch('/api/status');
        const data = await response.json();
        
        setAvailableModels({
          openai: data.services.openai,
          anthropic: data.services.anthropic,
          perplexity: data.services.perplexity
        });
        
        // Set default model based on availability
        if (data.services.openai) {
          setSelectedAssessmentModel('openai');
        } else if (data.services.anthropic) {
          setSelectedAssessmentModel('anthropic');
        } else if (data.services.perplexity) {
          setSelectedAssessmentModel('perplexity');
        }
      } catch (error) {
        console.error('Error checking API status:', error);
      }
    };
    
    checkApiStatus();
  }, []);
  
  // Set up drag and drop event listeners for the text area
  useEffect(() => {
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
    
    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        
        // Check file type
        const fileType = file.type;
        const isDocumentFile = 
          fileType === 'application/pdf' || 
          fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
          fileType === 'text/plain';
          
        const isAudioFile = 
          fileType === 'audio/mpeg' || // mp3
          fileType === 'audio/mp4' || 
          fileType === 'audio/wav' ||
          fileType === 'audio/x-wav' ||
          fileType === 'audio/webm' ||
          fileType === 'audio/ogg';
          
        if (!isDocumentFile && !isAudioFile) {
          toast({
            title: "Unsupported file format",
            description: "Please upload a PDF, DOCX, TXT, or audio file (MP3, WAV, etc.).",
            variant: "destructive"
          });
          return;
        }
        
        try {
          setIsUploading(true);
          
          if (isDocumentFile) {
            // Process document file
            const extractedText = await processDocument(file);
            setOriginalText(extractedText);
            toast({
              title: "File uploaded successfully",
              description: `Text extracted from ${file.name}`,
            });
          } else if (isAudioFile) {
            // Process audio file using the dictation API
            const formData = new FormData();
            formData.append("audio", file);
            
            const response = await fetch("/api/transcribe", {
              method: "POST",
              body: formData,
            });
            
            if (!response.ok) {
              throw new Error(`Failed to transcribe audio: ${response.statusText}`);
            }
            
            const data = await response.json();
            setOriginalText(data.text);
            toast({
              title: "Audio transcribed successfully",
              description: `Speech transcribed from ${file.name}`,
            });
          }
        } catch (error) {
          console.error("Error processing file:", error);
          const errorMessage = isAudioFile 
            ? "Could not transcribe the audio file."
            : "Could not extract text from the document.";
            
          toast({
            title: `Error processing ${isAudioFile ? 'audio' : 'document'}`,
            description: errorMessage,
            variant: "destructive"
          });
        } finally {
          setIsUploading(false);
        }
      }
    };
    
    const textarea = textareaRef.current;
    const textareaParent = textarea?.parentElement;
    
    if (textareaParent) {
      textareaParent.addEventListener('dragover', handleDragOver);
      textareaParent.addEventListener('dragleave', handleDragLeave);
      textareaParent.addEventListener('drop', handleDrop);
      
      return () => {
        textareaParent.removeEventListener('dragover', handleDragOver);
        textareaParent.removeEventListener('dragleave', handleDragLeave);
        textareaParent.removeEventListener('drop', handleDrop);
      };
    }
  }, [toast, processDocument, setOriginalText]);

  const presets = ["Academic", "Professional", "Creative", "Concise", "Elaborate"];
  
  // Content library functions
  const addCurrentTextAsDocument = () => {
    if (selectedContentId === null) {
      toast({
        title: "Error",
        description: "Please select a content reference first",
        variant: "destructive"
      });
      return;
    }

    if (!originalText.trim()) {
      toast({
        title: "Error",
        description: "There is no text in the editor to add",
        variant: "destructive"
      });
      return;
    }

    setNewDocumentName(`Document ${contentDocuments.filter(doc => doc.contentId === selectedContentId).length + 1}`);
    setNewDocumentContent(originalText);
    setIsAddDocDialogOpen(true);
  };

  const handleAddDocument = () => {
    if (selectedContentId === null) {
      toast({
        title: "Error",
        description: "Please select a content reference first",
        variant: "destructive"
      });
      return;
    }

    if (!newDocumentName.trim() || !newDocumentContent.trim()) {
      toast({
        title: "Error",
        description: "Document name and content cannot be empty",
        variant: "destructive"
      });
      return;
    }

    const newDoc = {
      id: Date.now().toString(),
      name: newDocumentName,
      content: newDocumentContent,
      contentId: selectedContentId
    };

    setContentDocuments([...contentDocuments, newDoc]);

    // Update document count for the selected content reference
    setContentReferences(
      contentReferences.map(content => 
        content.id === selectedContentId
          ? { ...content, documentCount: content.documentCount + 1 }
          : content
      )
    );

    setNewDocumentName("");
    setNewDocumentContent("");
    setIsAddDocDialogOpen(false);

    toast({
      title: "Success",
      description: "Document added successfully"
    });
  };

  const handleClickAddDocument = () => {
    if (selectedContentId === null) {
      toast({
        title: "Error",
        description: "Please select a content reference first",
        variant: "destructive"
      });
      return;
    }

    setNewDocumentName("");
    setNewDocumentContent("");
    setIsAddDocDialogOpen(true);
  };

  const handleSelectFile = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleAddContent = () => {
    if (!newContentName.trim()) {
      toast({
        title: "Error",
        description: "Content name cannot be empty",
        variant: "destructive"
      });
      return;
    }

    const newContentId = Date.now();
    const hasDocument = newDocumentContent && newDocumentName;
    
    const newContent = {
      id: newContentId,
      name: newContentName,
      description: newContentDescription,
      active: true,
      documentCount: hasDocument ? 1 : 0
    };
    
    // Add the content first
    setContentReferences([...contentReferences, newContent]);
    
    // If we have document content from an upload, add it to the new content reference
    if (hasDocument) {
      const newDoc = {
        id: Date.now().toString(),
        name: newDocumentName,
        content: newDocumentContent,
        contentId: newContentId
      };
      
      setContentDocuments([...contentDocuments, newDoc]);
    }
    
    // Reset form fields
    setNewContentName("");
    setNewContentDescription("");
    setNewDocumentName("");
    setNewDocumentContent("");
    setIsAddDialogOpen(false);

    toast({
      title: "Success",
      description: hasDocument 
        ? "Content reference and document added successfully" 
        : "Content reference added successfully"
    });
  };

  const toggleContentActive = (id: number) => {
    setContentReferences(
      contentReferences.map(content => 
        content.id === id
          ? { ...content, active: !content.active }
          : content
      )
    );
  };

  const handleContentFileUpload = () => {
    if (contentFileInputRef.current) {
      contentFileInputRef.current.click();
    }
  };
  
  const handleContentFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    
    try {
      setIsUploading(true);
      
      // Extract text from the file
      const extractedText = await processDocument(file);
      
      // Try to use the filename for the content name if not set
      if (!newContentName || newContentName === '') {
        const baseName = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
        setNewContentName(baseName);
      }
      
      // Set an initial description if empty
      if (!newContentDescription || newContentDescription === '') {
        setNewContentDescription(`Content reference based on "${file.name}"`);
      }
      
      // Store the document info for when content is created
      setNewDocumentName(file.name);
      setNewDocumentContent(extractedText);
      
      setIsUploading(false);
      
      toast({
        title: "File processed",
        description: `${file.name} processed successfully and will be added after content creation`,
      });
      
    } catch (error) {
      setIsUploading(false);
      console.error("Error processing file:", error);
      toast({
        title: "Error",
        description: "Failed to process document",
        variant: "destructive"
      });
    } finally {
      e.target.value = '';
    }
  };

  const handleFileUpload = async (file: File) => {
    if (selectedContentId === null) {
      toast({
        title: "Error",
        description: "Please select a content reference first",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsUploading(true);
      const extractedText = await processDocument(file);
      setIsUploading(false);

      if (!extractedText) return;

      const newDoc = {
        id: Date.now().toString(),
        name: file.name,
        content: extractedText,
        contentId: selectedContentId
      };

      setContentDocuments([...contentDocuments, newDoc]);

      // Update document count for the selected content reference
      setContentReferences(
        contentReferences.map(content => 
          content.id === selectedContentId
            ? { ...content, documentCount: content.documentCount + 1 }
            : content
        )
      );

      toast({
        title: "Success",
        description: "Document added successfully from file"
      });
    } catch (error) {
      setIsUploading(false);
      console.error("Error uploading file:", error);
      toast({
        title: "Error",
        description: "Failed to process document",
        variant: "destructive"
      });
    }
  };

  const handleDragOverContent = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeaveContent = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDropContent = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (selectedContentId === null) {
      toast({
        title: "Error",
        description: "Please select a content reference first",
        variant: "destructive"
      });
      return;
    }

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      await handleFileUpload(file);
    }
  };

  return (
    <section className="mb-8">
      <Card>
        {/* Tab Navigation */}
        <Tabs defaultValue="direct-dictation" className="w-full" onValueChange={setCurrentTab} value={currentTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="direct-dictation">Direct Dictation</TabsTrigger>
            <TabsTrigger value="style-emulation">Style Emulation</TabsTrigger>
            <TabsTrigger value="content-reference">Content Reference</TabsTrigger>
          </TabsList>
          
          <TabsContent value="direct-dictation" className="p-6">
            {/* Split Editor */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Original Text Panel */}
              <div className="flex flex-col space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium">Original Dictation</h3>
                    <Badge variant="outline" className="text-xs font-normal">
                      {originalWordCount} {originalWordCount === 1 ? 'word' : 'words'}
                    </Badge>
                  </div>
                  <div className="flex space-x-2">
                    {/* Dictation Button */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant={dictationActive ? "destructive" : "outline"}
                            size="sm" 
                            className={`text-xs flex items-center ${dictationActive ? 'animate-pulse' : ''}`}
                            onClick={toggleDictation}
                          >
                            <i className={`${dictationActive ? 'ri-stop-line' : 'ri-mic-line'} mr-1`}></i>
                            {dictationActive ? "Stop" : "Record"}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          <p className="text-xs">{dictationActive ? "Stop voice recording" : "Start voice recording (Alt+D)"}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    {/* Upload Document Button */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-xs flex items-center"
                            onClick={handleFileUploadClick}
                            disabled={isUploading}
                          >
                            {isUploading ? (
                              <span className="animate-spin h-3 w-3 mr-1 border-2 border-t-transparent rounded-full"></span>
                            ) : (
                              <i className="ri-upload-line mr-1"></i>
                            )}
                            {isUploading ? "Uploading..." : "Upload"}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          <p className="text-xs">Upload PDF, DOCX, TXT, or audio files (MP3, WAV)</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-xs flex items-center" 
                      onClick={handleClearOriginal}
                    >
                      <i className="ri-delete-bin-line mr-1"></i> Clear
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-xs flex items-center"
                      onClick={handleCopyOriginal}
                    >
                      <i className="ri-file-copy-line mr-1"></i> Copy
                    </Button>
                  </div>
                </div>
                {/* AI Detection Button */}
                <div className="flex items-center justify-end space-x-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={handleDetectInputAI}
                    disabled={isDetectingAI || !originalText || originalText.length < 50}
                    className="text-xs"
                  >
                    <i className="ri-shield-check-line mr-1.5"></i>
                    {isDetectingAI ? "Analyzing..." : "Detect AI Content"}
                  </Button>
                  
                  <div className="flex items-center gap-2">
                    <AssessmentModelSelector
                      selectedModel={selectedAssessmentModel}
                      onChange={setSelectedAssessmentModel}
                      availableModels={availableModels}
                    />
                    <Button 
                      size="sm"
                      variant="secondary" 
                      onClick={() => setIsAssessmentDialogOpen(true)}
                      disabled={!originalText || originalText.length < 50}
                      className="text-xs"
                    >
                      <i className="ri-file-list-line mr-1.5"></i>
                      Get Assessment
                    </Button>
                  </div>
                </div>
                
                {/* AI Detection Indicator */}
                {(isDetectingAI || aiDetectionResult) && (
                  <div className="mt-1.5 mb-2">
                    <AIDetectionIndicator 
                      result={aiDetectionResult}
                      isDetecting={isDetectingAI}
                      onRequestDetection={handleDetectInputAI}
                      originalText={originalText}
                      onApplyContext={handleSubmitContext}
                    />
                  </div>
                )}
                
                <div className="flex-1 relative">
                  <Textarea
                    ref={textareaRef}
                    value={originalText}
                    onChange={(e) => {
                      setOriginalText(e.target.value);
                      clearDetectionResult(); // Clear detection when text changes
                    }}
                    placeholder="Start dictating or type here..."
                    className={`h-[256px] resize-none ${isDragging ? 'bg-primary/5 border-primary' : ''}`}
                    style={{ maxHeight: "256px" }}
                  />
                  {/* Hidden File Input */}
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    className="hidden" 
                    accept=".pdf,.docx,.txt,.mp3,.wav,.ogg,.webm,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,audio/mpeg,audio/wav,audio/x-wav,audio/webm,audio/ogg,audio/mp4" 
                    onChange={handleFileChange}
                  />
                  {/* Dictation Status Indicator */}
                  {dictationActive && (
                    <div className="absolute bottom-3 right-3 flex items-center text-xs text-muted-foreground">
                      <div className="h-2 w-2 rounded-full bg-green-500 mr-1 animate-pulse"></div>
                      {dictationStatus}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Processed Text Panel */}
              <div className="flex flex-col space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium">Processed Output</h3>
                    <Badge variant="outline" className="text-xs font-normal">
                      {processedWordCount} {processedWordCount === 1 ? 'word' : 'words'}
                    </Badge>
                  </div>
                  
                  {/* Show progress indicator during chunked processing */}
                  {isChunkedProcessing && processingProgress > 0 && (
                    <div className="flex items-center gap-2 w-1/2">
                      <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                        <div 
                          className="bg-primary h-2.5 rounded-full transition-all" 
                          style={{ width: `${processingProgress}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-muted-foreground">{processingProgress}%</span>
                    </div>
                  )}
                  <div className="flex space-x-2 flex-wrap gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-xs flex items-center"
                      onClick={handleClearProcessed}
                    >
                      <i className="ri-delete-bin-line mr-1"></i> Clear
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-xs flex items-center"
                      onClick={handleCopyProcessed}
                    >
                      <i className="ri-file-copy-line mr-1"></i> Copy
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-xs flex items-center"
                      onClick={handleDownloadProcessed}
                    >
                      <i className="ri-download-line mr-1"></i> Download
                    </Button>
                    {processedText && (
                      <>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-xs flex items-center bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                          onClick={() => {
                            if (processedText) {
                              setOriginalText(processedText);
                              setProcessedText('');
                              toast({
                                title: "Text Moved",
                                description: "The processed text has been moved to the input area for further editing.",
                                duration: 3000,
                              });
                            }
                          }}
                        >
                          <i className="ri-arrow-left-line mr-1"></i> Use as Input
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-xs flex items-center bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300"
                          onClick={async () => {
                            if (processedText && !isProcessing) {
                              try {
                                console.log("Starting recursive transformation of:", processedText.substring(0, 50) + "...");
                                
                                // Include all the necessary parameters
                                const payload = {
                                  text: processedText,
                                  instructions: customInstructions,
                                  model: selectedAIModel,
                                  preset: selectedPreset,
                                  useStyleReference: useStyleReference,
                                  useContentReference: useContentReference
                                };
                                
                                console.log("Sending transformation request with payload:", payload);
                                
                                // Directly transform the processed text
                                const response = await fetch("/api/transform", {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": "application/json",
                                  },
                                  body: JSON.stringify(payload),
                                });
                                
                                if (!response.ok) {
                                  const errorText = await response.text();
                                  console.error("Transform API error:", errorText);
                                  throw new Error(`Failed to transform text: ${response.status} ${response.statusText}`);
                                }
                                
                                const result = await response.json();
                                console.log("Transformation successful, received:", result.text.substring(0, 50) + "...");
                                
                                // Remove markdown formatting from the transformed text
                                let cleanedText = result.text;
                                // Remove bold/italic markdown
                                cleanedText = cleanedText.replace(/\*\*/g, '');
                                cleanedText = cleanedText.replace(/\*/g, '');
                                // Remove other common markdown elements if needed
                                cleanedText = cleanedText.replace(/#{1,6}\s/g, ''); // Remove headings
                                cleanedText = cleanedText.replace(/`{1,3}/g, '');   // Remove code blocks
                                
                                // Set the cleaned text as the processed text
                                setProcessedText(cleanedText);
                                
                                toast({
                                  title: "Transformation Complete",
                                  description: "The processed text has been transformed again.",
                                  duration: 3000,
                                });
                              } catch (err) {
                                const error = err as Error;
                                console.error("Error transforming text:", error);
                                toast({
                                  title: "Transformation Failed",
                                  description: "An error occurred while transforming the text.",
                                  variant: "destructive",
                                  duration: 5000,
                                });
                              }
                            }
                          }}
                          disabled={isProcessing || !processedText}
                        >
                          <i className="ri-magic-line mr-1"></i> Transform Again
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                {/* AI Detection Button for Processed Text */}
                <div className="flex items-center justify-end">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={handleDetectOutputAI}
                    disabled={isDetectingOutputAI || !processedText || processedText.length < 50}
                    className="text-xs"
                  >
                    <i className="ri-shield-check-line mr-1.5"></i>
                    {isDetectingOutputAI ? "Analyzing..." : "Detect AI Content"}
                  </Button>
                </div>
                
                {/* AI Detection Indicator for Processed Text */}
                {(isDetectingOutputAI || outputAiDetectionResult) && (
                  <div className="mt-1.5 mb-2">
                    <AIDetectionIndicator 
                      result={outputAiDetectionResult}
                      isDetecting={isDetectingOutputAI}
                      onRequestDetection={handleDetectOutputAI}
                    />
                  </div>
                )}
                
                <div className="flex-1">
                  <Textarea 
                    className="min-h-[256px] resize-none"
                    value={removeMarkdownFormatting(processedText)}
                    onChange={(e) => setProcessedText(e.target.value)}
                    placeholder="Processed text will appear here..."
                    style={{ maxHeight: "256px" }}
                  />
                </div>

                {/* TTS Controls - Only show when there's processed text */}
                {processedText && (
                  <div className="flex items-center justify-between flex-wrap">
                    <div className="flex items-center space-x-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex items-center"
                              onClick={handlePlayNarration}
                              disabled={isTtsLoading}
                            >
                              {isTtsLoading ? (
                                <span className="animate-spin h-4 w-4 mr-2 border-2 border-t-transparent rounded-full"></span>
                              ) : isPlaying ? (
                                <i className="ri-pause-fill mr-1.5"></i>
                              ) : (
                                <i className="ri-play-fill mr-1.5"></i>
                              )}
                              {isTtsLoading 
                                ? "Generating..." 
                                : isPlaying 
                                  ? "Pause AI Narration" 
                                  : "Play AI Narration"}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom">
                            <p className="text-xs">Generate natural speech narration with ElevenLabs API</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex items-center"
                        onClick={() => setShowVoiceSelect(!showVoiceSelect)}
                        disabled={isTtsLoading || availableVoices.length === 0}
                      >
                        <i className="ri-user-voice-line mr-1.5"></i>
                        Voice
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex items-center"
                        onClick={() => downloadAudio("processed-narration")}
                        disabled={isTtsLoading}
                      >
                        <i className="ri-download-line mr-1.5"></i>
                        Download Audio
                      </Button>
                    </div>
                  </div>
                )}

                {/* Voice Selection Dropdown */}
                {showVoiceSelect && availableVoices.length > 0 && (
                  <div className="mt-2 p-3 border rounded-md bg-accent/5">
                    <h4 className="text-sm font-medium mb-2">Select Voice</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                      {availableVoices.map((voice) => (
                        <Button
                          key={voice.voice_id}
                          variant={selectedVoiceId === voice.voice_id ? "secondary" : "ghost"}
                          size="sm"
                          className="justify-start text-xs"
                          onClick={() => handleVoiceSelect(voice.voice_id)}
                        >
                          <i className="ri-user-voice-line mr-1.5"></i>
                          {voice.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Transformation Controls */}
            <div className="mt-6 bg-accent/5 p-4 rounded-md border">
              <div className="flex flex-col space-y-4">
                <h3 className="text-sm font-medium">Text Transformation</h3>
                
                {/* Preset Buttons */}
                <div className="flex flex-wrap gap-2">
                  {presets.map((preset) => (
                    <Button
                      key={preset}
                      variant={selectedPreset === preset ? "default" : "outline"}
                      size="sm"
                      className="rounded-full px-3 py-1 text-xs"
                      onClick={() => setSelectedPreset(preset)}
                    >
                      {preset}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full px-3 py-1 text-xs flex items-center"
                    onClick={() => setSelectedPreset("Custom")}
                  >
                    <i className="ri-add-line mr-1"></i> Custom
                  </Button>
                </div>
                
                {/* Custom Instructions */}
                <div>
                  <Label htmlFor="custom-instructions" className="text-xs font-medium mb-1">Custom Instructions</Label>
                  <Textarea
                    id="custom-instructions"
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    placeholder="E.g., Rewrite in academic style, focusing on epistemology concepts. Include examples of foundationalism and coherentism."
                    className="text-sm resize-none"
                    rows={2}
                  />
                </div>
                
                {/* Style Reference Toggle */}
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="use-style-reference" 
                      checked={useStyleReference}
                      onCheckedChange={setUseStyleReference}
                    />
                    <Label htmlFor="use-style-reference" className="text-xs font-medium">
                      Use Personal Style References
                    </Label>
                  </div>
                  <Button variant="link" size="sm" className="text-xs px-0 h-auto">
                    <i className="ri-settings-line mr-1"></i> Configure
                  </Button>
                </div>
                
                {/* Content Reference Toggle */}
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="use-content-reference" 
                      checked={useContentReference}
                      onCheckedChange={setUseContentReference}
                    />
                    <Label htmlFor="use-content-reference" className="text-xs font-medium">
                      Use Personal Content References
                    </Label>
                  </div>
                  <Button variant="link" size="sm" className="text-xs px-0 h-auto">
                    <i className="ri-settings-line mr-1"></i> Configure
                  </Button>
                </div>
                
                {/* API Selection */}
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center space-x-4 flex-wrap gap-2">
                    <div className="flex items-center space-x-2">
                      <Label htmlFor="speech-engine" className="text-xs font-medium">Speech Engine:</Label>
                      <Select
                        value={selectedSpeechEngine}
                        onValueChange={(value) => setSelectedSpeechEngine(value as SpeechEngine)}
                      >
                        <SelectTrigger className="w-[180px] h-8 text-xs">
                          <SelectValue placeholder="Select speech engine" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={SpeechEngine.GLADIA}>{SpeechEngine.GLADIA} (Primary)</SelectItem>
                          <SelectItem value={SpeechEngine.WHISPER}>{SpeechEngine.WHISPER}</SelectItem>
                          <SelectItem value={SpeechEngine.DEEPGRAM}>{SpeechEngine.DEEPGRAM}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Label htmlFor="ai-model" className="text-xs font-medium">AI Model:</Label>
                      <Select
                        value={selectedAIModel}
                        onValueChange={(value) => setSelectedAIModel(value as AIModel)}
                      >
                        <SelectTrigger className="w-[200px] h-8 text-xs">
                          <SelectValue placeholder="Select AI model" />
                        </SelectTrigger>
                        <SelectContent>
                          {/* OpenAI Models */}
                          <SelectItem 
                            value={AIModel.GPT4O} 
                            disabled={!availableServices.openai}
                          >
                            OpenAI: {AIModel.GPT4O}
                          </SelectItem>
                          <SelectItem 
                            value={AIModel.GPT4} 
                            disabled={!availableServices.openai}
                          >
                            OpenAI: {AIModel.GPT4}
                          </SelectItem>
                          <SelectItem 
                            value={AIModel.GPT35} 
                            disabled={!availableServices.openai}
                          >
                            OpenAI: {AIModel.GPT35}
                          </SelectItem>
                          
                          {/* Anthropic Models */}
                          <SelectItem 
                            value={AIModel.CLAUDE_3_OPUS} 
                            disabled={!availableServices.anthropic}
                          >
                            Anthropic: {AIModel.CLAUDE_3_OPUS}
                          </SelectItem>
                          <SelectItem 
                            value={AIModel.CLAUDE_3_SONNET} 
                            disabled={!availableServices.anthropic}
                          >
                            Anthropic: {AIModel.CLAUDE_3_SONNET}
                          </SelectItem>
                          <SelectItem 
                            value={AIModel.CLAUDE_3_HAIKU} 
                            disabled={!availableServices.anthropic}
                          >
                            Anthropic: {AIModel.CLAUDE_3_HAIKU}
                          </SelectItem>
                          
                          {/* Perplexity Models */}
                          <SelectItem 
                            value={AIModel.PERPLEXITY_LLAMA_SONAR} 
                            disabled={!availableServices.perplexity}
                          >
                            Perplexity: {AIModel.PERPLEXITY_LLAMA_SONAR}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {/* Action Buttons Group */}
                  <div className="flex items-center space-x-2">
                    {/* Transform Button */}
                    <Button 
                      className="flex items-center" 
                      onClick={handleTransformText}
                      disabled={isProcessing || !originalText}
                    >
                      {isProcessing ? (
                        <>
                          <span className="animate-spin h-4 w-4 mr-2 border-2 border-t-transparent rounded-full"></span>
                          {isChunkedProcessing 
                            ? `Processing Chunks (${processingProgress}%)` 
                            : "Processing..."}
                        </>
                      ) : (
                        <>
                          <i className="ri-magic-line mr-2"></i>
                          Transform Text
                        </>
                      )}
                    </Button>
                    
                    {/* Cancel Button - Only show when processing */}
                    {isProcessing && (
                      <Button 
                        variant="destructive" 
                        className="flex items-center" 
                        onClick={handleCancelTransformation}
                      >
                        <i className="ri-close-line mr-2"></i>
                        Cancel
                      </Button>
                    )}
                    
                    {/* Clear All Button */}
                    <Button 
                      variant="outline" 
                      className="flex items-center" 
                      onClick={handleClearAll}
                    >
                      <i className="ri-delete-bin-line mr-2"></i>
                      Clear All
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="style-emulation">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">
                Style emulation will be available in this tab.
                Switch to the "Style Library" page to manage your personal style references.
              </p>
            </CardContent>
          </TabsContent>
          
          <TabsContent value="content-reference" className="p-6">
            <div className="flex flex-col space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Personal Content Library</h3>
                <div className="flex items-center gap-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="use-content-reference" 
                      checked={useContentReference}
                      onCheckedChange={setUseContentReference}
                    />
                    <Label htmlFor="use-content-reference" className="text-xs font-medium">
                      Use Content References During Transformation
                    </Label>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsAddDialogOpen(true)}
                    size="sm"
                    className="ml-4"
                  >
                    <i className="ri-add-line mr-1"></i> New Reference
                  </Button>
                </div>
              </div>

              {contentReferences.length === 0 ? (
                <Alert>
                  <AlertDescription>
                    No content references found. Create a new content reference to get started.
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                    {contentReferences.map((content) => (
                      <div
                        key={content.id}
                        className={`p-3 border rounded-md cursor-pointer ${
                          selectedContentId === content.id
                            ? "border-primary bg-accent/20"
                            : "border-border hover:border-primary/50"
                        }`}
                        onClick={() => setSelectedContentId(content.id)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="font-medium">{content.name}</div>
                          <Button
                            size="sm"
                            variant={content.active ? "default" : "outline"}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleContentActive(content.id);
                            }}
                          >
                            {content.active ? "Active" : "Inactive"}
                          </Button>
                        </div>
                        {content.description && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {content.description}
                          </p>
                        )}
                        <div className="text-xs text-muted-foreground">
                          {content.documentCount} document{content.documentCount !== 1 && "s"}
                        </div>
                      </div>
                    ))}
                  </div>

                  {selectedContentId !== null && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-medium">
                          Content Documents
                        </h3>
                        <div className="flex space-x-2">
                          <Button size="sm" onClick={handleClickAddDocument}>
                            Add Document
                          </Button>
                          <Button size="sm" variant="outline" onClick={addCurrentTextAsDocument}>
                            Add Current Text
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleSelectFile}>
                            Upload File
                          </Button>
                          <input
                            type="file"
                            accept=".txt,.pdf,.docx,.doc,.rtf"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files && e.target.files.length > 0) {
                                handleFileUpload(e.target.files[0]);
                                e.target.value = '';
                              }
                            }}
                            ref={fileInputRef}
                          />
                        </div>
                      </div>

                      <div
                        ref={dropzoneRef}
                        className={`border-2 border-dashed rounded-md p-4 text-center mb-3 ${
                          isDragging
                            ? "border-primary bg-primary/5"
                            : "border-border"
                        }`}
                        onDragOver={handleDragOverContent}
                        onDragLeave={handleDragLeaveContent}
                        onDrop={handleDropContent}
                      >
                        <p className="text-sm text-muted-foreground">
                          Drag and drop a document here to add to this content reference
                        </p>
                        {isUploading && (
                          <div className="mt-2">
                            <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
                            <p className="text-xs mt-1">Processing document...</p>
                          </div>
                        )}
                      </div>

                      {contentDocuments.filter(doc => doc.contentId === selectedContentId).length === 0 ? (
                        <Alert>
                          <AlertDescription>
                            No documents found for this content reference. Add a document to get started.
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <div className="space-y-2">
                          {contentDocuments
                            .filter(doc => doc.contentId === selectedContentId)
                            .map(doc => (
                              <div key={doc.id} className="p-2 border rounded-md">
                                <div className="font-medium">{doc.name}</div>
                                <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                  {doc.content}
                                </div>
                              </div>
                            ))
                          }
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
              
              {/* Add Content Dialog */}
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Content Reference</DialogTitle>
                    <DialogDescription>
                      Create a new content reference to use for text transformation
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Content Name</Label>
                      <Input 
                        id="name" 
                        value={newContentName} 
                        onChange={(e) => setNewContentName(e.target.value)} 
                        placeholder="e.g., Marketing Materials"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea 
                        id="description" 
                        value={newContentDescription} 
                        onChange={(e) => setNewContentDescription(e.target.value)} 
                        placeholder="Describe the purpose of this content reference"
                      />
                    </div>
                    
                    <div className="grid gap-2">
                      <Label>Upload Document (PDF, DOCX, TXT)</Label>
                      <div 
                        className={`border-2 border-dashed rounded-md p-6 flex flex-col items-center justify-center gap-2 hover:border-primary/50 transition cursor-pointer ${isDragging ? "border-primary bg-primary/5" : ""}`}
                        onClick={handleContentFileUpload}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDragging(true);
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault();
                          setIsDragging(false);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDragging(false);
                          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                            handleContentFileChange({ target: { files: e.dataTransfer.files } } as any);
                          }
                        }}
                      >
                        <i className="ri-upload-cloud-line text-2xl text-muted-foreground"></i>
                        <p className="text-sm text-muted-foreground text-center">
                          Drop a document here or click to upload
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          This document will become part of this content reference
                        </p>
                        {newDocumentName && (
                          <div className="mt-2 p-2 bg-accent/20 rounded-md text-sm">
                            <i className="ri-file-text-line mr-1"></i> {newDocumentName}
                          </div>
                        )}
                        <input
                          ref={contentFileInputRef}
                          type="file"
                          accept=".txt,.pdf,.docx,.doc,.rtf"
                          className="hidden"
                          onChange={handleContentFileChange}
                        />
                      </div>
                      {isUploading && (
                        <div className="flex items-center justify-center gap-2 py-2">
                          <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
                          <p className="text-xs">Processing document...</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleAddContent}>
                      {newDocumentContent ? "Add Content with Document" : "Add Content"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              
              {/* Add Document Dialog */}
              <Dialog open={isAddDocDialogOpen} onOpenChange={setIsAddDocDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Document</DialogTitle>
                    <DialogDescription>
                      Add a document to the selected content reference
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="docName">Document Name</Label>
                      <Input 
                        id="docName" 
                        value={newDocumentName} 
                        onChange={(e) => setNewDocumentName(e.target.value)} 
                        placeholder="e.g., Product Description"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="docContent">Content</Label>
                      <Textarea 
                        id="docContent" 
                        value={newDocumentContent} 
                        onChange={(e) => setNewDocumentContent(e.target.value)} 
                        placeholder="Enter the document content"
                        rows={8}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddDocDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleAddDocument}>Add Document</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
      
      {/* Text Assessment Dialogs - Using ManualAssessmentDialog instead */}
      <ManualAssessmentDialog
        isOpen={isAssessmentDialogOpen}
        onClose={() => setIsAssessmentDialogOpen(false)}
        originalText={originalText}
        onSubmitContext={handleSubmitContext}
      />
    </section>
  );
};

export default DictationSection;