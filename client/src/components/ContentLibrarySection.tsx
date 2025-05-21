import { useState, useRef, DragEvent } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAppContext } from "@/context/AppContext";
import { useDocumentProcessor } from "@/hooks/useDocumentProcessor";
import { useToast } from "@/hooks/use-toast";

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

const ContentLibrarySection = () => {
  const { contentReferences, setContentReferences, originalText } = useAppContext();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAddDocDialogOpen, setIsAddDocDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [contentToDelete, setContentToDelete] = useState<ContentReference | null>(null);
  const [documentToDelete, setDocumentToDelete] = useState<ContentDocument | null>(null);
  const [isDocumentDeleteDialogOpen, setIsDocumentDeleteDialogOpen] = useState(false);
  const [newContentName, setNewContentName] = useState("");
  const [newContentDescription, setNewContentDescription] = useState("");
  const [selectedContentId, setSelectedContentId] = useState<number | null>(null);
  const [newDocumentName, setNewDocumentName] = useState("");
  const [newDocumentContent, setNewDocumentContent] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [contentDocuments, setContentDocuments] = useState<ContentDocument[]>([]);
  const [isEditContentDialogOpen, setIsEditContentDialogOpen] = useState(false);
  const [editingContent, setEditingContent] = useState<ContentReference | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const contentFileInputRef = useRef<HTMLInputElement>(null);
  const dropzoneRef = useRef<HTMLDivElement>(null);
  const { processDocument } = useDocumentProcessor();
  const { toast } = useToast();

  const toggleContentActive = (id: number) => {
    setContentReferences(
      contentReferences.map((content) =>
        content.id === id ? { ...content, active: !content.active } : content
      )
    );
  };

  const handleAddContent = () => {
    // Generate a default name if empty
    let contentName = newContentName.trim();
    if (!contentName) {
      contentName = newDocumentName ? 
        `Content based on ${newDocumentName}` : 
        `Content ${contentReferences.length + 1}`;
    }

    const newContentId = Date.now();
    const hasDocument = newDocumentContent && newDocumentName;
    
    const newContent: ContentReference = {
      id: newContentId,
      name: contentName,
      description: newContentDescription || "Content reference",
      active: true,
      documentCount: hasDocument ? 1 : 0
    };
    
    // Add the content first
    setContentReferences([...contentReferences, newContent]);
    
    // If we have document content from an upload, add it to the new content reference
    if (hasDocument) {
      const newDoc: ContentDocument = {
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
    
    // Select the newly created content
    setSelectedContentId(newContentId);

    toast({
      title: "Success",
      description: hasDocument 
        ? "Content reference and document added successfully" 
        : "Content reference added successfully"
    });
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

    const newDoc: ContentDocument = {
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

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: DragEvent) => {
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

      const newDoc: ContentDocument = {
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

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      await handleFileUpload(file);
      e.target.value = '';
    }
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
  
  // Confirm deleting a content reference
  const confirmDeleteContent = (contentId: number, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }
    
    const content = contentReferences.find(item => item.id === contentId);
    if (content) {
      setContentToDelete(content);
      setIsDeleteDialogOpen(true);
    }
  };
  
  // Delete a content reference and all associated documents
  const handleDeleteContent = () => {
    if (!contentToDelete) return;
    
    const contentId = contentToDelete.id;
    
    // Remove all documents associated with this content
    setContentDocuments(contentDocuments.filter(doc => doc.contentId !== contentId));
    
    // Remove the content reference itself
    setContentReferences(contentReferences.filter(content => content.id !== contentId));
    
    // Reset selected content if it was the one deleted
    if (selectedContentId === contentId) {
      setSelectedContentId(null);
    }
    
    toast({
      title: "Content deleted",
      description: `Content reference "${contentToDelete.name}" and all its documents have been removed`
    });
    
    setContentToDelete(null);
    setIsDeleteDialogOpen(false);
  };
  
  // Open edit dialog for a content reference
  const openEditContentDialog = (contentId: number, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }
    
    const content = contentReferences.find(item => item.id === contentId);
    if (content) {
      setEditingContent(content);
      setNewContentName(content.name);
      setNewContentDescription(content.description);
      setIsEditContentDialogOpen(true);
    }
  };
  
  // Update content reference
  const handleUpdateContent = () => {
    if (!editingContent) return;
    
    // Update with new values
    const updatedReferences = contentReferences.map(content => 
      content.id === editingContent.id 
        ? {
            ...content,
            name: newContentName.trim() || content.name,
            description: newContentDescription || content.description
          }
        : content
    );
    
    setContentReferences(updatedReferences);
    
    // Reset state
    setEditingContent(null);
    setNewContentName("");
    setNewContentDescription("");
    setIsEditContentDialogOpen(false);
    
    toast({
      title: "Content updated",
      description: "Content reference has been updated successfully"
    });
  };
  
  // Confirm deleting a document
  const confirmDeleteDocument = (documentId: string, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }
    
    const document = contentDocuments.find(doc => doc.id === documentId);
    if (document) {
      setDocumentToDelete(document);
      setIsDocumentDeleteDialogOpen(true);
    }
  };
  
  // Delete a single document
  const handleDeleteDocument = () => {
    if (!documentToDelete || !selectedContentId) return;
    
    // Remove the document
    setContentDocuments(contentDocuments.filter(doc => doc.id !== documentToDelete.id));
    
    // Update the document count for the content reference
    setContentReferences(
      contentReferences.map(content => 
        content.id === selectedContentId
          ? { ...content, documentCount: content.documentCount - 1 }
          : content
      )
    );
    
    toast({
      title: "Document deleted",
      description: `Document "${documentToDelete.name}" has been removed`
    });
    
    setDocumentToDelete(null);
    setIsDocumentDeleteDialogOpen(false);
  };

  return (
    <section className="mb-8">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium">Personal Content Library</h2>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center" size="sm">
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
                          const file = e.dataTransfer.files[0];
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
          </div>

          {contentReferences.length === 0 ? (
            <Alert>
              <AlertDescription>
                No content references found. Add a new content reference to get started.
              </AlertDescription>
            </Alert>
          ) : (
            <div>
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
                      <div className="flex space-x-1">
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
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => openEditContentDialog(content.id, e)}
                        >
                          <i className="ri-edit-line"></i>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                          onClick={(e) => confirmDeleteContent(content.id, e)}
                        >
                          <i className="ri-delete-bin-line"></i>
                        </Button>
                      </div>
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
                        ref={fileInputRef}
                        type="file"
                        accept=".txt,.pdf,.docx,.doc,.rtf"
                        className="hidden"
                        onChange={handleFileInputChange}
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
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
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
            </div>
          )}

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
        </CardContent>
      </Card>
      
      {/* Edit Content Dialog */}
      <Dialog open={isEditContentDialogOpen} onOpenChange={setIsEditContentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Content Reference</DialogTitle>
            <DialogDescription>
              Update this content reference's details
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Content Name</Label>
              <Input 
                id="edit-name" 
                value={newContentName} 
                onChange={(e) => setNewContentName(e.target.value)} 
                placeholder="e.g., Marketing Materials"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea 
                id="edit-description" 
                value={newContentDescription} 
                onChange={(e) => setNewContentDescription(e.target.value)} 
                placeholder="Describe the purpose of this content reference"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsEditContentDialogOpen(false);
              setEditingContent(null);
              setNewContentName("");
              setNewContentDescription("");
            }}>
              Cancel
            </Button>
            <Button onClick={handleUpdateContent}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Content Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this content reference? This will also delete all associated documents.
              {contentToDelete && <span className="block font-medium mt-2">{contentToDelete.name}</span>}
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
      
      {/* Delete Document Dialog */}
      <Dialog open={isDocumentDeleteDialogOpen} onOpenChange={setIsDocumentDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Document Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this document?
              {documentToDelete && <span className="block font-medium mt-2">{documentToDelete.name}</span>}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDocumentDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteDocument}>
              Delete Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default ContentLibrarySection;