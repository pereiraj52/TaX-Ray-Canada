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
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    postal_code: Optional[str] = None
    home_phone: Optional[str] = None
    language_preference: Optional[str] = None

@dataclass
class IncomeFields:
    """T1 Income fields (Lines 10000-15000)"""
    # Employment Income
    employment_income: Optional[Decimal] = None  # Line 10100
    tax_exempt_emergency_volunteer: Optional[Decimal] = None  # Line 10105
    commissions_included: Optional[Decimal] = None  # Line 10120
    wage_loss_replacement: Optional[Decimal] = None  # Line 10130
    other_employment_income: Optional[Decimal] = None  # Line 10400
    # Pension and Retirement Income
    old_age_security: Optional[Decimal] = None  # Line 11300
    cpp_qpp_benefits: Optional[Decimal] = None  # Line 11400
    other_pensions: Optional[Decimal] = None  # Line 11500
    elected_split_pension: Optional[Decimal] = None  # Line 11600
    uccb: Optional[Decimal] = None  # Line 11700
    uccb_dependent: Optional[Decimal] = None  # Line 11701
    split_income: Optional[Decimal] = None  # Line 11800
    # Government Benefits
    employment_insurance: Optional[Decimal] = None  # Line 11900
    ei_maternity_parental: Optional[Decimal] = None  # Line 11905
    # Investment Income
    taxable_dividends_eligible: Optional[Decimal] = None  # Line 12000
    taxable_dividends_other: Optional[Decimal] = None  # Line 12010
    interest_investment_income: Optional[Decimal] = None  # Line 12100
    partnership_income: Optional[Decimal] = None  # Line 12200
    foreign_dividends: Optional[Decimal] = None  # Line 12400
    # Other Income
    rdsp_income: Optional[Decimal] = None  # Line 12500
    rental_income: Optional[Decimal] = None  # Line 12600
    capital_gains: Optional[Decimal] = None  # Line 12700
    rrsp_income: Optional[Decimal] = None  # Line 12900
    fhsa_income: Optional[Decimal] = None  # Line 12905
    fhsa_income_other: Optional[Decimal] = None  # Line 12906
    other_income: Optional[Decimal] = None  # Line 13000
    scholarships: Optional[Decimal] = None  # Line 13010
    # Self-Employment Income
    self_employment_business: Optional[Decimal] = None  # Line 13499
    self_employment_partnership: Optional[Decimal] = None  # Line 13500
    self_employment_professional: Optional[Decimal] = None  # Line 13700
    self_employment_commission: Optional[Decimal] = None  # Line 13900
    self_employment_farming: Optional[Decimal] = None  # Line 14100
    self_employment_fishing: Optional[Decimal] = None  # Line 14300
    # Other Sources
    workers_compensation: Optional[Decimal] = None  # Line 14400
    social_assistance: Optional[Decimal] = None  # Line 14500
    net_federal_supplements: Optional[Decimal] = None  # Line 14600
    total_income: Optional[Decimal] = None  # Line 15000

@dataclass
class DeductionFields:
    """T1 Deduction fields (Lines 20000-23600)"""
    # Registered Plan Contributions
    pension_adjustment: Optional[Decimal] = None  # Line 20600
    rpp_deduction: Optional[Decimal] = None  # Line 20700
    rrsp_deduction: Optional[Decimal] = None  # Line 20800
    fhsa_deduction: Optional[Decimal] = None  # Line 20805
    prpp_employer_contributions: Optional[Decimal] = None  # Line 20810
    # Personal Deductions
    split_pension_deduction: Optional[Decimal] = None  # Line 21000
    annual_union_dues: Optional[Decimal] = None  # Line 21200
    uccb_repayment: Optional[Decimal] = None  # Line 21300
    child_care_expenses: Optional[Decimal] = None  # Line 21400
    disability_supports: Optional[Decimal] = None  # Line 21500
    business_investment_loss: Optional[Decimal] = None  # Line 21700
    moving_expenses: Optional[Decimal] = None  # Line 21900
    # Support and Investment Expenses
    support_payments_total: Optional[Decimal] = None  # Line 21999
    support_payments_allowable: Optional[Decimal] = None  # Line 22000
    carrying_charges: Optional[Decimal] = None  # Line 22100
    deduction_cpp_qpp_self: Optional[Decimal] = None  # Line 22200
    deduction_cpp_qpp_enhanced: Optional[Decimal] = None  # Line 22215
    # Specialized Deductions
    exploration_development: Optional[Decimal] = None  # Line 22400
    other_employment_expenses: Optional[Decimal] = None  # Line 22900
    clergy_residence: Optional[Decimal] = None  # Line 23100
    other_deductions: Optional[Decimal] = None  # Line 23200
    social_benefits_repayment: Optional[Decimal] = None  # Line 23500
    net_income: Optional[Decimal] = None  # Line 23600

@dataclass
class FederalTaxFields:
    """Schedule 1 - Federal Tax Calculation fields"""
    taxable_income: Optional[Decimal] = None  # Line 26000
    # Non-Refundable Tax Credits
    basic_personal_amount: Optional[Decimal] = None  # Line 30000
    age_amount: Optional[Decimal] = None  # Line 30100
    spouse_amount: Optional[Decimal] = None  # Line 30300
    eligible_dependant: Optional[Decimal] = None  # Line 30400
    caregiver_spouse: Optional[Decimal] = None  # Line 30425
    caregiver_other: Optional[Decimal] = None  # Line 30450
    caregiver_children: Optional[Decimal] = None  # Line 30500
    cpp_qpp_contributions: Optional[Decimal] = None  # Line 30800
    cpp_qpp_self_employment: Optional[Decimal] = None  # Line 31000
    employment_insurance_premiums: Optional[Decimal] = None  # Line 31200
    ppip_premiums_paid: Optional[Decimal] = None  # Line 31205
    ppip_premiums_payable: Optional[Decimal] = None  # Line 31210
    ei_self_employment: Optional[Decimal] = None  # Line 31217
    volunteer_firefighters: Optional[Decimal] = None  # Line 31220
    search_rescue_volunteers: Optional[Decimal] = None  # Line 31240
    canada_employment_amount: Optional[Decimal] = None  # Line 31260
    home_buyers_amount: Optional[Decimal] = None  # Line 31270
    home_accessibility_expenses: Optional[Decimal] = None  # Line 31285
    adoption_expenses: Optional[Decimal] = None  # Line 31300
    digital_news_subscription: Optional[Decimal] = None  # Line 31350
    pension_income_amount: Optional[Decimal] = None  # Line 31400
    disability_amount: Optional[Decimal] = None  # Line 31600
    disability_transferred: Optional[Decimal] = None  # Line 31800
    interest_student_loans: Optional[Decimal] = None  # Line 31900
    tuition_education_amounts: Optional[Decimal] = None  # Line 32300
    tuition_transferred_child: Optional[Decimal] = None  # Line 32400
    transferred_spouse: Optional[Decimal] = None  # Line 32600
    medical_expenses: Optional[Decimal] = None  # Line 33099
    medical_expenses_other: Optional[Decimal] = None  # Line 33199
    donations_gifts: Optional[Decimal] = None  # Line 34900
    total_tax_credits: Optional[Decimal] = None  # Line 35000
    # Tax Calculation Section
    federal_tax: Optional[Decimal] = None  # Line 40400
    federal_tax_split_income: Optional[Decimal] = None  # Line 40424
    federal_dividend_tax_credit: Optional[Decimal] = None  # Line 40425
    minimum_tax_carryover: Optional[Decimal] = None  # Line 40427
    federal_foreign_tax_credit: Optional[Decimal] = None  # Line 40500
    federal_political_contribution_tax_credit: Optional[Decimal] = None  # Line 41000
    investment_tax_credit: Optional[Decimal] = None  # Line 41200
    labour_sponsored_funds_tax_credit: Optional[Decimal] = None  # Line 41400
    acwb: Optional[Decimal] = None  # Line 41500
    minimum_tax: Optional[Decimal] = None  # Line 41700
    special_taxes: Optional[Decimal] = None  # Line 41800
    net_federal_tax: Optional[Decimal] = None  # Line 42000
    cpp_contributions_payable: Optional[Decimal] = None  # Line 42100
    ei_premiums_payable: Optional[Decimal] = None  # Line 42120
    social_benefits_repayment: Optional[Decimal] = None  # Line 42200
    provincial_tax: Optional[Decimal] = None  # Line 42800
    total_payable: Optional[Decimal] = None  # Line 43500
    total_income_tax_deducted: Optional[Decimal] = None  # Line 43700
    tax_transfer_quebec: Optional[Decimal] = None  # Line 43800
    quebec_abatement: Optional[Decimal] = None  # Line 44000
    cpp_qpp_overpayment: Optional[Decimal] = None  # Line 44800
    ei_overpayment: Optional[Decimal] = None  # Line 45000
    refundable_medical_expense: Optional[Decimal] = None  # Line 45200
    cwb: Optional[Decimal] = None  # Line 45300
    ctc: Optional[Decimal] = None  # Line 45350
    refund_investment_tax_credit: Optional[Decimal] = None  # Line 45400
    part_xii2_tax_credit: Optional[Decimal] = None  # Line 45600
    gst_hst_rebate: Optional[Decimal] = None  # Line 45700
    educator_school_supply: Optional[Decimal] = None  # Line 46900
    journalism_labour_tax_credit: Optional[Decimal] = None  # Line 47555
    fuel_charge_farmers_tax_credit: Optional[Decimal] = None  # Line 47556
    tax_paid_by_instalments: Optional[Decimal] = None  # Line 47600
    provincial_territorial_credits: Optional[Decimal] = None  # Line 47900
    refund: Optional[Decimal] = None  # Line 48400
    balance_owing: Optional[Decimal] = None  # Line 48500

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
    # Additional Refundable Credits
    tax_transfer_quebec: Optional[Decimal] = None  # Line 43800
    quebec_abatement: Optional[Decimal] = None  # Line 44000
    cpp_qpp_overpayment: Optional[Decimal] = None  # Line 44800
    refundable_medical_expense: Optional[Decimal] = None  # Line 45200
    cwb: Optional[Decimal] = None  # Line 45300
    ctc: Optional[Decimal] = None  # Line 45350
    refund_investment_tax_credit: Optional[Decimal] = None  # Line 45400
    part_xii2_tax_credit: Optional[Decimal] = None  # Line 45600
    gst_hst_rebate: Optional[Decimal] = None  # Line 45700
    educator_school_supply: Optional[Decimal] = None  # Line 46900
    journalism_labour_tax_credit: Optional[Decimal] = None  # Line 47555
    fuel_charge_farmers_tax_credit: Optional[Decimal] = None  # Line 47556
    tax_paid_by_instalments: Optional[Decimal] = None  # Line 47600
    provincial_territorial_credits: Optional[Decimal] = None  # Line 47900
    refund: Optional[Decimal] = None  # Line 48400
    balance_owing: Optional[Decimal] = None  # Line 48500

@dataclass
class OntarioTaxFields:
    """Ontario Form 428 Tax Credits and Deductions"""
    # Basic amounts and credits
    basic_personal_amount: Optional[Decimal] = None  # Line 58040
    age_amount: Optional[Decimal] = None  # Line 58080
    spouse_amount: Optional[Decimal] = None  # Line 58120
    eligible_dependant: Optional[Decimal] = None  # Line 58160
    caregiver_amount: Optional[Decimal] = None  # Line 58185
    # Employment-related credits
    cpp_qpp_contributions: Optional[Decimal] = None  # Line 58240
    cpp_qpp_self_employment: Optional[Decimal] = None  # Line 58280
    employment_insurance_premiums: Optional[Decimal] = None  # Line 58300
    volunteer_firefighter_amount: Optional[Decimal] = None  # Line 58305
    adoption_expenses: Optional[Decimal] = None  # Line 58330
    pension_income_amount: Optional[Decimal] = None  # Line 58360
    # Disability and medical
    disability_amount: Optional[Decimal] = None  # Line 58440
    disability_amount_transferred: Optional[Decimal] = None  # Line 58480
    # Education and training
    student_loan_interest: Optional[Decimal] = None  # Line 58520
    tuition_education_amounts: Optional[Decimal] = None  # Line 58560
    amounts_transferred_spouse: Optional[Decimal] = None  # Line 58640
    # Medical and other
    medical_expenses: Optional[Decimal] = None  # Line 58689
    donations_gifts: Optional[Decimal] = None  # Line 58729
    # Calculated amounts
    total_credits: Optional[Decimal] = None  # Line 58800
    total_non_refundable_credits: Optional[Decimal] = None  # Line 58840
    ontario_non_refundable_tax_credits: Optional[Decimal] = None  # Line 61500
    # Tax calculations
    ontario_tax_split_income: Optional[Decimal] = None  # Line 61510
    ontario_dividend_tax_credit: Optional[Decimal] = None  # Line 61520
    ontario_health_premium: Optional[Decimal] = None  # Line 62140
    ontario_tax: Optional[Decimal] = None  # Line 42800
    # Ontario Refundable Credits (Form 479ON)
    ontario_energy_property_tax_credit: Optional[Decimal] = None  # Line 61050
    ontario_senior_homeowners_grant: Optional[Decimal] = None  # Line 61052
    ontario_political_contribution_credit: Optional[Decimal] = None  # Line 61055
    ontario_sales_tax_credit: Optional[Decimal] = None  # Line 61056
    ontario_trillium_benefit: Optional[Decimal] = None  # Line 61080
    ontario_child_benefit: Optional[Decimal] = None  # Line 61240
    ontario_working_families_tax_credit: Optional[Decimal] = None  # Line 61300

@dataclass
class AlbertaTaxFields:
    """Alberta Form 428 Tax Credits and Deductions"""
    basic_personal_amount: Optional[Decimal] = None  # Line 58080
    age_amount: Optional[Decimal] = None  # Line 58160
    spouse_amount: Optional[Decimal] = None  # Line 58240
    eligible_dependant: Optional[Decimal] = None  # Line 58320
    caregiver_amount: Optional[Decimal] = None  # Line 58400
    disability_amount: Optional[Decimal] = None  # Line 58480
    pension_income_amount: Optional[Decimal] = None  # Line 58560
    tuition_amount: Optional[Decimal] = None  # Line 58640
    medical_expenses: Optional[Decimal] = None  # Line 58720
    donations_gifts: Optional[Decimal] = None  # Line 58800
    # Refundable Credits (Form 479AB)
    family_employment_tax_credit: Optional[Decimal] = None  # Line 61220
    carbon_levy_rebate: Optional[Decimal] = None  # Line 61230
    child_family_benefit: Optional[Decimal] = None  # Line 61240
    seniors_benefit: Optional[Decimal] = None  # Line 61250
    # Calculated
    total_credits: Optional[Decimal] = None
    total_non_refundable_credits: Optional[Decimal] = None
    dividend_tax_credit: Optional[Decimal] = None
    health_premium: Optional[Decimal] = None
    tax: Optional[Decimal] = None

@dataclass
class BritishColumbiaTaxFields:
    """British Columbia Form 428 Tax Credits and Deductions"""
    basic_personal_amount: Optional[Decimal] = None  # Line 58080
    age_amount: Optional[Decimal] = None  # Line 58160
    spouse_amount: Optional[Decimal] = None  # Line 58240
    eligible_dependant: Optional[Decimal] = None  # Line 58320
    caregiver_amount: Optional[Decimal] = None  # Line 58400
    disability_amount: Optional[Decimal] = None  # Line 58480
    pension_income_amount: Optional[Decimal] = None  # Line 58560
    tuition_amount: Optional[Decimal] = None  # Line 58640
    medical_expenses: Optional[Decimal] = None  # Line 58720
    donations_gifts: Optional[Decimal] = None  # Line 58800
    # Refundable Credits (Form 479BC)
    climate_action_tax_credit: Optional[Decimal] = None  # Line 61120
    family_bonus: Optional[Decimal] = None  # Line 61130
    early_childhood_tax_benefit: Optional[Decimal] = None  # Line 61140
    child_opportunity_benefit: Optional[Decimal] = None  # Line 61150
    caregiver_tax_credit: Optional[Decimal] = None  # Line 61160
    training_tax_credit: Optional[Decimal] = None  # Line 61170
    # Calculated
    total_credits: Optional[Decimal] = None
    total_non_refundable_credits: Optional[Decimal] = None
    dividend_tax_credit: Optional[Decimal] = None
    health_premium: Optional[Decimal] = None
    tax: Optional[Decimal] = None

@dataclass
class ManitobaTaxFields:
    """Manitoba Form 428 Tax Credits and Deductions"""
    basic_personal_amount: Optional[Decimal] = None  # Line 58080
    age_amount: Optional[Decimal] = None  # Line 58160
    spouse_amount: Optional[Decimal] = None  # Line 58240
    eligible_dependant: Optional[Decimal] = None  # Line 58320
    caregiver_amount: Optional[Decimal] = None  # Line 58400
    disability_amount: Optional[Decimal] = None  # Line 58480
    pension_income_amount: Optional[Decimal] = None  # Line 58560
    tuition_amount: Optional[Decimal] = None  # Line 58640
    medical_expenses: Optional[Decimal] = None  # Line 58720
    donations_gifts: Optional[Decimal] = None  # Line 58800
    # Refundable Credits (Form 479MB)
    low_income_tax_credit: Optional[Decimal] = None  # Line 61420
    family_tax_benefit: Optional[Decimal] = None  # Line 61430
    seniors_school_tax_rebate: Optional[Decimal] = None  # Line 61440
    # Calculated
    total_credits: Optional[Decimal] = None
    total_non_refundable_credits: Optional[Decimal] = None
    dividend_tax_credit: Optional[Decimal] = None
    health_premium: Optional[Decimal] = None
    tax: Optional[Decimal] = None

@dataclass
class NewBrunswickTaxFields:
    """New Brunswick Form 428 Tax Credits and Deductions"""
    basic_personal_amount: Optional[Decimal] = None  # Line 58080
    age_amount: Optional[Decimal] = None  # Line 58160
    spouse_amount: Optional[Decimal] = None  # Line 58240
    eligible_dependant: Optional[Decimal] = None  # Line 58320
    caregiver_amount: Optional[Decimal] = None  # Line 58400
    disability_amount: Optional[Decimal] = None  # Line 58480
    pension_income_amount: Optional[Decimal] = None  # Line 58560
    tuition_amount: Optional[Decimal] = None  # Line 58640
    medical_expenses: Optional[Decimal] = None  # Line 58720
    donations_gifts: Optional[Decimal] = None  # Line 58800
    # Refundable Credits (Form 479NB)
    low_income_tax_credit: Optional[Decimal] = None  # Line 61520
    child_tax_benefit: Optional[Decimal] = None  # Line 61530
    working_income_supplement: Optional[Decimal] = None  # Line 61540
    # Calculated
    total_credits: Optional[Decimal] = None
    total_non_refundable_credits: Optional[Decimal] = None
    dividend_tax_credit: Optional[Decimal] = None
    health_premium: Optional[Decimal] = None
    tax: Optional[Decimal] = None

@dataclass
class NewfoundlandLabradorTaxFields:
    """Newfoundland and Labrador Form 428 Tax Credits and Deductions"""
    basic_personal_amount: Optional[Decimal] = None  # Line 58080
    age_amount: Optional[Decimal] = None  # Line 58160
    spouse_amount: Optional[Decimal] = None  # Line 58240
    eligible_dependant: Optional[Decimal] = None  # Line 58320
    caregiver_amount: Optional[Decimal] = None  # Line 58400
    disability_amount: Optional[Decimal] = None  # Line 58480
    pension_income_amount: Optional[Decimal] = None  # Line 58560
    tuition_amount: Optional[Decimal] = None  # Line 58640
    medical_expenses: Optional[Decimal] = None  # Line 58720
    donations_gifts: Optional[Decimal] = None  # Line 58800
    # Refundable Credits (Form 479NL)
    low_income_tax_credit: Optional[Decimal] = None  # Line 61820
    child_benefit: Optional[Decimal] = None  # Line 61830
    seniors_benefit: Optional[Decimal] = None  # Line 61840
    # Calculated
    total_credits: Optional[Decimal] = None
    total_non_refundable_credits: Optional[Decimal] = None
    dividend_tax_credit: Optional[Decimal] = None
    health_premium: Optional[Decimal] = None
    tax: Optional[Decimal] = None

@dataclass
class NorthwestTerritoriesTaxFields:
    """Northwest Territories Form 428 Tax Credits and Deductions"""
    basic_personal_amount: Optional[Decimal] = None  # Line 58080
    age_amount: Optional[Decimal] = None  # Line 58160
    spouse_amount: Optional[Decimal] = None  # Line 58240
    eligible_dependant: Optional[Decimal] = None  # Line 58320
    caregiver_amount: Optional[Decimal] = None  # Line 58400
    disability_amount: Optional[Decimal] = None  # Line 58480
    pension_income_amount: Optional[Decimal] = None  # Line 58560
    tuition_amount: Optional[Decimal] = None  # Line 58640
    medical_expenses: Optional[Decimal] = None  # Line 58720
    donations_gifts: Optional[Decimal] = None  # Line 58800
    # Refundable Credits (Form 479NT)
    cost_of_living_credit: Optional[Decimal] = None  # Line 61920
    child_benefit: Optional[Decimal] = None  # Line 61930
    # Calculated
    total_credits: Optional[Decimal] = None
    total_non_refundable_credits: Optional[Decimal] = None
    dividend_tax_credit: Optional[Decimal] = None
    health_premium: Optional[Decimal] = None
    tax: Optional[Decimal] = None

@dataclass
class NovaScotiaTaxFields:
    """Nova Scotia Form 428 Tax Credits and Deductions"""
    basic_personal_amount: Optional[Decimal] = None  # Line 58080
    age_amount: Optional[Decimal] = None  # Line 58160
    spouse_amount: Optional[Decimal] = None  # Line 58240
    eligible_dependant: Optional[Decimal] = None  # Line 58320
    caregiver_amount: Optional[Decimal] = None  # Line 58400
    disability_amount: Optional[Decimal] = None  # Line 58480
    pension_income_amount: Optional[Decimal] = None  # Line 58560
    tuition_amount: Optional[Decimal] = None  # Line 58640
    medical_expenses: Optional[Decimal] = None  # Line 58720
    donations_gifts: Optional[Decimal] = None  # Line 58800
    # Refundable Credits (Form 479NS)
    affordable_living_tax_credit: Optional[Decimal] = None  # Line 61620
    child_benefit: Optional[Decimal] = None  # Line 61630
    poverty_reduction_credit: Optional[Decimal] = None  # Line 61640
    # Calculated
    total_credits: Optional[Decimal] = None
    total_non_refundable_credits: Optional[Decimal] = None
    dividend_tax_credit: Optional[Decimal] = None
    health_premium: Optional[Decimal] = None
    tax: Optional[Decimal] = None

@dataclass
class NunavutTaxFields:
    """Nunavut Form 428 Tax Credits and Deductions"""
    basic_personal_amount: Optional[Decimal] = None  # Line 58080
    age_amount: Optional[Decimal] = None  # Line 58160
    spouse_amount: Optional[Decimal] = None  # Line 58240
    eligible_dependant: Optional[Decimal] = None  # Line 58320
    caregiver_amount: Optional[Decimal] = None  # Line 58400
    disability_amount: Optional[Decimal] = None  # Line 58480
    pension_income_amount: Optional[Decimal] = None  # Line 58560
    tuition_amount: Optional[Decimal] = None  # Line 58640
    medical_expenses: Optional[Decimal] = None  # Line 58720
    donations_gifts: Optional[Decimal] = None  # Line 58800
    # Refundable Credits (Form 479NU)
    cost_of_living_credit: Optional[Decimal] = None  # Line 62020
    child_benefit: Optional[Decimal] = None  # Line 62030
    # Calculated
    total_credits: Optional[Decimal] = None
    total_non_refundable_credits: Optional[Decimal] = None
    dividend_tax_credit: Optional[Decimal] = None
    health_premium: Optional[Decimal] = None
    tax: Optional[Decimal] = None

@dataclass
class PrinceEdwardIslandTaxFields:
    """Prince Edward Island Form 428 Tax Credits and Deductions"""
    basic_personal_amount: Optional[Decimal] = None  # Line 58080
    age_amount: Optional[Decimal] = None  # Line 58160
    spouse_amount: Optional[Decimal] = None  # Line 58240
    eligible_dependant: Optional[Decimal] = None  # Line 58320
    caregiver_amount: Optional[Decimal] = None  # Line 58400
    disability_amount: Optional[Decimal] = None  # Line 58480
    pension_income_amount: Optional[Decimal] = None  # Line 58560
    tuition_amount: Optional[Decimal] = None  # Line 58640
    medical_expenses: Optional[Decimal] = None  # Line 58720
    donations_gifts: Optional[Decimal] = None  # Line 58800
    # Refundable Credits (Form 479PE)
    low_income_tax_credit: Optional[Decimal] = None  # Line 61720
    child_benefit: Optional[Decimal] = None  # Line 61730
    sales_tax_credit: Optional[Decimal] = None  # Line 61740
    # Calculated
    total_credits: Optional[Decimal] = None
    total_non_refundable_credits: Optional[Decimal] = None
    dividend_tax_credit: Optional[Decimal] = None
    health_premium: Optional[Decimal] = None
    tax: Optional[Decimal] = None

@dataclass
class QuebecTaxFields:
    """Quebec TP-1 Tax Credits and Deductions"""
    basic_personal_amount: Optional[Decimal] = None  # Line 350
    spouse_amount: Optional[Decimal] = None  # Line 351
    dependant_children_amount: Optional[Decimal] = None  # Line 352
    other_dependants_amount: Optional[Decimal] = None  # Line 353
    age_amount: Optional[Decimal] = None  # Line 354
    pension_income_amount: Optional[Decimal] = None  # Line 355
    disability_amount: Optional[Decimal] = None  # Line 358
    medical_expenses: Optional[Decimal] = None  # Line 361
    donations_gifts: Optional[Decimal] = None  # Line 393
    # Refundable Credits (Quebec)
    quebec_abatement: Optional[Decimal] = None  # Line 440
    quebec_tax_payable: Optional[Decimal] = None  # Line 451
    # Calculated
    total_credits: Optional[Decimal] = None
    total_non_refundable_credits: Optional[Decimal] = None
    dividend_tax_credit: Optional[Decimal] = None
    health_premium: Optional[Decimal] = None
    tax: Optional[Decimal] = None

@dataclass
class SaskatchewanTaxFields:
    """Saskatchewan Form 428 Tax Credits and Deductions"""
    basic_personal_amount: Optional[Decimal] = None  # Line 58080
    age_amount: Optional[Decimal] = None  # Line 58160
    spouse_amount: Optional[Decimal] = None  # Line 58240
    eligible_dependant: Optional[Decimal] = None  # Line 58320
    caregiver_amount: Optional[Decimal] = None  # Line 58400
    disability_amount: Optional[Decimal] = None  # Line 58480
    pension_income_amount: Optional[Decimal] = None  # Line 58560
    tuition_amount: Optional[Decimal] = None  # Line 58640
    medical_expenses: Optional[Decimal] = None  # Line 58720
    donations_gifts: Optional[Decimal] = None  # Line 58800
    # Refundable Credits (Form 479SK)
    low_income_tax_credit: Optional[Decimal] = None  # Line 61320
    seniors_supplement: Optional[Decimal] = None  # Line 61330
    graduate_retention_benefit: Optional[Decimal] = None  # Line 61340
    # Calculated
    total_credits: Optional[Decimal] = None
    total_non_refundable_credits: Optional[Decimal] = None
    dividend_tax_credit: Optional[Decimal] = None
    health_premium: Optional[Decimal] = None
    tax: Optional[Decimal] = None

@dataclass
class YukonTaxFields:
    """Yukon Form 428 Tax Credits and Deductions"""
    basic_personal_amount: Optional[Decimal] = None  # Line 58080
    age_amount: Optional[Decimal] = None  # Line 58160
    spouse_amount: Optional[Decimal] = None  # Line 58240
    eligible_dependant: Optional[Decimal] = None  # Line 58320
    caregiver_amount: Optional[Decimal] = None  # Line 58400
    disability_amount: Optional[Decimal] = None  # Line 58480
    pension_income_amount: Optional[Decimal] = None  # Line 58560
    tuition_amount: Optional[Decimal] = None  # Line 58640
    medical_expenses: Optional[Decimal] = None  # Line 58720
    donations_gifts: Optional[Decimal] = None  # Line 58800
    # Refundable Credits (Form 479YT)
    cost_of_living_credit: Optional[Decimal] = None  # Line 62120
    child_benefit: Optional[Decimal] = None  # Line 62130
    # Calculated
    total_credits: Optional[Decimal] = None
    total_non_refundable_credits: Optional[Decimal] = None
    dividend_tax_credit: Optional[Decimal] = None
    health_premium: Optional[Decimal] = None
    tax: Optional[Decimal] = None

@dataclass
class SpouseInfo:
    self_employed: Optional[bool] = None
    net_income: Optional[Decimal] = None
    uccb: Optional[Decimal] = None
    uccb_repayment: Optional[Decimal] = None

@dataclass
class Schedule7Fields:
    """Schedule 7 - RRSP, PRPP, SPP Contributions, Transfers, HBP/LLP Activities"""
    # rrsp_contributions: Optional[Decimal] = None  # Line 24500 (remove old field)
    unused_contributions_prior: Optional[Decimal] = None # Schedule 7, box 1
    rrsp_contributions: Optional[Decimal] = None  # Schedule 7, box 2 (was rrsp_contributions_line2)
    RRSP_60days: Optional[Decimal] = None  # Schedule 7, box 3
    repayments_hbp: Optional[Decimal] = None     # Line 24600
    spp_contributions: Optional[Decimal] = None  # Line 24640
    repayments_llp: Optional[Decimal] = None     # Line 24630
    transfers_in: Optional[Decimal] = None       # Line 24650
    excess_contributions: Optional[Decimal] = None # Line 23200 (if relevant)
    unused_contributions_current: Optional[Decimal] = None # Line 24400
    rrsp_deduction_limit: Optional[Decimal] = None # Line 11 (limit, not claim)
    rrsp_deduction_claimed: Optional[Decimal] = None # Line 20800 (claimed on T1)
    prpp_employer_contributions: Optional[Decimal] = None # Line 20810 (deduction, not direct contribution)
    fhsa_deduction: Optional[Decimal] = None # Line 20805
    total_deduction: Optional[Decimal] = None # Line 32000 (Schedule 7 total)
    prpp_contributions: Optional[Decimal] = None # Not directly mapped on S7; leave as null unless line is found

@dataclass
class ComprehensiveT1Return:
    """Complete T1 Tax Return with all schedules and provincial forms"""
    tax_year: Optional[int] = None
    personal_info: PersonalInfo = field(default_factory=PersonalInfo)
    income: IncomeFields = field(default_factory=IncomeFields)
    deductions: DeductionFields = field(default_factory=DeductionFields)
    federal_tax: FederalTaxFields = field(default_factory=FederalTaxFields)
    refund: RefundFields = field(default_factory=RefundFields)
    ontario_tax: OntarioTaxFields = field(default_factory=OntarioTaxFields)
    alberta_tax: AlbertaTaxFields = field(default_factory=AlbertaTaxFields)
    british_columbia_tax: BritishColumbiaTaxFields = field(default_factory=BritishColumbiaTaxFields)
    manitoba_tax: ManitobaTaxFields = field(default_factory=ManitobaTaxFields)
    new_brunswick_tax: NewBrunswickTaxFields = field(default_factory=NewBrunswickTaxFields)
    newfoundland_labrador_tax: NewfoundlandLabradorTaxFields = field(default_factory=NewfoundlandLabradorTaxFields)
    northwest_territories_tax: NorthwestTerritoriesTaxFields = field(default_factory=NorthwestTerritoriesTaxFields)
    nova_scotia_tax: NovaScotiaTaxFields = field(default_factory=NovaScotiaTaxFields)
    nunavut_tax: NunavutTaxFields = field(default_factory=NunavutTaxFields)
    prince_edward_island_tax: PrinceEdwardIslandTaxFields = field(default_factory=PrinceEdwardIslandTaxFields)
    quebec_tax: QuebecTaxFields = field(default_factory=QuebecTaxFields)
    saskatchewan_tax: SaskatchewanTaxFields = field(default_factory=SaskatchewanTaxFields)
    yukon_tax: YukonTaxFields = field(default_factory=YukonTaxFields)
    spouse_info: SpouseInfo = field(default_factory=SpouseInfo)
    schedule7: Schedule7Fields = field(default_factory=Schedule7Fields)
    
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
        if self.spouse_info is None:
            self.spouse_info = SpouseInfo()

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
        
        # Extract Ontario provincial tax fields
        t1_return.ontario_tax = self._extract_ontario_tax_fields(text)
        
        # Extract Alberta tax fields
        t1_return.alberta_tax = self._extract_alberta_tax_fields(text)
        
        # Extract British Columbia tax fields
        t1_return.british_columbia_tax = self._extract_british_columbia_tax_fields(text)
        
        # Extract Manitoba tax fields
        t1_return.manitoba_tax = self._extract_manitoba_tax_fields(text)
        
        # Extract New Brunswick tax fields
        t1_return.new_brunswick_tax = self._extract_new_brunswick_tax_fields(text)
        
        # Extract Newfoundland and Labrador tax fields
        t1_return.newfoundland_labrador_tax = self._extract_newfoundland_labrador_tax_fields(text)
        
        # Extract Northwest Territories tax fields
        t1_return.northwest_territories_tax = self._extract_northwest_territories_tax_fields(text)
        
        # Extract Nova Scotia tax fields
        t1_return.nova_scotia_tax = self._extract_nova_scotia_tax_fields(text)
        
        # Extract Nunavut tax fields
        t1_return.nunavut_tax = self._extract_nunavut_tax_fields(text)
        
        # Extract Prince Edward Island tax fields
        t1_return.prince_edward_island_tax = self._extract_prince_edward_island_tax_fields(text)
        
        # Extract Quebec tax fields
        t1_return.quebec_tax = self._extract_quebec_tax_fields(text)
        
        # Extract Saskatchewan tax fields
        t1_return.saskatchewan_tax = self._extract_saskatchewan_tax_fields(text)
        
        # Extract Yukon tax fields
        t1_return.yukon_tax = self._extract_yukon_tax_fields(text)
        
        # Spouse-specific fields
        t1_return.spouse_info = self._extract_spouse_info(text)
        
        # Extract Schedule 7 fields
        t1_return.schedule7 = self._extract_schedule7_fields(text)
        
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
        # Extract First Name and Last Name from the same line
        name_pattern = re.search(r'First name\s+Last name.*?\n\s*([A-Za-z]+)\s+([A-Za-z]+)', text, re.IGNORECASE | re.DOTALL)
        if name_pattern:
            info.first_name = name_pattern.group(1).strip()
            info.last_name = name_pattern.group(2).strip()
        else:
            # Fallback patterns
            first_name_match = re.search(r'First name.*?\n\s+([A-Za-z]+)', text, re.IGNORECASE | re.DOTALL)
            if first_name_match:
                info.first_name = first_name_match.group(1).strip()
            last_name_match = re.search(r'Last name.*?\n\s+([A-Za-z]+)', text, re.IGNORECASE | re.DOTALL)
            if last_name_match:
                info.last_name = last_name_match.group(1).strip()
        # Extract Spouse First Name using 'their first name' label
        spouse_their_first_name_idx = None
        lines = text.splitlines()
        for i, line in enumerate(lines):
            if 'their first name' in line.lower():
                spouse_their_first_name_idx = i
                break
        if spouse_their_first_name_idx is not None:
            # Look for the next non-empty line after the label
            for j in range(spouse_their_first_name_idx + 1, min(spouse_their_first_name_idx + 5, len(lines))):
                possible_name = lines[j].strip()
                if possible_name:
                    # Only take the first word as the first name
                    info.spouse_first_name = possible_name.split()[0]
                    break
        # Extract SIN - look for masked SIN "XXX XX1 481" from the PDF
        sin_match = re.search(r'(XXX\s+XX\d\s+\d{3})', text)
        if sin_match:
            info.sin = sin_match.group(1)
        # Extract Date of Birth - line 24: "1979-06-18" (appears near "Date of birth")
        dob_match = re.search(r'Date of birth.*?\n.*?(\d{4}-\d{2}-\d{2})', text, re.IGNORECASE | re.DOTALL)
        if dob_match:
            year = int(dob_match.group(1)[:4])
            if 1900 <= year <= 2010:
                info.date_of_birth = dob_match.group(1)
        # Extract Marital Status - line 20: "1 X Married"
        marital_match = re.search(r'(\d+)\s+X\s+(Married|Living common-law|Widowed|Divorced|Separated|Single)', text, re.IGNORECASE)
        if marital_match:
            info.marital_status = marital_match.group(2)
        # More robust address extraction
        lines = text.splitlines()
        for i, line in enumerate(lines):
            # Address Line 1: look for a street address (starts with a number) after 'Mailing address'
            if re.search(r'Mailing address', line, re.IGNORECASE):
                for j in range(i+1, min(i+7, len(lines))):
                    next_line = lines[j].strip()
                    m = re.match(r'(\d{1,5} [A-Za-z0-9 .\'-]+)', next_line)
                    if m:
                        addr = m.group(1)
                        addr = re.split(r'\s+\d{4}-\d{2}-\d{2}|\s+\d+\s+(Married|Widowed|Divorced|Separated|Single)|\s+\d{1,2}\s*$', addr)[0]
                        info.address_line1 = addr.strip()
                        break
            # City: after 'City', take the next non-empty line, strip anything after '(' or a comma
            if re.search(r'^City', line, re.IGNORECASE):
                for j in range(i+1, min(i+7, len(lines))):
                    next_line = lines[j].strip()
                    if next_line:
                        city_clean = re.split(r'[\(,]', next_line)[0].strip()
                        info.city = city_clean
                        break
            # Province and Postal Code: look for a line matching the pattern after the label
            if re.search(r'Prov\./Terr\. Postal code', line, re.IGNORECASE):
                for j in range(i+1, min(i+7, len(lines))):
                    next_line = lines[j].strip()
                    match = re.search(r'([A-Z]{2})\s*([A-Z]\d[A-Z][ -]?\d[A-Z]\d)', next_line)
                    if match:
                        info.province = match.group(1)
                        info.postal_code = match.group(2).replace(' ', '')
                        break
        # Extract Spouse SIN using 'their SIN' label
        spouse_their_sin_idx = None
        for i, line in enumerate(lines):
            if 'their sin' in line.lower():
                spouse_their_sin_idx = i
                break
        if spouse_their_sin_idx is not None:
            # Look for the next non-empty line after the label
            for j in range(spouse_their_sin_idx + 1, min(spouse_their_sin_idx + 5, len(lines))):
                possible_sin = lines[j].strip()
                if possible_sin:
                    # Only take the first group of digits or masked SIN
                    sin_match = re.search(r'(\d{3} ?\d{3} ?\d{3}|XXX ?XX\d ?\d{3})', possible_sin)
                    if sin_match:
                        info.spouse_sin = sin_match.group(1)
                        break
        # DEBUG: Print all lines containing 'spouse' to help tune regex
        for line in text.splitlines():
            if 'spouse' in line.lower():
                # print('DEBUG-SPOUSE-LINE:', line)
                pass
        return info
    
    def _extract_fields(self, text: str, field_map: dict, dataclass_type):
        """Generic extraction for fields based on a mapping and dataclass type."""
        instance = dataclass_type()
        for line_num, field_name in field_map.items():
            amount = self._extract_line_amount(text, line_num)
            if amount is not None:
                current_value = getattr(instance, field_name)
                if current_value is None:
                    setattr(instance, field_name, amount)
        return instance
    
    def _extract_income_fields(self, text: str) -> IncomeFields:
        """Extract income fields from text"""
        income_lines = {
            # Employment Income
            '10100': 'employment_income',
            '10105': 'tax_exempt_emergency_volunteer',
            '10120': 'commissions_included',
            '10130': 'wage_loss_replacement',
            '10400': 'other_employment_income',
            # Pension and Retirement Income
            '11300': 'old_age_security',
            '11400': 'cpp_qpp_benefits',
            '11500': 'other_pensions',
            '11600': 'elected_split_pension',
            '11700': 'uccb',
            '11701': 'uccb_dependent',
            '11800': 'split_income',
            # Government Benefits
            '11900': 'employment_insurance',
            '11905': 'ei_maternity_parental',
            # Investment Income
            '12000': 'taxable_dividends_eligible',
            '12010': 'taxable_dividends_other',
            '12100': 'interest_investment_income',
            '12200': 'partnership_income',
            '12400': 'foreign_dividends',
            # Other Income
            '12500': 'rdsp_income',
            '12600': 'rental_income',
            '12700': 'capital_gains',
            '12900': 'rrsp_income',
            '12905': 'fhsa_income',
            '12906': 'fhsa_income_other',
            '13000': 'other_income',
            '13010': 'scholarships',
            # Self-Employment Income
            '13499': 'self_employment_business',
            '13500': 'self_employment_partnership',
            '13700': 'self_employment_professional',
            '13900': 'self_employment_commission',
            '14100': 'self_employment_farming',
            '14300': 'self_employment_fishing',
            # Other Sources
            '14400': 'workers_compensation',
            '14500': 'social_assistance',
            '14600': 'net_federal_supplements',
            '15000': 'total_income',
        }
        return self._extract_fields(text, income_lines, IncomeFields)
    
    def _extract_deduction_fields(self, text: str) -> DeductionFields:
        """Extract deduction fields from text"""
        deduction_lines = {
            # Registered Plan Contributions
            '20600': 'pension_adjustment',
            '20700': 'rpp_deduction',
            '20800': 'rrsp_deduction',
            '20805': 'fhsa_deduction',
            '20810': 'prpp_employer_contributions',
            # Personal Deductions
            '21000': 'split_pension_deduction',
            '21200': 'annual_union_dues',
            '21300': 'uccb_repayment',
            '21400': 'child_care_expenses',
            '21500': 'disability_supports',
            '21700': 'business_investment_loss',
            '21900': 'moving_expenses',
            # Support and Investment Expenses
            '21999': 'support_payments_total',
            '22000': 'support_payments_allowable',
            '22100': 'carrying_charges',
            '22200': 'deduction_cpp_qpp_self',
            '22215': 'deduction_cpp_qpp_enhanced',
            # Specialized Deductions
            '22400': 'exploration_development',
            '22900': 'other_employment_expenses',
            '23100': 'clergy_residence',
            '23200': 'other_deductions',
            '23500': 'social_benefits_repayment',
            '23600': 'net_income',
        }
        return self._extract_fields(text, deduction_lines, DeductionFields)
    
    def _extract_federal_tax_fields(self, text: str) -> FederalTaxFields:
        """Extract federal tax fields from text"""
        federal_lines = {
            '26000': 'taxable_income',
            # Non-Refundable Tax Credits
            '30000': 'basic_personal_amount',
            '30100': 'age_amount',
            '30300': 'spouse_amount',
            '30400': 'eligible_dependant',
            '30425': 'caregiver_spouse',
            '30450': 'caregiver_other',
            '30500': 'caregiver_children',
            '30800': 'cpp_qpp_contributions',
            '31000': 'cpp_qpp_self_employment',
            '31200': 'employment_insurance_premiums',
            '31205': 'ppip_premiums_paid',
            '31210': 'ppip_premiums_payable',
            '31217': 'ei_self_employment',
            '31220': 'volunteer_firefighters',
            '31240': 'search_rescue_volunteers',
            '31260': 'canada_employment_amount',
            '31270': 'home_buyers_amount',
            '31285': 'home_accessibility_expenses',
            '31300': 'adoption_expenses',
            '31350': 'digital_news_subscription',
            '31400': 'pension_income_amount',
            '31600': 'disability_amount',
            '31800': 'disability_transferred',
            '31900': 'interest_student_loans',
            '32300': 'tuition_education_amounts',
            '32400': 'tuition_transferred_child',
            '32600': 'transferred_spouse',
            '33099': 'medical_expenses',
            '33199': 'medical_expenses_other',
            '34900': 'donations_gifts',
            '35000': 'total_tax_credits',
            # Tax Calculation Section
            '40400': 'federal_tax',
            '40424': 'federal_tax_split_income',
            '40425': 'federal_dividend_tax_credit',
            '40427': 'minimum_tax_carryover',
            '40500': 'federal_foreign_tax_credit',
            '41000': 'federal_political_contribution_tax_credit',
            '41200': 'investment_tax_credit',
            '41400': 'labour_sponsored_funds_tax_credit',
            '41500': 'acwb',
            '41700': 'minimum_tax',
            '41800': 'special_taxes',
            '42000': 'net_federal_tax',
            '42100': 'cpp_contributions_payable',
            '42120': 'ei_premiums_payable',
            '42200': 'social_benefits_repayment',
            '42800': 'provincial_tax',
            '43500': 'total_payable',
            '43700': 'total_income_tax_deducted',
            '43800': 'tax_transfer_quebec',
            '44000': 'quebec_abatement',
            '44800': 'cpp_qpp_overpayment',
            '45000': 'ei_overpayment',
            '45200': 'refundable_medical_expense',
            '45300': 'cwb',
            '45350': 'ctc',
            '45400': 'refund_investment_tax_credit',
            '45600': 'part_xii2_tax_credit',
            '45700': 'gst_hst_rebate',
            '46900': 'educator_school_supply',
            '47555': 'journalism_labour_tax_credit',
            '47556': 'fuel_charge_farmers_tax_credit',
            '47600': 'tax_paid_by_instalments',
            '47900': 'provincial_territorial_credits',
            '48400': 'refund',
            '48500': 'balance_owing',
        }
        return self._extract_fields(text, federal_lines, FederalTaxFields)
    
    def _extract_refund_fields(self, text: str) -> RefundFields:
        """Extract refund/balance owing fields from text"""
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
            '48500': 'amount_enclosed',
            # Additional Refundable Credits
            '43800': 'tax_transfer_quebec',
            '44000': 'quebec_abatement',
            '44800': 'cpp_qpp_overpayment',
            '45200': 'refundable_medical_expense',
            '45300': 'cwb',
            '45350': 'ctc',
            '45400': 'refund_investment_tax_credit',
            '45600': 'part_xii2_tax_credit',
            '45700': 'gst_hst_rebate',
            '46900': 'educator_school_supply',
            '47555': 'journalism_labour_tax_credit',
            '47556': 'fuel_charge_farmers_tax_credit',
            '47600': 'tax_paid_by_instalments',
            '47900': 'provincial_territorial_credits',
            '48400': 'refund',
            '48500': 'balance_owing',
        }
        return self._extract_fields(text, refund_lines, RefundFields)
    
    def _extract_ontario_tax_fields(self, text: str) -> OntarioTaxFields:
        """Extract Ontario Form 428 tax fields from text"""
        ontario_lines = {
            # Basic amounts and credits
            '58040': 'basic_personal_amount',
            '58080': 'age_amount',
            '58120': 'spouse_amount',
            '58160': 'eligible_dependant',
            '58185': 'caregiver_amount',
            # Employment-related credits
            '58240': 'cpp_qpp_contributions',
            '58280': 'cpp_qpp_self_employment',
            '58300': 'employment_insurance_premiums',
            '58305': 'volunteer_firefighter_amount',
            '58330': 'adoption_expenses',
            '58360': 'pension_income_amount',
            # Disability and medical
            '58440': 'disability_amount',
            '58480': 'disability_amount_transferred',
            # Education and training
            '58520': 'student_loan_interest',
            '58560': 'tuition_education_amounts',
            '58640': 'amounts_transferred_spouse',
            # Medical and other
            '58689': 'medical_expenses',
            '58729': 'donations_gifts',
            # Calculated amounts
            '58800': 'total_credits',
            '58840': 'total_non_refundable_credits',
            '61500': 'ontario_non_refundable_tax_credits',
            # Tax calculations
            '61510': 'ontario_tax_split_income',
            '61520': 'ontario_dividend_tax_credit',
            '62140': 'ontario_health_premium',
            '42800': 'ontario_tax',
            # Ontario Refundable Credits (Form 479ON)
            '61050': 'ontario_energy_property_tax_credit',
            '61052': 'ontario_senior_homeowners_grant',
            '61055': 'ontario_political_contribution_credit',
            '61056': 'ontario_sales_tax_credit',
            '61080': 'ontario_trillium_benefit',
            '61240': 'ontario_child_benefit',
            '61300': 'ontario_working_families_tax_credit',
        }
        return self._extract_fields(text, ontario_lines, OntarioTaxFields)
    
    def _extract_alberta_tax_fields(self, text: str) -> AlbertaTaxFields:
        """Extract Alberta tax fields from text"""
        alberta_lines = {
            '58080': 'basic_personal_amount',
            '58160': 'age_amount',
            '58240': 'spouse_amount',
            '58320': 'eligible_dependant',
            '58400': 'caregiver_amount',
            '58480': 'disability_amount',
            '58560': 'pension_income_amount',
            '58640': 'tuition_amount',
            '58720': 'medical_expenses',
            '58800': 'donations_gifts',
            # Refundable Credits (Form 479AB)
            '61220': 'family_employment_tax_credit',
            '61230': 'carbon_levy_rebate',
            '61240': 'child_family_benefit',
            '61250': 'seniors_benefit',
            # Calculated
            '58800': 'total_credits',
            '58840': 'total_non_refundable_credits',
            '61520': 'dividend_tax_credit',
            '62140': 'health_premium',
            '42800': 'tax',
        }
        return self._extract_fields(text, alberta_lines, AlbertaTaxFields)

    def _extract_british_columbia_tax_fields(self, text: str) -> BritishColumbiaTaxFields:
        """Extract British Columbia tax fields from text"""
        bc_lines = {
            '58080': 'basic_personal_amount',
            '58160': 'age_amount',
            '58240': 'spouse_amount',
            '58320': 'eligible_dependant',
            '58400': 'caregiver_amount',
            '58480': 'disability_amount',
            '58560': 'pension_income_amount',
            '58640': 'tuition_amount',
            '58720': 'medical_expenses',
            '58800': 'donations_gifts',
            # Refundable Credits (Form 479BC)
            '61120': 'climate_action_tax_credit',
            '61130': 'family_bonus',
            '61140': 'early_childhood_tax_benefit',
            '61150': 'child_opportunity_benefit',
            '61160': 'caregiver_tax_credit',
            '61170': 'training_tax_credit',
            # Calculated
            '58800': 'total_credits',
            '58840': 'total_non_refundable_credits',
            '61520': 'dividend_tax_credit',
            '62140': 'health_premium',
            '42800': 'tax',
        }
        return self._extract_fields(text, bc_lines, BritishColumbiaTaxFields)

    def _extract_manitoba_tax_fields(self, text: str) -> ManitobaTaxFields:
        """Extract Manitoba tax fields from text"""
        mb_lines = {
            '58080': 'basic_personal_amount',
            '58160': 'age_amount',
            '58240': 'spouse_amount',
            '58320': 'eligible_dependant',
            '58400': 'caregiver_amount',
            '58480': 'disability_amount',
            '58560': 'pension_income_amount',
            '58640': 'tuition_amount',
            '58720': 'medical_expenses',
            '58800': 'donations_gifts',
            # Refundable Credits (Form 479MB)
            '61420': 'low_income_tax_credit',
            '61430': 'family_tax_benefit',
            '61440': 'seniors_school_tax_rebate',
            # Calculated
            '58800': 'total_credits',
            '58840': 'total_non_refundable_credits',
            '61520': 'dividend_tax_credit',
            '62140': 'health_premium',
            '42800': 'tax',
        }
        return self._extract_fields(text, mb_lines, ManitobaTaxFields)

    def _extract_new_brunswick_tax_fields(self, text: str) -> NewBrunswickTaxFields:
        """Extract New Brunswick tax fields from text"""
        nb_lines = {
            '58080': 'basic_personal_amount',
            '58160': 'age_amount',
            '58240': 'spouse_amount',
            '58320': 'eligible_dependant',
            '58400': 'caregiver_amount',
            '58480': 'disability_amount',
            '58560': 'pension_income_amount',
            '58640': 'tuition_amount',
            '58720': 'medical_expenses',
            '58800': 'donations_gifts',
            # Refundable Credits (Form 479NB)
            '61520': 'low_income_tax_credit',
            '61530': 'child_tax_benefit',
            '61540': 'working_income_supplement',
            # Calculated
            '58800': 'total_credits',
            '58840': 'total_non_refundable_credits',
            '61520': 'dividend_tax_credit',
            '62140': 'health_premium',
            '42800': 'tax',
        }
        return self._extract_fields(text, nb_lines, NewBrunswickTaxFields)

    def _extract_newfoundland_labrador_tax_fields(self, text: str) -> NewfoundlandLabradorTaxFields:
        """Extract Newfoundland and Labrador tax fields from text"""
        nl_lines = {
            '58080': 'basic_personal_amount',
            '58160': 'age_amount',
            '58240': 'spouse_amount',
            '58320': 'eligible_dependant',
            '58400': 'caregiver_amount',
            '58480': 'disability_amount',
            '58560': 'pension_income_amount',
            '58640': 'tuition_amount',
            '58720': 'medical_expenses',
            '58800': 'donations_gifts',
            # Refundable Credits (Form 479NL)
            '61820': 'low_income_tax_credit',
            '61830': 'child_benefit',
            '61840': 'seniors_benefit',
            # Calculated
            '58800': 'total_credits',
            '58840': 'total_non_refundable_credits',
            '61520': 'dividend_tax_credit',
            '62140': 'health_premium',
            '42800': 'tax',
        }
        return self._extract_fields(text, nl_lines, NewfoundlandLabradorTaxFields)

    def _extract_northwest_territories_tax_fields(self, text: str) -> NorthwestTerritoriesTaxFields:
        """Extract Northwest Territories tax fields from text"""
        nt_lines = {
            '58080': 'basic_personal_amount',
            '58160': 'age_amount',
            '58240': 'spouse_amount',
            '58320': 'eligible_dependant',
            '58400': 'caregiver_amount',
            '58480': 'disability_amount',
            '58560': 'pension_income_amount',
            '58640': 'tuition_amount',
            '58720': 'medical_expenses',
            '58800': 'donations_gifts',
            # Refundable Credits (Form 479NT)
            '61920': 'cost_of_living_credit',
            '61930': 'child_benefit',
            # Calculated
            '58800': 'total_credits',
            '58840': 'total_non_refundable_credits',
            '61520': 'dividend_tax_credit',
            '62140': 'health_premium',
            '42800': 'tax',
        }
        return self._extract_fields(text, nt_lines, NorthwestTerritoriesTaxFields)

    def _extract_nova_scotia_tax_fields(self, text: str) -> NovaScotiaTaxFields:
        """Extract Nova Scotia tax fields from text"""
        ns_lines = {
            '58080': 'basic_personal_amount',
            '58160': 'age_amount',
            '58240': 'spouse_amount',
            '58320': 'eligible_dependant',
            '58400': 'caregiver_amount',
            '58480': 'disability_amount',
            '58560': 'pension_income_amount',
            '58640': 'tuition_amount',
            '58720': 'medical_expenses',
            '58800': 'donations_gifts',
            # Refundable Credits (Form 479NS)
            '61620': 'affordable_living_tax_credit',
            '61630': 'child_benefit',
            '61640': 'poverty_reduction_credit',
            # Calculated
            '58800': 'total_credits',
            '58840': 'total_non_refundable_credits',
            '61520': 'dividend_tax_credit',
            '62140': 'health_premium',
            '42800': 'tax',
        }
        return self._extract_fields(text, ns_lines, NovaScotiaTaxFields)

    def _extract_nunavut_tax_fields(self, text: str) -> NunavutTaxFields:
        """Extract Nunavut tax fields from text"""
        nu_lines = {
            '58080': 'basic_personal_amount',
            '58160': 'age_amount',
            '58240': 'spouse_amount',
            '58320': 'eligible_dependant',
            '58400': 'caregiver_amount',
            '58480': 'disability_amount',
            '58560': 'pension_income_amount',
            '58640': 'tuition_amount',
            '58720': 'medical_expenses',
            '58800': 'donations_gifts',
            # Refundable Credits (Form 479NU)
            '62020': 'cost_of_living_credit',
            '62030': 'child_benefit',
            # Calculated
            '58800': 'total_credits',
            '58840': 'total_non_refundable_credits',
            '61520': 'dividend_tax_credit',
            '62140': 'health_premium',
            '42800': 'tax',
        }
        return self._extract_fields(text, nu_lines, NunavutTaxFields)

    def _extract_prince_edward_island_tax_fields(self, text: str) -> PrinceEdwardIslandTaxFields:
        """Extract Prince Edward Island tax fields from text"""
        pe_lines = {
            '58080': 'basic_personal_amount',
            '58160': 'age_amount',
            '58240': 'spouse_amount',
            '58320': 'eligible_dependant',
            '58400': 'caregiver_amount',
            '58480': 'disability_amount',
            '58560': 'pension_income_amount',
            '58640': 'tuition_amount',
            '58720': 'medical_expenses',
            '58800': 'donations_gifts',
            # Refundable Credits (Form 479PE)
            '61720': 'low_income_tax_credit',
            '61730': 'child_benefit',
            '61740': 'sales_tax_credit',
            # Calculated
            '58800': 'total_credits',
            '58840': 'total_non_refundable_credits',
            '61520': 'dividend_tax_credit',
            '62140': 'health_premium',
            '42800': 'tax',
        }
        return self._extract_fields(text, pe_lines, PrinceEdwardIslandTaxFields)

    def _extract_quebec_tax_fields(self, text: str) -> QuebecTaxFields:
        """Extract Quebec tax fields from text"""
        qc_lines = {
            '350': 'basic_personal_amount',
            '351': 'spouse_amount',
            '352': 'dependant_children_amount',
            '353': 'other_dependants_amount',
            '354': 'age_amount',
            '355': 'pension_income_amount',
            '358': 'disability_amount',
            '361': 'medical_expenses',
            '393': 'donations_gifts',
            # Refundable Credits (Quebec)
            '440': 'quebec_abatement',
            '451': 'quebec_tax_payable',
            # Calculated
            '393': 'total_credits',
            '394': 'total_non_refundable_credits',
            '395': 'dividend_tax_credit',
            '396': 'health_premium',
            '430': 'tax',
        }
        return self._extract_fields(text, qc_lines, QuebecTaxFields)

    def _extract_saskatchewan_tax_fields(self, text: str) -> SaskatchewanTaxFields:
        """Extract Saskatchewan tax fields from text"""
        sk_lines = {
            '58080': 'basic_personal_amount',
            '58160': 'age_amount',
            '58240': 'spouse_amount',
            '58320': 'eligible_dependant',
            '58400': 'caregiver_amount',
            '58480': 'disability_amount',
            '58560': 'pension_income_amount',
            '58640': 'tuition_amount',
            '58720': 'medical_expenses',
            '58800': 'donations_gifts',
            # Refundable Credits (Form 479SK)
            '61320': 'low_income_tax_credit',
            '61330': 'seniors_supplement',
            '61340': 'graduate_retention_benefit',
            # Calculated
            '58800': 'total_credits',
            '58840': 'total_non_refundable_credits',
            '61520': 'dividend_tax_credit',
            '62140': 'health_premium',
            '42800': 'tax',
        }
        return self._extract_fields(text, sk_lines, SaskatchewanTaxFields)

    def _extract_yukon_tax_fields(self, text: str) -> YukonTaxFields:
        """Extract Yukon tax fields from text"""
        yt_lines = {
            '58080': 'basic_personal_amount',
            '58160': 'age_amount',
            '58240': 'spouse_amount',
            '58320': 'eligible_dependant',
            '58400': 'caregiver_amount',
            '58480': 'disability_amount',
            '58560': 'pension_income_amount',
            '58640': 'tuition_amount',
            '58720': 'medical_expenses',
            '58800': 'donations_gifts',
            # Refundable Credits (Form 479YT)
            '62120': 'cost_of_living_credit',
            '62130': 'child_benefit',
            # Calculated
            '58800': 'total_credits',
            '58840': 'total_non_refundable_credits',
            '61520': 'dividend_tax_credit',
            '62140': 'health_premium',
            '42800': 'tax',
        }
        return self._extract_fields(text, yt_lines, YukonTaxFields)
    
    def _extract_line_amount(self, text: str, line_num: str) -> Optional[Decimal]:
        """Extract amount for a specific line number"""
        import re
        
        # Debug for balance owing
        debug_f = None
        if line_num == '48500':
            try:
                debug_f = open('attached_assets/balance_owing_debug.log', 'w')
                debug_f.write(f'DEBUG: Extracting balance owing for line {line_num}\n')
            except Exception:
                debug_f = None
        
        # Debug for pension adjustment
        if line_num == '20600':
            try:
                debug_f = open('attached_assets/pension_adjustment_debug.log', 'w')
                debug_f.write(f'DEBUG: Extracting pension adjustment for line {line_num}\n')
            except Exception:
                debug_f = None
        
        # Special handling for line 10400 (Other Employment Income)
        if line_num == '10400':
            lines = text.splitlines()
            for idx, line in enumerate(lines):
                # Look for the specific pattern: "Other employment income 10400" followed by amount
                if re.match(r'^\s*Other employment income\s+10400\b', line):
                    # Extract amount from this line: "Other employment income 10400 96 80 2"
                    m = re.search(r'10400\s+(\d{1,3})\s+(\d{2})', line)
                    if m:
                        try:
                            dollars = m.group(1)
                            cents = m.group(2)
                            value = f"{dollars}.{cents}"
                            return Decimal(value)
                        except Exception:
                            continue
            return None
        
        # Special handling for line 12000 (Taxable dividends from taxable Canadian corporations)
        if line_num == '12000':
            lines = text.splitlines()
            for idx, line in enumerate(lines):
                # Look for various dividend patterns
                if re.search(r'taxable.*dividend.*canadian.*corporation', line, re.IGNORECASE):
                    # Look for amount in current line or next few lines
                    for j in range(idx, min(idx + 3, len(lines))):
                        check_line = lines[j]
                        # Look for patterns like "12000 5,538 46" or "5,538 46 12000"
                        patterns = [
                            r'12000\s+(\d{1,3}(?:,\d{3})*)\s+(\d{2})',
                            r'(\d{1,3}(?:,\d{3})*)\s+(\d{2})\s+12000',
                            r'(\d{1,3}(?:,\d{3})*)\s+(\d{2})\s*$'  # amount at end of line
                        ]
                        for pattern in patterns:
                            m = re.search(pattern, check_line)
                            if m:
                                try:
                                    dollars = m.group(1).replace(',', '')
                                    cents = m.group(2)
                                    value = f"{dollars}.{cents}"
                                    return Decimal(value)
                                except Exception:
                                    continue
                # Also look for lines that contain "12000" directly
                if '12000' in line:
                    m = re.search(r'12000\s+(\d{1,3}(?:,\d{3})*)\s+(\d{2})', line)
                    if m:
                        try:
                            dollars = m.group(1).replace(',', '')
                            cents = m.group(2)
                            value = f"{dollars}.{cents}"
                            return Decimal(value)
                        except Exception:
                            continue
            return None
        
        # Special handling for line 20600 (Pension Adjustment)
        if line_num == '20600':
            lines = text.splitlines()
            for idx, line in enumerate(lines):
                # Look for the pattern: "20600" followed by text and then amount
                if '20600' in line:
                    # Extract amount from patterns like "206003696,403 9118,194 00"
                    m = re.search(r'20600.*?(\d{1,3}(?:,\d{3})*)\s+(\d{2})', line)
                    if m:
                        try:
                            dollars = m.group(1).replace(',', '')
                            cents = m.group(2)
                            value = f"{dollars}.{cents}"
                            return Decimal(value)
                        except Exception:
                            continue
            return None
        
        # Standard patterns for all line numbers
        patterns = [
            rf'{line_num}\s+(\d{{1,3}}(?:,\d{{3}})*)\s+(\d{{2}})\s+\d+',
            rf'{line_num}\s+(\d{{1,3}}(?:,\d{{3}})*)\.(\d{{2}})',
            rf'{line_num}\s{{10,}}(\d{{1,3}}(?:,\d{{3}})*)\s+(\d{{2}})',
            rf'{line_num}\s{{10,}}(\d{{1,3}}(?:,\d{{3}})*)\.(\d{{2}})',
        ]
        lines = text.splitlines()
        found = None
        for idx, line in enumerate(lines):
            if debug_f:
                debug_f.write(f'CHECKING LINE: {line}\n')
            for pattern in patterns:
                matches = re.findall(pattern, line)
                if debug_f:
                    debug_f.write(f'PATTERN: {pattern} MATCHES: {matches}\n')
                for match in matches:
                    try:
                        if isinstance(match, tuple) and len(match) == 2:
                            dollars, cents = match
                            dollars_cleaned = dollars.replace(',', '').strip()
                            if dollars_cleaned and cents and int(dollars_cleaned) >= 1:
                                amount_str = f"{dollars_cleaned}.{cents}"
                                if debug_f:
                                    debug_f.write(f'FOUND AMOUNT: {amount_str}\n')
                                if debug_f:
                                    debug_f.close()
                                return Decimal(amount_str)
                    except (InvalidOperation, ValueError):
                        continue
        # Fallback: look for 'Balance owing' label if 48500 not found
        if line_num == '48500':
            # Look for a line containing 48500 and two groups of digits (e.g., 5,921 91)
            for line in lines:
                if '48500' in line:
                    m = re.search(r'48500\D*(\d{1,3}(?:,\d{3})*)\s+(\d{2})', line)
                    if m:
                        try:
                            value = m.group(1).replace(',', '') + '.' + m.group(2)
                            if debug_f:
                                debug_f.write(f'EXTRACTED FROM 48500 LINE: {value}\n')
                                debug_f.close()
                            return Decimal(value)
                        except Exception:
                            continue
            # Fallback: look for 'Balance owing' label if 48500 not found
            for line in lines:
                if re.search(r'balance owing', line, re.IGNORECASE):
                    if debug_f:
                        debug_f.write(f'FALLBACK BALANCE OWING LINE: {line}\n')
                    m = re.search(r'(\d{1,3}(?:,\d{3})*\.\d{2})', line)
                    if m:
                        try:
                            amount_str = m.group(1).replace(',', '')
                            if debug_f:
                                debug_f.write(f'FALLBACK FOUND AMOUNT: {amount_str}\n')
                                debug_f.close()
                            return Decimal(amount_str)
                        except Exception:
                            continue
        if debug_f:
            debug_f.write('NO AMOUNT FOUND\n')
            debug_f.close()
        # If no amount found with strict patterns, return None (blank field)
        return None

    def _extract_spouse_info(self, text: str) -> SpouseInfo:
        spouse_info = SpouseInfo()
        lines = text.splitlines()
        spouse_section = []
        # Find the spouse section
        for i, line in enumerate(lines):
            if "Your spouse's or common-law partner's information" in line:
                spouse_section = lines[i:i+12]  # Take the next 12 lines for context
                break
        if spouse_section:
            try:
                debug_f = open('attached_assets/spouse_debug.log', 'w')
                debug_f.write('DEBUG-SPOUSE-SECTION:\n')
                for line in spouse_section:
                    debug_f.write(f'DEBUG-SPOUSE-LINE: {line}\n')
            except Exception:
                debug_f = None
            # Self-employed checkbox: Only set to True if an 'X' or '[X]' is present after the label, not a lone '1'
            for line in spouse_section:
                if 'Tick this box if they were self-employed' in line:
                    if debug_f:
                        debug_f.write(f'DEBUG-SELF-EMPLOYED-LINE: {line}\n')
                    m = re.search(r'Tick this box if they were self-employed in 2024\.\s*(X|x|\[X\])?\s*$', line)
                    if m and m.group(1):
                        spouse_info.self_employed = True
                    else:
                        spouse_info.self_employed = False
                    break
            # Net income: Find the line, then check the next line for a number in the format '70,572 84'
            for idx, line in enumerate(spouse_section):
                if 'Net income from' in line:
                    if debug_f:
                        debug_f.write(f'DEBUG-NET-INCOME-LINE: {line}\n')
                    if idx+1 < len(spouse_section):
                        next_line = spouse_section[idx+1]
                        if debug_f:
                            debug_f.write(f'DEBUG-NET-INCOME-NEXT-LINE: {next_line}\n')
                        m = re.search(r'(\d{1,3}(?:,\d{3})*)\s+(\d{2})', next_line)
                        if m:
                            try:
                                value = m.group(1).replace(',', '') + '.' + m.group(2)
                                spouse_info.net_income = Decimal(value)
                            except Exception:
                                spouse_info.net_income = None
                        else:
                            spouse_info.net_income = None
                    else:
                        spouse_info.net_income = None
                    break
            # UCCB: Find the line, then check the next line for a number in the format '123 45'
            for idx, line in enumerate(spouse_section):
                if 'universal child care benefit' in line.lower():
                    if idx+1 < len(spouse_section):
                        next_line = spouse_section[idx+1]
                        if debug_f:
                            debug_f.write(f'DEBUG-UCCB-NEXT-LINE: {next_line}\n')
                        m = re.search(r'(\d{1,3}(?:,\d{3})*)\s+(\d{2})', next_line)
                        if m:
                            try:
                                value = m.group(1).replace(',', '') + '.' + m.group(2)
                                spouse_info.uccb = Decimal(value)
                            except Exception:
                                spouse_info.uccb = None
                        else:
                            spouse_info.uccb = None
                    else:
                        spouse_info.uccb = None
                    break
            # UCCB repayment: Find the line, then check the next line for a number in the format '123 45'
            for idx, line in enumerate(spouse_section):
                if 'UCCB repayment' in line:
                    if idx+1 < len(spouse_section):
                        next_line = spouse_section[idx+1]
                        if debug_f:
                            debug_f.write(f'DEBUG-UCCB-REPAY-NEXT-LINE: {next_line}\n')
                        m = re.search(r'(\d{1,3}(?:,\d{3})*)\s+(\d{2})', next_line)
                        if m:
                            try:
                                value = m.group(1).replace(',', '') + '.' + m.group(2)
                                spouse_info.uccb_repayment = Decimal(value)
                            except Exception:
                                spouse_info.uccb_repayment = None
                        else:
                            spouse_info.uccb_repayment = None
                    else:
                        spouse_info.uccb_repayment = None
                    break
            if debug_f:
                debug_f.close()
        return spouse_info

    def _extract_schedule7_fields(self, text: str) -> Schedule7Fields:
        """Extract Schedule 7 fields from text"""
        schedule7_lines = {
            # '24500': 'rrsp_contributions', (remove old mapping)
            'S7-1': 'unused_contributions_prior',
            'S7-2': 'rrsp_contributions',
            'S7-3': 'RRSP_60days',
            '24600': 'repayments_hbp',
            '24640': 'spp_contributions',
            '24630': 'repayments_llp',
            '24650': 'transfers_in',
            '23200': 'excess_contributions',
            '24000': 'unused_contributions_prior',
            '24400': 'unused_contributions_current',
            # '11': 'rrsp_deduction_limit',  # Remove this mapping - use custom extraction only
            # '20600': 'rrsp_deduction_limit',  # Remove this mapping
            '20800': 'rrsp_deduction_claimed',
            '20810': 'prpp_employer_contributions',
            '20805': 'fhsa_deduction',
            '32000': 'total_deduction',
            # 'prpp_contributions': null,  # Not directly mapped; leave as null unless line is found
        }
        import re
        lines = text.splitlines()
        debug_lines = []
        # Debug logging: print 50 lines before and after any line with 'Schedule 7', 'RRSP', or 'contributions'
        found = False
        for i, line in enumerate(lines):
            if ('schedule 7' in line.lower() or 'rrsp' in line.lower() or 'contributions' in line.lower()) and not found:
                start = max(0, i-50)
                end = min(len(lines), i+51)
                debug_lines = lines[start:end]
                found = True
        # print('DEBUG-SCHEDULE7-EXPANDED-SECTION:')
        # for l in debug_lines:
        #     print(f'DEBUG-S7-LINE: {l}')
        line1 = line2 = line3 = None
        for line in lines:
            # Stricter extraction for unused_contributions_prior: must be at start of line
            if re.match(r'^\s*1\s+(\d{1,3}(?:,\d{3})*)\s+(\d{2})', line):
                m1 = re.match(r'^\s*1\s+(\d{1,3}(?:,\d{3})*)\s+(\d{2})', line)
                if m1:
                    try:
                        value = m1.group(1).replace(',', '') + '.' + m1.group(2)
                        if value.replace('.', '').isdigit():
                            line1 = Decimal(value)
                            # print(f'FOUND LINE1: {value}')
                    except Exception:
                        pass
            # Only assign the first value for rrsp_contributions where the line contains 'attach all receipts'
            if line2 is None and 'attach all receipts' in line.lower():
                m2 = re.search(r'(\d{1,3}(?:,\d{3})*)\s+(\d{2})\s+2\s*$', line)
                if m2:
                    try:
                        value = m2.group(1).replace(',', '') + '.' + m2.group(2)
                        if value.replace('.', '').isdigit():
                            line2 = Decimal(value)
                            # print(f'FOUND LINE2: {value}')
                    except Exception:
                        pass
            # Only assign the first value for RRSP_60days where the line contains 'attach all receipts'
            if line3 is None and 'attach all receipts' in line.lower():
                m3 = re.search(r'(\d{1,3}(?:,\d{3})*)\s+(\d{2})\s+3\s*$', line)
                if m3:
                    try:
                        value = m3.group(1).replace(',', '') + '.' + m3.group(2)
                        if value.replace('.', '').isdigit():
                            line3 = Decimal(value)
                            # print(f'FOUND LINE3: {value}')
                    except Exception:
                        pass
        # Extract rrsp_deduction_limit from the correct context
        rrsp_limit = None
        for line in lines:
            if rrsp_limit is None and 'deduction limit' in line.lower():
                # Found deduction limit line
                m = re.search(r'(\d{1,3}(?:,\d{3})*)\s+(\d{2})\s*$', line)
                if m:
                    try:
                        value = m.group(1).replace(',', '') + '.' + m.group(2)
                        if value.replace('.', '').isdigit():
                            rrsp_limit = Decimal(value)
                    except Exception:
                        pass
        fields = self._extract_fields(text, schedule7_lines, Schedule7Fields)
        fields.unused_contributions_prior = line1
        fields.rrsp_contributions = line2
        fields.RRSP_60days = line3
        if rrsp_limit is not None:
            fields.rrsp_deduction_limit = rrsp_limit
        # print(f'FINAL VALUES - line1: {line1}, line2: {line2}, line3: {line3}')
        # Debug: Print all lines containing '11' and 5 lines before/after
        # for i, line in enumerate(lines):
        #     if re.search(r'\b11\b', line):
        #         start = max(0, i-5)
        #         end = min(len(lines), i+6)
        #         print('DEBUG-S7-LINE11-CONTEXT:')
        #         for l in lines[start:end]:
        #             print(f'DEBUG-S7-LINE: {l}')
        return fields

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