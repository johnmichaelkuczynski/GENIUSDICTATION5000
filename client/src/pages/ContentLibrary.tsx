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
import { useDocumentProcessor } from "@/hooks/useDocumentProcessor";

interface ContentReference {
  id: number;
  name: string;
  description: string;
  active: boolean;
  documentCount: number;
}

interface ContentDocument {
  id: string;
  name: string;
  content: string;
  contentId: number;
}

const ContentLibrary = () => {
  const { 
    contentReferences, 
    setContentReferences, 
    originalText, 
    setOriginalText 
  } = useAppContext();
  
  const { toast } = useToast();
  const { processDocument } = useDocumentProcessor();
  const [referenceDocuments, setReferenceDocuments] = useState<ContentDocument[]>([]);
  const [selectedContent, setSelectedContent] = useState<ContentReference | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAddDocDialogOpen, setIsAddDocDialogOpen] = useState(false);
  const [isAddCurrentTextDialogOpen, setIsAddCurrentTextDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [contentToDelete, setContentToDelete] = useState<ContentReference | null>(null);
  const [contentForText, setContentForText] = useState<ContentReference | null>(null);
  const [newContentName, setNewContentName] = useState("");
  const [newContentDescription, setNewContentDescription] = useState("");
  const [newDocumentName, setNewDocumentName] = useState("");
  const [newDocumentContent, setNewDocumentContent] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  
  // State for drag and drop
  const [isDragging, setIsDragging] = useState(false);
  
  // References for file inputs
  const contentDocFileInputRef = useRef<HTMLInputElement>(null);
  const refDocFileInputRef = useRef<HTMLInputElement>(null);
  const dropzoneRef = useRef<HTMLDivElement>(null);

  // Add a new content reference
  const handleAddContent = () => {
    if (!newContentName.trim()) {
      toast({
        title: "Error",
        description: "Content name cannot be empty",
        variant: "destructive"
      });
      return;
    }

    const newContent: ContentReference = {
      id: Date.now(),
      name: newContentName,
      description: newContentDescription,
      active: true,
      documentCount: 0
    };

    setContentReferences([...contentReferences, newContent]);
    setNewContentName("");
    setNewContentDescription("");
    setIsAddDialogOpen(false);

    toast({
      title: "Success",
      description: "Content reference added successfully"
    });
  };

  // Add a new document to a content reference
  const handleAddDocument = () => {
    if (!selectedContent) {
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

    const newDoc: ContentDocument = {
      id: Date.now().toString(),
      name: newDocumentName,
      content: newDocumentContent,
      contentId: selectedContent.id
    };

    setReferenceDocuments([...referenceDocuments, newDoc]);
    
    // Update document count for the selected content reference
    setContentReferences(
      contentReferences.map(content => 
        content.id === selectedContent.id
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

  // Delete a content reference
  const confirmDeleteContent = (content: ContentReference, event?: React.MouseEvent<HTMLButtonElement>) => {
    if (event) {
      event.stopPropagation();
    }
    
    setContentToDelete(content);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteContent = () => {
    if (!contentToDelete) return;
    
    // Remove content reference and associated documents
    setContentReferences(contentReferences.filter(content => content.id !== contentToDelete.id));
    setReferenceDocuments(referenceDocuments.filter(doc => doc.contentId !== contentToDelete.id));
    
    setContentToDelete(null);
    setIsDeleteDialogOpen(false);
    
    // If the deleted content was selected, clear selection
    if (selectedContent && selectedContent.id === contentToDelete.id) {
      setSelectedContent(null);
    }
    
    toast({
      title: "Success",
      description: "Content reference deleted successfully"
    });
  };

  // Toggle active state of a content reference
  const handleToggleActive = (content: ContentReference, event?: React.MouseEvent<HTMLButtonElement>) => {
    if (event) {
      event.stopPropagation();
    }
    
    setContentReferences(
      contentReferences.map(c => 
        c.id === content.id
          ? { ...c, active: !c.active }
          : c
      )
    );
  };

  // Extract text from document file
  const extractTextFromDocument = async (file: File): Promise<string> => {
    try {
      setIsUploading(true);
      const text = await processDocument(file);
      setIsUploading(false);
      return text;
    } catch (error) {
      setIsUploading(false);
      console.error("Error extracting text:", error);
      toast({
        title: "Error",
        description: "Failed to extract text from document",
        variant: "destructive"
      });
      return "";
    }
  };

  // Associate current text with a content reference
  const associateCurrentTextWithContent = (content: ContentReference) => {
    if (!originalText.trim()) {
      toast({
        title: "Error",
        description: "There is no text in the editor to add",
        variant: "destructive"
      });
      return;
    }
    
    setContentForText(content);
    setNewDocumentName(`Document ${referenceDocuments.filter(doc => doc.contentId === content.id).length + 1}`);
    setNewDocumentContent(originalText);
    setIsAddCurrentTextDialogOpen(true);
  };

  // Save text from editor as a document
  const saveCurrentTextAsDocument = () => {
    if (!contentForText) return;
    
    const newDoc: ContentDocument = {
      id: Date.now().toString(),
      name: newDocumentName,
      content: newDocumentContent,
      contentId: contentForText.id
    };
    
    setReferenceDocuments([...referenceDocuments, newDoc]);
    
    // Update document count for the content
    setContentReferences(
      contentReferences.map(content => 
        content.id === contentForText.id
          ? { ...content, documentCount: content.documentCount + 1 }
          : content
      )
    );
    
    setNewDocumentName("");
    setNewDocumentContent("");
    setContentForText(null);
    setIsAddCurrentTextDialogOpen(false);
    
    toast({
      title: "Success",
      description: "Document added successfully from editor text"
    });
  };

  // Handle file upload for content references
  const handleFileUpload = async (file: File) => {
    if (!selectedContent) {
      toast({
        title: "Error",
        description: "Please select a content reference first",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const extractedText = await extractTextFromDocument(file);
      if (!extractedText) return;
      
      const newDoc: ContentDocument = {
        id: Date.now().toString(),
        name: file.name,
        content: extractedText,
        contentId: selectedContent.id
      };
      
      setReferenceDocuments([...referenceDocuments, newDoc]);
      
      // Update document count for the selected content
      setContentReferences(
        contentReferences.map(content => 
          content.id === selectedContent.id
            ? { ...content, documentCount: content.documentCount + 1 }
            : content
        )
      );
      
      toast({
        title: "Success",
        description: "Document added successfully from file"
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        title: "Error",
        description: "Failed to process document",
        variant: "destructive"
      });
    }
  };

  // Drag and drop functionality
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (!selectedContent) {
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

  // Trigger file input when button is clicked
  const handleSelectFile = () => {
    if (refDocFileInputRef.current) {
      refDocFileInputRef.current.click();
    }
  };

  // Handle file input change
  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      await handleFileUpload(file);
      e.target.value = '';
    }
  };

  // Use reference document as the current text
  const useDocumentAsText = (doc: ContentDocument) => {
    setOriginalText(doc.content);
    
    toast({
      title: "Success",
      description: "Document content loaded into editor"
    });
    
    // Navigate to the home page
    window.location.href = "/";
  };

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Content Library</h1>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <i className="ri-add-line mr-1"></i> Add Content
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Content Reference</DialogTitle>
              <DialogDescription>
                Create a new content reference to use for text transformation
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="content-name">Content Name</Label>
                <Input 
                  id="content-name" 
                  value={newContentName} 
                  onChange={(e) => setNewContentName(e.target.value)} 
                  placeholder="e.g., Marketing Materials"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="content-description">Description</Label>
                <Textarea 
                  id="content-description" 
                  value={newContentDescription} 
                  onChange={(e) => setNewContentDescription(e.target.value)} 
                  placeholder="Describe the purpose of this content reference"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAddContent}>Add Content</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Content References</CardTitle>
            </CardHeader>
            <CardContent>
              {contentReferences.length === 0 ? (
                <Alert>
                  <AlertDescription>
                    No content references found. Add a new content reference to get started.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-3">
                  {contentReferences.map((content) => (
                    <div
                      key={content.id}
                      className={`p-3 border rounded-md cursor-pointer ${
                        selectedContent?.id === content.id
                          ? "border-primary bg-accent/20"
                          : "border-border hover:border-primary/50"
                      }`}
                      onClick={() => setSelectedContent(content)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{content.name}</div>
                        <div className="flex space-x-1">
                          <Badge variant={content.active ? "default" : "outline"}>
                            {content.active ? "Active" : "Inactive"}
                          </Badge>
                          <Badge variant="outline">{content.documentCount} docs</Badge>
                        </div>
                      </div>
                      {content.description && (
                        <div className="text-sm text-muted-foreground mt-1">
                          {content.description}
                        </div>
                      )}
                      <div className="flex mt-2 space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => handleToggleActive(content, e)}
                        >
                          {content.active ? "Deactivate" : "Activate"}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={(e) => confirmDeleteContent(content, e)}
                        >
                          Delete
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            associateCurrentTextWithContent(content);
                          }}
                        >
                          Add Current Text
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  {selectedContent
                    ? `Documents for ${selectedContent.name}`
                    : "Select a content reference"}
                </CardTitle>
                {selectedContent && (
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      onClick={() => setIsAddDocDialogOpen(true)}
                    >
                      <i className="ri-add-line mr-1"></i> Add Document
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleSelectFile}
                    >
                      <i className="ri-upload-line mr-1"></i> Upload
                    </Button>
                    <input
                      ref={refDocFileInputRef}
                      type="file"
                      accept=".txt,.pdf,.docx,.doc,.rtf"
                      className="hidden"
                      onChange={handleFileInputChange}
                    />
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!selectedContent ? (
                <Alert>
                  <AlertDescription>
                    Select a content reference to view and manage its documents.
                  </AlertDescription>
                </Alert>
              ) : referenceDocuments.filter(
                  (doc) => doc.contentId === selectedContent.id
                ).length === 0 ? (
                <div>
                  <Alert className="mb-4">
                    <AlertDescription>
                      No documents found for this content reference. Add a document or upload a file.
                    </AlertDescription>
                  </Alert>
                  <div
                    ref={dropzoneRef}
                    className={`border-2 border-dashed rounded-md p-8 text-center ${
                      isDragging
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <div className="text-2xl mb-2">
                      <i className="ri-upload-cloud-line"></i>
                    </div>
                    <p className="text-muted-foreground mb-2">
                      Drag and drop a document here, or{" "}
                      <button
                        className="text-primary hover:underline"
                        onClick={handleSelectFile}
                      >
                        click to browse
                      </button>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Supported formats: TXT, PDF, DOCX, DOC, RTF
                    </p>
                    {isUploading && (
                      <div className="mt-2">
                        <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
                        <p className="text-sm mt-1">Processing document...</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <div
                    ref={dropzoneRef}
                    className={`border-2 border-dashed rounded-md p-4 mb-4 text-center ${
                      isDragging
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <p className="text-sm text-muted-foreground">
                      Drag and drop a document here to add to this content reference
                    </p>
                    {isUploading && (
                      <div className="mt-2">
                        <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
                        <p className="text-sm mt-1">Processing document...</p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    {referenceDocuments
                      .filter((doc) => doc.contentId === selectedContent.id)
                      .map((doc) => (
                        <div
                          key={doc.id}
                          className="p-3 border rounded-md"
                        >
                          <div className="flex items-center justify-between">
                            <div className="font-medium">{doc.name}</div>
                            <Button
                              size="sm"
                              onClick={() => useDocumentAsText(doc)}
                            >
                              Use as Text
                            </Button>
                          </div>
                          <div className="mt-2 text-sm text-muted-foreground max-h-20 overflow-hidden text-ellipsis">
                            {doc.content.length > 200
                              ? `${doc.content.substring(0, 200)}...`
                              : doc.content}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Document Dialog */}
      <Dialog open={isAddDocDialogOpen} onOpenChange={setIsAddDocDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Document</DialogTitle>
            <DialogDescription>
              Add a document to the selected content reference
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="doc-name">Document Name</Label>
              <Input
                id="doc-name"
                value={newDocumentName}
                onChange={(e) => setNewDocumentName(e.target.value)}
                placeholder="e.g., Product Description"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="doc-content">Content</Label>
              <Textarea
                id="doc-content"
                value={newDocumentContent}
                onChange={(e) => setNewDocumentContent(e.target.value)}
                placeholder="Enter the document content"
                rows={10}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddDocDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleAddDocument}>Add Document</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Current Text Dialog */}
      <Dialog
        open={isAddCurrentTextDialogOpen}
        onOpenChange={setIsAddCurrentTextDialogOpen}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Current Text as Document</DialogTitle>
            <DialogDescription>
              Add the text from the editor as a document to the selected content reference
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="current-doc-name">Document Name</Label>
              <Input
                id="current-doc-name"
                value={newDocumentName}
                onChange={(e) => setNewDocumentName(e.target.value)}
                placeholder="e.g., Product Description"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="current-doc-content">Content Preview</Label>
              <div className="border rounded-md p-3 max-h-60 overflow-y-auto text-sm">
                {newDocumentContent.length > 500
                  ? `${newDocumentContent.substring(0, 500)}...`
                  : newDocumentContent}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddCurrentTextDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={saveCurrentTextAsDocument}>Add Document</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this content reference? This will also delete all associated documents.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteContent}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContentLibrary;