/**
 * Component for uploading screenshots and extracting text/math using OCR
 */
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileImage, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { MathRenderer } from './MathRenderer';

interface ScreenshotUploadProps {
  onTextExtracted: (text: string, hasMath: boolean) => void;
  className?: string;
}

interface OCRResult {
  text: string;
  latex?: string;
  confidence: number;
  hasmath: boolean;
}

export function ScreenshotUpload({ onTextExtracted, className = "" }: ScreenshotUploadProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<OCRResult | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const { toast } = useToast();

  const processImage = async (file: File) => {
    setIsProcessing(true);
    setLastResult(null);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/ocr/extract', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`OCR failed: ${response.statusText}`);
      }

      const result: OCRResult = await response.json();
      setLastResult(result);

      // Create preview of uploaded image
      const imageUrl = URL.createObjectURL(file);
      setUploadedImage(imageUrl);

      // Pass the extracted text to parent component
      const finalText = result.hasmath && result.latex ? result.latex : result.text;
      onTextExtracted(finalText, result.hasmath);

      toast({
        title: "Text Extracted Successfully",
        description: `Extracted ${result.hasmath ? 'text with math notation' : 'plain text'} (${Math.round(result.confidence * 100)}% confidence)`,
        duration: 4000,
      });

    } catch (error) {
      console.error('OCR processing error:', error);
      toast({
        title: "OCR Failed",
        description: error instanceof Error ? error.message : "Failed to extract text from image",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      processImage(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp']
    },
    multiple: false,
    disabled: isProcessing
  });

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileImage className="h-5 w-5" />
            Screenshot OCR
          </CardTitle>
          <CardDescription>
            Upload a screenshot to extract text and mathematical expressions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Upload Area */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-blue-400 bg-blue-50'
                : isProcessing
                ? 'border-gray-300 bg-gray-50 cursor-not-allowed'
                : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-2">
              {isProcessing ? (
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              ) : (
                <Upload className="h-8 w-8 text-gray-400" />
              )}
              <p className="text-sm font-medium">
                {isProcessing
                  ? 'Processing image...'
                  : isDragActive
                  ? 'Drop the image here'
                  : 'Click to upload or drag and drop'}
              </p>
              <p className="text-xs text-gray-500">
                PNG, JPG, GIF, BMP, WebP up to 10MB
              </p>
            </div>
          </div>

          {/* Image Preview */}
          {uploadedImage && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Uploaded Image:</h4>
              <img
                src={uploadedImage}
                alt="Uploaded screenshot"
                className="max-h-40 w-auto rounded border"
              />
            </div>
          )}

          {/* OCR Results */}
          {lastResult && (
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                {lastResult.confidence > 0.8 ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                )}
                <span className="text-sm font-medium">
                  OCR Results ({Math.round(lastResult.confidence * 100)}% confidence)
                </span>
                {lastResult.hasmath && (
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    Contains Math
                  </span>
                )}
              </div>

              {lastResult.hasmath && lastResult.latex ? (
                <div className="space-y-2">
                  <p className="text-xs text-gray-600">LaTeX Math Notation:</p>
                  <div className="p-2 bg-white rounded border font-mono text-sm">
                    <MathRenderer text={lastResult.latex} />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-gray-600">Extracted Text:</p>
                  <div className="p-2 bg-white rounded border text-sm">
                    {lastResult.text || 'No text detected'}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}