import { useState } from "react";
import { CheckCircle, Edit, FileText, DollarSign, Calculator, User, File, ChevronDown, ChevronRight, Minus, Plus, Building2, TrendingUp } from "lucide-react";
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

type TabType = 'summary' | 'income' | 'deductions' | 'credits' | 'taxes' | 'accounts' | 'identification';

export default function ExtractedDataDisplay({ t1Return }: ExtractedDataDisplayProps) {
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    'employment': true,
    'pension': true,
    'benefits': true,
    'investment': true,
    'registered-account': true,
    'other': true,
    'self-employment': true,
    'other-sources': true,
    // Deduction sections
    'retirement-plan-deductions': true,
    'personal-deductions': true,
    'employment-deductions': true,
    'support-investment-deductions': true,
    'specialized-deductions': true,
    'provincial-deductions': true,
    // Credit sections
    'basic-credits': true,
    'employment-credits': true,
    'personal-situation-credits-new': true,
    'disability-caregiver-credits': true,
    'education-credits': true,
    'education-medical-credits': true,
    'charitable-gifts-donations-credits': true,
    'ontario-credits': true,
    'refundable-credits': true,
    'ontario-refundable-credits': true,
    // Account sections
    'rrsp-section': true,
    'tfsa-section': true,
    'fhsa-section': true,
    'resp-section': true,
    'rdsp-section': true,
    'capital-loss-section': true,
    'amt-section': true
  });
  const { toast } = useToast();



  const generateReportMutation = useMutation({
    mutationFn: () => {
      if (!t1Return.clientId) throw new Error('Client ID is required');
      return HouseholdAPI.generateClientAuditReport(t1Return.clientId);
    },
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const clientName = t1Return.client ? `${t1Return.client.firstName}-${t1Return.client.lastName}` : 'client';
      a.download = `audit-report-${clientName}-${t1Return.taxYear}.pdf`;
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

  const formatCurrency = (value: string | number | null | undefined): string => {
    if (!value) return '$0.00';
    const num = typeof value === 'number' ? value : parseFloat(value);
    return `$${num.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getFieldValue = (fieldCode: string): string => {
    const field = currencyFields.find(f => f.fieldCode === fieldCode);
    return field?.fieldValue || '0';
  };

  // For household-level fields (like RESP), these are shared across all household members
  const getHouseholdFieldValue = (fieldType: string): string => {
    // For now, these are placeholder values that would come from household-level data
    
    // These values would normally come from a household-level data source
    // For now, returning consistent values that will be the same for both household members
    const householdFields = {
      'resp_total_grant': '0',
      'resp_grant_room_2024': '0', 
      'resp_grant_remaining': '0',
      'resp_account_balance': '0',
      'resp_contribution_room': '0',
      'resp_2024_contribution': '0',
      'resp_clb_received': '0',
      'resp_clb_room_2024': '0',
      'resp_clb_remaining': '0',
      'rrsp_account_balance': '0',
      'rrsp_contribution_room': '0',
      'tfsa_account_balance': '0',
      'tfsa_contribution_room': '0',
      'tfsa_2024_contribution': '0',
      'fhsa_account_balance': '0',
      'fhsa_contribution_room': '0',
      'rdsp_account_balance': '0',
      'rdsp_contribution_room': '0',
      'rdsp_2024_contribution': '0',
      'rdsp_cdsg_received': '0',
      'rdsp_cdsg_room_2024': '0',
      'rdsp_cdsg_remaining': '0',
      'rdsp_cdsb_received': '0',
      'rdsp_cdsb_room_2024': '0',
      'rdsp_cdsb_remaining': '0',
      'capital_loss_available': '0',
      'hbp_balance': '0',
      'hbp_required_2024': '0',
      'llp_balance': '0',
      'llp_required_2024': '0'
    };
    
    return householdFields[fieldType as keyof typeof householdFields] || '0';
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

  const handleTabChange = (tabId: TabType) => {
    // If switching to income tab, reset all income sections to collapsed
    if (tabId === 'income') {
      setCollapsedSections(prev => ({
        ...prev,
        'employment': true,
        'pension': true,
        'government': true,
        'investment': true,
        'registered-account': true,
        'other': true,
        'selfemployment': true,
        'othersources': true,
      }));
    }
    setActiveTab(tabId);
  };

  const getSectionTotal = (fieldCodes: string[]): number => {
    return fieldCodes.reduce((total, code) => {
      const value = parseFloat(getFieldValue(code) || '0');
      return total + value;
    }, 0);
  };

  const getTotalDeductions = (): number => {
    // Calculate total deductions by summing all sub-category totals
    const retirementPlanTotal = getSectionTotal(['20700', '20800', '20805', '20810']);
    const personalTotal = getSectionTotal(['21000', '21200', '21300', '21400', '21500', '21700', '21900']);
    const supportInvestmentTotal = getSectionTotal(['21999', '22000', '22100', '22200', '22215']);
    const employmentTotal = getSectionTotal(['22900', '23100']);
    const specializedTotal = getSectionTotal(['22400', '23200', '23500']);
    
    return retirementPlanTotal + personalTotal + supportInvestmentTotal + employmentTotal + specializedTotal;
  };

  const getTotalCredits = (): number => {
    // Calculate total federal credits by summing all federal credit categories
    const basicCreditsTotal = getSectionTotal(['30000', '30100', '30300', '30400', '30450']);
    const employmentCreditsTotal = getSectionTotal(['30800', '31200', '31220', '31400']);
    const personalSituationTotal = getSectionTotal(['31500', '31600', '31800', '31850']);
    const educationCreditsTotal = getSectionTotal(['31900', '32300', '32400', '32600']);
    const medicalOtherTotal = getSectionTotal(['33000', '33099', '33199', '34900']);
    
    return basicCreditsTotal + employmentCreditsTotal + personalSituationTotal + educationCreditsTotal + medicalOtherTotal;
  };

  const getTotalRefundableCredits = (): number => {
    // Calculate total refundable credits by summing all refundable credit lines
    return getSectionTotal(['44000', '44800', '45000', '45200', '45300', '45350', '45355', '45400', '45600', '45700', '46900', '47555', '47556']);
  };

  const getClientProvince = (): string => {
    // Get province from client data or from extracted personal info
    if (t1Return.client?.province) {
      return t1Return.client.province;
    }
    // Fallback to extracted province from T1 form
    const provinceField = t1Return.formFields.find(field => field.fieldCode === 'province' || field.fieldName === 'Province');
    return provinceField?.fieldValue || 'ON'; // Default to Ontario if not found
  };

  const getRefundOrBalance = (): number => {
    // Calculate refund/balance: Taxes Paid (43700) - Total Tax (42000 + 42800)
    // Positive = Refund, Negative = Balance Due
    const taxesPaid = parseFloat(getFieldValue('43700')) || 0;
    const federalTax = parseFloat(getFieldValue('42000')) || 0;
    const provincialTax = parseFloat(getFieldValue('42800')) || 0;
    const totalTax = federalTax + provincialTax;
    return taxesPaid - totalTax;
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
    { id: 'income' as TabType, label: 'Income', icon: TrendingUp },
    { id: 'deductions' as TabType, label: 'Deductions', icon: Minus },
    { id: 'credits' as TabType, label: 'Credits', icon: Plus },
    { id: 'taxes' as TabType, label: 'Taxes', icon: Building2 },
    { id: 'accounts' as TabType, label: 'Accounts', icon: TrendingUp },
    { id: 'identification' as TabType, label: 'Identification', icon: User },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-primary">
          {t1Return.client ? `${t1Return.client.firstName} ${t1Return.client.lastName}` : 'Client'} - {getTextFieldValue('province')} - {t1Return.taxYear}
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
            {formatCurrency(
              (parseFloat(getFieldValue('42000')) || 0) + (parseFloat(getFieldValue('42800')) || 0)
            )}
          </p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium text-primary mb-2">Average Rate</h3>
          <p className="text-lg font-semibold text-primary">
            {(() => {
              const totalIncome = parseFloat(getFieldValue('15000') || '0');
              // Use calculated total tax (federal + provincial) since 43500 isn't extracted
              const federalTax = parseFloat(getFieldValue('42000') || '0');
              const provincialTax = parseFloat(getFieldValue('42800') || '0');
              const totalTax = federalTax + provincialTax;
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
                onClick={() => handleTabChange(tab.id)}
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
                    // Calculate total tax using fallback: federal + provincial (since 43500 isn't extracted)
                    const federalTax = parseFloat(getFieldValue('42000') || '0');
                    const provincialTax = parseFloat(getFieldValue('42800') || '0');
                    const totalTax = federalTax + provincialTax;
                    const displayedTotalTax = totalTax;
                    const netIncome = totalIncome - displayedTotalTax;
                    
                    const calculatePercentage = (amount: number) => {
                      if (totalIncome === 0) return '0.0%';
                      return `${((amount / totalIncome) * 100).toFixed(2)}%`;
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
                              {formatCurrency(totalTax.toString())} <span className="text-sm text-gray-500">({calculatePercentage(totalTax)})</span>
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
                        t1ReturnId={t1Return.id}
                      />
                    );
                  })()}
                </div>
              </div>
            </div>


          </div>
        )}

        {activeTab === 'accounts' && (
          <div className="space-y-6">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-purple-800 mb-2">Investment & Savings Accounts</h3>
              <p className="text-purple-700 text-sm">Registered accounts, contribution room, and capital loss information</p>
            </div>
            
            {/* RRSP/RRIF Section */}
            <div className="mt-6">
              <button
                onClick={() => toggleSection('rrsp-section')}
                className="w-full flex items-center justify-between font-semibold text-secondary border-b pb-2 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center">
                  {collapsedSections['rrsp-section'] ? <ChevronRight className="h-4 w-4 mr-2" /> : <ChevronDown className="h-4 w-4 mr-2" />}
                  <span>RRSP/RRIF</span>
                </div>
                <span className="text-primary font-medium">
                  {formatCurrency(getFieldValue("20800"))}
                </span>
              </button>
              {!collapsedSections['rrsp-section'] && (
                <div className="mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex justify-between items-center py-2">
                      <span className="font-medium text-primary">Account Balance:</span>
                      <div className="text-right">
                        <span className="font-medium text-primary">$0.00</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="font-medium text-primary">Contribution Room:</span>
                      <div className="text-right">
                        <span className="font-medium text-primary">$0.00</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="font-medium text-primary">2024 Contribution:</span>
                      <div className="text-right">
                        <span className="font-medium text-primary">{formatCurrency(getFieldValue("20800"))}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="font-medium text-primary">HBP Balance:</span>
                      <div className="text-right">
                        <span className="font-medium text-primary">{formatCurrency(getHouseholdFieldValue('hbp_balance'))}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="font-medium text-primary">2024 HBP Required:</span>
                      <div className="text-right">
                        <span className="font-medium text-primary">{formatCurrency(getHouseholdFieldValue('hbp_required_2024'))}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="font-medium text-primary">2024 HBP Repaid:</span>
                      <div className="text-right">
                        <span className="font-medium text-primary">{formatCurrency(getFieldValue('24600'))}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="font-medium text-primary">LLP Balance:</span>
                      <div className="text-right">
                        <span className="font-medium text-primary">{formatCurrency(getHouseholdFieldValue('llp_balance'))}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="font-medium text-primary">2024 LLP Required:</span>
                      <div className="text-right">
                        <span className="font-medium text-primary">{formatCurrency(getHouseholdFieldValue('llp_required_2024'))}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="font-medium text-primary">2024 LLP Repaid:</span>
                      <div className="text-right">
                        <span className="font-medium text-primary">{formatCurrency(getFieldValue('24630'))}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* TFSA Section */}
            <div className="mt-6">
              <button
                onClick={() => toggleSection('tfsa-section')}
                className="w-full flex items-center justify-between font-semibold text-secondary border-b pb-2 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center">
                  {collapsedSections['tfsa-section'] ? <ChevronRight className="h-4 w-4 mr-2" /> : <ChevronDown className="h-4 w-4 mr-2" />}
                  <span>TFSA</span>
                </div>
                <span className="text-gray-400">
                  $0.00
                </span>
              </button>
              {!collapsedSections['tfsa-section'] && (
                <div className="mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex justify-between items-center py-2">
                      <span className="font-medium text-primary">Account Balance:</span>
                      <div className="text-right">
                        <span className="font-medium text-primary">$0.00</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="font-medium text-primary">Contribution Room:</span>
                      <div className="text-right">
                        <span className="font-medium text-primary">$0.00</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="font-medium text-primary">2024 Contribution:</span>
                      <div className="text-right">
                        <span className="font-medium text-primary">$0.00</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* FHSA Section */}
            <div className="mt-6">
              <button
                onClick={() => toggleSection('fhsa-section')}
                className="w-full flex items-center justify-between font-semibold text-secondary border-b pb-2 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center">
                  {collapsedSections['fhsa-section'] ? <ChevronRight className="h-4 w-4 mr-2" /> : <ChevronDown className="h-4 w-4 mr-2" />}
                  <span>FHSA</span>
                </div>
                <span className="text-primary font-medium">
                  {formatCurrency(getFieldValue("20805"))}
                </span>
              </button>
              {!collapsedSections['fhsa-section'] && (
                <div className="mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex justify-between items-center py-2">
                      <span className="font-medium text-primary">Account Balance:</span>
                      <div className="text-right">
                        <span className="font-medium text-primary">$0.00</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="font-medium text-primary">Contribution Room:</span>
                      <div className="text-right">
                        <span className="font-medium text-primary">$0.00</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="font-medium text-primary">2024 Contribution:</span>
                      <div className="text-right">
                        <span className="font-medium text-primary">{formatCurrency(getFieldValue("20805"))}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* RESP Section */}
            <div className="mt-6">
              <button
                onClick={() => toggleSection('resp-section')}
                className="w-full flex items-center justify-between font-semibold text-secondary border-b pb-2 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center">
                  {collapsedSections['resp-section'] ? <ChevronRight className="h-4 w-4 mr-2" /> : <ChevronDown className="h-4 w-4 mr-2" />}
                  <span>RESP</span>
                </div>
                <span className="text-gray-400">
                  $0.00
                </span>
              </button>
              {!collapsedSections['resp-section'] && (
                <div className="mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex justify-between items-center py-2">
                      <span className="font-medium text-primary">Account Balance:</span>
                      <div className="text-right">
                        <span className="font-medium text-primary">{formatCurrency(getHouseholdFieldValue('resp_account_balance'))}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="font-medium text-primary">Contribution Room:</span>
                      <div className="text-right">
                        <span className="font-medium text-primary">{formatCurrency(getHouseholdFieldValue('resp_contribution_room'))}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="font-medium text-primary">2024 Contribution:</span>
                      <div className="text-right">
                        <span className="font-medium text-primary">{formatCurrency(getHouseholdFieldValue('resp_2024_contribution'))}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="font-medium text-primary">Total CESG Received:</span>
                      <div className="text-right">
                        <span className="font-medium text-primary">{formatCurrency(getHouseholdFieldValue('resp_total_grant'))}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="font-medium text-primary">CESG Room 2024:</span>
                      <div className="text-right">
                        <span className="font-medium text-primary">{formatCurrency(getHouseholdFieldValue('resp_grant_room_2024'))}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="font-medium text-primary">CESG Remaining:</span>
                      <div className="text-right">
                        <span className="font-medium text-primary">{formatCurrency(getHouseholdFieldValue('resp_grant_remaining'))}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="font-medium text-primary">Total CLB Received:</span>
                      <div className="text-right">
                        <span className="font-medium text-primary">{formatCurrency(getHouseholdFieldValue('resp_clb_received'))}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="font-medium text-primary">CLB Room 2024:</span>
                      <div className="text-right">
                        <span className="font-medium text-primary">{formatCurrency(getHouseholdFieldValue('resp_clb_room_2024'))}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="font-medium text-primary">CLB Remaining:</span>
                      <div className="text-right">
                        <span className="font-medium text-primary">{formatCurrency(getHouseholdFieldValue('resp_clb_remaining'))}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* RDSP Section */}
            <div className="mt-6">
              <button
                onClick={() => toggleSection('rdsp-section')}
                className="w-full flex items-center justify-between font-semibold text-secondary border-b pb-2 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center">
                  {collapsedSections['rdsp-section'] ? <ChevronRight className="h-4 w-4 mr-2" /> : <ChevronDown className="h-4 w-4 mr-2" />}
                  <span>RDSP</span>
                </div>
                <span className="text-gray-400">
                  $0.00
                </span>
              </button>
              {!collapsedSections['rdsp-section'] && (
                <div className="mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex justify-between items-center py-2">
                      <span className="font-medium text-primary">Account Balance:</span>
                      <div className="text-right">
                        <span className="font-medium text-primary">$0.00</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="font-medium text-primary">Contribution Room:</span>
                      <div className="text-right">
                        <span className="font-medium text-primary">$0.00</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="font-medium text-primary">2024 Contribution:</span>
                      <div className="text-right">
                        <span className="font-medium text-primary">$0.00</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="font-medium text-primary">Total CDSG Received:</span>
                      <div className="text-right">
                        <span className="font-medium text-primary">{formatCurrency(getHouseholdFieldValue('rdsp_cdsg_received'))}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="font-medium text-primary">CDSG Room 2024:</span>
                      <div className="text-right">
                        <span className="font-medium text-primary">{formatCurrency(getHouseholdFieldValue('rdsp_cdsg_room_2024'))}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="font-medium text-primary">CDSG Remaining:</span>
                      <div className="text-right">
                        <span className="font-medium text-primary">{formatCurrency(getHouseholdFieldValue('rdsp_cdsg_remaining'))}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="font-medium text-primary">Total CDSB Received:</span>
                      <div className="text-right">
                        <span className="font-medium text-primary">{formatCurrency(getHouseholdFieldValue('rdsp_cdsb_received'))}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="font-medium text-primary">CDSB Room 2024:</span>
                      <div className="text-right">
                        <span className="font-medium text-primary">{formatCurrency(getHouseholdFieldValue('rdsp_cdsb_room_2024'))}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="font-medium text-primary">CDSB Remaining:</span>
                      <div className="text-right">
                        <span className="font-medium text-primary">{formatCurrency(getHouseholdFieldValue('rdsp_cdsb_remaining'))}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Capital Loss Carry Forwards Section */}
            <div className="mt-6">
              <button
                onClick={() => toggleSection('capital-loss-section')}
                className="w-full flex items-center justify-between font-semibold text-secondary border-b pb-2 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center">
                  {collapsedSections['capital-loss-section'] ? <ChevronRight className="h-4 w-4 mr-2" /> : <ChevronDown className="h-4 w-4 mr-2" />}
                  <span>Capital Loss Carry Forwards</span>
                </div>
                <span className="text-primary font-medium">
                  {formatCurrency(getFieldValue("25200"))}
                </span>
              </button>
              {!collapsedSections['capital-loss-section'] && (
                <div className="mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex justify-between items-center py-2">
                      <span className="font-medium text-primary">Available Losses:</span>
                      <div className="text-right">
                        <span className="font-medium text-primary">{formatCurrency(getHouseholdFieldValue('capital_loss_available'))}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="font-medium text-primary">Applied This Year:</span>
                      <div className="text-right">
                        <span className="font-medium text-primary">{formatCurrency(getFieldValue("25200"))}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* AMT Section */}
            <div className="mt-6">
              <button
                onClick={() => toggleSection('amt-section')}
                className="w-full flex items-center justify-between font-semibold text-secondary border-b pb-2 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center">
                  {collapsedSections['amt-section'] ? <ChevronRight className="h-4 w-4 mr-2" /> : <ChevronDown className="h-4 w-4 mr-2" />}
                  <span>AMT</span>
                </div>
                <span className="text-primary font-medium">
                  {formatCurrency(getFieldValue("40427"))}
                </span>
              </button>
              {!collapsedSections['amt-section'] && (
                <div className="mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex justify-between items-center py-2">
                      <span className="font-medium text-primary">AMT Carry Forward:</span>
                      <div className="text-right">
                        <span className="font-medium text-primary">{formatCurrency(getFieldValue("40427"))}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'identification' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-medium text-primary">First Name:</span>
                <span className="font-medium text-primary">{getTextFieldValue('first_name')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-primary">Last Name:</span>
                <span className="font-medium text-primary">{getTextFieldValue('last_name')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-primary">Social Insurance Number:</span>
                <span className="font-medium text-primary">{getTextFieldValue('sin')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-primary">Date of Birth:</span>
                <span className="font-medium text-primary">{getTextFieldValue('date_of_birth')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-primary">Marital Status:</span>
                <span className="font-medium text-primary">{getTextFieldValue('marital_status')}</span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-medium text-primary">Address:</span>
                <span className="font-medium text-primary">{getTextFieldValue('address_line1')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-primary">City:</span>
                <span className="font-medium text-primary">{getTextFieldValue('city')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-primary">Postal Code:</span>
                <span className="font-medium text-primary">{getTextFieldValue('postal_code')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-primary">Province:</span>
                <span className="font-medium text-primary">{getTextFieldValue('province')}</span>
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
              <CollapsibleSection
                id="employment"
                title="Employment Income"
                fieldCodes={['10100', '10105', '10120', '10130', '10400']}
              >
                <div className="field-row">
                  <span className="field-label">Employment Income <span style={{ color: '#A3A3A3' }}>(Line 10100)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('10100'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Tax-Exempt Emergency Volunteer <span style={{ color: '#A3A3A3' }}>(Line 10105)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('10105'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Commissions Included <span style={{ color: '#A3A3A3' }}>(Line 10120)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('10120'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Wage Loss Replacement <span style={{ color: '#A3A3A3' }}>(Line 10130)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('10130'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Other Employment Income <span style={{ color: '#A3A3A3' }}>(Line 10400)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('10400'))}</span>
                </div>
              </CollapsibleSection>

              {/* Pension & Retirement Income Section */}
              <CollapsibleSection
                id="pension"
                title="Pension Income"
                fieldCodes={['11300', '11400', '11500', '11600']}
              >
                <div className="field-row">
                  <span className="field-label">Old Age Security <span style={{ color: '#A3A3A3' }}>(Line 11300)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('11300'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">CPP/QPP Benefits <span style={{ color: '#A3A3A3' }}>(Line 11400)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('11400'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Other Pensions <span style={{ color: '#A3A3A3' }}>(Line 11500)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('11500'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Split Pension Amount <span style={{ color: '#A3A3A3' }}>(Line 11600)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('11600'))}</span>
                </div>
              </CollapsibleSection>

              {/* Government Benefits Section */}
              <CollapsibleSection
                id="government"
                title="Government Benefits"
                fieldCodes={['11700', '11900', '11905']}
              >
                <div className="field-row">
                  <span className="field-label">Universal Child Care Benefit <span style={{ color: '#A3A3A3' }}>(Line 11700)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('11700'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Employment Insurance <span style={{ color: '#A3A3A3' }}>(Line 11900)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('11900'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">EI Maternity/Parental <span style={{ color: '#A3A3A3' }}>(Line 11905)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('11905'))}</span>
                </div>
              </CollapsibleSection>

              {/* Investment Income Section */}
              <CollapsibleSection
                id="investment"
                title="Investment Income"
                fieldCodes={['12000', '12010', '12100', '12200', '12400', '12600', '12700']}
              >
                <div className="field-row">
                  <span className="field-label">Taxable Dividends - Eligible <span style={{ color: '#A3A3A3' }}>(Line 12000)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('12000'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Non-Eligible Dividends <span style={{ color: '#A3A3A3' }}>(Line 12010)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('12010'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Interest and Investment Income <span style={{ color: '#A3A3A3' }}>(Line 12100)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('12100'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Partnership Income <span style={{ color: '#A3A3A3' }}>(Line 12200)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('12200'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Foreign Dividends <span style={{ color: '#A3A3A3' }}>(Line 12400)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('12400'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Rental Income <span style={{ color: '#A3A3A3' }}>(Line 12600)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('12600'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Capital Gains <span style={{ color: '#A3A3A3' }}>(Line 12700)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('12700'))}</span>
                </div>
              </CollapsibleSection>

              {/* Registered Account Income Section */}
              <CollapsibleSection
                id="registered-account"
                title="Registered Account Income"
                fieldCodes={['12500', '12900', '12905', '12906']}
              >
                <div className="field-row">
                  <span className="field-label">RDSP Income <span style={{ color: '#A3A3A3' }}>(Line 12500)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('12500'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">RRSP Income <span style={{ color: '#A3A3A3' }}>(Line 12900)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('12900'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">FHSA Income <span style={{ color: '#A3A3A3' }}>(Line 12905)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('12905'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">FHSA Income - Other <span style={{ color: '#A3A3A3' }}>(Line 12906)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('12906'))}</span>
                </div>
              </CollapsibleSection>


              {/* Self-Employment Income Section */}
              <CollapsibleSection
                id="selfemployment"
                title="Self-Employment Income"
                fieldCodes={['13500', '13700', '13900', '14100', '14300']}
              >
                <div className="field-row">
                  <span className="field-label">Business Income <span style={{ color: '#A3A3A3' }}>(Line 13500)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('13500'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Professional Income <span style={{ color: '#A3A3A3' }}>(Line 13700)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('13700'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Commission Income <span style={{ color: '#A3A3A3' }}>(Line 13900)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('13900'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Farming Income <span style={{ color: '#A3A3A3' }}>(Line 14100)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('14100'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Fishing Income <span style={{ color: '#A3A3A3' }}>(Line 14300)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('14300'))}</span>
                </div>
              </CollapsibleSection>

              {/* Other Sources Section */}
              <CollapsibleSection
                id="othersources"
                title="Other Sources"
                fieldCodes={['13000', '13010', '14400', '14500', '14600']}
              >
                <div className="field-row">
                  <span className="field-label">Other Income <span style={{ color: '#A3A3A3' }}>(Line 13000)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('13000'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Scholarships <span style={{ color: '#A3A3A3' }}>(Line 13010)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('13010'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Workers' Compensation <span style={{ color: '#A3A3A3' }}>(Line 14400)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('14400'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Social Assistance <span style={{ color: '#A3A3A3' }}>(Line 14500)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('14500'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Net Federal Supplements <span style={{ color: '#A3A3A3' }}>(Line 14600)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('14600'))}</span>
                </div>
              </CollapsibleSection>
              
              {/* Total Income Summary */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex justify-between">
                  <span className="font-semibold text-green-800">Total Income:</span>
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
              <CollapsibleSection
                id="retirement-plan-deductions"
                title="Retirement Plan Deductions"
                fieldCodes={['20700', '20800', '20805', '20810', '21000']}
              >
                <div className="field-row">
                  <span className="field-label">Pension Adjustment <span style={{ color: '#A3A3A3' }}>(Line 20600)</span>:</span>
                      <span className="field-value">{formatCurrency(getFieldValue('20600'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Registered Pension Plan Deduction <span style={{ color: '#A3A3A3' }}>(Line 20700)</span>:</span>
                      <span className="field-value">{formatCurrency(getFieldValue('20700'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">RRSP Deduction <span style={{ color: '#A3A3A3' }}>(Line 20800)</span>:</span>
                      <span className="field-value">{formatCurrency(getFieldValue('20800'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">FHSA Deduction <span style={{ color: '#A3A3A3' }}>(Line 20805)</span>:</span>
                      <span className="field-value">{formatCurrency(getFieldValue('20805'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">PRPP Employer Contributions <span style={{ color: '#A3A3A3' }}>(Line 20810)</span>:</span>
                      <span className="field-value">{formatCurrency(getFieldValue('20810'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Split Pension Deduction <span style={{ color: '#A3A3A3' }}>(Line 21000)</span>:</span>
                      <span className="field-value">{formatCurrency(getFieldValue('21000'))}</span>
                </div>
              </CollapsibleSection>
              {/* Personal Deductions Section */}
              <CollapsibleSection
                id="personal-deductions"
                title="Personal Deductions"
                fieldCodes={['21200', '21300', '21400', '21500', '21700', '21900', '22000', '22100']}
              >
                <div className="field-row">
                  <span className="field-label">Annual Union Dues <span style={{ color: '#A3A3A3' }}>(Line 21200)</span>:</span>
                      <span className="field-value">{formatCurrency(getFieldValue('21200'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">UCCB Repayment <span style={{ color: '#A3A3A3' }}>(Line 21300)</span>:</span>
                      <span className="field-value">{formatCurrency(getFieldValue('21300'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Child Care Expenses <span style={{ color: '#A3A3A3' }}>(Line 21400)</span>:</span>
                      <span className="field-value">{formatCurrency(getFieldValue('21400'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Disability Supports <span style={{ color: '#A3A3A3' }}>(Line 21500)</span>:</span>
                      <span className="field-value">{formatCurrency(getFieldValue('21500'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Business Investment Loss <span style={{ color: '#A3A3A3' }}>(Line 21700)</span>:</span>
                      <span className="field-value">{formatCurrency(getFieldValue('21700'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Moving Expenses <span style={{ color: '#A3A3A3' }}>(Line 21900)</span>:</span>
                      <span className="field-value">{formatCurrency(getFieldValue('21900'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Support Payments Allowable <span style={{ color: '#A3A3A3' }}>(Line 22000)</span>:</span>
                      <span className="field-value">{formatCurrency(getFieldValue('22000'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Carrying Charges <span style={{ color: '#A3A3A3' }}>(Line 22100)</span>:</span>
                      <span className="field-value">{formatCurrency(getFieldValue('22100'))}</span>
                </div>
              </CollapsibleSection>
              {/* Employment Deductions Section */}
              <CollapsibleSection
                id="employment-deductions"
                title="Employment Deductions"
                fieldCodes={['22200', '22215', '22900', '23100']}
              >
                <div className="field-row">
                  <span className="field-label">CPP/QPP Self-Employed <span style={{ color: '#A3A3A3' }}>(Line 22200)</span>:</span>
                      <span className="field-value">{formatCurrency(getFieldValue('22200'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Enhanced CPP/QPP Deduction <span style={{ color: '#A3A3A3' }}>(Line 22215)</span>:</span>
                      <span className="field-value">{formatCurrency(getFieldValue('22215'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Other Employment Expenses <span style={{ color: '#A3A3A3' }}>(Line 22900)</span>:</span>
                      <span className="field-value">{formatCurrency(getFieldValue('22900'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Clergy Residence <span style={{ color: '#A3A3A3' }}>(Line 23100)</span>:</span>
                      <span className="field-value">{formatCurrency(getFieldValue('23100'))}</span>
                </div>
              </CollapsibleSection>
              {/* Specialized Deductions Section */}
              <CollapsibleSection
                id="specialized-deductions"
                title="Specialized Deductions"
                fieldCodes={['22400', '23200', '23500']}
              >
                <div className="field-row">
                  <span className="field-label">Exploration Development <span style={{ color: '#A3A3A3' }}>(Line 22400)</span>:</span>
                      <span className="field-value">{formatCurrency(getFieldValue('22400'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Other Deductions <span style={{ color: '#A3A3A3' }}>(Line 23200)</span>:</span>
                      <span className="field-value">{formatCurrency(getFieldValue('23200'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Social Benefits Repayment <span style={{ color: '#A3A3A3' }}>(Line 23500)</span>:</span>
                      <span className="field-value">{formatCurrency(getFieldValue('23500'))}</span>
                </div>
              </CollapsibleSection>
              {/* Summary Section */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="font-semibold text-yellow-800 mb-2">Retirement Plan</div>
                    <div className="text-xl font-bold text-yellow-600">
                      {formatCurrency(getSectionTotal(['20700', '20800', '20805', '20810', '21000']))}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-yellow-800 mb-2">Personal</div>
                    <div className="text-xl font-bold text-yellow-600">
                      {formatCurrency(getSectionTotal(['21200', '21300', '21400', '21500', '21700', '21900', '22000', '22100']))}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-yellow-800 mb-2">Employment</div>
                    <div className="text-xl font-bold text-yellow-600">
                      {formatCurrency(getSectionTotal(['22200', '22215', '22900', '23100']))}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-yellow-800 mb-2">Specialized</div>
                    <div className="text-xl font-bold text-yellow-600">
                      {formatCurrency(getSectionTotal(['22400', '23200', '23500']))}
                    </div>
                  </div>
                </div>
                <div className="text-center mt-4">
                  <div className="font-semibold text-yellow-800 mb-2">Total Deductions</div>
                  <div className="text-2xl font-bold text-yellow-600">
                    {formatCurrency(getTotalDeductions())}
                  </div>
                  <div className="text-sm text-yellow-700 mt-1">Calculated from all deduction categories</div>
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
            
            <div className="space-y-4">
              {/* Basic Credits Section */}
              <CollapsibleSection
                id="basic-credits"
                title="Basic Credits (Non-Refundable)"
                fieldCodes={['30000', '30100', '30300', '30400', '30450']}
              >
                <div className="field-row">
                  <span className="field-label">Basic Personal Amount <span style={{ color: '#A3A3A3' }}>(Line 30000)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('30000'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Age Amount <span style={{ color: '#A3A3A3' }}>(Line 30100)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('30100'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Spouse Amount <span style={{ color: '#A3A3A3' }}>(Line 30300)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('30300'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Eligible Dependant <span style={{ color: '#A3A3A3' }}>(Line 30400)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('30400'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Canada Caregiver <span style={{ color: '#A3A3A3' }}>(Line 30450)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('30450'))}</span>
                </div>
              </CollapsibleSection>

              {/* Employment Credits Section */}
              <CollapsibleSection
                id="employment-credits"
                title="Employment Credits (Non-Refundable)"
                fieldCodes={['30800', '31000', '31200', '31217', '31220', '31230', '31240']}
              >
                <div className="field-row">
                  <span className="field-label">CPP/QPP Contributions <span style={{ color: '#A3A3A3' }}>(Line 30800)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('30800'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">CPP/QPP (Self Employed) Contributions <span style={{ color: '#A3A3A3' }}>(Line 31000)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('31000'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Employment Insurance Premiums <span style={{ color: '#A3A3A3' }}>(Line 31200)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('31200'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Employment Insurance (Self Employed) Premiums <span style={{ color: '#A3A3A3' }}>(Line 31217)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('31217'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Canada Employment Amount <span style={{ color: '#A3A3A3' }}>(Line 31220)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('31220'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Volunteer firefighters' amount (VFA) <span style={{ color: '#A3A3A3' }}>(Line 31230)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('31230'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Search and rescue volunteers' amount (SRVA) <span style={{ color: '#A3A3A3' }}>(Line 31240)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('31240'))}</span>
                </div>
              </CollapsibleSection>

              {/* Personal Situation Credits Section */}
              <CollapsibleSection
                id="personal-situation-credits-new"
                title="Personal Situation Credits (Non-Refundable)"
                fieldCodes={['31270', '31300', '31350', '31400']}
              >
                <div className="field-row">
                  <span className="field-label">Home buyers' Amount <span style={{ color: '#A3A3A3' }}>(Line 31270)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('31270'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Adoption Expenses <span style={{ color: '#A3A3A3' }}>(Line 31300)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('31300'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Digital News Subscription <span style={{ color: '#A3A3A3' }}>(Line 31350)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('31350'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Pension Income Amount <span style={{ color: '#A3A3A3' }}>(Line 31400)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('31400'))}</span>
                </div>
              </CollapsibleSection>

              {/* Disability & Caregiver Credits Section */}
              <CollapsibleSection
                id="disability-caregiver-credits"
                title="Disability & Caregiver Credits (Non-Refundable)"
                fieldCodes={['30450', '30500', '31285', '31500', '31600', '31800', '31850']}
              >
                <div className="field-row">
                  <span className="field-label">Canada Caregiver Amount Spouse/Partner/Adult Children <span style={{ color: '#A3A3A3' }}>(Line 30450)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('30450'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Canada Caregiver Amount for Children <span style={{ color: '#A3A3A3' }}>(Line 30500)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('30500'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Home Accessibility Expenses <span style={{ color: '#A3A3A3' }}>(Line 31285)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('31285'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Caregiver Amount <span style={{ color: '#A3A3A3' }}>(Line 31500)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('31500'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Disability Amount <span style={{ color: '#A3A3A3' }}>(Line 31600)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('31600'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Disability Transferred <span style={{ color: '#A3A3A3' }}>(Line 31800)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('31800'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Family Caregiver <span style={{ color: '#A3A3A3' }}>(Line 31850)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('31850'))}</span>
                </div>
              </CollapsibleSection>

              {/* Education Credits Section */}
              <CollapsibleSection
                id="education-credits"
                title="Education Credits (Non-Refundable)"
                fieldCodes={['31900', '32300', '32400', '32600']}
              >
                <div className="field-row">
                  <span className="field-label">Interest on Student Loans <span style={{ color: '#A3A3A3' }}>(Line 31900)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('31900'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Tuition & Education Amounts <span style={{ color: '#A3A3A3' }}>(Line 32300)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('32300'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Tuition Transferred <span style={{ color: '#A3A3A3' }}>(Line 32400)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('32400'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Amounts Transferred From your Spouse/Partner <span style={{ color: '#A3A3A3' }}>(Line 32600)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('32600'))}</span>
                </div>
              </CollapsibleSection>

              {/* Medical Credits Section */}
              <CollapsibleSection
                id="education-medical-credits"
                title="Medical Credits (Non-Refundable)"
                fieldCodes={['33200']}
              >
                <div className="field-row">
                  <span className="field-label">Medical Expenses <span style={{ color: '#A3A3A3' }}>(Line 33099)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('33099'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Allowable Medical Expenses <span style={{ color: '#A3A3A3' }}>(Line 33199)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('33199'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Net Eligible Medical Expenses <span style={{ color: '#A3A3A3' }}>(Line 33200)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('33200'))}</span>
                </div>
              </CollapsibleSection>

              {/* Charitable Gifts & Donations Section */}
              <CollapsibleSection
                id="charitable-gifts-donations-credits"
                title="Charitable Gifts & Donations (Non-Refundable)"
                fieldCodes={['CALC-34000+34200']}
              >
                <div className="field-row">
                  <span className="field-label">Total eligible amount of charitable donations:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('S9-TOTAL'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Allowable Charitable Donations <span style={{ color: '#A3A3A3' }}>(Line 34000)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('34000'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Total Ecological Gifts <span style={{ color: '#A3A3A3' }}>(Line 34200)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('34200'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Total Eligible Gifts & Donations:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('34000') + getFieldValue('34200'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Donation & Gift Credits <span style={{ color: '#A3A3A3' }}>(Line 34900)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('34900'))}</span>
                </div>
              </CollapsibleSection>

              {/* Refundable Credits Section */}
              <CollapsibleSection
                id="refundable-credits"
                title="Refundable Credits"
                fieldCodes={['44000', '44800', '45000', '45200', '45300', '45350', '45355', '45400', '45600', '45700', '46900', '47555', '47556']}
              >
                <div className="field-row">
                  <span className="field-label">Quebec Abatement <span style={{ color: '#A3A3A3' }}>(Line 44000)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('44000'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">CPP Overpayment <span style={{ color: '#A3A3A3' }}>(Line 44800)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('44800'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">EI Overpayment <span style={{ color: '#A3A3A3' }}>(Line 45000)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('45000'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Refundable Medical Expense Supplement <span style={{ color: '#A3A3A3' }}>(Line 45200)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('45200'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Canada Workers Benefit <span style={{ color: '#A3A3A3' }}>(Line 45300)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('45300'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Canada Training Credit <span style={{ color: '#A3A3A3' }}>(Line 45350)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('45350'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Multigenerational Home Renovation Tax Credit <span style={{ color: '#A3A3A3' }}>(Line 45355)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('45355'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Refund of Investment Tax <span style={{ color: '#A3A3A3' }}>(Line 45400)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('45400'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Part XII.2 Tax Credit <span style={{ color: '#A3A3A3' }}>(Line 45600)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('45600'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Employee & Partner GST/HST Rebate <span style={{ color: '#A3A3A3' }}>(Line 45700)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('45700'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Eligible Educator School Supply Tax Credit <span style={{ color: '#A3A3A3' }}>(Line 46900)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('46900'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Canadian Journalism Labour Tax Credit <span style={{ color: '#A3A3A3' }}>(Line 47555)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('47555'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Return of Fuel Charge Proceeds to Farmers <span style={{ color: '#A3A3A3' }}>(Line 47556)</span>:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('47556'))}</span>
                </div>
              </CollapsibleSection>

              {/* Provincial Credits Section - Only show if province has provincial tax */}
              {getClientProvince() === 'ON' && (
                <CollapsibleSection
                  id="ontario-credits"
                  title="Ontario Non-Refundable Credits"
                  fieldCodes={['58040', '58080', '58120', '58160', '58185', '58240', '58280', '58300', '58305', '58330', '58360', '58440', '58480', '58520', '58560', '58640', '58769', '58969']}
                >
                  <div className="field-row">
                    <span className="field-label">Ontario Basic Personal Amount <span style={{ color: '#A3A3A3' }}>(Line 58040)</span>:</span>
                    <span className="field-value">{formatCurrency(getFieldValue('58040'))}</span>
                  </div>
                  <div className="field-row">
                    <span className="field-label">Ontario Age Amount <span style={{ color: '#A3A3A3' }}>(Line 58080)</span>:</span>
                    <span className="field-value">{formatCurrency(getFieldValue('58080'))}</span>
                  </div>
                  <div className="field-row">
                    <span className="field-label">Ontario Spouse Amount <span style={{ color: '#A3A3A3' }}>(Line 58120)</span>:</span>
                    <span className="field-value">{formatCurrency(getFieldValue('58120'))}</span>
                  </div>
                  <div className="field-row">
                    <span className="field-label">Ontario Eligible Dependant <span style={{ color: '#A3A3A3' }}>(Line 58160)</span>:</span>
                    <span className="field-value">{formatCurrency(getFieldValue('58160'))}</span>
                  </div>
                  <div className="field-row">
                    <span className="field-label">Ontario Caregiver Amount <span style={{ color: '#A3A3A3' }}>(Line 58185)</span>:</span>
                    <span className="field-value">{formatCurrency(getFieldValue('58185'))}</span>
                  </div>
                  <div className="field-row">
                    <span className="field-label">Ontario CPP/QPP Contributions <span style={{ color: '#A3A3A3' }}>(Line 58240)</span>:</span>
                    <span className="field-value">{formatCurrency(getFieldValue('58240'))}</span>
                  </div>
                  <div className="field-row">
                    <span className="field-label">Ontario CPP/QPP Self-Employment <span style={{ color: '#A3A3A3' }}>(Line 58280)</span>:</span>
                    <span className="field-value">{formatCurrency(getFieldValue('58280'))}</span>
                  </div>
                  <div className="field-row">
                    <span className="field-label">Ontario EI Premiums <span style={{ color: '#A3A3A3' }}>(Line 58300)</span>:</span>
                    <span className="field-value">{formatCurrency(getFieldValue('58300'))}</span>
                  </div>
                  <div className="field-row">
                    <span className="field-label">Ontario Volunteer Firefighter <span style={{ color: '#A3A3A3' }}>(Line 58305)</span>:</span>
                    <span className="field-value">{formatCurrency(getFieldValue('58305'))}</span>
                  </div>
                  <div className="field-row">
                    <span className="field-label">Ontario Adoption Expenses <span style={{ color: '#A3A3A3' }}>(Line 58330)</span>:</span>
                    <span className="field-value">{formatCurrency(getFieldValue('58330'))}</span>
                  </div>
                  <div className="field-row">
                    <span className="field-label">Ontario Pension Income <span style={{ color: '#A3A3A3' }}>(Line 58360)</span>:</span>
                    <span className="field-value">{formatCurrency(getFieldValue('58360'))}</span>
                  </div>
                  <div className="field-row">
                    <span className="field-label">Ontario Disability Amount <span style={{ color: '#A3A3A3' }}>(Line 58440)</span>:</span>
                    <span className="field-value">{formatCurrency(getFieldValue('58440'))}</span>
                  </div>
                  <div className="field-row">
                    <span className="field-label">Ontario Disability Transferred <span style={{ color: '#A3A3A3' }}>(Line 58480)</span>:</span>
                    <span className="field-value">{formatCurrency(getFieldValue('58480'))}</span>
                  </div>
                  <div className="field-row">
                    <span className="field-label">Ontario Student Loan Interest <span style={{ color: '#A3A3A3' }}>(Line 58520)</span>:</span>
                    <span className="field-value">{formatCurrency(getFieldValue('58520'))}</span>
                  </div>
                  <div className="field-row">
                    <span className="field-label">Ontario Tuition & Education <span style={{ color: '#A3A3A3' }}>(Line 58560)</span>:</span>
                    <span className="field-value">{formatCurrency(getFieldValue('58560'))}</span>
                  </div>
                  <div className="field-row">
                    <span className="field-label">Ontario Amounts Transferred <span style={{ color: '#A3A3A3' }}>(Line 58640)</span>:</span>
                    <span className="field-value">{formatCurrency(getFieldValue('58640'))}</span>
                  </div>
                  <div className="field-row">
                    <span className="field-label">Ontario Medical Expenses <span style={{ color: '#A3A3A3' }}>(Line 58769)</span>:</span>
                    <span className="field-value">{formatCurrency(getFieldValue('58769'))}</span>
                  </div>
                  <div className="field-row">
                    <span className="field-label">Ontario Donations & Gifts <span style={{ color: '#A3A3A3' }}>(Line 58969)</span>:</span>
                    <span className="field-value">{formatCurrency(getFieldValue('58969'))}</span>
                  </div>
                </CollapsibleSection>
              )}

              {/* Ontario Refundable Credits Section - Only show if province has provincial tax */}
              {getClientProvince() === 'ON' && (
                <CollapsibleSection
                  id="ontario-refundable-credits"
                  title="Ontario Refundable Credits"
                  fieldCodes={['63095', '63100', '63110', '63220', '63300']}
                >
                  <div className="field-row">
                    <span className="field-label">Ontario Seniors Care at Home Credit <span style={{ color: '#A3A3A3' }}>(Line 63095)</span>:</span>
                    <span className="field-value">{formatCurrency(getFieldValue('63095'))}</span>
                  </div>
                  <div className="field-row">
                    <span className="field-label">Ontario Seniors Public Transit Credit <span style={{ color: '#A3A3A3' }}>(Line 63100)</span>:</span>
                    <span className="field-value">{formatCurrency(getFieldValue('63100'))}</span>
                  </div>
                  <div className="field-row">
                    <span className="field-label">Ontario Political Contribution Credit <span style={{ color: '#A3A3A3' }}>(Line 63110)</span>:</span>
                    <span className="field-value">{formatCurrency(getFieldValue('63110'))}</span>
                  </div>
                  <div className="field-row">
                    <span className="field-label">Ontario Flow Through Credit <span style={{ color: '#A3A3A3' }}>(Line 63220)</span>:</span>
                    <span className="field-value">{formatCurrency(getFieldValue('63220'))}</span>
                  </div>
                  <div className="field-row">
                    <span className="field-label">Ontario Co-operative Education Credit <span style={{ color: '#A3A3A3' }}>(Line 63300)</span>:</span>
                    <span className="field-value">{formatCurrency(getFieldValue('63300'))}</span>
                  </div>
                </CollapsibleSection>
              )}

              {/* Summary Section */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="font-semibold text-blue-800 mb-2">Federal Non-Refundable</div>
                    <div className="text-xl font-bold text-blue-600">
                      {formatCurrency(getTotalCredits())}
                    </div>
                    <div className="text-sm text-blue-700 mt-2">
                      Tax Savings: {formatCurrency(getFieldValue('35000'))}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-blue-800 mb-2">Federal Refundable</div>
                    <div className="text-xl font-bold text-blue-600">
                      {formatCurrency(getTotalRefundableCredits())}
                    </div>
                  </div>
                  {getClientProvince() === 'ON' && (
                    <>
                      <div className="text-center">
                        <div className="font-semibold text-blue-800 mb-2">Ontario Non-Refundable</div>
                        <div className="text-xl font-bold text-blue-600">
                          {formatCurrency(getFieldValue('58800'))}
                        </div>
                        <div className="text-sm text-blue-700 mt-2">
                          Tax Savings: {formatCurrency(getFieldValue('61500'))}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-blue-800 mb-2">Ontario Refundable</div>
                        <div className="text-xl font-bold text-blue-600">
                          {formatCurrency(getSectionTotal(['63095', '63100', '63110', '63220', '63300']))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'taxes' && (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-green-800 mb-2">Tax Summary</h3>
              <p className="text-green-700 text-sm">Federal and provincial taxes, payments, and final balance</p>
            </div>
            
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="flex justify-between items-center">
                <span className="font-medium text-primary">Federal Tax (Line 42000):</span>
                <span className="font-medium text-primary">{formatCurrency(getFieldValue('42000'))}</span>
              </div>
              
              {getClientProvince() === 'ON' && (
                <div className="flex justify-between items-center">
                  <span className="font-medium text-primary">Provincial Tax (Ontario):</span>
                  <span className="font-medium text-primary">{formatCurrency(getFieldValue('42800'))}</span>
                </div>
              )}
              
              <div className="flex justify-between items-center border-t pt-4">
                <span className="font-medium text-primary">Total Tax:</span>
                <span className="font-medium text-primary">{formatCurrency(
                  (parseFloat(getFieldValue('42000')) || 0) + (parseFloat(getFieldValue('42800')) || 0)
                )}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="font-medium text-primary">Taxes Paid (Line 43700):</span>
                <span className="font-medium text-primary">{formatCurrency(getFieldValue('43700'))}</span>
              </div>
              
              <div className="flex justify-between items-center border-t pt-4 bg-gray-50 p-4 rounded-lg">
                <span className="font-medium text-primary">
                  {getRefundOrBalance() >= 0 ? 'Refund Due:' : 'Balance Owing:'}
                </span>
                <span 
                  className="font-medium"
                  style={{ color: getRefundOrBalance() >= 0 ? '#16a34a' : '#D4B26A' }}
                >
                  {formatCurrency(Math.abs(getRefundOrBalance()))}
                </span>
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
