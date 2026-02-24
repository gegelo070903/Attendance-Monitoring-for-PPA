import { Server } from "socket.io";

let io: Server | null = null;

export function getIO(server: any) {
  if (!io) {
    io = new Server(server, {
      path: "/api/socket_io",
      addTrailingSlash: false,
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    });
  }
  return io;
}

export function emitAttendanceUpdate(data: any) {
  if (io) {
    io.emit("attendance-update", data);
  }
}

export function emitActivityLogUpdate(log: any) {
  if (io) {
    io.emit("activity-log-update", log);
  }
}
