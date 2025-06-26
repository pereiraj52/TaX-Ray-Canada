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
                    const taxField = t1WithFields.formFields.find((field: any) => field.fieldCode === '43500');
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

        {/* Combined Tax Bracket Analysis Table */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Combined Tax Bracket Analysis</h2>
          
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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {spouseData.map((spouse, spouseIndex) => {
                  const bracketBreakdown = calculateSpouseTaxBreakdown(spouse.taxableIncome);
                  const totalTax = bracketBreakdown.reduce((sum, bracket) => sum + bracket.tax, 0);

                  return (
                    <Card key={spouseIndex}>
                      <CardContent className="p-6">
                        <div className="space-y-4">
                          <div>
                            <h3 className="font-medium text-gray-900 mb-4">
                              Combined marginal tax rate for {spouse.clientName}:
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

                          {/* Vertical Tax Bracket Visualization */}
                          <div className="mt-6">
                            <div className="text-right mb-4">
                              <div className="text-3xl font-bold text-primary">
                                {(() => {
                                  // Find current marginal rate bracket for this spouse
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
                                      }
                                    };

                                    // Get the client's province from the household data
                                    const client = household?.clients.find(c => c.id === spouse.t1Return.clientId);
                                    const clientProvince = (client as any)?.province || 'ON';
                                    const validProvince = clientProvince === 'AB' ? 'AB' : clientProvince === 'BC' ? 'BC' : 'ON';
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
                                            
                                            // Color coding: negative rates in green, positive in consistent blue
                                            let bgColor = 'bg-gray-300';
                                            if (isCurrentBracket) {
                                              if (bracket.rate < 0) {
                                                bgColor = 'bg-green-500';
                                              } else {
                                                bgColor = 'bg-blue-500';
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
                                                <span className="text-xs font-medium text-white whitespace-nowrap">
                                                  {bracket.label}
                                                </span>
                                              </div>
                                            );
                                          })}
                                          
                                          {/* Current income indicator line - only show on first bar */}
                                          {typeIdx === 0 && (
                                            <div 
                                              className="absolute left-0 w-full h-1 bg-green-500 z-10"
                                              style={{
                                                bottom: `${spouse.taxableIncome > 247000 ? '100%' : Math.min(spouse.taxableIncome / 300000, 1) * 100 + '%'}`
                                              }}
                                            >
                                              {/* Income label to the left of the bars */}
                                              <div className="absolute right-52 -top-2 text-xs text-green-600 font-semibold whitespace-nowrap">
                                                Taxable Income: ${Math.round(spouse.taxableIncome / 1000)}k
                                              </div>
                                            </div>
                                          )}
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
            );
          })()}
        </div>



      </div>
    </Layout>
  );
}