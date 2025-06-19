import { useQuery } from "@tanstack/react-query";
import { FileText, Calendar, User, CheckCircle, XCircle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HouseholdAPI } from "@/lib/api";
import { HouseholdWithClients } from "@shared/schema";

interface ProcessedReturnsListProps {
  householdId: number;
}

export default function ProcessedReturnsList({ householdId }: ProcessedReturnsListProps) {
  const { data: household } = useQuery<HouseholdWithClients>({
    queryKey: ["/api/households", householdId],
    queryFn: () => HouseholdAPI.getHousehold(householdId),
  });

  if (!household) {
    return null;
  }

  // Collect all T1 returns from all clients
  const allReturns = household.clients.flatMap(client => 
    client.t1Returns?.map(t1Return => ({
      ...t1Return,
      clientName: `${client.firstName} ${client.lastName}`,
      clientId: client.id
    })) || []
  );

  // Group returns by year, then by client
  const returnsByYear = allReturns.reduce((acc, t1Return) => {
    const year = t1Return.taxYear;
    if (!acc[year]) {
      acc[year] = {};
    }
    if (!acc[year][t1Return.clientName]) {
      acc[year][t1Return.clientName] = [];
    }
    acc[year][t1Return.clientName].push(t1Return);
    return acc;
  }, {} as Record<number, Record<string, typeof allReturns>>);

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
                            <span className="text-gray-700">{t1Return.fileName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(t1Return.processingStatus)}
                            <span className="text-xs text-gray-600">
                              {getStatusText(t1Return.processingStatus)}
                            </span>
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