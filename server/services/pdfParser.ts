import fs from 'fs/promises';
import pdf from 'pdf-parse';
import { InsertT1FormField } from '@shared/schema';

export interface T1ExtractedData {
  taxYear: number;
  firstName: string;
  lastName: string;
  sin: string;
  dateOfBirth: string;
  province: string;
  maritalStatus: string;
  address: string;
  city: string;
  postalCode: string;
  spouseSin?: string;
  formFields: Omit<InsertT1FormField, 't1ReturnId'>[];
}

export class T1PDFParser {
  private static readonly T1_FIELD_PATTERNS = {
    // Basic identification
    taxYear: /T1\s+(\d{4})/,
    firstName: /First name\s*([A-Za-z\s]+)/,
    lastName: /Last name\s*([A-Za-z\s]+)/,
    sin: /Social insurance number.*?(\d{3}\s*\d{3}\s*\d{3})/,
    dateOfBirth: /Date of birth.*?(\d{4}-\d{2}-\d{2})/,
    province: /province or territory of residence.*?([A-Za-z\s]+)/i,
    maritalStatus: /Marital status.*?(Married|Single|Divorced|Separated|Widowed|Living common-law)/i,
    address: /Mailing address.*?\n\s*([^\n]+)/,
    city: /City\s*([A-Za-z\s]+)/,
    postalCode: /Postal code\s*([A-Z]\d[A-Z]\s*\d[A-Z]\d)/,
    spouseSin: /spouse.*?SIN.*?(\d{3}\s*\d{3}\s*\d{3})/i,
    
    // Income fields (line numbers from T1)
    employmentIncome: /10100\s*([0-9,]+\.?\d*)/,
    otherEmploymentIncome: /10400\s*([0-9,]+\.?\d*)/,
    oasPension: /11300\s*([0-9,]+\.?\d*)/,
    cppBenefits: /11400\s*([0-9,]+\.?\d*)/,
    otherPensions: /11500\s*([0-9,]+\.?\d*)/,
    splitPension: /11600\s*([0-9,]+\.?\d*)/,
    
    // Additional common T1 fields
    totalIncome: /15000\s*([0-9,]+\.?\d*)/,
    netIncome: /23600\s*([0-9,]+\.?\d*)/,
    taxableIncome: /26000\s*([0-9,]+\.?\d*)/,
    federalTax: /42000\s*([0-9,]+\.?\d*)/,
    totalPayable: /43500\s*([0-9,]+\.?\d*)/,
  };

  static async extractT1Data(filePath: string): Promise<T1ExtractedData> {
    try {
      const dataBuffer = await fs.readFile(filePath);
      const pdfData = await pdf(dataBuffer);
      const text = pdfData.text;

      const extractedData: T1ExtractedData = {
        taxYear: 2024, // Default
        firstName: '',
        lastName: '',
        sin: '',
        dateOfBirth: '',
        province: '',
        maritalStatus: '',
        address: '',
        city: '',
        postalCode: '',
        formFields: [],
      };

      // Extract basic information
      for (const [key, pattern] of Object.entries(this.T1_FIELD_PATTERNS)) {
        const match = text.match(pattern);
        if (match && match[1]) {
          const value = match[1].trim();
          
          if (key === 'taxYear') {
            extractedData.taxYear = parseInt(value);
          } else if (key in extractedData) {
            (extractedData as any)[key] = value;
          }
        }
      }

      // Extract all form fields with line numbers
      const formFields: Omit<InsertT1FormField, 't1ReturnId'>[] = [];
      
      // Extract monetary amounts with line numbers
      const linePatterns = [
        { code: '10100', name: 'Employment Income', pattern: /10100\s*([0-9,]+\.?\d*)/ },
        { code: '10400', name: 'Other Employment Income', pattern: /10400\s*([0-9,]+\.?\d*)/ },
        { code: '11300', name: 'OAS Pension', pattern: /11300\s*([0-9,]+\.?\d*)/ },
        { code: '11400', name: 'CPP/QPP Benefits', pattern: /11400\s*([0-9,]+\.?\d*)/ },
        { code: '11500', name: 'Other Pensions', pattern: /11500\s*([0-9,]+\.?\d*)/ },
        { code: '11600', name: 'Split Pension Amount', pattern: /11600\s*([0-9,]+\.?\d*)/ },
        { code: '15000', name: 'Total Income', pattern: /15000\s*([0-9,]+\.?\d*)/ },
        { code: '23600', name: 'Net Income', pattern: /23600\s*([0-9,]+\.?\d*)/ },
        { code: '26000', name: 'Taxable Income', pattern: /26000\s*([0-9,]+\.?\d*)/ },
        { code: '42000', name: 'Federal Tax', pattern: /42000\s*([0-9,]+\.?\d*)/ },
        { code: '43500', name: 'Total Payable', pattern: /43500\s*([0-9,]+\.?\d*)/ },
      ];

      for (const field of linePatterns) {
        const match = text.match(field.pattern);
        if (match && match[1]) {
          const cleanValue = match[1].replace(/,/g, '');
          formFields.push({
            fieldName: field.name,
            fieldCode: field.code,
            fieldValue: cleanValue,
            fieldType: 'currency',
          });
        }
      }

      // Extract text fields
      const textFields = [
        { code: 'first_name', name: 'First Name', value: extractedData.firstName },
        { code: 'last_name', name: 'Last Name', value: extractedData.lastName },
        { code: 'sin', name: 'Social Insurance Number', value: extractedData.sin },
        { code: 'date_of_birth', name: 'Date of Birth', value: extractedData.dateOfBirth },
        { code: 'province', name: 'Province of Residence', value: extractedData.province },
        { code: 'marital_status', name: 'Marital Status', value: extractedData.maritalStatus },
        { code: 'address', name: 'Mailing Address', value: extractedData.address },
        { code: 'city', name: 'City', value: extractedData.city },
        { code: 'postal_code', name: 'Postal Code', value: extractedData.postalCode },
      ];

      for (const field of textFields) {
        if (field.value) {
          formFields.push({
            fieldName: field.name,
            fieldCode: field.code,
            fieldValue: field.value,
            fieldType: 'text',
          });
        }
      }

      extractedData.formFields = formFields;

      return extractedData;
    } catch (error) {
      console.error('Error parsing T1 PDF:', error);
      throw new Error('Failed to extract data from T1 PDF');
    }
  }

  static async cleanupFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error('Error cleaning up file:', error);
    }
  }
}
