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
  project?: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  // Extra fields added in SmartTask update
  subtasks?: { id: string; title: string; completed: boolean }[];
  estimatedTime?: number; // hours
  notes?: string;
  // Category-specific properties
  amount?: number;
  paymentStatus?: 'pending' | 'paid';
  recurringBill?: boolean;
  habitType?: string;
  streak?: number;
  shoppingQuantity?: number;
  shoppingStore?: string;
  shoppingCost?: number;
  subject?: string;
  studyDuration?: number;
  resourceLink?: string;
  dependency?: string;
  estimatedEffort?: string;
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
