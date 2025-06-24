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
      t1Return.formFields.forEach(field => {
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
        await T1API.updateT1FormField(update);
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
      'Other Fields': []
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
      } else if (lineNumber >= 30000 && lineNumber < 35000) {
        groups['Non-Refundable Credits (Lines 30000-34000)'].push(field);
      } else if (lineNumber >= 40000 && lineNumber < 44000) {
        groups['Taxes (Lines 40000-43000)'].push(field);
      } else if (lineNumber >= 44000 && lineNumber < 49000) {
        groups['Refund/Credits (Lines 44000-48000)'].push(field);
      } else if (lineNumber >= 58000) {
        groups['Provincial Tax (Lines 58000+)'].push(field);
      } else {
        groups['Other Fields'].push(field);
      }
    });

    // Filter out empty groups and sort fields within each group
    return Object.entries(groups)
      .filter(([_, fields]) => fields.length > 0)
      .map(([category, fields]) => ({
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

  const fieldGroups = groupFieldsByCategory(t1Return.formFields);

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