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

const StyleLibrarySection = () => {
  const { styleReferences, setStyleReferences, originalText } = useAppContext();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAddDocDialogOpen, setIsAddDocDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [styleToDelete, setStyleToDelete] = useState<StyleReference | null>(null);
  const [newStyleName, setNewStyleName] = useState("");
  const [newStyleDescription, setNewStyleDescription] = useState("");
  const [selectedStyleId, setSelectedStyleId] = useState<number | null>(null);
  const [newDocumentName, setNewDocumentName] = useState("");
  const [newDocumentContent, setNewDocumentContent] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [referenceDocuments, setReferenceDocuments] = useState<ReferenceDocument[]>([]);
  
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropzoneRef = useRef<HTMLDivElement>(null);
  const { processDocument } = useDocumentProcessor();

  const toggleStyleActive = (id: number) => {
    setStyleReferences(
      styleReferences.map((style) =>
        style.id === id ? { ...style, active: !style.active } : style
      )
    );
  };

  const addNewStyle = () => {
    if (newStyleName.trim() === "") return;
    
    const newStyle: StyleReference = {
      id: Date.now(),
      name: newStyleName,
      description: newStyleDescription,
      active: false,
      documentCount: 0,
    };
    
    setStyleReferences([...styleReferences, newStyle]);
    setNewStyleName("");
    setNewStyleDescription("");
    setIsAddDialogOpen(false);
  };

  const openAddDocDialog = (styleId: number) => {
    setSelectedStyleId(styleId);
    setNewDocumentName("");
    setNewDocumentContent(originalText || "");
    setIsAddDocDialogOpen(true);
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
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleFileUpload(file);
    } else if (e.dataTransfer.getData('text')) {
      setNewDocumentContent(e.dataTransfer.getData('text'));
    }
  };

  const handleFileUpload = async (file: File) => {
    try {
      setIsUploading(true);
      const extractedText = await processDocument(file);
      setNewDocumentContent(extractedText);
      if (!newDocumentName) {
        setNewDocumentName(file.name.replace(/\.[^/.]+$/, ""));
      }
    } catch (error) {
      console.error("Error processing file:", error);
      // Display error to user
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const addReferenceDocument = () => {
    if (!selectedStyleId || !newDocumentName.trim() || !newDocumentContent.trim()) return;
    
    const newDoc: ReferenceDocument = {
      id: Date.now().toString(),
      name: newDocumentName,
      content: newDocumentContent,
      styleId: selectedStyleId
    };
    
    setReferenceDocuments([...referenceDocuments, newDoc]);
    
    // Update document count for the style
    setStyleReferences(
      styleReferences.map(style => 
        style.id === selectedStyleId 
          ? { ...style, documentCount: style.documentCount + 1 }
          : style
      )
    );
    
    setIsAddDocDialogOpen(false);
    setNewDocumentName("");
    setNewDocumentContent("");
  };
  
  // Open delete confirmation dialog for a style
  const confirmDeleteStyle = (styleId: number, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }
    
    const styleToDelete = styleReferences.find(style => style.id === styleId);
    if (styleToDelete) {
      setStyleToDelete(styleToDelete);
      setIsDeleteDialogOpen(true);
    }
  };
  
  // Delete a style and all its associated documents
  const handleDeleteStyle = () => {
    if (!styleToDelete) return;
    
    const styleId = styleToDelete.id;
    
    // Remove all documents associated with this style
    setReferenceDocuments(referenceDocuments.filter(doc => doc.styleId !== styleId));
    
    // Remove the style itself
    setStyleReferences(styleReferences.filter(style => style.id !== styleId));
    
    // Reset selected style if it was the one deleted
    if (selectedStyleId === styleId) {
      setSelectedStyleId(null);
    }
    
    toast({
      title: "Style deleted",
      description: `Style reference "${styleToDelete.name}" and all its documents have been removed`
    });
    
    setStyleToDelete(null);
    setIsDeleteDialogOpen(false);
  };

  return (
    <section className="mb-8">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium">Personal Style Library</h2>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center" size="sm">
                  <i className="ri-add-line mr-1"></i> Add Reference
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
                    <Label htmlFor="name">Style Name</Label>
                    <Input 
                      id="name" 
                      value={newStyleName} 
                      onChange={(e) => setNewStyleName(e.target.value)} 
                      placeholder="e.g., Technical Documentation"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea 
                      id="description" 
                      value={newStyleDescription} 
                      onChange={(e) => setNewStyleDescription(e.target.value)} 
                      placeholder="Describe the key characteristics of this style"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Upload a sample text document (optional)</Label>
                    <div 
                      className="border border-dashed rounded-md p-6 text-center cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={triggerFileInput}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      {isUploading ? (
                        <div className="flex flex-col items-center justify-center">
                          <i className="ri-loader-2-line animate-spin text-2xl mb-2"></i>
                          <p className="text-sm">Processing file...</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center">
                          <i className="ri-upload-cloud-2-line text-2xl mb-2"></i>
                          <p className="text-sm">Drop a text file here or click to upload</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Supports TXT, PDF, and Word documents
                          </p>
                        </div>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept=".txt,text/plain,.pdf,application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        onChange={handleFileInputChange}
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
          
          {/* Style References */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {styleReferences.map((style) => (
              <div key={style.id} className="border rounded-lg overflow-hidden">
                <div className="p-4">
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
                      variant="outline" 
                      size="sm" 
                      className="text-xs"
                      onClick={() => openAddDocDialog(style.id)}
                    >
                      <i className="ri-file-add-line mr-1"></i> Add Document
                    </Button>
                    <div className="flex space-x-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-xs"
                        onClick={() => toggleStyleActive(style.id)}
                      >
                        {style.active ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-xs text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                        onClick={(e) => confirmDeleteStyle(style.id, e)}
                      >
                        <i className="ri-delete-bin-line mr-1"></i>Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Add New Style Card */}
            <div className="border border-dashed rounded-lg overflow-hidden flex items-center justify-center h-full py-8">
              <Button 
                variant="ghost" 
                className="flex flex-col items-center text-muted-foreground hover:text-primary"
                onClick={() => setIsAddDialogOpen(true)}
              >
                <i className="ri-add-circle-line text-2xl mb-2"></i>
                <span className="text-xs">Add New Style Reference</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Document Dialog */}
      <Dialog open={isAddDocDialogOpen} onOpenChange={setIsAddDocDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Add Reference Document</DialogTitle>
            <DialogDescription>
              Add a document to use as a reference for this style. You can type, paste, upload, or drag & drop text.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="doc-name">Document Name</Label>
              <Input 
                id="doc-name" 
                value={newDocumentName} 
                onChange={(e) => setNewDocumentName(e.target.value)} 
                placeholder="e.g., Sample Article, Email Template"
              />
            </div>
            
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="doc-content">Document Content</Label>
                <div className="flex items-center space-x-2">
                  <Button 
                    type="button" 
                    size="sm" 
                    variant="outline" 
                    className="h-8 text-xs"
                    onClick={triggerFileInput}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <i className="ri-loader-2-line animate-spin mr-1"></i>
                    ) : (
                      <i className="ri-upload-line mr-1"></i>
                    )}
                    Upload
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
                  id="doc-content" 
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
                Drag and drop a text or document file here, or use the upload button above to add content.
              </p>
            </div>
            
            {originalText && !newDocumentContent && (
              <Alert>
                <AlertDescription className="text-sm">
                  Text from the dictation area can be automatically added. Just click in the content area to edit.
                </AlertDescription>
              </Alert>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDocDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={addReferenceDocument}
              disabled={!newDocumentContent.trim() || !newDocumentName.trim()}
            >
              Add Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this style reference? This will also delete all associated documents.
              {styleToDelete && <p className="font-medium mt-2">{styleToDelete.name}</p>}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteStyle}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default StyleLibrarySection;
