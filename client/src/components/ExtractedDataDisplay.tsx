import { useState } from "react";
import { CheckCircle, Edit, FileText, DollarSign, Calculator, User, File, ChevronDown, ChevronRight, Minus, Plus, Building2, TrendingUp, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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

  // Section IDs for expand/collapse all functionality
  const incomeSectionIds = ['employment', 'pension', 'government', 'investment', 'registered-account', 'selfemployment', 'othersources'];
  const deductionSectionIds = ['retirement-plan-deductions', 'personal-deductions', 'employment-deductions', 'specialized-deductions'];
  const creditSectionIds = ['basic-credits', 'employment-credits', 'personal-situation-credits-new', 'disability-caregiver-credits', 'education-credits', 'medical-credits', 'charitable-gifts-donations-credits', 'ontario-credits', 'ontario-refundable-credits', 'refundable-credits'];
  const accountSectionIds = ['rrsp-rrif-section', 'tfsa-section', 'fhsa-section', 'resp-section', 'rdsp-section', 'capital-loss-section', 'amt-section'];

  // Function to toggle all sections for a specific tab
  const toggleAllSections = (sectionIds: string[]) => {
    const allExpanded = sectionIds.every(id => !collapsedSections[id]);
    const newState = { ...collapsedSections };
    
    sectionIds.forEach(id => {
      newState[id] = allExpanded; // If all expanded, collapse all; otherwise expand all
    });
    
    setCollapsedSections(newState);
  };

  // Check if all sections are expanded for a specific tab
  const areAllSectionsExpanded = (sectionIds: string[]) => {
    return sectionIds.every(id => !collapsedSections[id]);
  };

  // Specific toggle functions for each tab
  const toggleAllIncomeSections = () => toggleAllSections(incomeSectionIds);
  const toggleAllDeductionSections = () => toggleAllSections(deductionSectionIds);
  const toggleAllCreditSections = () => toggleAllSections(creditSectionIds);
  const toggleAllAccountSections = () => toggleAllSections(accountSectionIds);

  // Check functions for each tab
  const areAllIncomeSectionsExpanded = () => areAllSectionsExpanded(incomeSectionIds);
  const areAllDeductionSectionsExpanded = () => areAllSectionsExpanded(deductionSectionIds);
  const areAllCreditSectionsExpanded = () => areAllSectionsExpanded(creditSectionIds);
  const areAllAccountSectionsExpanded = () => areAllSectionsExpanded(accountSectionIds);

  // Comprehensive tooltip mapping for T1 line numbers
  const getTooltipText = (lineNumber: string): string => {
    const tooltips: Record<string, string> = {
      // Income lines
      '10100': 'Employment income from all sources including salary, wages, commissions, and benefits',
      '10120': 'Commissions earned from employment including sales commissions and performance bonuses',
      '10130': 'Other employment income including tips, gratuities, and employee benefits',
      '10400': 'Other employment income such as standby charges, employee loans, and taxable benefits',
      '11300': 'Old Age Security pension payments received during the tax year',
      '11400': 'Guaranteed Income Supplement and Allowance payments for seniors',
      '11500': 'Canada Pension Plan or Quebec Pension Plan benefits received',
      '11600': 'Canada Pension Plan or Quebec Pension Plan disability benefits',
      '11700': 'Universal Child Care Benefit payments received for dependent children',
      '11701': 'Universal Child Care Benefit for dependants under 18 years of age',
      '11800': 'Split income from certain sources subject to tax on split income (TOSI)',
      '12000': 'Eligible dividends from Canadian corporations entitled to enhanced dividend tax credit',
      '12010': 'Non-eligible dividends from Canadian corporations with basic dividend tax credit',
      '12100': 'Interest and other investment income from savings accounts, bonds, and GICs',
      '12200': 'Partnership income or loss from partnership activities and investments',
      '12500': 'RDSP income from Registered Disability Savings Plan withdrawals',
      '12600': 'Rental income from real estate properties after deducting expenses',
      '12700': 'Taxable capital gains from sale of investments and properties (50% of actual gain)',
      '12800': 'Investment income including foreign investment income and other investment earnings',
      '12900': 'RRSP income from Registered Retirement Savings Plan withdrawals',
      '12905': 'FHSA income from First Home Savings Account withdrawals for non-qualifying purposes',
      '12906': 'FHSA income - other types of First Home Savings Account withdrawals',
      '13000': 'Other income not captured in other categories including miscellaneous income',
      '13010': 'Scholarships, fellowships, bursaries, and study grants exceeding exempt amounts',
      '13500': 'Business income from self-employment, consulting, or business operations',
      '14400': "Workers' compensation benefits received during the tax year",
      '14500': 'Social assistance payments received from government programs',
      '14600': 'Net federal supplements including refundable tax credits and supplements',
      '15000': 'Total income - sum of all income sources before deductions',

      // Deduction lines  
      '20600': 'Pension adjustment - employer pension contributions that reduce RRSP contribution room',
      '20700': 'Registered Pension Plan deduction for employee contributions to employer pension plan',
      '20800': 'RRSP deduction for contributions to Registered Retirement Savings Plans',
      '20805': 'FHSA deduction for contributions to First Home Savings Account',
      '20810': 'Specified pension plan deduction for contributions to specified pension plans',
      '21000': 'Split pension deduction - pension income allocated from spouse or common-law partner',
      '21300': 'UCCB repayment - Universal Child Care Benefit amounts required to be repaid',
      '22000': 'Support payments allowable - deductible spousal or child support payments made',
      '22100': 'Carrying charges and interest expenses on investments and loans for investment purposes',
      '22200': 'CPP or QPP contributions on self-employment earnings',
      '22215': 'Enhanced CPP contributions for self-employed individuals',
      '22400': 'Moving expenses for employment, business, or education relocation',
      '22900': 'Union, professional, or like dues paid for employment or professional membership',
      '23100': 'Child care expenses for eligible children to enable employment or education',
      '23200': 'Disability supports deduction for disability-related expenses',
      '23300': 'Total deductions - sum of all allowable deductions from income',
      '23500': 'Social benefits repayment including EI and OAS recovery amounts',

      // Credit lines
      '30000': 'Basic personal amount - non-refundable tax credit available to all taxpayers',
      '30100': 'Age amount for taxpayers 65 years of age or older',
      '30300': 'Spouse or common-law partner amount for supporting a spouse with low income',
      '30400': 'Amount for eligible dependant supporting a dependant in your home',
      '30425': 'Caregiver amount for caring for dependants with physical or mental impairment',
      '30450': 'Canada caregiver amount for spouse, partner, or adult children with disabilities',
      '30500': 'Canada caregiver amount for children under 18 with disabilities',
      '30800': 'CPP or QPP contributions through employment - non-refundable tax credit',
      '31000': 'CPP or QPP contributions on self-employment earnings - non-refundable tax credit',
      '31200': 'Employment Insurance premiums through employment - non-refundable tax credit',
      '31217': 'Employment Insurance premiums on self-employment earnings - non-refundable tax credit',
      '31230': 'Volunteer firefighters amount for eligible volunteer firefighter services',
      '31240': 'Search and rescue volunteers amount for eligible search and rescue services',
      '31270': "Home buyers' amount for first-time home buyers",
      '31285': 'Home accessibility tax credit for home modifications for seniors or disabled persons',
      '31300': 'Adoption expenses for eligible adoption costs',
      '31350': 'Digital news subscription amount for eligible digital news subscriptions',
      '31400': 'Pension income amount for eligible pension, annuity, and RRIF income',
      '31900': 'Interest paid on student loans for post-secondary education',
      '32300': 'Tuition and education amounts for post-secondary education expenses',
      '32400': 'Tuition transferred from child or grandchild',
      '32600': 'Amounts transferred from spouse or common-law partner',
      '33099': 'Medical expenses for you, your spouse, and dependants',
      '33200': 'Net eligible medical expenses after applying income threshold',
      '34000': 'Allowable charitable donations and gifts to qualified organizations',
      '34200': 'Total ecological gifts to qualified ecological organizations',
      '34900': 'Donation and gift tax credits calculated on eligible donations',
      '35000': 'Total non-refundable tax credits - sum of all federal non-refundable credits',

      // Tax lines
      '42000': 'Federal tax calculated on taxable income using federal tax brackets',
      '42200': 'OAS recovery tax - Old Age Security clawback for high-income taxpayers',
      '42210': 'EI benefit repayment for high-income Employment Insurance recipients',
      '42800': 'Provincial or territorial tax calculated using provincial tax brackets',
      '43500': 'Total tax - combined federal and provincial tax before credits and other taxes',
      '43700': 'Total tax after applying non-refundable tax credits',

      // Refundable credits
      '44000': 'Quebec abatement - reduction in federal tax for Quebec residents',
      '44800': 'CPP overpayment - refund of excess Canada Pension Plan contributions',
      '45000': 'EI overpayment - refund of excess Employment Insurance premiums',
      '45200': 'Refundable medical expense supplement for low-income taxpayers',
      '45300': 'Canada Workers Benefit for low-income working individuals and families',
      '45350': 'Canada Training Credit for eligible training and education expenses',
      '45355': 'Multigenerational home renovation tax credit for eligible home renovations',
      '45400': 'Refund of investment tax credit for certain investment expenditures',
      '45600': 'Part XII.2 tax credit related to certain investment income',
      '45700': 'Employee and partner GST/HST rebate for employment-related GST/HST paid',
      '46900': 'Eligible educator school supply tax credit for teachers and early childhood educators',
      '47555': 'Canadian journalism labour tax credit for qualifying journalism organizations',
      '47556': 'Return of fuel charge proceeds to farmers for fuel charge exemptions',

      // Ontario credits
      '58040': 'Ontario basic personal amount - provincial non-refundable tax credit',
      '58080': 'Ontario age amount for Ontario residents 65 years of age or older',
      '58120': 'Ontario spouse amount for supporting a spouse with low income',
      '58160': 'Ontario eligible dependant amount for supporting a dependant',
      '58185': 'Ontario caregiver amount for caring for dependants with impairments',
      '58240': 'Ontario CPP or QPP contributions credit',
      '58280': 'Ontario CPP or QPP self-employment contributions credit',
      '58300': 'Ontario Employment Insurance premiums credit',
      '58305': 'Ontario volunteer firefighter amount',
      '58330': 'Ontario adoption expenses credit',
      '58360': 'Ontario pension income amount',
      '58440': 'Ontario disability amount',
      '58480': 'Ontario disability amount transferred from dependant',
      '58520': 'Ontario student loan interest credit',
      '58560': 'Ontario tuition and education amounts',
      '58640': 'Ontario amounts transferred from spouse',
      '58769': 'Ontario medical expenses credit',
      '58969': 'Ontario donations and gifts credit',
      '61500': 'Ontario non-refundable tax credits - total provincial credits',
      '63095': 'Ontario seniors care at home credit',
      '63100': 'Ontario seniors public transit credit',
      '63110': 'Ontario political contribution credit',
      '63220': 'Ontario flow-through share credit',
      '63300': 'Ontario co-operative education credit',

      // Account and other lines
      '24600': 'Home Buyers Plan repayment to RRSP',
      '24630': 'Lifelong Learning Plan repayment to RRSP',
      '25200': 'Capital losses applied against capital gains',
      '40427': 'Alternative Minimum Tax carry forward from previous years',

      // Schedule 7 lines
      'S7-RRSP': 'Schedule 7 RRSP contributions and transfers',
      'S7-FHSA': 'Schedule 7 First Home Savings Account contributions',
      'S7-SPP': 'Schedule 7 Specified Pension Plan contributions',
      'S7-HBP': 'Schedule 7 Home Buyers Plan repayments',
      'S7-LLP': 'Schedule 7 Lifelong Learning Plan repayments',

      // Schedule 9 lines
      'S9-TOTAL': 'Schedule 9 total eligible amount of charitable donations'
    };

    return tooltips[lineNumber] || 'Information about this T1 tax form line number';
  };

  // Helper component for field labels with tooltips
  const FieldLabelWithTooltip = ({ label, lineNumber }: { label: string; lineNumber: string }) => (
    <span className="field-label">
      {label} <span style={{ color: '#A3A3A3' }}>(Line {lineNumber})</span>:
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle className="inline w-4 h-4 ml-1 text-gray-400 hover:text-gray-600 cursor-help" />
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs">{getTooltipText(lineNumber)}</p>
        </TooltipContent>
      </Tooltip>
    </span>
  );

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
          <div className="mt-4 pl-6">
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
    <TooltipProvider>
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
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-purple-800">Investment & Savings Accounts</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleAllAccountSections}
                  className="text-purple-700 border-purple-300 hover:bg-purple-100"
                >
                  {areAllAccountSectionsExpanded() ? 'Collapse All' : 'Expand All'}
                </Button>
              </div>
              <p className="text-purple-700 text-sm">Registered accounts, contribution room, and capital loss information</p>
            </div>
            
            <div className="space-y-4">
              {/* RRSP/RRIF Section */}
              <CollapsibleSection
                id="rrsp-rrif-section"
                title="RRSP/RRIF"
                fieldCodes={['20800']}
              >
                <div className="field-row">
                  <span className="font-medium text-primary">Account Balance:</span>
                  <span className="field-value">$0.00</span>
                </div>
                <div className="field-row">
                  <span className="font-medium text-primary">Contribution Room:</span>
                  <span className="field-value">$0.00</span>
                </div>
                <div className="field-row">
                  <span className="font-medium text-primary">2024 Contribution:</span>
                  <span className="field-value">{formatCurrency(getFieldValue("20800"))}</span>
                </div>
                <div className="field-row">
                  <span className="font-medium text-primary">HBP Balance:</span>
                  <span className="field-value">{formatCurrency(getHouseholdFieldValue('hbp_balance'))}</span>
                </div>
                <div className="field-row">
                  <span className="font-medium text-primary">2024 HBP Required:</span>
                  <span className="field-value">{formatCurrency(getHouseholdFieldValue('hbp_required_2024'))}</span>
                </div>
                <div className="field-row">
                  <span className="font-medium text-primary">2024 HBP Repaid:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('24600'))}</span>
                </div>
                <div className="field-row">
                  <span className="font-medium text-primary">LLP Balance:</span>
                  <span className="field-value">{formatCurrency(getHouseholdFieldValue('llp_balance'))}</span>
                </div>
                <div className="field-row">
                  <span className="font-medium text-primary">2024 LLP Required:</span>
                  <span className="field-value">{formatCurrency(getHouseholdFieldValue('llp_required_2024'))}</span>
                </div>
                <div className="field-row">
                  <span className="font-medium text-primary">2024 LLP Repaid:</span>
                  <span className="field-value">{formatCurrency(getFieldValue('24630'))}</span>
                </div>
              </CollapsibleSection>

              {/* TFSA Section */}
              <CollapsibleSection
                id="tfsa-section"
                title="TFSA"
                fieldCodes={[]}
              >
                <div className="field-row">
                  <span className="font-medium text-primary">Account Balance:</span>
                  <span className="field-value">$0.00</span>
                </div>
                <div className="field-row">
                  <span className="font-medium text-primary">Contribution Room:</span>
                  <span className="field-value">$0.00</span>
                </div>
                <div className="field-row">
                  <span className="font-medium text-primary">2024 Contribution:</span>
                  <span className="field-value">$0.00</span>
                </div>
              </CollapsibleSection>

              {/* FHSA Section */}
              <CollapsibleSection
                id="fhsa-section"
                title="FHSA"
                fieldCodes={['20805']}
              >
                <div className="field-row">
                  <span className="font-medium text-primary">Account Balance:</span>
                  <span className="field-value">$0.00</span>
                </div>
                <div className="field-row">
                  <span className="font-medium text-primary">Contribution Room:</span>
                  <span className="field-value">$0.00</span>
                </div>
                <div className="field-row">
                  <span className="font-medium text-primary">2024 Contribution:</span>
                  <span className="field-value">{formatCurrency(getFieldValue("20805"))}</span>
                </div>
              </CollapsibleSection>

              {/* RESP Section */}
              <CollapsibleSection
                id="resp-section"
                title="RESP"
                fieldCodes={[]}
              >
                <div className="field-row">
                  <span className="font-medium text-primary">Account Balance:</span>
                  <span className="field-value">$0.00</span>
                </div>
                <div className="field-row">
                  <span className="font-medium text-primary">Contribution Room:</span>
                  <span className="field-value">$0.00</span>
                </div>
                <div className="field-row">
                  <span className="font-medium text-primary">2024 Contribution:</span>
                  <span className="field-value">$0.00</span>
                </div>
                <div className="field-row">
                  <span className="font-medium text-primary">Total CESG Received:</span>
                  <span className="field-value">{formatCurrency(getHouseholdFieldValue('resp_cesg_total'))}</span>
                </div>
                <div className="field-row">
                  <span className="font-medium text-primary">CESG Room 2024:</span>
                  <span className="field-value">{formatCurrency(getHouseholdFieldValue('resp_cesg_room_2024'))}</span>
                </div>
                <div className="field-row">
                  <span className="font-medium text-primary">CESG Remaining:</span>
                  <span className="field-value">{formatCurrency(getHouseholdFieldValue('resp_cesg_remaining'))}</span>
                </div>
                <div className="field-row">
                  <span className="font-medium text-primary">Total CLB Received:</span>
                  <span className="field-value">{formatCurrency(getHouseholdFieldValue('resp_clb_total'))}</span>
                </div>
                <div className="field-row">
                  <span className="font-medium text-primary">CLB Room 2024:</span>
                  <span className="field-value">{formatCurrency(getHouseholdFieldValue('resp_clb_room_2024'))}</span>
                </div>
                <div className="field-row">
                  <span className="font-medium text-primary">CLB Remaining:</span>
                  <span className="field-value">{formatCurrency(getHouseholdFieldValue('resp_clb_remaining'))}</span>
                </div>
              </CollapsibleSection>

              {/* RDSP Section */}
              <CollapsibleSection
                id="rdsp-section"
                title="RDSP"
                fieldCodes={[]}
              >
                <div className="field-row">
                  <span className="font-medium text-primary">Account Balance:</span>
                  <span className="field-value">$0.00</span>
                </div>
                <div className="field-row">
                  <span className="font-medium text-primary">Contribution Room:</span>
                  <span className="field-value">$0.00</span>
                </div>
                <div className="field-row">
                  <span className="font-medium text-primary">2024 Contribution:</span>
                  <span className="field-value">$0.00</span>
                </div>
                <div className="field-row">
                  <span className="font-medium text-primary">Total CDSG Received:</span>
                  <span className="field-value">{formatCurrency(getHouseholdFieldValue('rdsp_cdsg_total'))}</span>
                </div>
                <div className="field-row">
                  <span className="font-medium text-primary">CDSG Room 2024:</span>
                  <span className="field-value">{formatCurrency(getHouseholdFieldValue('rdsp_cdsg_room_2024'))}</span>
                </div>
                <div className="field-row">
                  <span className="font-medium text-primary">CDSG Remaining:</span>
                  <span className="field-value">{formatCurrency(getHouseholdFieldValue('rdsp_cdsg_remaining'))}</span>
                </div>
                <div className="field-row">
                  <span className="font-medium text-primary">Total CDSB Received:</span>
                  <span className="field-value">{formatCurrency(getHouseholdFieldValue('rdsp_cdsb_total'))}</span>
                </div>
                <div className="field-row">
                  <span className="font-medium text-primary">CDSB Room 2024:</span>
                  <span className="field-value">{formatCurrency(getHouseholdFieldValue('rdsp_cdsb_room_2024'))}</span>
                </div>
                <div className="field-row">
                  <span className="font-medium text-primary">CDSB Remaining:</span>
                  <span className="field-value">{formatCurrency(getHouseholdFieldValue('rdsp_cdsb_remaining'))}</span>
                </div>
              </CollapsibleSection>

              {/* Capital Loss Carry Forwards Section */}
              <CollapsibleSection
                id="capital-loss-section"
                title="Capital Loss Carry Forwards"
                fieldCodes={['25200']}
              >
                <div className="field-row">
                  <span className="font-medium text-primary">Available Losses:</span>
                  <span className="field-value">$0.00</span>
                </div>
                <div className="field-row">
                  <span className="font-medium text-primary">Capital Loss Applied This Year:</span>
                  <span className="field-value">{formatCurrency(getFieldValue("25200"))}</span>
                </div>
              </CollapsibleSection>

              {/* AMT Section */}
              <CollapsibleSection
                id="amt-section"
                title="AMT"
                fieldCodes={['40427']}
              >
                <div className="field-row">
                  <span className="font-medium text-primary">AMT Carry Forward:</span>
                  <span className="field-value">{formatCurrency(getFieldValue("40427"))}</span>
                </div>
              </CollapsibleSection>
            </div>
          </div>
        )}

        {activeTab === 'identification' && (
          <div className="space-y-6">
            <div className="field-row">
              <span className="font-medium text-primary">Name:</span>
              <span className="field-value">{getTextFieldValue("Name")}</span>
            </div>
            <div className="field-row">
              <span className="font-medium text-primary">Social Insurance Number:</span>
              <span className="field-value">{getTextFieldValue("SIN")}</span>
            </div>
            <div className="field-row">
              <span className="font-medium text-primary">Date of Birth:</span>
              <span className="field-value">{getTextFieldValue("DateOfBirth")}</span>
            </div>
            <div className="field-row">
              <span className="font-medium text-primary">Address:</span>
              <span className="field-value">{getTextFieldValue("Address")}</span>
            </div>
            <div className="field-row">
              <span className="font-medium text-primary">Province:</span>
              <span className="field-value">{getTextFieldValue("Province")}</span>
            </div>
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <T1FieldEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        t1Return={t1Return}
      />
      </div>
    </TooltipProvider>
  );
};
