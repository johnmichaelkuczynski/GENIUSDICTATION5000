import { useState, useRef } from "react";
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
  const { styleReferences, setStyleReferences } = useAppContext();
  const { toast } = useToast();
  const [referenceDocuments, setReferenceDocuments] = useState<ReferenceDocument[]>([]);
  const [selectedStyle, setSelectedStyle] = useState<StyleReference | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAddDocDialogOpen, setIsAddDocDialogOpen] = useState(false);
  const [newStyleName, setNewStyleName] = useState("");
  const [newStyleDescription, setNewStyleDescription] = useState("");
  const [newDocumentName, setNewDocumentName] = useState("");
  const [newDocumentContent, setNewDocumentContent] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  
  // References for file inputs
  const styleDocFileInputRef = useRef<HTMLInputElement>(null);
  const refDocFileInputRef = useRef<HTMLInputElement>(null);

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

  const deleteStyle = (id: number) => {
    setStyleReferences(styleReferences.filter(style => style.id !== id));
    setReferenceDocuments(referenceDocuments.filter(doc => doc.styleId !== id));
    if (selectedStyle?.id === id) {
      setSelectedStyle(null);
    }
  };

  const deleteDocument = (id: string, styleId: number) => {
    setReferenceDocuments(referenceDocuments.filter(doc => doc.id !== id));
    
    // Update document count for the style
    setStyleReferences(
      styleReferences.map((style) =>
        style.id === styleId ? { ...style, documentCount: style.documentCount - 1 } : style
      )
    );
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
          // Set the content
          setNewDocumentName(file.name);
          setNewDocumentContent(event.target.result);
          
          // Open the dialog to confirm
          setIsAddDocDialogOpen(true);
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
                    accept=".txt,text/plain"
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
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-xs hover:text-red-500"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteStyle(style.id);
                      }}
                    >
                      <i className="ri-delete-bin-line"></i>
                    </Button>
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
                                <span className="ml-1">Upload TXT</span>
                              </Button>
                              <input
                                ref={refDocFileInputRef}
                                type="file"
                                accept=".txt,text/plain"
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
                            <i className="ri-upload-line mr-1"></i> Upload Text File
                          </Button>
                          <input
                            ref={refDocFileInputRef}
                            type="file"
                            accept=".txt,text/plain"
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
                            <i className="ri-upload-line mr-1"></i> Upload Text
                          </Button>
                          <input
                            ref={refDocFileInputRef}
                            type="file"
                            accept=".txt,text/plain"
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
                                  onClick={() => deleteDocument(doc.id, selectedStyle.id)}
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
    </div>
  );
};

export default StyleLibrary;
