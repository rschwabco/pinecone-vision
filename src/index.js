import * as dotenv from "dotenv";
import express from "express";
import http from "http";
import bodyParser from "body-parser";
import { image, deleteUser } from "./handlers.js";

dotenv.config();
const port = process.env.PORT;

const app = express();
app.use(bodyParser.json());

const server = http.createServer(app);

app.get("/api/health", async (_, res) => {
  res.send("ok");
});

app.post("/api/image", image);

app.delete("/api/user", deleteUser);

// Start the HTTP server
server.listen(port, () => console.log(`Listening on port ${port}`));
