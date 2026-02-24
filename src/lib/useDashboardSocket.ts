import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function useDashboardSocket(onUpdate: () => void) {
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      socket = io({
        path: "/api/socket_io",
        transports: ["websocket"],
      });
      initialized.current = true;
    }
    if (socket) {
      socket.on("attendance-update", onUpdate);
    }
    return () => {
      if (socket) {
        socket.off("attendance-update", onUpdate);
      }
    };
  }, [onUpdate]);

  return socket;
}
