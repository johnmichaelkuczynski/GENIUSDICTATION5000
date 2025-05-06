import { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppContext } from "@/context/AppContext";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface StyleReference {
  id: number;
  name: string;
  description: string;
  active: boolean;
  documentCount: number;
}

interface ReferenceDocument {
  id: string;
  name: string;
  content: string;
  styleId: number;
}

const StyleLibrary = () => {
  const { 
    styleReferences, 
    setStyleReferences, 
    originalText, 
    setOriginalText 
  } = useAppContext();
  
  const { toast } = useToast();
  const [referenceDocuments, setReferenceDocuments] = useState<ReferenceDocument[]>([]);
  const [selectedStyle, setSelectedStyle] = useState<StyleReference | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAddDocDialogOpen, setIsAddDocDialogOpen] = useState(false);
  const [isAddCurrentTextDialogOpen, setIsAddCurrentTextDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [styleToDelete, setStyleToDelete] = useState<StyleReference | null>(null);
  const [styleForText, setStyleForText] = useState<StyleReference | null>(null);
  const [newStyleName, setNewStyleName] = useState("");
  const [newStyleDescription, setNewStyleDescription] = useState("");
  const [newDocumentName, setNewDocumentName] = useState("");
  const [newDocumentContent, setNewDocumentContent] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  
  // State for drag and drop
  const [isDragging, setIsDragging] = useState(false);
  
  // References for file inputs
  const styleDocFileInputRef = useRef<HTMLInputElement>(null);
  const refDocFileInputRef = useRef<HTMLInputElement>(null);
  const dropzoneRef = useRef<HTMLDivElement>(null);

  const toggleStyleActive = (id: number) => {
    setStyleReferences(
      styleReferences.map((style) =>
        style.id === id ? { ...style, active: !style.active } : style
      )
    );
  };

  // Handle file upload for new style reference
  const handleStyleDocFileUpload = () => {
    if (styleDocFileInputRef.current) {
      styleDocFileInputRef.current.click();
    }
  };

  // Handle file change for new style reference document
  const handleStyleDocFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    
    // Check if it's a text file
    if (!file.type.includes('text') && !file.name.endsWith('.txt')) {
      toast({
        title: "Invalid file type",
        description: "Please upload a text file (.txt)",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsUploading(true);
      
      // Read the file
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target && typeof event.target.result === 'string') {
          if (!newStyleName || newStyleName === '') {
            // Try to use the filename for the style name if not set
            const baseName = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
            setNewStyleName(baseName);
          }
          
          // Set an initial description if empty
          if (!newStyleDescription || newStyleDescription === '') {
            setNewStyleDescription(`Style reference based on "${file.name}"`);
          }
          
          // We will create the style first, then add this document to it
          // So store the content for later
          setNewDocumentName(file.name);
          setNewDocumentContent(event.target.result);
          
          toast({
            title: "File uploaded",
            description: "Text content has been extracted. The document will be added to the style after creation.",
          });
        }
      };
      reader.readAsText(file);
      
    } catch (error) {
      toast({
        title: "Error reading file",
        description: "Could not read the file content",
        variant: "destructive"
      });
      console.error("File reading error:", error);
    } finally {
      setIsUploading(false);
      
      // Reset the file input
      if (styleDocFileInputRef.current) {
        styleDocFileInputRef.current.value = "";
      }
    }
  };

  const addNewStyle = () => {
    if (newStyleName.trim() === "") return;
    
    const styleId = Date.now();
    
    const newStyle: StyleReference = {
      id: styleId,
      name: newStyleName,
      description: newStyleDescription,
      active: false,
      documentCount: 0,
    };
    
    setStyleReferences([...styleReferences, newStyle]);
    
    // If we also have document content ready, add it to this style
    if (newDocumentName && newDocumentContent) {
      const newDoc: ReferenceDocument = {
        id: Math.random().toString(36).substr(2, 9),
        name: newDocumentName,
        content: newDocumentContent,
        styleId: styleId,
      };
      
      setReferenceDocuments([...referenceDocuments, newDoc]);
      
      // Update the document count for the style
      newStyle.documentCount = 1;
      
      // Select the new style
      setSelectedStyle(newStyle);
      
      toast({
        title: "Style created with document",
        description: `Created style "${newStyleName}" with reference document "${newDocumentName}"`,
      });
    } else {
      toast({
        title: "Style created",
        description: `Created style "${newStyleName}"`,
      });
    }
    
    setNewStyleName("");
    setNewStyleDescription("");
    setNewDocumentName("");
    setNewDocumentContent("");
    setIsAddDialogOpen(false);
  };

  const addReferenceDocument = () => {
    if (!selectedStyle || newDocumentName.trim() === "" || newDocumentContent.trim() === "") return;
    
    const newDoc: ReferenceDocument = {
      id: Math.random().toString(36).substr(2, 9),
      name: newDocumentName,
      content: newDocumentContent,
      styleId: selectedStyle.id,
    };
    
    setReferenceDocuments([...referenceDocuments, newDoc]);
    
    // Update document count for the style
    setStyleReferences(
      styleReferences.map((style) =>
        style.id === selectedStyle.id ? { ...style, documentCount: style.documentCount + 1 } : style
      )
    );
    
    setNewDocumentName("");
    setNewDocumentContent("");
    setIsAddDocDialogOpen(false);
  };

  // Handle confirming style deletion
  const confirmDeleteStyle = (style: StyleReference, event?: React.MouseEvent<HTMLButtonElement>) => {
    if (event) {
      event.stopPropagation();
    }
    setStyleToDelete(style);
    setIsDeleteDialogOpen(true);
  };
  
  // Handle the actual style deletion after confirmation
  const deleteStyle = () => {
    if (!styleToDelete) return;
    
    const id = styleToDelete.id;
    const name = styleToDelete.name;
    
    setStyleReferences(styleReferences.filter(style => style.id !== id));
    setReferenceDocuments(referenceDocuments.filter(doc => doc.styleId !== id));
    
    if (selectedStyle?.id === id) {
      setSelectedStyle(null);
    }
    
    toast({
      title: "Style deleted",
      description: `Style "${name}" has been removed`
    });
    
    setStyleToDelete(null);
    setIsDeleteDialogOpen(false);
  };

  // State for document deletion confirmation
  const [isDeleteDocDialogOpen, setIsDeleteDocDialogOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<{ id: string, name: string, styleId: number } | null>(null);
  
  // Handle confirming document deletion
  const confirmDeleteDocument = (id: string, name: string, styleId: number) => {
    setDocToDelete({ id, name, styleId });
    setIsDeleteDocDialogOpen(true);
  };
  
  // Handle the actual document deletion
  const deleteDocument = () => {
    if (!docToDelete) return;
    
    const { id, name, styleId } = docToDelete;
    
    setReferenceDocuments(referenceDocuments.filter(doc => doc.id !== id));
    
    // Update document count for the style
    setStyleReferences(
      styleReferences.map((style) =>
        style.id === styleId ? { ...style, documentCount: style.documentCount - 1 } : style
      )
    );
    
    toast({
      title: "Document deleted",
      description: `Document "${name}" has been removed`
    });
    
    setDocToDelete(null);
    setIsDeleteDocDialogOpen(false);
  };
  
  // Handle file upload for reference documents
  const handleRefDocFileUpload = () => {
    if (refDocFileInputRef.current) {
      refDocFileInputRef.current.click();
    }
  };

  // Handle file change for reference documents
  const handleRefDocFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedStyle || !e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    
    // Check if it's a supported file type
    const supportedTypes = ['text/plain', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const supportedExtensions = ['.txt', '.pdf', '.docx'];
    
    const hasValidType = supportedTypes.some(type => file.type.includes(type));
    const hasValidExtension = supportedExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    
    if (!hasValidType && !hasValidExtension) {
      toast({
        title: "Invalid file type",
        description: "Please upload a supported file (PDF, DOCX, or TXT)",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsUploading(true);
      
      let extractedText = "";
      
      // For text files, use FileReader
      if (file.type.includes('text') || file.name.endsWith('.txt')) {
        const reader = new FileReader();
        extractedText = await new Promise((resolve, reject) => {
          reader.onload = (event) => {
            if (event.target && typeof event.target.result === 'string') {
              resolve(event.target.result);
            } else {
              reject(new Error("Failed to read file"));
            }
          };
          reader.onerror = () => reject(new Error("FileReader error"));
          reader.readAsText(file);
        });
      } else {
        // For PDF/DOCX, use the document extraction API
        extractedText = await extractTextFromDocument(file);
      }
      
      // Set the content
      setNewDocumentName(file.name);
      setNewDocumentContent(extractedText);
      
      // Open the dialog to confirm
      setIsAddDocDialogOpen(true);
      
    } catch (error) {
      toast({
        title: "Error reading file",
        description: "Could not read the file content",
        variant: "destructive"
      });
      console.error("File reading error:", error);
    } finally {
      setIsUploading(false);
      
      // Reset the file input
      if (refDocFileInputRef.current) {
        refDocFileInputRef.current.value = "";
      }
    }
  };

  // Extract text from document files (PDF, DOCX, TXT)
  const extractTextFromDocument = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("document", file);
    
    try {
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
      console.error("Error extracting text:", error);
      throw error;
    }
  };

  // Associate the current text with a style
  const associateCurrentTextWithStyle = (style: StyleReference) => {
    setStyleForText(style);
    
    if (originalText.trim()) {
      // If there's text in the dictation area, use it directly
      setNewDocumentName(`Text sample ${new Date().toLocaleString()}`);
      setNewDocumentContent(originalText);
      setIsAddCurrentTextDialogOpen(true);
    } else {
      // If no text is present, open dialog to input text with multiple methods
      setIsAddCurrentTextDialogOpen(true);
    }
  };
  
  // Add the current text as a reference document to the selected style
  const addCurrentTextAsReferenceDocument = () => {
    if (!styleForText || newDocumentName.trim() === "" || newDocumentContent.trim() === "") return;
    
    const newDoc: ReferenceDocument = {
      id: Math.random().toString(36).substr(2, 9),
      name: newDocumentName,
      content: newDocumentContent,
      styleId: styleForText.id,
    };
    
    setReferenceDocuments([...referenceDocuments, newDoc]);
    
    // Update document count for the style
    setStyleReferences(
      styleReferences.map((style) =>
        style.id === styleForText.id ? { ...style, documentCount: style.documentCount + 1 } : style
      )
    );
    
    // Select this style
    setSelectedStyle(styleForText);
    
    setNewDocumentName("");
    setNewDocumentContent("");
    setIsAddCurrentTextDialogOpen(false);
    
    toast({
      title: "Text sample added",
      description: `Added text sample to "${styleForText.name}" style`,
    });
  };
  
  // Handle file upload for text sample
  const handleTextSampleFileUpload = () => {
    if (!styleForText) return;
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,text/plain,.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    
    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (!target.files || target.files.length === 0) return;
      
      const file = target.files[0];
      
      try {
        setIsUploading(true);
        
        let extractedText = "";
        
        // For text files, use FileReader
        if (file.type.includes('text') || file.name.endsWith('.txt')) {
          const reader = new FileReader();
          extractedText = await new Promise((resolve, reject) => {
            reader.onload = (event) => {
              if (event.target && typeof event.target.result === 'string') {
                resolve(event.target.result);
              } else {
                reject(new Error("Failed to read file"));
              }
            };
            reader.onerror = () => reject(new Error("FileReader error"));
            reader.readAsText(file);
          });
        } else {
          // For other document types, use the server API
          extractedText = await extractTextFromDocument(file);
        }
        
        // Set the content
        setNewDocumentName(file.name);
        setNewDocumentContent(extractedText);
        
        toast({
          title: "File processed",
          description: `Text extracted from "${file.name}"`,
        });
      } catch (error) {
        toast({
          title: "Error processing file",
          description: "Could not extract text from the file",
          variant: "destructive"
        });
        console.error("File processing error:", error);
      } finally {
        setIsUploading(false);
      }
    };
    
    input.click();
  };
  
  // Handle drag over event
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);
  
  // Handle drag leave event
  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);
  
  // Handle drop event
  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (!styleForText) return;
    
    const files = e.dataTransfer.files;
    if (files.length === 0) {
      // If no files, check if there's text
      const text = e.dataTransfer.getData('text');
      if (text) {
        setNewDocumentName(`Dropped text ${new Date().toLocaleString()}`);
        setNewDocumentContent(text);
        
        toast({
          title: "Text received",
          description: "Text has been added to the sample",
        });
      }
      return;
    }
    
    const file = files[0];
    
    try {
      setIsUploading(true);
      
      let extractedText = "";
      
      // For text files, use FileReader
      if (file.type.includes('text') || file.name.endsWith('.txt')) {
        const reader = new FileReader();
        extractedText = await new Promise((resolve, reject) => {
          reader.onload = (event) => {
            if (event.target && typeof event.target.result === 'string') {
              resolve(event.target.result);
            } else {
              reject(new Error("Failed to read file"));
            }
          };
          reader.onerror = () => reject(new Error("FileReader error"));
          reader.readAsText(file);
        });
      } else {
        // For other document types, use the server API
        extractedText = await extractTextFromDocument(file);
      }
      
      // Set the content
      setNewDocumentName(file.name);
      setNewDocumentContent(extractedText);
      
      toast({
        title: "File processed",
        description: `Text extracted from "${file.name}"`,
      });
    } catch (error) {
      toast({
        title: "Error processing file",
        description: "Could not extract text from the file",
        variant: "destructive"
      });
      console.error("File processing error:", error);
    } finally {
      setIsUploading(false);
    }
  }, [styleForText, toast]);
  
  // Handle copying text from the clipboard
  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setNewDocumentName(`Clipboard text ${new Date().toLocaleString()}`);
        setNewDocumentContent(text);
        
        toast({
          title: "Text pasted",
          description: "Text from clipboard has been added",
        });
      }
    } catch (error) {
      toast({
        title: "Clipboard error",
        description: "Could not access clipboard. Please paste text manually.",
        variant: "destructive"
      });
      console.error("Clipboard error:", error);
    }
  };
  
  // Navigate to home with selected style
  const navigateToHomeWithStyle = () => {
    if (!styleForText) return;
    
    // Set the style active in the app context
    setStyleReferences(
      styleReferences.map((style) =>
        style.id === styleForText.id ? { ...style, active: true } : style
      )
    );
    
    // Go to home page
    window.location.href = '/';
    
    toast({
      title: "Style activated",
      description: `Style "${styleForText.name}" is now active for dictation`
    });
  };
  
  // Filter documents for selected style
  const filteredDocuments = selectedStyle
    ? referenceDocuments.filter(doc => doc.styleId === selectedStyle.id)
    : [];

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Style Library</h1>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <i className="ri-add-line mr-1"></i> Add Style
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Style Reference</DialogTitle>
              <DialogDescription>
                Create a new style reference to use for text transformation
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="style-name">Style Name</Label>
                <Input 
                  id="style-name" 
                  value={newStyleName} 
                  onChange={(e) => setNewStyleName(e.target.value)} 
                  placeholder="e.g., Technical Documentation"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="style-description">Description</Label>
                <Textarea 
                  id="style-description" 
                  value={newStyleDescription} 
                  onChange={(e) => setNewStyleDescription(e.target.value)} 
                  placeholder="Describe the key characteristics of this style"
                />
              </div>
              
              <div className="grid gap-2">
                <Label>Upload a sample text document (optional)</Label>
                <div className="border-2 border-dashed rounded-md p-6 flex flex-col items-center justify-center gap-2 hover:border-primary/50 transition cursor-pointer" onClick={handleStyleDocFileUpload}>
                  <i className="ri-upload-cloud-line text-2xl text-muted-foreground"></i>
                  <p className="text-sm text-muted-foreground text-center">
                    Drop a text file here or click to upload
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    This document will be used as a reference for this style
                  </p>
                  {newDocumentName && (
                    <Badge className="mt-2" variant="outline">
                      <i className="ri-file-text-line mr-1"></i> {newDocumentName}
                    </Badge>
                  )}
                  <input
                    ref={styleDocFileInputRef}
                    type="file"
                    accept=".txt,text/plain,.pdf,application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="hidden"
                    onChange={handleStyleDocFileChange}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button onClick={addNewStyle}>Add Style</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Style Grid */}
        <div className="lg:col-span-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {styleReferences.map((style) => (
              <Card 
                key={style.id} 
                className={`cursor-pointer transition ${selectedStyle?.id === style.id ? 'ring-2 ring-primary' : ''}`}
                onClick={() => setSelectedStyle(style)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-sm">{style.name}</h3>
                    <span 
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        style.active ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 
                        'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                      }`}
                    >
                      {style.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Based on {style.documentCount} reference document{style.documentCount !== 1 ? 's' : ''}
                  </p>
                  <p className="text-xs line-clamp-3">{style.description}</p>
                  <div className="flex justify-between mt-3">
                    <div className="flex space-x-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-xs hover:text-red-500"
                        onClick={(e) => confirmDeleteStyle(style, e)}
                      >
                        <i className="ri-delete-bin-line"></i>
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-xs hover:text-blue-500"
                        onClick={(e) => {
                          e.stopPropagation();
                          associateCurrentTextWithStyle(style);
                        }}
                        title="Apply this style to the current text"
                      >
                        <i className="ri-file-text-line"></i>
                      </Button>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleStyleActive(style.id);
                      }}
                    >
                      {style.active ? 'Deactivate' : 'Activate'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {/* Add New Style Card */}
            <Card 
              className="border border-dashed flex items-center justify-center h-full py-8 cursor-pointer hover:border-primary hover:bg-primary/5 transition"
              onClick={() => setIsAddDialogOpen(true)}
            >
              <div className="flex flex-col items-center text-muted-foreground">
                <i className="ri-add-circle-line text-2xl mb-2"></i>
                <span className="text-xs">Add New Style Reference</span>
              </div>
            </Card>
          </div>
        </div>
        
        {/* Selected Style Details */}
        {selectedStyle && (
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{selectedStyle.name}</span>
                  <Dialog open={isAddDocDialogOpen} onOpenChange={setIsAddDocDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <i className="ri-add-line mr-1"></i> Add Reference Document
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Reference Document</DialogTitle>
                        <DialogDescription>
                          Add a sample document to use as a reference for this style
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="doc-name">Document Name</Label>
                          <Input 
                            id="doc-name" 
                            value={newDocumentName} 
                            onChange={(e) => setNewDocumentName(e.target.value)} 
                            placeholder="e.g., Sample Email"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="doc-content">Document Content</Label>
                          <div className="relative">
                            <Textarea 
                              id="doc-content" 
                              value={newDocumentContent} 
                              onChange={(e) => setNewDocumentContent(e.target.value)} 
                              placeholder="Paste or type the reference text here"
                              rows={10}
                              className={`${isUploading ? 'opacity-70' : ''}`}
                            />
                            <div className="absolute top-2 right-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={handleRefDocFileUpload}
                                disabled={isUploading}
                              >
                                {isUploading ? (
                                  <i className="ri-loader-2-line animate-spin"></i>
                                ) : (
                                  <i className="ri-upload-line"></i>
                                )}
                                <span className="ml-1">Upload File</span>
                              </Button>
                              <input
                                ref={refDocFileInputRef}
                                type="file"
                                accept=".txt,text/plain,.pdf,application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                className="hidden"
                                onChange={handleRefDocFileChange}
                              />
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            You can paste text directly or upload a text file to use as reference
                          </p>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddDocDialogOpen(false)}>Cancel</Button>
                        <Button onClick={addReferenceDocument}>Add Document</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="details">
                  <TabsList>
                    <TabsTrigger value="details">Style Details</TabsTrigger>
                    <TabsTrigger value="documents">Reference Documents ({filteredDocuments.length})</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="details" className="py-4">
                    <div className="grid gap-4">
                      <div>
                        <Label>Description</Label>
                        <p className="text-sm mt-1">{selectedStyle.description}</p>
                      </div>
                      <div>
                        <Label>Status</Label>
                        <p className="text-sm mt-1">{selectedStyle.active ? 'Active' : 'Inactive'}</p>
                      </div>
                      <div>
                        <Label>Document Count</Label>
                        <p className="text-sm mt-1">{selectedStyle.documentCount}</p>
                      </div>
                      <div className="flex justify-end space-x-2 mt-4">
                        <Button 
                          variant="outline" 
                          onClick={() => toggleStyleActive(selectedStyle.id)}
                        >
                          {selectedStyle.active ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button 
                          variant="destructive" 
                          onClick={() => confirmDeleteStyle(selectedStyle)}
                        >
                          <i className="ri-delete-bin-line mr-1"></i> Delete Style
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="documents" className="py-4">
                    {filteredDocuments.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>No reference documents added yet</p>
                        <div className="flex items-center justify-center space-x-2 mt-4">
                          <Button onClick={() => setIsAddDocDialogOpen(true)}>
                            <i className="ri-add-line mr-1"></i> Add Document
                          </Button>
                          <Button variant="outline" onClick={handleRefDocFileUpload}>
                            <i className="ri-upload-line mr-1"></i> Upload Document
                          </Button>
                          <input
                            ref={refDocFileInputRef}
                            type="file"
                            accept=".txt,text/plain,.pdf,application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                            className="hidden"
                            onChange={handleRefDocFileChange}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-end space-x-2 mb-2">
                          <Button size="sm" onClick={() => setIsAddDocDialogOpen(true)}>
                            <i className="ri-add-line mr-1"></i> Add Document
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleRefDocFileUpload}>
                            <i className="ri-upload-line mr-1"></i> Upload Document
                          </Button>
                          <input
                            ref={refDocFileInputRef}
                            type="file"
                            accept=".txt,text/plain,.pdf,application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                            className="hidden"
                            onChange={handleRefDocFileChange}
                          />
                        </div>
                        
                        {filteredDocuments.map((doc) => (
                          <Card key={doc.id}>
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center">
                                  <h3 className="font-medium">{doc.name}</h3>
                                  <Badge variant="outline" className="ml-2">
                                    text
                                  </Badge>
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="hover:text-red-500"
                                  onClick={() => confirmDeleteDocument(doc.id, doc.name, selectedStyle.id)}
                                >
                                  <i className="ri-delete-bin-line"></i>
                                </Button>
                              </div>
                              <div className="border rounded-md p-3 bg-accent/5 max-h-[200px] overflow-auto">
                                <p className="text-sm whitespace-pre-wrap">{doc.content}</p>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
      
      {/* Delete Style Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Style</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this style? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {styleToDelete && (
              <div className="bg-muted/50 p-3 rounded-md">
                <p className="font-medium text-sm">{styleToDelete.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{styleToDelete.description}</p>
                <div className="flex items-center mt-2">
                  <Badge variant="outline" className="text-xs">
                    {styleToDelete.documentCount} document{styleToDelete.documentCount !== 1 ? 's' : ''}
                  </Badge>
                  <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                    styleToDelete.active ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 
                    'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                  }`}>
                    {styleToDelete.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="flex space-x-2 sm:justify-end">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={deleteStyle}>
              Delete Style
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Document Confirmation Dialog */}
      <Dialog open={isDeleteDocDialogOpen} onOpenChange={setIsDeleteDocDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Document</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this reference document? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {docToDelete && (
              <div className="bg-muted/50 p-3 rounded-md">
                <p className="font-medium text-sm">{docToDelete.name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  This document will be removed from the reference library.
                </p>
              </div>
            )}
          </div>
          <DialogFooter className="flex space-x-2 sm:justify-end">
            <Button variant="outline" onClick={() => setIsDeleteDocDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={deleteDocument}>
              Delete Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add Text to Style Dialog */}
      <Dialog open={isAddCurrentTextDialogOpen} onOpenChange={setIsAddCurrentTextDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Add Text to Style: {styleForText?.name}</DialogTitle>
            <DialogDescription>
              Add text to use as a reference for this style. You can type, paste, upload, or drag & drop text.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="text-sample-name">Sample Name</Label>
              <Input 
                id="text-sample-name" 
                value={newDocumentName} 
                onChange={(e) => setNewDocumentName(e.target.value)} 
                placeholder="e.g., Essay Sample, Email Template"
              />
            </div>
            
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="text-sample-content">Text Content</Label>
                <div className="flex items-center space-x-2">
                  <Button 
                    type="button" 
                    size="sm" 
                    variant="outline" 
                    className="h-8 text-xs"
                    onClick={handleTextSampleFileUpload}
                  >
                    <i className="ri-upload-line mr-1"></i> Upload
                  </Button>
                  <Button 
                    type="button" 
                    size="sm" 
                    variant="outline" 
                    className="h-8 text-xs"
                    onClick={handlePasteFromClipboard}
                  >
                    <i className="ri-clipboard-line mr-1"></i> Paste
                  </Button>
                </div>
              </div>
              
              <div 
                ref={dropzoneRef}
                className={`relative border rounded-md transition ${
                  isDragging ? 'border-primary border-2' : 'border-input'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <Textarea 
                  id="text-sample-content" 
                  value={newDocumentContent} 
                  onChange={(e) => setNewDocumentContent(e.target.value)} 
                  placeholder="Type or paste your text here. You can also drag and drop text or files onto this area."
                  rows={10}
                  className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                
                {isDragging && (
                  <div className="absolute inset-0 bg-primary/10 flex items-center justify-center rounded-md">
                    <div className="bg-background p-4 rounded-md shadow-lg">
                      <p className="text-center">Drop your text or file here</p>
                    </div>
                  </div>
                )}
              </div>
              
              <p className="text-xs text-muted-foreground">
                Drag and drop a text or document file here, or use the buttons above to upload or paste content.
              </p>
            </div>
            
            {originalText && (
              <Alert>
                <AlertDescription className="text-sm">
                  Text from the dictation area has been automatically added. You can edit it as needed.
                </AlertDescription>
              </Alert>
            )}
          </div>
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 order-2 sm:order-1">
              <Button 
                variant="outline" 
                onClick={() => setIsAddCurrentTextDialogOpen(false)}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 order-1 sm:order-2">
              <Button 
                type="button"
                onClick={addCurrentTextAsReferenceDocument}
                className="w-full sm:w-auto"
                disabled={!newDocumentContent.trim() || !newDocumentName.trim()}
              >
                <i className="ri-file-add-line mr-1"></i> Add Text Sample
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StyleLibrary;
