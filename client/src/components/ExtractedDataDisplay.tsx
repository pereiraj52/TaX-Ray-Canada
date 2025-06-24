import { useState } from "react";
import { CheckCircle, Edit, FileText, DollarSign, Calculator, User, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import { T1ReturnWithFields } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { HouseholdAPI } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface ExtractedDataDisplayProps {
  t1Return: T1ReturnWithFields;
}

type TabType = 'identification' | 'income' | 'deductions' | 'credits' | 'taxes';

export default function ExtractedDataDisplay({ t1Return }: ExtractedDataDisplayProps) {
  const [activeTab, setActiveTab] = useState<TabType>('identification');
  const { toast } = useToast();

  const generateReportMutation = useMutation({
    mutationFn: () => HouseholdAPI.generateAuditReport(t1Return.client.householdId),
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-report-${t1Return.taxYear}.pdf`;
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

  const getTextFieldValue = (fieldCode: string): string => {
    const field = textFields.find(f => f.fieldCode === fieldCode);
    return field?.fieldValue || 'Not provided';
  };

  const tabs = [
    { id: 'identification' as TabType, label: 'Identification', icon: User },
    { id: 'income' as TabType, label: 'Income', icon: DollarSign },
    { id: 'deductions' as TabType, label: 'Deductions', icon: FileText },
    { id: 'credits' as TabType, label: 'Credits', icon: Calculator },
    { id: 'taxes' as TabType, label: 'Taxes', icon: File },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-secondary">
          {t1Return.client.firstName} {t1Return.client.lastName}
        </h2>
        <div className="flex items-center space-x-3">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            <CheckCircle className="mr-2 h-4 w-4" />
            Data Extracted Successfully
          </span>
          <Button variant="outline" size="sm">
            <Edit className="mr-1 h-4 w-4" />
            Edit Data
          </Button>
          <Button 
            onClick={() => generateReportMutation.mutate()}
            disabled={generateReportMutation.isPending}
            className="bg-accent text-white hover:bg-green-600"
            size="sm"
          >
            <File className="mr-1 h-4 w-4" />
            {generateReportMutation.isPending ? "Generating..." : "Generate Audit Report"}
          </Button>
        </div>
      </div>

      {/* Tax Year and Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium text-secondary mb-2">Tax Year</h3>
          <p className="text-2xl font-bold text-primary">{t1Return.taxYear}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium text-secondary mb-2">Date of Birth</h3>
          <p className="text-lg font-semibold text-secondary">
            {getTextFieldValue('date_of_birth')}
          </p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium text-secondary mb-2">Province</h3>
          <p className="text-lg font-semibold text-secondary">
            {getTextFieldValue('province')}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="field-row">
                <span className="field-label">Employment Income (Line 10100):</span>
                <span className="currency-value">{formatCurrency(getFieldValue('10100'))}</span>
              </div>
              <div className="field-row">
                <span className="field-label">Other Employment Income (Line 10400):</span>
                <span className="field-value">{formatCurrency(getFieldValue('10400'))}</span>
              </div>
              <div className="field-row">
                <span className="field-label">OAS Pension (Line 11300):</span>
                <span className="field-value">{formatCurrency(getFieldValue('11300'))}</span>
              </div>
              <div className="field-row">
                <span className="field-label">CPP/QPP Benefits (Line 11400):</span>
                <span className="field-value">{formatCurrency(getFieldValue('11400'))}</span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="field-row">
                <span className="field-label">Other Pensions (Line 11500):</span>
                <span className="field-value">{formatCurrency(getFieldValue('11500'))}</span>
              </div>
              <div className="field-row">
                <span className="field-label">Split Pension (Line 11600):</span>
                <span className="field-value">{formatCurrency(getFieldValue('11600'))}</span>
              </div>
              <div className="bg-accent-light p-3 rounded-lg">
                <div className="flex justify-between">
                  <span className="font-medium text-secondary">Total Income:</span>
                  <span className="font-bold text-accent text-lg">
                    {formatCurrency(getFieldValue('15000'))}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'deductions' && (
          <div className="space-y-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-yellow-800 mb-2">Deductions from Income</h3>
              <p className="text-yellow-700 text-sm">Federal deductions that reduce taxable income</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h4 className="font-semibold text-secondary border-b pb-2">Federal Deductions</h4>
                <div className="field-row">
                  <span className="field-label">Registered Pension Plan Deduction (Line 20700):</span>
                  <span className="field-value">{formatCurrency(getFieldValue('20700'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">RRSP Deduction (Line 20800):</span>
                  <span className="field-value">{formatCurrency(getFieldValue('20800'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Union Dues (Line 21200):</span>
                  <span className="field-value">{formatCurrency(getFieldValue('21200'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Child Care Expenses (Line 21400):</span>
                  <span className="field-value">{formatCurrency(getFieldValue('21400'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Moving Expenses (Line 21900):</span>
                  <span className="field-value">{formatCurrency(getFieldValue('21900'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Support Payments (Line 22000):</span>
                  <span className="field-value">{formatCurrency(getFieldValue('22000'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Carrying Charges (Line 22100):</span>
                  <span className="field-value">{formatCurrency(getFieldValue('22100'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">CPP/QPP Deduction (Line 22200):</span>
                  <span className="field-value">{formatCurrency(getFieldValue('22200'))}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Other Deductions (Line 23200):</span>
                  <span className="field-value">{formatCurrency(getFieldValue('23200'))}</span>
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-semibold text-secondary border-b pb-2">Calculation Summary</h4>
                <div className="field-row">
                  <span className="field-label">Total Income (Line 15000):</span>
                  <span className="field-value">{formatCurrency(getFieldValue('15000'))}</span>
                </div>
                <div className="field-row font-semibold border-t pt-2">
                  <span className="field-label">Total Deductions (Line 23300):</span>
                  <span className="field-value">{formatCurrency(getFieldValue('23300'))}</span>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-6">
                  <div className="flex justify-between">
                    <span className="font-semibold text-green-800">Net Income (Line 23600):</span>
                    <span className="font-bold text-green-600 text-lg">
                      {formatCurrency(getFieldValue('23600'))}
                    </span>
                  </div>
                  <p className="text-green-700 text-sm mt-1">Total Income minus Total Deductions</p>
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
    </div>
  );
}
