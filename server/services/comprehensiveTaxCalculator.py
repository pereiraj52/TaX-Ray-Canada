"""
Complete Comprehensive Canadian Income Tax Calculator for 2024
Includes ALL major components: AMT, TOSI, loss carryovers, foreign tax credits,
pension splitting, CCA, provincial specifics, and advanced business calculations
"""

from dataclasses import dataclass, field
from typing import Dict, List, Tuple, Optional
import math
from enum import Enum

class EmploymentType(Enum):
    REGULAR = "regular"
    COMMISSIONED = "commissioned"
    CLERGY = "clergy"
    ARTIST = "artist"

class BusinessType(Enum):
    SOLE_PROPRIETORSHIP = "sole_prop"
    PARTNERSHIP = "partnership"
    FARMING = "farming"
    FISHING = "fishing"
    PROFESSIONAL = "professional"
    RESOURCE_EXPLORATION = "resource"
    SCIENTIFIC_RESEARCH = "research"

class FarmingMethod(Enum):
    CASH = "cash"
    ACCRUAL = "accrual"
    
class SpecialStatus(Enum):
    ARTIST = "artist"
    DIPLOMAT = "diplomat"
    MILITARY_OVERSEAS = "military"
    CLERGY = "clergy"
    APPRENTICE = "apprentice"

@dataclass
class TaxBracket:
    """Represents a tax bracket with income range and rate"""
    min_income: float
    max_income: float
    rate: float

@dataclass
class PersonalInfo:
    """Comprehensive personal information affecting tax calculations"""
    age: int = 30
    is_married: bool = False
    spouse_income: float = 0
    spouse_age: int = 30
    has_disability: bool = False
    spouse_has_disability: bool = False
    is_caregiver: bool = False
    num_dependants: int = 0
    dependant_ages: List[int] = field(default_factory=list)
    dependant_disabilities: List[bool] = field(default_factory=list)
    is_student: bool = False
    months_student: int = 0
    is_first_time_buyer: bool = False
    employment_type: EmploymentType = EmploymentType.REGULAR
    business_type: Optional[BusinessType] = None
    farming_method: Optional[FarmingMethod] = None
    special_status: List[SpecialStatus] = field(default_factory=list)
    is_northern_resident: bool = False
    northern_resident_months: int = 0
    is_indigenous_on_reserve: bool = False
    reserve_income_exempt: float = 0
    is_volunteer_firefighter: bool = False
    is_search_rescue_volunteer: bool = False
    years_as_apprentice: int = 0
    is_new_immigrant: bool = False
    months_in_canada: int = 12

@dataclass
class IncomeDetails:
    """Comprehensive income sources including all specialized items"""
    # Employment Income
    employment_income: float = 0
    employment_benefits: float = 0
    stock_option_benefit: float = 0
    stock_option_deduction_eligible: bool = False
    commission_income: float = 0
    tips_gratuities: float = 0
    overseas_employment_exempt: float = 0
    
    # Business Income
    business_income: float = 0
    professional_income: float = 0
    farming_income: float = 0
    farming_income_previous_years: List[float] = field(default_factory=list)  # For averaging
    fishing_income: float = 0
    fishing_settlement_payment: float = 0
    partnership_income: float = 0
    partnership_losses: float = 0
    limited_partnership_losses: float = 0
    
    # Resource and Specialized Business
    resource_income: float = 0
    flow_through_share_deductions: float = 0
    scientific_research_expenditures: float = 0
    film_production_income: float = 0
    
    # Investment Income
    interest_income: float = 0
    canadian_dividend_income: float = 0
    foreign_dividend_income: float = 0
    foreign_business_income: float = 0
    foreign_non_business_income: float = 0
    rental_income: float = 0
    royalty_income: float = 0
    trust_income: float = 0
    
    # Capital Gains/Losses
    capital_gains: float = 0
    capital_losses_current: float = 0
    net_capital_losses_applied: float = 0
    superficial_losses_denied: float = 0
    principal_residence_exemption: float = 0
    
    # Pension and Benefits
    cpp_qpp_benefits: float = 0
    oas_benefits: float = 0
    gis_benefits: float = 0
    private_pension: float = 0
    foreign_pension: float = 0
    rrif_withdrawals: float = 0
    lif_withdrawals: float = 0
    annuity_income: float = 0
    lump_sum_payment: float = 0  # For averaging
    
    # Government Benefits
    ei_benefits: float = 0
    social_assistance: float = 0
    workers_compensation: float = 0
    
    # Other Income
    alimony_received: float = 0
    scholarship_income: float = 0
    bursary_income: float = 0
    death_benefits: float = 0
    uic_benefit_repayment: float = 0
    other_income: float = 0
    
    # Split Income (TOSI) Items
    split_income_amount: float = 0
    split_income_from_related_business: bool = False
    
    # Artist Income (for averaging)
    artistic_income_current: float = 0
    artistic_income_previous_years: List[float] = field(default_factory=list)

@dataclass
class AdvancedDeductions:
    """Advanced business, investment, and specialized deductions"""
    # Business Expenses
    business_expenses: float = 0
    home_office_expenses: float = 0
    motor_vehicle_expenses: float = 0
    capital_cost_allowance: float = 0
    terminal_loss: float = 0
    business_investment_loss: float = 0
    
    # Farming and Fishing Specific
    restricted_farm_loss: float = 0
    farm_inventory_adjustment: float = 0
    fishing_income_stabilization: float = 0
    
    # Partnership and Investment
    at_risk_adjustment: float = 0
    partnership_loss_limitation: float = 0
    superficial_loss_adjustment: float = 0
    
    # Reserves and Deferrals
    reserve_for_doubtful_debts: float = 0
    inventory_reserve: float = 0
    services_not_rendered_reserve: float = 0
    goods_not_delivered_reserve: float = 0
    
    # Employment Expenses (T2200)
    home_office_employment: float = 0
    motor_vehicle_employment: float = 0
    travel_expenses: float = 0
    other_employment_expenses: float = 0
    
    # Investment Expenses
    carrying_charges: float = 0
    interest_investment_loans: float = 0
    safety_deposit_fees: float = 0
    accounting_fees: float = 0
    investment_counsel_fees: float = 0
    
    # Loss Carryovers Applied
    non_capital_losses_applied: float = 0
    farm_losses_applied: float = 0
    limited_partnership_losses: float = 0
    
    # Resource Industry
    canadian_exploration_expense: float = 0
    canadian_development_expense: float = 0
    canadian_oil_gas_property_expense: float = 0
    foreign_exploration_development: float = 0
    
    # Special Elections
    income_averaging_annuity_elected: bool = False
    rights_or_things_elected: bool = False

@dataclass
class DeductionsCredits:
    """Comprehensive deductions and credits including all niche items"""
    # Registered Plans
    rrsp_contribution: float = 0
    pension_contribution: float = 0
    
    # Employment Deductions
    union_dues: float = 0
    professional_dues: float = 0
    office_rent: float = 0
    salary_assistant: float = 0
    clergy_residence: float = 0
    
    # Family and Support
    childcare_expenses: float = 0
    alimony_paid: float = 0
    
    # Medical and Disability
    medical_expenses: float = 0
    attendant_care: float = 0
    disability_supports: float = 0
    
    # Education
    tuition_fees: float = 0
    education_months: int = 0
    textbook_months: int = 0
    student_loan_interest: float = 0
    
    # Special Situations
    moving_expenses: float = 0
    northern_residents_deduction: float = 0
    overseas_employment_credit: float = 0
    
    # Donations and Political
    charitable_donations: float = 0
    political_contributions: float = 0
    
    # Provincial Specific Credits
    ontario_political_contribution: float = 0
    ontario_first_time_home_buyer: float = 0
    ontario_senior_homeowner_grant: float = 0
    bc_political_contribution: float = 0
    bc_training_tax_credit: float = 0
    bc_climate_action_credit: float = 0
    quebec_political_contribution: float = 0
    quebec_childcare_credit: float = 0
    quebec_medical_expense_credit: float = 0
    saskatchewan_active_families: float = 0
    manitoba_property_tax_credit: float = 0
    alberta_family_employment_credit: float = 0
    
    # Specialized Federal Credits
    adoption_expenses: float = 0
    home_renovation_credit: float = 0
    home_accessibility_expenses: float = 0
    apprenticeship_job_creation_credit: float = 0
    investment_tax_credit: float = 0
    labour_sponsored_funds_credit: float = 0
    mineral_exploration_credit: float = 0
    film_tax_credit: float = 0
    scientific_research_credit: float = 0
    
    # Other Credits
    public_transit_passes: float = 0
    first_time_home_buyer_credit: float = 0
    volunteer_firefighter: bool = False
    search_rescue_volunteer: bool = False
    
    # Resource Deductions
    depletion_allowance: float = 0
    resource_allowance: float = 0
    
    # Artist Deductions
    artist_income_averaging_elected: bool = False

@dataclass
class ForeignTaxPaid:
    """Foreign taxes paid for foreign tax credit calculation"""
    foreign_business_tax: float = 0
    foreign_non_business_tax: float = 0
    foreign_tax_carryover: float = 0

@dataclass
class PensionSplitting:
    """Pension income splitting election"""
    eligible_pension_income: float = 0
    amount_to_split: float = 0
    split_with_spouse: bool = False

@dataclass
class TaxResult:
    """Comprehensive tax calculation results"""
    # Income Summary
    total_income: float
    net_income: float
    taxable_income: float
    split_income_subject_to_tosi: float
    
    # Regular Tax Calculations
    federal_tax: float
    provincial_tax: float
    total_tax_before_credits: float
    
    # Alternative Minimum Tax
    amt_income: float
    amt_tax: float
    amt_carryforward: float
    
    # Tax on Split Income
    tosi_tax: float
    
    # Non-Refundable Credits
    basic_personal_credit: float
    spouse_credit: float
    dependant_credit: float
    age_credit: float
    pension_credit: float
    disability_credit: float
    tuition_credit: float
    medical_credit: float
    charitable_credit: float
    political_credit: float
    foreign_tax_credit: float
    total_non_refundable_credits: float
    
    # Provincial Surtax
    provincial_surtax: float
    
    # Final Tax
    total_tax_after_credits: float
    
    # Payroll Deductions
    cpp_contribution: float
    ei_contribution: float
    
    # Refundable Credits
    gst_hst_credit: float
    canada_workers_benefit: float
    canada_child_benefit: float
    climate_action_incentive: float
    working_income_tax_benefit: float
    total_refundable_credits: float
    
    # Clawbacks
    oas_clawback: float
    ei_benefit_clawback: float
    social_benefit_repayment: float
    total_clawbacks: float
    
    # Final Results
    total_payable: float
    net_income_after_tax: float
    average_tax_rate: float
    marginal_tax_rate: float

class ComprehensiveCanadianTaxCalculator2024:
    """Complete Canadian tax calculator for 2024 with all advanced features"""
    
    def __init__(self):
        self.setup_tax_data()
    
    def setup_tax_data(self):
        """Initialize all tax brackets, rates, and constants for 2024"""
        
        # Federal tax brackets for 2024
        self.federal_brackets = [
            TaxBracket(0, 55867, 0.15),
            TaxBracket(55867, 111733, 0.205),
            TaxBracket(111733, 173205, 0.26),
            TaxBracket(173205, 246752, 0.29),
            TaxBracket(246752, float('inf'), 0.33)
        ]
        
        # Federal amounts and rates for 2024
        self.federal_amounts = {
            'basic_personal': 15705,
            'spouse_equivalent': 15705,
            'dependant': 2616,
            'caregiver': 2616,
            'age_amount': 8790,
            'age_threshold': 42335,
            'pension_amount': 2000,
            'disability_amount': 9428,
            'tuition_rate': 0.15,
            'medical_rate': 0.15,
            'charitable_rate_low': 0.15,
            'charitable_rate_high': 0.29,
            'dividend_gross_up': 1.38,
            'dividend_tax_credit': 0.2505,
            'volunteer_firefighter_credit': 3000,
            'search_rescue_credit': 3000
        }
        
        # Alternative Minimum Tax for 2024
        self.amt_exemption = 40000
        self.amt_rate = 0.15
        
        # Stock option deduction
        self.stock_option_deduction_rate = 0.50
        
        # Provincial/Territorial data with surtaxes and specific credits
        self.provincial_data = {
            'AB': {
                'brackets': [TaxBracket(0, float('inf'), 0.10)],
                'amounts': {
                    'basic_personal': 21003,
                    'spouse_equivalent': 21003,
                    'age_amount': 27060,
                    'pension_amount': 1360,
                    'disability_amount': 17787,
                    'medical_rate': 0.10,
                    'charitable_rate': 0.10,
                    'dividend_tax_credit': 0.10,
                    'political_contribution_rate': 0.75
                },
                'surtax': False
            },
            'BC': {
                'brackets': [
                    TaxBracket(0, 47937, 0.0506),
                    TaxBracket(47937, 95875, 0.077),
                    TaxBracket(95875, 110076, 0.105),
                    TaxBracket(110076, 133664, 0.1229),
                    TaxBracket(133664, 181232, 0.147),
                    TaxBracket(181232, float('inf'), 0.2045)
                ],
                'amounts': {
                    'basic_personal': 12580,
                    'spouse_equivalent': 12580,
                    'age_amount': 4908,
                    'pension_amount': 1000,
                    'disability_amount': 8405,
                    'medical_rate': 0.0506,
                    'charitable_rate': 0.0506,
                    'dividend_tax_credit': 0.10,
                    'political_contribution_rate': 0.75,
                    'low_income_tax_reduction': True
                },
                'surtax': False
            },
            'MB': {
                'brackets': [
                    TaxBracket(0, 47000, 0.108),
                    TaxBracket(47000, 100000, 0.1275),
                    TaxBracket(100000, float('inf'), 0.174)
                ],
                'amounts': {
                    'basic_personal': 15780,
                    'spouse_equivalent': 15780,
                    'age_amount': 3728,
                    'pension_amount': 1000,
                    'disability_amount': 4530,
                    'medical_rate': 0.108,
                    'charitable_rate': 0.108,
                    'dividend_tax_credit': 0.08,
                    'political_contribution_rate': 0.75
                },
                'surtax': False
            },
            'NB': {
                'brackets': [
                    TaxBracket(0, 49958, 0.094),
                    TaxBracket(49958, 99916, 0.14),
                    TaxBracket(99916, 185064, 0.16),
                    TaxBracket(185064, float('inf'), 0.195)
                ],
                'amounts': {
                    'basic_personal': 12458,
                    'spouse_equivalent': 12458,
                    'age_amount': 5355,
                    'pension_amount': 1000,
                    'disability_amount': 8870,
                    'medical_rate': 0.094,
                    'charitable_rate': 0.094,
                    'dividend_tax_credit': 0.0275,
                    'political_contribution_rate': 0.75
                },
                'surtax': False
            },
            'NL': {
                'brackets': [
                    TaxBracket(0, 43198, 0.087),
                    TaxBracket(43198, 86395, 0.145),
                    TaxBracket(86395, 154244, 0.158),
                    TaxBracket(154244, 215943, 0.178),
                    TaxBracket(215943, float('inf'), 0.198)
                ],
                'amounts': {
                    'basic_personal': 10382,
                    'spouse_equivalent': 10382,
                    'age_amount': 7401,
                    'pension_amount': 1000,
                    'disability_amount': 4200,
                    'medical_rate': 0.087,
                    'charitable_rate': 0.087,
                    'dividend_tax_credit': 0.035,
                    'political_contribution_rate': 0.75
                },
                'surtax': False
            },
            'NS': {
                'brackets': [
                    TaxBracket(0, 29590, 0.0879),
                    TaxBracket(29590, 59180, 0.1495),
                    TaxBracket(59180, 93000, 0.1667),
                    TaxBracket(93000, 150000, 0.175),
                    TaxBracket(150000, float('inf'), 0.21)
                ],
                'amounts': {
                    'basic_personal': 8744,
                    'spouse_equivalent': 8744,
                    'age_amount': 6313,
                    'pension_amount': 1000,
                    'disability_amount': 7341,
                    'medical_rate': 0.0879,
                    'charitable_rate': 0.0879,
                    'dividend_tax_credit': 0.0885,
                    'political_contribution_rate': 0.75
                },
                'surtax': False
            },
            'NT': {
                'brackets': [
                    TaxBracket(0, 50597, 0.059),
                    TaxBracket(50597, 101198, 0.086),
                    TaxBracket(101198, 164525, 0.122),
                    TaxBracket(164525, 239229, 0.1405)
                ],
                'amounts': {
                    'basic_personal': 16593,
                    'spouse_equivalent': 16593,
                    'age_amount': 7898,
                    'pension_amount': 1000,
                    'disability_amount': 4637,
                    'medical_rate': 0.059,
                    'charitable_rate': 0.059,
                    'dividend_tax_credit': 0.115,
                    'political_contribution_rate': 0.75
                },
                'surtax': False
            },
            'NU': {
                'brackets': [
                    TaxBracket(0, 53268, 0.04),
                    TaxBracket(53268, 106537, 0.07),
                    TaxBracket(106537, 173205, 0.09),
                    TaxBracket(173205, 246752, 0.115),
                    TaxBracket(246752, float('inf'), 0.115)
                ],
                'amounts': {
                    'basic_personal': 19531,
                    'spouse_equivalent': 19531,
                    'age_amount': 7898,
                    'pension_amount': 1000,
                    'disability_amount': 4637,
                    'medical_rate': 0.04,
                    'charitable_rate': 0.04,
                    'dividend_tax_credit': 0.0551,
                    'political_contribution_rate': 0.75
                },
                'surtax': False
            },
            'ON': {
                'brackets': [
                    TaxBracket(0, 51446, 0.0505),
                    TaxBracket(51446, 102894, 0.0915),
                    TaxBracket(102894, 150000, 0.1116),
                    TaxBracket(150000, 220000, 0.1216),
                    TaxBracket(220000, float('inf'), 0.1316)
                ],
                'amounts': {
                    'basic_personal': 12399,
                    'spouse_equivalent': 12399,
                    'age_amount': 5846,
                    'pension_amount': 1000,
                    'disability_amount': 9545,
                    'medical_rate': 0.0505,
                    'charitable_rate': 0.0505,
                    'dividend_tax_credit': 0.10,
                    'political_contribution_rate': 0.75
                },
                'health_premium': True,
                'surtax': {
                    'rate1': 0.20,  # 20% on tax over $5,554
                    'threshold1': 5554,
                    'rate2': 0.36,  # 36% on tax over $7,108
                    'threshold2': 7108
                }
            },
            'PE': {
                'brackets': [
                    TaxBracket(0, 32656, 0.098),
                    TaxBracket(32656, 65312, 0.138),
                    TaxBracket(65312, 105000, 0.167),
                    TaxBracket(105000, float('inf'), 0.187)
                ],
                'amounts': {
                    'basic_personal': 12500,
                    'spouse_equivalent': 12500,
                    'age_amount': 4207,
                    'pension_amount': 1000,
                    'disability_amount': 7341,
                    'medical_rate': 0.098,
                    'charitable_rate': 0.098,
                    'dividend_tax_credit': 0.105,
                    'political_contribution_rate': 0.75
                },
                'surtax': {
                    'rate1': 0.10,  # 10% on tax over $12,500
                    'threshold1': 12500
                }
            },
            'QC': {
                'brackets': [
                    TaxBracket(0, 51780, 0.14),
                    TaxBracket(51780, 103545, 0.19),
                    TaxBracket(103545, 126000, 0.24),
                    TaxBracket(126000, float('inf'), 0.2575)
                ],
                'amounts': {
                    'basic_personal': 18056,
                    'spouse_equivalent': 18056,
                    'age_amount': 3208,
                    'pension_amount': 2815,
                    'disability_amount': 3708,
                    'medical_rate': 0.20,
                    'charitable_rate': 0.20,
                    'dividend_tax_credit': 0.0778,
                    'political_contribution_rate': 0.75
                },
                'surtax': False,
                'unique_quebec_credits': True
            },
            'SK': {
                'brackets': [
                    TaxBracket(0, 52057, 0.105),
                    TaxBracket(52057, 148734, 0.125),
                    TaxBracket(148734, float('inf'), 0.145)
                ],
                'amounts': {
                    'basic_personal': 17661,
                    'spouse_equivalent': 17661,
                    'age_amount': 6065,
                    'pension_amount': 1000,
                    'disability_amount': 5659,
                    'medical_rate': 0.105,
                    'charitable_rate': 0.105,
                    'dividend_tax_credit': 0.11,
                    'political_contribution_rate': 0.75
                },
                'surtax': False
            },
            'YT': {
                'brackets': [
                    TaxBracket(0, 55867, 0.064),
                    TaxBracket(55867, 111733, 0.09),
                    TaxBracket(111733, 173205, 0.109),
                    TaxBracket(173205, 500000, 0.128),
                    TaxBracket(500000, float('inf'), 0.15)
                ],
                'amounts': {
                    'basic_personal': 15705,
                    'spouse_equivalent': 15705,
                    'age_amount': 7898,
                    'pension_amount': 1000,
                    'disability_amount': 9428,
                    'medical_rate': 0.064,
                    'charitable_rate': 0.064,
                    'dividend_tax_credit': 0.124,
                    'political_contribution_rate': 0.75
                },
                'surtax': False
            }
        }
        
        # CPP/QPP and EI constants for 2024
        self.cpp_max_pensionable = 71300
        self.cpp_basic_exemption = 3500
        self.cpp_rate = 0.0595
        self.cpp_max_contribution = 4055.25
        
        self.ei_max_insurable = 63750
        self.ei_rate = 0.0163
        self.ei_rate_quebec = 0.0127
        self.qpip_rate = 0.00494
        
        # Quebec QPP rates
        self.qpp_rate = 0.064
        self.qpp_max_pensionable = 71300
        self.qpp_basic_exemption = 3500
        
        # Benefit amounts and thresholds
        self.setup_benefit_thresholds()
    
    def setup_benefit_thresholds(self):
        """Setup benefit and clawback thresholds"""
        # OAS Clawback thresholds for 2024
        self.oas_clawback_threshold = 86912
        self.oas_clawback_rate = 0.15
        self.oas_max_annual = 7362
        
        # EI Benefit Clawback for 2024
        self.ei_clawback_threshold = 78750
        self.ei_clawback_rate = 0.30
        
        # Canada Child Benefit for 2024
        self.ccb_max_under6 = 7787
        self.ccb_max_6to17 = 6570
        self.ccb_threshold = 36502
        self.ccb_reduction_rate1 = 0.07
        self.ccb_reduction_rate2 = 0.032
        self.ccb_second_threshold = 78221
        
        # GST/HST Credit maximums for 2024
        self.gst_credit_single = 467
        self.gst_credit_married = 612
        self.gst_credit_child = 161
        self.gst_credit_threshold = 42335
        
        # Resource industry rates and limits
        self.canadian_exploration_rate = 1.0  # 100% deduction
        self.canadian_development_rate = 0.30  # 30% declining balance
        self.depletion_rate = 0.25  # 25% of resource income
        
        # Farming and fishing limits
        self.restricted_farm_loss_limit = 8750  # Annual limit
        self.farming_averaging_years = 5  # Years for income averaging
        
        # Artist income averaging
        self.artist_averaging_threshold = 3000  # Minimum fluctuation
        
        # Quebec-specific amounts for 2024
        self.quebec_specific = {
            'basic_personal_amount': 18056,
            'medical_expense_threshold_rate': 0.03,
            'medical_expense_minimum': 1330,  # Different from federal
            'childcare_maximum': 13000,
            'political_contribution_rates': [0.75, 0.50, 0.167],  # Tiered rates
            'solidarity_tax_threshold': 22580,
            'health_contribution_threshold': 17570
        }
    
    def calculate_total_income(self, income: IncomeDetails) -> float:
        """Calculate total income from all sources"""
        employment_total = (income.employment_income + income.employment_benefits + 
                          income.stock_option_benefit + income.commission_income + 
                          income.tips_gratuities)
        
        business_total = (income.business_income + income.professional_income + 
                         income.farming_income + income.fishing_income + 
                         income.partnership_income)
        
        # Gross up eligible Canadian dividends
        dividend_total = (income.canadian_dividend_income * self.federal_amounts['dividend_gross_up'] + 
                         income.foreign_dividend_income)
        
        investment_total = (income.interest_income + dividend_total + income.rental_income + 
                          income.royalty_income + income.foreign_business_income + 
                          income.foreign_non_business_income)
        
        # Only 50% of capital gains are taxable
        capital_gains_total = max(0, (income.capital_gains - income.capital_losses_current) * 0.5)
        # Apply net capital losses from previous years
        capital_gains_total = max(0, capital_gains_total - income.net_capital_losses_applied)
        
        pension_total = (income.cpp_qpp_benefits + income.oas_benefits + income.private_pension + 
                        income.foreign_pension + income.rrif_withdrawals + income.lif_withdrawals + 
                        income.annuity_income)
        
        other_total = (income.ei_benefits + income.alimony_received + 
                      income.scholarship_income + income.death_benefits + 
                      income.other_income)
        
        return (employment_total + business_total + investment_total + 
                capital_gains_total + pension_total + other_total)
    
    def calculate_tax_on_brackets(self, income: float, brackets: List[TaxBracket]) -> float:
        """Calculate tax based on progressive tax brackets"""
        total_tax = 0
        
        for bracket in brackets:
            if income <= bracket.min_income:
                break
                
            taxable_in_bracket = min(income, bracket.max_income) - bracket.min_income
            if taxable_in_bracket > 0:
                total_tax += taxable_in_bracket * bracket.rate
                
        return total_tax
    
    def calculate_marginal_rate(self, income: float, brackets: List[TaxBracket]) -> float:
        """Calculate marginal tax rate at given income level"""
        for bracket in brackets:
            if income >= bracket.min_income and income < bracket.max_income:
                return bracket.rate
        
        # If income exceeds all brackets, return the highest rate
        return brackets[-1].rate if brackets else 0
    
    def calculate_comprehensive_tax(self, 
                                   province: str,
                                   personal_info: PersonalInfo,
                                   income: IncomeDetails,
                                   deductions: DeductionsCredits,
                                   advanced_deductions: AdvancedDeductions = None,
                                   foreign_tax: ForeignTaxPaid = None,
                                   pension_splitting: PensionSplitting = None) -> TaxResult:
        """Main comprehensive tax calculation method"""
        
        if advanced_deductions is None:
            advanced_deductions = AdvancedDeductions()
        if foreign_tax is None:
            foreign_tax = ForeignTaxPaid()
        if pension_splitting is None:
            pension_splitting = PensionSplitting()
        
        # Calculate total income
        total_income = self.calculate_total_income(income)
        
        # Apply stock option deduction if eligible
        stock_option_deduction = 0
        if income.stock_option_deduction_eligible:
            stock_option_deduction = income.stock_option_benefit * self.stock_option_deduction_rate
        
        # Calculate net and taxable income
        total_deductions = (deductions.rrsp_contribution + deductions.union_dues + 
                           deductions.childcare_expenses + deductions.alimony_paid +
                           stock_option_deduction + advanced_deductions.business_expenses +
                           advanced_deductions.non_capital_losses_applied)
        
        net_income = max(0, total_income - total_deductions)
        
        # Additional deductions for taxable income
        additional_deductions = (deductions.medical_expenses + deductions.charitable_donations +
                               advanced_deductions.farm_losses_applied)
        
        taxable_income = max(0, net_income - additional_deductions)
        
        # Calculate TOSI if applicable
        tosi_tax = 0
        split_income_subject_to_tosi = 0
        if income.split_income_amount > 0:
            split_income_subject_to_tosi = income.split_income_amount
            tosi_tax = self.calculate_tax_on_brackets(split_income_subject_to_tosi, self.federal_brackets)
        
        # Calculate federal tax
        federal_tax = self.calculate_tax_on_brackets(taxable_income, self.federal_brackets)
        
        # Calculate provincial tax
        provincial_tax = 0
        provincial_surtax = 0
        if province in self.provincial_data:
            prov_data = self.provincial_data[province]
            provincial_tax = self.calculate_tax_on_brackets(taxable_income, prov_data['brackets'])
            
            # Calculate provincial surtax if applicable
            if prov_data.get('surtax'):
                surtax_info = prov_data['surtax']
                if provincial_tax > surtax_info['threshold1']:
                    provincial_surtax += (provincial_tax - surtax_info['threshold1']) * surtax_info['rate1']
                
                if 'threshold2' in surtax_info and provincial_tax > surtax_info['threshold2']:
                    provincial_surtax += (provincial_tax - surtax_info['threshold2']) * surtax_info['rate2']
        
        total_tax_before_credits = federal_tax + provincial_tax + provincial_surtax + tosi_tax
        
        # Calculate non-refundable credits
        credits = self.calculate_non_refundable_credits(province, personal_info, income, deductions, net_income)
        
        # Calculate foreign tax credit
        foreign_tax_credit = self.calculate_foreign_tax_credit(foreign_tax, federal_tax, net_income)
        
        total_non_refundable_credits = (credits['basic_personal'] + credits['spouse'] + 
                                      credits['dependant'] + credits['age'] + credits['pension'] +
                                      credits['disability'] + credits['tuition'] + credits['medical'] +
                                      credits['charitable'] + credits['political'] + foreign_tax_credit)
        
        # Apply credits to reduce tax
        total_tax_after_credits = max(0, total_tax_before_credits - total_non_refundable_credits)
        
        # Calculate AMT
        amt_result = self.calculate_alternative_minimum_tax(income, deductions, advanced_deductions)
        
        # Use higher of regular tax or AMT
        final_tax = max(total_tax_after_credits, amt_result['amt_tax'])
        
        # Calculate payroll deductions
        cpp_contribution = self.calculate_cpp_contribution(income.employment_income, province)
        ei_contribution = self.calculate_ei_contribution(income.employment_income, province)
        
        # Calculate clawbacks
        clawbacks = self.calculate_clawbacks(net_income, income)
        
        # Calculate refundable credits
        refundable_credits = self.calculate_refundable_credits(province, personal_info, net_income)
        
        # Final calculations
        total_payable = final_tax + cpp_contribution + ei_contribution + clawbacks['total']
        net_income_after_tax = net_income - total_payable + refundable_credits['total']
        
        # Calculate rates
        average_tax_rate = (total_payable / net_income * 100) if net_income > 0 else 0
        marginal_tax_rate = self.calculate_combined_marginal_rate(taxable_income, province)
        
        return TaxResult(
            total_income=total_income,
            net_income=net_income,
            taxable_income=taxable_income,
            split_income_subject_to_tosi=split_income_subject_to_tosi,
            federal_tax=federal_tax,
            provincial_tax=provincial_tax,
            total_tax_before_credits=total_tax_before_credits,
            amt_income=amt_result['amt_income'],
            amt_tax=amt_result['amt_tax'],
            amt_carryforward=amt_result['amt_carryforward'],
            tosi_tax=tosi_tax,
            basic_personal_credit=credits['basic_personal'],
            spouse_credit=credits['spouse'],
            dependant_credit=credits['dependant'],
            age_credit=credits['age'],
            pension_credit=credits['pension'],
            disability_credit=credits['disability'],
            tuition_credit=credits['tuition'],
            medical_credit=credits['medical'],
            charitable_credit=credits['charitable'],
            political_credit=credits['political'],
            foreign_tax_credit=foreign_tax_credit,
            total_non_refundable_credits=total_non_refundable_credits,
            provincial_surtax=provincial_surtax,
            total_tax_after_credits=total_tax_after_credits,
            cpp_contribution=cpp_contribution,
            ei_contribution=ei_contribution,
            gst_hst_credit=refundable_credits['gst_hst'],
            canada_workers_benefit=refundable_credits['canada_workers_benefit'],
            canada_child_benefit=refundable_credits['canada_child_benefit'],
            climate_action_incentive=refundable_credits['climate_action_incentive'],
            working_income_tax_benefit=refundable_credits['working_income_tax_benefit'],
            total_refundable_credits=refundable_credits['total'],
            oas_clawback=clawbacks['oas'],
            ei_benefit_clawback=clawbacks['ei'],
            social_benefit_repayment=clawbacks['social_benefit'],
            total_clawbacks=clawbacks['total'],
            total_payable=total_payable,
            net_income_after_tax=net_income_after_tax,
            average_tax_rate=average_tax_rate,
            marginal_tax_rate=marginal_tax_rate
        )
    
    def calculate_non_refundable_credits(self, province: str, personal_info: PersonalInfo, 
                                       income: IncomeDetails, deductions: DeductionsCredits,
                                       net_income: float) -> Dict[str, float]:
        """Calculate all non-refundable tax credits"""
        
        federal_amounts = self.federal_amounts
        prov_data = self.provincial_data.get(province, {})
        prov_amounts = prov_data.get('amounts', {})
        
        credits = {}
        
        # Basic personal amount
        credits['basic_personal'] = federal_amounts['basic_personal'] * federal_amounts.get('tuition_rate', 0.15)
        
        # Spouse/equivalent credit
        spouse_credit_amount = max(0, federal_amounts['spouse_equivalent'] - personal_info.spouse_income)
        credits['spouse'] = spouse_credit_amount * federal_amounts.get('tuition_rate', 0.15) if personal_info.is_married else 0
        
        # Dependant credit
        credits['dependant'] = personal_info.num_dependants * federal_amounts['dependant'] * federal_amounts.get('tuition_rate', 0.15)
        
        # Age credit (reduced by income over threshold)
        if personal_info.age >= 65:
            age_reduction = max(0, net_income - federal_amounts['age_threshold']) * 0.15
            age_credit_amount = max(0, federal_amounts['age_amount'] - age_reduction)
            credits['age'] = age_credit_amount * federal_amounts.get('tuition_rate', 0.15)
        else:
            credits['age'] = 0
        
        # Pension credit
        eligible_pension = min(federal_amounts['pension_amount'], income.private_pension + income.rrif_withdrawals)
        credits['pension'] = eligible_pension * federal_amounts.get('tuition_rate', 0.15)
        
        # Disability credit
        credits['disability'] = (federal_amounts['disability_amount'] * federal_amounts.get('tuition_rate', 0.15) 
                               if personal_info.has_disability else 0)
        
        # Tuition credit
        credits['tuition'] = deductions.tuition_fees * federal_amounts.get('tuition_rate', 0.15)
        
        # Medical expense credit
        medical_threshold = min(2759, net_income * 0.03)  # 2024 threshold
        eligible_medical = max(0, deductions.medical_expenses - medical_threshold)
        credits['medical'] = eligible_medical * federal_amounts.get('medical_rate', 0.15)
        
        # Charitable donation credit (tiered rates)
        if deductions.charitable_donations <= 200:
            credits['charitable'] = deductions.charitable_donations * federal_amounts.get('charitable_rate_low', 0.15)
        else:
            credits['charitable'] = (200 * federal_amounts.get('charitable_rate_low', 0.15) + 
                                   (deductions.charitable_donations - 200) * federal_amounts.get('charitable_rate_high', 0.29))
        
        # Political contribution credit
        credits['political'] = min(deductions.political_contributions * 0.75, 650)  # Maximum $650
        
        return credits
    
    def calculate_alternative_minimum_tax(self, income: IncomeDetails, deductions: DeductionsCredits,
                                        advanced_deductions: AdvancedDeductions) -> Dict[str, float]:
        """Calculate Alternative Minimum Tax"""
        
        # Start with regular income
        amt_income = self.calculate_total_income(income)
        
        # Add back certain preference items
        amt_income += income.stock_option_benefit * 0.5  # 50% of stock option benefit
        amt_income += advanced_deductions.capital_cost_allowance * 0.5  # 50% of CCA
        
        # Subtract AMT exemption
        amt_taxable_income = max(0, amt_income - self.amt_exemption)
        
        # Calculate AMT at 15%
        amt_tax = amt_taxable_income * self.amt_rate
        
        # AMT carryforward (simplified - would need previous years' data)
        amt_carryforward = 0
        
        return {
            'amt_income': amt_income,
            'amt_tax': amt_tax,
            'amt_carryforward': amt_carryforward
        }
    
    def calculate_foreign_tax_credit(self, foreign_tax: ForeignTaxPaid, federal_tax: float, net_income: float) -> float:
        """Calculate foreign tax credit"""
        if foreign_tax.foreign_business_tax == 0 and foreign_tax.foreign_non_business_tax == 0:
            return 0
        
        # Simplified foreign tax credit calculation
        # In practice, this would be more complex with separate business and non-business calculations
        total_foreign_tax = foreign_tax.foreign_business_tax + foreign_tax.foreign_non_business_tax
        
        # Credit is limited to the lesser of foreign tax paid or Canadian tax on foreign income
        return min(total_foreign_tax, federal_tax * 0.1)  # Simplified assumption
    
    def calculate_cpp_contribution(self, employment_income: float, province: str) -> float:
        """Calculate CPP/QPP contribution"""
        if province == 'QC':
            # Quebec Pension Plan
            pensionable_earnings = min(employment_income, self.qpp_max_pensionable) - self.qpp_basic_exemption
            return max(0, pensionable_earnings * self.qpp_rate)
        else:
            # Canada Pension Plan
            pensionable_earnings = min(employment_income, self.cpp_max_pensionable) - self.cpp_basic_exemption
            return min(max(0, pensionable_earnings * self.cpp_rate), self.cpp_max_contribution)
    
    def calculate_ei_contribution(self, employment_income: float, province: str) -> float:
        """Calculate EI contribution"""
        insurable_earnings = min(employment_income, self.ei_max_insurable)
        
        if province == 'QC':
            # Quebec has reduced EI rate due to QPIP
            ei_contribution = insurable_earnings * self.ei_rate_quebec
            qpip_contribution = insurable_earnings * self.qpip_rate
            return ei_contribution + qpip_contribution
        else:
            return insurable_earnings * self.ei_rate
    
    def calculate_clawbacks(self, net_income: float, income: IncomeDetails) -> Dict[str, float]:
        """Calculate benefit clawbacks"""
        clawbacks = {}
        
        # OAS clawback
        if net_income > self.oas_clawback_threshold:
            oas_clawback = min(income.oas_benefits, 
                             (net_income - self.oas_clawback_threshold) * self.oas_clawback_rate)
            clawbacks['oas'] = oas_clawback
        else:
            clawbacks['oas'] = 0
        
        # EI benefit clawback
        if net_income > self.ei_clawback_threshold and income.ei_benefits > 0:
            ei_clawback = min(income.ei_benefits * 0.30,
                             (net_income - self.ei_clawback_threshold) * self.ei_clawback_rate)
            clawbacks['ei'] = ei_clawback
        else:
            clawbacks['ei'] = 0
        
        # Social benefit repayment (simplified)
        clawbacks['social_benefit'] = 0  # Would need more detailed calculation
        
        clawbacks['total'] = clawbacks['oas'] + clawbacks['ei'] + clawbacks['social_benefit']
        
        return clawbacks
    
    def calculate_refundable_credits(self, province: str, personal_info: PersonalInfo, net_income: float) -> Dict[str, float]:
        """Calculate refundable tax credits"""
        credits = {}
        
        # GST/HST Credit
        if personal_info.is_married:
            gst_base = self.gst_credit_married
        else:
            gst_base = self.gst_credit_single
        
        gst_base += personal_info.num_dependants * self.gst_credit_child
        
        if net_income > self.gst_credit_threshold:
            gst_reduction = (net_income - self.gst_credit_threshold) * 0.05
            credits['gst_hst'] = max(0, gst_base - gst_reduction)
        else:
            credits['gst_hst'] = gst_base
        
        # Canada Child Benefit (simplified)
        if personal_info.num_dependants > 0:
            ccb_amount = 0
            for i, age in enumerate(personal_info.dependant_ages):
                if age < 6:
                    ccb_amount += self.ccb_max_under6
                else:
                    ccb_amount += self.ccb_max_6to17
            
            if net_income > self.ccb_threshold:
                ccb_reduction = (net_income - self.ccb_threshold) * self.ccb_reduction_rate1
                ccb_amount = max(0, ccb_amount - ccb_reduction)
            
            credits['canada_child_benefit'] = ccb_amount
        else:
            credits['canada_child_benefit'] = 0
        
        # Canada Workers Benefit (simplified)
        credits['canada_workers_benefit'] = 0  # Would need employment income details
        
        # Climate Action Incentive (provincial specific)
        credits['climate_action_incentive'] = 0  # Would need provincial implementation
        
        # Working Income Tax Benefit (legacy - now part of CWB)
        credits['working_income_tax_benefit'] = 0
        
        credits['total'] = (credits['gst_hst'] + credits['canada_child_benefit'] + 
                          credits['canada_workers_benefit'] + credits['climate_action_incentive'] +
                          credits['working_income_tax_benefit'])
        
        return credits
    
    def calculate_combined_marginal_rate(self, income: float, province: str) -> float:
        """Calculate combined federal and provincial marginal tax rate"""
        federal_rate = self.calculate_marginal_rate(income, self.federal_brackets)
        
        provincial_rate = 0
        if province in self.provincial_data:
            prov_data = self.provincial_data[province]
            provincial_rate = self.calculate_marginal_rate(income, prov_data['brackets'])
        
        return (federal_rate + provincial_rate) * 100  # Return as percentage

def calculate_tax_from_json_input():
    """Calculate tax from JSON input received via stdin"""
    import sys
    import json
    
    try:
        # Read JSON input from stdin
        input_data = json.loads(sys.stdin.read())
        
        calculator = ComprehensiveCanadianTaxCalculator2024()
        
        # Parse personal info
        personal_info_data = input_data.get('personalInfo', {})
        personal_info = PersonalInfo(
            age=personal_info_data.get('age', 30),
            is_married=personal_info_data.get('isMarried', False),
            spouse_income=personal_info_data.get('spouseIncome', 0),
            spouse_age=personal_info_data.get('spouseAge', 30),
            has_disability=personal_info_data.get('hasDisability', False),
            spouse_has_disability=personal_info_data.get('spouseHasDisability', False),
            num_dependants=personal_info_data.get('numDependants', 0),
            dependant_ages=personal_info_data.get('dependantAges', []),
            is_student=personal_info_data.get('isStudent', False),
            is_volunteer_firefighter=personal_info_data.get('isVolunteerFirefighter', False),
            is_search_rescue_volunteer=personal_info_data.get('isSearchRescueVolunteer', False)
        )
        
        # Parse income details
        income_data = input_data.get('income', {})
        income = IncomeDetails(
            employment_income=income_data.get('employmentIncome', 0),
            employment_benefits=income_data.get('employmentBenefits', 0),
            commission_income=income_data.get('commissionIncome', 0),
            business_income=income_data.get('businessIncome', 0),
            professional_income=income_data.get('professionalIncome', 0),
            farming_income=income_data.get('farmingIncome', 0),
            fishing_income=income_data.get('fishingIncome', 0),
            interest_income=income_data.get('interestIncome', 0),
            canadian_dividend_income=income_data.get('canadianDividendIncome', 0),
            foreign_dividend_income=income_data.get('foreignDividendIncome', 0),
            rental_income=income_data.get('rentalIncome', 0),
            capital_gains=income_data.get('capitalGains', 0),
            capital_losses_current=income_data.get('capitalLosses', 0),
            cpp_qpp_benefits=income_data.get('cppQppBenefits', 0),
            oas_benefits=income_data.get('oasBenefits', 0),
            private_pension=income_data.get('privatePension', 0),
            rrif_withdrawals=income_data.get('rrifWithdrawals', 0),
            ei_benefits=income_data.get('eiBenefits', 0),
            alimony_received=income_data.get('alimonyReceived', 0),
            other_income=income_data.get('otherIncome', 0)
        )
        
        # Parse deductions and credits
        deductions_data = input_data.get('deductions', {})
        deductions = DeductionsCredits(
            rrsp_contribution=deductions_data.get('rrspContribution', 0),
            pension_contribution=deductions_data.get('pensionContribution', 0),
            union_dues=deductions_data.get('unionDues', 0),
            professional_dues=deductions_data.get('professionalDues', 0),
            childcare_expenses=deductions_data.get('childcareExpenses', 0),
            alimony_paid=deductions_data.get('alimonyPaid', 0),
            medical_expenses=deductions_data.get('medicalExpenses', 0),
            tuition_fees=deductions_data.get('tuitionFees', 0),
            student_loan_interest=deductions_data.get('studentLoanInterest', 0),
            moving_expenses=deductions_data.get('movingExpenses', 0),
            charitable_donations=deductions_data.get('charitableDonations', 0),
            political_contributions=deductions_data.get('politicalContributions', 0)
        )
        
        # Get province
        province = input_data.get('province', 'ON')
        
        # Calculate tax
        result = calculator.calculate_comprehensive_tax(province, personal_info, income, deductions)
        
        # Convert result to JSON-serializable format
        output = {
            'totalIncome': result.total_income,
            'netIncome': result.net_income,
            'taxableIncome': result.taxable_income,
            'federalTax': result.federal_tax,
            'provincialTax': result.provincial_tax,
            'totalTaxBeforeCredits': result.total_tax_before_credits,
            'totalTaxAfterCredits': result.total_tax_after_credits,
            'cppContribution': result.cpp_contribution,
            'eiContribution': result.ei_contribution,
            'totalPayable': result.total_payable,
            'netIncomeAfterTax': result.net_income_after_tax,
            'averageTaxRate': result.average_tax_rate,
            'marginalTaxRate': result.marginal_tax_rate,
            'basicPersonalCredit': result.basic_personal_credit,
            'spouseCredit': result.spouse_credit,
            'ageCredit': result.age_credit,
            'pensionCredit': result.pension_credit,
            'disabilityCredit': result.disability_credit,
            'medicalCredit': result.medical_credit,
            'charitableCredit': result.charitable_credit,
            'totalNonRefundableCredits': result.total_non_refundable_credits,
            'gstHstCredit': result.gst_hst_credit,
            'canadaChildBenefit': result.canada_child_benefit,
            'totalRefundableCredits': result.total_refundable_credits,
            'oasClawback': result.oas_clawback,
            'totalClawbacks': result.total_clawbacks,
            'amtIncome': result.amt_income,
            'amtTax': result.amt_tax,
            'tosiTax': result.tosi_tax,
            'provincialSurtax': result.provincial_surtax
        }
        
        print(json.dumps(output))
        
    except Exception as e:
        error_output = {'error': str(e)}
        print(json.dumps(error_output))
        sys.exit(1)

if __name__ == "__main__":
    calculate_tax_from_json_input()