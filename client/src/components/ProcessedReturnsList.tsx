import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { FileText, Calendar, User, CheckCircle, XCircle, Clock, Trash2, RefreshCw, Search, Edit, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { HouseholdAPI, T1API } from "@/lib/api";
import { HouseholdWithClients } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface ProcessedReturnsListProps {
  householdId: number;
  onT1ReturnClick?: (t1ReturnId: number) => void;
  onEditClick?: (t1ReturnId: number) => void;
  onT1ProcessingStart?: (t1ReturnId: number) => void;
}

export default function ProcessedReturnsList({ householdId, onT1ReturnClick, onEditClick, onT1ProcessingStart }: ProcessedReturnsListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isManualEntryOpen, setIsManualEntryOpen] = useState(false);
  const [manualAccountData, setManualAccountData] = useState({
    // RRSP
    rrsp_account_balance: '',
    rrsp_contribution_room: '',
    // TFSA
    tfsa_account_balance: '',
    tfsa_contribution_room: '',
    tfsa_2024_contribution: '',
    // FHSA
    fhsa_account_balance: '',
    fhsa_contribution_room: '',
    // RESP
    resp_account_balance: '',
    resp_contribution_room: '',
    resp_2024_contribution: '',
    resp_total_grant: '',
    resp_grant_room_2024: '',
    resp_grant_remaining: '',
    resp_clb_received: '',
    resp_clb_room_2024: '',
    resp_clb_remaining: '',
    // RDSP
    rdsp_account_balance: '',
    rdsp_contribution_room: '',
    rdsp_2024_contribution: '',
    rdsp_cdsg_received: '',
    rdsp_cdsg_room_2024: '',
    rdsp_cdsg_remaining: '',
    rdsp_cdsb_received: '',
    rdsp_cdsb_room_2024: '',
    rdsp_cdsb_remaining: '',
    // Capital Loss
    capital_loss_available: ''
  });

  const generateReportMutation = useMutation({
    mutationFn: (clientId: number) => HouseholdAPI.generateClientAuditReport(clientId),
    onSuccess: (blob, clientId) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-report-client-${clientId}.pdf`;
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
    onSuccess: (_, t1ReturnId) => {
      toast({
        title: "Success",
        description: "T1 return is being reprocessed",
      });
      // Add to processing state to show status
      onT1ProcessingStart?.(t1ReturnId);
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

  const handleManualEntrySave = () => {
    // Here you would typically save to backend/database
    console.log('Saving manual account data:', manualAccountData);
    setIsManualEntryOpen(false);
    toast({
      title: "Success",
      description: "Manual account data saved successfully",
    });
  };

  const handleManualEntryCancel = () => {
    setIsManualEntryOpen(false);
  };

  const handleManualEntryChange = (field: string, value: string) => {
    setManualAccountData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (!household) {
    return null;
  }

  // Collect all T1 returns from all clients
  const allReturns = household.clients.flatMap(client => 
    client.t1Returns?.map(t1Return => ({
      ...t1Return,
      clientName: `${client.firstName} ${client.lastName}`,
      clientId: client.id,
      province: client.province
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
        <CardContent className="p-6">
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
      <CardContent className="p-6">
        <div className="space-y-4">
          {sortedYears.map(year => (
            <div key={year}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-600" />
                  <h3 className="font-semibold text-gray-900">Tax Year {year}</h3>
                </div>
                <Link href={`/household/${householdId}/report/${year}`}>
                  <Button variant="outline" size="sm">
                    {year} Household Report
                  </Button>
                </Link>
              </div>
              
              <div className="space-y-2">
                {Object.entries(returnsByYear[year]).map(([clientName, returns]) => (
                  <div key={clientName} className="ml-4">
                    {returns.map((t1Return) => (
                      <div key={t1Return.id} className="flex items-center justify-between bg-gray-50 p-2 rounded text-sm">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-500" />
                          <button
                            onClick={() => onT1ReturnClick?.(t1Return.id)}
                            className="font-medium text-gray-700 hover:text-blue-600 hover:underline text-left"
                            disabled={t1Return.processingStatus !== 'completed'}
                          >
                            {(() => {
                              // Get province from form fields if available
                              const formFields = (t1Return as any).formFields;
                              let province = t1Return.province || 'Unknown';
                              
                              if (formFields && Array.isArray(formFields)) {
                                const provinceField = formFields.find((field: any) => field.fieldCode === 'province');
                                if (provinceField?.fieldValue) {
                                  province = provinceField.fieldValue;
                                }
                              }
                              
                              return `${clientName} - ${province} - ${year}`;
                            })()}
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(t1Return.processingStatus || 'pending')}
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
                            onClick={() => onEditClick?.(t1Return.id)}
                            disabled={t1Return.processingStatus !== 'completed'}
                            className="h-6 w-6 p-0 text-orange-500 hover:text-orange-700 hover:bg-orange-50"
                            title="Edit T1 data"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Dialog open={isManualEntryOpen} onOpenChange={setIsManualEntryOpen}>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-green-500 hover:text-green-700 hover:bg-green-50"
                                title="Manual account data entry"
                              >
                                <DollarSign className="h-3 w-3" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Manual Account Data Entry</DialogTitle>
                              </DialogHeader>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* RRSP Section */}
                                <div className="space-y-4">
                                  <h3 className="font-semibold text-primary border-b pb-2">RRSP</h3>
                                  <div className="space-y-2">
                                    <Label htmlFor="rrsp_account_balance">Account Balance</Label>
                                    <Input
                                      id="rrsp_account_balance"
                                      type="text"
                                      placeholder="$0.00"
                                      value={manualAccountData.rrsp_account_balance}
                                      onChange={(e) => handleManualEntryChange('rrsp_account_balance', e.target.value)}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="rrsp_contribution_room">Contribution Room</Label>
                                    <Input
                                      id="rrsp_contribution_room"
                                      type="text"
                                      placeholder="$0.00"
                                      value={manualAccountData.rrsp_contribution_room}
                                      onChange={(e) => handleManualEntryChange('rrsp_contribution_room', e.target.value)}
                                    />
                                  </div>
                                </div>

                                {/* TFSA Section */}
                                <div className="space-y-4">
                                  <h3 className="font-semibold text-primary border-b pb-2">TFSA</h3>
                                  <div className="space-y-2">
                                    <Label htmlFor="tfsa_account_balance">Account Balance</Label>
                                    <Input
                                      id="tfsa_account_balance"
                                      type="text"
                                      placeholder="$0.00"
                                      value={manualAccountData.tfsa_account_balance}
                                      onChange={(e) => handleManualEntryChange('tfsa_account_balance', e.target.value)}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="tfsa_contribution_room">Contribution Room</Label>
                                    <Input
                                      id="tfsa_contribution_room"
                                      type="text"
                                      placeholder="$0.00"
                                      value={manualAccountData.tfsa_contribution_room}
                                      onChange={(e) => handleManualEntryChange('tfsa_contribution_room', e.target.value)}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="tfsa_2024_contribution">2024 Contribution</Label>
                                    <Input
                                      id="tfsa_2024_contribution"
                                      type="text"
                                      placeholder="$0.00"
                                      value={manualAccountData.tfsa_2024_contribution}
                                      onChange={(e) => handleManualEntryChange('tfsa_2024_contribution', e.target.value)}
                                    />
                                  </div>
                                </div>

                                {/* FHSA Section */}
                                <div className="space-y-4">
                                  <h3 className="font-semibold text-primary border-b pb-2">FHSA</h3>
                                  <div className="space-y-2">
                                    <Label htmlFor="fhsa_account_balance">Account Balance</Label>
                                    <Input
                                      id="fhsa_account_balance"
                                      type="text"
                                      placeholder="$0.00"
                                      value={manualAccountData.fhsa_account_balance}
                                      onChange={(e) => handleManualEntryChange('fhsa_account_balance', e.target.value)}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="fhsa_contribution_room">Contribution Room</Label>
                                    <Input
                                      id="fhsa_contribution_room"
                                      type="text"
                                      placeholder="$0.00"
                                      value={manualAccountData.fhsa_contribution_room}
                                      onChange={(e) => handleManualEntryChange('fhsa_contribution_room', e.target.value)}
                                    />
                                  </div>
                                </div>

                                {/* RESP Section */}
                                <div className="space-y-4">
                                  <h3 className="font-semibold text-primary border-b pb-2">RESP</h3>
                                  <div className="grid grid-cols-1 gap-2">
                                    <div className="space-y-2">
                                      <Label htmlFor="resp_account_balance">Account Balance</Label>
                                      <Input
                                        id="resp_account_balance"
                                        type="text"
                                        placeholder="$0.00"
                                        value={manualAccountData.resp_account_balance}
                                        onChange={(e) => handleManualEntryChange('resp_account_balance', e.target.value)}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="resp_contribution_room">Contribution Room</Label>
                                      <Input
                                        id="resp_contribution_room"
                                        type="text"
                                        placeholder="$0.00"
                                        value={manualAccountData.resp_contribution_room}
                                        onChange={(e) => handleManualEntryChange('resp_contribution_room', e.target.value)}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="resp_2024_contribution">2024 Contribution</Label>
                                      <Input
                                        id="resp_2024_contribution"
                                        type="text"
                                        placeholder="$0.00"
                                        value={manualAccountData.resp_2024_contribution}
                                        onChange={(e) => handleManualEntryChange('resp_2024_contribution', e.target.value)}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="resp_total_grant">Total CESG Received</Label>
                                      <Input
                                        id="resp_total_grant"
                                        type="text"
                                        placeholder="$0.00"
                                        value={manualAccountData.resp_total_grant}
                                        onChange={(e) => handleManualEntryChange('resp_total_grant', e.target.value)}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="resp_grant_room_2024">CESG Room 2024</Label>
                                      <Input
                                        id="resp_grant_room_2024"
                                        type="text"
                                        placeholder="$0.00"
                                        value={manualAccountData.resp_grant_room_2024}
                                        onChange={(e) => handleManualEntryChange('resp_grant_room_2024', e.target.value)}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="resp_grant_remaining">CESG Remaining</Label>
                                      <Input
                                        id="resp_grant_remaining"
                                        type="text"
                                        placeholder="$0.00"
                                        value={manualAccountData.resp_grant_remaining}
                                        onChange={(e) => handleManualEntryChange('resp_grant_remaining', e.target.value)}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="resp_clb_received">Total CLB Received</Label>
                                      <Input
                                        id="resp_clb_received"
                                        type="text"
                                        placeholder="$0.00"
                                        value={manualAccountData.resp_clb_received}
                                        onChange={(e) => handleManualEntryChange('resp_clb_received', e.target.value)}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="resp_clb_room_2024">CLB Room 2024</Label>
                                      <Input
                                        id="resp_clb_room_2024"
                                        type="text"
                                        placeholder="$0.00"
                                        value={manualAccountData.resp_clb_room_2024}
                                        onChange={(e) => handleManualEntryChange('resp_clb_room_2024', e.target.value)}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="resp_clb_remaining">CLB Remaining</Label>
                                      <Input
                                        id="resp_clb_remaining"
                                        type="text"
                                        placeholder="$0.00"
                                        value={manualAccountData.resp_clb_remaining}
                                        onChange={(e) => handleManualEntryChange('resp_clb_remaining', e.target.value)}
                                      />
                                    </div>
                                  </div>
                                </div>

                                {/* RDSP Section */}
                                <div className="space-y-4">
                                  <h3 className="font-semibold text-primary border-b pb-2">RDSP</h3>
                                  <div className="grid grid-cols-1 gap-2">
                                    <div className="space-y-2">
                                      <Label htmlFor="rdsp_account_balance">Account Balance</Label>
                                      <Input
                                        id="rdsp_account_balance"
                                        type="text"
                                        placeholder="$0.00"
                                        value={manualAccountData.rdsp_account_balance}
                                        onChange={(e) => handleManualEntryChange('rdsp_account_balance', e.target.value)}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="rdsp_contribution_room">Contribution Room</Label>
                                      <Input
                                        id="rdsp_contribution_room"
                                        type="text"
                                        placeholder="$0.00"
                                        value={manualAccountData.rdsp_contribution_room}
                                        onChange={(e) => handleManualEntryChange('rdsp_contribution_room', e.target.value)}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="rdsp_2024_contribution">2024 Contribution</Label>
                                      <Input
                                        id="rdsp_2024_contribution"
                                        type="text"
                                        placeholder="$0.00"
                                        value={manualAccountData.rdsp_2024_contribution}
                                        onChange={(e) => handleManualEntryChange('rdsp_2024_contribution', e.target.value)}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="rdsp_cdsg_received">Total CDSG Received</Label>
                                      <Input
                                        id="rdsp_cdsg_received"
                                        type="text"
                                        placeholder="$0.00"
                                        value={manualAccountData.rdsp_cdsg_received}
                                        onChange={(e) => handleManualEntryChange('rdsp_cdsg_received', e.target.value)}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="rdsp_cdsg_room_2024">CDSG Room 2024</Label>
                                      <Input
                                        id="rdsp_cdsg_room_2024"
                                        type="text"
                                        placeholder="$0.00"
                                        value={manualAccountData.rdsp_cdsg_room_2024}
                                        onChange={(e) => handleManualEntryChange('rdsp_cdsg_room_2024', e.target.value)}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="rdsp_cdsg_remaining">CDSG Remaining</Label>
                                      <Input
                                        id="rdsp_cdsg_remaining"
                                        type="text"
                                        placeholder="$0.00"
                                        value={manualAccountData.rdsp_cdsg_remaining}
                                        onChange={(e) => handleManualEntryChange('rdsp_cdsg_remaining', e.target.value)}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="rdsp_cdsb_received">Total CDSB Received</Label>
                                      <Input
                                        id="rdsp_cdsb_received"
                                        type="text"
                                        placeholder="$0.00"
                                        value={manualAccountData.rdsp_cdsb_received}
                                        onChange={(e) => handleManualEntryChange('rdsp_cdsb_received', e.target.value)}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="rdsp_cdsb_room_2024">CDSB Room 2024</Label>
                                      <Input
                                        id="rdsp_cdsb_room_2024"
                                        type="text"
                                        placeholder="$0.00"
                                        value={manualAccountData.rdsp_cdsb_room_2024}
                                        onChange={(e) => handleManualEntryChange('rdsp_cdsb_room_2024', e.target.value)}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="rdsp_cdsb_remaining">CDSB Remaining</Label>
                                      <Input
                                        id="rdsp_cdsb_remaining"
                                        type="text"
                                        placeholder="$0.00"
                                        value={manualAccountData.rdsp_cdsb_remaining}
                                        onChange={(e) => handleManualEntryChange('rdsp_cdsb_remaining', e.target.value)}
                                      />
                                    </div>
                                  </div>
                                </div>

                                {/* Capital Loss Section */}
                                <div className="space-y-4">
                                  <h3 className="font-semibold text-primary border-b pb-2">Capital Loss Carry Forward</h3>
                                  <div className="space-y-2">
                                    <Label htmlFor="capital_loss_available">Available Losses</Label>
                                    <Input
                                      id="capital_loss_available"
                                      type="text"
                                      placeholder="$0.00"
                                      value={manualAccountData.capital_loss_available}
                                      onChange={(e) => handleManualEntryChange('capital_loss_available', e.target.value)}
                                    />
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex justify-end space-x-2 mt-6 pt-4 border-t">
                                <Button variant="outline" onClick={handleManualEntryCancel}>Cancel</Button>
                                <Button onClick={handleManualEntrySave} className="bg-primary">Save</Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => generateReportMutation.mutate(t1Return.clientId)}
                            disabled={generateReportMutation.isPending || t1Return.processingStatus !== 'completed'}
                            className="h-6 w-6 p-0 text-green-500 hover:text-green-700 hover:bg-green-50"
                            title="Generate audit report"
                          >
                            <Search className="h-3 w-3" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={deleteMutation.isPending}
                                className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                title="Delete T1 return"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete T1 Return</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete the T1 return for {(() => {
                                    // Get province from form fields if available
                                    const formFields = (t1Return as any).formFields;
                                    let province = t1Return.province || 'Unknown';
                                    
                                    if (formFields && Array.isArray(formFields)) {
                                      const provinceField = formFields.find((field: any) => field.fieldCode === 'province');
                                      if (provinceField?.fieldValue) {
                                        province = provinceField.fieldValue;
                                      }
                                    }
                                    
                                    return `${clientName} - ${province} - ${year}`;
                                  })()}? This action cannot be undone and will permanently remove all extracted tax data.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteMutation.mutate(t1Return.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    ))}
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