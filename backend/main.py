from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import cv2
import numpy as np
from keras_facenet import FaceNet
import joblib
import datetime
import logging
from typing import Set, List, Dict
import os
from fastapi.responses import StreamingResponse
import io
import csv

# Configuration du logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialisation de l'application
app = FastAPI(
    title="Attendance System Konosys 2030",
    description="Système de gestion de présence par reconnaissance faciale",
    version="1.0.0"
)

# Configuration CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*","http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Variables globales
model = None
label_encoder = None
embedder = None
known_students: Set[str] = set()
attendance: Set[str] = set()


# Chargement des modèles
def load_models():
    global model, label_encoder, embedder, known_students
    try:
        model = joblib.load("model_knn.pkl")
        label_encoder = joblib.load("label_encoder.pkl")
        embedder = FaceNet()
        known_students = set(label_encoder.classes_)
        logger.info(f"Modèles chargés avec succès. Étudiants connus: {len(known_students)}")
    except Exception as e:
        logger.error(f"Erreur de chargement des modèles: {str(e)}")
        raise


load_models()


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "models_loaded": bool(model and label_encoder and embedder),
        "known_students_count": len(known_students),
        "current_attendance": len(attendance)
    }


@app.post("/recognize")
async def recognize_face(file: UploadFile = File(...)):
    try:
        # Validation du fichier
        if not file.content_type.startswith('image/'):
            raise HTTPException(400, "Le fichier doit être une image")

        contents = await file.read()
        if len(contents) > 10_000_000:  # 10MB max
            raise HTTPException(413, "Fichier trop volumineux")

        # Traitement de l'image
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise HTTPException(400, "Impossible de décoder l'image")

        # Reconnaissance faciale
        rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        faces = embedder.extract(rgb, threshold=0.8)
        results = []

        for face in faces:
            x, y, w, h = map(int, face['box'])
            face_img = rgb[y:y + h, x:x + w]

            if face_img.size == 0:
                continue

            try:
                embedding = embedder.embeddings([face_img])[0]
                distances, indices = model.kneighbors([embedding])
                min_distance = distances[0][0]

                if min_distance < 0.9:  # Seuil de confiance
                    label = label_encoder.inverse_transform(indices[0])[0]
                    results.append({
                        "label": label,
                        "confidence": float(1 - min_distance),
                        "box": [x, y, w, h],
                        "status": "recognized"
                    })
                else:
                    results.append({
                        "label": "Unknown",
                        "confidence": 0.0,
                        "box": [x, y, w, h],
                        "status": "unknown"
                    })
            except Exception as e:
                logger.error(f"Erreur de reconnaissance: {str(e)}")
                continue

        return {"results": results}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur inattendue: {str(e)}")
        raise HTTPException(500, "Erreur interne du serveur")


# Modifiez votre endpoint /mark-attendance comme ceci :
@app.post("/mark-attendance")
async def mark_attendance(file: UploadFile = File(...)):
    try:
        # Lire le fichier sans vérification de taille initiale
        contents = await file.read()

        # Convertir en image OpenCV
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            raise HTTPException(status_code=400, detail="Impossible de décoder l'image")

        # Conversion couleur
        rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

        # Détection des visages
        faces = embedder.extract(rgb, threshold=0.6)
        recognized = []

        for face in faces:
            x, y, w, h = map(int, face['box'])
            face_img = rgb[y:y + h, x:x + w]

            if face_img.size == 0:
                continue

            try:
                embedding = embedder.embeddings([face_img])[0]
                distances, indices = model.kneighbors([embedding], n_neighbors=1)
                min_distance = distances[0][0]

                if min_distance < 0.9:  # Seuil de confiance
                    pred = model.predict([embedding])[0]
                    label = label_encoder.inverse_transform([pred])[0]
                    recognized.append(label)
                    attendance.add(label)

            except Exception as e:
                logger.error(f"Erreur de reconnaissance: {str(e)}")
                continue

        if not recognized:
            raise HTTPException(
                status_code=400,
                detail="Aucun visage reconnu ou tous les visages sont inconnus"
            )

        return JSONResponse({
            "status": "success",
            "recognized": recognized,
            "total_attendance": len(attendance)
        })

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur inattendue: {str(e)}")
        raise HTTPException(status_code=500, detail="Erreur interne du serveur")

@app.get("/attendance-report")
async def get_attendance():
    try:
        absents = known_students - attendance
        return {
            "present": sorted(attendance),
            "absent": sorted(absents),
            "count": len(attendance)
        }
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/reset-attendance")
async def reset_attendance():
    global attendance
    attendance = set()
    return {"message": "Présences réinitialisées", "count": 0}




@app.get("/download-absent-csv")
async def download_absent_csv():
    try:
        absents = known_students - attendance

        # Create CSV in memory
        output = io.StringIO()
        writer = csv.writer(output)

        # Write header
        writer.writerow(["Status", "Date"])

        # Write data
        current_date = datetime.datetime.now().strftime("%Y-%m-%d")
        for student in sorted(absents):
            writer.writerow([student, "Absent", current_date])

        # Prepare response
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=absent_students_{current_date}.csv"
            }
        )
    except Exception as e:
        raise HTTPException(500, str(e))
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000,reload=True)