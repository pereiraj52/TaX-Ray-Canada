import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CloudUpload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { T1API } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface T1UploadAreaProps {
  clientId: number;
  onUploadSuccess: (t1ReturnId: number) => void;
}

export default function T1UploadArea({ clientId, onUploadSuccess }: T1UploadAreaProps) {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: ({ clientId, file }: { clientId: number; file: File }) => 
      T1API.uploadT1File(clientId, file),
    onSuccess: (data) => {
      toast({
        title: "Upload successful",
        description: "T1 return is being processed...",
      });
      onUploadSuccess(data.t1ReturnId);
      // Invalidate household data to refresh
      queryClient.invalidateQueries({ queryKey: ["/api/households"] });
    },
    onError: (error: any) => {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload T1 file",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (file: File) => {
    if (file.type !== 'application/pdf') {
      toast({
        title: "Invalid file type",
        description: "Please select a PDF file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB
      toast({
        title: "File too large",
        description: "Please select a file smaller than 10MB",
        variant: "destructive",
      });
      return;
    }

    uploadMutation.mutate({ clientId, file });
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
      handleFileSelect(files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFileSelect(files[0]);
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
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-semibold text-secondary mb-4">T1 Tax Return Processing</h2>
      
      <div
        className={`upload-area ${dragOver ? 'dragover' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileInputChange}
          className="hidden"
        />
        <div className="max-w-md mx-auto">
          <CloudUpload className="text-4xl text-gray-400 mb-4 h-16 w-16 mx-auto" />
          <h3 className="text-lg font-medium text-secondary mb-2">Upload T1 Tax Return</h3>
          <p className="text-gray-600 mb-4">Drag and drop your PDF file here, or click to browse</p>
          <Button className="bg-primary text-white hover:bg-primary-dark">
            Select File
          </Button>
          <p className="text-xs text-gray-500 mt-2">Maximum file size: 10MB. Accepted formats: PDF</p>
        </div>
      </div>
    </div>
  );
}
