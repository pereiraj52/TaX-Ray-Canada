import { useState } from "react";
import { CheckCircle, Edit, FileText, DollarSign, Calculator, User, File, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { T1ReturnWithFields } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { HouseholdAPI } from "@/lib/api";
import T1FieldEditDialog from "@/components/T1FieldEditDialog";
import { useToast } from "@/hooks/use-toast";
import MarginalRateDisplay from "@/components/MarginalRateDisplay";
import MarginalRateBreakdown from "@/components/MarginalRateBreakdown";

interface ExtractedDataDisplayProps {
  t1Return: T1ReturnWithFields;
}

type TabType = 'summary' | 'income' | 'deductions' | 'credits' | 'taxes' | 'identification';

export default function ExtractedDataDisplay({ t1Return }: ExtractedDataDisplayProps) {
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    'employment': true,
    'pension': true,
    'benefits': true,
    'investment': true,
    'other': true,
    'self-employment': true,
    'other-sources': true,
    // Deduction sections
    'retirement-plan-deductions': true,
    'personal-deductions': true,
    'employment-deductions': true,
    'support-investment-deductions': true,
    'specialized-deductions': true,
    'provincial-deductions': true
  });
  const { toast } = useToast();



  const generateReportMutation = useMutation({
    mutationFn: () => HouseholdAPI.generateClientAuditReport(t1Return.clientId),
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-report-${t1Return.client.firstName}-${t1Return.client.lastName}-${t1Return.taxYear}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({
        title: "Success",
        description: "Audit report generated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate audit report",
        variant: "destructive",
      });
    },
  });

  if (t1Return.processingStatus === 'processing') {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-3"></div>
          <span className="text-blue-800 font-medium">Processing T1 return...</span>
        </div>
        <div className="mt-2 text-sm text-blue-700">
          Extracting data from uploaded PDF. This may take a few moments.
        </div>
      </div>
    );
  }

  if (t1Return.processingStatus === 'failed') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <span className="text-red-800 font-medium">Failed to process T1 return</span>
        </div>
        <div className="mt-2 text-sm text-red-700">
          There was an error extracting data from the PDF. Please try uploading again.
        </div>
      </div>
    );
  }

  const currencyFields = t1Return.formFields?.filter(f => f.fieldType === 'currency') || [];
  const textFields = t1Return.formFields?.filter(f => f.fieldType === 'text') || [];

  const formatCurrency = (value: string | null | undefined): string => {
    if (!value) return '$0.00';
    const num = parseFloat(value);
    return `$${num.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getFieldValue = (fieldCode: string): string => {
    const field = currencyFields.find(f => f.fieldCode === fieldCode);
    return field?.fieldValue || '0';
  };

  const renderField = (fieldCode: string, label: string, isCurrency = true) => {
    const value = getFieldValue(fieldCode);
    
    return (
      <div className="field-row">
        <span className="field-label">{label}:</span>
        <span className="field-value">{isCurrency ? formatCurrency(value) : value}</span>
      </div>
    );
  };

  const getTextFieldValue = (fieldCode: string): string => {
    const field = textFields.find(f => f.fieldCode === fieldCode);
    return field?.fieldValue || 'Not provided';
  };

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const getSectionTotal = (fieldCodes: string[]): number => {
    return fieldCodes.reduce((total, code) => {
      const value = parseFloat(getFieldValue(code) || '0');
      return total + value;
    }, 0);
  };

  const CollapsibleSection = ({ 
    id, 
    title, 
    fieldCodes, 
    children 
  }: { 
    id: string;
    title: string;
    fieldCodes: string[];
    children: React.ReactNode;
  }) => {
    const isCollapsed = collapsedSections[id];
    const total = getSectionTotal(fieldCodes);
    const hasData = total > 0;

    return (
      <div className="mt-6">
        <button
          onClick={() => toggleSection(id)}
          className="w-full flex items-center justify-between font-semibold text-secondary border-b pb-2 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center">
            {isCollapsed ? <ChevronRight className="h-4 w-4 mr-2" /> : <ChevronDown className="h-4 w-4 mr-2" />}
            <span>{title}</span>
          </div>
          <span className={`${hasData ? 'text-primary font-medium' : 'text-gray-400'}`}>
            {formatCurrency(total.toString())}
          </span>
        </button>
        {!isCollapsed && (
          <div className="mt-4">
            {children}
          </div>
        )}
      </div>
    );
  };

  const tabs = [
    { id: 'summary' as TabType, label: 'Summary', icon: FileText },
    { id: 'income' as TabType, label: 'Income', icon: DollarSign },
    { id: 'deductions' as TabType, label: 'Deductions', icon: FileText },
    { id: 'credits' as TabType, label: 'Credits', icon: Calculator },
    { id: 'taxes' as TabType, label: 'Taxes', icon: File },
    { id: 'identification' as TabType, label: 'Identification', icon: User },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-primary">
          {t1Return.client.firstName} {t1Return.client.lastName} - {getTextFieldValue('province')} - {t1Return.taxYear}
        </h2>
        <div className="flex items-center space-x-3">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            <CheckCircle className="mr-2 h-4 w-4" />
            Data Extracted Successfully
          </span>
        </div>
      </div>

      {/* Tax Year and Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium text-primary mb-2">Total Income</h3>
          <p className="text-lg font-semibold text-primary">
            {formatCurrency(getFieldValue('15000'))}
          </p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium text-primary mb-2">Total Tax</h3>
          <p className="text-lg font-semibold text-primary">
            {formatCurrency(getFieldValue('43700'))}
          </p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium text-primary mb-2">Average Rate</h3>
          <p className="text-lg font-semibold text-primary">
            {(() => {
              const totalIncome = parseFloat(getFieldValue('15000') || '0');
              const totalTax = parseFloat(getFieldValue('43700') || '0');
              if (totalIncome === 0) return '0.00%';
              const rate = (totalTax / totalIncome) * 100;
              return `${rate.toFixed(2)}%`;
            })()}
          </p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium text-primary mb-2">Marginal Rate</h3>
          <p className="text-lg font-semibold text-primary">
            <MarginalRateDisplay 
              income={parseFloat(getFieldValue('15000') || '0')} 
              province={getTextFieldValue('province')} 
            />
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
              >
                <Icon className="mr-2 h-4 w-4 inline" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="py-6">
        {activeTab === 'summary' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Key Tax Information */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="font-semibold text-primary mb-4">Key Tax Information</h3>
                <div className="space-y-3">
                  {(() => {
                    const totalIncome = parseFloat(getFieldValue('15000') || '0');
                    const taxableIncome = parseFloat(getFieldValue('26000') || '0');
                    const totalDeductions = totalIncome - taxableIncome;
                    const totalTax = parseFloat(getFieldValue('43700') || '0');
                    const netIncome = totalIncome - parseFloat(getFieldValue('43500') || '0');
                    
                    const calculatePercentage = (amount: number) => {
                      if (totalIncome === 0) return '0.0%';
                      return `${((amount / totalIncome) * 100).toFixed(1)}%`;
                    };
                    
                    return (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Total Income:</span>
                          <div className="text-right">
                            <span className="font-medium text-primary">
                              {formatCurrency(getFieldValue('15000'))} <span className="text-sm text-gray-500">(100.0%)</span>
                            </span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Total Deductions:</span>
                          <div className="text-right">
                            <span className="font-medium text-primary">
                              {formatCurrency(totalDeductions.toString())} <span className="text-sm text-gray-500">({calculatePercentage(totalDeductions)})</span>
                            </span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Taxable Income:</span>
                          <div className="text-right">
                            <span className="font-medium text-primary">
                              {formatCurrency(getFieldValue('26000'))} <span className="text-sm text-gray-500">({calculatePercentage(taxableIncome)})</span>
                            </span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Total Tax:</span>
                          <div className="text-right">
                            <span className="font-medium text-primary">
                              {formatCurrency(getFieldValue('43700'))} <span className="text-sm text-gray-500">({calculatePercentage(totalTax)})</span>
                            </span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Net Income:</span>
                          <div className="text-right">
                            <span className="font-medium text-primary">
                              {formatCurrency(netIncome.toString())} <span className="text-sm text-gray-500">({calculatePercentage(netIncome)})</span>
                            </span>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Marginal Rates */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h3 className="font-semibold text-primary mb-4">Marginal Rates</h3>
                <div className="space-y-3">
                  {(() => {
                    const totalIncome = parseFloat(getFieldValue('15000') || '0');
                    const province = getTextFieldValue('province');
                    
                    return (
                      <MarginalRateBreakdown 
                        income={totalIncome} 
                        province={province} 
                      />
                    );
                  })()}
                </div>
              </div>
            </div>


          </div>
        )}

        {activeTab === 'identification' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="field-row">
                <span className="field-label">First Name:</span>
                <span className="field-value">{getTextFieldValue('first_name')}</span>
              </div>
              <div className="field-row">
                <span className="field-label">Last Name:</span>
                <span className="field-value">{getTextFieldValue('last_name')}</span>
              </div>
              <div className="field-row">
                <span className="field-label">Social Insurance Number:</span>
                <span className="field-value">{getTextFieldValue('sin')}</span>
              </div>
              <div className="field-row">
                <span className="field-label">Date of Birth:</span>
                <span className="field-value">{getTextFieldValue('date_of_birth')}</span>
              </div>
              <div className="field-row">
                <span className="field-label">Marital Status:</span>
                <span className="field-value">{getTextFieldValue('marital_status')}</span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="field-row">
                <span className="field-label">Address:</span>
                <span className="field-value">{getTextFieldValue('address_line1')}</span>
              </div>
              <div className="field-row">
                <span className="field-label">City:</span>
                <span className="field-value">{getTextFieldValue('city')}</span>
              </div>
              <div className="field-row">
                <span className="field-label">Postal Code:</span>
                <span className="field-value">{getTextFieldValue('postal_code')}</span>
              </div>
              <div className="field-row">
                <span className="field-label">Province:</span>
                <span className="field-value">{getTextFieldValue('province')}</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'income' && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-blue-800 mb-2">Income Sources</h3>
              <p className="text-blue-700 text-sm">All income reported on T1 tax return</p>
            </div>
            
            <div className="space-y-6">
              {/* Employment Income Section */}
              <div className="border border-gray-200 rounded-lg">
                <button
                  onClick={() => toggleSection('employment')}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
                >
                  <div className="flex items-center">
                    {collapsedSections.employment ? (
                      <ChevronRight className="h-4 w-4 mr-2" />
                    ) : (
                      <ChevronDown className="h-4 w-4 mr-2" />
                    )}
                    <h4 className="font-semibold text-secondary">Employment Income</h4>
                  </div>
                  <span className="font-medium text-primary">
                    {formatCurrency(getSectionTotal(['10100', '10105', '10120', '10130', '10400']))}
                  </span>
                </button>
                {!collapsedSections.employment && (
                  <div className="p-4 border-t border-gray-200 space-y-4">
                    <div className="field-row">
                      <span className="field-label">Employment Income (Line 10100):</span>
                      <span className="field-value">{formatCurrency(getFieldValue('10100'))}</span>
                    </div>
                    <div className="field-row">
                      <span className="field-label">Tax-Exempt Emergency Volunteer (Line 10105):</span>
                      <span className="field-value">{formatCurrency(getFieldValue('10105'))}</span>
                    </div>
                    <div className="field-row">
                      <span className="field-label">Commissions Included (Line 10120):</span>
                      <span className="field-value">{formatCurrency(getFieldValue('10120'))}</span>
                    </div>
                    <div className="field-row">
                      <span className="field-label">Wage Loss Replacement (Line 10130):</span>
                      <span className="field-value">{formatCurrency(getFieldValue('10130'))}</span>
                    </div>
                    <div className="field-row">
                      <span className="field-label">Other Employment Income (Line 10400):</span>
                      <span className="field-value">{formatCurrency(getFieldValue('10400'))}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Pension & Retirement Income Section */}
              <div className="border border-gray-200 rounded-lg">
                <button
                  onClick={() => toggleSection('pension')}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
                >
                  <div className="flex items-center">
                    {collapsedSections.pension ? (
                      <ChevronRight className="h-4 w-4 mr-2" />
                    ) : (
                      <ChevronDown className="h-4 w-4 mr-2" />
                    )}
                    <h4 className="font-semibold text-secondary">Pension & Retirement Income</h4>
                  </div>
                  <span className="font-medium text-primary">
                    {formatCurrency(getSectionTotal(['11300', '11400', '11500', '11600', '11700', '11701', '11800']))}
                  </span>
                </button>
                {!collapsedSections.pension && (
                  <div className="p-4 border-t border-gray-200 space-y-4">
                    <div className="field-row">
                      <span className="field-label">Old Age Security (Line 11300):</span>
                      <span className="field-value">{formatCurrency(getFieldValue('11300'))}</span>
                    </div>
                    <div className="field-row">
                      <span className="field-label">CPP/QPP Benefits (Line 11400):</span>
                      <span className="field-value">{formatCurrency(getFieldValue('11400'))}</span>
                    </div>
                    <div className="field-row">
                      <span className="field-label">Other Pensions (Line 11500):</span>
                      <span className="field-value">{formatCurrency(getFieldValue('11500'))}</span>
                    </div>
                    <div className="field-row">
                      <span className="field-label">Split Pension Amount (Line 11600):</span>
                      <span className="field-value">{formatCurrency(getFieldValue('11600'))}</span>
                    </div>
                    <div className="field-row">
                      <span className="field-label">Universal Child Care Benefit (Line 11700):</span>
                      <span className="field-value">{formatCurrency(getFieldValue('11700'))}</span>
                    </div>
                    <div className="field-row">
                      <span className="field-label">UCCB for Dependant (Line 11701):</span>
                      <span className="field-value">{formatCurrency(getFieldValue('11701'))}</span>
                    </div>
                    <div className="field-row">
                      <span className="field-label">Split Income (Line 11800):</span>
                      <span className="field-value">{formatCurrency(getFieldValue('11800'))}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Government Benefits Section */}
              <div className="border border-gray-200 rounded-lg">
                <button
                  onClick={() => toggleSection('government')}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
                >
                  <div className="flex items-center">
                    {collapsedSections.government ? (
                      <ChevronRight className="h-4 w-4 mr-2" />
                    ) : (
                      <ChevronDown className="h-4 w-4 mr-2" />
                    )}
                    <h4 className="font-semibold text-secondary">Government Benefits</h4>
                  </div>
                  <span className="font-medium text-primary">
                    {formatCurrency(getSectionTotal(['11900', '11905']))}
                  </span>
                </button>
                {!collapsedSections.government && (
                  <div className="p-4 border-t border-gray-200 space-y-4">
                    <div className="field-row">
                      <span className="field-label">Employment Insurance (Line 11900):</span>
                      <span className="field-value">{formatCurrency(getFieldValue('11900'))}</span>
                    </div>
                    <div className="field-row">
                      <span className="field-label">EI Maternity/Parental (Line 11905):</span>
                      <span className="field-value">{formatCurrency(getFieldValue('11905'))}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Investment Income Section */}
              <div className="border border-gray-200 rounded-lg">
                <button
                  onClick={() => toggleSection('investment')}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
                >
                  <div className="flex items-center">
                    {collapsedSections.investment ? (
                      <ChevronRight className="h-4 w-4 mr-2" />
                    ) : (
                      <ChevronDown className="h-4 w-4 mr-2" />
                    )}
                    <h4 className="font-semibold text-secondary">Investment Income</h4>
                  </div>
                  <span className="font-medium text-primary">
                    {formatCurrency(getSectionTotal(['12000', '12010', '12100', '12200', '12400']))}
                  </span>
                </button>
                {!collapsedSections.investment && (
                  <div className="p-4 border-t border-gray-200 space-y-4">
                    <div className="field-row">
                      <span className="field-label">Taxable Dividends - Eligible (Line 12000):</span>
                      <span className="field-value">{formatCurrency(getFieldValue('12000'))}</span>
                    </div>
                    <div className="field-row">
                      <span className="field-label">Taxable Dividends - Other (Line 12010):</span>
                      <span className="field-value">{formatCurrency(getFieldValue('12010'))}</span>
                    </div>
                    <div className="field-row">
                      <span className="field-label">Interest and Investment Income (Line 12100):</span>
                      <span className="field-value">{formatCurrency(getFieldValue('12100'))}</span>
                    </div>
                    <div className="field-row">
                      <span className="field-label">Partnership Income (Line 12200):</span>
                      <span className="field-value">{formatCurrency(getFieldValue('12200'))}</span>
                    </div>
                    <div className="field-row">
                      <span className="field-label">Foreign Dividends (Line 12400):</span>
                      <span className="field-value">{formatCurrency(getFieldValue('12400'))}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Other Income Section */}
              <div className="border border-gray-200 rounded-lg">
                <button
                  onClick={() => toggleSection('other')}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
                >
                  <div className="flex items-center">
                    {collapsedSections.other ? (
                      <ChevronRight className="h-4 w-4 mr-2" />
                    ) : (
                      <ChevronDown className="h-4 w-4 mr-2" />
                    )}
                    <h4 className="font-semibold text-secondary">Other Income</h4>
                  </div>
                  <span className="font-medium text-primary">
                    {formatCurrency(getSectionTotal(['12500', '12600', '12700', '12900', '12905', '12906', '13000', '13010']))}
                  </span>
                </button>
                {!collapsedSections.other && (
                  <div className="p-4 border-t border-gray-200 space-y-4">
                    <div className="field-row">
                      <span className="field-label">RDSP Income (Line 12500):</span>
                      <span className="field-value">{formatCurrency(getFieldValue('12500'))}</span>
                    </div>
                    <div className="field-row">
                      <span className="field-label">Rental Income (Line 12600):</span>
                      <span className="field-value">{formatCurrency(getFieldValue('12600'))}</span>
                    </div>
                    <div className="field-row">
                      <span className="field-label">Capital Gains (Line 12700):</span>
                      <span className="field-value">{formatCurrency(getFieldValue('12700'))}</span>
                    </div>
                    <div className="field-row">
                      <span className="field-label">RRSP Income (Line 12900):</span>
                      <span className="field-value">{formatCurrency(getFieldValue('12900'))}</span>
                    </div>
                    <div className="field-row">
                      <span className="field-label">FHSA Income (Line 12905):</span>
                      <span className="field-value">{formatCurrency(getFieldValue('12905'))}</span>
                    </div>
                    <div className="field-row">
                      <span className="field-label">FHSA Income - Other (Line 12906):</span>
                      <span className="field-value">{formatCurrency(getFieldValue('12906'))}</span>
                    </div>
                    <div className="field-row">
                      <span className="field-label">Other Income (Line 13000):</span>
                      <span className="field-value">{formatCurrency(getFieldValue('13000'))}</span>
                    </div>
                    <div className="field-row">
                      <span className="field-label">Scholarships (Line 13010):</span>
                      <span className="field-value">{formatCurrency(getFieldValue('13010'))}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Self-Employment Income Section */}
              <div className="border border-gray-200 rounded-lg">
                <button
                  onClick={() => toggleSection('selfemployment')}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
                >
                  <div className="flex items-center">
                    {collapsedSections.selfemployment ? (
                      <ChevronRight className="h-4 w-4 mr-2" />
                    ) : (
                      <ChevronDown className="h-4 w-4 mr-2" />
                    )}
                    <h4 className="font-semibold text-secondary">Self-Employment Income</h4>
                  </div>
                  <span className="font-medium text-primary">
                    {formatCurrency(getSectionTotal(['13499', '13500', '13700', '13900', '14100', '14300']))}
                  </span>
                </button>
                {!collapsedSections.selfemployment && (
                  <div className="p-4 border-t border-gray-200 space-y-4">
                    <div className="field-row">
                      <span className="field-label">Business Income (Line 13499):</span>
                      <span className="field-value">{formatCurrency(getFieldValue('13499'))}</span>
                    </div>
                    <div className="field-row">
                      <span className="field-label">Partnership Income (Line 13500):</span>
                      <span className="field-value">{formatCurrency(getFieldValue('13500'))}</span>
                    </div>
                    <div className="field-row">
                      <span className="field-label">Professional Income (Line 13700):</span>
                      <span className="field-value">{formatCurrency(getFieldValue('13700'))}</span>
                    </div>
                    <div className="field-row">
                      <span className="field-label">Commission Income (Line 13900):</span>
                      <span className="field-value">{formatCurrency(getFieldValue('13900'))}</span>
                    </div>
                    <div className="field-row">
                      <span className="field-label">Farming Income (Line 14100):</span>
                      <span className="field-value">{formatCurrency(getFieldValue('14100'))}</span>
                    </div>
                    <div className="field-row">
                      <span className="field-label">Fishing Income (Line 14300):</span>
                      <span className="field-value">{formatCurrency(getFieldValue('14300'))}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Other Sources Section */}
              <div className="border border-gray-200 rounded-lg">
                <button
                  onClick={() => toggleSection('othersources')}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
                >
                  <div className="flex items-center">
                    {collapsedSections.othersources ? (
                      <ChevronRight className="h-4 w-4 mr-2" />
                    ) : (
                      <ChevronDown className="h-4 w-4 mr-2" />
                    )}
                    <h4 className="font-semibold text-secondary">Other Sources</h4>
                  </div>
                  <span className="font-medium text-primary">
                    {formatCurrency(getSectionTotal(['14400', '14500', '14600']))}
                  </span>
                </button>
                {!collapsedSections.othersources && (
                  <div className="p-4 border-t border-gray-200 space-y-4">
                    <div className="field-row">
                      <span className="field-label">Workers' Compensation (Line 14400):</span>
                      <span className="field-value">{formatCurrency(getFieldValue('14400'))}</span>
                    </div>
                    <div className="field-row">
                      <span className="field-label">Social Assistance (Line 14500):</span>
                      <span className="field-value">{formatCurrency(getFieldValue('14500'))}</span>
                    </div>
                    <div className="field-row">
                      <span className="field-label">Net Federal Supplements (Line 14600):</span>
                      <span className="field-value">{formatCurrency(getFieldValue('14600'))}</span>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Total Income Summary */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex justify-between">
                  <span className="font-semibold text-green-800">Total Income (Line 15000):</span>
                  <span className="font-bold text-green-600 text-lg">
                    {formatCurrency(getFieldValue('15000'))}
                  </span>
                </div>
                <p className="text-green-700 text-sm mt-1">Sum of all income sources</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'deductions' && (
          <div className="space-y-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-yellow-800 mb-2">Deductions from Income</h3>
              <p className="text-yellow-700 text-sm">Federal and provincial deductions that reduce taxable income</p>
            </div>
            
            <div className="space-y-4">
              {/* Retirement Plan Deductions Section */}
              <div className="border border-gray-200 rounded-lg">
                <button
                  onClick={() => toggleSection('retirement-plan-deductions')}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
                >
                  <div className="flex items-center">
                    {collapsedSections['retirement-plan-deductions'] ? (
                      <ChevronRight className="h-4 w-4 mr-2" />
                    ) : (
                      <ChevronDown className="h-4 w-4 mr-2" />
                    )}
                    <h4 className="font-semibold text-secondary">Retirement Plan Deductions</h4>
                  </div>
                  <span className="font-medium text-primary">
                    {formatCurrency(getSectionTotal(['20700', '20800', '20805', '20810']))}
                  </span>
                </button>
                {!collapsedSections['retirement-plan-deductions'] && (
                  <div className="p-4 border-t border-gray-200 space-y-4">
                    <div className="field-row">
                      <span className="field-label">Pension Adjustment (Line 20600):</span>
                      <span className="field-value">{formatCurrency(getFieldValue('20600'))}</span>
                    </div>
                    <div className="field-row">
                      <span className="field-label">Registered Pension Plan Deduction (Line 20700):</span>
                      <span className="field-value">{formatCurrency(getFieldValue('20700'))}</span>
                    </div>
                    <div className="field-row">
                      <span className="field-label">RRSP Deduction (Line 20800):</span>
                      <span className="field-value">{formatCurrency(getFieldValue('20800'))}</span>
                    </div>
                    <div className="field-row">
                      <span className="field-label">FHSA Deduction (Line 20805):</span>
                      <span className="field-value">{formatCurrency(getFieldValue('20805'))}</span>
                    </div>
                    <div className="field-row">
                      <span className="field-label">PRPP Employer Contributions (Line 20810):</span>
                      <span className="field-value">{formatCurrency(getFieldValue('20810'))}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Personal Deductions Section */}
              <div className="border border-gray-200 rounded-lg">
                <button
                  onClick={() => toggleSection('personal-deductions')}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
                >
                  <div className="flex items-center">
                    {collapsedSections['personal-deductions'] ? (
                      <ChevronRight className="h-4 w-4 mr-2" />
                    ) : (
                      <ChevronDown className="h-4 w-4 mr-2" />
                    )}
                    <h4 className="font-semibold text-secondary">Personal Deductions</h4>
                  </div>
                  <span className="font-medium text-primary">
                    {formatCurrency(getSectionTotal(['21000', '21200', '21300', '21400', '21500', '21700', '21900']))}
                  </span>
                </button>
                {!collapsedSections['personal-deductions'] && (
                  <div className="p-4 border-t border-gray-200 space-y-4">
                    <div className="field-row">
                      <span className="field-label">Split Pension Deduction (Line 21000):</span>
                      <span className="field-value">{formatCurrency(getFieldValue('21000'))}</span>
                    </div>
                    <div className="field-row">
                      <span className="field-label">Annual Union Dues (Line 21200):</span>
                      <span className="field-value">{formatCurrency(getFieldValue('21200'))}</span>
                    </div>
                    <div className="field-row">
                      <span className="field-label">UCCB Repayment (Line 21300):</span>
                      <span className="field-value">{formatCurrency(getFieldValue('21300'))}</span>
                    </div>
                    <div className="field-row">
                      <span className="field-label">Child Care Expenses (Line 21400):</span>
                      <span className="field-value">{formatCurrency(getFieldValue('21400'))}</span>
                    </div>
                    <div className="field-row">
                      <span className="field-label">Disability Supports (Line 21500):</span>
                      <span className="field-value">{formatCurrency(getFieldValue('21500'))}</span>
                    </div>
                    <div className="field-row">
                      <span className="field-label">Business Investment Loss (Line 21700):</span>
                      <span className="field-value">{formatCurrency(getFieldValue('21700'))}</span>
                    </div>
                    <div className="field-row">
                      <span className="field-label">Moving Expenses (Line 21900):</span>
                      <span className="field-value">{formatCurrency(getFieldValue('21900'))}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Support and Investment Deductions Section */}
              <div className="border border-gray-200 rounded-lg">
                <button
                  onClick={() => toggleSection('support-investment-deductions')}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
                >
                  <div className="flex items-center">
                    {collapsedSections['support-investment-deductions'] ? (
                      <ChevronRight className="h-4 w-4 mr-2" />
                    ) : (
                      <ChevronDown className="h-4 w-4 mr-2" />
                    )}
                    <h4 className="font-semibold text-secondary">Support & Investment Deductions</h4>
                  </div>
                  <span className="font-medium text-primary">
                    {formatCurrency(getSectionTotal(['21999', '22000', '22100', '22200', '22215']))}
                  </span>
                </button>
                {!collapsedSections['support-investment-deductions'] && (
                  <div className="p-4 border-t border-gray-200 space-y-4">
                    <div className="field-row">
                      <span className="field-label">Support Payments Total (Line 21999):</span>
                      <span className="field-value">{formatCurrency(getFieldValue('21999'))}</span>
                    </div>
                    <div className="field-row">
                      <span className="field-label">Support Payments Allowable (Line 22000):</span>
                      <span className="field-value">{formatCurrency(getFieldValue('22000'))}</span>
                    </div>
                    <div className="field-row">
                      <span className="field-label">Carrying Charges (Line 22100):</span>
                      <span className="field-value">{formatCurrency(getFieldValue('22100'))}</span>
                    </div>
                    <div className="field-row">
                      <span className="field-label">CPP/QPP Self-Employed (Line 22200):</span>
                      <span className="field-value">{formatCurrency(getFieldValue('22200'))}</span>
                    </div>
                    <div className="field-row">
                      <span className="field-label">CPP/QPP Enhanced (Line 22215):</span>
                      <span className="field-value">{formatCurrency(getFieldValue('22215'))}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Employment Deductions Section */}
              <div className="border border-gray-200 rounded-lg">
                <button
                  onClick={() => toggleSection('employment-deductions')}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
                >
                  <div className="flex items-center">
                    {collapsedSections['employment-deductions'] ? (
                      <ChevronRight className="h-4 w-4 mr-2" />
                    ) : (
                      <ChevronDown className="h-4 w-4 mr-2" />
                    )}
                    <h4 className="font-semibold text-secondary">Employment Deductions</h4>
                  </div>
                  <span className="font-medium text-primary">
                    {formatCurrency(getSectionTotal(['22900', '23100']))}
                  </span>
                </button>
                {!collapsedSections['employment-deductions'] && (
                  <div className="p-4 border-t border-gray-200 space-y-4">
                    <div className="field-row">
                      <span className="field-label">Other Employment Expenses (Line 22900):</span>
                      <span className="field-value">{formatCurrency(getFieldValue('22900'))}</span>
                    </div>
                    <div className="field-row">
                      <span className="field-label">Clergy Residence (Line 23100):</span>
                      <span className="field-value">{formatCurrency(getFieldValue('23100'))}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Specialized Deductions Section */}
              <div className="border border-gray-200 rounded-lg">
                <button
                  onClick={() => toggleSection('specialized-deductions')}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
                >
                  <div className="flex items-center">
                    {collapsedSections['specialized-deductions'] ? (
                      <ChevronRight className="h-4 w-4 mr-2" />
                    ) : (
                      <ChevronDown className="h-4 w-4 mr-2" />
                    )}
                    <h4 className="font-semibold text-secondary">Specialized Deductions</h4>
                  </div>
                  <span className="font-medium text-primary">
                    {formatCurrency(getSectionTotal(['22400', '23200', '23500']))}
                  </span>
                </button>
                {!collapsedSections['specialized-deductions'] && (
                  <div className="p-4 border-t border-gray-200 space-y-4">
                    <div className="field-row">
                      <span className="field-label">Exploration Development (Line 22400):</span>
                      <span className="field-value">{formatCurrency(getFieldValue('22400'))}</span>
                    </div>
                    <div className="field-row">
                      <span className="field-label">Other Deductions (Line 23200):</span>
                      <span className="field-value">{formatCurrency(getFieldValue('23200'))}</span>
                    </div>
                    <div className="field-row">
                      <span className="field-label">Social Benefits Repayment (Line 23500):</span>
                      <span className="field-value">{formatCurrency(getFieldValue('23500'))}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Provincial Deductions Section */}
              <div className="border border-gray-200 rounded-lg">
                <button
                  onClick={() => toggleSection('provincial-deductions')}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
                >
                  <div className="flex items-center">
                    {collapsedSections['provincial-deductions'] ? (
                      <ChevronRight className="h-4 w-4 mr-2" />
                    ) : (
                      <ChevronDown className="h-4 w-4 mr-2" />
                    )}
                    <h4 className="font-semibold text-secondary">Provincial Deductions (Ontario)</h4>
                  </div>
                  <span className="font-medium text-primary">
                    {formatCurrency(getSectionTotal(['61000', '61100', '61200', '61300', '61400', '61500']))}
                  </span>
                </button>
                {!collapsedSections['provincial-deductions'] && (
                  <div className="p-4 border-t border-gray-200 space-y-4">
                    <div className="field-row">
                      <span className="field-label">Ontario Health Premium (Line 61000):</span>
                      <span className="field-value">{formatCurrency(getFieldValue('61000'))}</span>
                    </div>
                    <div className="field-row">
                      <span className="field-label">Ontario Volunteer Firefighter (Line 61100):</span>
                      <span className="field-value">{formatCurrency(getFieldValue('61100'))}</span>
                    </div>
                    <div className="field-row">
                      <span className="field-label">Ontario Employee Home Relocation (Line 61200):</span>
                      <span className="field-value">{formatCurrency(getFieldValue('61200'))}</span>
                    </div>
                    <div className="field-row">
                      <span className="field-label">Ontario Mining Exploration (Line 61300):</span>
                      <span className="field-value">{formatCurrency(getFieldValue('61300'))}</span>
                    </div>
                    <div className="field-row">
                      <span className="field-label">Ontario Political Contribution (Line 61400):</span>
                      <span className="field-value">{formatCurrency(getFieldValue('61400'))}</span>
                    </div>
                    <div className="field-row">
                      <span className="field-label">Ontario Flow-Through Share (Line 61500):</span>
                      <span className="field-value">{formatCurrency(getFieldValue('61500'))}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Summary Section */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="font-semibold text-green-800">Total Income</div>
                    <div className="text-lg font-bold text-green-600">
                      {formatCurrency(getFieldValue('15000'))}
                    </div>
                    <div className="text-sm text-green-700">Line 15000</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-green-800">Total Deductions</div>
                    <div className="text-lg font-bold text-green-600">
                      {formatCurrency(getFieldValue('23300'))}
                    </div>
                    <div className="text-sm text-green-700">Line 23300</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-green-800">Net Income</div>
                    <div className="text-xl font-bold text-green-600">
                      {formatCurrency(getFieldValue('23600'))}
                    </div>
                    <div className="text-sm text-green-700">Line 23600</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'credits' && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-blue-800 mb-2">Non-Refundable Tax Credits</h3>
              <p className="text-blue-700 text-sm">Federal and provincial tax credits that reduce taxes payable</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h4 className="font-semibold text-secondary border-b pb-2">Federal Tax Credits</h4>
                <div className="field-row">
                  <span className="field-label">Basic Personal Amount (Line 30000):</span>
                  <span className="field-value">{formatCurrency(getFieldValue('30000'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Age Amount (Line 30100):</span>
                  <span className="field-value">{formatCurrency(getFieldValue('30100'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Spouse Amount (Line 30300):</span>
                  <span className="field-value">{formatCurrency(getFieldValue('30300'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">CPP/QPP Contributions (Line 30800):</span>
                  <span className="field-value">{formatCurrency(getFieldValue('30800'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">EI Premiums (Line 31200):</span>
                  <span className="field-value">{formatCurrency(getFieldValue('31200'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Canada Employment Amount (Line 31220):</span>
                  <span className="field-value">{formatCurrency(getFieldValue('31220'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Tuition & Education (Line 32300):</span>
                  <span className="field-value">{formatCurrency(getFieldValue('32300'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Medical Expenses (Line 33000):</span>
                  <span className="field-value">{formatCurrency(getFieldValue('33000'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Donations & Gifts (Line 34900):</span>
                  <span className="field-value">{formatCurrency(getFieldValue('34900'))}</span>
                </div>
                
                <div className="bg-accent-light p-3 rounded-lg">
                  <div className="flex justify-between">
                    <span className="font-medium text-secondary">Federal Tax Credits:</span>
                    <span className="font-bold text-accent text-lg">
                      {formatCurrency(getFieldValue('35000'))}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-semibold text-secondary border-b pb-2">Ontario Provincial Tax Credits</h4>
                <div className="field-row">
                  <span className="field-label">Ontario Basic Personal Amount (Line 58040):</span>
                  <span className="field-value">{formatCurrency(getFieldValue('58040'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Ontario Age Amount (Line 58080):</span>
                  <span className="field-value">{formatCurrency(getFieldValue('58080'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Ontario Spouse Amount (Line 58120):</span>
                  <span className="field-value">{formatCurrency(getFieldValue('58120'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Ontario CPP/QPP Contributions (Line 58240):</span>
                  <span className="field-value">{formatCurrency(getFieldValue('58240'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Ontario EI Premiums (Line 58300):</span>
                  <span className="field-value">{formatCurrency(getFieldValue('58300'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Ontario Medical Expenses (Line 58689):</span>
                  <span className="field-value">{formatCurrency(getFieldValue('58689'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Ontario Donations & Gifts (Line 58729):</span>
                  <span className="field-value">{formatCurrency(getFieldValue('58729'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Ontario Tuition & Education (Line 58560):</span>
                  <span className="field-value">{formatCurrency(getFieldValue('58560'))}</span>
                </div>
                
                <div className="bg-accent-light p-3 rounded-lg">
                  <div className="flex justify-between">
                    <span className="font-medium text-secondary">Ontario Tax Credits:</span>
                    <span className="font-bold text-accent text-lg">
                      {formatCurrency(getFieldValue('58800'))}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'taxes' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-secondary mb-4">Federal Tax Calculation</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="field-row">
                    <span className="field-label">Taxable Income (Line 26000):</span>
                    <span className="field-value">{formatCurrency(getFieldValue('26000'))}</span>
                  </div>
                  <div className="field-row">
                    <span className="field-label">Federal Tax (Line 40400):</span>
                    <span className="field-value">{formatCurrency(getFieldValue('40400'))}</span>
                  </div>
                  <div className="field-row">
                    <span className="field-label">Basic Federal Tax (Line 41000):</span>
                    <span className="field-value">{formatCurrency(getFieldValue('41000'))}</span>
                  </div>
                  <div className="field-row font-semibold border-t pt-2">
                    <span className="field-label">Net Federal Tax (Line 42000):</span>
                    <span className="field-value">{formatCurrency(getFieldValue('42000'))}</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="field-row">
                    <span className="field-label">Total Income Tax Deducted (Line 43700):</span>
                    <span className="field-value">{formatCurrency(getFieldValue('43700'))}</span>
                  </div>
                  <div className="field-row">
                    <span className="field-label">CPP Overpayment (Line 44800):</span>
                    <span className="field-value">{formatCurrency(getFieldValue('44800'))}</span>
                  </div>
                  <div className="field-row">
                    <span className="field-label">EI Overpayment (Line 45000):</span>
                    <span className="field-value">{formatCurrency(getFieldValue('45000'))}</span>
                  </div>
                  <div className="field-row font-semibold border-t pt-2 text-lg">
                    <span className="field-label">Refund/Balance Owing (Line 48400):</span>
                    <span className="field-value">{formatCurrency(getFieldValue('48400'))}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}


      </div>
      
      <T1FieldEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        t1Return={t1Return}
      />
    </div>
  );
}
