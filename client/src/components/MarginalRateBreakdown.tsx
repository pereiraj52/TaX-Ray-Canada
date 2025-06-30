import React from 'react';
import { useQuery } from '@tanstack/react-query';

interface MarginalRateBreakdownProps {
  income: number;
  province: string;
  t1ReturnId?: number;
}

export default function MarginalRateBreakdown({ income, province, t1ReturnId }: MarginalRateBreakdownProps) {
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

      </div>
    );
  }

  const combinedRate = marginalRates.federalRate + marginalRates.provincialRate;
  

  
  // Calculate special marginal rates for different income types
  const marginalCapitalGainsRate = combinedRate * 0.5; // Only 50% of capital gains are taxable
  
  // Ontario 2024 authentic dividend rates based on income brackets
  const getOntarioDividendRates = (income: number) => {
    if (province !== 'ON') {
      // Fallback for other provinces - use simplified calculation
      const eligibleRate = combinedRate * 0.65; // Approximate
      const nonEligibleRate = combinedRate * 0.85; // Approximate
      return { eligible: eligibleRate, nonEligible: nonEligibleRate };
    }

    // Authentic Ontario 2024 rates from tax table
    if (income <= 51446) return { eligible: -1.20, nonEligible: 13.95 };
    if (income <= 55867) return { eligible: 6.39, nonEligible: 20.28 };
    if (income <= 90599) return { eligible: 8.92, nonEligible: 22.38 };
    if (income <= 102894) return { eligible: 12.24, nonEligible: 25.16 };
    if (income <= 106732) return { eligible: 17.79, nonEligible: 29.78 };
    if (income <= 111733) return { eligible: 25.38, nonEligible: 36.10 };
    if (income <= 150000) return { eligible: 27.53, nonEligible: 37.90 };
    if (income <= 173205) return { eligible: 32.11, nonEligible: 41.72 };
    if (income <= 220000) return { eligible: 34.26, nonEligible: 43.31 };
    if (income <= 246752) return { eligible: 39.34, nonEligible: 47.74 };
    return { eligible: 39.34, nonEligible: 47.74 }; // Top bracket
  };

  const dividendRates = getOntarioDividendRates(income);
  const marginalEligibleDividendRate = dividendRates.eligible;
  const marginalNonEligibleDividendRate = dividendRates.nonEligible;

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

    </div>
  );
}