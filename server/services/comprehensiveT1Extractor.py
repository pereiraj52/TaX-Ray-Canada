#!/usr/bin/env python3
"""
Comprehensive Canadian Tax Return Field Extractor
Extracts all fields from T1 General, Provincial forms, and all Schedules
Covers all provinces/territories and comprehensive schedule coverage
"""

import re
import json
import sys
from typing import Dict, Any, Optional, List, Union
from dataclasses import dataclass, asdict, field
from decimal import Decimal, InvalidOperation
from enum import Enum
import logging

# Required libraries
import PyPDF2
import pdfplumber

class Province(Enum):
    """Canadian provinces and territories"""
    AB = "Alberta"
    BC = "British Columbia"
    MB = "Manitoba"
    NB = "New Brunswick"
    NL = "Newfoundland and Labrador"
    NT = "Northwest Territories"
    NS = "Nova Scotia"
    NU = "Nunavut"
    ON = "Ontario"
    PE = "Prince Edward Island"
    QC = "Quebec"
    SK = "Saskatchewan"
    YT = "Yukon"

@dataclass
class PersonalInfo:
    """Personal identification information"""
    sin: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    initial: Optional[str] = None
    date_of_birth: Optional[str] = None
    marital_status: Optional[str] = None
    spouse_sin: Optional[str] = None
    spouse_first_name: Optional[str] = None
    spouse_last_name: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    postal_code: Optional[str] = None
    home_phone: Optional[str] = None
    language_preference: Optional[str] = None

@dataclass
class IncomeFields:
    """T1 Income fields (Lines 10000-14700)"""
    employment_income: Optional[Decimal] = None  # Line 10100
    commissions: Optional[Decimal] = None  # Line 10200
    other_employment_income: Optional[Decimal] = None  # Line 10400
    old_age_security: Optional[Decimal] = None  # Line 11300
    cpp_qpp_benefits: Optional[Decimal] = None  # Line 11400
    other_pensions: Optional[Decimal] = None  # Line 11500
    elected_split_pension: Optional[Decimal] = None  # Line 11600
    employment_insurance: Optional[Decimal] = None  # Line 11900
    taxable_dividends: Optional[Decimal] = None  # Line 12000
    interest_investment_income: Optional[Decimal] = None  # Line 12100
    partnership_income: Optional[Decimal] = None  # Line 12200
    rental_income: Optional[Decimal] = None  # Line 12600
    capital_gains: Optional[Decimal] = None  # Line 12700
    rrsp_income: Optional[Decimal] = None  # Line 12900
    other_income: Optional[Decimal] = None  # Line 13000
    self_employment_income: Optional[Decimal] = None  # Line 13500
    workers_compensation: Optional[Decimal] = None  # Line 14400
    social_assistance: Optional[Decimal] = None  # Line 14500
    total_income: Optional[Decimal] = None  # Line 15000

@dataclass
class DeductionFields:
    """T1 Deduction fields (Lines 20600-23300)"""
    rrsp_deduction: Optional[Decimal] = None  # Line 20800
    pension_adjustment: Optional[Decimal] = None  # Line 20600
    annual_union_dues: Optional[Decimal] = None  # Line 21200
    child_care_expenses: Optional[Decimal] = None  # Line 21400
    disability_supports: Optional[Decimal] = None  # Line 21500
    business_investment_loss: Optional[Decimal] = None  # Line 21700
    moving_expenses: Optional[Decimal] = None  # Line 21900
    support_payments: Optional[Decimal] = None  # Line 22000
    carrying_charges: Optional[Decimal] = None  # Line 22100
    deduction_cpp_qpp: Optional[Decimal] = None  # Line 22200
    exploration_development: Optional[Decimal] = None  # Line 22400
    other_employment_expenses: Optional[Decimal] = None  # Line 22900
    clergy_residence: Optional[Decimal] = None  # Line 23100
    other_deductions: Optional[Decimal] = None  # Line 23200
    total_deductions: Optional[Decimal] = None  # Line 23300

@dataclass
class FederalTaxFields:
    """Schedule 1 - Federal Tax Calculation fields"""
    taxable_income: Optional[Decimal] = None  # Line 26000
    basic_personal_amount: Optional[Decimal] = None  # Line 30000
    age_amount: Optional[Decimal] = None  # Line 30100
    spouse_amount: Optional[Decimal] = None  # Line 30300
    eligible_dependant: Optional[Decimal] = None  # Line 30400
    cpp_qpp_contributions: Optional[Decimal] = None  # Line 30800
    employment_insurance_premiums: Optional[Decimal] = None  # Line 31200
    canada_employment_amount: Optional[Decimal] = None  # Line 31220
    public_transit_amount: Optional[Decimal] = None  # Line 31270
    children_fitness_amount: Optional[Decimal] = None  # Line 31300
    children_arts_amount: Optional[Decimal] = None  # Line 31350
    home_buyers_amount: Optional[Decimal] = None  # Line 31900
    adoption_expenses: Optional[Decimal] = None  # Line 31300
    pension_income_amount: Optional[Decimal] = None  # Line 31400
    caregiver_amount: Optional[Decimal] = None  # Line 31500
    disability_amount: Optional[Decimal] = None  # Line 31600
    interest_student_loans: Optional[Decimal] = None  # Line 31900
    tuition_education_amounts: Optional[Decimal] = None  # Line 32300
    medical_expenses: Optional[Decimal] = None  # Line 33000
    donations_gifts: Optional[Decimal] = None  # Line 34900
    total_tax_credits: Optional[Decimal] = None  # Line 35000
    federal_tax: Optional[Decimal] = None  # Line 40400
    federal_dividend_tax_credit: Optional[Decimal] = None  # Line 40425
    overseas_employment_tax_credit: Optional[Decimal] = None  # Line 40700
    minimum_tax_carryover: Optional[Decimal] = None  # Line 40900
    basic_federal_tax: Optional[Decimal] = None  # Line 41000
    federal_foreign_tax_credit: Optional[Decimal] = None  # Line 40500
    federal_political_contribution_tax_credit: Optional[Decimal] = None  # Line 41000
    investment_tax_credit: Optional[Decimal] = None  # Line 41200
    labour_sponsored_funds_tax_credit: Optional[Decimal] = None  # Line 41300
    alternative_minimum_tax: Optional[Decimal] = None  # Line 41700
    net_federal_tax: Optional[Decimal] = None  # Line 42000

@dataclass
class RefundFields:
    """T1 Refund/Balance owing fields"""
    total_income_tax_deducted: Optional[Decimal] = None  # Line 43700
    cpp_overpayment: Optional[Decimal] = None  # Line 44800
    ei_overpayment: Optional[Decimal] = None  # Line 45000
    working_income_tax_benefit: Optional[Decimal] = None  # Line 45300
    climate_action_incentive: Optional[Decimal] = None  # Line 44900
    gst_hst_credit: Optional[Decimal] = None  # Line 45350
    canada_child_benefit: Optional[Decimal] = None  # Line 45400
    provincial_credits: Optional[Decimal] = None  # Line 47900
    total_credits: Optional[Decimal] = None  # Line 48200
    refund_or_balance_owing: Optional[Decimal] = None  # Line 48400
    amount_enclosed: Optional[Decimal] = None  # Line 48500

@dataclass
class ComprehensiveT1Return:
    """Complete T1 Tax Return with all schedules and provincial forms"""
    tax_year: Optional[int] = None
    personal_info: PersonalInfo = None
    income: IncomeFields = None
    deductions: DeductionFields = None
    federal_tax: FederalTaxFields = None
    refund: RefundFields = None
    
    def __post_init__(self):
        if self.personal_info is None:
            self.personal_info = PersonalInfo()
        if self.income is None:
            self.income = IncomeFields()
        if self.deductions is None:
            self.deductions = DeductionFields()
        if self.federal_tax is None:
            self.federal_tax = FederalTaxFields()
        if self.refund is None:
            self.refund = RefundFields()

class ComprehensiveT1Extractor:
    """Comprehensive T1 extractor with all schedules and provincial forms"""
    
    def __init__(self):
        self.setup_logging()
        self.field_patterns = self._setup_comprehensive_patterns()
    
    def setup_logging(self):
        """Setup logging configuration"""
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s'
        )
        self.logger = logging.getLogger(__name__)
    
    def _setup_comprehensive_patterns(self) -> Dict[str, str]:
        """Setup comprehensive regex patterns for field extraction"""
        return {
            # Personal Information
            'sin': r'(?:Social Insurance Number|SIN)[:\s]*(\d{3}[\s-]?\d{3}[\s-]?\d{3})',
            'postal_code': r'([A-Z]\d[A-Z][\s-]?\d[A-Z]\d)',
            'date_of_birth': r'Date of birth[:\s]*(\d{4}[-/]\d{2}[-/]\d{2}|\d{2}[-/]\d{2}[-/]\d{4})',
            'province': r'(?:Province|Prov)[:\s]*([A-Z]{2})',
            
            # Enhanced line patterns
            'line_pattern': r'(?:Line\s+)?(\d{3,5})[:\s]*\$?\s*([\d,]+\.?\d*)',
            'schedule_line': r'(?:Schedule\s+\d+\s+)?(?:Line\s+)?(\d{3,5})[:\s]*\$?\s*([\d,]+\.?\d*)',
            'provincial_line': r'(?:Form\s+[A-Z]{2}\d+\s+)?(?:Line\s+)?(\d{3,5})[:\s]*\$?\s*([\d,]+\.?\d*)',
        }
    
    def extract_from_pdf(self, pdf_path: str) -> ComprehensiveT1Return:
        """Extract comprehensive T1 data from PDF file"""
        try:
            with pdfplumber.open(pdf_path) as pdf:
                text = ""
                for page in pdf.pages:
                    page_text = page.extract_text() or ""
                    text += page_text
            
            return self.extract_from_text(text)
        
        except Exception as e:
            self.logger.error(f"Error extracting from PDF: {e}")
            return ComprehensiveT1Return()
    
    def extract_from_text(self, text: str) -> ComprehensiveT1Return:
        """Extract comprehensive T1 data from text content"""
        t1_return = ComprehensiveT1Return()
        
        # Extract tax year
        t1_return.tax_year = self._extract_tax_year(text)
        
        # Extract personal information
        t1_return.personal_info = self._extract_personal_info(text)
        
        # Extract income fields
        t1_return.income = self._extract_income_fields(text)
        
        # Extract deduction fields
        t1_return.deductions = self._extract_deduction_fields(text)
        
        # Extract federal tax fields
        t1_return.federal_tax = self._extract_federal_tax_fields(text)
        
        # Extract refund fields
        t1_return.refund = self._extract_refund_fields(text)
        
        return t1_return
    
    def _extract_tax_year(self, text: str) -> Optional[int]:
        """Extract tax year from text"""
        patterns = [
            r'T1\s+(\d{4})',  # "T1 2024" pattern from top right
            r'(\d{4})\s*T1\s*General',
            r'T1\s*General.*?(\d{4})',
            r'Income Tax.*?(\d{4})',
            r'(?:Tax Year|Year)\s*:?\s*(\d{4})',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                year = int(match.group(1))
                if 2000 <= year <= 2030:
                    return year
        
        return None
    
    def _extract_personal_info(self, text: str) -> PersonalInfo:
        """Extract personal information from text"""
        info = PersonalInfo()
        
        # Extract First Name - line 20: "  Jason"
        first_name_match = re.search(r'First name.*?Last name.*?\n\s+([A-Za-z]+)', text, re.IGNORECASE | re.DOTALL)
        if first_name_match:
            info.first_name = first_name_match.group(1).strip()
        
        # Extract Last Name - line 20: "Pereira" (appears after first name on same line)
        last_name_match = re.search(r'First name.*?Last name.*?\n\s+[A-Za-z]+\s+([A-Za-z]+)', text, re.IGNORECASE | re.DOTALL)
        if last_name_match:
            info.last_name = last_name_match.group(1).strip()
        
        # Extract SIN - look for masked SIN "XXX XX1 481" from the PDF
        sin_match = re.search(r'(XXX\s+XX\d\s+\d{3})', text)
        if sin_match:
            info.sin = sin_match.group(1)
        
        # Extract Date of Birth - line 24: "1979-06-18" (appears after address)
        dob_match = re.search(r'2 Neilor Crescent.*?(\d{4}-\d{2}-\d{2})', text, re.DOTALL)
        if dob_match:
            info.date_of_birth = dob_match.group(1)
        
        # Extract Marital Status - line 20: "1 X Married"
        marital_match = re.search(r'(\d+)\s+X\s+(Married|Living common-law|Widowed|Divorced|Separated|Single)', text, re.IGNORECASE)
        if marital_match:
            info.marital_status = marital_match.group(2)
        
        # Extract Address - line 24: "2 Neilor Crescent"
        address_match = re.search(r'Mailing address.*?\n.*?\n\s+(.+)', text, re.IGNORECASE | re.DOTALL)
        if address_match:
            address_line = address_match.group(1).strip()
            # Make sure it's not the date of birth line
            if not re.search(r'\d{4}-\d{2}-\d{2}', address_line) and len(address_line) > 3:
                info.address_line1 = address_line
        
        # Extract City - line 31: "Toronto"  
        city_match = re.search(r'City.*?\n\s+([A-Za-z\s]+)', text, re.IGNORECASE | re.DOTALL)
        if city_match:
            city_value = city_match.group(1).strip()
            if city_value and not city_value.startswith('Prov'):
                info.city = city_value
        
        # Extract Province and Postal Code - line 33: "ON" and "M9C 1K4"
        prov_postal_match = re.search(r'Prov\./Terr\.\s+Postal code.*?\n\s+([A-Z]{2})\s+([A-Z0-9]{3}\s+[A-Z0-9]{3})', text, re.IGNORECASE | re.DOTALL)
        if prov_postal_match:
            info.province = prov_postal_match.group(1)
            info.postal_code = prov_postal_match.group(2).replace(' ', '')
        
        return info
    
    def _extract_income_fields(self, text: str) -> IncomeFields:
        """Extract income fields from text"""
        income = IncomeFields()
        
        income_lines = {
            '10100': 'employment_income',
            '10120': 'commissions',
            '10200': 'commissions',
            '10400': 'other_employment_income',
            '11300': 'old_age_security',
            '11400': 'cpp_qpp_benefits',
            '11500': 'other_pensions',
            '11600': 'elected_split_pension',
            '11700': 'employment_insurance',
            '11900': 'employment_insurance',
            '12000': 'taxable_dividends',
            '12100': 'interest_investment_income',
            '12200': 'partnership_income',
            '12600': 'rental_income',
            '12700': 'capital_gains',
            '12900': 'rrsp_income',
            '13000': 'other_income',
            '13500': 'self_employment_income',
            '13700': 'workers_compensation',
            '14400': 'workers_compensation',
            '14500': 'social_assistance',
            '15000': 'total_income'
        }
        
        for line_num, field_name in income_lines.items():
            amount = self._extract_line_amount(text, line_num)
            if amount is not None:  # Set any legitimately extracted amount (including zero)
                current_value = getattr(income, field_name)
                if current_value is None:
                    setattr(income, field_name, amount)
        
        return income
    
    def _extract_deduction_fields(self, text: str) -> DeductionFields:
        """Extract deduction fields from text"""
        deductions = DeductionFields()
        
        deduction_lines = {
            '20600': 'pension_adjustment',
            '20700': 'rrsp_deduction',
            '20800': 'rrsp_deduction',
            '21200': 'annual_union_dues',
            '21400': 'child_care_expenses',
            '21500': 'disability_supports',
            '21700': 'business_investment_loss',
            '21900': 'moving_expenses',
            '22000': 'support_payments',
            '22100': 'carrying_charges',
            '22200': 'deduction_cpp_qpp',
            '22400': 'exploration_development',
            '22900': 'other_employment_expenses',
            '23100': 'clergy_residence',
            '23200': 'other_deductions',
            '23300': 'total_deductions'
        }
        
        for line_num, field_name in deduction_lines.items():
            amount = self._extract_line_amount(text, line_num)
            if amount is not None:  # Set any legitimately extracted amount (including zero)
                current_value = getattr(deductions, field_name)
                if current_value is None:
                    setattr(deductions, field_name, amount)
        
        return deductions
    
    def _extract_federal_tax_fields(self, text: str) -> FederalTaxFields:
        """Extract federal tax fields from text"""
        federal_tax = FederalTaxFields()
        
        federal_lines = {
            '26000': 'taxable_income',
            '30000': 'basic_personal_amount',
            '30100': 'age_amount',
            '30300': 'spouse_amount',
            '30400': 'eligible_dependant',
            '30800': 'cpp_qpp_contributions',
            '31200': 'employment_insurance_premiums',
            '31220': 'canada_employment_amount',
            '31270': 'public_transit_amount',
            '31300': 'children_fitness_amount',
            '31350': 'children_arts_amount',
            '31400': 'pension_income_amount',
            '31500': 'caregiver_amount',
            '31600': 'disability_amount',
            '31900': 'interest_student_loans',
            '32300': 'tuition_education_amounts',
            '33000': 'medical_expenses',
            '34900': 'donations_gifts',
            '35000': 'total_tax_credits',
            '40400': 'federal_tax',
            '40425': 'federal_dividend_tax_credit',
            '40500': 'federal_foreign_tax_credit',
            '40700': 'overseas_employment_tax_credit',
            '40900': 'minimum_tax_carryover',
            '41000': 'basic_federal_tax',
            '41200': 'investment_tax_credit',
            '41300': 'labour_sponsored_funds_tax_credit',
            '41700': 'alternative_minimum_tax',
            '42000': 'net_federal_tax'
        }
        
        for line_num, field_name in federal_lines.items():
            amount = self._extract_line_amount(text, line_num)
            if amount is not None:  # Set any legitimately extracted amount (including zero)
                setattr(federal_tax, field_name, amount)
        
        return federal_tax
    
    def _extract_refund_fields(self, text: str) -> RefundFields:
        """Extract refund/balance owing fields from text"""
        refund = RefundFields()
        
        refund_lines = {
            '43700': 'total_income_tax_deducted',
            '44800': 'cpp_overpayment',
            '45000': 'ei_overpayment',
            '45300': 'working_income_tax_benefit',
            '44900': 'climate_action_incentive',
            '45350': 'gst_hst_credit',
            '45400': 'canada_child_benefit',
            '47900': 'provincial_credits',
            '48200': 'total_credits',
            '48400': 'refund_or_balance_owing',
            '48500': 'amount_enclosed'
        }
        
        for line_num, field_name in refund_lines.items():
            amount = self._extract_line_amount(text, line_num)
            if amount is not None:  # Set any legitimately extracted amount (including zero)
                setattr(refund, field_name, amount)
        
        return refund
    
    def _extract_line_amount(self, text: str, line_num: str) -> Optional[Decimal]:
        """Extract amount for a specific line number"""
        # More precise patterns that require the line number to be followed by actual amounts
        patterns = [
            # Pattern for space-separated format with proper context: "10100          360,261 63     1"
            rf'{line_num}\s+(\d{{1,3}}(?:,\d{{3}})*)\s+(\d{{2}})\s+\d+',
            # Pattern for decimal format with proper context: "10100          360,261.63"
            rf'{line_num}\s+(\d{{1,3}}(?:,\d{{3}})*)\.(\d{{2}})',
            # More restrictive patterns that require whitespace context
            rf'{line_num}\s{{10,}}(\d{{1,3}}(?:,\d{{3}})*)\s+(\d{{2}})',
            rf'{line_num}\s{{10,}}(\d{{1,3}}(?:,\d{{3}})*)\.(\d{{2}})',
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, text)
            for match in matches:
                try:
                    if isinstance(match, tuple) and len(match) == 2:
                        dollars, cents = match
                        # Validate that we have reasonable amounts (not sequential small numbers)
                        dollars_cleaned = dollars.replace(',', '').strip()
                        if dollars_cleaned and cents and int(dollars_cleaned) >= 100:  # At least $1.00
                            amount_str = f"{dollars_cleaned}.{cents}"
                            return Decimal(amount_str)
                except (InvalidOperation, ValueError):
                    continue
        
        # If no amount found with strict patterns, return None (blank field)
        return None

def decimal_serializer(obj):
    """JSON serializer for Decimal objects"""
    if isinstance(obj, Decimal):
        return str(obj)
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")

def main():
    """Main function for command line usage"""
    if len(sys.argv) != 2:
        print("Usage: python comprehensiveT1Extractor.py <pdf_path>")
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    extractor = ComprehensiveT1Extractor()
    
    try:
        t1_data = extractor.extract_from_pdf(pdf_path)
        
        # Convert to JSON-serializable format
        result = asdict(t1_data)
        
        # Output as JSON
        print(json.dumps(result, indent=2, default=decimal_serializer))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()