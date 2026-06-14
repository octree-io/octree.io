import { createApp } from "./app.js";
import { env } from "./config.js";

const app = createApp();

app.listen(env.port, () => {
  console.log(`octree api listening on http://localhost:${env.port}`);
});
