import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Save, X } from "lucide-react";
import { T1ReturnWithFields, T1FormField } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { T1API } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface T1FieldEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  t1Return: T1ReturnWithFields;
}

interface FieldGroup {
  category: string;
  fields: T1FormField[];
}

export default function T1FieldEditDialog({ open, onOpenChange, t1Return }: T1FieldEditDialogProps) {
  const [editedFields, setEditedFields] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Initialize edited fields when dialog opens
  useEffect(() => {
    if (open) {
      const initialFields: Record<string, string> = {};
      const allFields = getAllPossibleFields();
      allFields.forEach(field => {
        initialFields[field.fieldCode] = field.fieldValue;
      });
      setEditedFields(initialFields);
    }
  }, [open, t1Return.formFields]);

  const saveFieldsMutation = useMutation({
    mutationFn: async () => {
      const updates = Object.entries(editedFields).map(([fieldCode, fieldValue]) => ({
        fieldCode,
        fieldValue,
        t1ReturnId: t1Return.id
      }));
      
      for (const update of updates) {
        // Check if field exists, if not create it
        const existingField = t1Return.formFields.find(f => f.fieldCode === update.fieldCode);
        if (existingField) {
          await T1API.updateT1FormField(update);
        } else if (update.fieldValue && update.fieldValue.trim() !== '') {
          // Only create new fields if they have a value
          const allFields = getAllPossibleFields();
          const fieldDef = allFields.find(f => f.fieldCode === update.fieldCode);
          await T1API.createT1FormField({
            ...update,
            fieldName: fieldDef?.fieldName || `Field ${update.fieldCode}`,
            fieldType: fieldDef?.fieldType || 'currency'
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/t1-returns", t1Return.id] });
      onOpenChange(false);
      toast({
        title: "Success",
        description: "T1 data updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update T1 data",
        variant: "destructive",
      });
    },
  });

  const handleFieldChange = (fieldCode: string, value: string) => {
    setEditedFields(prev => ({
      ...prev,
      [fieldCode]: value
    }));
  };

  const handleSave = () => {
    saveFieldsMutation.mutate();
  };

  const handleCancel = () => {
    setEditedFields({});
    onOpenChange(false);
  };

  // Complete list of all T1 fields that are checked for extraction
  const getAllPossibleFields = (): T1FormField[] => {
    const allFieldDefinitions = [
      // Personal Information
      { fieldCode: 'first_name', fieldName: 'First Name', fieldType: 'text' },
      { fieldCode: 'last_name', fieldName: 'Last Name', fieldType: 'text' },
      { fieldCode: 'sin', fieldName: 'Social Insurance Number', fieldType: 'text' },
      { fieldCode: 'date_of_birth', fieldName: 'Date of Birth', fieldType: 'text' },
      { fieldCode: 'marital_status', fieldName: 'Marital Status', fieldType: 'text' },
      { fieldCode: 'address_line1', fieldName: 'Address', fieldType: 'text' },
      { fieldCode: 'city', fieldName: 'City', fieldType: 'text' },
      { fieldCode: 'province', fieldName: 'Province', fieldType: 'text' },
      { fieldCode: 'postal_code', fieldName: 'Postal Code', fieldType: 'text' },
      
      // Income Fields (Lines 10000-17000)
      { fieldCode: '10100', fieldName: 'Employment Income', fieldType: 'currency' },
      { fieldCode: '10400', fieldName: 'Other Employment Income', fieldType: 'currency' },
      { fieldCode: '11300', fieldName: 'OAS Pension', fieldType: 'currency' },
      { fieldCode: '11400', fieldName: 'CPP/QPP Benefits', fieldType: 'currency' },
      { fieldCode: '11500', fieldName: 'Other Pensions', fieldType: 'currency' },
      { fieldCode: '11600', fieldName: 'Split Pension Amount', fieldType: 'currency' },
      { fieldCode: '11900', fieldName: 'Employment Insurance', fieldType: 'currency' },
      { fieldCode: '12000', fieldName: 'Taxable Dividends', fieldType: 'currency' },
      { fieldCode: '12010', fieldName: 'Non-Eligible Dividends', fieldType: 'currency' },
      { fieldCode: '12100', fieldName: 'Interest and Investment Income', fieldType: 'currency' },
      { fieldCode: '12200', fieldName: 'Partnership Income (Line 12200)', fieldType: 'currency' },
      { fieldCode: '12600', fieldName: 'Rental Income', fieldType: 'currency' },
      { fieldCode: '12700', fieldName: 'Capital Gains', fieldType: 'currency' },
      { fieldCode: '12900', fieldName: 'RRSP Income', fieldType: 'currency' },
      { fieldCode: '13000', fieldName: 'Other Income', fieldType: 'currency' },
      { fieldCode: '13500', fieldName: 'Self-Employment Income', fieldType: 'currency' },
      { fieldCode: '14400', fieldName: 'Workers Compensation', fieldType: 'currency' },
      { fieldCode: '14500', fieldName: 'Social Assistance', fieldType: 'currency' },
      { fieldCode: '15000', fieldName: 'Total Income', fieldType: 'currency' },
      
      // Deductions (Lines 20000-23000)
      { fieldCode: '20600', fieldName: 'Pension Adjustment', fieldType: 'currency' },
      { fieldCode: '20700', fieldName: 'Registered Pension Plan Deduction', fieldType: 'currency' },
      { fieldCode: '20800', fieldName: 'RRSP Deduction', fieldType: 'currency' },
      { fieldCode: '21200', fieldName: 'Annual Union Dues', fieldType: 'currency' },
      { fieldCode: '21400', fieldName: 'Child Care Expenses', fieldType: 'currency' },
      { fieldCode: '21500', fieldName: 'Disability Supports', fieldType: 'currency' },
      { fieldCode: '21700', fieldName: 'Business Investment Loss', fieldType: 'currency' },
      { fieldCode: '21900', fieldName: 'Moving Expenses', fieldType: 'currency' },
      { fieldCode: '22000', fieldName: 'Support Payments', fieldType: 'currency' },
      { fieldCode: '22100', fieldName: 'Carrying Charges', fieldType: 'currency' },
      { fieldCode: '22200', fieldName: 'CPP/QPP Deduction', fieldType: 'currency' },
      { fieldCode: '22400', fieldName: 'Exploration Development', fieldType: 'currency' },
      { fieldCode: '22900', fieldName: 'Other Employment Expenses', fieldType: 'currency' },
      { fieldCode: '23100', fieldName: 'Clergy Residence', fieldType: 'currency' },
      { fieldCode: '23200', fieldName: 'Other Deductions', fieldType: 'currency' },
      { fieldCode: '23300', fieldName: 'Total Deductions', fieldType: 'currency' },
      { fieldCode: '23600', fieldName: 'Net Income', fieldType: 'currency' },
      
      // Non-Refundable Credits (Lines 26000-35000)
      { fieldCode: '26000', fieldName: 'Taxable Income', fieldType: 'currency' },
      { fieldCode: '30000', fieldName: 'Basic Personal Amount', fieldType: 'currency' },
      { fieldCode: '30100', fieldName: 'Age Amount', fieldType: 'currency' },
      { fieldCode: '30300', fieldName: 'Spouse Amount', fieldType: 'currency' },
      { fieldCode: '30400', fieldName: 'Eligible Dependant', fieldType: 'currency' },
      { fieldCode: '30800', fieldName: 'CPP/QPP Contributions', fieldType: 'currency' },
      { fieldCode: '31200', fieldName: 'Employment Insurance Premiums', fieldType: 'currency' },
      { fieldCode: '31220', fieldName: 'Canada Employment Amount', fieldType: 'currency' },
      { fieldCode: '31400', fieldName: 'Pension Income Amount', fieldType: 'currency' },
      { fieldCode: '31500', fieldName: 'Caregiver Amount', fieldType: 'currency' },
      { fieldCode: '31600', fieldName: 'Disability Amount', fieldType: 'currency' },
      { fieldCode: '31900', fieldName: 'Interest on Student Loans', fieldType: 'currency' },
      { fieldCode: '32300', fieldName: 'Tuition and Education Amounts', fieldType: 'currency' },
      { fieldCode: '33099', fieldName: 'Medical Expenses', fieldType: 'currency' },
      { fieldCode: '33199', fieldName: 'Allowable Medical Expenses', fieldType: 'currency' },
      { fieldCode: '33200', fieldName: 'Net Eligible Medical Expenses', fieldType: 'currency' },
      { fieldCode: '34900', fieldName: 'Donations and Gifts', fieldType: 'currency' },
      { fieldCode: '35000', fieldName: 'Total Tax Credits', fieldType: 'currency' },
      
      // Federal Tax (Lines 40000-43000)
      { fieldCode: '40400', fieldName: 'Federal Tax', fieldType: 'currency' },
      { fieldCode: '40425', fieldName: 'Federal Dividend Tax Credit', fieldType: 'currency' },
      { fieldCode: '40500', fieldName: 'Federal Foreign Tax Credit', fieldType: 'currency' },
      { fieldCode: '41000', fieldName: 'Basic Federal Tax', fieldType: 'currency' },
      { fieldCode: '42000', fieldName: 'Net Federal Tax', fieldType: 'currency' },
      
      // Refund/Credits (Lines 43000-48000)
      { fieldCode: '43700', fieldName: 'Total Income Tax Deducted', fieldType: 'currency' },
      { fieldCode: '44000', fieldName: 'Quebec Abatement', fieldType: 'currency' },
      { fieldCode: '44800', fieldName: 'CPP Overpayment', fieldType: 'currency' },
      { fieldCode: '44900', fieldName: 'Climate Action Incentive', fieldType: 'currency' },
      { fieldCode: '45000', fieldName: 'EI Overpayment', fieldType: 'currency' },
      { fieldCode: '45200', fieldName: 'Refundable Medical Expense Supplement', fieldType: 'currency' },
      { fieldCode: '45300', fieldName: 'Canada Workers Benefit', fieldType: 'currency' },
      { fieldCode: '45350', fieldName: 'Canada Training Credit', fieldType: 'currency' },
      { fieldCode: '45355', fieldName: 'Multigenerational Home Renovation Tax Credit', fieldType: 'currency' },
      { fieldCode: '45400', fieldName: 'Refund of Investment Tax', fieldType: 'currency' },
      { fieldCode: '45600', fieldName: 'Part XII.2 Tax Credit', fieldType: 'currency' },
      { fieldCode: '45700', fieldName: 'Teacher and Early Childhood Educator School Supply Tax Credit', fieldType: 'currency' },
      { fieldCode: '47900', fieldName: 'Provincial Credits', fieldType: 'currency' },
      { fieldCode: '48200', fieldName: 'Total Credits', fieldType: 'currency' },
      { fieldCode: '48400', fieldName: 'Refund or Balance Owing', fieldType: 'currency' },
      { fieldCode: '48500', fieldName: 'Amount Enclosed', fieldType: 'currency' },
      
      // Ontario Provincial Tax (Lines 58000+)
      { fieldCode: '58040', fieldName: 'Ontario Basic Personal Amount', fieldType: 'currency' },
      { fieldCode: '58080', fieldName: 'Ontario Age Amount', fieldType: 'currency' },
      { fieldCode: '58120', fieldName: 'Ontario Spouse Amount', fieldType: 'currency' },
      { fieldCode: '58160', fieldName: 'Ontario Eligible Dependant', fieldType: 'currency' },
      { fieldCode: '58185', fieldName: 'Ontario Caregiver Amount', fieldType: 'currency' },
      { fieldCode: '58240', fieldName: 'Ontario CPP/QPP Contributions', fieldType: 'currency' },
      { fieldCode: '58280', fieldName: 'Ontario CPP/QPP Self-Employment', fieldType: 'currency' },
      { fieldCode: '58300', fieldName: 'Ontario Employment Insurance Premiums', fieldType: 'currency' },
      { fieldCode: '58305', fieldName: 'Ontario Volunteer Firefighter Amount', fieldType: 'currency' },
      { fieldCode: '58330', fieldName: 'Ontario Adoption Expenses', fieldType: 'currency' },
      { fieldCode: '58360', fieldName: 'Ontario Pension Income Amount', fieldType: 'currency' },
      { fieldCode: '58440', fieldName: 'Ontario Disability Amount', fieldType: 'currency' },
      { fieldCode: '58480', fieldName: 'Ontario Disability Amount Transferred', fieldType: 'currency' },
      { fieldCode: '58520', fieldName: 'Ontario Student Loan Interest', fieldType: 'currency' },
      { fieldCode: '58560', fieldName: 'Ontario Tuition and Education Amounts', fieldType: 'currency' },
      { fieldCode: '58640', fieldName: 'Ontario Amounts Transferred from Spouse', fieldType: 'currency' },
      { fieldCode: '58689', fieldName: 'Ontario Medical Expenses', fieldType: 'currency' },
      { fieldCode: '58729', fieldName: 'Ontario Donations and Gifts', fieldType: 'currency' },
      { fieldCode: '58800', fieldName: 'Ontario Tax Credits', fieldType: 'currency' },
    ];

    // Create field objects with current values or empty defaults
    return allFieldDefinitions.map(fieldDef => {
      const existingField = t1Return.formFields.find(f => f.fieldCode === fieldDef.fieldCode);
      return {
        id: existingField?.id || 0,
        t1ReturnId: t1Return.id,
        fieldCode: fieldDef.fieldCode,
        fieldName: fieldDef.fieldName,
        fieldValue: existingField?.fieldValue || '',
        fieldType: fieldDef.fieldType as 'text' | 'currency',
        createdAt: existingField?.createdAt || new Date(),
        updatedAt: existingField?.updatedAt || new Date(),
      };
    });
  };

  // Group fields by category based on field codes
  const groupFieldsByCategory = (fields: T1FormField[]): FieldGroup[] => {
    const groups: Record<string, T1FormField[]> = {
      'Personal Information': [],
      'Income (Lines 10000-17000)': [],
      'Deductions (Lines 20000-23000)': [],
      'Non-Refundable Credits (Lines 30000-34000)': [],
      'Taxes (Lines 40000-43000)': [],
      'Refund/Credits (Lines 44000-48000)': [],
      'Provincial Tax (Lines 58000+)': [],
    };

    fields.forEach(field => {
      const code = field.fieldCode;
      const lineNumber = parseInt(code);

      if (isNaN(lineNumber)) {
        groups['Personal Information'].push(field);
      } else if (lineNumber >= 10000 && lineNumber < 18000) {
        groups['Income (Lines 10000-17000)'].push(field);
      } else if (lineNumber >= 20000 && lineNumber < 24000) {
        groups['Deductions (Lines 20000-23000)'].push(field);
      } else if (lineNumber >= 26000 && lineNumber < 36000) {
        groups['Non-Refundable Credits (Lines 30000-34000)'].push(field);
      } else if (lineNumber >= 40000 && lineNumber < 44000) {
        groups['Taxes (Lines 40000-43000)'].push(field);
      } else if (lineNumber >= 43000 && lineNumber < 49000) {
        groups['Refund/Credits (Lines 44000-48000)'].push(field);
      } else if (lineNumber >= 58000) {
        groups['Provincial Tax (Lines 58000+)'].push(field);
      }
    });

    // Return all groups, sort fields within each group
    return Object.entries(groups).map(([category, fields]) => ({
      category,
      fields: fields.sort((a, b) => {
        const aNum = parseInt(a.fieldCode);
        const bNum = parseInt(b.fieldCode);
        if (isNaN(aNum) && isNaN(bNum)) return a.fieldCode.localeCompare(b.fieldCode);
        if (isNaN(aNum)) return -1;
        if (isNaN(bNum)) return 1;
        return aNum - bNum;
      })
    }));
  };

  const allFields = getAllPossibleFields();
  const fieldGroups = groupFieldsByCategory(allFields);

  const formatCurrency = (value: string): string => {
    const num = parseFloat(value);
    return isNaN(num) ? value : `$${num.toFixed(2)}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Edit T1 Data - {t1Return.client.firstName} {t1Return.client.lastName} ({t1Return.taxYear})</span>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={handleCancel}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button 
                onClick={handleSave}
                disabled={saveFieldsMutation.isPending}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Save className="mr-2 h-4 w-4" />
                {saveFieldsMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6">
            {fieldGroups.map((group) => (
              <div key={group.category} className="border rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4 text-secondary border-b pb-2">
                  {group.category}
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    ({group.fields.length} fields)
                  </span>
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {group.fields.map((field) => (
                    <div key={field.id} className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded border">
                          {field.fieldCode}
                        </span>
                        <label className="text-sm font-medium text-gray-700">
                          {field.fieldName}
                        </label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Input
                          type="text"
                          value={editedFields[field.fieldCode] || ''}
                          onChange={(e) => handleFieldChange(field.fieldCode, e.target.value)}
                          className="flex-1"
                          placeholder={field.fieldType === 'currency' ? '0.00' : 'Enter value'}
                        />
                        {field.fieldType === 'currency' && editedFields[field.fieldCode] && (
                          <span className="text-sm text-gray-500 min-w-[80px]">
                            {formatCurrency(editedFields[field.fieldCode])}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}