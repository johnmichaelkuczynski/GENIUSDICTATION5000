import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Eye, FileText, Zap } from 'lucide-react';

interface TextChunk {
  id: string;
  content: string;
  startIndex: number;
  endIndex: number;
  wordCount: number;
  preview: string;
}

interface TextChunkManagerProps {
  text: string;
  onChunksSelected: (selectedChunks: TextChunk[], fullText: string) => void;
  onClose: () => void;
  isVisible: boolean;
}

export function TextChunkManager({ text, onChunksSelected, onClose, isVisible }: TextChunkManagerProps) {
  const [chunks, setChunks] = useState<TextChunk[]>([]);
  const [selectedChunkIds, setSelectedChunkIds] = useState<Set<string>>(new Set());
  const [previewChunk, setPreviewChunk] = useState<TextChunk | null>(null);

  // Split text into logical chunks
  useEffect(() => {
    if (text && text.length > 0) {
      const newChunks = splitIntoChunks(text);
      setChunks(newChunks);
      // Select all chunks by default
      setSelectedChunkIds(new Set(newChunks.map(chunk => chunk.id)));
    }
  }, [text]);

  const splitIntoChunks = (inputText: string): TextChunk[] => {
    const maxChunkSize = 1500; // Target chunk size in characters
    const chunks: TextChunk[] = [];
    
    // First, try to split by paragraphs
    const paragraphs = inputText.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    
    let currentChunk = '';
    let startIndex = 0;
    let chunkIndex = 0;
    
    for (const paragraph of paragraphs) {
      const paragraphWithSpacing = paragraph.trim() + '\n\n';
      
      // If adding this paragraph would exceed chunk size and we have content, create a chunk
      if (currentChunk.length > 0 && (currentChunk.length + paragraphWithSpacing.length) > maxChunkSize) {
        const chunk = createChunk(currentChunk.trim(), startIndex, chunkIndex++);
        chunks.push(chunk);
        
        startIndex += currentChunk.length;
        currentChunk = paragraphWithSpacing;
      } else {
        currentChunk += paragraphWithSpacing;
      }
    }
    
    // Add the last chunk if there's remaining content
    if (currentChunk.trim().length > 0) {
      const chunk = createChunk(currentChunk.trim(), startIndex, chunkIndex);
      chunks.push(chunk);
    }
    
    return chunks;
  };

  const createChunk = (content: string, startIndex: number, index: number): TextChunk => {
    const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
    const preview = content.length > 150 ? content.substring(0, 150) + '...' : content;
    
    return {
      id: `chunk-${index}`,
      content,
      startIndex,
      endIndex: startIndex + content.length,
      wordCount,
      preview
    };
  };

  const handleChunkToggle = (chunkId: string) => {
    const newSelection = new Set(selectedChunkIds);
    if (newSelection.has(chunkId)) {
      newSelection.delete(chunkId);
    } else {
      newSelection.add(chunkId);
    }
    setSelectedChunkIds(newSelection);
  };

  const handleSelectAll = () => {
    setSelectedChunkIds(new Set(chunks.map(chunk => chunk.id)));
  };

  const handleSelectNone = () => {
    setSelectedChunkIds(new Set());
  };

  const handleProcessSelected = () => {
    const selectedChunks = chunks.filter(chunk => selectedChunkIds.has(chunk.id));
    onChunksSelected(selectedChunks, text);
  };

  const selectedCount = selectedChunkIds.size;
  const totalWords = chunks
    .filter(chunk => selectedChunkIds.has(chunk.id))
    .reduce((sum, chunk) => sum + chunk.wordCount, 0);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col">
        <CardHeader className="flex-shrink-0">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Chunk Manager - Large Text Processing
          </CardTitle>
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Badge variant="outline">{chunks.length} chunks</Badge>
              <Badge variant="outline">{selectedCount} selected</Badge>
              <Badge variant="outline">{totalWords} words</Badge>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={handleSelectNone}>
                Select None
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="space-y-3">
              {chunks.map((chunk, index) => (
                <Card key={chunk.id} className={`transition-colors ${
                  selectedChunkIds.has(chunk.id) ? 'bg-blue-50 border-blue-200' : ''
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedChunkIds.has(chunk.id)}
                        onCheckedChange={() => handleChunkToggle(chunk.id)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary">Chunk {index + 1}</Badge>
                          <Badge variant="outline">{chunk.wordCount} words</Badge>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="ml-auto">
                                <Eye className="h-4 w-4 mr-1" />
                                Preview
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[80vh]">
                              <DialogHeader>
                                <DialogTitle>Chunk {index + 1} Preview</DialogTitle>
                              </DialogHeader>
                              <ScrollArea className="h-96">
                                <div className="whitespace-pre-wrap text-sm">
                                  {chunk.content}
                                </div>
                              </ScrollArea>
                            </DialogContent>
                          </Dialog>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-3">
                          {chunk.preview}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
        
        <Separator />
        
        <div className="p-4 flex justify-between items-center flex-shrink-0">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleProcessSelected}
            disabled={selectedCount === 0}
            className="flex items-center gap-2"
          >
            <Zap className="h-4 w-4" />
            Process {selectedCount} Selected Chunks
          </Button>
        </div>
      </Card>
    </div>
  );
}