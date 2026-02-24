import { Server } from "socket.io";
import type { NextApiRequest } from "next";
import type { Server as HTTPServer } from "http";
import type { Socket as NetSocket } from "net";
import type { NextApiResponse } from "next";

export const config = {
  api: {
    bodyParser: false,
  },
};
