import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { T1FormField } from '@shared/schema';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ComprehensiveTaxInput {
  province: string;
  personalInfo: {
    age?: number;
    isMarried?: boolean;
    spouseIncome?: number;
    spouseAge?: number;
    hasDisability?: boolean;
    spouseHasDisability?: boolean;
    numDependants?: number;
    dependantAges?: number[];
    isStudent?: boolean;
    isVolunteerFirefighter?: boolean;
    isSearchRescueVolunteer?: boolean;
  };
  income: {
    employmentIncome?: number;
    employmentBenefits?: number;
    commissionIncome?: number;
    businessIncome?: number;
    professionalIncome?: number;
    farmingIncome?: number;
    fishingIncome?: number;
    interestIncome?: number;
    canadianDividendIncome?: number;
    foreignDividendIncome?: number;
    rentalIncome?: number;
    capitalGains?: number;
    capitalLosses?: number;
    cppQppBenefits?: number;
    oasBenefits?: number;
    privatePension?: number;
    rrifWithdrawals?: number;
    eiBenefits?: number;
    alimonyReceived?: number;
    otherIncome?: number;
  };
  deductions: {
    rrspContribution?: number;
    pensionContribution?: number;
    unionDues?: number;
    professionalDues?: number;
    childcareExpenses?: number;
    alimonyPaid?: number;
    medicalExpenses?: number;
    tuitionFees?: number;
    studentLoanInterest?: number;
    movingExpenses?: number;
    charitableDonations?: number;
    politicalContributions?: number;
  };
}

export interface ComprehensiveTaxResult {
  totalIncome: number;
  netIncome: number;
  taxableIncome: number;
  federalTax: number;
  provincialTax: number;
  totalTaxBeforeCredits: number;
  totalTaxAfterCredits: number;
  cppContribution: number;
  eiContribution: number;
  totalPayable: number;
  netIncomeAfterTax: number;
  averageTaxRate: number;
  marginalTaxRate: number;
  basicPersonalCredit: number;
  spouseCredit: number;
  ageCredit: number;
  pensionCredit: number;
  disabilityCredit: number;
  medicalCredit: number;
  charitableCredit: number;
  totalNonRefundableCredits: number;
  gstHstCredit: number;
  canadaChildBenefit: number;
  totalRefundableCredits: number;
  oasClawback: number;
  totalClawbacks: number;
  amtIncome: number;
  amtTax: number;
  tosiTax: number;
  provincialSurtax: number;
}

export class ComprehensiveTaxService {
  private pythonScriptPath: string;

  constructor() {
    this.pythonScriptPath = path.join(__dirname, 'comprehensiveTaxCalculator.py');
  }

  async calculateComprehensiveTax(input: ComprehensiveTaxInput): Promise<ComprehensiveTaxResult> {
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn('python3', [this.pythonScriptPath]);
      
      let outputData = '';
      let errorData = '';

      pythonProcess.stdout.on('data', (data) => {
        outputData += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        errorData += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Python process exited with code ${code}: ${errorData}`));
          return;
        }

        try {
          const result = JSON.parse(outputData);
          resolve(result);
        } catch (error) {
          reject(new Error(`Failed to parse Python output: ${error}`));
        }
      });

      // Send input data to Python process
      pythonProcess.stdin.write(JSON.stringify(input));
      pythonProcess.stdin.end();
    });
  }

  /**
   * Convert T1 form fields to comprehensive tax calculator input
   */
  convertT1FieldsToTaxInput(
    formFields: T1FormField[],
    province: string,
    personalInfo: {
      age?: number;
      isMarried?: boolean;
      spouseIncome?: number;
      numDependants?: number;
    } = {}
  ): ComprehensiveTaxInput {
    const getFieldValue = (fieldCode: string): number => {
      const field = formFields.find(f => f.fieldCode === fieldCode);
      return field ? parseFloat(field.fieldValue || '0') : 0;
    };

    return {
      province,
      personalInfo: {
        age: personalInfo.age || 30,
        isMarried: personalInfo.isMarried || false,
        spouseIncome: personalInfo.spouseIncome || 0,
        spouseAge: 30,
        hasDisability: false,
        spouseHasDisability: false,
        numDependants: personalInfo.numDependants || 0,
        dependantAges: [],
        isStudent: false,
        isVolunteerFirefighter: false,
        isSearchRescueVolunteer: false,
      },
      income: {
        // Employment Income (Lines 10100-10400)
        employmentIncome: getFieldValue('10100') + getFieldValue('10400'),
        employmentBenefits: getFieldValue('10130'),
        commissionIncome: getFieldValue('10200'),
        
        // Business Income (Lines 11500-13500)
        businessIncome: getFieldValue('11500') + getFieldValue('11700'),
        professionalIncome: getFieldValue('12000'),
        farmingIncome: getFieldValue('14100'),
        fishingIncome: getFieldValue('14300'),
        
        // Investment Income (Lines 12000-13000)
        interestIncome: getFieldValue('12100') + getFieldValue('12200'),
        canadianDividendIncome: getFieldValue('12000'),
        foreignDividendIncome: getFieldValue('12200'),
        rentalIncome: getFieldValue('12600'),
        
        // Capital Gains (Lines 12700-12800)
        capitalGains: getFieldValue('12700'),
        capitalLosses: getFieldValue('25200'), // Applied capital losses
        
        // Pension and Benefits (Lines 11400-11600)
        cppQppBenefits: getFieldValue('11400'),
        oasBenefits: getFieldValue('11300'),
        privatePension: getFieldValue('11500'),
        rrifWithdrawals: getFieldValue('11600'),
        
        // Other Income (Lines 10400-13000)
        eiBenefits: getFieldValue('11900'),
        alimonyReceived: getFieldValue('12800'),
        otherIncome: getFieldValue('13000'),
      },
      deductions: {
        // Registered Plans (Lines 20800-20900)
        rrspContribution: getFieldValue('20800'),
        pensionContribution: getFieldValue('20700'),
        
        // Employment Deductions (Lines 21200-21300)
        unionDues: getFieldValue('21200'),
        professionalDues: getFieldValue('21300'),
        
        // Personal Deductions (Lines 21400-21900)
        childcareExpenses: getFieldValue('21400'),
        alimonyPaid: getFieldValue('21500'),
        
        // Medical and Education (Lines 33099, 32300)
        medicalExpenses: getFieldValue('33099'),
        tuitionFees: getFieldValue('32300'),
        studentLoanInterest: getFieldValue('31900'),
        
        // Moving Expenses (Line 21900)
        movingExpenses: getFieldValue('21900'),
        
        // Donations (Lines 34900, 34950)
        charitableDonations: getFieldValue('34900'),
        politicalContributions: getFieldValue('34950'),
      },
    };
  }

  /**
   * Calculate marginal tax rates for different income types
   */
  async calculateMarginalRates(
    income: number,
    province: string,
    personalInfo: any = {}
  ): Promise<{
    regular: number;
    capitalGains: number;
    eligibleDividends: number;
    nonEligibleDividends: number;
    oasClawback: number;
  }> {
    const baseInput: ComprehensiveTaxInput = {
      province,
      personalInfo: {
        age: 30,
        isMarried: false,
        ...personalInfo,
      },
      income: {
        employmentIncome: income,
      },
      deductions: {},
    };

    // Calculate base tax
    const baseResult = await this.calculateComprehensiveTax(baseInput);

    // Calculate tax with additional $1000 of various income types
    const additionalAmount = 1000;

    const [
      regularResult,
      capitalGainsResult,
      eligibleDivResult,
      nonEligibleDivResult,
    ] = await Promise.all([
      this.calculateComprehensiveTax({
        ...baseInput,
        income: { ...baseInput.income, employmentIncome: income + additionalAmount },
      }),
      this.calculateComprehensiveTax({
        ...baseInput,
        income: { ...baseInput.income, capitalGains: additionalAmount },
      }),
      this.calculateComprehensiveTax({
        ...baseInput,
        income: { ...baseInput.income, canadianDividendIncome: additionalAmount },
      }),
      this.calculateComprehensiveTax({
        ...baseInput,
        income: { ...baseInput.income, foreignDividendIncome: additionalAmount },
      }),
    ]);

    const calculateMarginalRate = (newResult: ComprehensiveTaxResult): number => {
      const taxDifference = newResult.totalPayable - baseResult.totalPayable;
      return (taxDifference / additionalAmount) * 100;
    };

    // OAS clawback rate calculation
    const oasClawbackRate = income > 86912 ? 15 : 0; // 2024 threshold

    return {
      regular: calculateMarginalRate(regularResult),
      capitalGains: calculateMarginalRate(capitalGainsResult) * 0.5, // Only 50% taxable
      eligibleDividends: calculateMarginalRate(eligibleDivResult),
      nonEligibleDividends: calculateMarginalRate(nonEligibleDivResult),
      oasClawback: baseResult.marginalTaxRate + oasClawbackRate,
    };
  }

  /**
   * Calculate tax optimization scenarios
   */
  async calculateOptimizationScenarios(
    currentInput: ComprehensiveTaxInput
  ): Promise<{
    current: ComprehensiveTaxResult;
    maxRrsp: ComprehensiveTaxResult;
    incomeSplitting: ComprehensiveTaxResult;
    taxDeferral: ComprehensiveTaxResult;
  }> {
    const currentResult = await this.calculateComprehensiveTax(currentInput);

    // Scenario 1: Maximum RRSP contribution
    const maxRrspContribution = Math.min(
      (currentInput.income.employmentIncome || 0) * 0.18,
      31560 // 2024 RRSP limit
    );
    const maxRrspInput = {
      ...currentInput,
      deductions: {
        ...currentInput.deductions,
        rrspContribution: maxRrspContribution,
      },
    };

    // Scenario 2: Income splitting (if married)
    let incomeSplittingInput = currentInput;
    if (currentInput.personalInfo.isMarried) {
      const eligiblePension = currentInput.income.privatePension || 0;
      const splitAmount = Math.min(eligiblePension * 0.5, eligiblePension);
      
      incomeSplittingInput = {
        ...currentInput,
        income: {
          ...currentInput.income,
          privatePension: (currentInput.income.privatePension || 0) - splitAmount,
        },
        personalInfo: {
          ...currentInput.personalInfo,
          spouseIncome: (currentInput.personalInfo.spouseIncome || 0) + splitAmount,
        },
      };
    }

    // Scenario 3: Tax deferral through additional pension contributions
    const additionalPensionContribution = Math.min(
      (currentInput.income.employmentIncome || 0) * 0.1,
      3500 // Estimated additional contribution room
    );
    const taxDeferralInput = {
      ...currentInput,
      deductions: {
        ...currentInput.deductions,
        pensionContribution: (currentInput.deductions.pensionContribution || 0) + additionalPensionContribution,
      },
    };

    const [maxRrspResult, incomeSplittingResult, taxDeferralResult] = await Promise.all([
      this.calculateComprehensiveTax(maxRrspInput),
      this.calculateComprehensiveTax(incomeSplittingInput),
      this.calculateComprehensiveTax(taxDeferralInput),
    ]);

    return {
      current: currentResult,
      maxRrsp: maxRrspResult,
      incomeSplitting: incomeSplittingResult,
      taxDeferral: taxDeferralResult,
    };
  }

  /**
   * Calculate Marginal Effective Rate by running tax calculator twice
   * First with original income, then with $1 added to employment income
   */
  async calculateMarginalEffectiveRate(
    formFields: T1FormField[],
    province: string,
    personalInfo: any
  ): Promise<number> {
    try {
      // Convert T1 fields to tax input
      const baseInput = this.convertT1FieldsToTaxInput(formFields, province, personalInfo);
      
      // Calculate initial tax with original income
      const initialResult = await this.calculateComprehensiveTax(baseInput);
      const initialTaxOwing = (initialResult.federalTax || 0) + (initialResult.provincialTax || 0);

      // Create modified input with $1 added to employment income
      const modifiedInput = {
        ...baseInput,
        income: {
          ...baseInput.income,
          employmentIncome: (baseInput.income.employmentIncome || 0) + 1
        }
      };

      // Calculate tax with modified income
      const modifiedResult = await this.calculateComprehensiveTax(modifiedInput);
      const modifiedTaxOwing = (modifiedResult.federalTax || 0) + (modifiedResult.provincialTax || 0);

      // Calculate marginal effective rate as percentage
      const marginalEffectiveRate = ((modifiedTaxOwing - initialTaxOwing) / 1) * 100;

      return Math.round(marginalEffectiveRate * 100) / 100; // Round to 2 decimal places
    } catch (error) {
      console.error('Error calculating marginal effective rate:', error);
      throw new Error('Failed to calculate marginal effective rate');
    }
  }
}

export const comprehensiveTaxService = new ComprehensiveTaxService();