import numpy as np
from transformers import CLIPProcessor, CLIPModel
from PIL import Image
import socket
import json
import os
import atexit

s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)

# Load Pinecone API key


# get local machine name
host = '127.0.0.1'

port = 3333

# bind to the port
s.bind((host, port))
s.settimeout(10000)

# queue up to 5 requests
s.listen(5)


def close_program():
    client_socket.close()
    s.close()

atexit.register(close_program)

# Load Pinecone API key
import os
model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")

def process_image(image_path, words):
  image = Image.open(image_path)
  inputs = processor(text=words, images=image, return_tensors="pt", padding=True)
  outputs = model(**inputs)
  logits_per_image = outputs.logits_per_image  # this is the image-text similarity score
  # probs = logits_per_image.softmax(dim=1)  # we can take the softmax to get the label probabilities
  embeddings = outputs.image_embeds.detach().numpy().flatten().tolist()
  # text_embeddings = outputs.text_embeds.detach().numpy().flatten().tolist()
  return embeddings


while True:
    # establish a connection
    client_socket, addr = s.accept()
    client_socket.settimeout(100)
    print("Got a connection from %s" % str(addr))
    while True:
        data = client_socket.recv(1024)
        if not data:
            break
        print("DATA", data)
        try:
          json_data = json.loads(data.decode())
          text = json_data['text']
          image = json_data['image']
          id = json_data['id']
          label = json_data['label']
          stage = json_data['stage']
          print("Received: " + json.dumps(json_data))
          if (len(text) > 0 and image):
              embeddings = process_image(json_data['image'], json_data['text'])
              client_socket.send(json.dumps({
                  "embeddings": embeddings,
                  "id": id,
                  "text": text,
                  "label": label,
                  "stage": stage
              }).encode())
              print("Sent result")
          else:
              client_socket.send("No data received".encode())
              print("No result")
        except:
          # client_socket.send("Error".encode())
          print("Error")
    client_socket.close()