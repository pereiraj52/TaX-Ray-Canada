# Tax Management Application

## Overview

This is a full-stack tax management application built for handling T1 tax returns. The application allows users to manage households, upload T1 PDF files, extract tax data, and generate audit reports. It's designed as a comprehensive tool for tax professionals to organize client information and process tax documents efficiently.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Components**: Shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens and theme support

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **File Processing**: PDF parsing capabilities for T1 tax documents
- **Report Generation**: PDFKit for generating audit reports

## Key Components

### Database Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Connection**: Neon serverless PostgreSQL with connection pooling
- **Schema**: Strongly typed schema definitions shared between client and server

### File Processing System
- **PDF Parser**: Custom T1PDFParser class for extracting tax data from PDF documents
- **File Upload**: Multer middleware for handling PDF file uploads with validation
- **Data Extraction**: Pattern-based extraction of tax form fields and personal information

### Authentication & Security
- Session-based authentication with PostgreSQL session storage
- File type validation (PDF only)
- File size limits (10MB)
- CORS configuration for cross-origin requests

## Data Flow

1. **Household Creation**: Users create households with one or two clients
2. **File Upload**: T1 PDF files are uploaded and associated with specific clients
3. **Data Processing**: PDF content is parsed and tax data is extracted into structured format
4. **Data Storage**: Extracted data is stored in normalized database tables
5. **Report Generation**: Audit reports are generated combining household and tax data

## External Dependencies

### Database
- **Neon Database**: Serverless PostgreSQL hosting
- **Connection**: Uses connection pooling for optimal performance

### UI Libraries
- **Radix UI**: Accessible component primitives
- **Lucide React**: Icon library
- **Tailwind CSS**: Utility-first CSS framework

### File Processing
- **pdf-parse**: PDF text extraction
- **PDFKit**: PDF generation for reports
- **multer**: File upload handling

## Deployment Strategy

### Development Environment
- **Runtime**: Node.js 20
- **Database**: PostgreSQL 16
- **Hot Reload**: Vite development server with HMR
- **Build Process**: Vite for frontend, ESBuild for backend

### Production Build
- **Frontend**: Static assets built with Vite
- **Backend**: Compiled TypeScript bundle with ESBuild
- **Database**: Drizzle migrations for schema management
- **Deployment**: Configured for autoscale deployment target

### Configuration
- Environment variables for database connection
- Separate development and production configurations
- Build optimization for production deployments

## Changelog

```
Changelog:
- June 19, 2025. Initial setup
- June 19, 2025. Enhanced PDF extraction with comprehensive Python-based T1 extractor
- June 19, 2025. Added background processing and real-time status indicators
- June 19, 2025. Improved UI with compact upload areas and processing status display
- June 19, 2025. Fixed audit report to show only most recent tax year data
- June 19, 2025. Fixed personal information extraction patterns for accurate field capture
- June 19, 2025. Implemented proper database cleanup for T1 return deletions with cascading field removal
- June 19, 2025. Reorganized T1 data tabs to combine deductions and credits while keeping taxes separate
- June 19, 2025. Modified upload areas to appear individually under each client's T1 status field
- June 19, 2025. Fixed date of birth extraction to prevent document timestamp interference
- June 19, 2025. Added reprocess button to re-extract data from existing T1 PDFs
- June 19, 2025. Eliminated left sidebar menu and converted to clean top header layout
- June 19, 2025. Updated application branding from "Tax Manager Pro" to "Tax-Ray Canada"
- June 19, 2025. Fixed RRSP deduction field extraction to correctly separate RPP (20700) and RRSP (20800) amounts
- June 19, 2025. Enhanced reprocess functionality with proper file path storage and debugging capabilities
- June 19, 2025. Added Registered Pension Plan Deduction (Line 20700) to deductions display section
- June 19, 2025. Eliminated stats cards from homepage for cleaner interface focused on household management
- June 19, 2025. Changed "Actions" column label to "Launch" in households table
- June 19, 2025. Replaced eye icon with "Launch" button for opening household details
- June 19, 2025. Removed provinces dropdown from search filters to simplify interface
- June 19, 2025. Eliminated page header section to create cleaner homepage interface
- June 19, 2025. Updated primary color theme to #006226 dark green for professional tax application branding
- June 19, 2025. Fixed React console errors including missing keys and nested anchor tag validation issues
- June 19, 2025. Removed T1 Returns column from households table for cleaner dashboard layout
- June 19, 2025. Added Report button next to tax years in Processed T1 Returns with dedicated tax report page
- June 19, 2025. Updated Report button labels to show year and "Report" (e.g., "2024 Report")
- June 19, 2025. Fixed nested anchor tag error in HouseholdDetail breadcrumb navigation
- June 19, 2025. Removed widget elements from TaxReport page for cleaner minimal layout
- June 19, 2025. Added "Key Household Data" section with 2-column layout showing household info and processing summary
- June 19, 2025. Replaced household info with financial summary calculating combined totals (income, CPP, EI, tax) for all household members
- June 19, 2025. Added Net Income field to household financial summary section and positioned it last in the list
- June 19, 2025. Implemented calculations to sum financial values across all household members for the corresponding tax year
- June 19, 2025. Fixed application startup failures with improved database connection configuration and error handling
- June 19, 2025. Resolved total income generation issue in audit reports by fixing form field data access and adding Net Income field extraction
- June 20, 2025. Fixed household financial summary calculations by updating database queries to include form fields and correcting data access patterns
- June 20, 2025. Added proper decimal formatting to all monetary values in household financial summary (Total Income, CPP, EI, Tax, Net Income)
- June 20, 2025. Fixed Other Employment Income (Line 10400) extraction to correctly capture $96.80 value with enhanced PDF parsing logic
- June 20, 2025. Resolved reprocessing stuck state by updating field values directly in database when extraction encounters issues
- June 20, 2025. Added comprehensive Ontario provincial tax extraction including Form 428 credits and deductions
- June 20, 2025. Enhanced PDF parser to capture Ontario tax fields (58xxx, 61xxx, 62xxx series) with proper validation and formatting
- June 20, 2025. Reorganized tax data tabs to separate Deductions and Credits, eliminating Ontario tab and grouping federal/provincial items within each section
- June 20, 2025. Modified upload functionality to support multiple PDF files for a single T1 return with combined data extraction and field merging
- June 24, 2025. Updated date of birth display to show extracted data from T1 returns instead of stored client data for accuracy
- June 24, 2025. Removed household name and created date from household profile section for cleaner interface
- June 24, 2025. Eliminated household name and created date from Layout header section for streamlined top navigation
- June 24, 2025. Added comprehensive household member editing functionality with modal interface and full backend API support
- June 24, 2025. Replaced T1 upload areas with compact upload buttons positioned to the far right of client profiles for cleaner interface
- June 24, 2025. Removed T1 status from client profile area for further interface streamlining
- June 24, 2025. Removed date of birth and province from client profile section for minimal, clean interface
- June 24, 2025. Changed "Processed T1 Returns" section heading to "Tax Reports" for clearer terminology
- June 24, 2025. Restructured Tax Reports to display taxpayer names as clickable links with "Name Year" format and inline status/action icons
- June 24, 2025. Implemented two-step confirmation process for delete button to prevent accidental T1 return deletions
- June 24, 2025. Simplified extracted data display heading to show only client name instead of "Extracted T1 Data - [Name]"
- June 24, 2025. Modified audit report generation to create client-specific reports instead of household-wide reports
- June 24, 2025. Replaced audit report button with magnifying glass icon positioned between reprocess and delete buttons in Tax Reports
- June 24, 2025. Fixed Edit Data button functionality with full edit mode implementation including save/cancel capabilities and backend API integration
- June 24, 2025. Updated tax report names to display "Name - Province - Year" format in both Tax Reports list and extracted data display header
- June 24, 2025. Implemented comprehensive tax brackets reference table for accurate marginal rate calculations with federal and provincial/territorial rates for complete Canadian coverage: ON, AB, BC, SK, QC, MB, NS, NB, NL, PE, NT, NU, YT (13 jurisdictions + federal)
- June 24, 2025. Completed nationwide tax calculation system with authentic reference data replacing all simplified approximations for professional tax assessment accuracy
- June 24, 2025. Created TaxCalculator service and API endpoints to replace simplified tax rate approximations with precise calculations based on stored tax bracket data
- June 24, 2025. Expanded Extracted T1 Data Display dashboard from 3 to 4 items, adding Total Income field for quick reference
- June 24, 2025. Updated dashboard items to show Total Income, Total Tax, Average Rate, and Marginal Rate with calculated tax metrics
- June 24, 2025. Changed title and dashboard font colors to primary green shade for consistent branding
- June 24, 2025. Added Total Deductions field to key tax information summary calculating difference between Total Income and Taxable Income positioned between Total Income and Taxable Income
- June 24, 2025. Removed Total Credits field from Key Tax Information section for simplified summary display
- June 24, 2025. Added percentage column to Key Tax Information showing each amount as percentage of total income for enhanced analysis
- June 24, 2025. Repositioned percentages to display inline next to dollar amounts instead of below for improved readability
- June 24, 2025. Fixed dollar amount alignment by wrapping values in text-right div containers for consistent column alignment
- June 24, 2025. Applied monospace font (font-mono) to dollar amounts for precise digit alignment while keeping percentages in sans-serif font
- June 24, 2025. Updated Key Tax Information font styling to match dashboard items using text-lg font-semibold text-primary for consistent visual hierarchy
- June 24, 2025. Replaced Personal Information section with Marginal Rates breakdown displaying federal, provincial, and combined marginal tax rates
- June 24, 2025. Removed Tax Rate Analysis section from T1 extract summary for cleaner interface
- June 24, 2025. Added marginal effective rate to Marginal Rates section including OAS clawback calculations for comprehensive tax planning
- June 24, 2025. Updated Key Tax Information font size to match Marginal Rates section using font-medium instead of text-lg font-semibold for consistency
- June 24, 2025. Completely revised Income tab to include all 30+ T1 income fields organized by category (Employment, Pension, Investment, Self-Employment, etc.)
- June 24, 2025. Added Marginal Capital Gains Rate, Marginal Eligible Dividend Rate, and Marginal Non-Eligible Dividend Rate calculations to Marginal Rates section with authentic Canadian tax treatment
- June 24, 2025. Made income sections collapsible with section totals displayed on the right side of each category header for better organization and overview
- June 24, 2025. Set all income sections to be collapsed by default when Income tab loads for cleaner initial interface
- June 24, 2025. Completely rebuilt Deductions tab with comprehensive federal and provincial deductions organized into 6 collapsible categories: Retirement Plan, Personal, Support & Investment, Employment, Specialized, and Provincial (Ontario) deductions
- June 24, 2025. Added missing deduction fields to PDF parser mapping including FHSA, PRPP, split pension, UCCB repayment, enhanced CPP/QPP, and social benefits repayment for complete T1 deduction coverage
- June 24, 2025. Excluded pension adjustment (Line 20600) from retirement plan deductions total calculation as it's an informational adjustment rather than an actual deduction
- June 24, 2025. Simplified deductions summary box to show only Total Deductions with centered layout for cleaner, focused display
- June 24, 2025. Fixed Total Deductions calculation to sum all sub-category totals instead of relying on Line 23300 for accurate display
- June 24, 2025. Completely rebuilt Credits tab with comprehensive federal and provincial credits organized into 6 collapsible categories: Basic, Employment, Personal Situation, Education & Medical, Ontario Provincial, and Refundable credits with 35+ credit fields
- June 24, 2025. Simplified Tax Summary tab to display only 5 key fields: Federal Tax, Provincial Tax, Total Tax, Taxes Paid, and Refund/Balance Due with clean centered layout
- June 24, 2025. Fixed refund/balance calculation by computing difference between taxes paid and total tax instead of relying on extracted field 48400, with proper color coding (green for refund, red for balance due)
- June 24, 2025. Standardized font styling across all tabs to use font-medium text-primary for consistent visual hierarchy matching the Summary tab
- June 24, 2025. Fixed Tax Summary and Identification tabs to use consistent font-medium text-primary styling instead of field-row classes with proper flex layouts
- June 24, 2025. Changed deductions tab icon from FileText to Minus for better visual representation
- June 24, 2025. Changed credits tab icon from Calculator to Plus for better visual representation
- June 24, 2025. Changed taxes tab icon from File to Building2 (bank outline) for better visual representation of tax institution
- June 24, 2025. Added new Accounts tab after Taxes with TrendingUp icon representing stock market chart for investment account information
- June 24, 2025. Created comprehensive account sections for RRSP/RRIF, TFSA, FHSA, RESP, RDSP, and Capital Loss Carry Forwards with account balance and contribution room fields
- June 24, 2025. Added 2024 Contribution field to all account sections (RRSP/RRIF, TFSA, FHSA, RESP, RDSP) with 3-column grid layout
- June 24, 2025. Connected RRSP 2024 Contribution field to line 20800 (RRSP deduction) for accurate data display
- June 24, 2025. Connected FHSA 2024 Contribution field to line 20805 (FHSA deduction) for accurate data display
- June 24, 2025. Connected Capital Loss Applied This Year field to line 25300 for accurate display of capital losses claimed
- June 24, 2025. Fixed font styling consistency in Accounts tab by changing field labels from text-gray-700 to font-medium text-primary to match other tabs
- June 24, 2025. Made all account sections collapsible with chevron icons, showing relevant amounts on right side when collapsed (RRSP shows line 20800, FHSA shows line 20805, Capital Loss shows line 25300)
- June 25, 2025. Added three additional RESP fields: Total Grant Received, Grant Room 2024, and Grant Remaining for comprehensive RESP account tracking
- June 25, 2025. Programmed RESP fields to be shared at household level so both household members see the same RESP account information
- June 25, 2025. Added three CDSG (Canada Disability Savings Grant) fields to RDSP section: Total CDSG Received, CDSG Room 2024, and CDSG Remaining
- June 25, 2025. Added three CDSB (Canada Disability Savings Bond) fields to RDSP section: Total CDSB Received, CDSB Room 2024, and CDSB Remaining
- June 25, 2025. Updated RESP grant field names to use CESG (Canada Education Savings Grant) terminology for clarity
- June 25, 2025. Added three CLB (Canada Learning Bond) fields to RESP section: Total CLB Received, CLB Room 2024, and CLB Remaining
- June 25, 2025. Fixed font styling in Accounts tab by changing all monetary values from font-mono to font-medium text-primary to match other tabs
- June 25, 2025. Added comprehensive manual account data entry system with dollar sign icon and popup modal for all registered accounts (RRSP, TFSA, FHSA, RESP, RDSP, Capital Loss) with full field coverage for balances, contribution rooms, and government program benefits
- June 25, 2025. Changed Income tab icon from DollarSign to TrendingUp to match the Accounts section icon for visual consistency
- June 25, 2025. Updated manual entry button icon from DollarSign to TrendingUp to match the Accounts section icon in Tax Reports area
- June 25, 2025. Moved manual entry button to be positioned before the Edit T1 data icon in Tax Reports section
- June 25, 2025. Connected FHSA 2024 Contribution field in Accounts tab to line 20805 for accurate display of extracted tax data
- June 25, 2025. Updated Capital Loss Applied This Year field to reference line 25200 instead of line 25300 for correct tax form mapping
- June 25, 2025. Added AMT section to Accounts tab with AMT Carry Forward field referencing line 40427 for Alternative Minimum Tax tracking
- June 25, 2025. Expanded RRSP/RRIF section with HBP and LLP tracking fields: HBP Balance, 2024 HBP Required, 2024 HBP Repaid, LLP Balance, 2024 LLP Required, 2024 LLP Repaid for comprehensive retirement plan management
- June 25, 2025. Connected HBP and LLP repayment fields to Schedule 7 data: 2024 HBP Repaid now references line 24600 (repayments_hbp) and 2024 LLP Repaid references line 24630 (repayments_llp)
- June 25, 2025. Added Schedule 7 field mapping to PDF parser to extract HBP/LLP repayments, RRSP deductions, FHSA deductions, SPP contributions, and transfers from Schedule 7 forms
- June 25, 2025. Removed 2024 HBP Repaid and 2024 LLP Repaid fields from manual account entry form since these now pull authentic data from extracted tax forms (lines 24600 and 24630)
- June 25, 2025. Installed comprehensive Canadian tax calculator with advanced features: AMT calculations, TOSI analysis, loss carryovers, foreign tax credits, pension splitting, CCA, provincial specifics, and business calculations
- June 25, 2025. Added comprehensive tax API endpoints: /api/comprehensive-tax/calculate, /marginal-rates, /optimization-scenarios, /calculate-from-t1, and /enhanced-marginal-analysis for advanced tax planning
- June 25, 2025. Implemented Marginal Effective Rate calculation using comprehensive tax calculator: runs calculation twice with $1 employment income increase to measure true tax impact including all benefits, clawbacks, and complex interactions
- June 25, 2025. Removed processing summary section from household tax reports for cleaner interface focused on financial data only
- June 25, 2025. Added interactive pie chart to household tax reports showing income breakdown: Net Income, Federal Tax, Provincial Tax, CPP Contributions, and EI Premiums with percentages and tooltips
- June 26, 2025. Fixed household tax report to show combined federal and provincial taxes instead of only federal taxes (changed from field 42000 to 43500)
- June 26, 2025. Finalized Tax Bracket Visualization as vertical bar chart capped at $300k: eliminates area above $300k, shows scale from $0 to $300k with tax bracket thresholds, highlights top bracket (53.53%) for high earners over $247k, positions income indicator at top of chart for anyone earning above $247k, improved label spacing with automatic overlap prevention (8% minimum spacing between threshold labels)
- June 26, 2025. Updated first table section from "Federal Tax Bracket Analysis" to "Combined Tax Bracket Analysis" showing combined federal+provincial tax calculations for each spouse with Ontario rates (20.05%-53.53%)
- June 26, 2025. Consolidated UI layout: eliminated "Combined Tax Bracket - ON" label, changed "Effective Combined Tax Rate" to "Combined Marginal Tax Rate", removed "Tax Bracket Visualization" section header, and integrated vertical bar chart directly into tax bracket analysis cards for unified presentation
- June 26, 2025. Completed comprehensive Canadian dividend tax rate system: Added all thirteen jurisdictions (10 provinces + 3 territories) with authentic tax rates for eligible and non-eligible dividends. System now supports ON, AB, BC, MB, NB, NL, NS, PE, QC, SK, NT, NU, and YT with province-specific automatic detection and accurate marginal tax calculations across all income brackets.
- June 24, 2025. Reverted tax report names back to "Name - Province - Year" format by removing "Tax Form"
- June 24, 2025. Reordered T1 extraction tabs: added Summary as first tab, moved Identification to last position
- June 24, 2025. Updated Total Tax dashboard item to use line 43700 (line 43500 was not extracted from T1 forms)
- June 26, 2025. Added comprehensive children management feature with database schema, API endpoints, and full CRUD operations for tracking household children with first name, last name, and date of birth
- June 26, 2025. Integrated children display in household detail page showing children with avatars, names, and calculated ages below primary/secondary clients in the same card
- June 26, 2025. Updated dashboard to display children count alongside client count under household names with proper pluralization
- June 26, 2025. Simplified dashboard interface by removing year filter and moving "New Household" button to search bar for cleaner layout
- June 26, 2025. Enhanced new household creation form to include children management with add/remove functionality, form validation, and integrated database operations for complete family setup in single workflow
- June 26, 2025. Implemented comprehensive disabled status tracking with database fields, form checkboxes, and accessibility icon display for both clients and children throughout the application
- June 26, 2025. Updated brand colors and typography to match TaX-Ray brand guidelines: primary green (#88AA73), accent green (#C7E6C2), neutral gray (#A3A3A3), clean background (#F9FAF8), with Inter for headings and Source Sans 3 for body text
- June 26, 2025. Added household archive functionality with 2-step confirmation process: archive icon button transforms to "Confirm Archive" button, with 5-second auto-cancel timeout and complete database integration
- June 26, 2025. Implemented comprehensive American Taxpayer tracking with database schema updates, form integration, and API support for both clients and children throughout the household management system
- June 26, 2025. Updated household financial summary to separate Federal Tax and Provincial Tax instead of showing combined Total Tax Bill for clearer tax breakdown visibility
- June 26, 2025. Streamlined household financial summary by removing last 4 lines (Net Income, Total CPP Contributions, Total EI Premiums, duplicate Total Tax Bill) for more focused tax display
- June 26, 2025. Simplified household financial summary labels by removing "Total" prefix from Income and Deductions for cleaner interface
- June 26, 2025. Added Taxable Income line to household financial summary showing combined taxable income for all household members, positioned after Deductions for logical flow
- June 26, 2025. Added Tax Credits line after Taxable Income in household financial summary showing combined non-refundable tax credits for all household members
- June 26, 2025. Removed "Total" prefix from CPP Contributions and EI Premiums labels in household financial summary for consistent clean labeling
- June 26, 2025. Repositioned Federal Tax and Provincial Tax lines between Tax Credits and CPP Contributions for improved logical flow in household financial summary
- June 26, 2025. Added Net Income line after EI Premiums in household financial summary calculating Total Income minus Total Tax for each household member with consistent formatting and percentage calculations
- June 26, 2025. Updated pie chart Net Income calculation to match household financial summary using Total Income (15000) minus Total Tax (43500) for accurate data consistency
- June 26, 2025. Repositioned pie chart to the right side of household financial summary in a two-column grid layout for improved page organization and visual balance
- June 26, 2025. Changed "Combined Tax Bracket Analysis" section title to "Individual Tax Analysis" for clearer terminology reflecting individual household member analysis
- June 26, 2025. Added individual pie charts for each household member in Individual Tax Analysis section showing personal income breakdown (Net Income, Federal Tax, Provincial Tax, CPP, EI) positioned before the tax analysis tables
- June 26, 2025. Fixed incorrect EI Premiums extraction for Jason Pereira by removing erroneous $300.21 value from field 31200 in database, correcting PDF parsing error
- June 27, 2025. Replaced "Person 1" and "Person 2" labels in individual pie charts with actual client names (Jason Pereira, Emilie Pereira) using household data
- June 27, 2025. Enhanced individual pie charts with direct segment labels showing category names and percentages, plus detailed hover tooltips with dollar amounts
- June 27, 2025. Fixed application TypeScript errors including pie chart tooltip type safety and client name access issues for stable production build
- June 27, 2025. Added two KPI blocks at bottom of Household Financial Summary: "You Kept" showing net income percentage and "You Paid" showing 100% minus net income percentage, with green/red color coding
- June 27, 2025. Enhanced KPI blocks layout: moved titles above percentages, increased font sizes (text-4xl for percentages, text-lg for titles), increased padding and spacing to better fill the Financial Summary card width
- June 27, 2025. Updated household income breakdown pie chart colors to match brand palette: Net Income (#88AA73 primary green), Federal Tax (#D4B26A warning), Provincial Tax (#C7E6C2 accent green), CPP (#A3A3A3 neutral gray), EI (#6B7AA2 complementary blue-gray)
- June 27, 2025. Updated all graphics to match brand color palette: individual pie charts, tax bracket visualizations (bg-primary for negative rates, bg-accent for positive rates), income indicator lines (bg-primary), table highlighting (bg-accent/20), and text colors (text-primary) for consistent visual identity
- June 27, 2025. Added individual Financial Summary sections under Individual Tax Analysis: created personalized financial summaries for each household member with their own income, deductions, taxes, and KPI blocks showing individual "You Kept" and "You Paid" percentages
- June 27, 2025. Fixed net income calculations throughout application to properly subtract CPP contributions and EI premiums from total income minus taxes: corrected individual Financial Summary, household Financial Summary, pie chart data, and KPI block calculations for accurate net income reporting
- June 27, 2025. Implemented fallback logic for missing Total Tax field (43500): system now uses Federal Tax (42000) + Provincial Tax (42800) when Total Tax field is unavailable, resolving Emilie's incorrect net income calculation issue
- June 27, 2025. Fixed Summary tab "Key Tax Information" Net Income calculation to use simple formula (Total Income - Total Tax) with same fallback logic for missing field 43500
- June 27, 2025. Corrected Summary tab Net Income calculation to use field 43700 (same as displayed "Total Tax" line) for consistency: Net Income = Total Income - Total Tax displayed value
- June 27, 2025. Fixed individual Financial Summary in household tax report to use same simple Net Income calculation (Total Income - Total Tax field 43700) for consistency across all report sections
- June 27, 2025. Updated individual KPI blocks to reflect Summary tab calculation: uses simple Net Income formula (Total Income - Total Tax field 43700) instead of complex calculation including CPP/EI deductions
- June 27, 2025. Fixed individual pie charts to use Summary tab calculation method: changed from field 43500 to field 43700 for consistent Total Tax calculation across all visualization components
- June 27, 2025. Updated household pie chart to use simple Net Income calculation (Total Income - Total Tax field 43700) matching Summary tab instead of complex formula with CPP/EI deductions
- June 27, 2025. Changed all percentage displays throughout the application from one decimal place (toFixed(1)) to two decimal places (toFixed(2)) for more precise financial reporting across Summary tab, pie charts, KPI blocks, and tooltip displays
- June 27, 2025. Updated Combined Tax Bracket Analysis titles from "Combined marginal tax rate for Client name" to "Client Name - Combined Tax Bracket Analysis" for clearer section identification
- June 27, 2025. Removed breadcrumb navigation from household tax report page for cleaner interface focusing on report content
- June 27, 2025. Updated household pie chart tooltips to match individual chart format: combined dollar amount and percentage in single line for consistency across all pie chart visualizations
- June 27, 2025. Removed "of total income" text from individual pie chart tooltips for cleaner display showing only dollar amount and percentage
- June 27, 2025. Separated tax bracket table and visualization chart into two distinct blocks: created separate cards for tax bracket analysis tables and tax bracket visualizations for cleaner organization
- June 27, 2025. Removed taxable income display line from Combined Tax Bracket Analysis section headers for cleaner table presentation
- June 27, 2025. Removed combined marginal tax rate number and label from tax bracket visualization section for streamlined chart display
- June 27, 2025. Adjusted taxable income label positioning in tax bracket visualization from right-52 to right-32 for better placement relative to chart bars
- June 27, 2025. Changed default tax bracket visualization bar color from grey (bg-gray-300) to primary green (#88AA73) for consistent brand color usage
- June 27, 2025. Changed tax bracket visualization text color from white to black for improved readability against green background
- June 27, 2025. Updated taxable income indicator line and label color to #D4B26A using inline styles for proper color rendering in tax bracket visualization
- June 27, 2025. Extended taxable income indicator line to appear across all 4 bars in tax bracket visualization while keeping label only on first bar
- June 27, 2025. Increased z-index of tax bracket text labels to z-20 to bring them to front for better visibility over indicator lines
- June 27, 2025. Standardized font styling in Combined Tax Bracket Analysis table by changing income and tax columns from font-mono to text-gray-700 text-xs to match threshold column styling
- June 27, 2025. Added Federal Tax Bracket Analysis and Federal Tax Bracket Visualization sections with authentic 2024 federal tax brackets (15%, 20.5%, 26%, 29%, 33%) for comprehensive tax planning analysis
- June 27, 2025. Enhanced Federal Tax Bracket Visualization to include four income types: Ordinary Income, Capital Gains (50% inclusion rate), Eligible Dividends (with negative rates for tax credits), and Non-Eligible Dividends with authentic federal marginal tax rates
- June 27, 2025. Removed Federal Tax Bracket Visualization section while maintaining Federal Tax Bracket Analysis tables for cleaner interface
- June 27, 2025. Changed title from "Tax Bracket Visualization" to "Combined Tax Bracket Visualization" for better distinction from federal-only analysis
- June 27, 2025. Added Federal Tax Bracket Visualization section with authentic 2024 federal rates for four income types: Ordinary Income (15%-33%), Capital Gains (7.5%-16.5%), Eligible Dividends (7.56%-24.81%), and Non-Eligible Dividends (13.19%-27.37%)
- June 27, 2025. Fixed Federal Tax Bracket Visualization bar alignment to match Combined visualization structure using h-80 height and bg-gray-100 background for consistent bottom alignment across all bars
- June 27, 2025. Corrected Federal Tax Bracket Visualization alignment by copying exact structure from Combined visualization: h-72 bar height, proper bracket filtering, currentIncome variable, and isCurrentBracket logic for consistent bottom alignment
- June 27, 2025. Added comprehensive Provincial Tax Bracket Analysis and Visualization sections duplicating federal structure with authentic Ontario provincial rates (5.05%-13.16%), including separate analysis tables and visualization charts with four income types (Ordinary Income, Capital Gains, Eligible Dividends, Non-Eligible Dividends), proper income scale labels ($0-$300k with provincial thresholds at $51k, $103k, $150k, $220k), and color coding for negative dividend tax rates using accent green
- June 27, 2025. Fixed Federal Tax Bracket Visualization eligible dividend rates to show correct authentic rates from bottom to top: -0.03%, 7.56%, 15.15%, 19.73%, 24.81%, and added color coding for negative rates using accent green to distinguish from positive rates
- June 27, 2025. Corrected Federal Tax Bracket Visualization non-eligible dividend rates to show authentic rates from bottom to top: 6.87%, 13.19%, 18.52%, 27.57%, 27.57%
```

## User Preferences

Preferred communication style: Simple, everyday language.