import { apiRequest } from "./queryClient";
import { HouseholdWithClients, T1ReturnWithFields, Child, InsertChild } from "@shared/schema";

export interface CreateHouseholdRequest {
  client1: {
    firstName: string;
    lastName: string;
    disabled: boolean;
    americanTaxpayer: boolean;
  };
  client2?: {
    firstName: string;
    lastName: string;
    disabled: boolean;
    americanTaxpayer: boolean;
  };
}

export class HouseholdAPI {
  static async getHouseholds(): Promise<HouseholdWithClients[]> {
    const response = await apiRequest("GET", "/api/households");
    return response.json();
  }

  static async getHousehold(id: number): Promise<HouseholdWithClients> {
    const response = await apiRequest("GET", `/api/households/${id}`);
    return response.json();
  }

  static async createHousehold(data: CreateHouseholdRequest): Promise<HouseholdWithClients> {
    const response = await apiRequest("POST", "/api/households", data);
    return response.json();
  }

  static async generateAuditReport(householdId: number): Promise<Blob> {
    const response = await apiRequest("POST", `/api/households/${householdId}/audit-report`);
    return response.blob();
  }

  static async generateClientAuditReport(clientId: number): Promise<Blob> {
    const response = await apiRequest("POST", `/api/clients/${clientId}/audit-report`);
    return response.blob();
  }

  static async updateHousehold(id: number, data: { name: string }): Promise<void> {
    await apiRequest("PATCH", `/api/households/${id}`, data);
  }

  static async archiveHousehold(id: number): Promise<void> {
    await apiRequest("PUT", `/api/households/${id}/archive`);
  }

  static async createClient(data: { householdId: number; firstName: string; lastName: string; isPrimary: boolean; disabled: boolean }): Promise<void> {
    await apiRequest("POST", "/api/clients", data);
  }

  static async updateClient(id: number, data: { firstName: string; lastName: string; disabled: boolean }): Promise<void> {
    await apiRequest("PATCH", `/api/clients/${id}`, data);
  }

  static async deleteClient(id: number): Promise<void> {
    await apiRequest("DELETE", `/api/clients/${id}`);
  }
}

export class T1API {
  static async uploadT1File(clientId: number, file: File): Promise<{ message: string; t1ReturnId: number }> {
    const formData = new FormData();
    formData.append('t1File', file);

    const response = await fetch(`/api/clients/${clientId}/t1-upload`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Upload failed');
    }

    return response.json();
  }

  static async uploadT1Files(clientId: number, files: File[]): Promise<{ message: string; t1ReturnId: number }> {
    const formData = new FormData();
    files.forEach((file, index) => {
      formData.append('t1Files', file);
    });

    const response = await fetch(`/api/clients/${clientId}/t1-upload-multiple`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Upload failed');
    }

    return response.json();
  }

  static async getT1Return(id: number): Promise<T1ReturnWithFields> {
    const response = await apiRequest("GET", `/api/t1-returns/${id}`);
    return response.json();
  }

  static async deleteT1Return(id: number): Promise<void> {
    await apiRequest("DELETE", `/api/t1-returns/${id}`);
  }

  static async reprocessT1Return(id: number): Promise<void> {
    await apiRequest("POST", `/api/t1-returns/${id}/reprocess`);
  }

  static async updateT1FormField(data: { fieldCode: string; fieldValue: string; t1ReturnId: number }): Promise<void> {
    await apiRequest("PATCH", `/api/t1-form-fields`, data);
  }

  static async createT1FormField(data: { fieldCode: string; fieldValue: string; t1ReturnId: number; fieldName?: string; fieldType?: string }): Promise<void> {
    await apiRequest("POST", `/api/t1-form-fields`, data);
  }
}

export class ChildrenAPI {
  static async createChild(data: InsertChild): Promise<Child> {
    const response = await apiRequest("POST", "/api/children", data);
    return response.json();
  }

  static async updateChild(id: number, data: Partial<InsertChild>): Promise<Child> {
    const response = await apiRequest("PUT", `/api/children/${id}`, data);
    return response.json();
  }

  static async deleteChild(id: number): Promise<void> {
    await apiRequest("DELETE", `/api/children/${id}`);
  }

  static async uploadT1File(childId: number, file: File): Promise<{ message: string; t1ReturnId: number }> {
    const formData = new FormData();
    formData.append('t1File', file);

    const response = await fetch(`/api/children/${childId}/t1-upload`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Upload failed');
    }

    return response.json();
  }

  static async uploadT1Files(childId: number, files: File[]): Promise<{ message: string; t1ReturnId: number }> {
    const formData = new FormData();
    files.forEach((file, index) => {
      formData.append('t1Files', file);
    });

    const response = await fetch(`/api/children/${childId}/t1-upload-multiple`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Upload failed');
    }

    return response.json();
  }
}
