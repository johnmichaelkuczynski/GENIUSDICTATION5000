import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppContext } from "@/context/AppContext";

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
  const [referenceDocuments, setReferenceDocuments] = useState<ReferenceDocument[]>([]);
  const [selectedStyle, setSelectedStyle] = useState<StyleReference | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAddDocDialogOpen, setIsAddDocDialogOpen] = useState(false);
  const [newStyleName, setNewStyleName] = useState("");
  const [newStyleDescription, setNewStyleDescription] = useState("");
  const [newDocumentName, setNewDocumentName] = useState("");
  const [newDocumentContent, setNewDocumentContent] = useState("");

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
                          <Textarea 
                            id="doc-content" 
                            value={newDocumentContent} 
                            onChange={(e) => setNewDocumentContent(e.target.value)} 
                            placeholder="Paste or type the reference text here"
                            rows={10}
                          />
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
                        <Button className="mt-4" onClick={() => setIsAddDocDialogOpen(true)}>
                          Add Reference Document
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {filteredDocuments.map((doc) => (
                          <Card key={doc.id}>
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between mb-2">
                                <h3 className="font-medium">{doc.name}</h3>
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
