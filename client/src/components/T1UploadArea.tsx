import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CloudUpload, Loader2, X, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { T1API } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface T1UploadAreaProps {
  clientId: number;
  onUploadSuccess: (t1ReturnId: number) => void;
}

export default function T1UploadArea({ clientId, onUploadSuccess }: T1UploadAreaProps) {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: ({ clientId, files }: { clientId: number; files: File[] }) => 
      T1API.uploadT1Files(clientId, files),
    onSuccess: (data) => {
      toast({
        title: "Upload successful",
        description: "T1 return is being processed...",
      });
      onUploadSuccess(data.t1ReturnId);
      setSelectedFiles([]);
      // Invalidate household data to refresh
      queryClient.invalidateQueries({ queryKey: ["/api/households"] });
    },
    onError: (error: any) => {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload T1 files",
        variant: "destructive",
      });
    },
  });

  const validateFile = (file: File): boolean => {
    if (file.type !== 'application/pdf') {
      toast({
        title: "Invalid file type",
        description: `${file.name} is not a PDF file`,
        variant: "destructive",
      });
      return false;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB
      toast({
        title: "File too large",
        description: `${file.name} is larger than 10MB`,
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleFilesSelect = (files: File[]) => {
    const validFiles = files.filter(validateFile);
    if (validFiles.length === 0) {
      return;
    }

    // Add new files to existing selection, avoiding duplicates
    const existingNames = selectedFiles.map(f => f.name);
    const newFiles = validFiles.filter(f => !existingNames.includes(f.name));
    
    if (newFiles.length === 0) {
      toast({
        title: "Files already selected",
        description: "These files are already in your selection",
        variant: "destructive",
      });
      return;
    }

    setSelectedFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = () => {
    if (selectedFiles.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select at least one PDF file",
        variant: "destructive",
      });
      return;
    }

    uploadMutation.mutate({ clientId, files: selectedFiles });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFilesSelect(files);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFilesSelect(files);
    }
  };

  if (uploadMutation.isPending) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center">
          <Loader2 className="animate-spin h-4 w-4 text-primary mr-3" />
          <span className="text-blue-800 font-medium">Processing T1 return...</span>
        </div>
        <div className="mt-2 text-sm text-blue-700">
          Extracting data from uploaded PDF. This may take a few moments.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div
        className={`upload-area-compact ${dragOver ? 'dragover' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          multiple
          onChange={handleFileInputChange}
          className="hidden"
        />
        <div className="flex items-center gap-3">
          <CloudUpload className="h-8 w-8 text-gray-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">Upload T1 PDFs</p>
            <p className="text-xs text-gray-500">Multiple files supported - drag & drop or click to select</p>
          </div>
          <Button size="sm" className="bg-primary text-white hover:bg-primary-dark">
            Browse
          </Button>
        </div>
      </div>

      {selectedFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          <h4 className="font-medium text-sm text-gray-700">Selected Files ({selectedFiles.length})</h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {selectedFiles.map((file, index) => (
              <div key={`${file.name}-${index}`} className="flex items-center justify-between bg-gray-50 rounded p-2">
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4 text-red-500" />
                  <span className="text-sm text-gray-700 truncate max-w-48">{file.name}</span>
                  <span className="text-xs text-gray-500">
                    ({(file.size / 1024 / 1024).toFixed(1)}MB)
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                  className="h-6 w-6 p-0 hover:bg-red-100"
                >
                  <X className="h-3 w-3 text-red-500" />
                </Button>
              </div>
            ))}
          </div>
          
          <div className="flex gap-2 pt-2">
            <Button 
              onClick={handleUpload}
              disabled={uploadMutation.isPending}
              className="flex-1"
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  Processing...
                </>
              ) : (
                `Upload ${selectedFiles.length} File${selectedFiles.length > 1 ? 's' : ''}`
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setSelectedFiles([])}
              disabled={uploadMutation.isPending}
            >
              Clear
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
