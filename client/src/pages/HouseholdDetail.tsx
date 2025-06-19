import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { ChevronRight, Home, File, User } from "lucide-react";
import Layout from "@/components/Layout";
import T1UploadArea from "@/components/T1UploadArea";
import ExtractedDataDisplay from "@/components/ExtractedDataDisplay";
import ProcessingStatus from "@/components/ProcessingStatus";
import ProcessedReturnsList from "@/components/ProcessedReturnsList";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { HouseholdAPI, T1API } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { HouseholdWithClients, T1ReturnWithFields } from "@shared/schema";

export default function HouseholdDetail() {
  const params = useParams();
  const householdId = parseInt(params.id || "0");
  const { toast } = useToast();
  const [selectedT1ReturnId, setSelectedT1ReturnId] = useState<number | null>(null);
  const [processingT1Returns, setProcessingT1Returns] = useState<Set<number>>(new Set());

  const { data: household, isLoading } = useQuery<HouseholdWithClients>({
    queryKey: ["/api/households", householdId],
    queryFn: () => HouseholdAPI.getHousehold(householdId),
    enabled: !isNaN(householdId) && householdId > 0,
  });

  const { data: t1Return } = useQuery<T1ReturnWithFields>({
    queryKey: ["/api/t1-returns", selectedT1ReturnId],
    queryFn: () => T1API.getT1Return(selectedT1ReturnId!),
    enabled: selectedT1ReturnId !== null,
  });

  const generateReportMutation = useMutation({
    mutationFn: () => HouseholdAPI.generateAuditReport(householdId),
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-report-${household?.name.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({
        title: "Success",
        description: "Audit report generated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate audit report",
        variant: "destructive",
      });
    },
  });

  const handleT1UploadSuccess = (t1ReturnId: number) => {
    setSelectedT1ReturnId(t1ReturnId);
    setProcessingT1Returns(prev => new Set(prev).add(t1ReturnId));
  };

  const getClientAvatarColor = (index: number) => {
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500'];
    return colors[index % colors.length];
  };

  const getClientStatus = (client: any) => {
    const t1Returns = client.t1Returns || [];
    const completedCount = t1Returns.filter((t: any) => t.processingStatus === 'completed').length;
    const processingCount = t1Returns.filter((t: any) => t.processingStatus === 'processing').length;

    if (completedCount > 0) {
      return { status: 'Processed', class: 'status-badge status-complete' };
    } else if (processingCount > 0) {
      return { status: 'Processing', class: 'status-badge status-pending' };
    } else {
      return { status: 'Pending', class: 'status-badge status-failed' };
    }
  };

  if (isLoading) {
    return (
      <Layout title="Loading..." subtitle="Loading household details">
        <div className="p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!household) {
    return (
      <Layout title="Not Found" subtitle="Household not found">
        <div className="p-6">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-gray-600">Household not found</p>
              <Link href="/">
                <Button className="mt-4">Back to Dashboard</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  const headerActions = (
    <Button 
      onClick={() => generateReportMutation.mutate()}
      disabled={generateReportMutation.isPending}
      className="bg-accent text-white hover:bg-green-600"
    >
      <File className="mr-2 h-4 w-4" />
      {generateReportMutation.isPending ? "Generating..." : "Generate Audit Report"}
    </Button>
  );

  return (
    <Layout 
      title={household.name} 
      subtitle={`Created on ${new Date(household.createdAt).toLocaleDateString()}`}
      actions={headerActions}
    >
      <div className="p-6">
        {/* Breadcrumb */}
        <nav className="flex mb-6" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-3">
            <li className="inline-flex items-center">
              <Link href="/">
                <a className="text-gray-500 hover:text-primary">
                  <Home className="mr-2 h-4 w-4" />
                  Households
                </a>
              </Link>
            </li>
            <li>
              <div className="flex items-center">
                <ChevronRight className="text-gray-400 mx-2 h-4 w-4" />
                <span className="text-secondary font-medium">{household.name}</span>
              </div>
            </li>
          </ol>
        </nav>

        {/* Household Header */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="mb-4">
              <h1 className="text-2xl font-bold text-secondary">{household.name}</h1>
              <p className="text-gray-600">Created on {new Date(household.createdAt).toLocaleDateString()}</p>
            </div>

            {/* Client Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {household.clients.map((client, index) => {
                const status = getClientStatus(client);
                return (
                  <div key={client.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center mb-3">
                      <div className={`w-10 h-10 ${getClientAvatarColor(index)} rounded-full flex items-center justify-center text-white font-medium`}>
                        {client.firstName[0]}{client.lastName[0]}
                      </div>
                      <div className="ml-3">
                        <h3 className="font-medium text-secondary">{client.firstName} {client.lastName}</h3>
                        <p className="text-sm text-gray-500">{client.isPrimary ? 'Primary' : 'Secondary'} Client</p>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">SIN:</span>
                        <span className="font-medium">{client.sin || 'Not provided'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Date of Birth:</span>
                        <span className="font-medium">{client.dateOfBirth || 'Not provided'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Province:</span>
                        <span className="font-medium">{client.province || 'Not provided'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">T1 Status:</span>
                        <span className={status.class}>{status.status}</span>
                      </div>
                    </div>
                    
                    {/* Show processing status if a T1 is being processed for this client */}
                    {processingT1Returns.size > 0 && (
                      <div className="mt-3">
                        <ProcessingStatus 
                          t1ReturnId={Array.from(processingT1Returns)[0]} // Use the first processing T1 for now
                          onStatusChange={(status) => {
                            if (status === "completed" || status === "failed") {
                              setProcessingT1Returns(prev => {
                                const newSet = new Set(prev);
                                newSet.delete(Array.from(processingT1Returns)[0]);
                                return newSet;
                              });
                            }
                          }}
                        />
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* T1 Upload Section */}
        <div className="mb-6">
          <T1UploadArea
            clientId={household.clients[0]?.id}
            onUploadSuccess={handleT1UploadSuccess}
          />
        </div>

        {/* Processed Returns List */}
        <div className="mb-6">
          <ProcessedReturnsList householdId={householdId} />
        </div>

        {/* Extracted Data Display */}
        {t1Return && (
          <ExtractedDataDisplay t1Return={t1Return} />
        )}
      </div>
    </Layout>
  );
}
