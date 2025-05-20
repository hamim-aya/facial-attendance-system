import os
import cv2
import numpy as np
from keras_facenet import FaceNet

embedder = FaceNet()

def load_dataset(path):
    embeddings, names = [], []
    for person in os.listdir(path):
        person_dir = os.path.join(path, person)
        for img_name in os.listdir(person_dir):
            img_path = os.path.join(person_dir, img_name)
            img = cv2.imread(img_path)
            rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            embedding = embedder.embeddings([rgb])[0]
            embeddings.append(embedding)
            names.append(person)
    return np.array(embeddings), np.array(names)
