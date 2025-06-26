import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { File, User, Edit, Accessibility } from "lucide-react";
import Layout from "@/components/Layout";
import T1UploadButton from "@/components/T1UploadButton";
import ExtractedDataDisplay from "@/components/ExtractedDataDisplay";
import ProcessingStatus from "@/components/ProcessingStatus";
import ProcessedReturnsList from "@/components/ProcessedReturnsList";
import T1FieldEditDialog from "@/components/T1FieldEditDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { HouseholdAPI, T1API } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { HouseholdWithClients, T1ReturnWithFields } from "@shared/schema";
import HouseholdEditForm from "@/components/HouseholdEditForm";

export default function HouseholdDetail() {
  const params = useParams();
  const householdId = parseInt(params.id || "0");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedT1ReturnId, setSelectedT1ReturnId] = useState<number | null>(null);
  const [processingT1Returns, setProcessingT1Returns] = useState<Set<number>>(new Set());
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editDialogT1ReturnId, setEditDialogT1ReturnId] = useState<number | null>(null);

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

  const { data: editT1Return } = useQuery<T1ReturnWithFields>({
    queryKey: ["/api/t1-returns", editDialogT1ReturnId],
    queryFn: () => T1API.getT1Return(editDialogT1ReturnId!),
    enabled: editDialogT1ReturnId !== null,
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

  const getExtractedDateOfBirth = (client: any) => {
    const t1Returns = client.t1Returns || [];
    const completedT1 = t1Returns.find((t: any) => t.processingStatus === 'completed' && t.extractedData);
    
    if (completedT1 && completedT1.extractedData && completedT1.extractedData.dateOfBirth) {
      return completedT1.extractedData.dateOfBirth;
    }
    
    return client.dateOfBirth || 'Not provided';
  };

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const getChildAvatarColor = (index: number) => {
    const colors = [
      'bg-green-500',
      'bg-blue-500', 
      'bg-purple-500',
      'bg-orange-500',
      'bg-pink-500',
      'bg-indigo-500'
    ];
    return colors[index % colors.length];
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



  return (
    <Layout 
      title={household.name}
      subtitle="Household Details"
      actions={
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setIsEditModalOpen(true)}
          className="flex items-center"
        >
          <Edit className="mr-2 h-4 w-4" />
          Edit Members
        </Button>
      }
    >
      <div className="p-6">

        {/* Household Header */}
        <Card className="mb-6">
          <CardContent className="p-6">
            {/* Client Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {household.clients.map((client, index) => {
                const status = getClientStatus(client);
                return (
                  <div key={client.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <div className={`w-10 h-10 ${getClientAvatarColor(index)} rounded-full flex items-center justify-center text-white font-medium`}>
                          {client.firstName[0]}{client.lastName[0]}
                        </div>
                        <div className="ml-3">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-secondary">{client.firstName} {client.lastName}</h3>
                            {client.disabled && (
                              <Accessibility className="h-4 w-4 text-gray-500" />
                            )}
                          </div>
                          <p className="text-sm text-gray-500">{client.isPrimary ? 'Primary' : 'Secondary'} Client</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <T1UploadButton
                          clientId={client.id}
                          onUploadSuccess={handleT1UploadSuccess}
                        />
                      </div>
                    </div>

                    
                    {/* Show processing status if a T1 is being processed for this client */}
                    {Array.from(processingT1Returns).some(t1Id => {
                      // Check if any processing T1 belongs to this client
                      const t1Returns = client.t1Returns || [];
                      return t1Returns.some((t: any) => t.id === t1Id);
                    }) && (
                      <div className="mt-3">
                        <ProcessingStatus 
                          t1ReturnId={Array.from(processingT1Returns).find(t1Id => {
                            const t1Returns = client.t1Returns || [];
                            return t1Returns.some((t: any) => t.id === t1Id);
                          }) || Array.from(processingT1Returns)[0]}
                          onStatusChange={(status) => {
                            if (status === "completed" || status === "failed") {
                              setProcessingT1Returns(prev => {
                                const newSet = new Set(prev);
                                const t1Id = Array.from(processingT1Returns).find(t1Id => {
                                  const t1Returns = client.t1Returns || [];
                                  return t1Returns.some((t: any) => t.id === t1Id);
                                });
                                if (t1Id) newSet.delete(t1Id);
                                return newSet;
                              });
                              
                              // Force a complete refresh of household data
                              queryClient.invalidateQueries({ queryKey: ["/api/households"] });
                              queryClient.invalidateQueries({ queryKey: ["/api/t1-returns"] });
                            }
                          }}
                        />
                      </div>
                    )}

                  </div>
                );
              })}
            </div>

            {/* Children Section */}
            {household.children && household.children.length > 0 && (
              <div className="mt-6">
                {(() => {
                  // Sort children by age (oldest first)
                  const sortedChildren = [...household.children].sort((a, b) => {
                    const ageA = calculateAge(a.dateOfBirth);
                    const ageB = calculateAge(b.dateOfBirth);
                    return ageB - ageA; // Oldest first
                  });

                  // Calculate responsive grid classes based on number of children
                  const getGridClasses = (count: number) => {
                    if (count === 1) return "grid grid-cols-1";
                    if (count === 2) return "grid grid-cols-2";
                    if (count === 3) return "grid grid-cols-3";
                    if (count === 4) return "grid grid-cols-4";
                    // For 5+ children, show first 4 on one line, rest on new line
                    return "space-y-4";
                  };

                  const childrenCount = sortedChildren.length;

                  if (childrenCount <= 4) {
                    return (
                      <div className={`${getGridClasses(childrenCount)} gap-4`}>
                        {sortedChildren.map((child, index) => {
                          const age = calculateAge(child.dateOfBirth);
                          return (
                            <div key={child.id} className="border border-gray-200 rounded-lg p-4">
                              <div className="flex items-center">
                                <div className={`w-10 h-10 ${getChildAvatarColor(index)} rounded-full flex items-center justify-center text-white font-medium`}>
                                  {child.firstName[0]}{child.lastName[0]}
                                </div>
                                <div className="ml-3">
                                  <div className="flex items-center gap-2">
                                    <h3 className="font-medium text-secondary">{child.firstName} {child.lastName}</h3>
                                    {child.disabled && (
                                      <Accessibility className="h-4 w-4 text-gray-500" />
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-500">Child Age ({age})</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  } else {
                    // For 5+ children, show first 4 on top row, rest on bottom row
                    const firstRow = sortedChildren.slice(0, 4);
                    const remainingRows = [];
                    for (let i = 4; i < sortedChildren.length; i += 4) {
                      remainingRows.push(sortedChildren.slice(i, i + 4));
                    }

                    return (
                      <div className="space-y-4">
                        {/* First row - always 4 columns */}
                        <div className="grid grid-cols-4 gap-4">
                          {firstRow.map((child, index) => {
                            const age = calculateAge(child.dateOfBirth);
                            return (
                              <div key={child.id} className="border border-gray-200 rounded-lg p-4">
                                <div className="flex items-center">
                                  <div className={`w-10 h-10 ${getChildAvatarColor(index)} rounded-full flex items-center justify-center text-white font-medium`}>
                                    {child.firstName[0]}{child.lastName[0]}
                                  </div>
                                  <div className="ml-3">
                                    <div className="flex items-center gap-2">
                                      <h3 className="font-medium text-secondary">{child.firstName} {child.lastName}</h3>
                                      {child.disabled && (
                                        <Accessibility className="h-4 w-4 text-gray-500" />
                                      )}
                                    </div>
                                    <p className="text-sm text-gray-500">Child Age ({age})</p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        
                        {/* Remaining rows */}
                        {remainingRows.map((row, rowIndex) => (
                          <div key={rowIndex} className={`grid ${getGridClasses(row.length)} gap-4`}>
                            {row.map((child, index) => {
                              const age = calculateAge(child.dateOfBirth);
                              const colorIndex = 4 + (rowIndex * 4) + index; // Continue color sequence
                              return (
                                <div key={child.id} className="border border-gray-200 rounded-lg p-4">
                                  <div className="flex items-center">
                                    <div className={`w-10 h-10 ${getChildAvatarColor(colorIndex)} rounded-full flex items-center justify-center text-white font-medium`}>
                                      {child.firstName[0]}{child.lastName[0]}
                                    </div>
                                    <div className="ml-3">
                                      <div className="flex items-center gap-2">
                                        <h3 className="font-medium text-secondary">{child.firstName} {child.lastName}</h3>
                                        {child.disabled && (
                                          <Accessibility className="h-4 w-4 text-gray-500" />
                                        )}
                                      </div>
                                      <p className="text-sm text-gray-500">Child Age ({age})</p>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    );
                  }
                })()}
              </div>
            )}
          </CardContent>
        </Card>



        {/* Processed Returns List */}
        <div className="mb-6">
          <ProcessedReturnsList 
            householdId={householdId} 
            onT1ReturnClick={(t1ReturnId) => setSelectedT1ReturnId(t1ReturnId)}
            onEditClick={(t1ReturnId) => setEditDialogT1ReturnId(t1ReturnId)}
            onT1ProcessingStart={(t1ReturnId) => {
              setProcessingT1Returns(prev => new Set(prev).add(t1ReturnId));
            }}
          />
        </div>

        {/* Extracted Data Display */}
        {t1Return && (
          <ExtractedDataDisplay t1Return={t1Return} />
        )}

        {/* Edit Household Modal */}
        {household && (
          <HouseholdEditForm
            open={isEditModalOpen}
            onOpenChange={setIsEditModalOpen}
            household={household}
          />
        )}

        {/* T1 Field Edit Dialog */}
        {editT1Return && (
          <T1FieldEditDialog
            open={editDialogT1ReturnId !== null}
            onOpenChange={(open) => {
              if (!open) {
                setEditDialogT1ReturnId(null);
              }
            }}
            t1Return={editT1Return}
          />
        )}
      </div>
    </Layout>
  );
}
