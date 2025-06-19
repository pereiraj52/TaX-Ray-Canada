import { 
  households, 
  clients, 
  t1Returns, 
  t1FormFields,
  type Household, 
  type Client, 
  type T1Return,
  type T1FormField,
  type InsertHousehold, 
  type InsertClient,
  type InsertT1Return,
  type InsertT1FormField,
  type HouseholdWithClients,
  type ClientWithT1Returns,
  type T1ReturnWithFields
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Household operations
  getHouseholds(): Promise<HouseholdWithClients[]>;
  getHousehold(id: number): Promise<HouseholdWithClients | undefined>;
  createHousehold(household: InsertHousehold): Promise<Household>;
  
  // Client operations
  getClient(id: number): Promise<ClientWithT1Returns | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, updates: Partial<InsertClient>): Promise<Client | undefined>;
  
  // T1 Return operations
  getT1Return(id: number): Promise<T1ReturnWithFields | undefined>;
  getT1ReturnsByClient(clientId: number): Promise<T1Return[]>;
  createT1Return(t1Return: InsertT1Return): Promise<T1Return>;
  updateT1Return(id: number, updates: Partial<InsertT1Return>): Promise<T1Return | undefined>;
  
  // T1 Form Field operations
  createT1FormField(field: InsertT1FormField): Promise<T1FormField>;
  createT1FormFields(fields: InsertT1FormField[]): Promise<T1FormField[]>;
  getT1FormFieldsByReturn(t1ReturnId: number): Promise<T1FormField[]>;
}

export class DatabaseStorage implements IStorage {
  async getHouseholds(): Promise<HouseholdWithClients[]> {
    const result = await db.query.households.findMany({
      with: {
        clients: {
          orderBy: [desc(clients.isPrimary), clients.firstName],
        },
      },
      orderBy: [desc(households.createdAt)],
    });
    return result as HouseholdWithClients[];
  }

  async getHousehold(id: number): Promise<HouseholdWithClients | undefined> {
    const result = await db.query.households.findFirst({
      where: eq(households.id, id),
      with: {
        clients: {
          with: {
            t1Returns: {
              orderBy: [desc(t1Returns.taxYear)],
            },
          },
          orderBy: [desc(clients.isPrimary), clients.firstName],
        },
      },
    });
    return result as HouseholdWithClients | undefined;
  }

  async createHousehold(household: InsertHousehold): Promise<Household> {
    const [result] = await db
      .insert(households)
      .values(household)
      .returning();
    return result;
  }

  async getClient(id: number): Promise<ClientWithT1Returns | undefined> {
    const result = await db.query.clients.findFirst({
      where: eq(clients.id, id),
      with: {
        t1Returns: {
          orderBy: [desc(t1Returns.taxYear)],
        },
      },
    });
    return result as ClientWithT1Returns | undefined;
  }

  async createClient(client: InsertClient): Promise<Client> {
    const [result] = await db
      .insert(clients)
      .values(client)
      .returning();
    return result;
  }

  async updateClient(id: number, updates: Partial<InsertClient>): Promise<Client | undefined> {
    const [result] = await db
      .update(clients)
      .set(updates)
      .where(eq(clients.id, id))
      .returning();
    return result || undefined;
  }

  async getT1Return(id: number): Promise<T1ReturnWithFields | undefined> {
    const result = await db.query.t1Returns.findFirst({
      where: eq(t1Returns.id, id),
      with: {
        formFields: true,
        client: true,
      },
    });
    return result as T1ReturnWithFields | undefined;
  }

  async getT1ReturnsByClient(clientId: number): Promise<T1Return[]> {
    return await db.select().from(t1Returns).where(eq(t1Returns.clientId, clientId));
  }

  async createT1Return(t1Return: InsertT1Return): Promise<T1Return> {
    const [result] = await db
      .insert(t1Returns)
      .values(t1Return)
      .returning();
    return result;
  }

  async updateT1Return(id: number, updates: Partial<InsertT1Return>): Promise<T1Return | undefined> {
    const [result] = await db
      .update(t1Returns)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(t1Returns.id, id))
      .returning();
    return result || undefined;
  }

  async createT1FormField(field: InsertT1FormField): Promise<T1FormField> {
    const [result] = await db
      .insert(t1FormFields)
      .values(field)
      .returning();
    return result;
  }

  async createT1FormFields(fields: InsertT1FormField[]): Promise<T1FormField[]> {
    if (fields.length === 0) return [];
    return await db
      .insert(t1FormFields)
      .values(fields)
      .returning();
  }

  async getT1FormFieldsByReturn(t1ReturnId: number): Promise<T1FormField[]> {
    return await db.select().from(t1FormFields).where(eq(t1FormFields.t1ReturnId, t1ReturnId));
  }
}

export const storage = new DatabaseStorage();
