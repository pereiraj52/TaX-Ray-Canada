import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import ExtractedDataDisplay from "@/components/ExtractedDataDisplay";

export default function T1Extract() {
  const { householdId, t1ReturnId } = useParams<{ householdId: string; t1ReturnId: string }>();

  // Fetch T1 return data
  const { data: t1Return, isLoading, error } = useQuery({
    queryKey: ['/api/t1-returns', t1ReturnId],
    enabled: !!t1ReturnId,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">Loading T1 data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen">
        <div className="text-lg text-red-600 mb-4">Error loading T1 data</div>
        <Link href={`/household/${householdId}`}>
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Household
          </Button>
        </Link>
      </div>
    );
  }

  if (!t1Return) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen">
        <div className="text-lg mb-4">T1 return not found</div>
        <Link href={`/household/${householdId}`}>
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Household
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href={`/household/${householdId}`}>
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Household
                </Button>
              </Link>
              <h1 className="text-2xl font-bold text-primary">
                Tax-Ray Canada
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ExtractedDataDisplay t1Return={t1Return as any} />
      </main>
    </div>
  );
}