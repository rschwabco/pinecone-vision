import * as dotenv from "dotenv";
dotenv.config();

const inferenceEndpointUrl = process.env.INFERENCE_ENDPOINT;
const inferenceEndpointToken = process.env.INFERENCE_ENDPOINT_TOKEN;

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

export { getEmbeddings };
