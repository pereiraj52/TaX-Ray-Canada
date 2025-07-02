import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { ArrowLeft, Download, FileText, Calendar, User } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HouseholdAPI } from "@/lib/api";
import { HouseholdWithClients } from "@shared/schema";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

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
                  {(() => {
                    // Calculate totals first
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
                // Calculate all the components
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
                let householdNetIncome = 0;
                taxYearReturns.forEach(t1Return => {
                  const t1WithFields = t1Return as any;
                  if (t1WithFields.formFields && Array.isArray(t1WithFields.formFields)) {
                    const incomeField = t1WithFields.formFields.find((field: any) => field.fieldCode === '15000');
                    const taxPaidField = t1WithFields.formFields.find((field: any) => field.fieldCode === '43700');
                    
                    const income = incomeField?.fieldValue ? parseFloat(String(incomeField.fieldValue).replace(/[,$\s]/g, '')) : 0;
                    const taxPaid = taxPaidField?.fieldValue ? parseFloat(String(taxPaidField.fieldValue).replace(/[,$\s]/g, '')) : 0;
                    
                    if (!isNaN(income)) {
                      householdNetIncome += (income - taxPaid);
                    }
                  }
                });
                

                
                const pieData = [
                  {
                    name: 'Net Income',
                    value: householdNetIncome,
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
                          <Tooltip content={CustomTooltip} />
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

        {/* Individual Tax Analysis Table */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Individual Tax Analysis</h2>
          
          {/* Individual Financial Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {taxYearReturns.map((t1Return, index) => {
              const t1WithFields = t1Return as any;
              
              // Get client name from household data
              let clientName = `Person ${index + 1}`;
              if (t1Return.clientId && household?.clients) {
                const client = household.clients.find(c => c.id === t1Return.clientId);
                if (client) {
                  clientName = `${client.firstName} ${client.lastName}`;
                }
              } else if (t1Return.childId && household?.children) {
                const child = household.children.find(c => c.id === t1Return.childId);
                if (child) {
                  clientName = `${child.firstName} ${child.lastName}`;
                }
              }
              
              return (
                <Card key={`financial-${t1Return.id}`}>
                  <CardContent className="p-6">
                    <h3 className="font-medium text-gray-900 mb-4">{clientName} - Financial Summary</h3>
                    <div className="space-y-3">
                      {(() => {
                        // Calculate individual totals
                        let totalIncome = 0;
                        let totalTaxableIncome = 0;
                        let totalTax = 0;
                        let taxPaid = 0;
                        let totalCredits = 0;
                        let federalTax = 0;
                        let provincialTax = 0;
                        let cppContributions = 0;
                        let eiPremiums = 0;
                        
                        if (t1WithFields.formFields && Array.isArray(t1WithFields.formFields)) {
                          const incomeField = t1WithFields.formFields.find((field: any) => field.fieldCode === '15000');
                          const taxableField = t1WithFields.formFields.find((field: any) => field.fieldCode === '26000');
                          const taxField = t1WithFields.formFields.find((field: any) => field.fieldCode === '43500');
                          const taxPaidField = t1WithFields.formFields.find((field: any) => field.fieldCode === '43700');
                          const creditsField = t1WithFields.formFields.find((field: any) => field.fieldCode === '35000');
                          const federalTaxField = t1WithFields.formFields.find((field: any) => field.fieldCode === '42000');
                          const provincialTaxField = t1WithFields.formFields.find((field: any) => field.fieldCode === '42800');
                          const cppField = t1WithFields.formFields.find((field: any) => field.fieldCode === '30800');
                          const eiField = t1WithFields.formFields.find((field: any) => field.fieldCode === '31200');
                          
                          totalIncome = incomeField?.fieldValue ? parseFloat(String(incomeField.fieldValue).replace(/[,$\s]/g, '')) : 0;
                          totalTaxableIncome = taxableField?.fieldValue ? parseFloat(String(taxableField.fieldValue).replace(/[,$\s]/g, '')) : 0;
                          totalTax = taxField?.fieldValue ? parseFloat(String(taxField.fieldValue).replace(/[,$\s]/g, '')) : 0;
                          taxPaid = taxPaidField?.fieldValue ? parseFloat(String(taxPaidField.fieldValue).replace(/[,$\s]/g, '')) : 0;
                          totalCredits = creditsField?.fieldValue ? parseFloat(String(creditsField.fieldValue).replace(/[,$\s]/g, '')) : 0;
                          
                          // Also add Ontario non-refundable tax credits (Line 61500) if available
                          const ontarioCreditsField = t1WithFields.formFields.find((field: any) => field.fieldCode === '61500');
                          if (ontarioCreditsField?.fieldValue) {
                            const ontarioCredits = parseFloat(String(ontarioCreditsField.fieldValue).replace(/[,$\s]/g, ''));
                            if (!isNaN(ontarioCredits)) totalCredits += ontarioCredits;
                          }
                          
                          federalTax = federalTaxField?.fieldValue ? parseFloat(String(federalTaxField.fieldValue).replace(/[,$\s]/g, '')) : 0;
                          provincialTax = provincialTaxField?.fieldValue ? parseFloat(String(provincialTaxField.fieldValue).replace(/[,$\s]/g, '')) : 0;
                          cppContributions = cppField?.fieldValue ? parseFloat(String(cppField.fieldValue).replace(/[,$\s]/g, '')) : 0;
                          eiPremiums = eiField?.fieldValue ? parseFloat(String(eiField.fieldValue).replace(/[,$\s]/g, '')) : 0;
                        }
                        
                        const totalDeductions = totalIncome - totalTaxableIncome;
                        // Calculate net income using financial summary values: Income - Federal Tax - Provincial Tax - CPP - EI
                        const netIncome = totalIncome - federalTax - provincialTax - cppContributions - eiPremiums;
                        
                        const calculatePercentage = (amount: number) => {
                          if (totalIncome === 0) return '0.0%';
                          return `${((amount / totalIncome) * 100).toFixed(2)}%`;
                        };
                        
                        return (
                          <>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600">Income:</span>
                              <div className="text-right">
                                <span className="font-medium text-primary">
                                  ${totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-sm text-gray-500">(100.0%)</span>
                                </span>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600">Deductions:</span>
                              <div className="text-right">
                                <span className="font-medium text-primary">
                                  ${totalDeductions.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-sm text-gray-500">({calculatePercentage(totalDeductions)})</span>
                                </span>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600">Taxable Income:</span>
                              <div className="text-right">
                                <span className="font-medium text-primary">
                                  ${totalTaxableIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-sm text-gray-500">({calculatePercentage(totalTaxableIncome)})</span>
                                </span>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600">Tax Credits:</span>
                              <div className="text-right">
                                <span className="font-medium text-primary">
                                  ${totalCredits.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-sm text-gray-500">({calculatePercentage(totalCredits)})</span>
                                </span>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600">Federal Tax:</span>
                              <div className="text-right">
                                <span className="font-medium text-primary">
                                  ${federalTax.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-sm text-gray-500">({calculatePercentage(federalTax)})</span>
                                </span>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600">Provincial Tax:</span>
                              <div className="text-right">
                                <span className="font-medium text-primary">
                                  ${provincialTax.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-sm text-gray-500">({calculatePercentage(provincialTax)})</span>
                                </span>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600">CPP Contributions:</span>
                              <div className="text-right">
                                <span className="font-medium text-primary">
                                  ${cppContributions.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-sm text-gray-500">({calculatePercentage(cppContributions)})</span>
                                </span>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600">EI Premiums:</span>
                              <div className="text-right">
                                <span className="font-medium text-primary">
                                  ${eiPremiums.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-sm text-gray-500">({calculatePercentage(eiPremiums)})</span>
                                </span>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600">Net Income:</span>
                              <div className="text-right">
                                <span className="font-medium text-primary">
                                  ${netIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-sm text-gray-500">({calculatePercentage(netIncome)})</span>
                                </span>
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                    
                    {/* Individual KPI Blocks */}
                    <div className="mt-6 grid grid-cols-2 gap-6">
                      {(() => {
                        // Calculate individual net income percentage for KPI blocks using financial summary values
                        let kpiTotalIncome = 0;
                        let kpiFederalTax = 0;
                        let kpiProvincialTax = 0;
                        let kpiCppContributions = 0;
                        let kpiEiPremiums = 0;
                        
                        if (t1WithFields.formFields && Array.isArray(t1WithFields.formFields)) {
                          const incomeField = t1WithFields.formFields.find((field: any) => field.fieldCode === '15000');
                          const federalTaxField = t1WithFields.formFields.find((field: any) => field.fieldCode === '42000');
                          const provincialTaxField = t1WithFields.formFields.find((field: any) => field.fieldCode === '42800');
                          const cppField = t1WithFields.formFields.find((field: any) => field.fieldCode === '30800');
                          const eiField = t1WithFields.formFields.find((field: any) => field.fieldCode === '31200');
                          
                          kpiTotalIncome = incomeField?.fieldValue ? parseFloat(String(incomeField.fieldValue).replace(/[,$\s]/g, '')) : 0;
                          kpiFederalTax = federalTaxField?.fieldValue ? parseFloat(String(federalTaxField.fieldValue).replace(/[,$\s]/g, '')) : 0;
                          kpiProvincialTax = provincialTaxField?.fieldValue ? parseFloat(String(provincialTaxField.fieldValue).replace(/[,$\s]/g, '')) : 0;
                          kpiCppContributions = cppField?.fieldValue ? parseFloat(String(cppField.fieldValue).replace(/[,$\s]/g, '')) : 0;
                          kpiEiPremiums = eiField?.fieldValue ? parseFloat(String(eiField.fieldValue).replace(/[,$\s]/g, '')) : 0;
                        }
                        
                        // Calculate net income using financial summary values: Income - Federal Tax - Provincial Tax - CPP - EI
                        const kpiNetIncome = kpiTotalIncome - kpiFederalTax - kpiProvincialTax - kpiCppContributions - kpiEiPremiums;
                        const netIncomePercentage = kpiTotalIncome > 0 ? (kpiNetIncome / kpiTotalIncome) * 100 : 0;
                        const youPaidPercentage = 100 - netIncomePercentage;
                        
                        return (
                          <>
                            {/* You Kept Block */}
                            <div className="rounded-lg p-6 text-center" style={{ backgroundColor: '#88AA73' }}>
                              <div className="text-base font-medium mb-2" style={{ color: '#F9FAF8' }}>
                                You Kept
                              </div>
                              <div className="text-3xl font-bold" style={{ color: '#F9FAF8' }}>
                                {netIncomePercentage.toFixed(2)}%
                              </div>
                            </div>
                            
                            {/* You Paid Block */}
                            <div className="rounded-lg p-6 text-center" style={{ backgroundColor: '#D4B26A' }}>
                              <div className="text-base font-medium mb-2" style={{ color: '#F9FAF8' }}>
                                You Paid
                              </div>
                              <div className="text-3xl font-bold" style={{ color: '#F9FAF8' }}>
                                {youPaidPercentage.toFixed(2)}%
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          
          {/* Individual Income Breakdown Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {taxYearReturns.map((t1Return, index) => {
              const t1WithFields = t1Return as any;
              
              // Get client name from household data
              let clientName = `Person ${index + 1}`;
              if (t1Return.clientId && household?.clients) {
                const client = household.clients.find(c => c.id === t1Return.clientId);
                if (client) {
                  clientName = `${client.firstName} ${client.lastName}`;
                }
              } else if (t1Return.childId && household?.children) {
                const child = household.children.find(c => c.id === t1Return.childId);
                if (child) {
                  clientName = `${child.firstName} ${child.lastName}`;
                }
              }
              
              // Calculate individual components
              let totalIncome = 0;
              let federalTax = 0;
              let provincialTax = 0;
              let cppContributions = 0;
              let eiPremiums = 0;
              
              if (t1WithFields.formFields && Array.isArray(t1WithFields.formFields)) {
                const incomeField = t1WithFields.formFields.find((field: any) => field.fieldCode === '15000');
                const federalTaxField = t1WithFields.formFields.find((field: any) => field.fieldCode === '42000');
                const provincialTaxField = t1WithFields.formFields.find((field: any) => field.fieldCode === '42800');
                const cppField = t1WithFields.formFields.find((field: any) => field.fieldCode === '30800');
                const eiField = t1WithFields.formFields.find((field: any) => field.fieldCode === '31200');
                
                totalIncome = incomeField?.fieldValue ? parseFloat(String(incomeField.fieldValue).replace(/[,$\s]/g, '')) : 0;
                federalTax = federalTaxField?.fieldValue ? parseFloat(String(federalTaxField.fieldValue).replace(/[,$\s]/g, '')) : 0;
                provincialTax = provincialTaxField?.fieldValue ? parseFloat(String(provincialTaxField.fieldValue).replace(/[,$\s]/g, '')) : 0;
                cppContributions = cppField?.fieldValue ? parseFloat(String(cppField.fieldValue).replace(/[,$\s]/g, '')) : 0;
                eiPremiums = eiField?.fieldValue ? parseFloat(String(eiField.fieldValue).replace(/[,$\s]/g, '')) : 0;
              }
              
              // Calculate net income using same method as Summary tab - use field 43700
              const totalTaxField = t1WithFields.formFields?.find((field: any) => field.fieldCode === '43700');
              const totalTax = totalTaxField?.fieldValue ? parseFloat(String(totalTaxField.fieldValue).replace(/[,$\s]/g, '')) : 0;
              const netIncome = totalIncome - totalTax;
              
              const individualPieData = [
                {
                  name: 'Net Income',
                  value: netIncome,
                  color: '#88AA73' // Primary green
                },
                {
                  name: 'Federal Tax',
                  value: federalTax,
                  color: '#D4B26A' // Warning/secondary accent
                },
                {
                  name: 'Provincial Tax',
                  value: provincialTax,
                  color: '#C7E6C2' // Accent green
                },
                {
                  name: 'CPP Contributions',
                  value: cppContributions,
                  color: '#A3A3A3' // Neutral gray
                },
                {
                  name: 'EI Premiums',
                  value: eiPremiums,
                  color: '#6B7AA2' // Complementary blue-gray
                }
              ].filter(item => item.value > 0);
              
              return (
                <Card key={t1Return.id}>
                  <CardContent className="p-6">
                    <h3 className="font-medium text-gray-900 mb-4">{clientName} - Income Breakdown</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={individualPieData}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, value }) => {
                              const total = individualPieData.reduce((sum, item) => sum + item.value, 0);
                              const percentage = ((value / total) * 100).toFixed(2);
                              return `${name}: ${percentage}%`;
                            }}
                          >
                            {individualPieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            content={({ active, payload }: any) => {
                              if (active && payload && payload.length) {
                                const data = payload[0];
                                const total = individualPieData.reduce((sum, item) => sum + item.value, 0);
                                const percentage = ((data.value / total) * 100).toFixed(2);
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
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    
                    {/* Custom Legend with Dollar Amounts */}
                    <div className="flex flex-wrap justify-center gap-4 mt-4">
                      {individualPieData.map((entry, index) => (
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
                  </CardContent>
                </Card>
              );
            })}
          </div>
          
          {(() => {
            // Get individual taxable incomes for each spouse
            const spouseData = taxYearReturns.map(t1Return => {
              const t1WithFields = t1Return as any;
              let taxableIncome = 0;
              let clientName = 'Unknown';
              
              if (t1WithFields.formFields && Array.isArray(t1WithFields.formFields)) {
                const taxableField = t1WithFields.formFields.find((field: any) => field.fieldCode === '26000');
                if (taxableField?.fieldValue) {
                  const value = parseFloat(String(taxableField.fieldValue).replace(/[,$\s]/g, ''));
                  if (!isNaN(value)) taxableIncome = value;
                }
              }
              
              // Get client name from household clients
              const client = household?.clients.find(c => c.id === t1Return.clientId);
              if (client) {
                clientName = `${client.firstName} ${client.lastName}`;
              }
              
              return { clientName, taxableIncome, t1Return };
            });

            // Get province from first return for combined brackets
            const firstReturn = taxYearReturns[0];
            const firstReturnFields = (firstReturn as any)?.formFields || [];
            const provinceField = firstReturnFields.find((field: any) => field.fieldCode === 'province');
            const province = provinceField?.fieldValue || 'ON';

            // 2024 Combined Federal + Provincial Tax Brackets (Ontario example)
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

            // Function to calculate individual tax breakdown for a spouse
            const calculateSpouseTaxBreakdown = (spouseIncome: number) => {
              // 2024 Basic Personal Amounts
              const federalBPA = 15705;
              const ontarioBPA = 12399;
              
              // Calculate gross combined tax first
              let grossCombinedTax = 0;
              const breakdown = combinedBrackets.map(bracket => {
                let incomeInBracket = 0;
                let taxFromBracket = 0;

                if (spouseIncome > bracket.min) {
                  const maxForBracket = Math.min(spouseIncome, bracket.max);
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
              // Federal BPA credit at 15% (lowest federal rate)
              const federalBPACredit = federalBPA * 0.15;
              // Ontario BPA credit at 5.05% (lowest Ontario rate)  
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

            return (
              <div className="space-y-6">
                {/* Tax Rates Section */}
                <div className="mb-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {spouseData.map((spouse, spouseIndex) => {
                      const spouseT1 = spouse.t1Return as any;
                      
                      // Calculate tax rates
                      let totalIncome = 0;
                      let taxableIncome = 0;
                      let totalTax = 0;
                      let federalTax = 0;
                      let provincialTax = 0;
                      
                      if (spouseT1 && spouseT1.formFields) {
                        const incomeField = spouseT1.formFields.find((field: any) => field.fieldCode === '15000');
                        const taxableIncomeField = spouseT1.formFields.find((field: any) => field.fieldCode === '26000');
                        const totalTaxField = spouseT1.formFields.find((field: any) => field.fieldCode === '43700');
                        const federalTaxField = spouseT1.formFields.find((field: any) => field.fieldCode === '42000');
                        const provincialTaxField = spouseT1.formFields.find((field: any) => field.fieldCode === '42800');
                        
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
                      
                      // Calculate rates - use the same calculation as "You Paid" percentage in Financial Summary
                      let averageRate = 0;
                      if (spouseT1 && spouseT1.formFields) {
                        const incomeField = spouseT1.formFields.find((field: any) => field.fieldCode === '15000');
                        const federalTaxField = spouseT1.formFields.find((field: any) => field.fieldCode === '42000');
                        const provincialTaxField = spouseT1.formFields.find((field: any) => field.fieldCode === '42800');
                        const cppField = spouseT1.formFields.find((field: any) => field.fieldCode === '30800');
                        const eiField = spouseT1.formFields.find((field: any) => field.fieldCode === '31200');
                        
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
                      
                      // Calculate marginal rate based on taxable income and Ontario tax brackets
                      // Use the same rates as Combined Tax Bracket Analysis for consistency
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
                        <Card key={`tax-rates-${spouseIndex}`}>
                          <CardContent className="p-6">
                            <h3 className="font-medium text-gray-900 mb-6">{spouse.clientName} - Tax Rates</h3>
                            
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
                                  Next Dollar Tax Rate
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>

                {/* Tax Bracket Tables */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {spouseData.map((spouse, spouseIndex) => {
                    // Get actual tax amounts from T1 form for this spouse
                    const actualTotalTax = (() => {
                      // Use the T1 return directly from spouseData
                      const spouseT1 = spouse.t1Return as any;
                      
                      if (spouseT1 && spouseT1.formFields) {
                        const taxField = spouseT1.formFields.find((field: any) => field.fieldCode === '43500');
                        const federalTaxField = spouseT1.formFields.find((field: any) => field.fieldCode === '42000');
                        const provincialTaxField = spouseT1.formFields.find((field: any) => field.fieldCode === '42800');
                        
                        const tax = taxField?.fieldValue ? parseFloat(String(taxField.fieldValue).replace(/[,$\s]/g, '')) : 0;
                        const federalTax = federalTaxField?.fieldValue ? parseFloat(String(federalTaxField.fieldValue).replace(/[,$\s]/g, '')) : 0;
                        const provincialTax = provincialTaxField?.fieldValue ? parseFloat(String(provincialTaxField.fieldValue).replace(/[,$\s]/g, '')) : 0;
                        
                        // Use field 43500 if available, otherwise add federal + provincial
                        return tax > 0 ? tax : (federalTax + provincialTax);
                      }
                      return 0;
                    })();
                    
                    const bracketBreakdown = calculateSpouseTaxBreakdown(spouse.taxableIncome);
                    const calculatedTotalTax = bracketBreakdown.reduce((sum, bracket) => sum + bracket.tax, 0);
                    
                    // Adjust bracket breakdown to match actual total tax
                    const adjustmentRatio = calculatedTotalTax > 0 ? actualTotalTax / calculatedTotalTax : 0;
                    const adjustedBracketBreakdown = bracketBreakdown.map(bracket => ({
                      ...bracket,
                      tax: bracket.tax * adjustmentRatio
                    }));
                    
                    const totalTax = actualTotalTax;

                    return (
                      <Card key={spouseIndex}>
                        <CardContent className="p-6">
                          <div>
                            <h3 className="font-medium text-gray-900 mb-4">
                              {spouse.clientName} - Combined Tax Bracket Analysis
                            </h3>
                            
                            {/* Individual Tax Bracket Table */}
                            <div className="overflow-x-auto">
                              <table className="w-full border-collapse text-sm">
                                <thead>
                                  <tr className="border-b">
                                    <th className="text-left py-2 px-2 font-medium text-gray-900">Rate</th>
                                    <th className="text-left py-2 px-2 font-medium text-gray-900">Threshold</th>
                                    <th className="text-right py-2 px-2 font-medium text-gray-900">Income</th>
                                    <th className="text-right py-2 px-2 font-medium text-gray-900">Tax</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {adjustedBracketBreakdown.map((bracket, index) => {
                                    // Check if this is the current marginal tax bracket
                                    const isCurrentBracket = bracket.incomeInBracket > 0 && 
                                      index === adjustedBracketBreakdown.findIndex((b, i) => 
                                        b.incomeInBracket > 0 && 
                                        (i === adjustedBracketBreakdown.length - 1 || 
                                         adjustedBracketBreakdown[i + 1].incomeInBracket === 0)
                                      );
                                    
                                    return (
                                      <tr 
                                        key={index} 
                                        className={`border-b ${bracket.incomeInBracket > 0 ? 'bg-accent/20' : ''}`}
                                        style={isCurrentBracket ? { 
                                          border: '2px solid #D4B26A',
                                          borderRadius: '4px'
                                        } : {}}
                                      >
                                        <td className="py-2 px-2 font-medium text-primary">{bracket.rate}</td>
                                        <td className="py-2 px-2 text-gray-700 text-xs">{bracket.threshold}</td>
                                        <td className="py-2 px-2 text-right text-gray-700 text-xs">
                                          ${bracket.incomeInBracket.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                        </td>
                                        <td className="py-2 px-2 text-right text-gray-700 text-xs">
                                          ${bracket.tax.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                  <tr className="border-b-2 border-gray-800 font-semibold bg-gray-100">
                                    <td className="py-2 px-2">Total</td>
                                    <td className="py-2 px-2"></td>
                                    <td className="py-2 px-2 text-right text-gray-700 text-xs">
                                      ${spouse.taxableIncome.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                    </td>
                                    <td className="py-2 px-2 text-right text-gray-700 text-xs">
                                      ${totalTax.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Tax Bracket Visualizations */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {spouseData.map((spouse, spouseIndex) => {
                    return (
                      <Card key={spouseIndex}>
                        <CardContent className="p-6">
                          <div className="space-y-4">
                            <div>
                              <h3 className="font-medium text-gray-900 mb-4">
                                {spouse.clientName} - Combined Tax Bracket Visualization
                              </h3>


                              {/* Multiple Tax Type Bars */}
                              <div className="relative">
                              {/* Vertical bar chart with scale */}
                              <div className="flex items-start justify-center">
                                {/* Income scale labels on left (vertical axis) - combined brackets */}
                                <div className="w-16 h-80 relative flex flex-col mr-4 text-xs text-gray-700 font-medium">
                                  {/* Combined tax bracket thresholds */}
                                  {(() => {
                                    const combinedThresholds = [
                                      { income: 0, label: "$0" },
                                      { income: 51446, label: "$51k" },
                                      { income: 55867, label: "$56k" },
                                      { income: 102894, label: "$103k" },
                                      { income: 111733, label: "$112k" },
                                      { income: 150000, label: "$150k" },
                                      { income: 173205, label: "$173k" },
                                      { income: 220000, label: "$220k" },
                                      { income: 246752, label: "$247k" },
                                      { income: 300000, label: "$300k" }
                                    ];

                                    // Calculate positions and handle overlaps
                                    let adjustedThresholds = combinedThresholds.map(threshold => ({
                                      ...threshold,
                                      position: (threshold.income / 300000) * 100
                                    }));

                                    // Adjust positions to prevent overlap (minimum 7% spacing)
                                    for (let i = 1; i < adjustedThresholds.length; i++) {
                                      const current = adjustedThresholds[i];
                                      const previous = adjustedThresholds[i - 1];
                                      const minSpacing = 7; // 7% minimum spacing
                                      
                                      if (current.position - previous.position < minSpacing) {
                                        current.position = previous.position + minSpacing;
                                      }
                                    }

                                    // Special positioning for $300k label
                                    const topThreshold = adjustedThresholds[adjustedThresholds.length - 1];
                                    if (topThreshold.income === 300000) {
                                      topThreshold.position = 100 - 4; // 4% down from top
                                    }

                                    return adjustedThresholds.map((threshold, idx) => (
                                      <div 
                                        key={idx}
                                        className="absolute right-0 text-right"
                                        style={{
                                          bottom: `${threshold.position}%`,
                                          transform: 'translateY(0%)'
                                        }}
                                      >
                                        {threshold.label}
                                      </div>
                                    ));
                                  })()}
                                </div>
                                
                                {/* Four Income Type Bars */}
                                <div className="flex space-x-3">
                                  {(() => {
                                    // Province-specific tax rates
                                    const taxRatesByProvince = {
                                      'ON': {
                                        ordinary: [
                                          { rate: 20.05, min: 0, max: 51446, label: "20.05%" },
                                          { rate: 24.15, min: 51446, max: 55867, label: "24.15%" },
                                          { rate: 29.65, min: 55867, max: 102894, label: "29.65%" },
                                          { rate: 31.48, min: 102894, max: 111733, label: "31.48%" },
                                          { rate: 37.91, min: 111733, max: 150000, label: "37.91%" },
                                          { rate: 43.41, min: 150000, max: 173205, label: "43.41%" },
                                          { rate: 46.16, min: 173205, max: 220000, label: "46.16%" },
                                          { rate: 47.74, min: 220000, max: 246752, label: "47.74%" },
                                          { rate: 53.53, min: 246752, max: 300000, label: "53.53%" }
                                        ],
                                        capitalGains: [
                                          { rate: 10.03, min: 0, max: 51446, label: "10.03%" },
                                          { rate: 12.08, min: 51446, max: 55867, label: "12.08%" },
                                          { rate: 14.83, min: 55867, max: 102894, label: "14.83%" },
                                          { rate: 15.74, min: 102894, max: 111733, label: "15.74%" },
                                          { rate: 18.95, min: 111733, max: 150000, label: "18.95%" },
                                          { rate: 21.70, min: 150000, max: 173205, label: "21.70%" },
                                          { rate: 23.08, min: 173205, max: 220000, label: "23.08%" },
                                          { rate: 23.87, min: 220000, max: 246752, label: "23.87%" },
                                          { rate: 26.76, min: 246752, max: 300000, label: "26.76%" }
                                        ],
                                        eligibleDividends: [
                                          { rate: -1.20, min: 0, max: 51446, label: "-1.20%" },
                                          { rate: 6.39, min: 51446, max: 55867, label: "6.39%" },
                                          { rate: 8.92, min: 55867, max: 90599, label: "8.92%" },
                                          { rate: 12.24, min: 90599, max: 102894, label: "12.24%" },
                                          { rate: 17.79, min: 102894, max: 106732, label: "17.79%" },
                                          { rate: 25.38, min: 106732, max: 111733, label: "25.38%" },
                                          { rate: 27.53, min: 111733, max: 150000, label: "27.53%" },
                                          { rate: 32.11, min: 150000, max: 173205, label: "32.11%" },
                                          { rate: 34.26, min: 173205, max: 220000, label: "34.26%" },
                                          { rate: 39.34, min: 220000, max: 246752, label: "39.34%" },
                                          { rate: 39.34, min: 246752, max: 300000, label: "39.34%" }
                                        ],
                                        nonEligibleDividends: [
                                          { rate: 13.95, min: 0, max: 51446, label: "13.95%" },
                                          { rate: 20.28, min: 51446, max: 55867, label: "20.28%" },
                                          { rate: 22.38, min: 55867, max: 90599, label: "22.38%" },
                                          { rate: 25.16, min: 90599, max: 102894, label: "25.16%" },
                                          { rate: 29.78, min: 102894, max: 106732, label: "29.78%" },
                                          { rate: 36.10, min: 106732, max: 111733, label: "36.10%" },
                                          { rate: 37.90, min: 111733, max: 150000, label: "37.90%" },
                                          { rate: 41.72, min: 150000, max: 173205, label: "41.72%" },
                                          { rate: 43.31, min: 173205, max: 220000, label: "43.31%" },
                                          { rate: 47.74, min: 220000, max: 246752, label: "47.74%" },
                                          { rate: 47.74, min: 246752, max: 300000, label: "47.74%" }
                                        ]
                                      },
                                      'AB': {
                                        ordinary: [
                                          { rate: 25.00, min: 0, max: 55867, label: "25.00%" },
                                          { rate: 30.50, min: 55867, max: 111733, label: "30.50%" },
                                          { rate: 36.00, min: 111733, max: 148269, label: "36.00%" },
                                          { rate: 38.00, min: 148269, max: 173205, label: "38.00%" },
                                          { rate: 41.32, min: 173205, max: 177922, label: "41.32%" },
                                          { rate: 42.32, min: 177922, max: 237230, label: "42.32%" },
                                          { rate: 43.32, min: 237230, max: 246752, label: "43.32%" },
                                          { rate: 47.00, min: 246752, max: 355845, label: "47.00%" },
                                          { rate: 51.00, min: 355845, max: 400000, label: "51.00%" }
                                        ],
                                        capitalGains: [
                                          { rate: 12.50, min: 0, max: 55867, label: "12.50%" },
                                          { rate: 15.25, min: 55867, max: 111733, label: "15.25%" },
                                          { rate: 18.00, min: 111733, max: 148269, label: "18.00%" },
                                          { rate: 19.00, min: 148269, max: 173205, label: "19.00%" },
                                          { rate: 20.66, min: 173205, max: 177922, label: "20.66%" },
                                          { rate: 21.16, min: 177922, max: 237230, label: "21.16%" },
                                          { rate: 21.66, min: 237230, max: 246752, label: "21.66%" },
                                          { rate: 23.50, min: 246752, max: 355845, label: "23.50%" },
                                          { rate: 25.50, min: 355845, max: 400000, label: "25.50%" }
                                        ],
                                        eligibleDividends: [
                                          { rate: -1.86, min: 0, max: 55867, label: "-1.86%" },
                                          { rate: 10.16, min: 55867, max: 111733, label: "10.16%" },
                                          { rate: 17.75, min: 111733, max: 148269, label: "17.75%" },
                                          { rate: 20.51, min: 148269, max: 173205, label: "20.51%" },
                                          { rate: 25.09, min: 173205, max: 177922, label: "25.09%" },
                                          { rate: 26.47, min: 177922, max: 237230, label: "26.47%" },
                                          { rate: 27.85, min: 237230, max: 246752, label: "27.85%" },
                                          { rate: 32.93, min: 246752, max: 355845, label: "32.93%" },
                                          { rate: 42.31, min: 355845, max: 400000, label: "42.31%" }
                                        ],
                                        nonEligibleDividends: [
                                          { rate: 13.86, min: 0, max: 55867, label: "13.86%" },
                                          { rate: 22.18, min: 55867, max: 111733, label: "22.18%" },
                                          { rate: 28.51, min: 111733, max: 148269, label: "28.51%" },
                                          { rate: 30.81, min: 148269, max: 173205, label: "30.81%" },
                                          { rate: 34.63, min: 173205, max: 177922, label: "34.63%" },
                                          { rate: 35.78, min: 177922, max: 237230, label: "35.78%" },
                                          { rate: 36.93, min: 237230, max: 246752, label: "36.93%" },
                                          { rate: 41.16, min: 246752, max: 355845, label: "41.16%" },
                                          { rate: 44.18, min: 355845, max: 400000, label: "44.18%" }
                                        ]
                                      },
                                      'BC': {
                                        ordinary: [
                                          { rate: 20.06, min: 0, max: 47937, label: "20.06%" },
                                          { rate: 22.70, min: 47937, max: 55867, label: "22.70%" },
                                          { rate: 28.20, min: 55867, max: 95875, label: "28.20%" },
                                          { rate: 30.50, min: 95875, max: 110076, label: "30.50%" },
                                          { rate: 32.29, min: 110076, max: 111733, label: "32.29%" },
                                          { rate: 37.79, min: 111733, max: 133664, label: "37.79%" },
                                          { rate: 41.20, min: 133664, max: 173205, label: "41.20%" },
                                          { rate: 43.70, min: 173205, max: 181232, label: "43.70%" },
                                          { rate: 46.30, min: 181232, max: 246752, label: "46.30%" },
                                          { rate: 49.30, min: 246752, max: 252752, label: "49.30%" },
                                          { rate: 53.50, min: 252752, max: 400000, label: "53.50%" }
                                        ],
                                        capitalGains: [
                                          { rate: 10.03, min: 0, max: 47937, label: "10.03%" },
                                          { rate: 11.35, min: 47937, max: 55867, label: "11.35%" },
                                          { rate: 14.10, min: 55867, max: 95875, label: "14.10%" },
                                          { rate: 15.50, min: 95875, max: 110076, label: "15.50%" },
                                          { rate: 16.40, min: 110076, max: 111733, label: "16.40%" },
                                          { rate: 19.15, min: 111733, max: 133664, label: "19.15%" },
                                          { rate: 20.35, min: 133664, max: 173205, label: "20.35%" },
                                          { rate: 22.01, min: 173205, max: 181232, label: "22.01%" },
                                          { rate: 23.52, min: 181232, max: 246752, label: "23.52%" },
                                          { rate: 24.90, min: 246752, max: 252752, label: "24.90%" },
                                          { rate: 26.75, min: 252752, max: 400000, label: "26.75%" }
                                        ],
                                        eligibleDividends: [
                                          { rate: -9.60, min: 0, max: 47937, label: "-9.60%" },
                                          { rate: -5.96, min: 47937, max: 55867, label: "-5.96%" },
                                          { rate: 1.63, min: 55867, max: 95875, label: "1.63%" },
                                          { rate: 5.49, min: 95875, max: 110076, label: "5.49%" },
                                          { rate: 7.96, min: 110076, max: 111733, label: "7.96%" },
                                          { rate: 15.55, min: 111733, max: 133664, label: "15.55%" },
                                          { rate: 18.88, min: 133664, max: 173205, label: "18.88%" },
                                          { rate: 23.46, min: 173205, max: 181232, label: "23.46%" },
                                          { rate: 28.56, min: 181232, max: 246752, label: "28.56%" },
                                          { rate: 31.44, min: 246752, max: 252752, label: "31.44%" },
                                          { rate: 36.34, min: 252752, max: 400000, label: "36.34%" }
                                        ],
                                        nonEligibleDividends: [
                                          { rate: 10.43, min: 0, max: 47937, label: "10.43%" },
                                          { rate: 13.47, min: 47937, max: 55867, label: "13.47%" },
                                          { rate: 19.80, min: 55867, max: 95875, label: "19.80%" },
                                          { rate: 23.02, min: 95875, max: 110076, label: "23.02%" },
                                          { rate: 25.07, min: 110076, max: 111733, label: "25.07%" },
                                          { rate: 31.40, min: 111733, max: 133664, label: "31.40%" },
                                          { rate: 34.17, min: 133664, max: 173205, label: "34.17%" },
                                          { rate: 37.59, min: 173205, max: 181232, label: "37.59%" },
                                          { rate: 40.41, min: 181232, max: 246752, label: "40.41%" },
                                          { rate: 44.64, min: 246752, max: 252752, label: "44.64%" },
                                          { rate: 48.89, min: 252752, max: 400000, label: "48.89%" }
                                        ]
                                      },
                                      'MB': {
                                        ordinary: [
                                          { rate: 25.80, min: 0, max: 47000, label: "25.80%" },
                                          { rate: 27.75, min: 47000, max: 55867, label: "27.75%" },
                                          { rate: 33.25, min: 55867, max: 100000, label: "33.25%" },
                                          { rate: 37.90, min: 100000, max: 111733, label: "37.90%" },
                                          { rate: 43.40, min: 111733, max: 173205, label: "43.40%" },
                                          { rate: 46.67, min: 173205, max: 246752, label: "46.67%" },
                                          { rate: 50.40, min: 246752, max: 400000, label: "50.40%" }
                                        ],
                                        capitalGains: [
                                          { rate: 12.90, min: 0, max: 47000, label: "12.90%" },
                                          { rate: 13.88, min: 47000, max: 55867, label: "13.88%" },
                                          { rate: 16.63, min: 55867, max: 100000, label: "16.63%" },
                                          { rate: 18.95, min: 100000, max: 111733, label: "18.95%" },
                                          { rate: 21.70, min: 111733, max: 173205, label: "21.70%" },
                                          { rate: 23.34, min: 173205, max: 246752, label: "23.34%" },
                                          { rate: 25.20, min: 246752, max: 400000, label: "25.20%" }
                                        ],
                                        eligibleDividends: [
                                          { rate: 3.84, min: 0, max: 47000, label: "3.84%" },
                                          { rate: 6.53, min: 47000, max: 55867, label: "6.53%" },
                                          { rate: 14.12, min: 55867, max: 100000, label: "14.12%" },
                                          { rate: 20.53, min: 100000, max: 111733, label: "20.53%" },
                                          { rate: 28.12, min: 111733, max: 173205, label: "28.12%" },
                                          { rate: 32.71, min: 173205, max: 246752, label: "32.71%" },
                                          { rate: 37.78, min: 246752, max: 400000, label: "37.78%" }
                                        ],
                                        nonEligibleDividends: [
                                          { rate: 18.38, min: 0, max: 47000, label: "18.38%" },
                                          { rate: 20.63, min: 47000, max: 55867, label: "20.63%" },
                                          { rate: 26.95, min: 55867, max: 100000, label: "26.95%" },
                                          { rate: 32.30, min: 100000, max: 111733, label: "32.30%" },
                                          { rate: 38.62, min: 111733, max: 173205, label: "38.62%" },
                                          { rate: 42.44, min: 173205, max: 246752, label: "42.44%" },
                                          { rate: 46.67, min: 246752, max: 400000, label: "46.67%" }
                                        ]
                                      },
                                      'NB': {
                                        ordinary: [
                                          { rate: 24.68, min: 0, max: 49958, label: "24.68%" },
                                          { rate: 29.00, min: 49958, max: 55867, label: "29.00%" },
                                          { rate: 34.50, min: 55867, max: 99916, label: "34.50%" },
                                          { rate: 36.50, min: 99916, max: 111733, label: "36.50%" },
                                          { rate: 42.00, min: 111733, max: 173205, label: "42.00%" },
                                          { rate: 45.32, min: 173205, max: 185064, label: "45.32%" },
                                          { rate: 48.82, min: 185064, max: 246752, label: "48.82%" },
                                          { rate: 52.50, min: 246752, max: 400000, label: "52.50%" }
                                        ],
                                        capitalGains: [
                                          { rate: 12.34, min: 0, max: 49958, label: "12.34%" },
                                          { rate: 14.50, min: 49958, max: 55867, label: "14.50%" },
                                          { rate: 17.25, min: 55867, max: 99916, label: "17.25%" },
                                          { rate: 18.25, min: 99916, max: 111733, label: "18.25%" },
                                          { rate: 21.00, min: 111733, max: 173205, label: "21.00%" },
                                          { rate: 22.66, min: 173205, max: 185064, label: "22.66%" },
                                          { rate: 24.41, min: 185064, max: 246752, label: "24.41%" },
                                          { rate: 26.25, min: 246752, max: 400000, label: "26.25%" }
                                        ],
                                        eligibleDividends: [
                                          { rate: 0.68, min: 0, max: 49958, label: "0.68%" },
                                          { rate: 0.03, min: 49958, max: 55867, label: "0.03%" },
                                          { rate: 7.56, min: 55867, max: 99916, label: "7.56%" },
                                          { rate: 10.32, min: 99916, max: 111733, label: "10.32%" },
                                          { rate: 20.19, min: 111733, max: 173205, label: "20.19%" },
                                          { rate: 22.49, min: 173205, max: 185064, label: "22.49%" },
                                          { rate: 27.32, min: 185064, max: 246752, label: "27.32%" },
                                          { rate: 32.40, min: 246752, max: 400000, label: "32.40%" }
                                        ],
                                        nonEligibleDividends: [
                                          { rate: 16.10, min: 0, max: 49958, label: "16.10%" },
                                          { rate: 19.80, min: 49958, max: 55867, label: "19.80%" },
                                          { rate: 26.13, min: 55867, max: 99916, label: "26.13%" },
                                          { rate: 28.43, min: 99916, max: 111733, label: "28.43%" },
                                          { rate: 34.25, min: 111733, max: 173205, label: "34.25%" },
                                          { rate: 38.57, min: 173205, max: 185064, label: "38.57%" },
                                          { rate: 42.60, min: 185064, max: 246752, label: "42.60%" },
                                          { rate: 46.83, min: 246752, max: 400000, label: "46.83%" }
                                        ]
                                      },
                                      'NL': {
                                        ordinary: [
                                          { rate: 23.70, min: 0, max: 43198, label: "23.70%" },
                                          { rate: 29.50, min: 43198, max: 55867, label: "29.50%" },
                                          { rate: 35.00, min: 55867, max: 86395, label: "35.00%" },
                                          { rate: 36.30, min: 86395, max: 111733, label: "36.30%" },
                                          { rate: 41.80, min: 111733, max: 154244, label: "41.80%" },
                                          { rate: 43.80, min: 154244, max: 173205, label: "43.80%" },
                                          { rate: 47.12, min: 173205, max: 215943, label: "47.12%" },
                                          { rate: 49.12, min: 215943, max: 246752, label: "49.12%" },
                                          { rate: 52.80, min: 246752, max: 275870, label: "52.80%" },
                                          { rate: 53.80, min: 275870, max: 551739, label: "53.80%" },
                                          { rate: 54.30, min: 551739, max: 1103478, label: "54.30%" },
                                          { rate: 54.80, min: 1103478, max: 2000000, label: "54.80%" }
                                        ],
                                        capitalGains: [
                                          { rate: 11.85, min: 0, max: 43198, label: "11.85%" },
                                          { rate: 14.75, min: 43198, max: 55867, label: "14.75%" },
                                          { rate: 17.50, min: 55867, max: 86395, label: "17.50%" },
                                          { rate: 18.15, min: 86395, max: 111733, label: "18.15%" },
                                          { rate: 20.90, min: 111733, max: 154244, label: "20.90%" },
                                          { rate: 21.90, min: 154244, max: 173205, label: "21.90%" },
                                          { rate: 23.56, min: 173205, max: 215943, label: "23.56%" },
                                          { rate: 24.56, min: 215943, max: 246752, label: "24.56%" },
                                          { rate: 26.40, min: 246752, max: 275870, label: "26.40%" },
                                          { rate: 26.90, min: 275870, max: 551739, label: "26.90%" },
                                          { rate: 27.15, min: 551739, max: 1103478, label: "27.15%" },
                                          { rate: 27.40, min: 1103478, max: 2000000, label: "27.40%" }
                                        ],
                                        eligibleDividends: [
                                          { rate: 1.32, min: 0, max: 43198, label: "1.32%" },
                                          { rate: 11.29, min: 43198, max: 55867, label: "11.29%" },
                                          { rate: 18.88, min: 55867, max: 86395, label: "18.88%" },
                                          { rate: 20.67, min: 86395, max: 111733, label: "20.67%" },
                                          { rate: 28.26, min: 111733, max: 154244, label: "28.26%" },
                                          { rate: 31.02, min: 154244, max: 173205, label: "31.02%" },
                                          { rate: 35.60, min: 173205, max: 215943, label: "35.60%" },
                                          { rate: 38.36, min: 215943, max: 246752, label: "38.36%" },
                                          { rate: 43.64, min: 246752, max: 275870, label: "43.64%" },
                                          { rate: 44.82, min: 275870, max: 551739, label: "44.82%" },
                                          { rate: 45.51, min: 551739, max: 1103478, label: "45.51%" },
                                          { rate: 46.20, min: 1103478, max: 2000000, label: "46.20%" }
                                        ],
                                        nonEligibleDividends: [
                                          { rate: 13.70, min: 0, max: 43198, label: "13.70%" },
                                          { rate: 19.86, min: 43198, max: 55867, label: "19.86%" },
                                          { rate: 26.19, min: 55867, max: 86395, label: "26.19%" },
                                          { rate: 27.68, min: 86395, max: 111733, label: "27.68%" },
                                          { rate: 34.04, min: 111733, max: 154244, label: "34.04%" },
                                          { rate: 36.31, min: 154244, max: 173205, label: "36.31%" },
                                          { rate: 40.13, min: 173205, max: 215943, label: "40.13%" },
                                          { rate: 42.43, min: 215943, max: 246752, label: "42.43%" },
                                          { rate: 46.66, min: 246752, max: 275870, label: "46.66%" },
                                          { rate: 47.81, min: 275870, max: 551739, label: "47.81%" },
                                          { rate: 48.38, min: 551739, max: 1103478, label: "48.38%" },
                                          { rate: 48.96, min: 1103478, max: 2000000, label: "48.96%" }
                                        ]
                                      },
                                      'NS': {
                                        ordinary: [
                                          { rate: 23.79, min: 0, max: 25000, label: "23.79%" },
                                          { rate: 24.32, min: 25000, max: 29590, label: "24.32%" },
                                          { rate: 30.48, min: 29590, max: 55867, label: "30.48%" },
                                          { rate: 35.95, min: 55867, max: 59180, label: "35.95%" },
                                          { rate: 37.70, min: 59180, max: 74999, label: "37.70%" },
                                          { rate: 37.17, min: 74999, max: 93000, label: "37.17%" },
                                          { rate: 38.00, min: 93000, max: 111733, label: "38.00%" },
                                          { rate: 43.50, min: 111733, max: 150000, label: "43.50%" },
                                          { rate: 47.33, min: 150000, max: 173205, label: "47.33%" },
                                          { rate: 50.32, min: 173205, max: 246752, label: "50.32%" },
                                          { rate: 54.00, min: 246752, max: 400000, label: "54.00%" }
                                        ],
                                        capitalGains: [
                                          { rate: 11.90, min: 0, max: 25000, label: "11.90%" },
                                          { rate: 12.16, min: 25000, max: 29590, label: "12.16%" },
                                          { rate: 15.24, min: 29590, max: 55867, label: "15.24%" },
                                          { rate: 17.99, min: 55867, max: 59180, label: "17.99%" },
                                          { rate: 18.85, min: 59180, max: 74999, label: "18.85%" },
                                          { rate: 18.59, min: 74999, max: 93000, label: "18.59%" },
                                          { rate: 19.00, min: 93000, max: 111733, label: "19.00%" },
                                          { rate: 21.75, min: 111733, max: 150000, label: "21.75%" },
                                          { rate: 23.67, min: 150000, max: 173205, label: "23.67%" },
                                          { rate: 25.16, min: 173205, max: 246752, label: "25.16%" },
                                          { rate: 27.00, min: 246752, max: 400000, label: "27.00%" }
                                        ],
                                        eligibleDividends: [
                                          { rate: 0.11, min: 0, max: 25000, label: "0.11%" },
                                          { rate: 0.62, min: 25000, max: 29590, label: "0.62%" },
                                          { rate: 9.12, min: 29590, max: 55867, label: "9.12%" },
                                          { rate: 16.76, min: 55867, max: 59180, label: "16.76%" },
                                          { rate: 19.09, min: 59180, max: 74999, label: "19.09%" },
                                          { rate: 18.35, min: 74999, max: 93000, label: "18.35%" },
                                          { rate: 19.50, min: 93000, max: 111733, label: "19.50%" },
                                          { rate: 27.09, min: 111733, max: 150000, label: "27.09%" },
                                          { rate: 31.32, min: 150000, max: 173205, label: "31.32%" },
                                          { rate: 36.50, min: 173205, max: 246752, label: "36.50%" },
                                          { rate: 41.58, min: 246752, max: 400000, label: "41.58%" }
                                        ],
                                        nonEligibleDividends: [
                                          { rate: 13.01, min: 0, max: 25000, label: "13.01%" },
                                          { rate: 14.14, min: 25000, max: 29590, label: "14.14%" },
                                          { rate: 21.23, min: 29590, max: 55867, label: "21.23%" },
                                          { rate: 27.59, min: 55867, max: 59180, label: "27.59%" },
                                          { rate: 29.53, min: 59180, max: 74999, label: "29.53%" },
                                          { rate: 28.92, min: 74999, max: 93000, label: "28.92%" },
                                          { rate: 29.88, min: 93000, max: 111733, label: "29.88%" },
                                          { rate: 36.20, min: 111733, max: 150000, label: "36.20%" },
                                          { rate: 40.23, min: 150000, max: 173205, label: "40.23%" },
                                          { rate: 44.05, min: 173205, max: 246752, label: "44.05%" },
                                          { rate: 48.28, min: 246752, max: 400000, label: "48.28%" }
                                        ]
                                      },
                                      'PE': {
                                        ordinary: [
                                          { rate: 25.80, min: 0, max: 32656, label: "25.80%" },
                                          { rate: 28.63, min: 32656, max: 55867, label: "28.63%" },
                                          { rate: 34.13, min: 55867, max: 64313, label: "34.13%" },
                                          { rate: 37.15, min: 64313, max: 105000, label: "37.15%" },
                                          { rate: 42.50, min: 105000, max: 111733, label: "42.50%" },
                                          { rate: 44.00, min: 111733, max: 140000, label: "44.00%" },
                                          { rate: 44.75, min: 140000, max: 173205, label: "44.75%" },
                                          { rate: 48.07, min: 173205, max: 246752, label: "48.07%" },
                                          { rate: 51.75, min: 246752, max: 400000, label: "51.75%" }
                                        ],
                                        capitalGains: [
                                          { rate: 12.90, min: 0, max: 32656, label: "12.90%" },
                                          { rate: 14.32, min: 32656, max: 55867, label: "14.32%" },
                                          { rate: 17.07, min: 55867, max: 64313, label: "17.07%" },
                                          { rate: 18.58, min: 64313, max: 105000, label: "18.58%" },
                                          { rate: 21.25, min: 105000, max: 111733, label: "21.25%" },
                                          { rate: 22.00, min: 111733, max: 140000, label: "22.00%" },
                                          { rate: 22.38, min: 140000, max: 173205, label: "22.38%" },
                                          { rate: 24.04, min: 173205, max: 246752, label: "24.04%" },
                                          { rate: 25.88, min: 246752, max: 400000, label: "25.88%" }
                                        ],
                                        eligibleDividends: [
                                          { rate: 3.20, min: 0, max: 32656, label: "3.20%" },
                                          { rate: 4.29, min: 32656, max: 55867, label: "4.29%" },
                                          { rate: 11.88, min: 55867, max: 64313, label: "11.88%" },
                                          { rate: 16.05, min: 64313, max: 105000, label: "16.05%" },
                                          { rate: 22.69, min: 105000, max: 111733, label: "22.69%" },
                                          { rate: 25.50, min: 111733, max: 140000, label: "25.50%" },
                                          { rate: 26.54, min: 140000, max: 173205, label: "26.54%" },
                                          { rate: 31.12, min: 173205, max: 246752, label: "31.12%" },
                                          { rate: 36.20, min: 246752, max: 400000, label: "36.20%" }
                                        ],
                                        nonEligibleDividends: [
                                          { rate: 16.47, min: 0, max: 32656, label: "16.47%" },
                                          { rate: 21.04, min: 32656, max: 55867, label: "21.04%" },
                                          { rate: 27.37, min: 55867, max: 64313, label: "27.37%" },
                                          { rate: 30.84, min: 64313, max: 105000, label: "30.84%" },
                                          { rate: 37.49, min: 105000, max: 111733, label: "37.49%" },
                                          { rate: 38.72, min: 111733, max: 140000, label: "38.72%" },
                                          { rate: 39.58, min: 140000, max: 173205, label: "39.58%" },
                                          { rate: 43.40, min: 173205, max: 246752, label: "43.40%" },
                                          { rate: 47.63, min: 246752, max: 400000, label: "47.63%" }
                                        ]
                                      },
                                      'QC': {
                                        ordinary: [
                                          { rate: 26.53, min: 0, max: 51780, label: "26.53%" },
                                          { rate: 31.53, min: 51780, max: 55867, label: "31.53%" },
                                          { rate: 36.12, min: 55867, max: 103545, label: "36.12%" },
                                          { rate: 41.12, min: 103545, max: 111733, label: "41.12%" },
                                          { rate: 45.71, min: 111733, max: 126000, label: "45.71%" },
                                          { rate: 47.46, min: 126000, max: 173205, label: "47.46%" },
                                          { rate: 50.23, min: 173205, max: 246752, label: "50.23%" },
                                          { rate: 53.31, min: 246752, max: 400000, label: "53.31%" }
                                        ],
                                        capitalGains: [
                                          { rate: 13.26, min: 0, max: 51780, label: "13.26%" },
                                          { rate: 15.76, min: 51780, max: 55867, label: "15.76%" },
                                          { rate: 18.06, min: 55867, max: 103545, label: "18.06%" },
                                          { rate: 20.56, min: 103545, max: 111733, label: "20.56%" },
                                          { rate: 22.86, min: 111733, max: 126000, label: "22.86%" },
                                          { rate: 23.73, min: 126000, max: 173205, label: "23.73%" },
                                          { rate: 25.12, min: 173205, max: 246752, label: "25.12%" },
                                          { rate: 26.65, min: 246752, max: 400000, label: "26.65%" }
                                        ],
                                        eligibleDividends: [
                                          { rate: 3.15, min: 0, max: 51780, label: "3.15%" },
                                          { rate: 10.05, min: 51780, max: 55867, label: "10.05%" },
                                          { rate: 16.39, min: 55867, max: 103545, label: "16.39%" },
                                          { rate: 23.29, min: 103545, max: 111733, label: "23.29%" },
                                          { rate: 29.63, min: 111733, max: 126000, label: "29.63%" },
                                          { rate: 32.04, min: 126000, max: 173205, label: "32.04%" },
                                          { rate: 35.87, min: 173205, max: 246752, label: "35.87%" },
                                          { rate: 40.11, min: 246752, max: 400000, label: "40.11%" }
                                        ],
                                        nonEligibleDividends: [
                                          { rate: 17.02, min: 0, max: 51780, label: "17.02%" },
                                          { rate: 23.65, min: 51780, max: 55867, label: "23.65%" },
                                          { rate: 28.93, min: 55867, max: 103545, label: "28.93%" },
                                          { rate: 34.68, min: 103545, max: 111733, label: "34.68%" },
                                          { rate: 39.96, min: 111733, max: 126000, label: "39.96%" },
                                          { rate: 41.97, min: 126000, max: 173205, label: "41.97%" },
                                          { rate: 45.16, min: 173205, max: 246752, label: "45.16%" },
                                          { rate: 48.70, min: 246752, max: 400000, label: "48.70%" }
                                        ]
                                      },
                                      'SK': {
                                        ordinary: [
                                          { rate: 25.80, min: 0, max: 52057, label: "25.80%" },
                                          { rate: 27.50, min: 52057, max: 55867, label: "27.50%" },
                                          { rate: 33.00, min: 55867, max: 111733, label: "33.00%" },
                                          { rate: 38.50, min: 111733, max: 148734, label: "38.50%" },
                                          { rate: 40.50, min: 148734, max: 173205, label: "40.50%" },
                                          { rate: 43.82, min: 173205, max: 246752, label: "43.82%" },
                                          { rate: 47.50, min: 246752, max: 400000, label: "47.50%" }
                                        ],
                                        capitalGains: [
                                          { rate: 12.90, min: 0, max: 52057, label: "12.90%" },
                                          { rate: 13.75, min: 52057, max: 55867, label: "13.75%" },
                                          { rate: 16.50, min: 55867, max: 111733, label: "16.50%" },
                                          { rate: 19.25, min: 111733, max: 148734, label: "19.25%" },
                                          { rate: 20.25, min: 148734, max: 173205, label: "20.25%" },
                                          { rate: 21.91, min: 173205, max: 246752, label: "21.91%" },
                                          { rate: 23.75, min: 246752, max: 400000, label: "23.75%" }
                                        ],
                                        eligibleDividends: [
                                          { rate: 2.04, min: 0, max: 52057, label: "2.04%" },
                                          { rate: 2.04, min: 52057, max: 55867, label: "2.04%" },
                                          { rate: 9.63, min: 55867, max: 111733, label: "9.63%" },
                                          { rate: 17.22, min: 111733, max: 148734, label: "17.22%" },
                                          { rate: 19.98, min: 148734, max: 173205, label: "19.98%" },
                                          { rate: 24.56, min: 173205, max: 246752, label: "24.56%" },
                                          { rate: 29.64, min: 246752, max: 400000, label: "29.64%" }
                                        ],
                                        nonEligibleDividends: [
                                          { rate: 16.04, min: 0, max: 52057, label: "16.04%" },
                                          { rate: 18.34, min: 52057, max: 55867, label: "18.34%" },
                                          { rate: 24.67, min: 55867, max: 111733, label: "24.67%" },
                                          { rate: 30.99, min: 111733, max: 148734, label: "30.99%" },
                                          { rate: 33.29, min: 148734, max: 173205, label: "33.29%" },
                                          { rate: 37.11, min: 173205, max: 246752, label: "37.11%" },
                                          { rate: 41.34, min: 246752, max: 400000, label: "41.34%" }
                                        ]
                                      },
                                      'NT': {
                                        ordinary: [
                                          { rate: 20.90, min: 0, max: 50597, label: "20.90%" },
                                          { rate: 23.60, min: 50597, max: 55867, label: "23.60%" },
                                          { rate: 29.10, min: 55867, max: 101198, label: "29.10%" },
                                          { rate: 32.70, min: 101198, max: 111733, label: "32.70%" },
                                          { rate: 38.20, min: 111733, max: 164525, label: "38.20%" },
                                          { rate: 40.05, min: 164525, max: 173205, label: "40.05%" },
                                          { rate: 43.37, min: 173205, max: 246752, label: "43.37%" },
                                          { rate: 47.05, min: 246752, max: 400000, label: "47.05%" }
                                        ],
                                        capitalGains: [
                                          { rate: 10.45, min: 0, max: 50597, label: "10.45%" },
                                          { rate: 11.80, min: 50597, max: 55867, label: "11.80%" },
                                          { rate: 14.55, min: 55867, max: 101198, label: "14.55%" },
                                          { rate: 16.35, min: 101198, max: 111733, label: "16.35%" },
                                          { rate: 19.10, min: 111733, max: 164525, label: "19.10%" },
                                          { rate: 20.03, min: 164525, max: 173205, label: "20.03%" },
                                          { rate: 21.69, min: 173205, max: 246752, label: "21.69%" },
                                          { rate: 23.53, min: 246752, max: 400000, label: "23.53%" }
                                        ],
                                        eligibleDividends: [
                                          { rate: -7.76, min: 0, max: 50597, label: "-7.76%" },
                                          { rate: -4.03, min: 50597, max: 55867, label: "-4.03%" },
                                          { rate: 3.56, min: 55867, max: 101198, label: "3.56%" },
                                          { rate: 8.53, min: 101198, max: 111733, label: "8.53%" },
                                          { rate: 16.12, min: 111733, max: 164525, label: "16.12%" },
                                          { rate: 18.67, min: 164525, max: 173205, label: "18.67%" },
                                          { rate: 23.25, min: 173205, max: 246752, label: "23.25%" },
                                          { rate: 28.33, min: 246752, max: 400000, label: "28.33%" }
                                        ],
                                        nonEligibleDividends: [
                                          { rate: 6.75, min: 0, max: 50597, label: "6.75%" },
                                          { rate: 9.86, min: 50597, max: 55867, label: "9.86%" },
                                          { rate: 16.18, min: 55867, max: 101198, label: "16.18%" },
                                          { rate: 20.32, min: 101198, max: 111733, label: "20.32%" },
                                          { rate: 26.65, min: 111733, max: 164525, label: "26.65%" },
                                          { rate: 28.77, min: 164525, max: 173205, label: "28.77%" },
                                          { rate: 32.59, min: 173205, max: 246752, label: "32.59%" },
                                          { rate: 36.82, min: 246752, max: 400000, label: "36.82%" }
                                        ]
                                      },
                                      'NU': {
                                        ordinary: [
                                          { rate: 19.00, min: 0, max: 53268, label: "19.00%" },
                                          { rate: 22.00, min: 53268, max: 55867, label: "22.00%" },
                                          { rate: 27.50, min: 55867, max: 106537, label: "27.50%" },
                                          { rate: 29.50, min: 106537, max: 111733, label: "29.50%" },
                                          { rate: 35.00, min: 111733, max: 173205, label: "35.00%" },
                                          { rate: 40.82, min: 173205, max: 246752, label: "40.82%" },
                                          { rate: 44.50, min: 246752, max: 400000, label: "44.50%" }
                                        ],
                                        capitalGains: [
                                          { rate: 9.50, min: 0, max: 53268, label: "9.50%" },
                                          { rate: 11.00, min: 53268, max: 55867, label: "11.00%" },
                                          { rate: 13.75, min: 55867, max: 106537, label: "13.75%" },
                                          { rate: 14.75, min: 106537, max: 111733, label: "14.75%" },
                                          { rate: 17.50, min: 111733, max: 173205, label: "17.50%" },
                                          { rate: 20.41, min: 173205, max: 246752, label: "20.41%" },
                                          { rate: 22.25, min: 246752, max: 400000, label: "22.25%" }
                                        ],
                                        eligibleDividends: [
                                          { rate: -8.11, min: 0, max: 53268, label: "-8.11%" },
                                          { rate: 2.03, min: 53268, max: 55867, label: "2.03%" },
                                          { rate: 9.62, min: 55867, max: 106537, label: "9.62%" },
                                          { rate: 12.38, min: 106537, max: 111733, label: "12.38%" },
                                          { rate: 19.97, min: 111733, max: 173205, label: "19.97%" },
                                          { rate: 28.00, min: 173205, max: 246752, label: "28.00%" },
                                          { rate: 33.08, min: 246752, max: 400000, label: "33.08%" }
                                        ],
                                        nonEligibleDividends: [
                                          { rate: 6.46, min: 0, max: 53268, label: "6.46%" },
                                          { rate: 11.91, min: 53268, max: 55867, label: "11.91%" },
                                          { rate: 18.24, min: 55867, max: 106537, label: "18.24%" },
                                          { rate: 20.54, min: 106537, max: 111733, label: "20.54%" },
                                          { rate: 26.86, min: 111733, max: 173205, label: "26.86%" },
                                          { rate: 33.56, min: 173205, max: 246752, label: "33.56%" },
                                          { rate: 37.79, min: 246752, max: 400000, label: "37.79%" }
                                        ]
                                      },
                                      'YT': {
                                        ordinary: [
                                          { rate: 22.40, min: 0, max: 55867, label: "22.40%" },
                                          { rate: 29.50, min: 55867, max: 111733, label: "29.50%" },
                                          { rate: 36.90, min: 111733, max: 173205, label: "36.90%" },
                                          { rate: 42.25, min: 173205, max: 246752, label: "42.25%" },
                                          { rate: 46.60, min: 246752, max: 500000, label: "46.60%" },
                                          { rate: 48.00, min: 500000, max: 1000000, label: "48.00%" }
                                        ],
                                        capitalGains: [
                                          { rate: 11.20, min: 0, max: 55867, label: "11.20%" },
                                          { rate: 14.75, min: 55867, max: 111733, label: "14.75%" },
                                          { rate: 18.45, min: 111733, max: 173205, label: "18.45%" },
                                          { rate: 21.13, min: 173205, max: 246752, label: "21.13%" },
                                          { rate: 23.30, min: 246752, max: 500000, label: "23.30%" },
                                          { rate: 24.00, min: 500000, max: 1000000, label: "24.00%" }
                                        ],
                                        eligibleDividends: [
                                          { rate: -7.68, min: 0, max: 55867, label: "-7.68%" },
                                          { rate: 3.40, min: 55867, max: 111733, label: "3.40%" },
                                          { rate: 13.61, min: 111733, max: 173205, label: "13.61%" },
                                          { rate: 20.99, min: 173205, max: 246752, label: "20.99%" },
                                          { rate: 25.59, min: 246752, max: 500000, label: "25.59%" },
                                          { rate: 28.93, min: 500000, max: 1000000, label: "28.93%" }
                                        ],
                                        nonEligibleDividends: [
                                          { rate: 13.45, min: 0, max: 55867, label: "13.45%" },
                                          { rate: 22.77, min: 55867, max: 111733, label: "22.77%" },
                                          { rate: 31.28, min: 111733, max: 173205, label: "31.28%" },
                                          { rate: 37.43, min: 173205, max: 246752, label: "37.43%" },
                                          { rate: 41.31, min: 246752, max: 500000, label: "41.31%" },
                                          { rate: 44.04, min: 500000, max: 1000000, label: "44.04%" }
                                        ]
                                      }
                                    };

                                    // Get the client's province from the household data
                                    const client = household?.clients.find(c => c.id === spouse.t1Return.clientId);
                                    const clientProvince = (client as any)?.province || 'ON';
                                    const validProvince = clientProvince === 'AB' ? 'AB' : 
                                                        clientProvince === 'BC' ? 'BC' : 
                                                        clientProvince === 'MB' ? 'MB' : 
                                                        clientProvince === 'NB' ? 'NB' : 
                                                        clientProvince === 'NL' ? 'NL' : 
                                                        clientProvince === 'NS' ? 'NS' : 
                                                        clientProvince === 'PE' ? 'PE' : 
                                                        clientProvince === 'QC' ? 'QC' : 
                                                        clientProvince === 'SK' ? 'SK' : 
                                                        clientProvince === 'NT' ? 'NT' : 
                                                        clientProvince === 'NU' ? 'NU' : 
                                                        clientProvince === 'YT' ? 'YT' : 'ON';
                                    const provinceRates = taxRatesByProvince[validProvince];
                                    
                                    const incomeTypes = [
                                      { 
                                        name: 'Ordinary Income', 
                                        brackets: provinceRates.ordinary
                                      },
                                      { 
                                        name: 'Capital Gains', 
                                        brackets: provinceRates.capitalGains
                                      },
                                      { 
                                        name: 'Eligible Dividends', 
                                        brackets: provinceRates.eligibleDividends
                                      },
                                      { 
                                        name: 'Non-Eligible Dividends', 
                                        brackets: provinceRates.nonEligibleDividends
                                      }
                                    ];

                                    const maxScale = 300000;
                                    const currentIncome = spouse.taxableIncome;

                                    return incomeTypes.map((incomeType, typeIdx) => (
                                      <div key={typeIdx} className="flex flex-col items-center">
                                        {/* Vertical bar */}
                                        <div className="relative w-20 h-80 bg-gray-100 border">
                                          {incomeType.brackets.map((bracket, idx) => {
                                            // Skip brackets that start above $300k
                                            if (bracket.min >= maxScale) return null;
                                            
                                            // For high earners (>$247k), highlight the top bracket
                                            const isCurrentBracket = currentIncome > bracket.min && 
                                              (currentIncome <= bracket.max || (currentIncome > 247000 && bracket.min === 246752));
                                            
                                            const bracketTop = Math.min(bracket.max, maxScale);
                                            const bracketHeight = bracketTop - bracket.min;
                                            const heightPercent = (bracketHeight / maxScale) * 100;
                                            const bottomPercent = (bracket.min / maxScale) * 100;
                                            
                                            // Color coding using brand colors
                                            let bgColor = 'bg-primary'; // Primary green for all bars
                                            if (isCurrentBracket) {
                                              if (bracket.rate < 0) {
                                                bgColor = 'bg-primary'; // Primary green for negative rates
                                              } else {
                                                bgColor = 'bg-accent'; // Accent green for positive rates
                                              }
                                            }
                                            
                                            return (
                                              <div 
                                                key={idx}
                                                className={`absolute w-full ${bgColor} flex items-center justify-center border-t border-white`}
                                                style={{
                                                  bottom: `${bottomPercent}%`,
                                                  height: `${heightPercent}%`
                                                }}
                                              >
                                                <span className="text-xs font-medium text-black whitespace-nowrap z-20 relative">
                                                  {bracket.label}
                                                </span>
                                              </div>
                                            );
                                          })}
                                          
                                          {/* Current income indicator line - show on all bars */}
                                          <div 
                                            className="absolute left-0 w-full h-1 z-10"
                                            style={{
                                              bottom: `${spouse.taxableIncome > 247000 ? '100%' : Math.min(spouse.taxableIncome / 300000, 1) * 100 + '%'}`,
                                              backgroundColor: '#D4B26A'
                                            }}
                                          >
                                            {/* Income label to the left of the bars - only show on first bar */}
                                            {typeIdx === 0 && (
                                              <div 
                                                className="absolute right-32 -top-2 text-xs font-semibold whitespace-nowrap"
                                                style={{ color: '#D4B26A' }}
                                              >
                                                Taxable Income: ${Math.round(spouse.taxableIncome / 1000)}k
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                        
                                        {/* Label below each bar */}
                                        <div className="mt-2 text-xs text-center text-gray-700 font-medium w-20">
                                          {incomeType.name}
                                        </div>
                                      </div>
                                    ));
                                  })()}
                                </div>
                              </div>
                            </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Federal Tax Bracket Analysis */}
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-900">Federal Tax Bracket Analysis</h2>
                  
                  {/* Federal Tax Bracket Tables */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                  {spouseData.map((spouse, spouseIndex) => {
                    // Federal tax brackets for 2024
                    const federalBrackets = [
                      { rate: 15.0, min: 0, max: 55867, label: "15.00%" },
                      { rate: 20.5, min: 55867, max: 111733, label: "20.50%" },
                      { rate: 26.0, min: 111733, max: 173205, label: "26.00%" },
                      { rate: 29.0, min: 173205, max: 246752, label: "29.00%" },
                      { rate: 33.0, min: 246752, max: Infinity, label: "33.00%" }
                    ];

                    const calculateFederalTaxBreakdown = (income: number) => {
                      // 2024 Federal Basic Personal Amount
                      const federalBPA = 15705;
                      
                      // Calculate gross federal tax first
                      let grossFederalTax = 0;
                      const breakdown = federalBrackets.map(bracket => {
                        let incomeInBracket = 0;
                        let taxFromBracket = 0;
                        
                        if (income > bracket.min) {
                          const maxForBracket = Math.min(income, bracket.max);
                          incomeInBracket = maxForBracket - bracket.min;
                          taxFromBracket = incomeInBracket * (bracket.rate / 100);
                          grossFederalTax += taxFromBracket;
                        }

                        return {
                          rate: bracket.label,
                          threshold: `$${bracket.min.toLocaleString()} to ${bracket.max === Infinity ? 'above' : '$' + bracket.max.toLocaleString()}`,
                          incomeInBracket: incomeInBracket,
                          tax: taxFromBracket,
                          ratePercent: bracket.rate
                        };
                      });
                      
                      // Calculate basic personal amount credit (lowest tax rate applied to BPA)
                      const federalBPACredit = federalBPA * (federalBrackets[0].rate / 100);
                      
                      // Adjust the tax in each bracket proportionally to account for BPA credit
                      const netFederalTax = Math.max(0, grossFederalTax - federalBPACredit);
                      const adjustmentRatio = grossFederalTax > 0 ? netFederalTax / grossFederalTax : 0;
                      
                      return breakdown.map(bracket => ({
                        ...bracket,
                        tax: bracket.tax * adjustmentRatio
                      }));
                    };

                    // Get actual federal tax amount from T1 form for this spouse
                    const actualFederalTax = (() => {
                      // Use the T1 return directly from spouseData
                      const spouseT1 = spouse.t1Return as any;
                      
                      if (spouseT1 && spouseT1.formFields) {
                        const federalTaxField = spouseT1.formFields.find((field: any) => field.fieldCode === '42000');
                        const federalTax = federalTaxField?.fieldValue ? parseFloat(String(federalTaxField.fieldValue).replace(/[,$\s]/g, '')) : 0;
                        return federalTax;
                      }
                      return 0;
                    })();
                    
                    const federalBracketBreakdown = calculateFederalTaxBreakdown(spouse.taxableIncome);
                    const calculatedFederalTax = federalBracketBreakdown.reduce((sum, bracket) => sum + bracket.tax, 0);
                    
                    // Adjust bracket breakdown to match actual federal tax
                    const adjustmentRatio = calculatedFederalTax > 0 ? actualFederalTax / calculatedFederalTax : 0;
                    const adjustedFederalBracketBreakdown = federalBracketBreakdown.map(bracket => ({
                      ...bracket,
                      tax: bracket.tax * adjustmentRatio
                    }));
                    
                    const totalFederalTax = actualFederalTax;

                    return (
                      <Card key={spouseIndex}>
                        <CardContent className="p-6">
                          <div>
                            <h3 className="font-medium text-gray-900 mb-4">
                              {spouse.clientName} - Federal Tax Bracket Analysis
                            </h3>
                            
                            {/* Federal Tax Bracket Table */}
                            <div className="overflow-x-auto">
                              <table className="w-full border-collapse text-sm">
                                <thead>
                                  <tr className="border-b">
                                    <th className="text-left py-2 px-2 font-medium text-gray-900">Rate</th>
                                    <th className="text-left py-2 px-2 font-medium text-gray-900">Threshold</th>
                                    <th className="text-right py-2 px-2 font-medium text-gray-900">Income</th>
                                    <th className="text-right py-2 px-2 font-medium text-gray-900">Tax</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {adjustedFederalBracketBreakdown.map((bracket, index) => {
                                    // Check if this is the current marginal tax bracket
                                    const isCurrentBracket = bracket.incomeInBracket > 0 && 
                                      index === adjustedFederalBracketBreakdown.findIndex((b, i) => 
                                        b.incomeInBracket > 0 && 
                                        (i === adjustedFederalBracketBreakdown.length - 1 || 
                                         adjustedFederalBracketBreakdown[i + 1].incomeInBracket === 0)
                                      );
                                    
                                    return (
                                      <tr 
                                        key={index} 
                                        className={`border-b ${bracket.incomeInBracket > 0 ? 'bg-accent/20' : ''}`}
                                        style={isCurrentBracket ? { 
                                          border: '2px solid #D4B26A',
                                          borderRadius: '4px'
                                        } : {}}
                                      >
                                        <td className="py-2 px-2 font-medium text-primary">{bracket.rate}</td>
                                        <td className="py-2 px-2 text-gray-700 text-xs">{bracket.threshold}</td>
                                        <td className="py-2 px-2 text-right text-gray-700 text-xs">
                                          ${bracket.incomeInBracket.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                        </td>
                                        <td className="py-2 px-2 text-right text-gray-700 text-xs">
                                          ${bracket.tax.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                  <tr className="border-b-2 border-gray-800 font-semibold bg-gray-100">
                                    <td className="py-2 px-2">Total</td>
                                    <td className="py-2 px-2"></td>
                                    <td className="py-2 px-2 text-right text-gray-700 text-xs">
                                      ${spouse.taxableIncome.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                    </td>
                                    <td className="py-2 px-2 text-right text-gray-700 text-xs">
                                      ${totalFederalTax.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Federal Tax Bracket Visualizations */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {spouseData.map((spouse, spouseIndex) => {
                    // Federal tax brackets for visualization - different rates for different income types
                    const federalOrdinaryBrackets = [
                      { rate: 15.0, min: 0, max: 55867, label: "15.00%" },
                      { rate: 20.5, min: 55867, max: 111733, label: "20.50%" },
                      { rate: 26.0, min: 111733, max: 173205, label: "26.00%" },
                      { rate: 29.0, min: 173205, max: 246752, label: "29.00%" },
                      { rate: 33.0, min: 246752, max: 300000, label: "33.00%" }
                    ];
                    
                    const federalCapitalGainsBrackets = [
                      { rate: 7.5, min: 0, max: 55867, label: "7.50%" },
                      { rate: 10.25, min: 55867, max: 111733, label: "10.25%" },
                      { rate: 13.0, min: 111733, max: 173205, label: "13.00%" },
                      { rate: 14.5, min: 173205, max: 246752, label: "14.50%" },
                      { rate: 16.5, min: 246752, max: 300000, label: "16.50%" }
                    ];
                    
                    const federalEligibleDividendBrackets = [
                      { rate: -0.03, min: 0, max: 55867, label: "-0.03%" },
                      { rate: 7.56, min: 55867, max: 111733, label: "7.56%" },
                      { rate: 15.15, min: 111733, max: 173205, label: "15.15%" },
                      { rate: 19.73, min: 173205, max: 246752, label: "19.73%" },
                      { rate: 24.81, min: 246752, max: 300000, label: "24.81%" }
                    ];
                    
                    const federalNonEligibleDividendBrackets = [
                      { rate: 6.87, min: 0, max: 55867, label: "6.87%" },
                      { rate: 13.19, min: 55867, max: 111733, label: "13.19%" },
                      { rate: 18.52, min: 111733, max: 173205, label: "18.52%" },
                      { rate: 27.57, min: 173205, max: 246752, label: "27.57%" },
                      { rate: 27.57, min: 246752, max: 300000, label: "27.57%" }
                    ];

                    return (
                      <Card key={spouseIndex}>
                        <CardContent className="p-6">
                          <div className="space-y-4">
                            <div>
                              <h3 className="font-medium text-gray-900 mb-4">
                                {spouse.clientName} - Federal Tax Bracket Visualization
                              </h3>

                              {/* Federal Tax Bracket Chart */}
                              <div className="relative">
                                <div className="flex items-start justify-center">
                                  {/* Income scale labels on left (vertical axis) - federal brackets */}
                                  <div className="w-16 h-72 relative flex flex-col mr-4 text-xs text-gray-700 font-medium">
                                    {/* Federal tax bracket thresholds */}
                                    {(() => {
                                      const federalThresholds = [
                                        { income: 0, label: "$0" },
                                        { income: 55867, label: "$56k" },
                                        { income: 111733, label: "$112k" },
                                        { income: 173205, label: "$173k" },
                                        { income: 246752, label: "$247k" },
                                        { income: 300000, label: "$300k" }
                                      ];

                                      return federalThresholds.map((threshold, idx) => {
                                        const position = (threshold.income / 300000) * 100;
                                        
                                        // Special positioning for $300k label - place it just below the top
                                        const adjustedPosition = threshold.income === 300000 ? 
                                          position - 4 : // Move down 4% from the top (half of previous 8%)
                                          position;
                                        
                                        return (
                                          <div 
                                            key={idx}
                                            className="absolute right-0 text-right"
                                            style={{
                                              bottom: `${adjustedPosition}%`,
                                              transform: 'translateY(0%)'
                                            }}
                                          >
                                            {threshold.label}
                                          </div>
                                        );
                                      });
                                    })()}
                                  </div>
                                  
                                  {/* Four Income Type Bars */}
                                  <div className="flex space-x-3">
                                    {(() => {
                                      const incomeTypes = [
                                        { name: 'Ordinary Income', brackets: federalOrdinaryBrackets },
                                        { name: 'Capital Gains', brackets: federalCapitalGainsBrackets },
                                        { name: 'Eligible Dividends', brackets: federalEligibleDividendBrackets },
                                        { name: 'Non-Eligible Dividends', brackets: federalNonEligibleDividendBrackets }
                                      ];

                                      return incomeTypes.map((incomeType, typeIdx) => {
                                        const maxScale = 300000; // Scale chart to $300k max
                                        const currentIncome = spouse.taxableIncome;

                                        return (
                                          <div key={typeIdx} className="flex flex-col items-center">
                                            {/* Vertical bar */}
                                            <div className="relative w-20 h-72 bg-gray-100 border">
                                              {incomeType.brackets.map((bracket, idx) => {
                                                // Skip brackets that start above $300k
                                                if (bracket.min >= maxScale) return null;
                                                
                                                // For high earners (>$247k), highlight the top bracket
                                                const isCurrentBracket = currentIncome > bracket.min && 
                                                  (currentIncome <= bracket.max || (currentIncome > 247000 && bracket.min === 246752));
                                                
                                                const bracketTop = Math.min(bracket.max, maxScale);
                                                const bracketHeight = bracketTop - bracket.min;
                                                const heightPercent = (bracketHeight / maxScale) * 100;
                                                const bottomPercent = (bracket.min / maxScale) * 100;
                                                
                                                // Color coding using brand colors - highlight current bracket with accent green
                                                let bgColor = isCurrentBracket ? 'bg-accent' : 'bg-primary';
                                                
                                                return (
                                                  <div 
                                                    key={idx}
                                                    className={`absolute w-full ${bgColor} flex items-center justify-center border-t border-white`}
                                                    style={{
                                                      bottom: `${bottomPercent}%`,
                                                      height: `${heightPercent}%`
                                                    }}
                                                  >
                                                    <span className="text-xs font-medium text-black whitespace-nowrap z-20 relative">
                                                      {bracket.label}
                                                    </span>
                                                  </div>
                                                );
                                              })}
                                              
                                              {/* Current income indicator line - show across all 4 bars */}
                                              <div 
                                                className="absolute left-0 w-full h-1 z-10"
                                                style={{
                                                  bottom: `${currentIncome > 247000 ? '100%' : Math.min(currentIncome / maxScale, 1) * 100 + '%'}`,
                                                  backgroundColor: '#D4B26A'
                                                }}
                                              >
                                                {/* Income label to the left of the bars - only show on first bar */}
                                                {typeIdx === 0 && (
                                                  <div 
                                                    className="absolute right-32 -top-2 text-xs font-semibold whitespace-nowrap"
                                                    style={{ color: '#D4B26A' }}
                                                  >
                                                    Taxable Income: ${Math.round(currentIncome / 1000)}k
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                            
                                            {/* Label below the bar */}
                                            <div className="mt-2 text-xs text-center text-gray-700 font-medium w-20">
                                              {incomeType.name}
                                            </div>
                                          </div>
                                        );
                                      });
                                    })()}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
                </div>

                {/* Provincial Tax Bracket Analysis - Only show for provinces with provincial tax */}
                {getClientProvince() === 'ON' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-900">Provincial Tax Bracket Analysis</h2>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {spouseData.map((spouse, spouseIndex) => {
                      // Get the user's province from T1 data - defaulting to Ontario for now
                      const province = 'ON'; // Default to Ontario since province isn't in spouse data structure
                      
                      // Ontario provincial tax brackets (5.05% to 13.16%)
                      const ontarioTaxBrackets = [
                        { rate: 5.05, min: 0, max: 51446, threshold: 51446, label: "5.05%" },
                        { rate: 9.15, min: 51446, max: 102894, threshold: 102894, label: "9.15%" },
                        { rate: 11.16, min: 102894, max: 150000, threshold: 150000, label: "11.16%" },
                        { rate: 12.16, min: 150000, max: 220000, threshold: 220000, label: "12.16%" },
                        { rate: 13.16, min: 220000, max: 300000, threshold: 300000, label: "13.16%" }
                      ];

                      // Calculate current bracket info
                      const currentBracket = ontarioTaxBrackets.find(bracket => 
                        spouse.taxableIncome > bracket.min && 
                        (spouse.taxableIncome <= bracket.max || (spouse.taxableIncome > 220000 && bracket.min === 220000))
                      ) || ontarioTaxBrackets[ontarioTaxBrackets.length - 1];

                      return (
                        <Card key={spouseIndex}>
                          <CardContent className="p-6">
                            <div>
                              <h3 className="font-medium text-gray-900 mb-4">
                                {spouse.clientName} - Provincial Tax Bracket Analysis
                              </h3>
                              
                              {/* Provincial Tax Bracket Table */}
                              <div className="overflow-x-auto">
                                <table className="w-full border-collapse text-sm">
                                  <thead>
                                    <tr className="border-b">
                                      <th className="text-left py-2 px-2 font-medium text-gray-900">Rate</th>
                                      <th className="text-left py-2 px-2 font-medium text-gray-900">Threshold</th>
                                      <th className="text-right py-2 px-2 font-medium text-gray-900">Income</th>
                                      <th className="text-right py-2 px-2 font-medium text-gray-900">Tax</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(() => {
                                      const calculateProvincialTaxBreakdown = (income: number) => {
                                        // 2024 Ontario Basic Personal Amount
                                        const ontarioBPA = 12399;
                                        
                                        // Calculate gross provincial tax first
                                        let grossProvincialTax = 0;
                                        const breakdown = ontarioTaxBrackets.map(bracket => {
                                          let incomeInBracket = 0;
                                          let taxFromBracket = 0;
                                          
                                          if (income > bracket.min) {
                                            const maxForBracket = Math.min(income, bracket.max);
                                            incomeInBracket = maxForBracket - bracket.min;
                                            taxFromBracket = incomeInBracket * (bracket.rate / 100);
                                            grossProvincialTax += taxFromBracket;
                                          }

                                          return {
                                            rate: bracket.label,
                                            threshold: `$${bracket.min.toLocaleString()} to ${bracket.max === 300000 ? 'above' : '$' + bracket.max.toLocaleString()}`,
                                            incomeInBracket: incomeInBracket,
                                            tax: taxFromBracket,
                                            ratePercent: bracket.rate
                                          };
                                        });
                                        
                                        // Calculate basic personal amount credit (lowest tax rate applied to BPA)
                                        const ontarioBPACredit = ontarioBPA * (ontarioTaxBrackets[0].rate / 100);
                                        
                                        // Adjust the tax in each bracket proportionally to account for BPA credit
                                        const netProvincialTax = Math.max(0, grossProvincialTax - ontarioBPACredit);
                                        const adjustmentRatio = grossProvincialTax > 0 ? netProvincialTax / grossProvincialTax : 0;
                                        
                                        return breakdown.map(bracket => ({
                                          ...bracket,
                                          tax: bracket.tax * adjustmentRatio
                                        }));
                                      };

                                      // Get actual provincial tax amount from T1 form for this spouse
                                      const actualProvincialTax = (() => {
                                        // Use the T1 return directly from spouseData
                                        const spouseT1 = spouse.t1Return as any;
                                        
                                        if (spouseT1 && spouseT1.formFields) {
                                          const provincialTaxField = spouseT1.formFields.find((field: any) => field.fieldCode === '42800');
                                          const provincialTax = provincialTaxField?.fieldValue ? parseFloat(String(provincialTaxField.fieldValue).replace(/[,$\s]/g, '')) : 0;
                                          return provincialTax;
                                        }
                                        return 0;
                                      })();
                                      
                                      const provincialBracketBreakdown = calculateProvincialTaxBreakdown(spouse.taxableIncome);
                                      const calculatedProvincialTax = provincialBracketBreakdown.reduce((sum, bracket) => sum + bracket.tax, 0);
                                      
                                      // Adjust bracket breakdown to match actual provincial tax
                                      const adjustmentRatio = calculatedProvincialTax > 0 ? actualProvincialTax / calculatedProvincialTax : 0;
                                      const adjustedProvincialBracketBreakdown = provincialBracketBreakdown.map(bracket => ({
                                        ...bracket,
                                        tax: bracket.tax * adjustmentRatio
                                      }));
                                      
                                      const totalProvincialTax = actualProvincialTax;

                                      return (
                                        <>
                                          {adjustedProvincialBracketBreakdown.map((bracket, index) => {
                                            // Check if this is the current marginal tax bracket
                                            const isCurrentBracket = bracket.incomeInBracket > 0 && 
                                              index === adjustedProvincialBracketBreakdown.findIndex((b, i) => 
                                                b.incomeInBracket > 0 && 
                                                (i === adjustedProvincialBracketBreakdown.length - 1 || 
                                                 adjustedProvincialBracketBreakdown[i + 1].incomeInBracket === 0)
                                              );
                                            
                                            return (
                                              <tr 
                                                key={index} 
                                                className={`border-b ${bracket.incomeInBracket > 0 ? 'bg-accent/20' : ''}`}
                                                style={isCurrentBracket ? { 
                                                  border: '2px solid #D4B26A',
                                                  borderRadius: '4px'
                                                } : {}}
                                              >
                                                <td className="py-2 px-2 font-medium text-primary">{bracket.rate}</td>
                                                <td className="py-2 px-2 text-gray-700 text-xs">{bracket.threshold}</td>
                                                <td className="py-2 px-2 text-right text-gray-700 text-xs">
                                                  ${bracket.incomeInBracket.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                                </td>
                                                <td className="py-2 px-2 text-right text-gray-700 text-xs">
                                                  ${bracket.tax.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                                </td>
                                              </tr>
                                            );
                                          })}
                                          <tr className="border-t-2 border-black font-bold">
                                            <td className="py-2 px-2 text-gray-900">Total</td>
                                            <td className="py-2 px-2 text-gray-900"></td>
                                            <td className="py-2 px-2 text-gray-900 text-right">
                                              ${spouse.taxableIncome.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                            </td>
                                            <td className="py-2 px-2 text-gray-900 text-right">
                                              ${totalProvincialTax.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                            </td>
                                          </tr>
                                        </>
                                      );
                                    })()}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
                )}

                {/* Provincial Tax Bracket Visualizations - Only show for provinces with provincial tax */}
                {getClientProvince() === 'ON' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {spouseData.map((spouse, spouseIndex) => {
                    // Ontario provincial tax brackets for visualization - different rates for different income types
                    const provincialOrdinaryBrackets = [
                      { rate: 5.05, min: 0, max: 51446, label: "5.05%" },
                      { rate: 9.15, min: 51446, max: 102894, label: "9.15%" },
                      { rate: 11.16, min: 102894, max: 150000, label: "11.16%" },
                      { rate: 12.16, min: 150000, max: 220000, label: "12.16%" },
                      { rate: 13.16, min: 220000, max: 300000, label: "13.16%" }
                    ];
                    
                    const provincialCapitalGainsBrackets = [
                      { rate: 2.525, min: 0, max: 51446, label: "2.53%" },
                      { rate: 4.575, min: 51446, max: 102894, label: "4.58%" },
                      { rate: 5.58, min: 102894, max: 150000, label: "5.58%" },
                      { rate: 6.08, min: 150000, max: 220000, label: "6.08%" },
                      { rate: 6.58, min: 220000, max: 300000, label: "6.58%" }
                    ];
                    
                    const provincialEligibleDividendBrackets = [
                      { rate: -1.91, min: 0, max: 51446, label: "-1.91%" },
                      { rate: 0.45, min: 51446, max: 102894, label: "0.45%" },
                      { rate: 3.28, min: 102894, max: 150000, label: "3.28%" },
                      { rate: 4.69, min: 150000, max: 220000, label: "4.69%" },
                      { rate: 6.11, min: 220000, max: 300000, label: "6.11%" }
                    ];
                    
                    const provincialNonEligibleDividendBrackets = [
                      { rate: 3.16, min: 0, max: 51446, label: "3.16%" },
                      { rate: 8.55, min: 51446, max: 102894, label: "8.55%" },
                      { rate: 11.73, min: 102894, max: 150000, label: "11.73%" },
                      { rate: 13.73, min: 150000, max: 220000, label: "13.73%" },
                      { rate: 15.76, min: 220000, max: 300000, label: "15.76%" }
                    ];

                    return (
                      <Card key={spouseIndex}>
                        <CardContent className="p-6">
                          <div className="space-y-4">
                            <div>
                              <h3 className="font-medium text-gray-900 mb-4">
                                {spouse.clientName} - Provincial Tax Bracket Visualization
                              </h3>

                              {/* Provincial Tax Bracket Chart */}
                              <div className="relative">
                                <div className="flex items-start justify-center">
                                  {/* Income scale labels on left (vertical axis) - provincial brackets */}
                                  <div className="w-16 h-72 relative flex flex-col mr-4 text-xs text-gray-700 font-medium">
                                    {/* Provincial tax bracket thresholds */}
                                    {(() => {
                                      const provincialThresholds = [
                                        { income: 0, label: "$0" },
                                        { income: 51446, label: "$51k" },
                                        { income: 102894, label: "$103k" },
                                        { income: 150000, label: "$150k" },
                                        { income: 220000, label: "$220k" },
                                        { income: 300000, label: "$300k" }
                                      ];

                                      // Calculate positions and handle overlaps
                                      let adjustedThresholds = provincialThresholds.map(threshold => ({
                                        ...threshold,
                                        position: (threshold.income / 300000) * 100
                                      }));

                                      // Adjust positions to prevent overlap (minimum 7% spacing)
                                      for (let i = 1; i < adjustedThresholds.length; i++) {
                                        const current = adjustedThresholds[i];
                                        const previous = adjustedThresholds[i - 1];
                                        const minSpacing = 7; // 7% minimum spacing
                                        
                                        if (current.position - previous.position < minSpacing) {
                                          current.position = previous.position + minSpacing;
                                        }
                                      }

                                      // Special positioning for $300k label
                                      const topThreshold = adjustedThresholds[adjustedThresholds.length - 1];
                                      if (topThreshold.income === 300000) {
                                        topThreshold.position = 100 - 4; // 4% down from top
                                      }

                                      return adjustedThresholds.map((threshold, idx) => (
                                        <div 
                                          key={idx}
                                          className="absolute right-0 text-right"
                                          style={{
                                            bottom: `${threshold.position}%`,
                                            transform: 'translateY(0%)'
                                          }}
                                        >
                                          {threshold.label}
                                        </div>
                                      ));
                                    })()}
                                  </div>
                                  
                                  {/* Four Income Type Bars */}
                                  <div className="flex space-x-3">
                                    {(() => {
                                      const incomeTypes = [
                                        { name: 'Ordinary Income', brackets: provincialOrdinaryBrackets },
                                        { name: 'Capital Gains', brackets: provincialCapitalGainsBrackets },
                                        { name: 'Eligible Dividends', brackets: provincialEligibleDividendBrackets },
                                        { name: 'Non-Eligible Dividends', brackets: provincialNonEligibleDividendBrackets }
                                      ];

                                      return incomeTypes.map((incomeType, typeIdx) => {
                                        const maxScale = 300000; // Scale chart to $300k max
                                        const currentIncome = spouse.taxableIncome;

                                        return (
                                          <div key={typeIdx} className="flex flex-col items-center">
                                            {/* Vertical bar */}
                                            <div className="relative w-20 h-72 bg-gray-100 border">
                                              {incomeType.brackets.map((bracket, idx) => {
                                                // Skip brackets that start above $300k
                                                if (bracket.min >= maxScale) return null;
                                                
                                                // Check if this is the current bracket for the taxpayer's income
                                                const isCurrentBracket = currentIncome > bracket.min && 
                                                  (currentIncome <= bracket.max || bracket.max >= maxScale);
                                                
                                                const bracketTop = Math.min(bracket.max, maxScale);
                                                const bracketHeight = bracketTop - bracket.min;
                                                const heightPercent = (bracketHeight / maxScale) * 100;
                                                const bottomPercent = (bracket.min / maxScale) * 100;
                                                
                                                // Highlight current bracket with accent color, others with primary
                                                let bgColor = isCurrentBracket ? 'bg-accent' : 'bg-primary';
                                                
                                                return (
                                                  <div 
                                                    key={idx}
                                                    className={`absolute w-full ${bgColor} flex items-center justify-center border-t border-white`}
                                                    style={{
                                                      bottom: `${bottomPercent}%`,
                                                      height: `${heightPercent}%`
                                                    }}
                                                  >
                                                    <span className="text-xs font-medium text-black whitespace-nowrap z-20 relative">
                                                      {bracket.label}
                                                    </span>
                                                  </div>
                                                );
                                              })}
                                              
                                              {/* Current income indicator line - show across all 4 bars */}
                                              <div 
                                                className="absolute left-0 w-full h-1 z-10"
                                                style={{
                                                  bottom: `${currentIncome > maxScale ? '100%' : Math.min(currentIncome / maxScale, 1) * 100 + '%'}`,
                                                  backgroundColor: '#D4B26A'
                                                }}
                                              >
                                                {/* Income label to the left of the bars - only show on first bar */}
                                                {typeIdx === 0 && (
                                                  <div 
                                                    className="absolute right-32 -top-2 text-xs font-semibold whitespace-nowrap"
                                                    style={{ color: '#D4B26A' }}
                                                  >
                                                    Taxable Income: ${Math.round(currentIncome / 1000)}k
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                            
                                            {/* Label below the bar */}
                                            <div className="mt-2 text-xs text-center text-gray-700 font-medium w-20">
                                              {incomeType.name}
                                            </div>
                                          </div>
                                        );
                                      });
                                    })()}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
                )}

              </div>
            );
          })()}
        </div>

        {/* Deductions Analysis */}
        <div className="space-y-6 mt-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Tax Deductions Analysis</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {(() => {
              // Get T1 returns for the specified year for both spouses
              const spouseData = [];
              
              // Primary client
              if (household?.clients?.[0]) {
                const client = household.clients[0];
                const t1Return = client.t1Returns?.find(ret => ret.taxYear === taxYear);
                const formFields = t1Return?.formFields || [];
                spouseData.push({
                  clientName: `${client.firstName} ${client.lastName}`,
                  t1Return,
                  formFields
                });
              }
              
              // Secondary client
              if (household?.clients?.[1]) {
                const client = household.clients[1];
                const t1Return = client.t1Returns?.find(ret => ret.taxYear === taxYear);
                const formFields = t1Return?.formFields || [];
                spouseData.push({
                  clientName: `${client.firstName} ${client.lastName}`,
                  t1Return,
                  formFields
                });
              }

              return spouseData.map((spouse, spouseIndex) => {
                if (!spouse.t1Return) return null;

                // Helper function to get field value
                const getFieldValue = (lineNumber: string) => {
                  const field = spouse.formFields.find(f => f.fieldCode === lineNumber);
                  return field?.fieldValue ? parseFloat(field.fieldValue) : 0;
                };

                // Helper function to format currency
                const formatCurrency = (amount: number) => {
                  return new Intl.NumberFormat('en-CA', {
                    style: 'currency',
                    currency: 'CAD',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  }).format(amount);
                };

                // Define all possible deductions with their line numbers
                const deductions = [
                  // Retirement Plan Deductions
                  { category: "Retirement Plan Deductions", items: [
                    { name: "RPP Deduction", line: "20700" },
                    { name: "RRSP Deduction", line: "20800" },
                    { name: "FHSA Deduction", line: "20805" },
                    { name: "PRPP Deduction", line: "20810" },
                    { name: "SPP Deduction", line: "20820" },
                    { name: "Pooled Fund Deduction", line: "20900" },
                    { name: "Split Pension Deduction", line: "21000" },
                  ]},
                  
                  // Personal Deductions
                  { category: "Personal Deductions", items: [
                    { name: "Annual Union Dues", line: "21200" },
                    { name: "UCCB Repayment", line: "21300" },
                    { name: "Child Care Expenses", line: "21400" },
                    { name: "Disability Supports", line: "21500" },
                    { name: "Business Investment Loss", line: "21700" },
                    { name: "Moving Expenses", line: "21900" },
                    { name: "Support Payments Allowable", line: "22000" },
                    { name: "Carrying Charges", line: "22100" },
                  ]},
                  
                  // Employment Deductions
                  { category: "Employment Deductions", items: [
                    { name: "CPP/QPP Self-Employed", line: "22200" },
                    { name: "Enhanced CPP/QPP Deduction", line: "22215" },
                    { name: "Other Employment Expenses", line: "22900" },
                    { name: "Clergy Residence", line: "23100" },
                  ]},
                  
                  // Specialized Deductions
                  { category: "Specialized Deductions", items: [
                    { name: "Exploration Development", line: "22400" },
                    { name: "Other Deductions", line: "23200" },
                    { name: "Social Benefits Repayment", line: "23500" },
                  ]},
                ];

                return (
                  <Card key={spouseIndex}>
                    <CardContent className="p-6">
                      <h3 className="font-medium text-gray-900 mb-6">
                        {spouse.clientName} - Tax Deductions
                      </h3>
                      
                      <div className="space-y-6">
                        {deductions.map((category, categoryIndex) => {
                          const categoryTotal = category.items.reduce((sum, item) => {
                            return sum + getFieldValue(item.line);
                          }, 0);

                          return (
                            <div key={categoryIndex} className="space-y-3">
                              <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                                <h4 className="font-medium text-primary text-sm">
                                  {category.category}
                                </h4>
                                <span className="font-medium text-primary text-sm">
                                  {formatCurrency(categoryTotal)}
                                </span>
                              </div>
                              
                              <div className="space-y-2">
                                {category.items.map((item, itemIndex) => {
                                  const amount = getFieldValue(item.line);
                                  const hasClaim = amount > 0;
                                  
                                  return (
                                    <div key={itemIndex} className="flex justify-between items-center text-sm">
                                      <div className="flex items-center space-x-2">
                                        <span 
                                          className="font-medium"
                                          style={{ color: hasClaim ? '#88AA73' : '#D4B26A' }}
                                        >
                                          {hasClaim ? '✓' : '✗'}
                                        </span>
                                        <span className="text-gray-700">
                                          {item.name}
                                        </span>
                                        <span className="text-gray-400 text-xs">
                                          (Line {item.line})
                                        </span>
                                      </div>
                                      <span className="font-medium text-right text-gray-700">
                                        {hasClaim ? formatCurrency(amount) : '$0'}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                        
                        {/* Total Deductions Summary */}
                        <div className="pt-4 border-t-2 border-primary space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-primary">
                              Total Deductions
                            </span>
                            <span className="font-semibold text-primary text-lg">
                              {formatCurrency(deductions.reduce((total, category) => {
                                return total + category.items.reduce((sum, item) => {
                                  return sum + getFieldValue(item.line);
                                }, 0);
                              }, 0))}
                            </span>
                          </div>
                          
                          {/* Estimated Tax Savings */}
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-primary">
                              Estimated Tax Savings
                            </span>
                            <span className="font-semibold text-primary text-lg">
                              {(() => {
                                const totalIncome = getFieldValue("15000"); // Total income
                                const taxableIncome = getFieldValue("26000"); // Taxable income
                                const deductionAmount = totalIncome - taxableIncome;
                                
                                // Calculate actual marginal tax rate based on taxable income
                                const calculateMarginalRate = (income: number) => {
                                  // 2024 Combined Ontario tax brackets (federal + provincial + surtax)
                                  const combinedBrackets = [
                                    { min: 0, max: 51446, rate: 20.05 },
                                    { min: 51446, max: 55867, rate: 24.15 },
                                    { min: 55867, max: 102894, rate: 31.48 },
                                    { min: 102894, max: 111733, rate: 35.58 },
                                    { min: 111733, max: 150000, rate: 43.41 },
                                    { min: 150000, max: 173205, rate: 46.16 },
                                    { min: 173205, max: 220000, rate: 47.74 },
                                    { min: 220000, max: 246752, rate: 51.97 },
                                    { min: 246752, max: Infinity, rate: 53.53 }
                                  ];
                                  
                                  // Find the bracket for this income level
                                  const bracket = combinedBrackets.find(b => income > b.min && income <= b.max) || 
                                                combinedBrackets[combinedBrackets.length - 1];
                                  
                                  return bracket.rate / 100; // Convert percentage to decimal
                                };
                                
                                const marginalRate = calculateMarginalRate(taxableIncome);
                                const estimatedSavings = deductionAmount * marginalRate;
                                
                                return formatCurrency(estimatedSavings);
                              })()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              });
            })()}
          </div>
        </div>

        {/* Federal Tax Credits Analysis */}
        <div className="space-y-6 mt-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Federal Tax Credits Analysis</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {(() => {
              // Get T1 returns for the specified year for both spouses
              const spouseData = [];
              
              // Primary client
              if (household?.clients?.[0]) {
                const client = household.clients[0];
                const t1Return = client.t1Returns?.find(ret => ret.taxYear === taxYear);
                const formFields = t1Return?.formFields || [];
                spouseData.push({
                  clientName: `${client.firstName} ${client.lastName}`,
                  t1Return,
                  formFields
                });
              }
              
              // Secondary client
              if (household?.clients?.[1]) {
                const client = household.clients[1];
                const t1Return = client.t1Returns?.find(ret => ret.taxYear === taxYear);
                const formFields = t1Return?.formFields || [];
                spouseData.push({
                  clientName: `${client.firstName} ${client.lastName}`,
                  t1Return,
                  formFields
                });
              }

              return spouseData.map((spouse, spouseIndex) => {
                if (!spouse.t1Return) return null;

                // Helper function to get field value
                const getFieldValue = (lineNumber: string) => {
                  // Handle calculated fields
                  if (lineNumber === 'CALC-34000+34200') {
                    const field34000 = spouse.formFields.find(f => f.fieldCode === '34000');
                    const field34200 = spouse.formFields.find(f => f.fieldCode === '34200');
                    const value34000 = field34000?.fieldValue ? parseFloat(field34000.fieldValue) : 0;
                    const value34200 = field34200?.fieldValue ? parseFloat(field34200.fieldValue) : 0;
                    return value34000 + value34200;
                  }
                  
                  const field = spouse.formFields.find(f => f.fieldCode === lineNumber);
                  return field?.fieldValue ? parseFloat(field.fieldValue) : 0;
                };

                // Helper function to format currency
                const formatCurrency = (amount: number) => {
                  return new Intl.NumberFormat('en-CA', {
                    style: 'currency',
                    currency: 'CAD',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  }).format(amount);
                };

                // Define federal tax credits only
                const federalCredits = [
                  // Basic Credits
                  { category: "Basic Credits (Non-Refundable)", items: [
                    { name: "Basic Personal Amount", line: "30000" },
                    { name: "Age Amount", line: "30100" },
                    { name: "Spouse or Common-law Partner Amount", line: "30300" },
                    { name: "Amount for Eligible Dependant", line: "30400" },
                    { name: "Canada Caregiver Amount", line: "30450" },
                  ]},
                  
                  // Employment Credits
                  { category: "Employment Credits (Non-Refundable)", items: [
                    { name: "CPP or QPP Contributions", line: "30800" },
                    { name: "CPP/QPP (Self Employed) Contributions", line: "31000" },
                    { name: "Employment Insurance Premiums", line: "31200" },
                    { name: "Employment Insurance (Self Employed) Premiums", line: "31217" },
                    { name: "Canada Employment Amount", line: "31220" },
                    { name: "Volunteer firefighters' amount (VFA)", line: "31230" },
                    { name: "Search and rescue volunteers' amount (SRVA)", line: "31240" },
                  ]},
                  
                  // Personal Situation Credits
                  { category: "Personal Situation Credits (Non-Refundable)", items: [
                    { name: "Home buyers' Amount", line: "31270" },
                    { name: "Adoption Expenses", line: "31300" },
                    { name: "Digital News Subscription", line: "31350" },
                    { name: "Pension Income Amount", line: "31400" },
                  ]},
                  
                  // Disability & Caregiver Credits
                  { category: "Disability & Caregiver Credits (Non-Refundable)", items: [
                    { name: "Canada Caregiver Amount Spouse/Partner/Adult Children", line: "30450" },
                    { name: "Canada Caregiver Amount for Children", line: "30500" },
                    { name: "Home Accessibility Expenses", line: "31285" },
                    { name: "Caregiver Amount", line: "31500" },
                    { name: "Disability Amount (Self)", line: "31600" },
                    { name: "Disability Amount (Dependant)", line: "31800" },
                  ]},
                  
                  // Education Credits  
                  { category: "Education Credits (Non-Refundable)", items: [
                    { name: "Interest on Student Loans", line: "31900" },
                    { name: "Tuition & Education Amounts", line: "32300" },
                    { name: "Tuition Transferred", line: "32400" },
                    { name: "Amounts Transferred from Spouse/Partner", line: "32600" },
                  ]},
                  
                  // Medical Credits
                  { category: "Medical Credits (Non-Refundable)", items: [
                    { name: "Medical Expenses", line: "33099" },
                    { name: "Allowable Medical Expenses", line: "33199" },
                    { name: "Net Eligible Medical Expenses", line: "33200" },
                    { name: "Allowable Amount of Medical Expenses", line: "33500" },
                  ]},
                  
                  // Charitable Gifts & Donations
                  { category: "Charitable Gifts & Donations (Non-Refundable)", items: [
                    { name: "Total eligible amount of charitable donations", line: "S9-TOTAL" },
                    { name: "Allowable Charitable Donations", line: "34000" },
                    { name: "Total Ecological Gifts", line: "34200" },
                    { name: "Total Eligible Gifts & Donations", line: "CALC-34000+34200" },
                    { name: "Donation & Gift Credits", line: "34900" },
                  ]},
                  
                  // Federal Refundable Credits
                  { category: "Federal Refundable Credits", items: [
                    { name: "Quebec Abatement", line: "44000" },
                    { name: "CPP Overpayment", line: "44800" },
                    { name: "EI Overpayment", line: "45000" },
                    { name: "Refundable Medical Expense Supplement", line: "45200" },
                    { name: "Canada Workers Benefit", line: "45300" },
                    { name: "Canada Training Credit", line: "45350" },
                    { name: "Multigenerational Home Renovation Tax Credit", line: "45355" },
                    { name: "Refund of Investment Tax", line: "45400" },
                    { name: "Part XII.2 Tax Credit", line: "45600" },
                    { name: "Employee & Partner GST/HST Rebate", line: "45700" },
                    { name: "Eligible Educator School Supply Tax Credit", line: "46900" },
                    { name: "Canadian Journalism Labour Tax Credit", line: "47555" },
                    { name: "Return of Fuel Charge Proceeds to Farmers", line: "47556" },
                  ]},
                ];

                return (
                  <Card key={spouseIndex}>
                    <CardContent className="p-6">
                      <h3 className="font-medium text-gray-900 mb-6">
                        {spouse.clientName} - Federal Tax Credits
                      </h3>
                      
                      <div className="space-y-6">
                        {federalCredits.map((category, categoryIndex) => {
                          const categoryTotal = category.items.reduce((sum, item) => {
                            return sum + getFieldValue(item.line);
                          }, 0);

                          return (
                            <div key={categoryIndex} className="space-y-3">
                              <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                                <h4 className="font-medium text-primary text-sm">
                                  {category.category}
                                </h4>
                                <span className="font-medium text-primary text-sm">
                                  {formatCurrency(categoryTotal)}
                                </span>
                              </div>
                              
                              <div className="space-y-2">
                                {category.items.map((item, itemIndex) => {
                                  const amount = getFieldValue(item.line);
                                  const hasClaim = amount > 0;
                                  
                                  return (
                                    <div key={itemIndex} className="flex justify-between items-center text-sm">
                                      <div className="flex items-center space-x-2">
                                        <span 
                                          className="font-medium"
                                          style={{ color: hasClaim ? '#88AA73' : '#D4B26A' }}
                                        >
                                          {hasClaim ? '✓' : '✗'}
                                        </span>
                                        <span className="text-gray-700">
                                          {item.name}
                                        </span>
                                        <span className="text-gray-400 text-xs">
                                          (Line {item.line})
                                        </span>
                                      </div>
                                      <span className="font-medium text-right text-gray-700">
                                        {hasClaim ? formatCurrency(amount) : '$0'}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                        
                        {/* Federal Credits Summary */}
                        <div className="pt-4 border-t-2 border-primary space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-primary">
                              Federal Non-Refundable Credits
                            </span>
                            <span className="font-semibold text-primary text-lg">
                              {formatCurrency(federalCredits.slice(0, 7).reduce((total, category) => {
                                return total + category.items.reduce((sum, item) => {
                                  return sum + getFieldValue(item.line);
                                }, 0);
                              }, 0))}
                            </span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-primary">
                              Federal Refundable Credits
                            </span>
                            <span className="font-semibold text-primary text-lg">
                              {formatCurrency(federalCredits.slice(7, 8).reduce((total, category) => {
                                return total + category.items.reduce((sum, item) => {
                                  return sum + getFieldValue(item.line);
                                }, 0);
                              }, 0))}
                            </span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-primary">
                              Federal Tax Reduction
                            </span>
                            <span className="font-semibold text-primary text-lg">
                              {(() => {
                                // Calculate federal tax reduction from non-refundable credits
                                const federalNonRefundableCredits = federalCredits.slice(0, 7).reduce((total, category) => {
                                  return total + category.items.reduce((sum, item) => {
                                    return sum + getFieldValue(item.line);
                                  }, 0);
                                }, 0);
                                
                                // Apply federal basic rate (15%) to federal non-refundable credits
                                const federalReduction = federalNonRefundableCredits * 0.15;
                                
                                return formatCurrency(federalReduction);
                              })()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              });
            })()}
          </div>
        </div>

        {/* Provincial Tax Credits Analysis */}
        <div className="space-y-6 mt-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Provincial Tax Credits Analysis</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {(() => {
              // Get T1 returns for the specified year for both spouses
              const spouseData = [];
              
              // Primary client
              if (household?.clients?.[0]) {
                const client = household.clients[0];
                const t1Return = client.t1Returns?.find(ret => ret.taxYear === taxYear);
                const formFields = t1Return?.formFields || [];
                spouseData.push({
                  clientName: `${client.firstName} ${client.lastName}`,
                  t1Return,
                  formFields
                });
              }
              
              // Secondary client
              if (household?.clients?.[1]) {
                const client = household.clients[1];
                const t1Return = client.t1Returns?.find(ret => ret.taxYear === taxYear);
                const formFields = t1Return?.formFields || [];
                spouseData.push({
                  clientName: `${client.firstName} ${client.lastName}`,
                  t1Return,
                  formFields
                });
              }

              return spouseData.map((spouse, spouseIndex) => {
                if (!spouse.t1Return) return null;

                // Helper function to get field value
                const getFieldValue = (lineNumber: string) => {
                  const field = spouse.formFields.find(f => f.fieldCode === lineNumber);
                  return field?.fieldValue ? parseFloat(field.fieldValue) : 0;
                };

                // Helper function to format currency
                const formatCurrency = (amount: number) => {
                  return new Intl.NumberFormat('en-CA', {
                    style: 'currency',
                    currency: 'CAD',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  }).format(amount);
                };

                // Check if client is in Ontario to show provincial credits
                const provinceField = spouse.formFields.find(f => f.fieldCode === 'province');
                const province = provinceField?.fieldValue;
                
                if (province !== 'ON') {
                  return (
                    <Card key={spouseIndex}>
                      <CardContent className="p-6">
                        <h3 className="font-medium text-gray-900 mb-6">
                          {spouse.clientName} - Provincial Tax Credits
                        </h3>
                        <div className="text-center text-gray-500 py-8">
                          No provincial tax credits available for this province
                        </div>
                      </CardContent>
                    </Card>
                  );
                }

                // Define provincial tax credits (Ontario only)
                const provincialCredits = [
                  // Ontario Non-Refundable Credits
                  { category: "Ontario Non-Refundable Credits", items: [
                    { name: "Ontario Basic Personal Amount", line: "58040" },
                    { name: "Ontario CPP/QPP Contributions", line: "58240" },
                    { name: "Ontario Employment Insurance Premiums", line: "58300" },
                    { name: "Ontario Medical Expenses", line: "58769" },
                    { name: "Ontario Donations and Gifts", line: "58969" },
                    { name: "Ontario Dividend Tax Credit", line: "61520" },
                  ]},
                  
                  // Ontario Credit Totals
                  { category: "Ontario Credit Totals", items: [
                    { name: "Ontario Total Credits", line: "58800" },
                    { name: "Ontario Total Non-Refundable Credits", line: "58840" },
                    { name: "Ontario Non-Refundable Tax Credits", line: "61500" },
                  ]},
                ];

                return (
                  <Card key={spouseIndex}>
                    <CardContent className="p-6">
                      <h3 className="font-medium text-gray-900 mb-6">
                        {spouse.clientName} - Provincial Tax Credits (Ontario)
                      </h3>
                      
                      <div className="space-y-6">
                        {provincialCredits.map((category, categoryIndex) => {
                          const categoryTotal = category.items.reduce((sum, item) => {
                            return sum + getFieldValue(item.line);
                          }, 0);

                          return (
                            <div key={categoryIndex} className="space-y-3">
                              <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                                <h4 className="font-medium text-primary text-sm">
                                  {category.category}
                                </h4>
                                <span className="font-medium text-primary text-sm">
                                  {formatCurrency(categoryTotal)}
                                </span>
                              </div>
                              
                              <div className="space-y-2">
                                {category.items.map((item, itemIndex) => {
                                  const amount = getFieldValue(item.line);
                                  const hasClaim = amount > 0;
                                  
                                  return (
                                    <div key={itemIndex} className="flex justify-between items-center text-sm">
                                      <div className="flex items-center space-x-2">
                                        <span 
                                          className="font-medium"
                                          style={{ color: hasClaim ? '#88AA73' : '#D4B26A' }}
                                        >
                                          {hasClaim ? '✓' : '✗'}
                                        </span>
                                        <span className="text-gray-700">
                                          {item.name}
                                        </span>
                                        <span className="text-gray-400 text-xs">
                                          (Line {item.line})
                                        </span>
                                      </div>
                                      <span className="font-medium text-right text-gray-700">
                                        {hasClaim ? formatCurrency(amount) : '$0'}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                        
                        {/* Provincial Credits Summary */}
                        <div className="pt-4 border-t-2 border-primary space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-primary">
                              Ontario Non-Refundable Credits
                            </span>
                            <span className="font-semibold text-primary text-lg">
                              {formatCurrency(provincialCredits.slice(0, 1).reduce((total, category) => {
                                return total + category.items.reduce((sum, item) => {
                                  return sum + getFieldValue(item.line);
                                }, 0);
                              }, 0))}
                            </span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-primary">
                              Ontario Refundable Credits
                            </span>
                            <span className="font-semibold text-primary text-lg">
                              {formatCurrency(provincialCredits.slice(1, 2).reduce((total, category) => {
                                return total + category.items.reduce((sum, item) => {
                                  return sum + getFieldValue(item.line);
                                }, 0);
                              }, 0))}
                            </span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-primary">
                              Provincial Tax Reduction
                            </span>
                            <span className="font-semibold text-primary text-lg">
                              {(() => {
                                // Calculate provincial tax reduction from Ontario non-refundable credits
                                const provincialNonRefundableCredits = provincialCredits.slice(0, 1).reduce((total, category) => {
                                  return total + category.items.reduce((sum, item) => {
                                    return sum + getFieldValue(item.line);
                                  }, 0);
                                }, 0);
                                
                                // Apply Ontario basic rate (5.05%) to provincial non-refundable credits
                                const provincialReduction = provincialNonRefundableCredits * 0.0505;
                                
                                return formatCurrency(provincialReduction);
                              })()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              });
            })()}
          </div>
        </div>

        {/* Government Clawback Analysis */}
        <div className="space-y-6 mt-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Clawback Analysis</h2>
          
          {/* Family-wide Government Clawbacks Summary */}
          <div className="w-full mb-6">
            {(() => {
              // Get T1 returns for both spouses
              const familyData: Array<{
                clientName: string;
                t1Return: any;
                formFields: any[];
              }> = [];
              
              // Primary client
              if (household?.clients?.[0]) {
                const client = household.clients[0];
                const t1Return = client.t1Returns?.find(ret => ret.taxYear === taxYear);
                const formFields = t1Return?.formFields || [];
                familyData.push({
                  clientName: `${client.firstName} ${client.lastName}`,
                  t1Return,
                  formFields
                });
              }
              
              // Secondary client
              if (household?.clients?.[1]) {
                const client = household.clients[1];
                const t1Return = client.t1Returns?.find(ret => ret.taxYear === taxYear);
                const formFields = t1Return?.formFields || [];
                familyData.push({
                  clientName: `${client.firstName} ${client.lastName}`,
                  t1Return,
                  formFields
                });
              }

              // Helper function to get field value for a specific spouse
              const getFieldValue = (spouseFormFields: any[], lineNumber: string) => {
                const field = spouseFormFields.find(f => f.fieldCode === lineNumber);
                return field?.fieldValue ? parseFloat(field.fieldValue) : 0;
              };

              // Helper function to format currency
              const formatCurrency = (amount: number) => {
                return new Intl.NumberFormat('en-CA', {
                  style: 'currency',
                  currency: 'CAD',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                }).format(amount);
              };

              // Calculate Maximum UCCB based on children's ages
              const calculateMaxUCCB = () => {
                if (!household?.children) return 0;
                
                const currentDate = new Date();
                let totalUCCB = 0;
                
                household.children.forEach(child => {
                  if (child.dateOfBirth) {
                    const birthDate = new Date(child.dateOfBirth);
                    const ageInYears = currentDate.getFullYear() - birthDate.getFullYear();
                    const monthDiff = currentDate.getMonth() - birthDate.getMonth();
                    const dayDiff = currentDate.getDate() - birthDate.getDate();
                    
                    // Adjust age if birthday hasn't occurred this year
                    const actualAge = (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) 
                      ? ageInYears - 1 
                      : ageInYears;
                    
                    if (actualAge < 6) {
                      totalUCCB += 648.91 * 12; // Annual amount for under 6
                    } else if (actualAge >= 6 && actualAge <= 17) {
                      totalUCCB += 547.50 * 12; // Annual amount for 6-17
                    }
                  }
                });
                
                return totalUCCB;
              };

              // Calculate CCB clawback percentage
              const calculateCCBClawbackPercentage = (afni: number, numUnder6: number, num6to17: number) => {
                const baseThreshold = 37487;
                const additionalThreshold = 81222;
                const maxCcbUnder6 = 7787;
                const maxCcb6to17 = 6570;
                
                // Set reduction rates based on total number of children
                const totalChildren = numUnder6 + num6to17;
                let baseRate: number, additionalRate: number;
                
                if (totalChildren === 1) {
                  baseRate = 0.07;
                  additionalRate = 0.032;
                } else if (totalChildren === 2) {
                  baseRate = 0.135;
                  additionalRate = 0.057;
                } else if (totalChildren === 3) {
                  baseRate = 0.19;
                  additionalRate = 0.08;
                } else {
                  baseRate = 0.23;
                  additionalRate = 0.095;
                }
                
                // Calculate maximum possible benefit
                const totalMaxBenefit = (numUnder6 * maxCcbUnder6) + (num6to17 * maxCcb6to17);
                
                // Calculate reduction amount
                let reduction: number;
                if (afni <= baseThreshold) {
                  reduction = 0;
                } else if (afni <= additionalThreshold) {
                  reduction = (afni - baseThreshold) * baseRate;
                } else {
                  reduction = ((additionalThreshold - baseThreshold) * baseRate +
                               (afni - additionalThreshold) * additionalRate);
                }
                
                // Ensure reduction doesn't exceed maximum benefit
                reduction = Math.min(reduction, totalMaxBenefit);
                
                // Calculate clawback percentage
                if (totalMaxBenefit === 0) {
                  return 0.0;
                }
                
                const clawbackPercentage = (reduction / totalMaxBenefit) * 100;
                return Math.round(clawbackPercentage * 100) / 100; // Round to 2 decimal places
              };

              // Count children by age groups
              const getChildrenCounts = () => {
                if (!household?.children || household.children.length === 0) {
                  return { numUnder6: 0, num6to17: 0 };
                }
                
                let numUnder6 = 0;
                let num6to17 = 0;
                const currentDate = new Date();
                
                household.children.forEach(child => {
                  if (child.dateOfBirth) {
                    const birthDate = new Date(child.dateOfBirth);
                    const ageInYears = currentDate.getFullYear() - birthDate.getFullYear();
                    const monthDiff = currentDate.getMonth() - birthDate.getMonth();
                    const dayDiff = currentDate.getDate() - birthDate.getDate();
                    
                    // Adjust age if birthday hasn't occurred this year
                    const actualAge = (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) 
                      ? ageInYears - 1 
                      : ageInYears;
                    
                    if (actualAge < 6) {
                      numUnder6++;
                    } else if (actualAge >= 6 && actualAge <= 17) {
                      num6to17++;
                    }
                  }
                });
                
                return { numUnder6, num6to17 };
              };

              // Calculate actual values
              const { numUnder6, num6to17 } = getChildrenCounts();
              const adjustedFamilyNetIncome = familyData.reduce((sum: number, spouse) => {
                if (!spouse.t1Return) return sum;
                const line23600 = getFieldValue(spouse.formFields, '23600'); // Net income
                const line11700 = getFieldValue(spouse.formFields, '11700'); // Taxable capital gains
                const line21300 = getFieldValue(spouse.formFields, '21300'); // UCCB repayment
                const line12800 = getFieldValue(spouse.formFields, '12800'); // Investment income
                
                // AFNI = Net income - Taxable capital gains + UCCB repayment + Investment income
                const spouseAFNI = line23600 - line11700 + line21300 + line12800;
                return sum + spouseAFNI;
              }, 0);
              const clawbackPercentage = calculateCCBClawbackPercentage(adjustedFamilyNetIncome, numUnder6, num6to17);

              // Calculate family benefit information
              const benefitInfo = [
                { name: "Number of children", value: household?.children?.length || 0, format: 'number' },
                { name: "Maximum CCB", value: calculateMaxUCCB(), format: 'currency' },
                { name: "Adjusted Family Net Income", value: adjustedFamilyNetIncome, format: 'currency' },
                { name: "Clawback %", value: clawbackPercentage, format: 'percentage' },
              ];

              // Helper function to format values based on type
              const formatValue = (value: number, format: string) => {
                switch (format) {
                  case 'currency':
                    return formatCurrency(value);
                  case 'percentage':
                    return `${value.toFixed(2)}%`;
                  case 'number':
                  default:
                    return value.toString();
                }
              };

              return (
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-medium text-gray-900 mb-6">
                      Canada Child Benefit
                    </h3>
                    
                    {/* CCB Clawback Chart - Full Width */}
                    {(() => {
                              const baseThreshold = 37487;
                              const additionalThreshold = 81222;
                              const totalChildren = numUnder6 + num6to17;
                              
                              // Calculate income where 100% clawback occurs
                              let baseRate: number, additionalRate: number;
                              if (totalChildren === 1) {
                                baseRate = 0.07;
                                additionalRate = 0.032;
                              } else if (totalChildren === 2) {
                                baseRate = 0.135;
                                additionalRate = 0.057;
                              } else if (totalChildren === 3) {
                                baseRate = 0.19;
                                additionalRate = 0.08;
                              } else {
                                baseRate = 0.23;
                                additionalRate = 0.095;
                              }
                              
                              // Calculate maximum benefit
                              const maxCcbUnder6 = 7787;
                              const maxCcb6to17 = 6570;
                              const totalMaxBenefit = (numUnder6 * maxCcbUnder6) + (num6to17 * maxCcb6to17);
                              
                              // Find income where 100% clawback occurs
                              // First, calculate reduction at additional threshold
                              const reductionAtAdditionalThreshold = (additionalThreshold - baseThreshold) * baseRate;
                              
                              let fullClawbackIncome: number;
                              if (reductionAtAdditionalThreshold >= totalMaxBenefit) {
                                // 100% clawback occurs before additional threshold
                                fullClawbackIncome = baseThreshold + (totalMaxBenefit / baseRate);
                              } else {
                                // 100% clawback occurs after additional threshold
                                const remainingReduction = totalMaxBenefit - reductionAtAdditionalThreshold;
                                fullClawbackIncome = additionalThreshold + (remainingReduction / additionalRate);
                              }
                              
                              // Calculate current position as percentage
                              const chartMin = baseThreshold;
                              const chartMax = fullClawbackIncome;
                              const currentPosition = Math.min(Math.max(adjustedFamilyNetIncome, chartMin), chartMax);
                              const progressPercentage = ((currentPosition - chartMin) / (chartMax - chartMin)) * 100;
                              
                              return (
                                <div className="relative">
                                    {/* Bar background */}
                                    <div className="w-full" style={{ height: '48px' }}>
                                      <div className="w-full h-full bg-gray-200 rounded-lg overflow-hidden relative">
                                        {/* Progress fill */}
                                        <div 
                                          className="h-full transition-all duration-300"
                                          style={{ 
                                            width: `${progressPercentage}%`,
                                            background: 'linear-gradient(to right, #88AA73, #C7E6C2)'
                                          }}
                                        />
                                        {/* Current position indicator */}
                                        {adjustedFamilyNetIncome >= chartMin && adjustedFamilyNetIncome <= chartMax && (
                                          <div 
                                            className="absolute top-0 w-1 bg-black"
                                            style={{ left: `${progressPercentage}%`, height: '48px' }}
                                          />
                                        )}
                                        {/* Clawback percentage overlay */}
                                        <div 
                                          className="absolute inset-0 flex items-center justify-center font-semibold text-lg"
                                          style={{ color: '#111111' }}
                                        >
                                          Clawback: {clawbackPercentage.toFixed(1)}%
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {/* Scale labels */}
                                    <div className="flex justify-between font-medium text-primary mt-2">
                                      <span>Start: {formatCurrency(chartMin)}</span>
                                      <span>Max CCB: {formatCurrency(totalMaxBenefit)}</span>
                                      <span>End: {formatCurrency(chartMax)}</span>
                                    </div>
                                    
                                </div>
                              );
                            })()}
                  </CardContent>
                </Card>
              );
            })()}
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {(() => {
              // Get T1 returns for the specified year for both spouses
              const spouseData = [];
              
              // Primary client
              if (household?.clients?.[0]) {
                const client = household.clients[0];
                const t1Return = client.t1Returns?.find(ret => ret.taxYear === taxYear);
                const formFields = t1Return?.formFields || [];
                spouseData.push({
                  clientName: `${client.firstName} ${client.lastName}`,
                  t1Return,
                  formFields
                });
              }
              
              // Secondary client
              if (household?.clients?.[1]) {
                const client = household.clients[1];
                const t1Return = client.t1Returns?.find(ret => ret.taxYear === taxYear);
                const formFields = t1Return?.formFields || [];
                spouseData.push({
                  clientName: `${client.firstName} ${client.lastName}`,
                  t1Return,
                  formFields
                });
              }

              return spouseData.map((spouse, spouseIndex) => {
                if (!spouse.t1Return) return null;

                // Helper function to get field value
                const getFieldValue = (lineNumber: string) => {
                  const field = spouse.formFields.find(f => f.fieldCode === lineNumber);
                  return field?.fieldValue ? parseFloat(field.fieldValue) : 0;
                };

                // Helper function to format currency
                const formatCurrency = (amount: number) => {
                  return new Intl.NumberFormat('en-CA', {
                    style: 'currency',
                    currency: 'CAD',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  }).format(amount);
                };

                // Define government benefits
                const benefits = [
                  // Canada Workers Benefit
                  { category: "Canada Workers Benefit", items: [
                    { name: "Canada Workers Benefit (Single)", line: "45300" },
                  ]},
                  
                  // Old Age Security
                  { category: "Old Age Security", items: [
                    { name: "Old Age Security", line: "11300" },
                  ]},
                  
                  // Guaranteed Income Supplement
                  { category: "Guaranteed Income Supplement", items: [
                    { name: "Guaranteed Income Supplement", line: "11400" },
                  ]},
                  
                  // Child Disability Benefit
                  { category: "Child Disability Benefit", items: [
                    { name: "Child Disability Benefit", line: "11700" },
                  ]},
                  
                  // GST/HST Credit
                  { category: "GST/HST Credit", items: [
                    { name: "GST/HST Credit", line: "45350" },
                  ]},
                  
                  // Basic Personal Amount
                  { category: "Basic Personal Amount", items: [
                    { name: "Basic Personal Amount", line: "30000" },
                  ]},
                ];

                // Calculate total benefits
                const totalBenefits = benefits.reduce((total, category) => {
                  return total + category.items.reduce((sum, item) => {
                    return sum + getFieldValue(item.line);
                  }, 0);
                }, 0);

                return (
                  <Card key={spouseIndex}>
                    <CardContent className="p-6">
                      <h3 className="font-medium text-gray-900 mb-6">
                        {spouse.clientName} - Clawback Analysis
                      </h3>
                      
                      <div className="space-y-6">
                        {benefits.map((category, categoryIndex) => {
                          const categoryTotal = category.items.reduce((sum, item) => {
                            return sum + getFieldValue(item.line);
                          }, 0);

                          return (
                            <div key={categoryIndex} className="border-b border-gray-100 pb-4 last:border-b-0">
                              <div className="mb-3">
                                <h4 className="font-medium text-primary">{category.category}</h4>
                              </div>
                              
                              <div className="space-y-2">
                                {category.items.map((item, itemIndex) => {
                                  const amount = getFieldValue(item.line);
                                  const hasAmount = amount > 0;
                                  
                                  // Special handling for Canada Workers Benefit clawback calculation
                                  if (item.name === "Canada Workers Benefit (Single)") {
                                    // Determine if client is single or married
                                    const isMarried = household?.clients && household.clients.length === 2;
                                    
                                    // Set phase-out ranges based on marital status
                                    const phaseOutStart = isMarried ? 29833 : 26149;
                                    const phaseOutEnd = isMarried ? 48093 : 36749;
                                    
                                    // Get taxable income (Line 26000)
                                    const taxableIncome = getFieldValue("26000");
                                    
                                    // Calculate clawback percentage
                                    let clawbackPercentage = 0;
                                    if (taxableIncome > phaseOutStart) {
                                      const excessIncome = Math.min(taxableIncome - phaseOutStart, phaseOutEnd - phaseOutStart);
                                      const totalPhaseOutRange = phaseOutEnd - phaseOutStart;
                                      clawbackPercentage = (excessIncome / totalPhaseOutRange) * 100;
                                    }
                                    
                                    const progressPercentage = Math.min(clawbackPercentage, 100);
                                    
                                    return (
                                      <div key={itemIndex} className="flex items-start justify-between">
                                        <div className="flex items-center space-x-2 flex-shrink-0">
                                          {hasAmount ? (
                                            <span style={{ color: '#D4B26A' }}>⚠</span>
                                          ) : (
                                            <span style={{ color: '#88AA73' }}>✓</span>
                                          )}
                                          <div>
                                            <span className="font-medium">{item.name} (Line {item.line})</span>
                                          </div>
                                        </div>
                                        
                                        {/* CWB Clawback Bar Chart */}
                                        <div className="w-2/3 ml-4">
                                          <div className="relative">
                                            <div className="w-full" style={{ height: '32px' }}>
                                              <div className="w-full h-full bg-gray-200 rounded-lg overflow-hidden relative">
                                                {/* Progress fill */}
                                                <div 
                                                  className="h-full transition-all duration-300"
                                                  style={{ 
                                                    width: `${progressPercentage}%`,
                                                    background: 'linear-gradient(to right, #88AA73, #C7E6C2)'
                                                  }}
                                                />
                                                {/* Clawback percentage overlay */}
                                                <div 
                                                  className="absolute inset-0 flex items-center justify-center font-medium text-sm"
                                                  style={{ color: '#111111' }}
                                                >
                                                  Clawback: {clawbackPercentage.toFixed(1)}%
                                                </div>
                                              </div>
                                            </div>
                                            
                                            {/* Scale labels */}
                                            <div className="flex justify-between font-medium text-primary mt-1 text-xs">
                                              <span>Start: {formatCurrency(phaseOutStart)}</span>
                                              <span>Max: $1,590</span>
                                              <span>End: {formatCurrency(phaseOutEnd)}</span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  }
                                  
                                  // Default bar chart for other benefits
                                  return (
                                    <div key={itemIndex} className="flex items-start justify-between">
                                      <div className="flex items-center space-x-2 flex-shrink-0">
                                        {hasAmount ? (
                                          <span style={{ color: '#D4B26A' }}>⚠</span>
                                        ) : (
                                          <span style={{ color: '#88AA73' }}>✓</span>
                                        )}
                                        <div>
                                          <span className="font-medium">{item.name} (Line {item.line})</span>
                                        </div>
                                      </div>
                                      
                                      {/* Bar chart for each benefit */}
                                      <div className="w-2/3 ml-4">
                                        <div className="relative">
                                          <div className="w-full" style={{ height: '32px' }}>
                                            <div className="w-full h-full bg-gray-200 rounded-lg overflow-hidden relative">
                                              {/* Progress fill */}
                                              <div 
                                                className="h-full transition-all duration-300"
                                                style={{ 
                                                  width: hasAmount ? '100%' : '0%',
                                                  background: hasAmount ? 'linear-gradient(to right, #D4B26A, #F4E4B8)' : '#88AA73'
                                                }}
                                              />
                                              {/* Status overlay */}
                                              <div 
                                                className="absolute inset-0 flex items-center justify-center font-medium text-sm"
                                                style={{ color: '#111111' }}
                                              >
                                                {hasAmount ? `Received: ${formatCurrency(amount)}` : 'Not Received'}
                                              </div>
                                            </div>
                                          </div>
                                          
                                          {/* Scale labels */}
                                          <div className="flex justify-between font-medium text-primary mt-1 text-xs">
                                            <span>$0</span>
                                            <span>{hasAmount ? formatCurrency(amount) : 'N/A'}</span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}

                      </div>
                    </CardContent>
                  </Card>
                );
              });
            })()}
          </div>
        </div>

      </div>
    </Layout>
  );
}