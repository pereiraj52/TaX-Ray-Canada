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
                      return `${((amount / totalIncomeSum) * 100).toFixed(1)}%`;
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
                                    
                                    const income = incomeField?.fieldValue ? parseFloat(String(incomeField.fieldValue).replace(/[,$\s]/g, '')) : 0;
                                    const tax = taxField?.fieldValue ? parseFloat(String(taxField.fieldValue).replace(/[,$\s]/g, '')) : 0;
                                    
                                    if (!isNaN(income) && !isNaN(tax)) {
                                      totalNetIncome += (income - tax);
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
                                    
                                    const income = incomeField?.fieldValue ? parseFloat(String(incomeField.fieldValue).replace(/[,$\s]/g, '')) : 0;
                                    const tax = taxField?.fieldValue ? parseFloat(String(taxField.fieldValue).replace(/[,$\s]/g, '')) : 0;
                                    
                                    if (!isNaN(income) && !isNaN(tax)) {
                                      totalNetIncome += (income - tax);
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
                
                // Calculate net income using the same method as household financial summary
                let householdNetIncome = 0;
                taxYearReturns.forEach(t1Return => {
                  const t1WithFields = t1Return as any;
                  if (t1WithFields.formFields && Array.isArray(t1WithFields.formFields)) {
                    const incomeField = t1WithFields.formFields.find((field: any) => field.fieldCode === '15000');
                    const taxField = t1WithFields.formFields.find((field: any) => field.fieldCode === '43500');
                    
                    const income = incomeField?.fieldValue ? parseFloat(String(incomeField.fieldValue).replace(/[,$\s]/g, '')) : 0;
                    const tax = taxField?.fieldValue ? parseFloat(String(taxField.fieldValue).replace(/[,$\s]/g, '')) : 0;
                    
                    if (!isNaN(income) && !isNaN(tax)) {
                      householdNetIncome += (income - tax);
                    }
                  }
                });
                

                
                const pieData = [
                  {
                    name: 'Net Income',
                    value: householdNetIncome,
                    color: '#22c55e'
                  },
                  {
                    name: 'Federal Tax',
                    value: federalTaxSum,
                    color: '#dc2626'
                  },
                  {
                    name: 'Provincial Tax',
                    value: provincialTaxSum,
                    color: '#ef4444'
                  },
                  {
                    name: 'CPP Contributions',
                    value: totalCppSum,
                    color: '#3b82f6'
                  },
                  {
                    name: 'EI Premiums',
                    value: totalEiSum,
                    color: '#f59e0b'
                  }
                ].filter(item => item.value > 0);

                const CustomTooltip = ({ active, payload }: any) => {
                  if (active && payload && payload.length) {
                    const data = payload[0];
                    const percentage = ((data.value / totalIncomeSum) * 100).toFixed(1);
                    return (
                      <div className="bg-white p-3 border rounded shadow-lg">
                        <p className="font-medium">{data.name}</p>
                        <p className="text-sm text-gray-600">
                          ${data.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <p className="text-sm text-gray-600">{percentage}% of total income</p>
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
                              const percentage = ((value / totalIncomeSum) * 100).toFixed(1);
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
                          <Tooltip />
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
          
          {(() => {
            // Get individual taxable incomes for each spouse to match charts with tables
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

            return (
              <div className="space-y-12">
                {/* Connected Individual Analysis */}
                {spouseData.map((spouse, spouseIndex) => {
                  const t1WithFields = spouse.t1Return as any;
                  
                  // Calculate individual components for pie chart
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
                  
                  // Calculate net income using same method as household summary
                  const totalTaxField = t1WithFields.formFields?.find((field: any) => field.fieldCode === '43500');
                  const totalTax = totalTaxField?.fieldValue ? parseFloat(String(totalTaxField.fieldValue).replace(/[,$\s]/g, '')) : 0;
                  const netIncome = totalIncome - totalTax;
                  
                  const individualPieData = [
                    {
                      name: 'Net Income',
                      value: netIncome,
                      color: '#22c55e'
                    },
                    {
                      name: 'Federal Tax',
                      value: federalTax,
                      color: '#3b82f6'
                    },
                    {
                      name: 'Provincial Tax',
                      value: provincialTax,
                      color: '#8b5cf6'
                    },
                    {
                      name: 'CPP Contributions',
                      value: cppContributions,
                      color: '#f59e0b'
                    },
                    {
                      name: 'EI Premiums',
                      value: eiPremiums,
                      color: '#ef4444'
                    }
                  ].filter(item => item.value > 0);

                  return (
                    <div key={spouse.t1Return.id} className="relative">
                      {/* Left border connection line */}
                      <div className="absolute -left-6 top-0 bottom-0 w-1 bg-gradient-to-b from-primary via-primary to-primary opacity-60"></div>
                      <div className="absolute -left-8 top-8 w-4 h-4 bg-primary rounded-full border-4 border-white shadow-lg"></div>
                      
                      {/* Individual Analysis Container */}
                      <div className="pl-6">
                        {/* Top Card - Income Breakdown Pie Chart */}
                        <Card className="mb-6 shadow-lg border-2 border-primary/20">
                          <CardContent className="p-6">
                            <div className="flex items-center gap-3 mb-4">
                              <div className="w-3 h-3 bg-primary rounded-full"></div>
                              <h3 className="font-medium text-gray-900 text-lg">{spouse.clientName} - Income Breakdown</h3>
                            </div>
                            
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                              {/* Pie Chart */}
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
                                      label={false}
                                    >
                                      {individualPieData.map((entry, pieIndex) => (
                                        <Cell key={`cell-${pieIndex}`} fill={entry.color} />
                                      ))}
                                    </Pie>
                                    <Tooltip />
                                  </PieChart>
                                </ResponsiveContainer>
                              </div>
                              
                              {/* Custom Legend */}
                              <div className="space-y-3">
                                {individualPieData.map((entry, legendIndex) => (
                                  <div key={legendIndex} className="flex items-center gap-3">
                                    <div 
                                      className="w-4 h-4 rounded-full"
                                      style={{ backgroundColor: entry.color }}
                                    />
                                    <span className="text-sm font-medium">
                                      {entry.name}: ${entry.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        
                        {/* Connecting Arrow */}
                        <div className="flex justify-center mb-6">
                          <div className="flex flex-col items-center">
                            <div className="w-0.5 h-8 bg-primary"></div>
                            <div className="w-4 h-4 bg-primary transform rotate-45 border-t-2 border-r-2 border-primary rounded-tr-sm"></div>
                          </div>
                        </div>
                        
                        {/* Bottom Card - Tax Analysis Table */}
                        <Card className="shadow-lg border-2 border-primary/20">
                          <CardContent className="p-6" id={`tax-analysis-${spouseIndex}`}>
                            <div className="flex items-center gap-3 mb-4">
                              <div className="w-3 h-3 bg-primary rounded-full"></div>
                              <h3 className="font-medium text-gray-900 text-lg">{spouse.clientName} - Tax Bracket Analysis</h3>
                            </div>
                            <p className="text-sm text-gray-600 mb-4">
                              Taxable Income: ${spouse.taxableIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                            
                            {/* Tax Analysis Logic */}
                            {(() => {
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
                                { rate: 44.97, min: 173205, max: 220000, label: "44.97%" },
                                { rate: 46.16, min: 220000, max: 246752, label: "46.16%" },
                                { rate: 53.53, min: 246752, max: 300000, label: "53.53%" }
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
                                    threshold: `$${bracket.min.toLocaleString()} to ${bracket.max === 300000 ? '$300k+' : '$' + bracket.max.toLocaleString()}`,
                                    incomeInBracket: incomeInBracket,
                                    tax: taxFromBracket
                                  };
                                });
                              };

                              const bracketBreakdown = calculateSpouseTaxBreakdown(spouse.taxableIncome);
                              const totalTax = bracketBreakdown.reduce((sum, bracket) => sum + bracket.tax, 0);

                              return (
                                <div>
                                  {/* Individual Tax Bracket Table */}
                                  <div className="overflow-x-auto mb-6">
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
                                          <tr key={index} className={`border-b ${bracket.incomeInBracket > 0 ? 'bg-green-50' : ''}`}>
                                            <td className="py-2 px-2 font-medium text-primary">{bracket.rate}</td>
                                            <td className="py-2 px-2 text-gray-700 text-xs">{bracket.threshold}</td>
                                            <td className="py-2 px-2 text-right font-mono text-xs">
                                              ${bracket.incomeInBracket.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                            </td>
                                            <td className="py-2 px-2 text-right font-mono text-xs">
                                              ${bracket.tax.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                            </td>
                                          </tr>
                                        ))}
                                        <tr className="border-b-2 border-gray-800 font-semibold bg-gray-100">
                                          <td className="py-2 px-2">Total</td>
                                          <td className="py-2 px-2"></td>
                                          <td className="py-2 px-2 text-right font-mono text-xs">
                                            ${spouse.taxableIncome.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                          </td>
                                          <td className="py-2 px-2 text-right font-mono text-xs">
                                            ${totalTax.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>

                                  {/* Marginal Rate Display and Visualization */}
                                  <div className="mt-6">
                                    <div className="text-right mb-4">
                                      <div className="text-3xl font-bold text-primary">
                                        {(() => {
                                          // Find current marginal rate bracket for this spouse
                                          let currentBracket = combinedBrackets[0];
                                          for (let i = combinedBrackets.length - 1; i >= 0; i--) {
                                            if (spouse.taxableIncome > combinedBrackets[i].min) {
                                              currentBracket = combinedBrackets[i];
                                              break;
                                            }
                                          }
                                          return currentBracket.label;
                                        })()}
                                      </div>
                                      <div className="text-sm text-gray-600">
                                        Combined Marginal Tax Rate
                                      </div>
                                    </div>

                                    {/* Vertical Tax Bracket Visualization */}
                                    <div className="relative">
                                      <div className="flex items-start justify-center">
                                        {/* Income scale labels on left (vertical axis) */}
                                        <div className="w-16 h-80 relative flex flex-col mr-4 text-xs text-gray-700 font-medium">
                                          {/* $300k at top */}
                                          <div className="absolute top-0 right-0 text-right">$300k</div>
                                          
                                          {/* Tax bracket thresholds */}
                                          {(() => {
                                            const maxScale = 300000;
                                            const chartHeight = 320; // 80 * 4 (h-80)
                                            
                                            return combinedBrackets.map((bracket, index) => {
                                              if (bracket.min === 0) return null; // Skip $0
                                              
                                              const position = ((maxScale - bracket.min) / maxScale) * chartHeight;
                                              const isAbove247k = bracket.min > 246752;
                                              
                                              return (
                                                <div
                                                  key={index}
                                                  className="absolute right-0 text-right text-xs"
                                                  style={{ top: `${position}px` }}
                                                >
                                                  ${bracket.min >= 1000 ? (bracket.min / 1000).toFixed(0) + 'k' : bracket.min}
                                                </div>
                                              );
                                            });
                                          })()}
                                          
                                          {/* $0 at bottom */}
                                          <div className="absolute bottom-0 right-0 text-right">$0</div>
                                        </div>

                                        {/* Main vertical bar */}
                                        <div className="relative">
                                          <div className="w-12 h-80 bg-gradient-to-t from-green-200 via-yellow-300 via-yellow-400 via-orange-400 via-red-400 to-red-600 rounded-lg shadow-lg">
                                            {/* Income position indicator */}
                                            {(() => {
                                              const maxScale = 300000;
                                              const chartHeight = 320; // 80 * 4
                                              const incomePosition = spouse.taxableIncome > maxScale 
                                                ? 0 
                                                : ((maxScale - spouse.taxableIncome) / maxScale) * chartHeight;
                                              
                                              return (
                                                <div
                                                  className="absolute -right-2 w-4 h-1 bg-black rounded"
                                                  style={{ top: `${incomePosition}px` }}
                                                  title={`Income: $${spouse.taxableIncome.toLocaleString()}`}
                                                />
                                              );
                                            })()}
                                          </div>
                                          
                                          {/* Tax rate labels on right */}
                                          <div className="absolute -right-16 top-0 h-80 flex flex-col justify-between text-xs font-medium text-gray-700">
                                            <div>53.53%</div>
                                            <div className="text-center">Higher<br/>Rates</div>
                                            <div className="text-center">Middle<br/>Rates</div>
                                            <div className="text-center">Lower<br/>Rates</div>
                                            <div>20.05%</div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>

      </div>
    </Layout>
  );
}
