// Script to restore form fields from extracted_data JSON
const { db } = require('./server/db.ts');
const { t1FormFields, t1Returns } = require('./shared/schema.ts');
const { eq } = require('drizzle-orm');

async function restoreFormFields() {
  try {
    // Get T1 returns with extracted data but no form fields
    const returns = await db.select().from(t1Returns).where(eq(t1Returns.processingStatus, 'completed'));
    
    for (const t1Return of returns) {
      if (t1Return.extractedData && t1Return.extractedData.formFields) {
        console.log(`Restoring form fields for T1 return ${t1Return.id}`);
        
        // Delete existing form fields first
        await db.delete(t1FormFields).where(eq(t1FormFields.t1ReturnId, t1Return.id));
        
        // Insert form fields from extracted data
        const formFields = t1Return.extractedData.formFields.map(field => ({
          t1ReturnId: t1Return.id,
          fieldName: field.fieldName,
          fieldCode: field.fieldCode,
          fieldValue: field.fieldValue,
          fieldType: field.fieldType
        }));
        
        await db.insert(t1FormFields).values(formFields);
        console.log(`Restored ${formFields.length} form fields for T1 return ${t1Return.id}`);
      }
    }
    
    console.log('Form fields restoration completed');
  } catch (error) {
    console.error('Error restoring form fields:', error);
  }
}

restoreFormFields().then(() => process.exit(0));