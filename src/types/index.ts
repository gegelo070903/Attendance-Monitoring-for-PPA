export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'EMPLOYEE';
  department?: string;
  position?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Attendance {
  id: string;
  userId: string;
  user?: User;
  date: Date;
  checkIn: Date | null;
  checkOut: Date | null;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY';
  workHours: number | null;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AttendanceStats {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  halfDays: number;
  totalWorkHours: number;
  averageWorkHours: number;
}

export interface DashboardStats {
  todayPresent: number;
  todayAbsent: number;
  todayLate: number;
  totalEmployees: number;
}
