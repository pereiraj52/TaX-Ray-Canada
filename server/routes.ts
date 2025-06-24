import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import { storage } from "./storage";
import { T1PDFParser } from "./services/pdfParser";
import { T1AuditReportGenerator } from "./services/reportGenerator";
import { insertHouseholdSchema, insertClientSchema, t1FormFields } from "@shared/schema";
import { z } from "zod";
import { db } from "./db";
import { eq } from "drizzle-orm";

const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Test database connection on startup
  try {
    await storage.getHouseholds();
    console.log("Database connection established successfully");
  } catch (error) {
    console.error("Failed to connect to database:", error);
    process.exit(1);
  }
  
  // Get all households
  app.get("/api/households", async (req, res) => {
    try {
      const households = await storage.getHouseholds();
      res.json(households);
    } catch (error) {
      console.error("Error fetching households:", error);
      res.status(500).json({ message: "Failed to fetch households" });
    }
  });

  // Get specific household
  app.get("/api/households/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid household ID" });
      }

      const household = await storage.getHousehold(id);
      if (!household) {
        return res.status(404).json({ message: "Household not found" });
      }

      res.json(household);
    } catch (error) {
      console.error("Error fetching household:", error);
      res.status(500).json({ message: "Failed to fetch household" });
    }
  });

  // Create household with clients
  app.post("/api/households", async (req, res) => {
    try {
      const createHouseholdRequest = z.object({
        client1: z.object({
          firstName: z.string().min(1),
          lastName: z.string().min(1),
        }),
        client2: z.object({
          firstName: z.string().min(1),
          lastName: z.string().min(1),
        }).optional(),
      });

      const data = createHouseholdRequest.parse(req.body);
      
      // Generate household name based on logic
      let householdName = '';
      if (data.client2) {
        if (data.client1.lastName === data.client2.lastName) {
          householdName = `${data.client1.lastName}, ${data.client1.firstName} & ${data.client2.firstName}`;
        } else {
          householdName = `${data.client1.lastName} & ${data.client2.lastName}, ${data.client1.firstName} & ${data.client2.firstName}`;
        }
      } else {
        householdName = `${data.client1.lastName}, ${data.client1.firstName}`;
      }

      // Create household
      const household = await storage.createHousehold({ name: householdName });

      // Create primary client
      await storage.createClient({
        householdId: household.id,
        firstName: data.client1.firstName,
        lastName: data.client1.lastName,
        isPrimary: true,
      });

      // Create secondary client if provided
      if (data.client2) {
        await storage.createClient({
          householdId: household.id,
          firstName: data.client2.firstName,
          lastName: data.client2.lastName,
          isPrimary: false,
        });
      }

      // Return the complete household with clients
      const completeHousehold = await storage.getHousehold(household.id);
      res.status(201).json(completeHousehold);
    } catch (error) {
      console.error("Error creating household:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create household" });
    }
  });

  // Upload T1 PDF
  app.post("/api/clients/:clientId/t1-upload", upload.single('t1File'), async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      if (isNaN(clientId)) {
        return res.status(400).json({ message: "Invalid client ID" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const client = await storage.getClient(clientId);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }

      // Create T1 return record with both original name and file path
      const t1Return = await storage.createT1Return({
        clientId: clientId,
        taxYear: 2024, // Will be updated after extraction
        fileName: req.file.originalname,
        filePath: req.file.path, // Store the actual file path for reprocessing
        fileSize: req.file.size,
        processingStatus: "processing",
      });

      // Process the PDF in the background
      setTimeout(async () => {
        try {
          const extractedData = await T1PDFParser.extractT1Data(req.file!.path);
          
          // Update T1 return with extracted data
          await storage.updateT1Return(t1Return.id, {
            taxYear: extractedData.taxYear,
            extractedData: extractedData as any,
            processingStatus: "completed",
          });

          // Update client with extracted personal info
          await storage.updateClient(clientId, {
            sin: extractedData.sin,
            dateOfBirth: extractedData.dateOfBirth,
            province: extractedData.province,
          });

          // Create form fields
          const formFields = extractedData.formFields.map(field => ({
            ...field,
            t1ReturnId: t1Return.id,
          }));

          await storage.createT1FormFields(formFields);

          // Don't clean up uploaded file - keep it for reprocessing
          // await T1PDFParser.cleanupFile(req.file!.path);
        } catch (error) {
          console.error("Error processing T1 PDF:", error);
          await storage.updateT1Return(t1Return.id, {
            processingStatus: "failed",
          });
        }
      }, 100);

      res.json({ 
        message: "File uploaded successfully, processing started",
        t1ReturnId: t1Return.id 
      });
    } catch (error) {
      console.error("Error uploading T1 file:", error);
      res.status(500).json({ message: "Failed to upload T1 file" });
    }
  });

  // Upload Multiple T1 PDFs
  app.post("/api/clients/:clientId/t1-upload-multiple", upload.array('t1Files', 10), async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      if (isNaN(clientId)) {
        return res.status(400).json({ message: "Invalid client ID" });
      }

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }

      const client = await storage.getClient(clientId);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }

      // Create T1 return record - we'll combine data from all files
      const t1Return = await storage.createT1Return({
        clientId: clientId,
        taxYear: 2024, // Will be updated after extraction
        fileName: files.map(f => f.originalname).join(', '),
        filePath: files.map(f => f.path).join('|'), // Store multiple paths separated by |
        fileSize: files.reduce((total, file) => total + file.size, 0),
        processingStatus: "processing",
      });

      // Process all PDFs in the background
      setTimeout(async () => {
        try {
          let combinedData: any = null;
          let allFormFields: any[] = [];

          for (const file of files) {
            try {
              const extractedData = await T1PDFParser.extractT1Data(file.path);
              
              // Use the first file's data for personal info, but combine form fields
              if (!combinedData) {
                combinedData = extractedData;
                allFormFields = [...extractedData.formFields];
              } else {
                // Merge form fields from additional files
                for (const newField of extractedData.formFields) {
                  const existingField = allFormFields.find(f => f.fieldCode === newField.fieldCode);
                  if (!existingField) {
                    allFormFields.push(newField);
                  } else if (newField.fieldValue && newField.fieldValue !== '0.00') {
                    // Update existing field if new value is more meaningful
                    existingField.fieldValue = newField.fieldValue;
                  }
                }
              }
            } catch (fileError) {
              console.error(`Error processing file ${file.originalname}:`, fileError);
            }
          }

          if (combinedData) {
            // Update T1 return with combined extracted data
            await storage.updateT1Return(t1Return.id, {
              taxYear: combinedData.taxYear,
              extractedData: { ...combinedData, formFields: allFormFields } as any,
              processingStatus: "completed",
            });

            // Update client with extracted personal info
            await storage.updateClient(clientId, {
              sin: combinedData.sin,
              dateOfBirth: combinedData.dateOfBirth,
              province: combinedData.province,
            });

            // Create form fields
            const formFields = allFormFields.map(field => ({
              ...field,
              t1ReturnId: t1Return.id,
            }));

            await storage.createT1FormFields(formFields);
          } else {
            await storage.updateT1Return(t1Return.id, {
              processingStatus: "failed",
            });
          }
        } catch (error) {
          console.error("Error processing multiple T1 PDFs:", error);
          await storage.updateT1Return(t1Return.id, {
            processingStatus: "failed",
          });
        }
      }, 100);

      res.json({ 
        message: `${files.length} files uploaded successfully, processing started`,
        t1ReturnId: t1Return.id 
      });
    } catch (error) {
      console.error("Error uploading multiple T1 files:", error);
      res.status(500).json({ message: "Failed to upload T1 files" });
    }
  });

  // Get T1 return details
  app.get("/api/t1-returns/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid T1 return ID" });
      }

      const t1Return = await storage.getT1Return(id);
      if (!t1Return) {
        return res.status(404).json({ message: "T1 return not found" });
      }

      res.json(t1Return);
    } catch (error) {
      console.error("Error fetching T1 return:", error);
      res.status(500).json({ message: "Failed to fetch T1 return" });
    }
  });

  // Generate audit report for specific client
  app.post("/api/clients/:clientId/audit-report", async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      if (isNaN(clientId)) {
        return res.status(400).json({ message: "Invalid client ID" });
      }

      const client = await storage.getClient(clientId);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }

      // Get household info
      const household = await storage.getHousehold(client.householdId);
      if (!household) {
        return res.status(404).json({ message: "Household not found" });
      }

      // Get T1 returns for this specific client
      const clientReturns = await storage.getT1ReturnsByClient(clientId);
      const completedReturns = [];
      
      for (const returnRecord of clientReturns) {
        if (returnRecord.processingStatus === 'completed') {
          const fullReturn = await storage.getT1Return(returnRecord.id);
          if (fullReturn && fullReturn.formFields) {
            completedReturns.push(fullReturn);
          }
        }
      }

      if (completedReturns.length === 0) {
        return res.status(400).json({ message: "No completed T1 returns found for this client" });
      }

      // Filter to only include the most recent tax year
      const mostRecentYear = Math.max(...completedReturns.map(t1 => t1.taxYear));
      const t1Returns = completedReturns.filter(t1 => t1.taxYear === mostRecentYear);

      // Create a single-client household for the report
      const singleClientHousehold = {
        ...household,
        clients: [client]
      };

      const reportBuffer = await T1AuditReportGenerator.generateAuditReport(singleClientHousehold, t1Returns);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="audit-report-${client.firstName}-${client.lastName}-${mostRecentYear}.pdf"`);
      res.send(reportBuffer);
    } catch (error) {
      console.error("Error generating client audit report:", error);
      res.status(500).json({ message: "Failed to generate audit report" });
    }
  });

  // Generate audit report for household
  app.post("/api/households/:id/audit-report", async (req, res) => {
    try {
      const householdId = parseInt(req.params.id);
      if (isNaN(householdId)) {
        return res.status(400).json({ message: "Invalid household ID" });
      }

      const household = await storage.getHousehold(householdId);
      if (!household) {
        return res.status(404).json({ message: "Household not found" });
      }

      // Get all T1 returns for clients in this household
      const allT1Returns = [];
      for (const client of household.clients) {
        const clientReturns = await storage.getT1ReturnsByClient(client.id);
        for (const returnRecord of clientReturns) {
          if (returnRecord.processingStatus === 'completed') {
            const fullReturn = await storage.getT1Return(returnRecord.id);
            if (fullReturn && fullReturn.formFields) {
              allT1Returns.push(fullReturn);
            }
          }
        }
      }

      if (allT1Returns.length === 0) {
        return res.status(400).json({ message: "No completed T1 returns found for this household" });
      }

      // Filter to only include the most recent tax year
      const mostRecentYear = Math.max(...allT1Returns.map(t1 => t1.taxYear));
      const t1Returns = allT1Returns.filter(t1 => t1.taxYear === mostRecentYear);

      const reportBuffer = await T1AuditReportGenerator.generateAuditReport(household, t1Returns);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="audit-report-${household.name.replace(/[^a-zA-Z0-9]/g, '-')}.pdf"`);
      res.send(reportBuffer);
    } catch (error) {
      console.error("Error generating audit report:", error);
      res.status(500).json({ message: "Failed to generate audit report" });
    }
  });

  // Delete T1 return
  app.delete("/api/t1-returns/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid T1 return ID" });
      }

      // Check if T1 return exists
      const t1Return = await storage.getT1Return(id);
      if (!t1Return) {
        return res.status(404).json({ message: "T1 return not found" });
      }

      // Delete the T1 return and associated form fields
      await storage.deleteT1Return(id);

      res.json({ message: "T1 return deleted successfully" });
    } catch (error) {
      console.error("Error deleting T1 return:", error);
      res.status(500).json({ message: "Failed to delete T1 return" });
    }
  });

  // Reprocess T1 return
  app.post("/api/t1-returns/:id/reprocess", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid T1 return ID" });
      }

      // Check if T1 return exists
      const t1Return = await storage.getT1Return(id);
      if (!t1Return) {
        return res.status(404).json({ message: "T1 return not found" });
      }

      // Update status to processing
      await storage.updateT1Return(id, { processingStatus: "processing" });

      // Start reprocessing in background
      setTimeout(async () => {
        try {
          console.log(`Starting reprocessing for T1 return ${id}`);
          
          // Handle multiple file paths (separated by |) or single file path
          const filePaths = t1Return.filePath ? t1Return.filePath.split('|') : [path.resolve('uploads', t1Return.fileName)];
          
          let combinedData: any = null;
          let allFormFields: any[] = [];

          // Process each PDF file
          for (const filePath of filePaths) {
            try {
              console.log(`Processing file: ${filePath}`);
              const extractedData = await T1PDFParser.extractT1Data(filePath);
              
              // Use the first file's data for personal info, but combine form fields
              if (!combinedData) {
                combinedData = extractedData;
                allFormFields = [...extractedData.formFields];
              } else {
                // Merge form fields from additional files
                for (const newField of extractedData.formFields) {
                  const existingField = allFormFields.find(f => f.fieldCode === newField.fieldCode);
                  if (!existingField) {
                    allFormFields.push(newField);
                  } else if (newField.fieldValue && newField.fieldValue !== '0.00') {
                    // Update existing field if new value is more meaningful
                    existingField.fieldValue = newField.fieldValue;
                  }
                }
              }
            } catch (fileError) {
              console.error(`Error processing file ${filePath}:`, fileError);
            }
          }

          console.log(`Extracted ${allFormFields?.length || 0} combined form fields from ${filePaths.length} files`);
          
          // Delete existing form fields for this T1 return
          await db.delete(t1FormFields).where(eq(t1FormFields.t1ReturnId, id));
          console.log(`Deleted existing form fields for T1 return ${id}`);
          
          // Insert new combined form fields
          if (allFormFields && allFormFields.length > 0) {
            const fieldsWithT1ReturnId = allFormFields.map(field => ({
              ...field,
              t1ReturnId: id
            }));
            console.log(`Inserting ${fieldsWithT1ReturnId.length} form fields`);
            await storage.createT1FormFields(fieldsWithT1ReturnId);
            console.log(`Successfully inserted form fields`);
          } else {
            console.log(`No form fields to insert`);
          }

          // Update T1 return with new extracted data and mark as completed
          if (combinedData) {
            await storage.updateT1Return(id, {
              processingStatus: "completed",
              taxYear: combinedData.taxYear,
              extractedData: { ...combinedData, formFields: allFormFields } as any,
            });
          } else {
            await storage.updateT1Return(id, {
              processingStatus: "failed"
            });
          }

          console.log(`Reprocessing completed for T1 return ${id}`);
        } catch (error) {
          console.error(`Error reprocessing T1 return ${id}:`, error);
          await storage.updateT1Return(id, { processingStatus: "failed" });
        }
      }, 100);

      res.json({ message: "T1 return reprocessing started" });
    } catch (error) {
      console.error("Error starting T1 reprocessing:", error);
      res.status(500).json({ message: "Failed to start T1 reprocessing" });
    }
  });

  // Update household
  app.patch("/api/households/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid household ID" });
      }

      const updateData = z.object({
        name: z.string().min(1, "Household name is required"),
      }).parse(req.body);

      const updatedHousehold = await storage.updateHousehold(id, updateData);
      if (!updatedHousehold) {
        return res.status(404).json({ message: "Household not found" });
      }

      res.json(updatedHousehold);
    } catch (error) {
      console.error("Error updating household:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update household" });
    }
  });

  // Create client
  app.post("/api/clients", async (req, res) => {
    try {
      const clientData = insertClientSchema.parse(req.body);
      const client = await storage.createClient(clientData);
      res.status(201).json(client);
    } catch (error) {
      console.error("Error creating client:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create client" });
    }
  });

  // Update client
  app.patch("/api/clients/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid client ID" });
      }

      const updateData = z.object({
        firstName: z.string().min(1, "First name is required"),
        lastName: z.string().min(1, "Last name is required"),
      }).parse(req.body);

      const updatedClient = await storage.updateClient(id, updateData);
      if (!updatedClient) {
        return res.status(404).json({ message: "Client not found" });
      }

      res.json(updatedClient);
    } catch (error) {
      console.error("Error updating client:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update client" });
    }
  });

  // Delete client
  app.delete("/api/clients/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid client ID" });
      }

      const client = await storage.getClient(id);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }

      await storage.deleteClient(id);
      res.json({ message: "Client deleted successfully" });
    } catch (error) {
      console.error("Error deleting client:", error);
      res.status(500).json({ message: "Failed to delete client" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
