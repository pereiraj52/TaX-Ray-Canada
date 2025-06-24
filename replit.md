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
- June 24, 2025. Expanded Extracted T1 Data Display dashboard from 3 to 4 items, adding Total Income field for quick reference
- June 24, 2025. Updated dashboard items to show Total Income, Total Tax, Average Rate, and Marginal Rate with calculated tax metrics
```

## User Preferences

Preferred communication style: Simple, everyday language.