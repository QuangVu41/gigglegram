import { format } from 'date-fns';

/**
 * Formats a date to "MMMM dd, yyyy" format (e.g., "January 04, 2026")
 * @param date - The date to format (Date object, timestamp, or date string)
 * @returns Formatted date string
 */
export function formatDateWithLocale(date: Date | number | string): string {
  const dateObj =
    typeof date === 'string' || typeof date === 'number'
      ? new Date(date)
      : date;
  return format(dateObj, 'MMMM dd, yyyy');
}

export function getCurrentDateWithHCMTimezone(date: Date): Date {
  return new Date(
    date.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
  );
}
