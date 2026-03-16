/**
 * Format a number as KES currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a date string to a readable format
 */
export function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('en-KE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString));
}

/**
 * Format a date string to a short format
 */
export function formatDateShort(dateString: string): string {
  return new Intl.DateTimeFormat('en-KE', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(dateString));
}
