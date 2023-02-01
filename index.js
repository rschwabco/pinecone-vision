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
const indexName = "vision";

// Initialize the Pinecone client
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

const saveEmbedding = async ({ id, values, metadata, namespace }) => {
  const index = pineconeClient.Index(indexName);
  const upsertRequest = {
    vectors: [
      {
        id,
        values,
        metadata,
      },
    ],
    namespace,
  };
  try {
    const response = await index.upsert(upsertRequest);
    return response?.data;
  } catch (e) {
    console.log("failed", e.response.data);
  }
};

const queryEmbedding = async ({ values, namespace }) => {
  const index = pineconeClient.Index(indexName);
  const queryRequest = {
    topK: 1,
    vector: values,
    includeMetadata: true,
    namespace,
  };
  try {
    const response = await index.query(queryRequest);
    console.log(response.data);
    const metadata = response.data?.matches[0]?.metadata;
    return metadata?.label || "unknown";
  } catch (e) {
    console.log("failed", e.response.data);
  }
};

const handleEmbedding = async ({
  id,
  embeddings,
  text,
  label,
  stage,
  user,
}) => {
  if (stage === "training") {
    return await saveEmbedding({
      id,
      values: embeddings,
      namespace: user,
      metadata: { keywords: text, label },
    });
  } else if (stage === "querying") {
    return await queryEmbedding({
      values: embeddings,
      namespace: user,
    });
  }
};

app.get("/api/health", async (req, res) => {
  res.send("ok");
});

app.post("/api/image", async (req, res) => {
  const data = req.body;
  const { data: imageData, uri, label, stage, user } = data;
  const text = ["room"];

  const imageName = `${label}-${crypto
    .createHash("md5")
    .update(uri)
    .digest("hex")}`;

  const userHash = crypto.createHash("md5").update(user).digest("hex");
  console.log(userHash);
  try {
    const embeddings = await getEmbeddings(imageData, text);
    const result = await handleEmbedding({
      id: imageName,
      embeddings,
      text,
      label,
      stage,
      user: userHash,
    });
    if (stage === "querying") {
      res.json({
        label: result,
      });
    } else {
      res.json({
        message: "training",
      });
    }
  } catch (e) {
    console.log("Failed handling embedding", e);
  }
});

const port = 8080;
// Start the HTTP server
async function main() {
  await pineconeClient.init({
    apiKey: process.env.PINECONE_API_KEY,
    environment: process.env.PINECONE_ENVIRONMENT,
  });

  server.listen(port, () => console.log(`Listening on port ${port}`));
}

main();
