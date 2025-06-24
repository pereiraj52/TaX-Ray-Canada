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
        <span className="text-gray-600">Marginal Effective Rate:</span>
        <span className="font-medium text-primary">{marginalEffectiveRate.toFixed(2)}%</span>
      </div>
    </div>
  );
}