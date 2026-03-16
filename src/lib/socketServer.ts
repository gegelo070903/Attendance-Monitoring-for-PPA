import { Server } from "socket.io";

type GlobalWithIO = typeof globalThis & {
  __io?: Server;
};

function getGlobalIO() {
  return (globalThis as GlobalWithIO).__io ?? null;
}

export function setIO(io: Server) {
  (globalThis as GlobalWithIO).__io = io;
  return io;
}

export function getIO() {
  return getGlobalIO();
}

export function emitAttendanceUpdate(data: any) {
  const io = getGlobalIO();
  if (io) {
    io.emit("attendance-update", data);
  }
}

export function emitActivityLogUpdate(log: any) {
  const io = getGlobalIO();
  if (io) {
    io.emit("activity-log-update", log);
  }
}
