import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Users, Calculator, TrendingUp } from "lucide-react";
import { Link } from "wouter";
import Layout from "@/components/Layout";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as ChartTooltip } from 'recharts';
import { HouseholdWithClients } from "@shared/schema";

export default function TaxReport() {
  const { householdId, year } = useParams<{ householdId: string; year: string }>();

  const { data: household, isLoading } = useQuery<HouseholdWithClients>({
    queryKey: [`/api/households/${householdId}`],
    enabled: !!householdId,
  });

  // Helper functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getFieldValue = (fieldCode: string, t1ReturnData: any): number => {
    if (!t1ReturnData?.formFields) return 0;
    const field = t1ReturnData.formFields.find((f: any) => f.fieldCode === fieldCode);
    return field ? parseFloat(field.value) || 0 : 0;
  };

  // Get household financial data for the specified year
  const getHouseholdFinancialData = () => {
    if (!household || !year) return null;

    const targetYear = parseInt(year);
    let totalIncome = 0;
    let totalFederalTax = 0;
    let totalProvincialTax = 0;
    let totalCPP = 0;
    let totalEI = 0;

    // Collect data from all clients for the specified year
    household.clients.forEach(client => {
      const yearReturn = client.t1Returns?.find(t1 => t1.taxYear === targetYear && t1.processingStatus === 'completed');
      if (yearReturn) {
        totalIncome += getFieldValue("15000", yearReturn);
        totalFederalTax += getFieldValue("42000", yearReturn);
        totalProvincialTax += getFieldValue("42800", yearReturn);
        totalCPP += getFieldValue("30800", yearReturn);
        totalEI += getFieldValue("31200", yearReturn);
      }
    });

    const totalTax = totalFederalTax + totalProvincialTax;
    const netIncome = totalIncome - totalTax;

    return {
      totalIncome,
      totalFederalTax,
      totalProvincialTax,
      totalTax,
      totalCPP,
      totalEI,
      netIncome
    };
  };

  const financialData = getHouseholdFinancialData();

  if (isLoading) {
    return (
      <Layout title="Tax Report" subtitle="">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading tax report...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!household) {
    return (
      <Layout title="Tax Report" subtitle="">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Tax Report Not Found
            </h2>
            <p className="text-gray-600 mb-4">
              The requested tax report could not be found.
            </p>
            <Link href="/households">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Households
              </Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Tax Report" subtitle="">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href={`/household/${householdId}`}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Household
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Tax Report {year}
              </h1>
              <p className="text-gray-600">
                Comprehensive tax analysis for {household?.name || 'Household'}
              </p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Income
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {financialData ? formatCurrency(financialData.totalIncome) : '$0'}
              </div>
              <p className="text-xs text-muted-foreground">
                Combined household income
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Tax
              </CardTitle>
              <Calculator className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {financialData ? formatCurrency(financialData.totalTax) : '$0'}
              </div>
              <p className="text-xs text-muted-foreground">
                Federal and provincial taxes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Average Rate
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {financialData && financialData.totalIncome > 0 
                  ? `${((financialData.totalTax / financialData.totalIncome) * 100).toFixed(1)}%`
                  : '0%'
                }
              </div>
              <p className="text-xs text-muted-foreground">
                Effective tax rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Net Income
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {financialData ? formatCurrency(financialData.netIncome) : '$0'}
              </div>
              <p className="text-xs text-muted-foreground">
                After-tax household income
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Household Financial Summary */}
        {financialData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Financial Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Household Financial Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Income</span>
                    <span className="font-medium">{formatCurrency(financialData.totalIncome)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Federal Tax</span>
                    <span className="font-medium">{formatCurrency(financialData.totalFederalTax)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Provincial Tax</span>
                    <span className="font-medium">{formatCurrency(financialData.totalProvincialTax)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">CPP Contributions</span>
                    <span className="font-medium">{formatCurrency(financialData.totalCPP)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">EI Premiums</span>
                    <span className="font-medium">{formatCurrency(financialData.totalEI)}</span>
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-900">Net Income</span>
                      <span className="font-semibold text-lg">{formatCurrency(financialData.netIncome)}</span>
                    </div>
                  </div>
                  
                  {/* KPI Blocks */}
                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="bg-green-600 text-white p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold">
                        {financialData.totalIncome > 0 
                          ? `${((financialData.netIncome / financialData.totalIncome) * 100).toFixed(1)}%`
                          : '0%'
                        }
                      </div>
                      <div className="text-sm">You Kept</div>
                    </div>
                    <div style={{ backgroundColor: '#D4B26A' }} className="text-white p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold">
                        {financialData.totalIncome > 0 
                          ? `${(((financialData.totalTax + financialData.totalCPP + financialData.totalEI) / financialData.totalIncome) * 100).toFixed(1)}%`
                          : '0%'
                        }
                      </div>
                      <div className="text-sm">You Paid</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Income Breakdown Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Income Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Net Income', value: financialData.netIncome, color: '#88AA73' },
                          { name: 'Federal Tax', value: financialData.totalFederalTax, color: '#D4B26A' },
                          { name: 'Provincial Tax', value: financialData.totalProvincialTax, color: '#C7E6C2' },
                          { name: 'CPP', value: financialData.totalCPP, color: '#A3A3A3' },
                          { name: 'EI', value: financialData.totalEI, color: '#6B7AA2' }
                        ].filter(item => item.value > 0)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {[
                          { name: 'Net Income', value: financialData.netIncome, color: '#88AA73' },
                          { name: 'Federal Tax', value: financialData.totalFederalTax, color: '#D4B26A' },
                          { name: 'Provincial Tax', value: financialData.totalProvincialTax, color: '#C7E6C2' },
                          { name: 'CPP', value: financialData.totalCPP, color: '#A3A3A3' },
                          { name: 'EI', value: financialData.totalEI, color: '#6B7AA2' }
                        ].filter(item => item.value > 0).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip 
                        formatter={(value: number) => [formatCurrency(value), '']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Message when no data */}
        {!financialData && (
          <Card>
            <CardHeader>
              <CardTitle>Tax Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No Tax Data Available
                </h3>
                <p className="text-gray-600">
                  No completed T1 returns found for tax year {year}. Upload and process T1 documents to view the household tax analysis.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}