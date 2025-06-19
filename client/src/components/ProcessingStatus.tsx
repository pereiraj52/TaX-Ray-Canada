import { useQuery } from "@tanstack/react-query";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { T1API } from "@/lib/api";

interface ProcessingStatusProps {
  t1ReturnId: number;
  onStatusChange?: (status: string) => void;
}

export default function ProcessingStatus({ t1ReturnId, onStatusChange }: ProcessingStatusProps) {
  const { data: t1Return } = useQuery({
    queryKey: ["/api/t1-returns", t1ReturnId],
    queryFn: () => T1API.getT1Return(t1ReturnId),
    refetchInterval: 2000, // Poll every 2 seconds
    enabled: !!t1ReturnId,
  });

  const status = t1Return?.processingStatus || "pending";

  // Notify parent of status changes
  if (onStatusChange) {
    onStatusChange(status);
  }

  if (status === "processing" || status === "pending") {
    return (
      <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-md">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Processing T1 data...</span>
      </div>
    );
  }

  if (status === "completed") {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-md">
        <CheckCircle className="h-4 w-4" />
        <span>T1 data extracted successfully</span>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">
        <XCircle className="h-4 w-4" />
        <span>Processing failed</span>
      </div>
    );
  }

  return null;
}