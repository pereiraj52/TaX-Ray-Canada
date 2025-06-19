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

        // T1 Returns Data
        for (const t1Return of t1Returns) {
          doc.fontSize(16).font('Helvetica-Bold');
          doc.text(`T1 Return - ${t1Return.client.firstName} ${t1Return.client.lastName}`);
          doc.fontSize(12).font('Helvetica');
          doc.text(`Tax Year: ${t1Return.taxYear}`);
          doc.text(`File: ${t1Return.fileName}`);
          doc.text(`Status: ${t1Return.processingStatus}`);
          doc.moveDown();

          if (t1Return.formFields && t1Return.formFields.length > 0) {
            doc.fontSize(14).font('Helvetica-Bold');
            doc.text('Extracted Form Fields:');
            doc.moveDown(0.5);

            // Group fields by type
            const currencyFields = t1Return.formFields.filter(f => f.fieldType === 'currency');
            const textFields = t1Return.formFields.filter(f => f.fieldType === 'text');

            if (currencyFields.length > 0) {
              doc.fontSize(12).font('Helvetica-Bold');
              doc.text('Financial Information:');
              doc.fontSize(11).font('Helvetica');

              for (const field of currencyFields) {
                const amount = field.fieldValue ? `$${parseFloat(field.fieldValue).toLocaleString('en-CA', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}` : '$0.00';

                doc.text(`${field.fieldName} (${field.fieldCode}): ${amount}`, {
                  indent: 20
                });
              }
              doc.moveDown();
            }

            if (textFields.length > 0) {
              doc.fontSize(12).font('Helvetica-Bold');
              doc.text('Personal Information:');
              doc.fontSize(11).font('Helvetica');

              for (const field of textFields) {
                doc.text(`${field.fieldName}: ${field.fieldValue || 'Not provided'}`, {
                  indent: 20
                });
              }
              doc.moveDown();
            }

            // Summary totals
            const totalIncomeField = currencyFields.find(f => f.fieldCode === '15000');
            const netIncomeField = currencyFields.find(f => f.fieldCode === '23600');
            const taxableIncomeField = currencyFields.find(f => f.fieldCode === '26000');

            if (totalIncomeField || netIncomeField || taxableIncomeField) {
              doc.addPage();
              doc.fontSize(14).font('Helvetica-Bold');
              doc.text('Income Summary:');
              doc.fontSize(12).font('Helvetica');

              if (totalIncomeField) {
                const amount = `$${parseFloat(totalIncomeField.fieldValue || '0').toLocaleString('en-CA', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}`;
                doc.text(`Total Income: ${amount}`);
              }

              if (netIncomeField) {
                const amount = `$${parseFloat(netIncomeField.fieldValue || '0').toLocaleString('en-CA', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}`;
                doc.text(`Net Income: ${amount}`);
              }

              if (taxableIncomeField) {
                const amount = `$${parseFloat(taxableIncomeField.fieldValue || '0').toLocaleString('en-CA', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}`;
                doc.text(`Taxable Income: ${amount}`);
              }
            }
          }

          doc.addPage();
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
