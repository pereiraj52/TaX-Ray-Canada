import React from 'react';
import { useQuery } from '@tanstack/react-query';

interface MarginalRateBreakdownProps {
  income: number;
  province: string;
}

export default function MarginalRateBreakdown({ income, province }: MarginalRateBreakdownProps) {
  const { data: marginalRates } = useQuery({
    queryKey: ['/api/tax-brackets/marginal-rate', income, province],
    queryFn: async () => {
      if (!income || !province) return null;
      const response = await fetch(`/api/tax-brackets/marginal-rate?income=${income}&province=${province}`);
      if (!response.ok) throw new Error('Failed to fetch marginal rates');
      return response.json();
    },
    enabled: !!income && !!province,
  });

  if (!marginalRates) {
    return (
      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-gray-600">Federal Marginal Rate:</span>
          <span className="font-medium text-primary">Loading...</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Provincial Marginal Rate:</span>
          <span className="font-medium text-primary">Loading...</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Combined Marginal Rate:</span>
          <span className="font-medium text-primary">Loading...</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Marginal Capital Gains Rate:</span>
          <span className="font-medium text-primary">Loading...</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Marginal Eligible Dividend Rate:</span>
          <span className="font-medium text-primary">Loading...</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Marginal Non-Eligible Dividend Rate:</span>
          <span className="font-medium text-primary">Loading...</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Marginal Effective Rate:</span>
          <span className="font-medium text-primary">Loading...</span>
        </div>
      </div>
    );
  }

  const combinedRate = marginalRates.federalRate + marginalRates.provincialRate;
  
  // Calculate marginal effective rate (includes benefit clawbacks)
  // For higher incomes, this typically includes OAS clawback and other benefit reductions
  const calculateMarginalEffectiveRate = (income: number, combinedRate: number) => {
    // OAS clawback starts at ~$86,912 (2024) at 15% rate
    const oasClawbackThreshold = 86912;
    const oasClawbackRate = 15.0;
    
    // Child benefit clawback varies by province and income
    let effectiveRate = combinedRate;
    
    if (income > oasClawbackThreshold && income < 142000) {
      effectiveRate += oasClawbackRate;
    }
    
    return effectiveRate;
  };
  
  const marginalEffectiveRate = calculateMarginalEffectiveRate(income, combinedRate);
  
  // Calculate special marginal rates for different income types
  const marginalCapitalGainsRate = combinedRate * 0.5; // Only 50% of capital gains are taxable
  
  // Eligible dividends get gross-up and dividend tax credit
  const marginalEligibleDividendRate = (() => {
    // Eligible dividends: 38% gross-up, then federal DTC of 25% and provincial varies
    const grossUpRate = 1.38;
    const federalDTC = 0.25;
    const provincialDTC = province === 'ON' ? 0.10 : 0.08; // Simplified provincial rates
    
    const grossedUpIncome = grossUpRate;
    const taxOnGrossedUp = grossedUpIncome * (combinedRate / 100);
    const totalDTC = federalDTC + provincialDTC;
    const netTax = taxOnGrossedUp - totalDTC;
    
    return Math.max(0, netTax * 100); // Convert to percentage
  })();
  
  // Non-eligible dividends: smaller gross-up and credit
  const marginalNonEligibleDividendRate = (() => {
    // Non-eligible dividends: 15% gross-up, smaller dividend tax credits
    const grossUpRate = 1.15;
    const federalDTC = 0.0833; // Federal DTC rate for non-eligible
    const provincialDTC = province === 'ON' ? 0.0298 : 0.025; // Simplified provincial rates
    
    const grossedUpIncome = grossUpRate;
    const taxOnGrossedUp = grossedUpIncome * (combinedRate / 100);
    const totalDTC = federalDTC + provincialDTC;
    const netTax = taxOnGrossedUp - totalDTC;
    
    return Math.max(0, netTax * 100); // Convert to percentage
  })();

  return (
    <div className="space-y-3">
      <div className="flex justify-between">
        <span className="text-gray-600">Federal Marginal Rate:</span>
        <span className="font-medium text-primary">{marginalRates.federalRate.toFixed(2)}%</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-600">Provincial Marginal Rate:</span>
        <span className="font-medium text-primary">{marginalRates.provincialRate.toFixed(2)}%</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-600">Combined Marginal Rate:</span>
        <span className="font-medium text-primary">{combinedRate.toFixed(2)}%</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-600">Marginal Capital Gains Rate:</span>
        <span className="font-medium text-primary">{marginalCapitalGainsRate.toFixed(2)}%</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-600">Marginal Eligible Dividend Rate:</span>
        <span className="font-medium text-primary">{marginalEligibleDividendRate.toFixed(2)}%</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-600">Marginal Non-Eligible Dividend Rate:</span>
        <span className="font-medium text-primary">{marginalNonEligibleDividendRate.toFixed(2)}%</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-600">Marginal Effective Rate:</span>
        <span className="font-medium text-primary">{marginalEffectiveRate.toFixed(2)}%</span>
      </div>
    </div>
  );
}