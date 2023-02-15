import crypto from "crypto";
import { saveEmbedding, queryEmbedding } from "./pinecone";
import { getEmbeddings } from "./huggingFace";

const md5 = (str) => crypto.createHash("md5").update(str).digest("hex");

const handleEmbedding = async ({
  id,
  embeddings,
  text,
  label,
  stage,
  user,
}) => {
  switch (stage) {
    case "training":
      return await saveEmbedding({
        id,
        values: embeddings,
        namespace: user,
        metadata: { keywords: text, label },
      });
    case "detecting":
      return await queryEmbedding({
        values: embeddings,
        namespace: user,
      });
  }
};

const handler = async (req, res) => {
  const data = req.body;
  const { data: imageData, uri, label, stage, user } = data;
  const id = `${label}-${md5(uri)}`;
  const userHash = md5(user);

  try {
    const embeddings = await getEmbeddings(imageData, [label]);
    const result = await handleEmbedding({
      id,
      embeddings,
      text,
      label,
      stage,
      user: userHash,
    });
    res.json(result);
  } catch (e) {
    const message = `Failed handling embedding: ${e}`;
    console.log(message, e);
    res.status(500).json({ message });
  }
}

export default handler