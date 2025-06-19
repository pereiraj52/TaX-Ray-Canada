import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Calendar, User, CheckCircle, XCircle, Clock, Trash2, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HouseholdAPI, T1API } from "@/lib/api";
import { HouseholdWithClients } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface ProcessedReturnsListProps {
  householdId: number;
  onT1ReturnClick?: (t1ReturnId: number) => void;
}

export default function ProcessedReturnsList({ householdId, onT1ReturnClick }: ProcessedReturnsListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: household } = useQuery<HouseholdWithClients>({
    queryKey: ["/api/households", householdId],
    queryFn: () => HouseholdAPI.getHousehold(householdId),
  });

  const deleteMutation = useMutation({
    mutationFn: T1API.deleteT1Return,
    onSuccess: () => {
      toast({
        title: "Success",
        description: "T1 return deleted successfully",
      });
      // Invalidate household data to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/households"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete T1 return",
        variant: "destructive",
      });
    },
  });

  const reprocessMutation = useMutation({
    mutationFn: T1API.reprocessT1Return,
    onSuccess: () => {
      toast({
        title: "Success",
        description: "T1 return is being reprocessed",
      });
      // Invalidate household data to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/households"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reprocess T1 return",
        variant: "destructive",
      });
    },
  });

  if (!household) {
    return null;
  }

  // Collect all T1 returns from all clients
  const allReturns = household.clients.flatMap(client => {
    console.log(`Processing client: ${client.firstName} ${client.lastName}, T1 Returns:`, client.t1Returns?.length || 0);
    return client.t1Returns?.map(t1Return => ({
      ...t1Return,
      clientName: `${client.firstName} ${client.lastName}`,
      clientId: client.id
    })) || [];
  });



  // Group returns by year, then by client
  const returnsByYear = allReturns.reduce((acc, t1Return) => {
    const year = t1Return.taxYear;
    console.log(`Grouping T1 return: ID ${t1Return.id}, Client: "${t1Return.clientName}", Year: ${year}`);
    if (!acc[year]) {
      acc[year] = {};
    }
    if (!acc[year][t1Return.clientName]) {
      acc[year][t1Return.clientName] = [];
    }
    acc[year][t1Return.clientName].push(t1Return);
    return acc;
  }, {} as Record<number, Record<string, typeof allReturns>>);

  console.log('Returns grouped by year:', returnsByYear);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'processing':
      case 'pending':
        return <Clock className="h-4 w-4 text-blue-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      case 'processing':
        return 'Processing';
      case 'pending':
        return 'Pending';
      default:
        return 'Unknown';
    }
  };

  if (Object.keys(returnsByYear).length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Processed T1 Returns
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-sm">No T1 returns have been processed yet.</p>
        </CardContent>
      </Card>
    );
  }

  // Sort years in descending order (most recent first)
  const sortedYears = Object.keys(returnsByYear)
    .map(Number)
    .sort((a, b) => b - a);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Processed T1 Returns
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sortedYears.map(year => (
            <div key={year} className="border-l-2 border-gray-200 pl-4">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="h-4 w-4 text-gray-600" />
                <h3 className="font-semibold text-gray-900">Tax Year {year}</h3>
              </div>
              
              <div className="space-y-2">
                {Object.entries(returnsByYear[year]).map(([clientName, returns]) => (
                  <div key={clientName} className="ml-4">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="font-medium text-gray-700">{clientName}</span>
                    </div>
                    
                    <div className="ml-6 space-y-1">
                      {returns.map((t1Return) => (
                        <div key={t1Return.id} className="flex items-center justify-between bg-gray-50 p-2 rounded text-sm">
                          <div className="flex items-center gap-2">
                            <FileText className="h-3 w-3 text-gray-400" />
                            <button
                              onClick={() => onT1ReturnClick?.(t1Return.id)}
                              className="text-gray-700 hover:text-blue-600 hover:underline text-left"
                              disabled={t1Return.processingStatus !== 'completed'}
                            >
                              {t1Return.fileName || 'Unknown file'}
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(t1Return.processingStatus || 'pending')}
                            <span className="text-xs text-gray-600">
                              {getStatusText(t1Return.processingStatus || 'pending')}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => reprocessMutation.mutate(t1Return.id)}
                              disabled={reprocessMutation.isPending}
                              className="h-6 w-6 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                              title="Reprocess T1 return"
                            >
                              <RefreshCw className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteMutation.mutate(t1Return.id)}
                              disabled={deleteMutation.isPending}
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                              title="Delete T1 return"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}