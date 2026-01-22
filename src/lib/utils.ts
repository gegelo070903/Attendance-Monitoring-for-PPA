import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, differenceInMinutes, parseISO } from 'date-fns';

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'MMM dd, yyyy');
}

export function formatTime(date: Date | string | null): string {
  if (!date) return '--:--';
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'hh:mm a');
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'MMM dd, yyyy hh:mm a');
}

export function getDateRange(period: 'day' | 'week' | 'month', date: Date = new Date()) {
  switch (period) {
    case 'day':
      return { start: startOfDay(date), end: endOfDay(date) };
    case 'week':
      return { start: startOfWeek(date, { weekStartsOn: 1 }), end: endOfWeek(date, { weekStartsOn: 1 }) };
    case 'month':
      return { start: startOfMonth(date), end: endOfMonth(date) };
  }
}

export function calculateWorkHours(checkIn: Date | null, checkOut: Date | null): number {
  if (!checkIn || !checkOut) return 0;
  const minutes = differenceInMinutes(checkOut, checkIn);
  return Math.round((minutes / 60) * 100) / 100; // Round to 2 decimal places
}

export function getAttendanceStatus(checkInTime: Date | null, workStartTime: string, lateThreshold: number): string {
  if (!checkInTime) return 'ABSENT';
  
  const [hours, minutes] = workStartTime.split(':').map(Number);
  const workStart = new Date(checkInTime);
  workStart.setHours(hours, minutes, 0, 0);
  
  const diffMinutes = differenceInMinutes(checkInTime, workStart);
  
  if (diffMinutes <= 0) return 'PRESENT';
  if (diffMinutes <= lateThreshold) return 'PRESENT';
  if (diffMinutes <= 120) return 'LATE';
  return 'HALF_DAY';
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'PRESENT':
      return 'bg-green-100 text-green-800';
    case 'LATE':
      return 'bg-yellow-100 text-yellow-800';
    case 'HALF_DAY':
      return 'bg-orange-100 text-orange-800';
    case 'ABSENT':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}
