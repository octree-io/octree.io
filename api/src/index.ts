import { createServer } from "node:http";
import { createApp } from "./app.js";
import { createRealtime } from "./realtime/index.js";
import { env } from "./config.js";

const app = createApp();
const httpServer = createServer(app);

// Socket.IO shares the same HTTP server as the REST API.
createRealtime(httpServer);

httpServer.listen(env.port, () => {
  console.log(`octree api listening on http://localhost:${env.port}`);
  console.log(`socket.io ready on ws://localhost:${env.port}`);
});
