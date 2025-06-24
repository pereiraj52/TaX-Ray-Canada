import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

interface MarginalRateDisplayProps {
  income: number;
  province: string;
}

interface MarginalTaxInfo {
  federalRate: number;
  provincialRate: number;
  combinedRate: number;
  federalBracket?: string;
  provincialBracket?: string;
}

export default function MarginalRateDisplay({ income, province }: MarginalRateDisplayProps) {
  const { data: marginalInfo, isLoading, error } = useQuery<MarginalTaxInfo>({
    queryKey: ['marginal-rate', income, province],
    queryFn: async () => {
      if (!income || !province || income <= 0) {
        throw new Error('Invalid income or province');
      }
      
      const response = await fetch(
        `/api/tax-brackets/marginal-rate?income=${income}&province=${encodeURIComponent(province)}&taxYear=2024`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch marginal rate');
      }
      
      return response.json();
    },
    enabled: !!(income && province && income > 0),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (isLoading) {
    return <span className="animate-pulse">Calculating...</span>;
  }

  if (error || !marginalInfo) {
    // Fallback to simplified calculation if API fails
    const simplifiedRate = (() => {
      if (income <= 55000) return '20.05%';
      if (income <= 111000) return '31.00%';
      if (income <= 173000) return '43.41%';
      if (income <= 246000) return '46.67%';
      return '53.53%';
    })();
    
    return <span title="Estimated rate">{simplifiedRate}</span>;
  }

  return (
    <span title={`Federal: ${marginalInfo.federalRate.toFixed(2)}% + Provincial: ${marginalInfo.provincialRate.toFixed(2)}%`}>
      {marginalInfo.combinedRate.toFixed(2)}%
    </span>
  );
}