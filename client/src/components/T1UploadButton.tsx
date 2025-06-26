import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { T1API, ChildrenAPI } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface T1UploadButtonProps {
  clientId?: number;
  childId?: number;
  onUploadSuccess: (t1ReturnId: number) => void;
}

export default function T1UploadButton({ clientId, childId, onUploadSuccess }: T1UploadButtonProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    try {
      let result;
      if (!clientId && !childId) {
        throw new Error('Either clientId or childId must be provided');
      }

      if (files.length === 1) {
        // Single file upload
        if (clientId) {
          result = await T1API.uploadT1File(clientId, files[0]);
        } else if (childId) {
          result = await ChildrenAPI.uploadT1File(childId, files[0]);
        }
      } else {
        // Multiple file upload
        if (clientId) {
          result = await T1API.uploadT1Files(clientId, Array.from(files));
        } else if (childId) {
          result = await ChildrenAPI.uploadT1Files(childId, Array.from(files));
        }
      }

      if (!result) {
        throw new Error('Upload failed to start');
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