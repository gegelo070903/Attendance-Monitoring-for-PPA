import { Server } from "socket.io";
import { NextRequest } from "next/server";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function handler(req: NextRequest, res: any) {
  const server = (res.socket as any).server;
  if (!server.io) {
    const io = new Server(server, {
      path: "/api/socket_io",
      addTrailingSlash: false,
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    });
    server.io = io;
    io.on("connection", (socket) => {
      socket.on("attendance-update", (data) => {
        socket.broadcast.emit("attendance-update", data);
      });
    });
  }
  res.end();
}
