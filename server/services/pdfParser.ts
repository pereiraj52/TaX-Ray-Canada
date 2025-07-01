import fs from 'fs/promises';
import { spawn } from 'child_process';
import path from 'path';
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
  static async extractT1Data(filePath: string): Promise<T1ExtractedData> {
    try {
      const pythonScript = path.join(process.cwd(), 'server/services/comprehensiveT1Extractor.py');
      
      // Call the Python extractor
      const result = await this.runPythonExtractor(pythonScript, filePath);
      
      // Parse the JSON result
      const comprehensiveData = JSON.parse(result);
      console.log('Python extraction successful, converting to T1ExtractedData...');
      
      // Convert comprehensive data to our format
      const extractedData = this.convertToT1ExtractedData(comprehensiveData);
      console.log(`Conversion complete: ${extractedData.formFields.length} form fields generated`);
      return extractedData;
      
    } catch (error) {
      console.error('Error parsing T1 PDF:', error);
      throw new Error('Failed to extract data from T1 PDF');
    }
  }

  private static async runPythonExtractor(scriptPath: string, pdfPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn('python3', [scriptPath, pdfPath]);
      
      let stdout = '';
      let stderr = '';
      
      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      pythonProcess.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Python extraction failed: ${stderr}`));
        }
      });
      
      pythonProcess.on('error', (error) => {
        reject(new Error(`Failed to start Python process: ${error.message}`));
      });
    });
  }

  private static convertToT1ExtractedData(comprehensiveData: any): T1ExtractedData {
    const extractedData: T1ExtractedData = {
      taxYear: comprehensiveData.tax_year || 2024,
      firstName: comprehensiveData.personal_info?.first_name || '',
      lastName: comprehensiveData.personal_info?.last_name || '',
      sin: comprehensiveData.personal_info?.sin || '',
      dateOfBirth: comprehensiveData.personal_info?.date_of_birth || '',
      province: comprehensiveData.personal_info?.province || '',
      maritalStatus: comprehensiveData.personal_info?.marital_status || '',
      address: comprehensiveData.personal_info?.address_line1 || '',
      city: comprehensiveData.personal_info?.city || '',
      postalCode: comprehensiveData.personal_info?.postal_code || '',
      spouseSin: comprehensiveData.personal_info?.spouse_sin,
      formFields: [],
    };

    const formFields: Omit<InsertT1FormField, 't1ReturnId'>[] = [];

    // Add personal information fields
    if (comprehensiveData.personal_info) {
      const personalFields = [
        { key: 'first_name', name: 'First Name', type: 'text' },
        { key: 'last_name', name: 'Last Name', type: 'text' },
        { key: 'sin', name: 'Social Insurance Number', type: 'text' },
        { key: 'date_of_birth', name: 'Date of Birth', type: 'text' },
        { key: 'marital_status', name: 'Marital Status', type: 'text' },
        { key: 'address_line1', name: 'Address', type: 'text' },
        { key: 'city', name: 'City', type: 'text' },
        { key: 'province', name: 'Province', type: 'text' },
        { key: 'postal_code', name: 'Postal Code', type: 'text' },
      ];

      for (const field of personalFields) {
        const value = comprehensiveData.personal_info[field.key];
        if (value) {
          formFields.push({
            fieldName: field.name,
            fieldCode: field.key,
            fieldValue: value.toString(),
            fieldType: field.type,
          });
        }
      }
    }

    // Extract income fields
    if (comprehensiveData.income) {
      const incomeMapping = {
        employment_income: { code: '10100', name: 'Employment Income' },
        other_employment_income: { code: '10400', name: 'Other Employment Income' },
        old_age_security: { code: '11300', name: 'OAS Pension' },
        cpp_qpp_benefits: { code: '11400', name: 'CPP/QPP Benefits' },
        other_pensions: { code: '11500', name: 'Other Pensions' },
        elected_split_pension: { code: '11600', name: 'Split Pension Amount' },
        employment_insurance: { code: '11900', name: 'Employment Insurance' },
        taxable_dividends: { code: '12000', name: 'Taxable Dividends' },
        taxable_dividends_other: { code: '12010', name: 'Non-Eligible Dividends' },
        interest_investment_income: { code: '12100', name: 'Interest and Investment Income' },
        partnership_income: { code: '12200', name: 'Partnership Income' },
        rental_income: { code: '12600', name: 'Rental Income' },
        capital_gains: { code: '12700', name: 'Capital Gains' },
        rrsp_income: { code: '12900', name: 'RRSP Income' },
        other_income: { code: '13000', name: 'Other Income' },
        self_employment_income: { code: '13500', name: 'Self-Employment Income' },
        workers_compensation: { code: '14400', name: 'Workers Compensation' },
        social_assistance: { code: '14500', name: 'Social Assistance' },
        total_income: { code: '15000', name: 'Total Income' },
      };

      for (const [fieldKey, mapping] of Object.entries(incomeMapping)) {
        const value = comprehensiveData.income[fieldKey];
        if (value !== null && value !== undefined) {
          formFields.push({
            fieldName: mapping.name,
            fieldCode: mapping.code,
            fieldValue: value.toString(),
            fieldType: 'currency',
          });
        }
      }
    }

    // Extract deduction fields
    if (comprehensiveData.deductions) {
      const deductionMapping = {
        pension_adjustment: { code: '20600', name: 'Pension Adjustment' },
        rpp_deduction: { code: '20700', name: 'Registered Pension Plan Deduction' },
        rrsp_deduction: { code: '20800', name: 'RRSP Deduction' },
        fhsa_deduction: { code: '20805', name: 'FHSA Deduction' },
        prpp_employer_contributions: { code: '20810', name: 'PRPP Employer Contributions' },
        split_pension_deduction: { code: '21000', name: 'Split Pension Deduction' },
        annual_union_dues: { code: '21200', name: 'Annual Union Dues' },
        uccb_repayment: { code: '21300', name: 'UCCB Repayment' },
        child_care_expenses: { code: '21400', name: 'Child Care Expenses' },
        disability_supports: { code: '21500', name: 'Disability Supports' },
        business_investment_loss: { code: '21700', name: 'Business Investment Loss' },
        moving_expenses: { code: '21900', name: 'Moving Expenses' },
        support_payments_total: { code: '21999', name: 'Support Payments Total' },
        support_payments_allowable: { code: '22000', name: 'Support Payments Allowable' },
        carrying_charges: { code: '22100', name: 'Carrying Charges' },
        deduction_cpp_qpp_self: { code: '22200', name: 'CPP/QPP Self-Employed' },
        deduction_cpp_qpp_enhanced: { code: '22215', name: 'CPP/QPP Enhanced' },
        exploration_development: { code: '22400', name: 'Exploration Development' },
        other_employment_expenses: { code: '22900', name: 'Other Employment Expenses' },
        clergy_residence: { code: '23100', name: 'Clergy Residence' },
        other_deductions: { code: '23200', name: 'Other Deductions' },
        social_benefits_repayment: { code: '23500', name: 'Social Benefits Repayment' },
        total_deductions: { code: '23300', name: 'Total Deductions' },
        net_income: { code: '23600', name: 'Net Income' },
      };

      for (const [fieldKey, mapping] of Object.entries(deductionMapping)) {
        const value = comprehensiveData.deductions[fieldKey];
        if (value !== null && value !== undefined) {
          formFields.push({
            fieldName: mapping.name,
            fieldCode: mapping.code,
            fieldValue: value.toString(),
            fieldType: 'currency',
          });
        }
      }
    }

    // Extract federal tax fields
    if (comprehensiveData.federal_tax) {
      const federalTaxMapping = {
        taxable_income: { code: '26000', name: 'Taxable Income' },
        basic_personal_amount: { code: '30000', name: 'Basic Personal Amount' },
        age_amount: { code: '30100', name: 'Age Amount' },
        spouse_amount: { code: '30300', name: 'Spouse Amount' },
        eligible_dependant: { code: '30400', name: 'Eligible Dependant' },
        cpp_qpp_contributions: { code: '30800', name: 'CPP/QPP Contributions' },
        employment_insurance_premiums: { code: '31200', name: 'Employment Insurance Premiums' },
        canada_employment_amount: { code: '31220', name: 'Canada Employment Amount' },
        pension_income_amount: { code: '31400', name: 'Pension Income Amount' },
        caregiver_amount: { code: '31500', name: 'Caregiver Amount' },
        disability_amount: { code: '31600', name: 'Disability Amount' },
        interest_student_loans: { code: '31900', name: 'Interest on Student Loans' },
        tuition_education_amounts: { code: '32300', name: 'Tuition and Education Amounts' },
        medical_expenses: { code: '33099', name: 'Medical Expenses' },
        donations_gifts: { code: '34900', name: 'Donations and Gifts' },
        total_tax_credits: { code: '35000', name: 'Total Tax Credits' },
        federal_tax: { code: '40400', name: 'Federal Tax' },
        federal_dividend_tax_credit: { code: '40425', name: 'Federal Dividend Tax Credit' },
        federal_foreign_tax_credit: { code: '40500', name: 'Federal Foreign Tax Credit' },
        net_federal_tax: { code: '42000', name: 'Net Federal Tax' },
      };

      for (const [fieldKey, mapping] of Object.entries(federalTaxMapping)) {
        const value = comprehensiveData.federal_tax[fieldKey];
        if (value !== null && value !== undefined) {
          formFields.push({
            fieldName: mapping.name,
            fieldCode: mapping.code,
            fieldValue: value.toString(),
            fieldType: 'currency',
          });
        }
      }
    }

    // Extract refund fields
    if (comprehensiveData.refund) {
      const refundMapping = {
        total_income_tax_deducted: { code: '43700', name: 'Total Income Tax Deducted' },
        cpp_overpayment: { code: '44800', name: 'CPP Overpayment' },
        ei_overpayment: { code: '45000', name: 'EI Overpayment' },
        working_income_tax_benefit: { code: '45300', name: 'Working Income Tax Benefit' },
        climate_action_incentive: { code: '44900', name: 'Climate Action Incentive' },
        gst_hst_credit: { code: '45350', name: 'GST/HST Credit' },
        canada_child_benefit: { code: '45400', name: 'Canada Child Benefit' },
        provincial_credits: { code: '47900', name: 'Provincial Credits' },
        total_credits: { code: '48200', name: 'Total Credits' },
        refund_or_balance_owing: { code: '48400', name: 'Refund or Balance Owing' },
        amount_enclosed: { code: '48500', name: 'Amount Enclosed' },
      };

      for (const [fieldKey, mapping] of Object.entries(refundMapping)) {
        const value = comprehensiveData.refund[fieldKey];
        if (value !== null && value !== undefined) {
          formFields.push({
            fieldName: mapping.name,
            fieldCode: mapping.code,
            fieldValue: value.toString(),
            fieldType: 'currency',
          });
        }
      }
    }

    // Add text fields for personal information
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

    // Extract Ontario provincial tax fields
    if (comprehensiveData.ontario_tax) {
      const ontarioTaxMapping = {
        basic_personal_amount: { code: '58040', name: 'Ontario Basic Personal Amount' },
        age_amount: { code: '58080', name: 'Ontario Age Amount' },
        spouse_amount: { code: '58120', name: 'Ontario Spouse Amount' },
        eligible_dependant: { code: '58160', name: 'Ontario Eligible Dependant' },
        caregiver_amount: { code: '58185', name: 'Ontario Caregiver Amount' },
        cpp_qpp_contributions: { code: '58240', name: 'Ontario CPP/QPP Contributions' },
        cpp_qpp_self_employment: { code: '58280', name: 'Ontario CPP/QPP Self-Employment' },
        employment_insurance_premiums: { code: '58300', name: 'Ontario Employment Insurance Premiums' },
        volunteer_firefighter_amount: { code: '58305', name: 'Ontario Volunteer Firefighter Amount' },
        adoption_expenses: { code: '58330', name: 'Ontario Adoption Expenses' },
        pension_income_amount: { code: '58360', name: 'Ontario Pension Income Amount' },
        disability_amount: { code: '58440', name: 'Ontario Disability Amount' },
        disability_amount_transferred: { code: '58480', name: 'Ontario Disability Amount Transferred' },
        student_loan_interest: { code: '58520', name: 'Ontario Student Loan Interest' },
        tuition_education_amounts: { code: '58560', name: 'Ontario Tuition and Education Amounts' },
        amounts_transferred_spouse: { code: '58640', name: 'Ontario Amounts Transferred from Spouse' },
        medical_expenses: { code: '58689', name: 'Ontario Medical Expenses' },
        donations_gifts: { code: '58729', name: 'Ontario Donations and Gifts' },
        total_credits: { code: '58800', name: 'Ontario Total Credits' },
        total_non_refundable_credits: { code: '58840', name: 'Ontario Total Non-Refundable Credits' },
        ontario_non_refundable_tax_credits: { code: '61500', name: 'Ontario Non-Refundable Tax Credits' },
        ontario_tax_split_income: { code: '61510', name: 'Ontario Tax on Split Income' },
        ontario_dividend_tax_credit: { code: '61520', name: 'Ontario Dividend Tax Credit' },
        ontario_health_premium: { code: '62140', name: 'Ontario Health Premium' },
        ontario_tax: { code: '42800', name: 'Ontario Tax' },
      };

      for (const [fieldKey, mapping] of Object.entries(ontarioTaxMapping)) {
        const value = comprehensiveData.ontario_tax[fieldKey];
        if (value !== null && value !== undefined && value !== 'None' && parseFloat(value) > 0) {
          formFields.push({
            fieldName: mapping.name,
            fieldCode: mapping.code,
            fieldValue: parseFloat(value).toFixed(2),
            fieldType: 'currency',
          });
        }
      }
    }

    // Extract Schedule 7 fields
    if (comprehensiveData.schedule7) {
      const schedule7Mapping = {
        repayments_hbp: { code: '24600', name: 'HBP Repayments' },
        repayments_llp: { code: '24630', name: 'LLP Repayments' },
        rrsp_deduction_claimed: { code: '20800', name: 'RRSP Deduction Claimed' },
        fhsa_deduction: { code: '20805', name: 'FHSA Deduction' },
        spp_contributions: { code: '24640', name: 'SPP Contributions' },
        transfers_in: { code: '24650', name: 'Transfers In' },
      };

      for (const [fieldKey, mapping] of Object.entries(schedule7Mapping)) {
        const value = comprehensiveData.schedule7[fieldKey];
        if (value !== null && value !== undefined) {
          formFields.push({
            fieldName: mapping.name,
            fieldCode: mapping.code,
            fieldValue: value.toString(),
            fieldType: 'currency',
          });
        }
      }
    }

    extractedData.formFields = formFields;
    return extractedData;
  }

  static async cleanupFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error('Error cleaning up file:', error);
    }
  }
}
