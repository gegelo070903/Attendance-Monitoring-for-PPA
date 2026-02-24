import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function useActivityLogSocket(onUpdate: (log: any) => void) {
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
      socket.on("activity-log-update", onUpdate);
    }
    return () => {
      if (socket) {
        socket.off("activity-log-update", onUpdate);
      }
    };
  }, [onUpdate]);

  return socket;
}
