import express from "express";
import { Server } from "socket.io";
import http from "http";
import crypto from "crypto";
import * as dotenv from "dotenv";
import { PineconeClient } from "@pinecone-database/pinecone";
import bodyParser from "body-parser";
dotenv.config();

const inferenceEndpointUrl = process.env.INFERENCE_ENDPOINT;
const inferenceEndpointToken = process.env.INFERENCE_ENDPOINT_TOKEN;

const app = express();
app.use(bodyParser.json());

const server = http.createServer(app);
const pineconeClient = new PineconeClient();

// Initialize the Pinecone client
await pineconeClient.init({
  apiKey: process.env.PINECONE_API_KEY,
  environment: process.env.PINECONE_ENVIRONMENT,
});

const index = pineconeClient.Index("room");

const getEmbeddings = async (imageBase64, words) => {
  const data = {
    inputs: {
      image: imageBase64,
      words,
    },
  };
  try {
    const response = await fetch(inferenceEndpointUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${inferenceEndpointToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const json = await response.json();
    return json.embeddings;
  } catch (e) {
    console.log(e);
  }
};

const saveEmbedding = async ({ id, values, metadata }) => {
  const upsertRequest = {
    vectors: [
      {
        id,
        values,
        metadata,
      },
    ],
  };
  try {
    const response = await index.upsert(upsertRequest);
    return response;
  } catch (e) {
    console.log("failed", e.response.data);
  }
};

const queryEmbedding = async ({ values }) => {
  const queryRequest = {
    topK: 1,
    vector: values,
    includeMetadata: true,
  };
  try {
    const response = await index.query(queryRequest);
    // console.log(response.data.matches[0].metadata);
    const metadata = response.data?.matches[0]?.metadata;
    // channel.publish("detectedLabel", metadata?.label || "unknown");
    return metadata?.label || "unknown";
  } catch (e) {
    console.log("failed", e.response.data);
  }
};

const handleEmbedding = async (data) => {
  const { id, embeddings, text, label, stage } = data;

  if (stage === "training") {
    console.log("training...");
    return await saveEmbedding({
      id,
      values: embeddings,
      metadata: { keywords: text, label },
    });
  } else if (stage === "querying") {
    console.log("querying...");
    return await queryEmbedding({
      values: embeddings,
    });
  }
};

app.get("/api/health", async (req, res) => {
  res.send("ok");
});

app.post("/api/image", async (req, res) => {
  const data = req.body;
  const { data: imageData, width, height, uri, label, stage } = data;
  const imgBuffer = Buffer.from(imageData, "base64");
  console.log(Buffer.byteLength(imgBuffer));

  const imageName = `${label}-${crypto
    .createHash("md5")
    .update(uri)
    .digest("hex")}`;

  const embeddings = await getEmbeddings(imageData, ["room"]);

  const result = await handleEmbedding({
    id: imageName,
    embeddings,
    text: ["room"],
    label,
    stage,
  });

  res.json({
    label: result,
  });
});
const port = 8080;
// Start the HTTP server
server.listen(port, () => console.log(`Listening on port ${port}`));
