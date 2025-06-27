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
                        <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
                          <div className="text-lg font-medium text-green-600 mb-2">
                            You Kept
                          </div>
                          <div className="text-4xl font-bold text-green-700">
                            {netIncomePercentage.toFixed(2)}%
                          </div>
                        </div>
                        
                        {/* You Paid Block */}
                        <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
                          <div className="text-lg font-medium text-red-600 mb-2">
                            You Paid
                          </div>
                          <div className="text-4xl font-bold text-red-700">
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
                          federalTax = federalTaxField?.fieldValue ? parseFloat(String(federalTaxField.fieldValue).replace(/[,$\s]/g, '')) : 0;
                          provincialTax = provincialTaxField?.fieldValue ? parseFloat(String(provincialTaxField.fieldValue).replace(/[,$\s]/g, '')) : 0;
                          cppContributions = cppField?.fieldValue ? parseFloat(String(cppField.fieldValue).replace(/[,$\s]/g, '')) : 0;
                          eiPremiums = eiField?.fieldValue ? parseFloat(String(eiField.fieldValue).replace(/[,$\s]/g, '')) : 0;
                        }
                        
                        const totalDeductions = totalIncome - totalTaxableIncome;
                        // Use the same calculation method as Summary tab: Total Income - Total Tax (field 43700)
                        const netIncome = totalIncome - taxPaid;
                        
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
                        // Calculate individual net income percentage for KPI blocks - same as Summary tab
                        let totalIncome = 0;
                        let taxPaid = 0;
                        
                        if (t1WithFields.formFields && Array.isArray(t1WithFields.formFields)) {
                          const incomeField = t1WithFields.formFields.find((field: any) => field.fieldCode === '15000');
                          const taxPaidField = t1WithFields.formFields.find((field: any) => field.fieldCode === '43700');
                          
                          totalIncome = incomeField?.fieldValue ? parseFloat(String(incomeField.fieldValue).replace(/[,$\s]/g, '')) : 0;
                          taxPaid = taxPaidField?.fieldValue ? parseFloat(String(taxPaidField.fieldValue).replace(/[,$\s]/g, '')) : 0;
                        }
                        
                        // Use same calculation as Summary tab: Net Income = Total Income - Total Tax (field 43700)
                        const netIncome = totalIncome - taxPaid;
                        const netIncomePercentage = totalIncome > 0 ? (netIncome / totalIncome) * 100 : 0;
                        const youPaidPercentage = 100 - netIncomePercentage;
                        
                        return (
                          <>
                            {/* You Kept Block */}
                            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                              <div className="text-base font-medium text-green-600 mb-2">
                                You Kept
                              </div>
                              <div className="text-3xl font-bold text-green-700">
                                {netIncomePercentage.toFixed(2)}%
                              </div>
                            </div>
                            
                            {/* You Paid Block */}
                            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                              <div className="text-base font-medium text-red-600 mb-2">
                                You Paid
                              </div>
                              <div className="text-3xl font-bold text-red-700">
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
              { rate: 20.05, min: 0, max: 49231, label: "20.05%" },
              { rate: 24.15, min: 49231, max: 55867, label: "24.15%" },
              { rate: 31.48, min: 55867, max: 98463, label: "31.48%" },
              { rate: 33.89, min: 98463, max: 111733, label: "33.89%" },
              { rate: 37.91, min: 111733, max: 150000, label: "37.91%" },
              { rate: 43.41, min: 150000, max: 173205, label: "43.41%" },
              { rate: 46.16, min: 173205, max: 220000, label: "46.16%" },
              { rate: 47.74, min: 220000, max: 246752, label: "47.74%" },
              { rate: 53.53, min: 246752, max: Infinity, label: "53.53%" }
            ];

            // Function to calculate individual tax breakdown for a spouse
            const calculateSpouseTaxBreakdown = (spouseIncome: number) => {
              return combinedBrackets.map(bracket => {
                let incomeInBracket = 0;
                let taxFromBracket = 0;

                if (spouseIncome > bracket.min) {
                  const maxForBracket = Math.min(spouseIncome, bracket.max);
                  incomeInBracket = maxForBracket - bracket.min;
                  taxFromBracket = incomeInBracket * (bracket.rate / 100);
                }

                return {
                  rate: bracket.label,
                  threshold: `$${bracket.min.toLocaleString()} to ${bracket.max === Infinity ? 'above' : '$' + bracket.max.toLocaleString()}`,
                  incomeInBracket: incomeInBracket,
                  tax: taxFromBracket,
                  ratePercent: bracket.rate
                };
              });
            };

            return (
              <div className="space-y-6">
                {/* Tax Bracket Tables */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {spouseData.map((spouse, spouseIndex) => {
                    const bracketBreakdown = calculateSpouseTaxBreakdown(spouse.taxableIncome);
                    const totalTax = bracketBreakdown.reduce((sum, bracket) => sum + bracket.tax, 0);

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
                                  {bracketBreakdown.map((bracket, index) => (
                                    <tr key={index} className={`border-b ${bracket.incomeInBracket > 0 ? 'bg-accent/20' : ''}`}>
                                      <td className="py-2 px-2 font-medium text-primary">{bracket.rate}</td>
                                      <td className="py-2 px-2 text-gray-700 text-xs">{bracket.threshold}</td>
                                      <td className="py-2 px-2 text-right text-gray-700 text-xs">
                                        ${bracket.incomeInBracket.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                      </td>
                                      <td className="py-2 px-2 text-right text-gray-700 text-xs">
                                        ${bracket.tax.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                      </td>
                                    </tr>
                                  ))}
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
                                {/* Income scale labels on left (vertical axis) - only key thresholds */}
                                <div className="w-16 h-80 relative flex flex-col mr-4 text-xs text-gray-700 font-medium">
                                  {/* $300k at top */}
                                  <div className="absolute top-0 right-0 text-right">$300k</div>
                                  
                                  {/* Tax bracket thresholds with spacing adjustments */}
                                  {(() => {
                                    const combinedBrackets = [
                                      { rate: 20.05, min: 0, max: 49231, label: "20.05%" },
                                      { rate: 24.15, min: 49231, max: 55867, label: "24.15%" },
                                      { rate: 31.48, min: 55867, max: 98463, label: "31.48%" },
                                      { rate: 33.89, min: 98463, max: 111733, label: "33.89%" },
                                      { rate: 37.91, min: 111733, max: 150000, label: "37.91%" },
                                      { rate: 43.41, min: 150000, max: 173205, label: "43.41%" },
                                      { rate: 44.97, min: 173205, max: 220000, label: "44.97%" },
                                      { rate: 46.16, min: 220000, max: 246752, label: "46.16%" },
                                      { rate: 53.53, min: 246752, max: 300000, label: "53.53%" }
                                    ];
                                    const maxScale = 300000;
                                    
                                    const thresholds = combinedBrackets
                                      .filter(bracket => bracket.min > 0 && bracket.min < maxScale)
                                      .map(bracket => ({
                                        value: bracket.min,
                                        position: (bracket.min / maxScale) * 100,
                                        label: `$${Math.round(bracket.min / 1000)}k`
                                      }))
                                      .sort((a, b) => a.value - b.value);

                                    // Adjust positions to prevent overlap (minimum 8% spacing)
                                    for (let i = 1; i < thresholds.length; i++) {
                                      const current = thresholds[i];
                                      const previous = thresholds[i - 1];
                                      const minSpacing = 8; // 8% minimum spacing
                                      
                                      if (current.position - previous.position < minSpacing) {
                                        current.position = previous.position + minSpacing;
                                      }
                                    }

                                    return thresholds.map((threshold, idx) => (
                                      <div 
                                        key={idx}
                                        className="absolute right-0 text-right"
                                        style={{
                                          bottom: `${Math.min(threshold.position, 90)}%`, // Cap at 90% to avoid overlapping with $300k
                                          transform: 'translateY(50%)'
                                        }}
                                      >
                                        {threshold.label}
                                      </div>
                                    ));
                                  })()}
                                  
                                  {/* $0 at bottom */}
                                  <div className="absolute bottom-0 right-0 text-right">$0</div>
                                </div>
                                
                                {/* Four Income Type Bars */}
                                <div className="flex space-x-3">
                                  {(() => {
                                    // Province-specific tax rates
                                    const taxRatesByProvince = {
                                      'ON': {
                                        ordinary: [
                                          { rate: 20.05, min: 0, max: 49231, label: "20.05%" },
                                          { rate: 24.15, min: 49231, max: 55867, label: "24.15%" },
                                          { rate: 31.48, min: 55867, max: 98463, label: "31.48%" },
                                          { rate: 33.89, min: 98463, max: 111733, label: "33.89%" },
                                          { rate: 37.91, min: 111733, max: 150000, label: "37.91%" },
                                          { rate: 43.41, min: 150000, max: 173205, label: "43.41%" },
                                          { rate: 44.97, min: 173205, max: 220000, label: "44.97%" },
                                          { rate: 46.16, min: 220000, max: 246752, label: "46.16%" },
                                          { rate: 53.53, min: 246752, max: 300000, label: "53.53%" }
                                        ],
                                        capitalGains: [
                                          { rate: 10.03, min: 0, max: 49231, label: "10.03%" },
                                          { rate: 12.08, min: 49231, max: 55867, label: "12.08%" },
                                          { rate: 15.74, min: 55867, max: 98463, label: "15.74%" },
                                          { rate: 16.95, min: 98463, max: 111733, label: "16.95%" },
                                          { rate: 18.95, min: 111733, max: 150000, label: "18.95%" },
                                          { rate: 21.70, min: 150000, max: 173205, label: "21.70%" },
                                          { rate: 22.49, min: 173205, max: 220000, label: "22.49%" },
                                          { rate: 23.08, min: 220000, max: 246752, label: "23.08%" },
                                          { rate: 26.76, min: 246752, max: 300000, label: "26.76%" }
                                        ],
                                        eligibleDividends: [
                                          { rate: -6.86, min: 0, max: 49231, label: "-6.86%" },
                                          { rate: 1.20, min: 49231, max: 55867, label: "1.20%" },
                                          { rate: 6.39, min: 55867, max: 98463, label: "6.39%" },
                                          { rate: 8.92, min: 98463, max: 111733, label: "8.92%" },
                                          { rate: 17.79, min: 111733, max: 150000, label: "17.79%" },
                                          { rate: 25.38, min: 150000, max: 173205, label: "25.38%" },
                                          { rate: 27.53, min: 173205, max: 220000, label: "27.53%" },
                                          { rate: 32.11, min: 220000, max: 246752, label: "32.11%" },
                                          { rate: 34.24, min: 246752, max: 300000, label: "34.24%" }
                                        ],
                                        nonEligibleDividends: [
                                          { rate: 9.24, min: 0, max: 49231, label: "9.24%" },
                                          { rate: 13.93, min: 49231, max: 55867, label: "13.93%" },
                                          { rate: 20.28, min: 55867, max: 98463, label: "20.28%" },
                                          { rate: 22.38, min: 98463, max: 111733, label: "22.38%" },
                                          { rate: 25.16, min: 111733, max: 150000, label: "25.16%" },
                                          { rate: 36.10, min: 150000, max: 173205, label: "36.10%" },
                                          { rate: 37.90, min: 173205, max: 220000, label: "37.90%" },
                                          { rate: 41.72, min: 220000, max: 246752, label: "41.72%" },
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
                                          { rate: 31.00, min: 95875, max: 110076, label: "31.00%" },
                                          { rate: 32.79, min: 110076, max: 111733, label: "32.79%" },
                                          { rate: 38.29, min: 111733, max: 133664, label: "38.29%" },
                                          { rate: 40.70, min: 133664, max: 173205, label: "40.70%" },
                                          { rate: 44.02, min: 173205, max: 181232, label: "44.02%" },
                                          { rate: 47.04, min: 181232, max: 246752, label: "47.04%" },
                                          { rate: 49.80, min: 246752, max: 252752, label: "49.80%" },
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
                      return federalBrackets.map(bracket => {
                        let incomeInBracket = 0;
                        let taxFromBracket = 0;
                        
                        if (income > bracket.min) {
                          const maxForBracket = Math.min(income, bracket.max);
                          incomeInBracket = maxForBracket - bracket.min;
                          taxFromBracket = incomeInBracket * (bracket.rate / 100);
                        }

                        return {
                          rate: bracket.label,
                          threshold: `$${bracket.min.toLocaleString()} to ${bracket.max === Infinity ? 'above' : '$' + bracket.max.toLocaleString()}`,
                          incomeInBracket: incomeInBracket,
                          tax: taxFromBracket,
                          ratePercent: bracket.rate
                        };
                      });
                    };

                    const federalBracketBreakdown = calculateFederalTaxBreakdown(spouse.taxableIncome);
                    const totalFederalTax = federalBracketBreakdown.reduce((sum, bracket) => sum + bracket.tax, 0);

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
                                  {federalBracketBreakdown.map((bracket, index) => (
                                    <tr key={index} className={`border-b ${bracket.incomeInBracket > 0 ? 'bg-accent/20' : ''}`}>
                                      <td className="py-2 px-2 font-medium text-primary">{bracket.rate}</td>
                                      <td className="py-2 px-2 text-gray-700 text-xs">{bracket.threshold}</td>
                                      <td className="py-2 px-2 text-right text-gray-700 text-xs">
                                        ${bracket.incomeInBracket.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                      </td>
                                      <td className="py-2 px-2 text-right text-gray-700 text-xs">
                                        ${bracket.tax.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                      </td>
                                    </tr>
                                  ))}
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
                                  <div className="w-16 h-80 relative flex flex-col mr-4 text-xs text-gray-700 font-medium">
                                    {/* $300k at top */}
                                    <div className="absolute top-0 right-0 text-right">$300k</div>
                                    
                                    {/* Federal tax bracket thresholds */}
                                    {(() => {
                                      const federalThresholds = [
                                        { income: 55867, label: "$56k" },
                                        { income: 111733, label: "$112k" },
                                        { income: 173205, label: "$173k" },
                                        { income: 246752, label: "$247k" }
                                      ];

                                      const thresholds = federalThresholds.map(threshold => ({
                                        position: (threshold.income / 300000) * 100,
                                        label: threshold.label
                                      }));

                                      return thresholds.map((threshold, idx) => (
                                        <div 
                                          key={idx}
                                          className="absolute right-0 text-right"
                                          style={{
                                            bottom: `${Math.min(threshold.position, 90)}%`,
                                            transform: 'translateY(50%)'
                                          }}
                                        >
                                          {threshold.label}
                                        </div>
                                      ));
                                    })()}
                                    
                                    {/* $0 at bottom */}
                                    <div className="absolute bottom-0 right-0 text-right">$0</div>
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

                {/* Provincial Tax Bracket Analysis */}
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
                            <div className="space-y-4">
                              <h3 className="font-medium text-primary">
                                {spouse.clientName} - Provincial Tax Bracket Analysis
                              </h3>
                              
                              <div className="bg-gray-50 rounded-lg p-4">
                                <div className="flex justify-between items-center mb-3">
                                  <span className="text-sm font-medium text-gray-700">Income Range</span>
                                  <span className="text-sm font-medium text-gray-700">Rate</span>
                                  <span className="text-sm font-medium text-gray-700">Tax</span>
                                </div>
                                
                                <div className="space-y-1">
                                  {ontarioTaxBrackets.map((bracket, idx) => {
                                    const isCurrentBracket = spouse.taxableIncome > bracket.min && 
                                      (spouse.taxableIncome <= bracket.max || (spouse.taxableIncome > 220000 && bracket.min === 220000));
                                    
                                    // Calculate tax for this bracket
                                    const taxableInThisBracket = Math.min(
                                      Math.max(0, spouse.taxableIncome - bracket.min),
                                      bracket.max - bracket.min
                                    );
                                    const taxInThisBracket = taxableInThisBracket * (bracket.rate / 100);
                                    
                                    return (
                                      <div 
                                        key={idx} 
                                        className={`flex justify-between items-center py-1 px-2 rounded text-xs ${
                                          isCurrentBracket ? 'bg-accent/20 border border-accent text-gray-700' : 'text-gray-700'
                                        }`}
                                      >
                                        <div className="flex-1">
                                          {idx === 0 
                                            ? `$0 - $${(bracket.max / 1000).toFixed(0)}k`
                                            : idx === ontarioTaxBrackets.length - 1
                                              ? `$${(bracket.min / 1000).toFixed(0)}k+`
                                              : `$${(bracket.min / 1000).toFixed(0)}k - $${(bracket.max / 1000).toFixed(0)}k`
                                          }
                                        </div>
                                        <div className="flex-1 text-center font-medium">
                                          {bracket.label}
                                        </div>
                                        <div className="flex-1 text-right">
                                          ${taxInThisBracket.toLocaleString('en-CA', { 
                                            minimumFractionDigits: 0, 
                                            maximumFractionDigits: 0 
                                          })}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                                
                                <div className="mt-3 pt-3 border-t border-gray-300">
                                  <div className="flex justify-between items-center text-sm font-semibold text-primary">
                                    <span>Provincial marginal tax rate for {spouse.clientName}</span>
                                    <span>{currentBracket.rate.toFixed(2)}%</span>
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

                {/* Provincial Tax Bracket Visualizations */}
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
                                  <div className="w-16 h-80 relative flex flex-col mr-4 text-xs text-gray-700 font-medium">
                                    {/* $300k at top */}
                                    <div className="absolute top-0 right-0 text-right">$300k</div>
                                    
                                    {/* Provincial tax bracket thresholds */}
                                    {(() => {
                                      const provincialThresholds = [
                                        { income: 51446, label: "$51k" },
                                        { income: 102894, label: "$103k" },
                                        { income: 150000, label: "$150k" },
                                        { income: 220000, label: "$220k" }
                                      ];

                                      const thresholds = provincialThresholds.map(threshold => ({
                                        position: (threshold.income / 300000) * 100,
                                        label: threshold.label
                                      }));

                                      return thresholds.map((threshold, idx) => (
                                        <div 
                                          key={idx}
                                          className="absolute right-0 text-right"
                                          style={{
                                            bottom: `${Math.min(threshold.position, 90)}%`,
                                            transform: 'translateY(50%)'
                                          }}
                                        >
                                          {threshold.label}
                                        </div>
                                      ));
                                    })()}
                                    
                                    {/* $0 at bottom */}
                                    <div className="absolute bottom-0 right-0 text-right">$0</div>
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
                                                
                                                // For high earners (>$220k), highlight the top bracket
                                                const isCurrentBracket = currentIncome > bracket.min && 
                                                  (currentIncome <= bracket.max || (currentIncome > 220000 && bracket.min === 220000));
                                                
                                                const bracketTop = Math.min(bracket.max, maxScale);
                                                const bracketHeight = bracketTop - bracket.min;
                                                const heightPercent = (bracketHeight / maxScale) * 100;
                                                const bottomPercent = (bracket.min / maxScale) * 100;
                                                
                                                // Color coding using brand colors - negative rates use accent, positive use primary
                                                let bgColor = bracket.rate < 0 ? 'bg-accent' : 'bg-primary';
                                                
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
                                                  bottom: `${currentIncome > 220000 ? '100%' : Math.min(currentIncome / maxScale, 1) * 100 + '%'}`,
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
            );
          })()}
        </div>



      </div>
    </Layout>
  );
}