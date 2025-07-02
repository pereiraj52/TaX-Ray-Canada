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
      const blob = await HouseholdAPI.generateClientAuditReport(clientId);
      const targetClient = household?.clients.find(c => c.id === clientId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
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

  // Find the specific client
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
  const taxYearReturn = targetClient.t1Returns.find(t1Return => t1Return.taxYear === taxYear);

  if (!taxYearReturn) {
    return (
      <Layout title="" subtitle="">
        <div className="p-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Tax Return Not Found</h2>
            <p className="text-gray-600 mb-4">No tax return found for {targetClient.firstName} {targetClient.lastName} for year {taxYear}</p>
            <Link href={`/household/${householdId}`}>
              <Button>Back to Household</Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  // Helper function to get field value from T1 return
  const getFieldValue = (fieldCode: string, fallback: number = 0): number => {
    const t1WithFields = taxYearReturn as any;
    if (t1WithFields.formFields && Array.isArray(t1WithFields.formFields)) {
      const field = t1WithFields.formFields.find((f: any) => f.fieldCode === fieldCode);
      if (field?.fieldValue) {
        const value = parseFloat(field.fieldValue.toString());
        return isNaN(value) ? fallback : value;
      }
    }
    return fallback;
  };

  // Helper function to get client's province from T1 data
  const getClientProvince = () => {
    const t1WithFields = taxYearReturn as any;
    if (t1WithFields.formFields && Array.isArray(t1WithFields.formFields)) {
      const provinceField = t1WithFields.formFields.find((field: any) => 
        field.fieldCode === 'province' || field.fieldCode === 'prov'
      );
      if (provinceField?.fieldValue) {
        return provinceField.fieldValue.toString().toUpperCase();
      }
    }
    return 'ON'; // Default to Ontario
  };

  // Calculate financial data for the individual
  const totalIncome = getFieldValue('15000');
  const totalDeductions = getFieldValue('23300');
  const taxableIncome = getFieldValue('26000');
  
  // Calculate tax credits (federal + provincial if applicable)
  const federalCredits = getFieldValue('35000');
  const provincialCredits = getClientProvince() === 'ON' ? getFieldValue('61500') : 0;
  const totalCredits = federalCredits + provincialCredits;
  
  const federalTax = getFieldValue('42000');
  const provincialTax = getFieldValue('42800');
  
  // Use calculated total if field 43500 is not available
  const totalTax = getFieldValue('43500') || (federalTax + provincialTax);
  
  const cppContributions = getFieldValue('30800');
  const eiPremiums = getFieldValue('31200');
  
  // Calculate net income (Total Income - Total Tax - CPP - EI)
  const netIncome = totalIncome - totalTax - cppContributions - eiPremiums;

  // Prepare pie chart data
  const pieChartData = [
    { name: 'Net Income', value: Math.max(0, netIncome), color: '#88AA73' },
    { name: 'Federal Tax', value: federalTax, color: '#D4B26A' },
    { name: 'Provincial Tax', value: provincialTax, color: '#C7E6C2' },
    { name: 'CPP', value: cppContributions, color: '#A3A3A3' },
    { name: 'EI', value: eiPremiums, color: '#6B7AA2' }
  ].filter(item => item.value > 0);

  // Custom tooltip for pie chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const percentage = ((data.value / totalIncome) * 100).toFixed(2);
      return (
        <div className="bg-white p-2 border rounded shadow">
          <p className="font-medium">${data.value.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({percentage}%)</p>
        </div>
      );
    }
    return null;
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
          <Button onClick={handleDownloadReport} className="bg-primary hover:bg-primary-dark">
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        </div>

        {/* Financial Summary and Pie Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Financial Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-primary">Financial Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-medium text-primary">Income</span>
                <div className="text-right">
                  <span className="font-mono">${totalIncome.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  <span className="text-sm text-gray-500 ml-2">(100.00%)</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-primary">Deductions</span>
                <div className="text-right">
                  <span className="font-mono">${totalDeductions.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  <span className="text-sm text-gray-500 ml-2">({((totalDeductions / totalIncome) * 100).toFixed(2)}%)</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-primary">Taxable Income</span>
                <div className="text-right">
                  <span className="font-mono">${taxableIncome.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  <span className="text-sm text-gray-500 ml-2">({((taxableIncome / totalIncome) * 100).toFixed(2)}%)</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-primary">Tax Credits</span>
                <div className="text-right">
                  <span className="font-mono">${totalCredits.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  <span className="text-sm text-gray-500 ml-2">({((totalCredits / totalIncome) * 100).toFixed(2)}%)</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-primary">Federal Tax</span>
                <div className="text-right">
                  <span className="font-mono">${federalTax.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  <span className="text-sm text-gray-500 ml-2">({((federalTax / totalIncome) * 100).toFixed(2)}%)</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-primary">Provincial Tax</span>
                <div className="text-right">
                  <span className="font-mono">${provincialTax.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  <span className="text-sm text-gray-500 ml-2">({((provincialTax / totalIncome) * 100).toFixed(2)}%)</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-primary">CPP Contributions</span>
                <div className="text-right">
                  <span className="font-mono">${cppContributions.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  <span className="text-sm text-gray-500 ml-2">({((cppContributions / totalIncome) * 100).toFixed(2)}%)</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-primary">EI Premiums</span>
                <div className="text-right">
                  <span className="font-mono">${eiPremiums.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  <span className="text-sm text-gray-500 ml-2">({((eiPremiums / totalIncome) * 100).toFixed(2)}%)</span>
                </div>
              </div>
              <div className="flex justify-between items-center border-t pt-2">
                <span className="font-medium text-primary">Net Income</span>
                <div className="text-right">
                  <span className="font-mono">${netIncome.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  <span className="text-sm text-gray-500 ml-2">({((netIncome / totalIncome) * 100).toFixed(2)}%)</span>
                </div>
              </div>

              {/* KPI Blocks */}
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="bg-[#88AA73] p-4 rounded-lg text-center">
                  <div className="text-lg font-heading text-[#F9FAF8]">You Kept</div>
                  <div className="text-4xl font-heading font-bold text-[#F9FAF8]">
                    {((netIncome / totalIncome) * 100).toFixed(2)}%
                  </div>
                </div>
                <div className="bg-[#D4B26A] p-4 rounded-lg text-center">
                  <div className="text-lg font-heading text-[#F9FAF8]">You Paid</div>
                  <div className="text-4xl font-heading font-bold text-[#F9FAF8]">
                    {(100 - (netIncome / totalIncome) * 100).toFixed(2)}%
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-primary">{targetClient.firstName} {targetClient.lastName} - Income Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(2)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tax Rates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {((totalTax + cppContributions + eiPremiums) / totalIncome * 100).toFixed(2)}%
                  </div>
                  <div className="text-sm text-gray-600">You Paid %</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {(() => {
                      // Simple marginal rate calculation based on taxable income
                      if (taxableIncome <= 55867) return "20.05%";
                      if (taxableIncome <= 102894) return "24.15%";
                      if (taxableIncome <= 111733) return "31.48%";
                      if (taxableIncome <= 150000) return "37.16%";
                      if (taxableIncome <= 173205) return "43.41%";
                      if (taxableIncome <= 220000) return "46.16%";
                      if (taxableIncome <= 246752) return "47.74%";
                      return "53.53%";
                    })()}
                  </div>
                  <div className="text-sm text-gray-600">Marginal Rate</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Note */}
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600 text-center">
              This individual tax report shows financial details for {targetClient.firstName} {targetClient.lastName} only for tax year {taxYear}.
              For complete household analysis, visit the household report.
            </p>
          </CardContent>
        </Card>
      </div>
      </Layout>
    </TooltipProvider>
  );
}