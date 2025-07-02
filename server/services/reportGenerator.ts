import PDFDocument from 'pdfkit';
import { T1ReturnWithFields, HouseholdWithClients } from '@shared/schema';

export class T1AuditReportGenerator {
  static async generateAuditReport(
    household: HouseholdWithClients,
    t1Returns: T1ReturnWithFields[]
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Determine the tax year being reported
        const reportYear = t1Returns.length > 0 ? t1Returns[0].taxYear : new Date().getFullYear();

        // Header
        doc.fontSize(20).font('Helvetica-Bold');
        doc.text('T1 Tax Return Audit Report', { align: 'center' });
        doc.fontSize(14).font('Helvetica');
        doc.text(`Tax Year ${reportYear} - Most Recent Filing`, { align: 'center' });
        doc.moveDown();

        // Household Information
        doc.fontSize(16).font('Helvetica-Bold');
        doc.text('Household Information');
        doc.fontSize(12).font('Helvetica');
        doc.text(`Household Name: ${household.name}`);
        doc.text(`Report Tax Year: ${reportYear}`);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`);
        doc.moveDown();

        // Client Information
        doc.fontSize(14).font('Helvetica-Bold');
        doc.text('Clients:');
        doc.fontSize(12).font('Helvetica');
        
        for (const client of household.clients) {
          doc.text(`• ${client.firstName} ${client.lastName}`);
          if (client.sin) doc.text(`  SIN: ${client.sin}`);
          if (client.dateOfBirth) doc.text(`  Date of Birth: ${client.dateOfBirth}`);
          if (client.province) doc.text(`  Province: ${client.province}`);
          doc.moveDown(0.5);
        }

        doc.addPage();

        // T1 Return Data (Single Person Focus)
        const t1Return = t1Returns[0]; // Focus on the selected person only
        if (t1Return) {
          doc.fontSize(16).font('Helvetica-Bold');
          doc.text(`T1 Return - ${t1Return.client?.firstName} ${t1Return.client?.lastName}`);
          doc.fontSize(12).font('Helvetica');
          doc.text(`Tax Year: ${t1Return.taxYear}`);
          doc.text(`File: ${t1Return.fileName}`);
          doc.text(`Status: ${t1Return.processingStatus}`);
          doc.moveDown();

          // Define all possible T1 fields with their categories
          const allFields = [
            // Personal Information
            { section: 'Personal Information', fields: [
              { code: 'first_name', name: 'First Name', type: 'text' },
              { code: 'last_name', name: 'Last Name', type: 'text' },
              { code: 'sin', name: 'Social Insurance Number', type: 'text' },
              { code: 'date_of_birth', name: 'Date of Birth', type: 'text' },
              { code: 'marital_status', name: 'Marital Status', type: 'text' },
              { code: 'province', name: 'Province of Residence', type: 'text' },
              { code: 'city', name: 'City', type: 'text' },
              { code: 'postal_code', name: 'Postal Code', type: 'text' },
            ]},
            
            // Employment Income
            { section: 'Employment Income', fields: [
              { code: '10100', name: 'Employment Income (Line 10100)', type: 'currency' },
              { code: '10120', name: 'Commissions (Line 10120)', type: 'currency' },
              { code: '10130', name: 'Other Employment Income (Line 10130)', type: 'currency' },
              { code: '10400', name: 'Other Employment Income (Line 10400)', type: 'currency' },
            ]},

            // Pension & Retirement Income
            { section: 'Pension & Retirement Income', fields: [
              { code: '11300', name: 'Old Age Security (Line 11300)', type: 'currency' },
              { code: '11400', name: 'Guaranteed Income Supplement (Line 11400)', type: 'currency' },
              { code: '11410', name: 'Allowance/Allowance for Survivor (Line 11410)', type: 'currency' },
              { code: '11500', name: 'CPP/QPP Pension (Line 11500)', type: 'currency' },
              { code: '11600', name: 'CPP/QPP Disability Benefits (Line 11600)', type: 'currency' },
              { code: '12900', name: 'RRSP Income (Line 12900)', type: 'currency' },
              { code: '12905', name: 'FHSA Income (Line 12905)', type: 'currency' },
              { code: '12906', name: 'FHSA Income - Other (Line 12906)', type: 'currency' },
              { code: '12500', name: 'RDSP Income (Line 12500)', type: 'currency' },
              { code: '13000', name: 'Other Pension Income (Line 13000)', type: 'currency' },
            ]},

            // Investment Income
            { section: 'Investment Income', fields: [
              { code: '12000', name: 'Taxable Eligible Dividends (Line 12000)', type: 'currency' },
              { code: '12010', name: 'Non-Eligible Dividends (Line 12010)', type: 'currency' },
              { code: '12100', name: 'Interest & Investment Income (Line 12100)', type: 'currency' },
              { code: '12600', name: 'Rental Income (Line 12600)', type: 'currency' },
              { code: '12700', name: 'Capital Gains (Line 12700)', type: 'currency' },
            ]},

            // Self-Employment Income
            { section: 'Self-Employment Income', fields: [
              { code: '13500', name: 'Business Income (Line 13500)', type: 'currency' },
              { code: '14100', name: 'Professional Income (Line 14100)', type: 'currency' },
              { code: '14300', name: 'Farming Income (Line 14300)', type: 'currency' },
              { code: '14400', name: 'Fishing Income (Line 14400)', type: 'currency' },
            ]},

            // Government Benefits
            { section: 'Government Benefits', fields: [
              { code: '11700', name: 'Universal Child Care Benefit (Line 11700)', type: 'currency' },
              { code: '14500', name: 'Employment Insurance Benefits (Line 14500)', type: 'currency' },
              { code: '14600', name: 'Taxable Scholarships (Line 14600)', type: 'currency' },
            ]},

            // Other Sources
            { section: 'Other Sources', fields: [
              { code: '14400', name: 'Workers\' Compensation (Line 14400)', type: 'currency' },
              { code: '14500', name: 'Social Assistance (Line 14500)', type: 'currency' },
              { code: '14600', name: 'Net Federal Supplements (Line 14600)', type: 'currency' },
              { code: '13010', name: 'Scholarships (Line 13010)', type: 'currency' },
            ]},

            // Income Totals
            { section: 'Income Totals', fields: [
              { code: '15000', name: 'Total Income (Line 15000)', type: 'currency' },
              { code: '23600', name: 'Net Income (Line 23600)', type: 'currency' },
              { code: '26000', name: 'Taxable Income (Line 26000)', type: 'currency' },
            ]},

            // Deductions
            { section: 'Deductions', fields: [
              { code: '20600', name: 'Pension Adjustment (Line 20600)', type: 'currency' },
              { code: '20700', name: 'Registered Pension Plan (Line 20700)', type: 'currency' },
              { code: '20800', name: 'RRSP Deduction (Line 20800)', type: 'currency' },
              { code: '20805', name: 'FHSA Deduction (Line 20805)', type: 'currency' },
              { code: '21000', name: 'Split Pension Deduction (Line 21000)', type: 'currency' },
              { code: '22000', name: 'Support Payments Allowable (Line 22000)', type: 'currency' },
              { code: '22100', name: 'Carrying Charges (Line 22100)', type: 'currency' },
              { code: '22200', name: 'CPP/QPP Self-Employed (Line 22200)', type: 'currency' },
              { code: '22215', name: 'Enhanced CPP/QPP (Line 22215)', type: 'currency' },
              { code: '23300', name: 'Total Deductions (Line 23300)', type: 'currency' },
            ]},

            // Tax Credits - Basic
            { section: 'Basic Credits (Non-Refundable)', fields: [
              { code: '30000', name: 'Basic Personal Amount (Line 30000)', type: 'currency' },
              { code: '30100', name: 'Age Amount (Line 30100)', type: 'currency' },
              { code: '30300', name: 'Spouse/Common-law Partner Amount (Line 30300)', type: 'currency' },
              { code: '30400', name: 'Amount for Eligible Dependant (Line 30400)', type: 'currency' },
              { code: '30450', name: 'Canada Caregiver Amount (Line 30450)', type: 'currency' },
              { code: '30500', name: 'Canada Caregiver Amount for Children (Line 30500)', type: 'currency' },
            ]},

            // Tax Credits - Employment
            { section: 'Employment Credits (Non-Refundable)', fields: [
              { code: '30800', name: 'CPP or QPP Contributions (Line 30800)', type: 'currency' },
              { code: '31000', name: 'CPP/QPP (Self Employed) Contributions (Line 31000)', type: 'currency' },
              { code: '31200', name: 'Employment Insurance Premiums (Line 31200)', type: 'currency' },
              { code: '31217', name: 'Employment Insurance (Self Employed) Premiums (Line 31217)', type: 'currency' },
              { code: '31220', name: 'Canada Employment Amount (Line 31220)', type: 'currency' },
              { code: '31230', name: 'Volunteer firefighters\' amount (VFA) (Line 31230)', type: 'currency' },
              { code: '31240', name: 'Search and rescue volunteers\' amount (SRVA) (Line 31240)', type: 'currency' },
            ]},

            // Tax Credits - Medical & Education
            { section: 'Medical & Education Credits (Non-Refundable)', fields: [
              { code: '33099', name: 'Medical Expenses (Line 33099)', type: 'currency' },
              { code: '33200', name: 'Net Eligible Medical Expenses (Line 33200)', type: 'currency' },
              { code: '31900', name: 'Interest on Student Loans (Line 31900)', type: 'currency' },
              { code: '32300', name: 'Tuition & Education Amounts (Line 32300)', type: 'currency' },
              { code: '32400', name: 'Tuition Transferred (Line 32400)', type: 'currency' },
              { code: '32600', name: 'Amounts Transferred From Spouse/Partner (Line 32600)', type: 'currency' },
            ]},

            // Tax Credits - Charitable
            { section: 'Charitable Gifts & Donations (Non-Refundable)', fields: [
              { code: 'S9-TOTAL', name: 'Total eligible amount of charitable donations', type: 'currency' },
              { code: '34000', name: 'Allowable Charitable Donations (Line 34000)', type: 'currency' },
              { code: '34200', name: 'Total Ecological Gifts (Line 34200)', type: 'currency' },
              { code: '34900', name: 'Donation & Gift Credits (Line 34900)', type: 'currency' },
            ]},

            // Tax Credits - Refundable
            { section: 'Refundable Credits', fields: [
              { code: '44000', name: 'Quebec Abatement (Line 44000)', type: 'currency' },
              { code: '44800', name: 'CPP Overpayment (Line 44800)', type: 'currency' },
              { code: '45000', name: 'EI Overpayment (Line 45000)', type: 'currency' },
              { code: '45200', name: 'Refundable Medical Expense Supplement (Line 45200)', type: 'currency' },
              { code: '45300', name: 'Canada Workers Benefit (Line 45300)', type: 'currency' },
              { code: '45350', name: 'Canada Training Credit (Line 45350)', type: 'currency' },
              { code: '45355', name: 'Multigenerational Home Renovation Tax Credit (Line 45355)', type: 'currency' },
              { code: '45400', name: 'Refund of Investment Tax (Line 45400)', type: 'currency' },
              { code: '45600', name: 'Part XII.2 Tax Credit (Line 45600)', type: 'currency' },
              { code: '45700', name: 'Employee & Partner GST/HST Rebate (Line 45700)', type: 'currency' },
              { code: '46900', name: 'Eligible Educator School Supply Tax Credit (Line 46900)', type: 'currency' },
              { code: '47555', name: 'Canadian Journalism Labour Tax Credit (Line 47555)', type: 'currency' },
              { code: '47556', name: 'Return of Fuel Charge Proceeds to Farmers (Line 47556)', type: 'currency' },
            ]},

            // Ontario Refundable Credits (conditional)
            { section: 'Ontario Refundable Credits', fields: [
              { code: '63095', name: 'Ontario Seniors Care at Home Credit (Line 63095)', type: 'currency' },
              { code: '63100', name: 'Ontario Seniors Public Transit Credit (Line 63100)', type: 'currency' },
              { code: '63110', name: 'Ontario Political Contribution Credit (Line 63110)', type: 'currency' },
              { code: '63220', name: 'Ontario Flow Through Credit (Line 63220)', type: 'currency' },
              { code: '63300', name: 'Ontario Co-operative Education Credit (Line 63300)', type: 'currency' },
            ]},

            // Tax Calculations
            { section: 'Tax Calculations', fields: [
              { code: '42000', name: 'Federal Tax (Line 42000)', type: 'currency' },
              { code: '42800', name: 'Provincial Tax (Line 42800)', type: 'currency' },
              { code: '43500', name: 'Total Tax (Line 43500)', type: 'currency' },
              { code: '43700', name: 'Total Tax (Line 43700)', type: 'currency' },
              { code: '48400', name: 'Refund/Balance Due (Line 48400)', type: 'currency' },
            ]},
          ];

          // Get field values map for quick lookup
          const fieldValues = new Map<string, string>();
          if (t1Return.formFields) {
            for (const field of t1Return.formFields) {
              if (field.fieldCode) {
                fieldValues.set(field.fieldCode, field.fieldValue || '');
              }
            }
          }

          // Check if this is an Ontario return to include Ontario credits
          const isOntario = fieldValues.get('province') === 'ON';

          // Generate report sections
          for (const section of allFields) {
            // Skip Ontario section if not Ontario resident
            if (section.section === 'Ontario Refundable Credits' && !isOntario) {
              continue;
            }

            doc.fontSize(14).font('Helvetica-Bold');
            doc.text(section.section);
            doc.fontSize(11).font('Helvetica');
            doc.moveDown(0.3);

            for (const field of section.fields) {
              const value = fieldValues.get(field.code);
              let displayValue: string;

              if (field.type === 'currency') {
                if (value && value !== '' && !isNaN(parseFloat(value))) {
                  displayValue = `$${parseFloat(value).toLocaleString('en-CA', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}`;
                } else {
                  displayValue = '$0.00';
                }
              } else {
                displayValue = value || 'Not provided';
              }

              doc.text(`${field.name}: ${displayValue}`, {
                indent: 20
              });
            }
            doc.moveDown();

            // Add page break if getting close to bottom
            if (doc.y > 700) {
              doc.addPage();
            }
          }
        }

        // Footer
        doc.fontSize(10).font('Helvetica');
        doc.text('This report was generated automatically from extracted T1 tax return data.', {
          align: 'center'
        });
        doc.text('Please verify all amounts against original documents.', {
          align: 'center'
        });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}
