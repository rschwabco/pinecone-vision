import * as dotenv from "dotenv";
import express from "express";
import http from "http";
import bodyParser from "body-parser";
import handler from "./handler.js";

dotenv.config();
const port = process.env.PORT;

const app = express();
app.use(bodyParser.json());

const server = http.createServer(app);

app.get("/api/health", async (_, res) => {
  res.send("ok");
});

app.post("/api/image", handler);

// Start the HTTP server
server.listen(port, () => console.log(`Listening on port ${port}`));
