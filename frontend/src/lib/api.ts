// ─── Types ────────────────────────────────────────────

export interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  type: 'DEPOSIT' | 'TRANSFER';
  amount: number;
  description: string;
  fromAccountId: string | null;
  fromAccountName: string | null;
  toAccountId: string | null;
  toAccountName: string | null;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  count?: number;
  pagination?: {
    total: number;
    limit: number;
    offset: number;
  };
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: { field: string; message: string }[];
  };
}

// ─── API Client ────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

async function request<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  const data = await res.json();

  if (!res.ok) {
    throw data;
  }

  return data;
}

// ─── Account Endpoints ─────────────────────────────────

export async function getAccounts(): Promise<ApiResponse<Account[]>> {
  return request('/accounts');
}

export async function getAccount(id: string): Promise<ApiResponse<Account>> {
  return request(`/accounts/${id}`);
}

export async function createAccount(name: string, type: string): Promise<ApiResponse<Account>> {
  return request('/accounts', {
    method: 'POST',
    body: JSON.stringify({ name, type }),
  });
}

// ─── Transaction Endpoints ──────────────────────────────

export async function deposit(
  accountId: string,
  amount: number,
  description?: string
): Promise<ApiResponse<{ transaction: Transaction; account: Account }>> {
  return request(`/accounts/${accountId}/deposit`, {
    method: 'POST',
    body: JSON.stringify({ amount, description }),
  });
}

export async function transfer(data: {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  description?: string;
}): Promise<ApiResponse<{ transaction: Transaction; sender: Account; receiver: Account }>> {
  return request('/transfers', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getTransactions(params?: {
  type?: 'DEPOSIT' | 'TRANSFER';
  accountId?: string;
  limit?: number;
  offset?: number;
}): Promise<ApiResponse<Transaction[]>> {
  const searchParams = new URLSearchParams();
  if (params?.type) searchParams.set('type', params.type);
  if (params?.accountId) searchParams.set('accountId', params.accountId);
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.offset) searchParams.set('offset', params.offset.toString());

  const query = searchParams.toString();
  return request(`/transactions${query ? `?${query}` : ''}`);
}
