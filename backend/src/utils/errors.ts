/**
 * Custom error classes for consistent API error responses
 */

export class AppError extends Error {
  public statusCode: number;
  public code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(`${resource} with id '${id}' not found`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends AppError {
  public details: any[];

  constructor(message: string, details: any[] = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
    this.details = details;
  }
}

export class InsufficientBalanceError extends AppError {
  constructor(accountId: string, balance: string, amount: string) {
    super(
      `Insufficient balance: account '${accountId}' has KES ${balance} but tried to transfer KES ${amount}`,
      422,
      'INSUFFICIENT_BALANCE'
    );
    this.name = 'InsufficientBalanceError';
  }
}

export class SameAccountError extends AppError {
  constructor() {
    super('Cannot transfer to the same account', 400, 'SAME_ACCOUNT');
    this.name = 'SameAccountError';
  }
}
