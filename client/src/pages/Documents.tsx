import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDocumentProcessor } from "@/hooks/useDocumentProcessor";
import { useAppContext } from "@/context/AppContext";

interface UploadedDocument {
  id: string;
  name: string;
  type: string;
  content: string;
  file: File;
}

const Documents = () => {
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<UploadedDocument | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const { processDocument, downloadDocument } = useDocumentProcessor();
  const { setOriginalText, originalText, processedText } = useAppContext();

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      handleFiles(files);
    }
  };

  const handleFiles = async (files: File[]) => {
    for (const file of files) {
      try {
        const content = await processDocument(file);
        const newDoc: UploadedDocument = {
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          type: file.type,
          content,
          file
        };
        
        setDocuments(prev => [...prev, newDoc]);
        
        // Select the first document automatically
        if (documents.length === 0) {
          setSelectedDocument(newDoc);
          setOriginalText(content);
        }
      } catch (error) {
        console.error(`Error processing ${file.name}:`, error);
      }
    }
  };

  const selectDocument = (doc: UploadedDocument) => {
    setSelectedDocument(doc);
    setOriginalText(doc.content);
  };

  const deleteDocument = (id: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== id));
    if (selectedDocument?.id === id) {
      const remaining = documents.filter(doc => doc.id !== id);
      if (remaining.length > 0) {
        selectDocument(remaining[0]);
      } else {
        setSelectedDocument(null);
        setOriginalText("");
      }
    }
  };

  const downloadResult = async (format: 'txt' | 'docx' | 'pdf') => {
    if (!selectedDocument || !processedText) return;
    
    try {
      const baseName = selectedDocument.name.split('.')[0];
      const fileName = `${baseName}_processed.${format}`;
      await downloadDocument(processedText, format, fileName);
    } catch (error) {
      console.error(`Error downloading as ${format}:`, error);
    }
  };

  return (
    <div className="flex flex-col space-y-6">
      <h1 className="text-2xl font-semibold">Document Management</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Document List Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium">Documents</h2>
                <Button size="sm" onClick={() => document.getElementById('file-upload-docs')?.click()}>
                  <i className="ri-upload-line mr-1"></i> Upload
                </Button>
                <input
                  id="file-upload-docs"
                  type="file"
                  className="hidden"
                  accept=".pdf,.docx,.txt"
                  multiple
                  onChange={handleFileSelect}
                />
              </div>
              
              {documents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <i className="ri-file-text-line text-3xl mb-2"></i>
                  <p>No documents uploaded yet</p>
                </div>
              ) : (
                <ul className="divide-y">
                  {documents.map(doc => (
                    <li 
                      key={doc.id} 
                      className={`py-2 px-2 flex justify-between items-center cursor-pointer rounded ${selectedDocument?.id === doc.id ? 'bg-primary/10' : 'hover:bg-accent/10'}`}
                      onClick={() => selectDocument(doc)}
                    >
                      <div className="flex items-center">
                        <i className={`ri-file-${
                          doc.type.includes('pdf') ? 'pdf' : doc.type.includes('word') ? 'word' : 'text'
                        }-line text-primary mr-2`}></i>
                        <span className="text-sm truncate max-w-[150px]">{doc.name}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 hover:text-red-500"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteDocument(doc.id);
                        }}
                      >
                        <i className="ri-delete-bin-line"></i>
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              
              {/* Upload Dropzone */}
              <div 
                className={`mt-4 border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer transition ${
                  isDragging ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent/5'
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                }}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-upload-docs')?.click()}
              >
                <i className="ri-upload-cloud-2-line text-2xl text-muted-foreground mb-2"></i>
                <p className="text-xs text-muted-foreground text-center">
                  Drag files here or click to upload
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Document Viewer */}
        <div className="lg:col-span-3">
          <Card>
            {selectedDocument ? (
              <Tabs defaultValue="original">
                <div className="flex justify-between items-center border-b p-4">
                  <TabsList>
                    <TabsTrigger value="original">Original</TabsTrigger>
                    <TabsTrigger value="transformed">Transformed</TabsTrigger>
                  </TabsList>
                  
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => downloadResult('txt')}
                      disabled={!processedText}
                    >
                      Download .txt
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => downloadResult('docx')}
                      disabled={!processedText}
                    >
                      Download .docx
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => downloadResult('pdf')}
                      disabled={!processedText}
                    >
                      Download .pdf
                    </Button>
                  </div>
                </div>
                
                <TabsContent value="original" className="p-4">
                  <h3 className="text-lg font-medium mb-2">{selectedDocument.name}</h3>
                  <div className="whitespace-pre-wrap border rounded-md p-4 bg-accent/5 min-h-[400px] max-h-[600px] overflow-auto">
                    {originalText}
                  </div>
                </TabsContent>
                
                <TabsContent value="transformed" className="p-4">
                  <h3 className="text-lg font-medium mb-2">Transformed Document</h3>
                  {processedText ? (
                    <div className="whitespace-pre-wrap border rounded-md p-4 bg-accent/5 min-h-[400px] max-h-[600px] overflow-auto">
                      {processedText}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <p>Transform the document first to see results here</p>
                      <Button className="mt-4" onClick={() => document.getElementById('transform-btn')?.click()}>
                        Transform Document
                      </Button>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            ) : (
              <CardContent className="p-8 text-center">
                <div className="text-muted-foreground space-y-3">
                  <i className="ri-file-search-line text-4xl"></i>
                  <p>Select a document from the sidebar or upload a new one</p>
                  <Button 
                    className="mt-2" 
                    onClick={() => document.getElementById('file-upload-docs')?.click()}
                  >
                    Upload Document
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Documents;
