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
                      // Calculate marginal rate based on taxable income and Ontario tax brackets
                      if (taxableIncome <= 51446) return "20.05%";
                      if (taxableIncome <= 55867) return "24.15%";
                      if (taxableIncome <= 102894) return "29.65%";
                      if (taxableIncome <= 111733) return "31.48%";
                      if (taxableIncome <= 150000) return "37.91%";
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

        {/* Combined Tax Bracket Analysis */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Combined Tax Bracket Analysis</h2>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium text-gray-900">
                {targetClient.firstName} {targetClient.lastName} - Combined Tax Bracket Analysis
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
                    {(() => {
                      const brackets = [
                        { rate: 20.05, min: 0, max: 51446 },
                        { rate: 24.15, min: 51446, max: 55867 },
                        { rate: 29.65, min: 55867, max: 102894 },
                        { rate: 31.48, min: 102894, max: 111733 },
                        { rate: 37.91, min: 111733, max: 150000 },
                        { rate: 43.41, min: 150000, max: 173205 },
                        { rate: 46.16, min: 173205, max: 220000 },
                        { rate: 47.74, min: 220000, max: 246752 },
                        { rate: 53.53, min: 246752, max: Infinity }
                      ];

                      let cumulativeTax = 0;
                      
                      return brackets.map((bracket, index) => {
                        const incomeInBracket = Math.min(
                          Math.max(0, taxableIncome - bracket.min),
                          bracket.max === Infinity ? Math.max(0, taxableIncome - bracket.min) : bracket.max - bracket.min
                        );
                        const taxInBracket = incomeInBracket * (bracket.rate / 100);
                        cumulativeTax += taxInBracket;
                        
                        const isCurrentBracket = taxableIncome > bracket.min && (bracket.max === Infinity || taxableIncome <= bracket.max);
                        
                        return (
                          <tr 
                            key={index} 
                            className={`border-b border-gray-100 ${isCurrentBracket ? 'border border-[#D4B26A]' : ''}`}
                          >
                            <td className="py-2 px-2 font-medium text-primary">{bracket.rate.toFixed(2)}%</td>
                            <td className="py-2 px-2 text-gray-700 text-xs">
                              ${bracket.min.toLocaleString()} - {bracket.max === Infinity ? '∞' : `$${bracket.max.toLocaleString()}`}
                            </td>
                            <td className="py-2 px-2 text-gray-700 text-xs">
                              ${incomeInBracket.toLocaleString('en-CA', { maximumFractionDigits: 0 })}
                            </td>
                            <td className="py-2 px-2 text-gray-700 text-xs">
                              ${taxInBracket.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      });
                    })()}
                    <tr className="border-t-2 border-gray-300 font-semibold">
                      <td className="py-2 px-2 text-gray-900">Total</td>
                      <td className="py-2 px-2"></td>
                      <td className="py-2 px-2 text-gray-900 text-xs">
                        ${taxableIncome.toLocaleString('en-CA', { maximumFractionDigits: 0 })}
                      </td>
                      <td className="py-2 px-2 text-gray-900 text-xs">
                        ${(taxableIncome * 0.01 * (() => {
                          if (taxableIncome <= 51446) return 20.05;
                          if (taxableIncome <= 55867) return 24.15;
                          if (taxableIncome <= 102894) return 29.65;
                          if (taxableIncome <= 111733) return 31.48;
                          if (taxableIncome <= 150000) return 37.91;
                          if (taxableIncome <= 173205) return 43.41;
                          if (taxableIncome <= 220000) return 46.16;
                          if (taxableIncome <= 246752) return 47.74;
                          return 53.53;
                        })()).toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Combined Tax Bracket Visualization */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-lg font-medium text-gray-900">
                {targetClient.firstName} {targetClient.lastName} - Combined Tax Bracket Visualization
              </CardTitle>
              <div className="text-sm text-gray-600">
                Taxable Income: ${taxableIncome.toLocaleString()}
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {['Ordinary Income', 'Capital Gains', 'Eligible Dividends', 'Non-Eligible Dividends'].map((incomeType, typeIndex) => {
                  const getRatesForType = (type: string) => {
                    switch (type) {
                      case 'Capital Gains':
                        return [10.03, 12.08, 14.83, 15.74, 18.96, 21.71, 23.08, 23.87, 26.77];
                      case 'Eligible Dividends':
                        return [-1.20, 2.04, 7.56, 9.25, 15.15, 19.73, 21.86, 23.11, 39.34];
                      case 'Non-Eligible Dividends':
                        return [13.95, 17.70, 22.94, 24.81, 30.33, 34.81, 36.89, 38.16, 47.74];
                      default: // Ordinary Income
                        return [20.05, 24.15, 29.65, 31.48, 37.91, 43.41, 46.16, 47.74, 53.53];
                    }
                  };

                  const rates = getRatesForType(incomeType);
                  const thresholds = [0, 51446, 55867, 102894, 111733, 150000, 173205, 220000, 246752];
                  const maxScale = 300000;

                  return (
                    <div key={typeIndex} className="space-y-2">
                      <h4 className="font-medium text-sm text-gray-700">{incomeType}</h4>
                      <div className="relative">
                        <div className="flex h-72 bg-gray-100 rounded">
                          {rates.map((rate, index) => {
                            const isCurrentBracket = index < thresholds.length - 1 ? 
                              (taxableIncome >= thresholds[index] && taxableIncome < thresholds[index + 1]) :
                              (taxableIncome >= thresholds[index]);
                            
                            return (
                              <div
                                key={index}
                                className={`flex-1 flex items-end justify-center text-black text-xs relative ${
                                  isCurrentBracket ? 'bg-[#C7E6C2]' : 'bg-[#88AA73]'
                                }`}
                                style={{ 
                                  height: `${Math.max(10, (Math.abs(rate) / 60) * 100)}%`,
                                  zIndex: 10
                                }}
                              >
                                <span className="absolute bottom-1 z-20">{rate.toFixed(1)}%</span>
                              </div>
                            );
                          })}
                        </div>
                        
                        {/* Taxable Income Indicator */}
                        {taxableIncome > 0 && (
                          <div
                            className="absolute top-0 w-0.5 h-72 z-30"
                            style={{
                              backgroundColor: '#D4B26A',
                              left: `${Math.min(95, (taxableIncome / maxScale) * 100)}%`
                            }}
                          >
                            <div 
                              className="absolute text-xs font-medium whitespace-nowrap"
                              style={{
                                color: '#D4B26A',
                                right: '32px',
                                top: '8px'
                              }}
                            >
                              {typeIndex === 0 ? `$${(taxableIncome/1000).toFixed(0)}k` : ''}
                            </div>
                          </div>
                        )}
                        
                        {/* Scale Labels */}
                        <div className="absolute bottom-0 w-full h-72 pointer-events-none">
                          {[0, 51, 56, 103, 112, 150, 173, 220, 247, 300].map((amount, index) => {
                            const position = (amount / 300) * 100;
                            
                            // Calculate spacing to prevent overlap
                            const prevPosition = index > 0 ? ([0, 51, 56, 103, 112, 150, 173, 220, 247, 300][index - 1] / 300) * 100 : 0;
                            const spacing = position - prevPosition;
                            const minSpacing = 7; // 7% minimum spacing
                            
                            let adjustedPosition = position;
                            if (spacing < minSpacing && index > 0) {
                              adjustedPosition = prevPosition + minSpacing;
                            }
                            
                            // Special handling for $300k label
                            const isTopLabel = amount === 300;
                            const topOffset = isTopLabel ? '4%' : '0px';
                            
                            return (
                              <div
                                key={index}
                                className="absolute text-xs text-gray-600"
                                style={{
                                  left: `${Math.min(90, adjustedPosition)}%`,
                                  bottom: topOffset
                                }}
                              >
                                ${amount}k
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Federal Tax Bracket Analysis */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Federal Tax Bracket Analysis</h2>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium text-gray-900">
                {targetClient.firstName} {targetClient.lastName} - Federal Tax Bracket Analysis
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
                    {(() => {
                      const federalBrackets = [
                        { rate: 15.00, min: 0, max: 55867 },
                        { rate: 20.50, min: 55867, max: 111733 },
                        { rate: 26.00, min: 111733, max: 173205 },
                        { rate: 29.00, min: 173205, max: 246752 },
                        { rate: 33.00, min: 246752, max: Infinity }
                      ];

                      return federalBrackets.map((bracket, index) => {
                        const incomeInBracket = Math.min(
                          Math.max(0, taxableIncome - bracket.min),
                          bracket.max === Infinity ? Math.max(0, taxableIncome - bracket.min) : bracket.max - bracket.min
                        );
                        const taxInBracket = incomeInBracket * (bracket.rate / 100);
                        
                        const isCurrentBracket = taxableIncome > bracket.min && (bracket.max === Infinity || taxableIncome <= bracket.max);
                        
                        return (
                          <tr 
                            key={index} 
                            className={`border-b border-gray-100 ${isCurrentBracket ? 'border border-[#D4B26A]' : ''}`}
                          >
                            <td className="py-2 px-2 font-medium text-primary">{bracket.rate.toFixed(2)}%</td>
                            <td className="py-2 px-2 text-gray-700 text-xs">
                              ${bracket.min.toLocaleString()} - {bracket.max === Infinity ? '∞' : `$${bracket.max.toLocaleString()}`}
                            </td>
                            <td className="py-2 px-2 text-gray-700 text-xs">
                              ${incomeInBracket.toLocaleString('en-CA', { maximumFractionDigits: 0 })}
                            </td>
                            <td className="py-2 px-2 text-gray-700 text-xs">
                              ${taxInBracket.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      });
                    })()}
                    <tr className="border-t-2 border-gray-300 font-semibold">
                      <td className="py-2 px-2 text-gray-900">Total</td>
                      <td className="py-2 px-2"></td>
                      <td className="py-2 px-2 text-gray-900 text-xs">
                        ${taxableIncome.toLocaleString('en-CA', { maximumFractionDigits: 0 })}
                      </td>
                      <td className="py-2 px-2 text-gray-900 text-xs">
                        ${federalTax.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Federal Tax Bracket Visualization */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-lg font-medium text-gray-900">
                {targetClient.firstName} {targetClient.lastName} - Federal Tax Bracket Visualization
              </CardTitle>
              <div className="text-sm text-gray-600">
                Taxable Income: ${taxableIncome.toLocaleString()}
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {['Ordinary Income', 'Capital Gains', 'Eligible Dividends', 'Non-Eligible Dividends'].map((incomeType, typeIndex) => {
                  const getFederalRatesForType = (type: string) => {
                    switch (type) {
                      case 'Capital Gains':
                        return [7.50, 10.25, 13.00, 14.50, 16.50];
                      case 'Eligible Dividends':
                        return [-0.03, 7.56, 15.15, 19.73, 24.81];
                      case 'Non-Eligible Dividends':
                        return [6.87, 13.19, 18.52, 27.57, 27.57];
                      default: // Ordinary Income
                        return [15.00, 20.50, 26.00, 29.00, 33.00];
                    }
                  };

                  const rates = getFederalRatesForType(incomeType);
                  const federalThresholds = [0, 55867, 111733, 173205, 246752];
                  const maxScale = 300000;

                  return (
                    <div key={typeIndex} className="space-y-2">
                      <h4 className="font-medium text-sm text-gray-700">{incomeType}</h4>
                      <div className="relative">
                        <div className="flex h-72 bg-gray-100 rounded">
                          {rates.map((rate, index) => {
                            const isCurrentBracket = index < federalThresholds.length - 1 ? 
                              (taxableIncome >= federalThresholds[index] && taxableIncome < federalThresholds[index + 1]) :
                              (taxableIncome >= federalThresholds[index]);
                            
                            return (
                              <div
                                key={index}
                                className={`flex-1 flex items-end justify-center text-black text-xs relative ${
                                  isCurrentBracket ? 'bg-[#C7E6C2]' : 'bg-[#88AA73]'
                                }`}
                                style={{ 
                                  height: `${Math.max(10, (Math.abs(rate) / 40) * 100)}%`,
                                  zIndex: 10
                                }}
                              >
                                <span className="absolute bottom-1 z-20">{rate.toFixed(1)}%</span>
                              </div>
                            );
                          })}
                        </div>
                        
                        {/* Taxable Income Indicator */}
                        {taxableIncome > 0 && (
                          <div
                            className="absolute top-0 w-0.5 h-72 z-30"
                            style={{
                              backgroundColor: '#D4B26A',
                              left: `${Math.min(95, (taxableIncome / maxScale) * 100)}%`
                            }}
                          >
                            <div 
                              className="absolute text-xs font-medium whitespace-nowrap"
                              style={{
                                color: '#D4B26A',
                                right: '32px',
                                top: '8px'
                              }}
                            >
                              {typeIndex === 0 ? `$${(taxableIncome/1000).toFixed(0)}k` : ''}
                            </div>
                          </div>
                        )}
                        
                        {/* Scale Labels */}
                        <div className="absolute bottom-0 w-full h-72 pointer-events-none">
                          {[0, 56, 112, 173, 247, 300].map((amount, index) => {
                            const position = (amount / 300) * 100;
                            
                            return (
                              <div
                                key={index}
                                className="absolute text-xs text-gray-600"
                                style={{
                                  left: `${Math.min(90, position)}%`,
                                  bottom: amount === 300 ? '4%' : '0px'
                                }}
                              >
                                ${amount}k
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Federal Tax Bracket Visualization */}
        <div className="mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {['Ordinary Income', 'Capital Gains', 'Eligible Dividends', 'Non-Eligible Dividends'].map((incomeType, typeIndex) => {
                  const getFederalRatesForType = (type: string) => {
                    switch (type) {
                      case 'Capital Gains':
                        return [7.50, 10.25, 13.00, 14.50, 16.50];
                      case 'Eligible Dividends':
                        return [-0.03, 7.56, 15.15, 19.73, 24.81];
                      case 'Non-Eligible Dividends':
                        return [6.87, 13.19, 18.52, 27.57, 27.57];
                      default: // Ordinary Income
                        return [15.00, 20.50, 26.00, 29.00, 33.00];
                    }
                  };

                  const rates = getFederalRatesForType(incomeType);
                  const federalThresholds = [0, 55867, 111733, 173205, 246752];
                  const maxScale = 300000;

                  return (
                    <div key={typeIndex} className="space-y-2">
                      <h4 className="font-medium text-sm text-gray-700">{incomeType}</h4>
                      <div className="relative">
                        <div className="flex h-72 bg-gray-100 rounded">
                          {rates.map((rate, index) => {
                            const isCurrentBracket = index < federalThresholds.length - 1 ? 
                              (taxableIncome >= federalThresholds[index] && taxableIncome < federalThresholds[index + 1]) :
                              (taxableIncome >= federalThresholds[index]);
                            
                            return (
                              <div
                                key={index}
                                className={`flex-1 flex items-end justify-center text-black text-xs relative ${
                                  isCurrentBracket ? 'bg-[#C7E6C2]' : 'bg-[#88AA73]'
                                }`}
                                style={{ 
                                  height: `${Math.max(10, (Math.abs(rate) / 40) * 100)}%`,
                                  zIndex: 10
                                }}
                              >
                                <span className="absolute bottom-1 z-20">{rate.toFixed(1)}%</span>
                              </div>
                            );
                          })}
                        </div>
                        
                        {/* Taxable Income Indicator */}
                        {taxableIncome > 0 && (
                          <div
                            className="absolute top-0 w-0.5 h-72 z-30"
                            style={{
                              backgroundColor: '#D4B26A',
                              left: `${Math.min(95, (taxableIncome / maxScale) * 100)}%`
                            }}
                          >
                            <div 
                              className="absolute text-xs font-medium whitespace-nowrap"
                              style={{
                                color: '#D4B26A',
                                right: '32px',
                                top: '8px'
                              }}
                            >
                              {typeIndex === 0 ? `$${(taxableIncome/1000).toFixed(0)}k` : ''}
                            </div>
                          </div>
                        )}
                        
                        {/* Scale Labels */}
                        <div className="absolute bottom-0 w-full h-72 pointer-events-none">
                          {[0, 56, 112, 173, 247, 300].map((amount, index) => {
                            const position = (amount / 300) * 100;
                            
                            return (
                              <div
                                key={index}
                                className="absolute text-xs text-gray-600"
                                style={{
                                  left: `${Math.min(90, position)}%`,
                                  bottom: amount === 300 ? '4%' : '0px'
                                }}
                              >
                                ${amount}k
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Provincial Tax Bracket Analysis */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Provincial Tax Bracket Analysis</h2>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium text-gray-900">
                {targetClient.firstName} {targetClient.lastName} - Provincial Tax Bracket Analysis
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
                    {(() => {
                      const provincialBrackets = [
                        { rate: 5.05, min: 0, max: 51446 },
                        { rate: 9.15, min: 51446, max: 102894 },
                        { rate: 11.16, min: 102894, max: 150000 },
                        { rate: 12.16, min: 150000, max: 220000 },
                        { rate: 13.16, min: 220000, max: Infinity }
                      ];

                      return provincialBrackets.map((bracket, index) => {
                        const incomeInBracket = Math.min(
                          Math.max(0, taxableIncome - bracket.min),
                          bracket.max === Infinity ? Math.max(0, taxableIncome - bracket.min) : bracket.max - bracket.min
                        );
                        const taxInBracket = incomeInBracket * (bracket.rate / 100);
                        
                        const isCurrentBracket = taxableIncome > bracket.min && (bracket.max === Infinity || taxableIncome <= bracket.max);
                        
                        return (
                          <tr 
                            key={index} 
                            className={`border-b border-gray-100 ${isCurrentBracket ? 'border border-[#D4B26A]' : ''}`}
                          >
                            <td className="py-2 px-2 font-medium text-primary">{bracket.rate.toFixed(2)}%</td>
                            <td className="py-2 px-2 text-gray-700 text-xs">
                              ${bracket.min.toLocaleString()} - {bracket.max === Infinity ? '∞' : `$${bracket.max.toLocaleString()}`}
                            </td>
                            <td className="py-2 px-2 text-gray-700 text-xs">
                              ${incomeInBracket.toLocaleString('en-CA', { maximumFractionDigits: 0 })}
                            </td>
                            <td className="py-2 px-2 text-gray-700 text-xs">
                              ${taxInBracket.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      });
                    })()}
                    <tr className="border-t-2 border-gray-300 font-semibold">
                      <td className="py-2 px-2 text-gray-900">Total</td>
                      <td className="py-2 px-2"></td>
                      <td className="py-2 px-2 text-gray-900 text-xs">
                        ${taxableIncome.toLocaleString('en-CA', { maximumFractionDigits: 0 })}
                      </td>
                      <td className="py-2 px-2 text-gray-900 text-xs">
                        ${provincialTax.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Provincial Tax Bracket Visualization */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-lg font-medium text-gray-900">
                {targetClient.firstName} {targetClient.lastName} - Provincial Tax Bracket Visualization
              </CardTitle>
              <div className="text-sm text-gray-600">
                Taxable Income: ${taxableIncome.toLocaleString()}
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {['Ordinary Income', 'Capital Gains', 'Eligible Dividends', 'Non-Eligible Dividends'].map((incomeType, typeIndex) => {
                  const getProvincialRatesForType = (type: string) => {
                    switch (type) {
                      case 'Capital Gains':
                        return [2.53, 4.58, 5.58, 6.08, 6.58];
                      case 'Eligible Dividends':
                        return [-1.17, -5.52, -7.59, -8.62, 14.53];
                      case 'Non-Eligible Dividends':
                        return [7.08, 9.51, 12.40, 10.59, 20.17];
                      default: // Ordinary Income
                        return [5.05, 9.15, 11.16, 12.16, 13.16];
                    }
                  };

                  const rates = getProvincialRatesForType(incomeType);
                  const provincialThresholds = [0, 51446, 102894, 150000, 220000];
                  const maxScale = 300000;

                  return (
                    <div key={typeIndex} className="space-y-2">
                      <h4 className="font-medium text-sm text-gray-700">{incomeType}</h4>
                      <div className="relative">
                        <div className="flex h-72 bg-gray-100 rounded">
                          {rates.map((rate, index) => {
                            const isCurrentBracket = index < provincialThresholds.length - 1 ? 
                              (taxableIncome >= provincialThresholds[index] && taxableIncome < provincialThresholds[index + 1]) :
                              (taxableIncome >= provincialThresholds[index]);
                            
                            return (
                              <div
                                key={index}
                                className={`flex-1 flex items-end justify-center text-black text-xs relative ${
                                  isCurrentBracket ? 'bg-[#C7E6C2]' : 'bg-[#88AA73]'
                                }`}
                                style={{ 
                                  height: `${Math.max(10, (Math.abs(rate) / 20) * 100)}%`,
                                  zIndex: 10
                                }}
                              >
                                <span className="absolute bottom-1 z-20">{rate.toFixed(1)}%</span>
                              </div>
                            );
                          })}
                        </div>
                        
                        {/* Taxable Income Indicator */}
                        {taxableIncome > 0 && (
                          <div
                            className="absolute top-0 w-0.5 h-72 z-30"
                            style={{
                              backgroundColor: '#D4B26A',
                              left: `${Math.min(95, (taxableIncome / maxScale) * 100)}%`
                            }}
                          >
                            <div 
                              className="absolute text-xs font-medium whitespace-nowrap"
                              style={{
                                color: '#D4B26A',
                                right: '32px',
                                top: '8px'
                              }}
                            >
                              {typeIndex === 0 ? `$${(taxableIncome/1000).toFixed(0)}k` : ''}
                            </div>
                          </div>
                        )}
                        
                        {/* Scale Labels */}
                        <div className="absolute bottom-0 w-full h-72 pointer-events-none">
                          {[0, 51, 103, 150, 220, 300].map((amount, index) => {
                            const position = (amount / 300) * 100;
                            
                            return (
                              <div
                                key={index}
                                className="absolute text-xs text-gray-600"
                                style={{
                                  left: `${Math.min(90, position)}%`,
                                  bottom: amount === 300 ? '4%' : '0px'
                                }}
                              >
                                ${amount}k
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Provincial Tax Bracket Visualization */}
        <div className="mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {['Ordinary Income', 'Capital Gains', 'Eligible Dividends', 'Non-Eligible Dividends'].map((incomeType, typeIndex) => {
                  const getProvincialRatesForType = (type: string) => {
                    switch (type) {
                      case 'Capital Gains':
                        return [2.53, 4.58, 5.58, 6.08, 6.58];
                      case 'Eligible Dividends':
                        return [-1.17, -5.52, -7.59, -8.62, 14.53];
                      case 'Non-Eligible Dividends':
                        return [7.08, 9.51, 12.40, 10.59, 20.17];
                      default: // Ordinary Income
                        return [5.05, 9.15, 11.16, 12.16, 13.16];
                    }
                  };

                  const rates = getProvincialRatesForType(incomeType);
                  const provincialThresholds = [0, 51446, 102894, 150000, 220000];
                  const maxScale = 300000;

                  return (
                    <div key={typeIndex} className="space-y-2">
                      <h4 className="font-medium text-sm text-gray-700">{incomeType}</h4>
                      <div className="relative">
                        <div className="flex h-72 bg-gray-100 rounded">
                          {rates.map((rate, index) => {
                            const isCurrentBracket = index < provincialThresholds.length - 1 ? 
                              (taxableIncome >= provincialThresholds[index] && taxableIncome < provincialThresholds[index + 1]) :
                              (taxableIncome >= provincialThresholds[index]);
                            
                            return (
                              <div
                                key={index}
                                className={`flex-1 flex items-end justify-center text-black text-xs relative ${
                                  isCurrentBracket ? 'bg-[#C7E6C2]' : 'bg-[#88AA73]'
                                }`}
                                style={{ 
                                  height: `${Math.max(10, (Math.abs(rate) / 20) * 100)}%`,
                                  zIndex: 10
                                }}
                              >
                                <span className="absolute bottom-1 z-20">{rate.toFixed(1)}%</span>
                              </div>
                            );
                          })}
                        </div>
                        
                        {/* Taxable Income Indicator */}
                        {taxableIncome > 0 && (
                          <div
                            className="absolute top-0 w-0.5 h-72 z-30"
                            style={{
                              backgroundColor: '#D4B26A',
                              left: `${Math.min(95, (taxableIncome / maxScale) * 100)}%`
                            }}
                          >
                            <div 
                              className="absolute text-xs font-medium whitespace-nowrap"
                              style={{
                                color: '#D4B26A',
                                right: '32px',
                                top: '8px'
                              }}
                            >
                              {typeIndex === 0 ? `$${(taxableIncome/1000).toFixed(0)}k` : ''}
                            </div>
                          </div>
                        )}
                        
                        {/* Scale Labels */}
                        <div className="absolute bottom-0 w-full h-72 pointer-events-none">
                          {[0, 51, 103, 150, 220, 300].map((amount, index) => {
                            const position = (amount / 300) * 100;
                            
                            return (
                              <div
                                key={index}
                                className="absolute text-xs text-gray-600"
                                style={{
                                  left: `${Math.min(90, position)}%`,
                                  bottom: amount === 300 ? '4%' : '0px'
                                }}
                              >
                                ${amount}k
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
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