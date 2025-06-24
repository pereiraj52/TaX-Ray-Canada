import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { ArrowLeft, Download, FileText, Calendar, User } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HouseholdAPI } from "@/lib/api";
import { HouseholdWithClients } from "@shared/schema";

export default function TaxReport() {
  const params = useParams();
  const householdId = parseInt(params.householdId || "0");
  const taxYear = parseInt(params.year || "0");

  const { data: household, isLoading } = useQuery<HouseholdWithClients>({
    queryKey: ["/api/households", householdId],
    queryFn: () => HouseholdAPI.getHousehold(householdId),
    enabled: !isNaN(householdId) && householdId > 0,
  });

  const handleDownloadReport = async () => {
    try {
      const blob = await HouseholdAPI.generateAuditReport(householdId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${household?.name || 'Household'}_${taxYear}_Audit_Report.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading report:', error);
    }
  };

  if (isLoading) {
    return (
      <Layout title="" subtitle="">
        <div className="p-6">
          Loading report...
        </div>
      </Layout>
    );
  }

  if (!household) {
    return (
      <Layout title="" subtitle="">
        <div className="p-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Household Not Found</h2>
            <Link href="/">
              <Button>Back to Dashboard</Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  // Filter returns for the specific tax year
  const taxYearReturns = household.clients.flatMap(client => 
    client.t1Returns.filter(t1Return => t1Return.taxYear === taxYear)
  );

  return (
    <Layout title="" subtitle="">
      <div className="p-6">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-gray-700">Dashboard</Link>
          <span>/</span>
          <Link href={`/household/${householdId}`} className="hover:text-gray-700">
            {household.name}
          </Link>
          <span>/</span>
          <span className="text-gray-900">Tax Report {taxYear}</span>
        </nav>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href={`/household/${householdId}`}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{household.name}</h1>
              <p className="text-gray-600">Tax Year {taxYear} Report</p>
            </div>
          </div>
          <Button onClick={handleDownloadReport} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Download PDF Report
          </Button>
        </div>

        {/* Key Household Data */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Key Household Data</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Column 1 */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-medium text-gray-900 mb-4">Household Financial Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Income:</span>
                    <span className="font-medium">
                      ${(() => {
                        let total = 0;
                        taxYearReturns.forEach(t1Return => {
                          const t1WithFields = t1Return as any;
                          if (t1WithFields.formFields && Array.isArray(t1WithFields.formFields)) {
                            const incomeField = t1WithFields.formFields.find((field: any) => 
                              field.fieldCode === '15000'
                            );
                            if (incomeField?.fieldValue) {
                              const value = parseFloat(String(incomeField.fieldValue).replace(/[,$\s]/g, ''));
                              if (!isNaN(value)) total += value;
                            }
                          }
                        });
                        return total.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        });
                      })()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Deductions:</span>
                    <span className="font-medium">
                      ${(() => {
                        let totalIncome = 0;
                        let totalTaxableIncome = 0;
                        
                        taxYearReturns.forEach(t1Return => {
                          const t1WithFields = t1Return as any;
                          if (t1WithFields.formFields && Array.isArray(t1WithFields.formFields)) {
                            // Total Income (Line 15000)
                            const incomeField = t1WithFields.formFields.find((field: any) => 
                              field.fieldCode === '15000'
                            );
                            // Taxable Income (Line 26000)
                            const taxableField = t1WithFields.formFields.find((field: any) => 
                              field.fieldCode === '26000'
                            );
                            
                            if (incomeField?.fieldValue) {
                              const value = parseFloat(String(incomeField.fieldValue).replace(/[,$\s]/g, ''));
                              if (!isNaN(value)) totalIncome += value;
                            }
                            
                            if (taxableField?.fieldValue) {
                              const value = parseFloat(String(taxableField.fieldValue).replace(/[,$\s]/g, ''));
                              if (!isNaN(value)) totalTaxableIncome += value;
                            }
                          }
                        });
                        
                        const totalDeductions = totalIncome - totalTaxableIncome;
                        return totalDeductions.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        });
                      })()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Credits:</span>
                    <span className="font-medium">
                      ${(() => {
                        let total = 0;
                        taxYearReturns.forEach(t1Return => {
                          const t1WithFields = t1Return as any;
                          if (t1WithFields.formFields && Array.isArray(t1WithFields.formFields)) {
                            // Basic personal amount (Line 35000)
                            const line35000Field = t1WithFields.formFields.find((field: any) => 
                              field.fieldCode === '35000'
                            );
                            // Other federal credits (Line 31000)
                            const line31000Field = t1WithFields.formFields.find((field: any) => 
                              field.fieldCode === '31000'
                            );
                            // Provincial credits (Line 58350 for Ontario)
                            const line58350Field = t1WithFields.formFields.find((field: any) => 
                              field.fieldCode === '58350'
                            );
                            
                            const line35000 = line35000Field?.fieldValue ? 
                              parseFloat(String(line35000Field.fieldValue).replace(/[,$\s]/g, '')) : 0;
                            const line31000 = line31000Field?.fieldValue ? 
                              parseFloat(String(line31000Field.fieldValue).replace(/[,$\s]/g, '')) : 0;
                            const line58350 = line58350Field?.fieldValue ? 
                              parseFloat(String(line58350Field.fieldValue).replace(/[,$\s]/g, '')) : 0;
                            
                            if (!isNaN(line35000)) total += line35000;
                            if (!isNaN(line31000)) total += line31000;
                            if (!isNaN(line58350)) total += line58350;
                          }
                        });
                        return total.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        });
                      })()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total CPP Contributions:</span>
                    <span className="font-medium">
                      ${(() => {
                        let total = 0;
                        taxYearReturns.forEach(t1Return => {
                          const t1WithFields = t1Return as any;
                          if (t1WithFields.formFields && Array.isArray(t1WithFields.formFields)) {
                            const cppField = t1WithFields.formFields.find((field: any) => 
                              field.fieldCode === '30800'
                            );
                            if (cppField?.fieldValue) {
                              const value = parseFloat(String(cppField.fieldValue).replace(/[,$\s]/g, ''));
                              if (!isNaN(value)) total += value;
                            }
                          }
                        });
                        return total.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        });
                      })()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total EI Premiums:</span>
                    <span className="font-medium">
                      ${(() => {
                        let total = 0;
                        taxYearReturns.forEach(t1Return => {
                          const t1WithFields = t1Return as any;
                          if (t1WithFields.formFields && Array.isArray(t1WithFields.formFields)) {
                            const eiField = t1WithFields.formFields.find((field: any) => 
                              field.fieldCode === '31200'
                            );
                            if (eiField?.fieldValue) {
                              const value = parseFloat(String(eiField.fieldValue).replace(/[,$\s]/g, ''));
                              if (!isNaN(value)) total += value;
                            }
                          }
                        });
                        return total.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        });
                      })()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Tax Bill:</span>
                    <span className="font-medium">
                      ${(() => {
                        let total = 0;
                        taxYearReturns.forEach(t1Return => {
                          const t1WithFields = t1Return as any;
                          if (t1WithFields.formFields && Array.isArray(t1WithFields.formFields)) {
                            const taxField = t1WithFields.formFields.find((field: any) => 
                              field.fieldCode === '42000'
                            );
                            if (taxField?.fieldValue) {
                              const value = parseFloat(String(taxField.fieldValue).replace(/[,$\s]/g, ''));
                              if (!isNaN(value)) total += value;
                            }
                          }
                        });
                        return total.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        });
                      })()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Net Income:</span>
                    <span className="font-medium">
                      ${(() => {
                        let total = 0;
                        taxYearReturns.forEach(t1Return => {
                          const t1WithFields = t1Return as any;
                          if (t1WithFields.formFields && Array.isArray(t1WithFields.formFields)) {
                            const netIncomeField = t1WithFields.formFields.find((field: any) => 
                              field.fieldCode === '23600'
                            );
                            if (netIncomeField?.fieldValue) {
                              const value = parseFloat(String(netIncomeField.fieldValue).replace(/[,$\s]/g, ''));
                              if (!isNaN(value)) total += value;
                            }
                          }
                        });
                        return total.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        });
                      })()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Column 2 */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-medium text-gray-900 mb-4">Processing Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">T1 Returns Processed:</span>
                    <span className="font-medium">{taxYearReturns.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Completed Returns:</span>
                    <span className="font-medium">
                      {taxYearReturns.filter(t => t.processingStatus === 'completed').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Processing Status:</span>
                    <span className="font-medium">
                      {taxYearReturns.length > 0 && taxYearReturns.every(t => t.processingStatus === 'completed') 
                        ? 'Complete' 
                        : 'In Progress'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Last Updated:</span>
                    <span className="font-medium">
                      {taxYearReturns.length > 0 
                        ? new Date(Math.max(...taxYearReturns.map(t => new Date(t.updatedAt).getTime()))).toLocaleDateString()
                        : 'N/A'
                      }
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

      </div>
    </Layout>
  );
}