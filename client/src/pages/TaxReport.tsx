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
                    
                    taxYearReturns.forEach(t1Return => {
                      const t1WithFields = t1Return as any;
                      if (t1WithFields.formFields && Array.isArray(t1WithFields.formFields)) {
                        const incomeField = t1WithFields.formFields.find((field: any) => field.fieldCode === '15000');
                        const taxableField = t1WithFields.formFields.find((field: any) => field.fieldCode === '26000');
                        const taxField = t1WithFields.formFields.find((field: any) => field.fieldCode === '42000');
                        
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
                          <span className="text-gray-600">Total Income:</span>
                          <div className="text-right">
                            <span className="font-medium text-primary">
                              ${totalIncomeSum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-sm text-gray-500">(100.0%)</span>
                            </span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Total Deductions:</span>
                          <div className="text-right">
                            <span className="font-medium text-primary">
                              ${totalDeductionsSum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-sm text-gray-500">({calculatePercentage(totalDeductionsSum)})</span>
                            </span>
                          </div>
                        </div>
                      </>
                    );
                  })()}
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
                        let totalIncome = 0;
                        let totalTax = 0;
                        taxYearReturns.forEach(t1Return => {
                          const t1WithFields = t1Return as any;
                          if (t1WithFields.formFields && Array.isArray(t1WithFields.formFields)) {
                            const incomeField = t1WithFields.formFields.find((field: any) => 
                              field.fieldCode === '15000'
                            );
                            const taxField = t1WithFields.formFields.find((field: any) => 
                              field.fieldCode === '43500'
                            );
                            if (incomeField?.fieldValue) {
                              const value = parseFloat(String(incomeField.fieldValue).replace(/[,$\s]/g, ''));
                              if (!isNaN(value)) totalIncome += value;
                            }
                            if (taxField?.fieldValue) {
                              const value = parseFloat(String(taxField.fieldValue).replace(/[,$\s]/g, ''));
                              if (!isNaN(value)) totalTax += value;
                            }
                          }
                        });
                        const netIncome = totalIncome - totalTax;
                        return netIncome.toLocaleString('en-US', {
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


          </div>
        </div>

        {/* Income Breakdown Pie Chart */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Income Breakdown</h2>
          <Card>
            <CardContent className="p-6">
              {(() => {
                // Calculate all the components
                let totalIncomeSum = 0;
                let totalTaxSum = 0;
                let totalCppSum = 0;
                let totalEiSum = 0;
                
                taxYearReturns.forEach(t1Return => {
                  const t1WithFields = t1Return as any;
                  if (t1WithFields.formFields && Array.isArray(t1WithFields.formFields)) {
                    const incomeField = t1WithFields.formFields.find((field: any) => field.fieldCode === '15000');
                    const taxField = t1WithFields.formFields.find((field: any) => field.fieldCode === '42000');
                    const cppField = t1WithFields.formFields.find((field: any) => field.fieldCode === '30800');
                    const eiField = t1WithFields.formFields.find((field: any) => field.fieldCode === '31200');
                    
                    if (incomeField?.fieldValue) {
                      const value = parseFloat(String(incomeField.fieldValue).replace(/[,$\s]/g, ''));
                      if (!isNaN(value)) totalIncomeSum += value;
                    }
                    if (taxField?.fieldValue) {
                      const value = parseFloat(String(taxField.fieldValue).replace(/[,$\s]/g, ''));
                      if (!isNaN(value)) totalTaxSum += value;
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
                
                const netIncomeSum = totalIncomeSum - totalTaxSum - totalCppSum - totalEiSum;
                
                const pieData = [
                  {
                    name: 'Net Income',
                    value: netIncomeSum,
                    color: '#22c55e'
                  },
                  {
                    name: 'Income Tax',
                    value: totalTaxSum,
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
                        <Tooltip content={<CustomTooltip />} />
                        <Legend 
                          formatter={(value, entry) => {
                            const item = pieData.find(d => d.name === value);
                            if (item) {
                              return `${value}: $${item.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                            }
                            return value;
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </div>

        {/* Federal Tax Bracket Analysis - Individual Spouse Breakdowns */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Federal Tax Bracket Analysis</h2>
          
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

            // 2024 Canadian Federal Tax Brackets
            const federalBrackets = [
              { rate: 15.0, min: 0, max: 55867, label: "15%" },
              { rate: 20.5, min: 55867, max: 111733, label: "20.5%" },
              { rate: 26.0, min: 111733, max: 173205, label: "26%" },
              { rate: 29.0, min: 173205, max: 246752, label: "29%" },
              { rate: 33.0, min: 246752, max: Infinity, label: "33%" }
            ];

            // Function to calculate individual tax breakdown for a spouse
            const calculateSpouseTaxBreakdown = (spouseIncome: number) => {
              return federalBrackets.map(bracket => {
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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {spouseData.map((spouse, spouseIndex) => {
                  const bracketBreakdown = calculateSpouseTaxBreakdown(spouse.taxableIncome);
                  const totalTax = bracketBreakdown.reduce((sum, bracket) => sum + bracket.tax, 0);
                  
                  // Prepare data for individual bar chart
                  const chartData = bracketBreakdown.filter(b => b.incomeInBracket > 0).map(bracket => ({
                    rate: bracket.rate,
                    income: bracket.incomeInBracket,
                    tax: bracket.tax
                  }));

                  return (
                    <Card key={spouseIndex}>
                      <CardContent className="p-6">
                        <div className="space-y-6">
                          <div>
                            <h3 className="font-medium text-gray-900 mb-4">
                              Federal marginal tax rate for {spouse.clientName}:
                            </h3>
                            <p className="text-sm text-gray-600 mb-4">
                              Taxable Income: ${spouse.taxableIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                            
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
                          </div>

                          {/* Individual Bar Chart */}
                          {chartData.length > 0 && (
                            <div>
                              <h4 className="font-medium text-gray-900 mb-4 text-sm">{spouse.clientName.split(' ')[0]}'s Federal Tax</h4>
                              <div className="h-80 relative">
                                <div className="absolute right-0 top-0 text-right">
                                  <div className="text-xs text-gray-500 mb-2">Taxable Income</div>
                                  <div className="space-y-1">
                                    {chartData.map((item, idx) => (
                                      <div key={idx} className="text-xs">
                                        <div className="font-semibold">${(item.income / 1000).toFixed(0)}k</div>
                                        <div className="text-gray-600">{item.rate}</div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                <ResponsiveContainer width="85%" height="100%">
                                  <BarChart
                                    data={chartData}
                                    layout="horizontal"
                                    margin={{
                                      top: 20,
                                      right: 5,
                                      left: 40,
                                      bottom: 5,
                                    }}
                                  >
                                    <CartesianGrid strokeDasharray="2 2" />
                                    <XAxis 
                                      type="number"
                                      domain={[0, Math.max(...chartData.map(d => d.income)) * 1.1]}
                                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                                      fontSize={10}
                                    />
                                    <YAxis 
                                      type="category"
                                      dataKey="rate"
                                      fontSize={11}
                                      width={35}
                                    />
                                    <Tooltip 
                                      formatter={(value: number) => [
                                        `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
                                        'Taxable Income'
                                      ]}
                                      labelFormatter={(label) => `${label} Tax Bracket`}
                                    />
                                    <Bar 
                                      dataKey="income" 
                                      fill="#006226"
                                      radius={[0, 3, 3, 0]}
                                    />
                                  </BarChart>
                                </ResponsiveContainer>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
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