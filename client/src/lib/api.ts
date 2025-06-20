import { apiRequest } from "./queryClient";
import { HouseholdWithClients, T1ReturnWithFields } from "@shared/schema";

export interface CreateHouseholdRequest {
  client1: {
    firstName: string;
    lastName: string;
  };
  client2?: {
    firstName: string;
    lastName: string;
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
}
