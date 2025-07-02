import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { ArrowLeft, Download, FileText, Calendar, User, Info } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HouseholdAPI } from "@/lib/api";
import { HouseholdWithClients } from "@shared/schema";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as ChartTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

export default function IndividualTaxReport() {
  const params = useParams();
  const householdId = parseInt(params.householdId || "0");
  const clientId = parseInt(params.clientId || "0");
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
      const targetClient = household?.clients.find(c => c.id === clientId);
      a.download = `${targetClient?.firstName}_${targetClient?.lastName}_${taxYear}_Individual_Report.pdf`;
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

  // Find the target client
  const targetClient = household.clients.find(c => c.id === clientId);
  if (!targetClient) {
    return (
      <Layout title="" subtitle="">
        <div className="p-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Client Not Found</h2>
            <Link href={`/household/${householdId}`}>
              <Button>Back to Household</Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  // Filter returns for the specific tax year and client
  const taxYearReturns = targetClient.t1Returns.filter(t1Return => t1Return.taxYear === taxYear);

  // Helper function to get client's province from T1 data
  const getClientProvince = () => {
    for (const t1Return of taxYearReturns) {
      const t1WithFields = t1Return as any;
      if (t1WithFields.formFields && Array.isArray(t1WithFields.formFields)) {
        const provinceField = t1WithFields.formFields.find((field: any) => 
          field.fieldCode === 'province' || field.fieldCode === 'prov'
        );
        if (provinceField?.fieldValue) {
          return provinceField.fieldValue.toString().toUpperCase();
        }
      }
    }
    return 'ON'; // Default to Ontario
  };

  return (
    <TooltipProvider>
      <Layout title="" subtitle="">
      <div className="p-6">
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
              <h1 className="text-2xl font-bold text-gray-900">{targetClient.firstName} {targetClient.lastName}</h1>
              <p className="text-gray-600">Tax Year {taxYear} Individual Report</p>
            </div>
          </div>
          <Button onClick={handleDownloadReport} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
        </div>

        {taxYearReturns.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Tax Data Available</h3>
            <p className="text-gray-600">
              No T1 returns found for {targetClient.firstName} {targetClient.lastName} for tax year {taxYear}.
            </p>
          </div>
        ) : (
          <>
            {/* Key Individual Data */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Key Individual Data</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Column 1 */}
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-medium text-gray-900 mb-4">Individual Financial Summary</h3>
                    <div className="space-y-3">
                      {(() => {
                        // Calculate totals for individual client only
                        let totalIncomeSum = 0;
                        let totalTaxableIncomeSum = 0;
                        let totalTaxSum = 0;
                        let totalCreditsSum = 0;
                        
                        taxYearReturns.forEach(t1Return => {
                          const t1WithFields = t1Return as any;
                          if (t1WithFields.formFields && Array.isArray(t1WithFields.formFields)) {
                            const incomeField = t1WithFields.formFields.find((field: any) => field.fieldCode === '15000');
                            const taxableField = t1WithFields.formFields.find((field: any) => field.fieldCode === '26000');
                            const taxField = t1WithFields.formFields.find((field: any) => field.fieldCode === '42000');
                            const creditsField = t1WithFields.formFields.find((field: any) => field.fieldCode === '35000');
                            
                            if (incomeField?.fieldValue) {
                              const value = parseFloat(String(incomeField.fieldValue).replace(/[,$\s]/g, ''));
                              if (!isNaN(value)) totalIncomeSum += value;
                            }
                            if (taxableField?.fieldValue) {
                              const value = parseFloat(String(taxableField.fieldValue).replace(/[,$\s]/g, ''));
                              if (!isNaN(value)) totalTaxableIncomeSum += value;
                            }
                            if (taxField?.fieldValue) {
                              const value = parseFloat(String(taxField.fieldValue).replace(/[,$\s]/g, ''));
                              if (!isNaN(value)) totalTaxSum += value;
                            }
                            if (creditsField?.fieldValue) {
                              const value = parseFloat(String(creditsField.fieldValue).replace(/[,$\s]/g, ''));
                              if (!isNaN(value)) totalCreditsSum += value;
                            }
                            
                            // Also add Ontario non-refundable tax credits (Line 61500) if available
                            const ontarioCreditsField = t1WithFields.formFields.find((field: any) => field.fieldCode === '61500');
                            if (ontarioCreditsField?.fieldValue) {
                              const value = parseFloat(String(ontarioCreditsField.fieldValue).replace(/[,$\s]/g, ''));
                              if (!isNaN(value)) totalCreditsSum += value;
                            }
                          }
                        });
                        
                        const totalDeductionsSum = totalIncomeSum - totalTaxableIncomeSum;
                        
                        const calculatePercentage = (amount: number) => {
                          if (totalIncomeSum === 0) return '0.0%';
                          return `${((amount / totalIncomeSum) * 100).toFixed(2)}%`;
                        };
                        
                        return (
                          <>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600">Income:</span>
                              <div className="text-right">
                                <span className="font-medium text-primary">
                                  ${totalIncomeSum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-sm text-gray-500">(100.0%)</span>
                                </span>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600">Deductions:</span>
                              <div className="text-right">
                                <span className="font-medium text-primary">
                                  ${totalDeductionsSum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-sm text-gray-500">({calculatePercentage(totalDeductionsSum)})</span>
                                </span>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600">Taxable Income:</span>
                              <div className="text-right">
                                <span className="font-medium text-primary">
                                  ${totalTaxableIncomeSum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-sm text-gray-500">({calculatePercentage(totalTaxableIncomeSum)})</span>
                                </span>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600">Tax Credits:</span>
                              <div className="text-right">
                                <span className="font-medium text-primary">
                                  ${totalCreditsSum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-sm text-gray-500">({calculatePercentage(totalCreditsSum)})</span>
                                </span>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600">Federal Tax:</span>
                              <div className="text-right">
                                <span className="font-medium text-primary">
                                  ${(() => {
                                    let total = 0;
                                    taxYearReturns.forEach(t1Return => {
                                      const t1WithFields = t1Return as any;
                                      if (t1WithFields.formFields && Array.isArray(t1WithFields.formFields)) {
                                        const federalTaxField = t1WithFields.formFields.find((field: any) => 
                                          field.fieldCode === '42000'
                                        );
                                        if (federalTaxField?.fieldValue) {
                                          const value = parseFloat(String(federalTaxField.fieldValue).replace(/[,$\s]/g, ''));
                                          if (!isNaN(value)) total += value;
                                        }
                                      }
                                    });
                                    return total.toLocaleString('en-US', {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2
                                    });
                                  })()} <span className="text-sm text-gray-500">({(() => {
                                    let total = 0;
                                    taxYearReturns.forEach(t1Return => {
                                      const t1WithFields = t1Return as any;
                                      if (t1WithFields.formFields && Array.isArray(t1WithFields.formFields)) {
                                        const federalTaxField = t1WithFields.formFields.find((field: any) => 
                                          field.fieldCode === '42000'
                                        );
                                        if (federalTaxField?.fieldValue) {
                                          const value = parseFloat(String(federalTaxField.fieldValue).replace(/[,$\s]/g, ''));
                                          if (!isNaN(value)) total += value;
                                        }
                                      }
                                    });
                                    return calculatePercentage(total);
                                  })()})</span>
                                </span>
                              </div>
                            </div>
                            {getClientProvince() === 'ON' && (
                              <div className="flex justify-between items-center">
                                <span className="text-gray-600">Provincial Tax:</span>
                                <div className="text-right">
                                  <span className="font-medium text-primary">
                                    ${(() => {
                                      let total = 0;
                                      taxYearReturns.forEach(t1Return => {
                                        const t1WithFields = t1Return as any;
                                        if (t1WithFields.formFields && Array.isArray(t1WithFields.formFields)) {
                                          const provincialTaxField = t1WithFields.formFields.find((field: any) => 
                                            field.fieldCode === '42800'
                                          );
                                          if (provincialTaxField?.fieldValue) {
                                            const value = parseFloat(String(provincialTaxField.fieldValue).replace(/[,$\s]/g, ''));
                                            if (!isNaN(value)) total += value;
                                          }
                                        }
                                      });
                                      return total.toLocaleString('en-US', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2
                                      });
                                    })()} <span className="text-sm text-gray-500">({(() => {
                                      let total = 0;
                                      taxYearReturns.forEach(t1Return => {
                                        const t1WithFields = t1Return as any;
                                        if (t1WithFields.formFields && Array.isArray(t1WithFields.formFields)) {
                                          const provincialTaxField = t1WithFields.formFields.find((field: any) => 
                                            field.fieldCode === '42800'
                                          );
                                          if (provincialTaxField?.fieldValue) {
                                            const value = parseFloat(String(provincialTaxField.fieldValue).replace(/[,$\s]/g, ''));
                                            if (!isNaN(value)) total += value;
                                          }
                                        }
                                      });
                                      return calculatePercentage(total);
                                    })()})</span>
                                  </span>
                                </div>
                              </div>
                            )}
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600">CPP Contributions:</span>
                              <div className="text-right">
                                <span className="font-medium text-primary">
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
                                  })()} <span className="text-sm text-gray-500">({(() => {
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
                                    return calculatePercentage(total);
                                  })()})</span>
                                </span>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600">EI Premiums:</span>
                              <div className="text-right">
                                <span className="font-medium text-primary">
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
                                  })()} <span className="text-sm text-gray-500">({(() => {
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
                                    return calculatePercentage(total);
                                  })()})</span>
                                </span>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600">Net Income:</span>
                              <div className="text-right">
                                <span className="font-medium text-primary">
                                  ${(() => {
                                    let totalNetIncome = 0;
                                    taxYearReturns.forEach(t1Return => {
                                      const t1WithFields = t1Return as any;
                                      if (t1WithFields.formFields && Array.isArray(t1WithFields.formFields)) {
                                        const incomeField = t1WithFields.formFields.find((field: any) => field.fieldCode === '15000');
                                        const taxField = t1WithFields.formFields.find((field: any) => field.fieldCode === '43500');
                                        const federalTaxField = t1WithFields.formFields.find((field: any) => field.fieldCode === '42000');
                                        const provincialTaxField = t1WithFields.formFields.find((field: any) => field.fieldCode === '42800');
                                        const cppField = t1WithFields.formFields.find((field: any) => field.fieldCode === '30800');
                                        const eiField = t1WithFields.formFields.find((field: any) => field.fieldCode === '31200');
                                        
                                        const income = incomeField?.fieldValue ? parseFloat(String(incomeField.fieldValue).replace(/[,$\s]/g, '')) : 0;
                                        const tax = taxField?.fieldValue ? parseFloat(String(taxField.fieldValue).replace(/[,$\s]/g, '')) : 0;
                                        const federalTax = federalTaxField?.fieldValue ? parseFloat(String(federalTaxField.fieldValue).replace(/[,$\s]/g, '')) : 0;
                                        const provincialTax = provincialTaxField?.fieldValue ? parseFloat(String(provincialTaxField.fieldValue).replace(/[,$\s]/g, '')) : 0;
                                        const cpp = cppField?.fieldValue ? parseFloat(String(cppField.fieldValue).replace(/[,$\s]/g, '')) : 0;
                                        const ei = eiField?.fieldValue ? parseFloat(String(eiField.fieldValue).replace(/[,$\s]/g, '')) : 0;
                                        
                                        // Calculate total tax (use field 43500 if available, otherwise add federal + provincial)
                                        const calculatedTotalTax = tax > 0 ? tax : (federalTax + provincialTax);
                                        
                                        if (!isNaN(income)) {
                                          totalNetIncome += (income - calculatedTotalTax - cpp - ei);
                                        }
                                      }
                                    });
                                    return totalNetIncome.toLocaleString('en-US', {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2
                                    });
                                  })()} <span className="text-sm text-gray-500">({(() => {
                                    let totalNetIncome = 0;
                                    taxYearReturns.forEach(t1Return => {
                                      const t1WithFields = t1Return as any;
                                      if (t1WithFields.formFields && Array.isArray(t1WithFields.formFields)) {
                                        const incomeField = t1WithFields.formFields.find((field: any) => field.fieldCode === '15000');
                                        const taxField = t1WithFields.formFields.find((field: any) => field.fieldCode === '43500');
                                        const federalTaxField = t1WithFields.formFields.find((field: any) => field.fieldCode === '42000');
                                        const provincialTaxField = t1WithFields.formFields.find((field: any) => field.fieldCode === '42800');
                                        const cppField = t1WithFields.formFields.find((field: any) => field.fieldCode === '30800');
                                        const eiField = t1WithFields.formFields.find((field: any) => field.fieldCode === '31200');
                                        
                                        const income = incomeField?.fieldValue ? parseFloat(String(incomeField.fieldValue).replace(/[,$\s]/g, '')) : 0;
                                        const tax = taxField?.fieldValue ? parseFloat(String(taxField.fieldValue).replace(/[,$\s]/g, '')) : 0;
                                        const federalTax = federalTaxField?.fieldValue ? parseFloat(String(federalTaxField.fieldValue).replace(/[,$\s]/g, '')) : 0;
                                        const provincialTax = provincialTaxField?.fieldValue ? parseFloat(String(provincialTaxField.fieldValue).replace(/[,$\s]/g, '')) : 0;
                                        const cpp = cppField?.fieldValue ? parseFloat(String(cppField.fieldValue).replace(/[,$\s]/g, '')) : 0;
                                        const ei = eiField?.fieldValue ? parseFloat(String(eiField.fieldValue).replace(/[,$\s]/g, '')) : 0;
                                        
                                        // Calculate total tax (use field 43500 if available, otherwise add federal + provincial)
                                        const calculatedTotalTax = tax > 0 ? tax : (federalTax + provincialTax);
                                        
                                        if (!isNaN(income)) {
                                          totalNetIncome += (income - calculatedTotalTax - cpp - ei);
                                        }
                                      }
                                    });
                                    return calculatePercentage(totalNetIncome);
                                  })()})</span>
                                </span>
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                    
                    {/* KPI Blocks */}
                    <div className="mt-6 grid grid-cols-2 gap-6">
                      {(() => {
                        // Calculate net income percentage for KPI blocks
                        let totalIncomeSum = 0;
                        let totalNetIncome = 0;
                        
                        taxYearReturns.forEach(t1Return => {
                          const t1WithFields = t1Return as any;
                          if (t1WithFields.formFields && Array.isArray(t1WithFields.formFields)) {
                            const incomeField = t1WithFields.formFields.find((field: any) => field.fieldCode === '15000');
                            const taxField = t1WithFields.formFields.find((field: any) => field.fieldCode === '43500');
                            const federalTaxField = t1WithFields.formFields.find((field: any) => field.fieldCode === '42000');
                            const provincialTaxField = t1WithFields.formFields.find((field: any) => field.fieldCode === '42800');
                            const cppField = t1WithFields.formFields.find((field: any) => field.fieldCode === '30800');
                            const eiField = t1WithFields.formFields.find((field: any) => field.fieldCode === '31200');
                            
                            const income = incomeField?.fieldValue ? parseFloat(String(incomeField.fieldValue).replace(/[,$\s]/g, '')) : 0;
                            const tax = taxField?.fieldValue ? parseFloat(String(taxField.fieldValue).replace(/[,$\s]/g, '')) : 0;
                            const federalTax = federalTaxField?.fieldValue ? parseFloat(String(federalTaxField.fieldValue).replace(/[,$\s]/g, '')) : 0;
                            const provincialTax = provincialTaxField?.fieldValue ? parseFloat(String(provincialTaxField.fieldValue).replace(/[,$\s]/g, '')) : 0;
                            const cpp = cppField?.fieldValue ? parseFloat(String(cppField.fieldValue).replace(/[,$\s]/g, '')) : 0;
                            const ei = eiField?.fieldValue ? parseFloat(String(eiField.fieldValue).replace(/[,$\s]/g, '')) : 0;
                            
                            // Calculate total tax (use field 43500 if available, otherwise add federal + provincial)
                            const calculatedTotalTax = tax > 0 ? tax : (federalTax + provincialTax);
                            
                            if (!isNaN(income)) {
                              totalIncomeSum += income;
                              totalNetIncome += (income - calculatedTotalTax - cpp - ei);
                            }
                          }
                        });
                        
                        const netIncomePercentage = totalIncomeSum > 0 ? (totalNetIncome / totalIncomeSum) * 100 : 0;
                        const youPaidPercentage = 100 - netIncomePercentage;
                        
                        return (
                          <>
                            {/* You Kept Block */}
                            <div className="rounded-lg p-8 text-center" style={{ backgroundColor: '#88AA73' }}>
                              <div className="text-lg font-medium mb-2" style={{ color: '#F9FAF8' }}>
                                You Kept
                              </div>
                              <div className="text-4xl font-bold" style={{ color: '#F9FAF8' }}>
                                {netIncomePercentage.toFixed(2)}%
                              </div>
                            </div>
                            
                            {/* You Paid Block */}
                            <div className="rounded-lg p-8 text-center" style={{ backgroundColor: '#D4B26A' }}>
                              <div className="text-lg font-medium mb-2" style={{ color: '#F9FAF8' }}>
                                You Paid
                              </div>
                              <div className="text-4xl font-bold" style={{ color: '#F9FAF8' }}>
                                {youPaidPercentage.toFixed(2)}%
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </CardContent>
                </Card>
                
                {/* Column 2 - Income Breakdown Pie Chart */}
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-medium text-gray-900 mb-4">Income Breakdown</h3>
                  {(() => {
                    // Calculate all the components for individual client
                    let totalIncomeSum = 0;
                    let federalTaxSum = 0;
                    let provincialTaxSum = 0;
                    let totalCppSum = 0;
                    let totalEiSum = 0;
                    
                    taxYearReturns.forEach(t1Return => {
                      const t1WithFields = t1Return as any;
                      if (t1WithFields.formFields && Array.isArray(t1WithFields.formFields)) {
                        const incomeField = t1WithFields.formFields.find((field: any) => field.fieldCode === '15000');
                        const federalTaxField = t1WithFields.formFields.find((field: any) => field.fieldCode === '42000');
                        const provincialTaxField = t1WithFields.formFields.find((field: any) => field.fieldCode === '42800');
                        const cppField = t1WithFields.formFields.find((field: any) => field.fieldCode === '30800');
                        const eiField = t1WithFields.formFields.find((field: any) => field.fieldCode === '31200');
                        
                        if (incomeField?.fieldValue) {
                          const value = parseFloat(String(incomeField.fieldValue).replace(/[,$\s]/g, ''));
                          if (!isNaN(value)) totalIncomeSum += value;
                        }
                        if (federalTaxField?.fieldValue) {
                          const value = parseFloat(String(federalTaxField.fieldValue).replace(/[,$\s]/g, ''));
                          if (!isNaN(value)) federalTaxSum += value;
                        }
                        if (provincialTaxField?.fieldValue) {
                          const value = parseFloat(String(provincialTaxField.fieldValue).replace(/[,$\s]/g, ''));
                          if (!isNaN(value)) provincialTaxSum += value;
                        }
                        if (cppField?.fieldValue) {
                          const value = parseFloat(String(cppField.fieldValue).replace(/[,$\s]/g, ''));
                          if (!isNaN(value)) totalCppSum += value;
                        }
                        if (eiField?.fieldValue) {
                          const value = parseFloat(String(eiField.fieldValue).replace(/[,$\s]/g, ''));
                          if (!isNaN(value)) totalEiSum += value;
                        }
                      }
                    });
                    
                    // Calculate net income using same method as Summary tab - simple formula
                    let individualNetIncome = 0;
                    taxYearReturns.forEach(t1Return => {
                      const t1WithFields = t1Return as any;
                      if (t1WithFields.formFields && Array.isArray(t1WithFields.formFields)) {
                        const incomeField = t1WithFields.formFields.find((field: any) => field.fieldCode === '15000');
                        const taxPaidField = t1WithFields.formFields.find((field: any) => field.fieldCode === '43700');
                        
                        const income = incomeField?.fieldValue ? parseFloat(String(incomeField.fieldValue).replace(/[,$\s]/g, '')) : 0;
                        const taxPaid = taxPaidField?.fieldValue ? parseFloat(String(taxPaidField.fieldValue).replace(/[,$\s]/g, '')) : 0;
                        
                        if (!isNaN(income)) {
                          individualNetIncome += (income - taxPaid);
                        }
                      }
                    });
                    
                    const pieData = [
                      {
                        name: 'Net Income',
                        value: individualNetIncome,
                        color: '#88AA73' // Primary green
                      },
                      {
                        name: 'Federal Tax',
                        value: federalTaxSum,
                        color: '#D4B26A' // Warning/Secondary accent
                      },
                      {
                        name: 'Provincial Tax',
                        value: provincialTaxSum,
                        color: '#C7E6C2' // Accent green
                      },
                      {
                        name: 'CPP Contributions',
                        value: totalCppSum,
                        color: '#A3A3A3' // Neutral gray
                      },
                      {
                        name: 'EI Premiums',
                        value: totalEiSum,
                        color: '#6B7AA2' // Muted blue-gray complementary to brand
                      }
                    ].filter(item => item.value > 0);

                    const CustomTooltip = ({ active, payload }: any) => {
                      if (active && payload && payload.length) {
                        const data = payload[0];
                        const percentage = ((data.value / totalIncomeSum) * 100).toFixed(2);
                        return (
                          <div className="bg-white p-3 border rounded shadow-lg">
                            <p className="font-medium">{data.name}</p>
                            <p className="text-sm text-gray-600">
                              ${data.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({percentage}%)
                            </p>
                          </div>
                        );
                      }
                      return null;
                    };

                    return (
                      <div>
                        <div className="h-96">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, value }) => {
                                  const percentage = ((value / totalIncomeSum) * 100).toFixed(2);
                                  return `${name}: ${percentage}%`;
                                }}
                                outerRadius={120}
                                fill="#8884d8"
                                dataKey="value"
                              >
                                {pieData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <ChartTooltip content={CustomTooltip} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        
                        {/* Custom Legend with Dollar Amounts */}
                        <div className="flex flex-wrap justify-center gap-4 mt-4">
                          {pieData.map((entry, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: entry.color }}
                              />
                              <span className="text-sm">
                                {entry.name}: ${entry.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}
      </div>
      </Layout>
    </TooltipProvider>
  );
}