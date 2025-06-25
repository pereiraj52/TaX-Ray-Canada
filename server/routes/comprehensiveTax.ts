import { Router } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { comprehensiveTaxService, ComprehensiveTaxInput } from '../services/comprehensiveTaxService';

export const comprehensiveTaxRouter = Router();

const calculateTaxSchema = z.object({
  province: z.string(),
  personalInfo: z.object({
    age: z.number().optional(),
    isMarried: z.boolean().optional(),
    spouseIncome: z.number().optional(),
    spouseAge: z.number().optional(),
    hasDisability: z.boolean().optional(),
    spouseHasDisability: z.boolean().optional(),
    numDependants: z.number().optional(),
    dependantAges: z.array(z.number()).optional(),
    isStudent: z.boolean().optional(),
    isVolunteerFirefighter: z.boolean().optional(),
    isSearchRescueVolunteer: z.boolean().optional(),
  }).optional(),
  income: z.object({
    employmentIncome: z.number().optional(),
    employmentBenefits: z.number().optional(),
    commissionIncome: z.number().optional(),
    businessIncome: z.number().optional(),
    professionalIncome: z.number().optional(),
    farmingIncome: z.number().optional(),
    fishingIncome: z.number().optional(),
    interestIncome: z.number().optional(),
    canadianDividendIncome: z.number().optional(),
    foreignDividendIncome: z.number().optional(),
    rentalIncome: z.number().optional(),
    capitalGains: z.number().optional(),
    capitalLosses: z.number().optional(),
    cppQppBenefits: z.number().optional(),
    oasBenefits: z.number().optional(),
    privatePension: z.number().optional(),
    rrifWithdrawals: z.number().optional(),
    eiBenefits: z.number().optional(),
    alimonyReceived: z.number().optional(),
    otherIncome: z.number().optional(),
  }).optional(),
  deductions: z.object({
    rrspContribution: z.number().optional(),
    pensionContribution: z.number().optional(),
    unionDues: z.number().optional(),
    professionalDues: z.number().optional(),
    childcareExpenses: z.number().optional(),
    alimonyPaid: z.number().optional(),
    medicalExpenses: z.number().optional(),
    tuitionFees: z.number().optional(),
    studentLoanInterest: z.number().optional(),
    movingExpenses: z.number().optional(),
    charitableDonations: z.number().optional(),
    politicalContributions: z.number().optional(),
  }).optional(),
});

/**
 * POST /api/comprehensive-tax/calculate
 * Calculate comprehensive tax using the advanced calculator
 */
comprehensiveTaxRouter.post('/calculate', async (req, res) => {
  try {
    const validatedData = calculateTaxSchema.parse(req.body);
    
    const input: ComprehensiveTaxInput = {
      province: validatedData.province,
      personalInfo: validatedData.personalInfo || {},
      income: validatedData.income || {},
      deductions: validatedData.deductions || {},
    };

    const result = await comprehensiveTaxService.calculateComprehensiveTax(input);
    res.json(result);
  } catch (error) {
    console.error('Error calculating comprehensive tax:', error);
    res.status(500).json({ error: 'Failed to calculate tax' });
  }
});

/**
 * POST /api/comprehensive-tax/calculate-from-t1/:t1ReturnId
 * Calculate comprehensive tax from existing T1 return data
 */
comprehensiveTaxRouter.post('/calculate-from-t1/:t1ReturnId', async (req, res) => {
  try {
    const t1ReturnId = parseInt(req.params.t1ReturnId);
    const { personalInfo } = req.body;

    // Get T1 return with form fields
    const t1Return = await storage.getT1Return(t1ReturnId);
    if (!t1Return) {
      return res.status(404).json({ error: 'T1 return not found' });
    }

    // Get client to determine province
    const client = await storage.getClient(t1Return.clientId);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Convert T1 fields to tax calculator input
    const input = comprehensiveTaxService.convertT1FieldsToTaxInput(
      t1Return.formFields,
      client.province || 'ON',
      personalInfo
    );

    const result = await comprehensiveTaxService.calculateComprehensiveTax(input);
    res.json(result);
  } catch (error) {
    console.error('Error calculating tax from T1:', error);
    res.status(500).json({ error: 'Failed to calculate tax from T1 data' });
  }
});

/**
 * POST /api/comprehensive-tax/marginal-rates
 * Calculate marginal tax rates for different income types
 */
comprehensiveTaxRouter.post('/marginal-rates', async (req, res) => {
  try {
    const { income, province, personalInfo } = req.body;

    if (!income || !province) {
      return res.status(400).json({ error: 'Income and province are required' });
    }

    const rates = await comprehensiveTaxService.calculateMarginalRates(
      income,
      province,
      personalInfo
    );

    res.json(rates);
  } catch (error) {
    console.error('Error calculating marginal rates:', error);
    res.status(500).json({ error: 'Failed to calculate marginal rates' });
  }
});

/**
 * POST /api/comprehensive-tax/optimization-scenarios
 * Calculate tax optimization scenarios
 */
comprehensiveTaxRouter.post('/optimization-scenarios', async (req, res) => {
  try {
    const validatedData = calculateTaxSchema.parse(req.body);
    
    const input: ComprehensiveTaxInput = {
      province: validatedData.province,
      personalInfo: validatedData.personalInfo || {},
      income: validatedData.income || {},
      deductions: validatedData.deductions || {},
    };

    const scenarios = await comprehensiveTaxService.calculateOptimizationScenarios(input);
    res.json(scenarios);
  } catch (error) {
    console.error('Error calculating optimization scenarios:', error);
    res.status(500).json({ error: 'Failed to calculate optimization scenarios' });
  }
});

/**
 * GET /api/comprehensive-tax/provinces
 * Get list of supported provinces/territories
 */
comprehensiveTaxRouter.get('/provinces', (req, res) => {
  const provinces = [
    { code: 'AB', name: 'Alberta' },
    { code: 'BC', name: 'British Columbia' },
    { code: 'MB', name: 'Manitoba' },
    { code: 'NB', name: 'New Brunswick' },
    { code: 'NL', name: 'Newfoundland and Labrador' },
    { code: 'NS', name: 'Nova Scotia' },
    { code: 'NT', name: 'Northwest Territories' },
    { code: 'NU', name: 'Nunavut' },
    { code: 'ON', name: 'Ontario' },
    { code: 'PE', name: 'Prince Edward Island' },
    { code: 'QC', name: 'Quebec' },
    { code: 'SK', name: 'Saskatchewan' },
    { code: 'YT', name: 'Yukon' },
  ];

  res.json(provinces);
});

/**
 * POST /api/comprehensive-tax/enhanced-marginal-analysis/:t1ReturnId
 * Enhanced marginal analysis including AMT, TOSI, and OAS clawback
 */
comprehensiveTaxRouter.post('/enhanced-marginal-analysis/:t1ReturnId', async (req, res) => {
  try {
    const t1ReturnId = parseInt(req.params.t1ReturnId);
    const { personalInfo } = req.body;

    // Get T1 return with form fields
    const t1Return = await storage.getT1Return(t1ReturnId);
    if (!t1Return) {
      return res.status(404).json({ error: 'T1 return not found' });
    }

    // Get client to determine province
    const client = await storage.getClient(t1Return.clientId);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Get total income from T1 fields
    const employmentIncome = parseFloat(
      t1Return.formFields.find(f => f.fieldCode === '10100')?.fieldValue || '0'
    );
    const totalIncome = parseFloat(
      t1Return.formFields.find(f => f.fieldCode === '15000')?.fieldValue || '0'
    );

    const baseIncome = Math.max(employmentIncome, totalIncome);

    // Calculate enhanced marginal rates
    const rates = await comprehensiveTaxService.calculateMarginalRates(
      baseIncome,
      client.province || 'ON',
      personalInfo
    );

    // Calculate comprehensive tax analysis
    const input = comprehensiveTaxService.convertT1FieldsToTaxInput(
      t1Return.formFields,
      client.province || 'ON',
      personalInfo
    );

    const comprehensiveResult = await comprehensiveTaxService.calculateComprehensiveTax(input);

    const response = {
      baseIncome,
      marginalRates: rates,
      comprehensiveAnalysis: {
        totalIncome: comprehensiveResult.totalIncome,
        federalTax: comprehensiveResult.federalTax,
        provincialTax: comprehensiveResult.provincialTax,
        amtTax: comprehensiveResult.amtTax,
        tosiTax: comprehensiveResult.tosiTax,
        oasClawback: comprehensiveResult.oasClawback,
        averageTaxRate: comprehensiveResult.averageTaxRate,
        marginalTaxRate: comprehensiveResult.marginalTaxRate,
      },
    };

    res.json(response);
  } catch (error) {
    console.error('Error performing enhanced marginal analysis:', error);
    res.status(500).json({ error: 'Failed to perform enhanced marginal analysis' });
  }
});