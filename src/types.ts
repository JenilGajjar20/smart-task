import { Timestamp } from 'firebase/firestore';

export type Priority = 'low' | 'medium' | 'high';

export type Category = 'Work' | 'Personal' | 'Education' | 'Health' | 'Shopping' | 'Finance' | 'Other';

export type RecurrenceFrequency = 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';
export type RecurrenceUnit = 'days' | 'weeks' | 'months';

export interface RecurrenceSettings {
  frequency: RecurrenceFrequency;
  interval?: number;
  unit?: RecurrenceUnit;
}

export interface Task {
  id: string; // Document ID
  userId: string;
  title: string;
  description?: string;
  priority: Priority;
  category: Category;
  completed: boolean;
  dueDate: Timestamp;
  reminderTime?: Timestamp | null;
  recurrence?: RecurrenceSettings | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}
