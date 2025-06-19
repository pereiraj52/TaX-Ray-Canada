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

type TabType = 'identification' | 'income' | 'deductions' | 'taxes';

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
    { id: 'taxes' as TabType, label: 'Taxes & Credits', icon: Calculator },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-secondary">
          Extracted T1 Data - {t1Return.client.firstName} {t1Return.client.lastName}
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
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <p>Deduction data will be displayed here after processing</p>
            <p className="text-sm">This section shows all deduction line items from the T1 return</p>
          </div>
        )}

        {activeTab === 'taxes' && (
          <div className="text-center py-8 text-gray-500">
            <Calculator className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <p>Tax calculation data will be displayed here after processing</p>
            <p className="text-sm">This section shows tax calculations and credits from the T1 return</p>
          </div>
        )}
      </div>
    </div>
  );
}
