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

            {/* Tax Rates */}
            <div className="mb-6">
              <div className="grid grid-cols-1 gap-6">
                {(() => {
                  // Calculate tax rates for the individual client
                  let totalIncome = 0;
                  let taxableIncome = 0;
                  let totalTax = 0;
                  let federalTax = 0;
                  let provincialTax = 0;
                  
                  if (taxYearReturns.length > 0) {
                    const t1Return = taxYearReturns[0];
                    const t1WithFields = t1Return as any;
                    
                    if (t1WithFields && t1WithFields.formFields) {
                      const incomeField = t1WithFields.formFields.find((field: any) => field.fieldCode === '15000');
                      const taxableIncomeField = t1WithFields.formFields.find((field: any) => field.fieldCode === '26000');
                      const totalTaxField = t1WithFields.formFields.find((field: any) => field.fieldCode === '43700');
                      const federalTaxField = t1WithFields.formFields.find((field: any) => field.fieldCode === '42000');
                      const provincialTaxField = t1WithFields.formFields.find((field: any) => field.fieldCode === '42800');
                      
                      totalIncome = incomeField?.fieldValue ? parseFloat(String(incomeField.fieldValue).replace(/[,$\s]/g, '')) : 0;
                      taxableIncome = taxableIncomeField?.fieldValue ? parseFloat(String(taxableIncomeField.fieldValue).replace(/[,$\s]/g, '')) : 0;
                      totalTax = totalTaxField?.fieldValue ? parseFloat(String(totalTaxField.fieldValue).replace(/[,$\s]/g, '')) : 0;
                      federalTax = federalTaxField?.fieldValue ? parseFloat(String(federalTaxField.fieldValue).replace(/[,$\s]/g, '')) : 0;
                      provincialTax = provincialTaxField?.fieldValue ? parseFloat(String(provincialTaxField.fieldValue).replace(/[,$\s]/g, '')) : 0;
                      
                      // Fallback: if total tax is 0, use federal + provincial
                      if (totalTax === 0 && (federalTax > 0 || provincialTax > 0)) {
                        totalTax = federalTax + provincialTax;
                      }
                    }
                  }
                  
                  // Calculate rates - use the same calculation as "You Paid" percentage in Financial Summary
                  let averageRate = 0;
                  if (taxYearReturns.length > 0) {
                    const t1Return = taxYearReturns[0];
                    const t1WithFields = t1Return as any;
                    
                    if (t1WithFields && t1WithFields.formFields) {
                      const incomeField = t1WithFields.formFields.find((field: any) => field.fieldCode === '15000');
                      const federalTaxField = t1WithFields.formFields.find((field: any) => field.fieldCode === '42000');
                      const provincialTaxField = t1WithFields.formFields.find((field: any) => field.fieldCode === '42800');
                      const cppField = t1WithFields.formFields.find((field: any) => field.fieldCode === '30800');
                      const eiField = t1WithFields.formFields.find((field: any) => field.fieldCode === '31200');
                      
                      const kpiTotalIncome = incomeField?.fieldValue ? parseFloat(String(incomeField.fieldValue).replace(/[,$\s]/g, '')) : 0;
                      const kpiFederalTax = federalTaxField?.fieldValue ? parseFloat(String(federalTaxField.fieldValue).replace(/[,$\s]/g, '')) : 0;
                      const kpiProvincialTax = provincialTaxField?.fieldValue ? parseFloat(String(provincialTaxField.fieldValue).replace(/[,$\s]/g, '')) : 0;
                      const kpiCppContributions = cppField?.fieldValue ? parseFloat(String(cppField.fieldValue).replace(/[,$\s]/g, '')) : 0;
                      const kpiEiPremiums = eiField?.fieldValue ? parseFloat(String(eiField.fieldValue).replace(/[,$\s]/g, '')) : 0;
                      
                      // Calculate net income: Income - Federal Tax - Provincial Tax - CPP - EI
                      const kpiNetIncome = kpiTotalIncome - kpiFederalTax - kpiProvincialTax - kpiCppContributions - kpiEiPremiums;
                      const netIncomePercentage = kpiTotalIncome > 0 ? (kpiNetIncome / kpiTotalIncome) * 100 : 0;
                      averageRate = 100 - netIncomePercentage; // "You Paid" percentage
                    }
                  }
                  
                  // Calculate marginal rate based on taxable income and Ontario tax brackets
                  let marginalRate = 0;
                  if (taxableIncome > 0) {
                    // Combined federal + Ontario marginal rates for 2024 (with surtax)
                    const combinedBrackets = [
                      { min: 0, max: 51446, rate: 20.05 },      // 15% + 5.05%
                      { min: 51446, max: 55867, rate: 24.15 },  // 15% + 9.15%
                      { min: 55867, max: 102894, rate: 29.65 }, // 20.5% + 9.15%
                      { min: 102894, max: 111733, rate: 31.48 }, // 20.5% + 10.98% (with surtax)
                      { min: 111733, max: 150000, rate: 37.91 }, // 26% + 11.91% (with surtax)
                      { min: 150000, max: 173205, rate: 43.41 }, // 26% + 17.41% (with surtax)
                      { min: 173205, max: 220000, rate: 46.16 }, // 29% + 17.16% (with surtax)
                      { min: 220000, max: 246752, rate: 47.74 }, // 29% + 18.74% (with surtax)
                      { min: 246752, max: Infinity, rate: 53.53 } // 33% + 20.53% (with surtax)
                    ];
                    
                    // Find the appropriate bracket
                    const currentBracket = combinedBrackets.find(bracket => 
                      taxableIncome > bracket.min && taxableIncome <= bracket.max
                    ) || combinedBrackets[combinedBrackets.length - 1];
                    
                    marginalRate = currentBracket.rate;
                  }
                  
                  return (
                    <Card>
                      <CardContent className="p-6">
                        <h3 className="font-medium text-gray-900 mb-6">{targetClient.firstName} {targetClient.lastName} - Tax Rates</h3>
                        
                        <div className="grid grid-cols-2 gap-4">
                          {/* Average Rate KPI */}
                          <div className="text-center">
                            <div className="text-sm font-medium text-gray-700 mb-2">Average</div>
                            <div className="text-3xl font-bold text-primary">
                              {averageRate.toFixed(2)}%
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              You Paid %
                            </div>
                          </div>

                          {/* Marginal Rate KPI */}
                          <div className="text-center">
                            <div className="text-sm font-medium text-gray-700 mb-2">Marginal</div>
                            <div className="text-3xl font-bold text-primary">
                              {marginalRate.toFixed(2)}%
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Combined Rate
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })()}
              </div>
            </div>

            {/* Combined Tax Bracket Analysis and Visualization */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Combined Tax Bracket Analysis</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Tax Bracket Analysis Table */}
                {(() => {
                // Get taxable income for the individual client
                let taxableIncome = 0;
                let clientName = `${targetClient.firstName} ${targetClient.lastName}`;
                
                if (taxYearReturns.length > 0) {
                  const t1Return = taxYearReturns[0];
                  const t1WithFields = t1Return as any;
                  
                  if (t1WithFields.formFields && Array.isArray(t1WithFields.formFields)) {
                    const taxableField = t1WithFields.formFields.find((field: any) => field.fieldCode === '26000');
                    if (taxableField?.fieldValue) {
                      const value = parseFloat(String(taxableField.fieldValue).replace(/[,$\s]/g, ''));
                      if (!isNaN(value)) taxableIncome = value;
                    }
                  }
                }

                // 2024 Combined Federal + Provincial Tax Brackets (Ontario)
                const combinedBrackets = [
                  { rate: 20.05, min: 0, max: 51446, label: "20.05%" },
                  { rate: 24.15, min: 51446, max: 55867, label: "24.15%" },
                  { rate: 29.65, min: 55867, max: 102894, label: "29.65%" },
                  { rate: 31.48, min: 102894, max: 111733, label: "31.48%" },
                  { rate: 37.91, min: 111733, max: 150000, label: "37.91%" },
                  { rate: 43.41, min: 150000, max: 173205, label: "43.41%" },
                  { rate: 46.16, min: 173205, max: 220000, label: "46.16%" },
                  { rate: 47.74, min: 220000, max: 246752, label: "47.74%" },
                  { rate: 53.53, min: 246752, max: Infinity, label: "53.53%" }
                ];

                // Function to calculate individual tax breakdown
                const calculateTaxBreakdown = (income: number) => {
                  // 2024 Basic Personal Amounts
                  const federalBPA = 15705;
                  const ontarioBPA = 12399;
                  
                  // Calculate gross combined tax first
                  let grossCombinedTax = 0;
                  const breakdown = combinedBrackets.map(bracket => {
                    let incomeInBracket = 0;
                    let taxFromBracket = 0;

                    if (income > bracket.min) {
                      const maxForBracket = Math.min(income, bracket.max);
                      incomeInBracket = maxForBracket - bracket.min;
                      taxFromBracket = incomeInBracket * (bracket.rate / 100);
                      grossCombinedTax += taxFromBracket;
                    }

                    return {
                      rate: bracket.label,
                      threshold: `$${bracket.min.toLocaleString()} to ${bracket.max === Infinity ? 'above' : '$' + bracket.max.toLocaleString()}`,
                      incomeInBracket: incomeInBracket,
                      tax: taxFromBracket,
                      ratePercent: bracket.rate
                    };
                  });
                  
                  // Calculate basic personal amount credits
                  const federalBPACredit = federalBPA * 0.15;
                  const ontarioBPACredit = ontarioBPA * 0.0505;
                  const totalBPACredits = federalBPACredit + ontarioBPACredit;
                  
                  // Adjust the tax in each bracket proportionally to account for BPA credits
                  const netCombinedTax = Math.max(0, grossCombinedTax - totalBPACredits);
                  const adjustmentRatio = grossCombinedTax > 0 ? netCombinedTax / grossCombinedTax : 0;
                  
                  return breakdown.map(bracket => ({
                    ...bracket,
                    tax: bracket.tax * adjustmentRatio
                  }));
                };

                const taxBreakdown = calculateTaxBreakdown(taxableIncome);

                return (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg font-medium text-gray-900">
                        {clientName} - Combined Tax Bracket Analysis
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-sm">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="text-left py-2 px-2 text-gray-900 font-medium">Rate</th>
                              <th className="text-left py-2 px-2 text-gray-900 font-medium">Threshold</th>
                              <th className="text-left py-2 px-2 text-gray-900 font-medium">Income</th>
                              <th className="text-left py-2 px-2 text-gray-900 font-medium">Tax</th>
                            </tr>
                          </thead>
                          <tbody>
                            {taxBreakdown.map((bracket, index) => {
                              const isCurrentBracket = taxableIncome > combinedBrackets[index].min && 
                                                      taxableIncome <= combinedBrackets[index].max;
                              return (
                                <tr 
                                  key={index} 
                                  className={`border-b border-gray-100 ${
                                    isCurrentBracket ? 'border-2' : ''
                                  }`}
                                  style={isCurrentBracket ? { borderColor: '#D4B26A' } : {}}
                                >
                                  <td className="py-2 px-2 font-medium text-primary">{bracket.rate}</td>
                                  <td className="py-2 px-2 text-gray-700 text-xs">{bracket.threshold}</td>
                                  <td className="py-2 px-2 text-gray-700 text-xs">
                                    ${bracket.incomeInBracket.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                  </td>
                                  <td className="py-2 px-2 text-gray-700 text-xs">
                                    ${bracket.tax.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                </tr>
                              );
                            })}
                            <tr className="border-t-2 border-gray-300 font-semibold">
                              <td className="py-2 px-2 text-gray-900">Total</td>
                              <td className="py-2 px-2"></td>
                              <td className="py-2 px-2 text-gray-900">
                                ${taxableIncome.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                              </td>
                              <td className="py-2 px-2 text-gray-900">
                                ${taxBreakdown.reduce((sum, bracket) => sum + bracket.tax, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                );
                })()}
                
                {/* Tax Bracket Visualization */}
                {(() => {
                // Get taxable income for visualization
                let taxableIncome = 0;
                
                if (taxYearReturns.length > 0) {
                  const t1Return = taxYearReturns[0];
                  const t1WithFields = t1Return as any;
                  
                  if (t1WithFields.formFields && Array.isArray(t1WithFields.formFields)) {
                    const taxableField = t1WithFields.formFields.find((field: any) => field.fieldCode === '26000');
                    if (taxableField?.fieldValue) {
                      const value = parseFloat(String(taxableField.fieldValue).replace(/[,$\s]/g, ''));
                      if (!isNaN(value)) taxableIncome = value;
                    }
                  }
                }

                return (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg font-medium text-gray-900">
                        {targetClient.firstName} {targetClient.lastName} - Combined Tax Bracket Visualization
                      </CardTitle>
                      <div className="text-sm text-gray-600">
                        Taxable Income: ${taxableIncome.toLocaleString()}
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      {(() => {
                        // Define the income types and their rates
                        const incomeTypes = [
                          { 
                            name: 'Ordinary Income',
                            rates: [20.05, 24.15, 29.65, 31.48, 37.91, 43.41, 46.16, 47.74, 53.53]
                          },
                          { 
                            name: 'Capital Gains',
                            rates: [10.03, 12.08, 14.83, 15.74, 18.96, 21.71, 23.08, 23.87, 26.77]
                          },
                          { 
                            name: 'Eligible Dividends',
                            rates: [-1.20, 1.64, 5.07, 6.31, 11.99, 17.02, 19.29, 20.73, 39.34]
                          },
                          { 
                            name: 'Non-Eligible Dividends',
                            rates: [13.95, 16.84, 21.43, 22.86, 27.54, 31.43, 33.39, 34.49, 47.74]
                          }
                        ];

                        const combinedThresholds = [0, 51446, 55867, 102894, 111733, 150000, 173205, 220000, 246752];
                        const thresholdLabels = ['$0', '$51k', '$56k', '$103k', '$112k', '$150k', '$173k', '$220k', '$247k', '$300k'];

                        return (
                          <div className="space-y-3">
                            {/* Four horizontal bar charts stacked vertically */}
                            {incomeTypes.map((incomeType, typeIndex) => (
                              <div key={typeIndex} className="mb-6">
                                <h4 className="font-medium text-sm text-gray-700 mb-3 text-center">
                                  {incomeType.name}
                                </h4>
                                
                                <div className="relative">
                                  {/* Bar chart container */}
                                  <div className="bg-gray-100 h-72 rounded relative">
                                    {/* Individual tax bracket bars */}
                                    {incomeType.rates.map((rate, bracketIndex) => {
                                      const isCurrentBracket = taxableIncome >= combinedThresholds[bracketIndex] && 
                                                              (bracketIndex === 8 || taxableIncome < combinedThresholds[bracketIndex + 1]);
                                      
                                      // Calculate bar height based on rate (normalize to 0-100% range)
                                      const maxRate = Math.max(...incomeType.rates.map(r => Math.abs(r)));
                                      const normalizedRate = Math.abs(rate) / maxRate;
                                      const barHeight = Math.max(8, normalizedRate * 90); // Minimum 8% height
                                      
                                      return (
                                        <div
                                          key={bracketIndex}
                                          className={`absolute bottom-0 flex items-end justify-center text-black text-xs font-medium ${
                                            isCurrentBracket ? 'bg-[#C7E6C2]' : 'bg-[#88AA73]'
                                          }`}
                                          style={{
                                            left: `${(bracketIndex / 9) * 100}%`,
                                            width: `${100 / 9}%`,
                                            height: `${barHeight}%`,
                                            borderRadius: '2px 2px 0 0'
                                          }}
                                        >
                                          <span className="pb-1 z-20 relative">
                                            {rate.toFixed(1)}%
                                          </span>
                                        </div>
                                      );
                                    })}
                                    
                                    {/* Income position indicator line */}
                                    {taxableIncome > 0 && (
                                      <div 
                                        className="absolute top-0 w-0.5 h-full z-30"
                                        style={{
                                          left: `${Math.min(95, (taxableIncome / 300000) * 100)}%`,
                                          backgroundColor: '#D4B26A'
                                        }}
                                      />
                                    )}
                                  </div>
                                  
                                  {/* Bottom scale labels */}
                                  <div className="flex justify-between text-xs text-gray-600 mt-1">
                                    {thresholdLabels.slice(0, -1).map((label, index) => (
                                      <span key={index} style={{ marginLeft: index === 0 ? '0' : '-10px' }}>
                                        {label}
                                      </span>
                                    ))}
                                    <span style={{ marginRight: '0' }}>$300k</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </CardContent>
                  </Card>
                );
                })()}
              </div>
            </div>
          </>
        )}
      </div>
      </Layout>
    </TooltipProvider>
  );
}