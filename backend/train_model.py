from sklearn.neighbors import KNeighborsClassifier
from sklearn.preprocessing import LabelEncoder
import numpy as np
import joblib
from utils import load_dataset

# Load dataset
X, y = load_dataset('../dataset')

# Encode string labels to integers
label_encoder = LabelEncoder()
y_encoded = label_encoder.fit_transform(y)

# Train model

model = KNeighborsClassifier(n_neighbors=2)
model.fit(X, y_encoded)

# Save model and encodings
joblib.dump(model, 'model_knn.pkl')
joblib.dump(label_encoder, 'label_encoder.pkl')  # Save the label encoder
np.save('../embeddings/embeddings.npy', X)
np.save('../embeddings/labels.npy', y_encoded)

print(" Model and encoder trained and saved!")
