import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { T1API } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface T1UploadButtonProps {
  clientId: number;
  onUploadSuccess: (t1ReturnId: number) => void;
}

export default function T1UploadButton({ clientId, onUploadSuccess }: T1UploadButtonProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    try {
      let result;
      if (files.length === 1) {
        // Single file upload
        result = await T1API.uploadT1File(clientId, files[0]);
      } else {
        // Multiple file upload
        result = await T1API.uploadMultipleT1Files(clientId, Array.from(files));
      }

      toast({
        title: "Upload Started",
        description: `${files.length} file(s) uploaded successfully. Processing will begin shortly.`,
      });

      onUploadSuccess(result.t1ReturnId);
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload T1 file(s)",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
      <Button
        onClick={handleUploadClick}
        disabled={isUploading}
        size="sm"
        variant="outline"
        className="flex items-center"
      >
        <Upload className="mr-2 h-4 w-4" />
        {isUploading ? "Uploading..." : "Upload"}
      </Button>
    </>
  );
}