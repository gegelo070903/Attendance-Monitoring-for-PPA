export const ATTENDANCE_QR_STYLE = {
  margin: 3,
  errorCorrectionLevel: "M" as const,
  color: {
    dark: "#000000",
    light: "#ffffff",
  },
};

export function getAttendanceQrPayload(email: string): string {
  return email.trim();
}
