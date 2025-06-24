import { Router } from 'express';
import { TaxCalculator } from '../services/taxCalculator';

export const taxBracketsRouter = Router();

/**
 * GET /api/tax-brackets/marginal-rate
 * Calculate marginal tax rate for given income and province
 */
taxBracketsRouter.get('/marginal-rate', async (req, res) => {
  try {
    const { income, province, taxYear = 2024 } = req.query;

    if (!income || !province) {
      return res.status(400).json({
        error: 'Income and province are required parameters'
      });
    }

    const incomeNum = parseFloat(income as string);
    if (isNaN(incomeNum) || incomeNum < 0) {
      return res.status(400).json({
        error: 'Income must be a valid positive number'
      });
    }

    const taxInfo = await TaxCalculator.calculateMarginalRate(
      incomeNum,
      province as string,
      parseInt(taxYear as string)
    );

    res.json(taxInfo);
  } catch (error) {
    console.error('Error calculating marginal tax rate:', error);
    res.status(500).json({
      error: 'Failed to calculate marginal tax rate'
    });
  }
});

/**
 * GET /api/tax-brackets/provinces
 * Get list of available provinces with tax data
 */
taxBracketsRouter.get('/provinces', async (req, res) => {
  try {
    const { taxYear = 2024 } = req.query;
    const provinces = await TaxCalculator.getAvailableProvinces(
      parseInt(taxYear as string)
    );
    
    res.json({ provinces });
  } catch (error) {
    console.error('Error getting available provinces:', error);
    res.status(500).json({
      error: 'Failed to get available provinces'
    });
  }
});