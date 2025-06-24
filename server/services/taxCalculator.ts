import { db } from '../db';
import { taxBrackets } from '@shared/schema';
import { eq, and, lte, gte, or, isNull } from 'drizzle-orm';

export interface MarginalTaxInfo {
  federalRate: number;
  provincialRate: number;
  combinedRate: number;
  federalBracket?: string;
  provincialBracket?: string;
}

export class TaxCalculator {
  /**
   * Calculate the marginal tax rate for a given income and province
   */
  static async calculateMarginalRate(
    income: number, 
    province: string, 
    taxYear: number = 2024
  ): Promise<MarginalTaxInfo> {
    // Get federal marginal rate
    const federalBracket = await db
      .select()
      .from(taxBrackets)
      .where(
        and(
          eq(taxBrackets.jurisdiction, 'federal'),
          eq(taxBrackets.taxYear, taxYear),
          lte(taxBrackets.minIncome, income.toString()),
          or(
            gte(taxBrackets.maxIncome, income.toString()),
            isNull(taxBrackets.maxIncome)
          )
        )
      )
      .limit(1);

    // Get provincial marginal rate
    const provincialBracket = await db
      .select()
      .from(taxBrackets)
      .where(
        and(
          eq(taxBrackets.jurisdiction, province.toUpperCase()),
          eq(taxBrackets.taxYear, taxYear),
          lte(taxBrackets.minIncome, income.toString()),
          or(
            gte(taxBrackets.maxIncome, income.toString()),
            isNull(taxBrackets.maxIncome)
          )
        )
      )
      .limit(1);

    const federalRate = federalBracket[0]?.marginalRate ? parseFloat(federalBracket[0].marginalRate) : 0;
    const provincialRate = provincialBracket[0]?.marginalRate ? parseFloat(provincialBracket[0].marginalRate) : 0;

    return {
      federalRate: federalRate * 100, // Convert to percentage
      provincialRate: provincialRate * 100,
      combinedRate: (federalRate + provincialRate) * 100,
      federalBracket: federalBracket[0] ? 
        `${federalBracket[0].minIncome} - ${federalBracket[0].maxIncome || 'infinity'}` : undefined,
      provincialBracket: provincialBracket[0] ? 
        `${provincialBracket[0].minIncome} - ${provincialBracket[0].maxIncome || 'infinity'}` : undefined,
    };
  }

  /**
   * Calculate effective tax rate (total tax / total income)
   */
  static calculateEffectiveRate(totalIncome: number, totalTax: number): number {
    if (totalIncome === 0) return 0;
    return (totalTax / totalIncome) * 100;
  }

  /**
   * Calculate average tax rate (same as effective rate)
   */
  static calculateAverageRate(totalIncome: number, totalTax: number): number {
    return this.calculateEffectiveRate(totalIncome, totalTax);
  }

  /**
   * Get all available provinces with tax data for a given year
   */
  static async getAvailableProvinces(taxYear: number = 2024): Promise<string[]> {
    const provinces = await db
      .selectDistinct({ jurisdiction: taxBrackets.jurisdiction })
      .from(taxBrackets)
      .where(
        and(
          eq(taxBrackets.taxYear, taxYear),
          eq(taxBrackets.jurisdiction, 'federal') // Exclude federal from province list
        )
      );

    return provinces
      .map(p => p.jurisdiction)
      .filter(j => j !== 'federal')
      .sort();
  }
}