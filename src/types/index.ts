export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'EMPLOYEE';
  department?: string;
  position?: string;
  shiftType?: 'DAY' | 'NIGHT';
  profileImage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Attendance {
  id: string;
  userId: string;
  user?: User;
  date: Date;
  amIn: Date | null;
  amOut: Date | null;
  pmIn: Date | null;
  pmOut: Date | null;
  nightIn: Date | null;
  nightOut: Date | null;
  shiftType: 'DAY' | 'NIGHT';
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
