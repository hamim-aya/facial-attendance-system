# Facial Recognition Attendance System 

An AI-based attendance system using live face recognition. Built with **FastAPI** (backend) and **React** (frontend).

##  Features
- Real-time facial recognition via webcam
- FastAPI backend with FaceNet embedding and KNN model
- React + Material UI frontend
- Attendance logging
- Scalable and easy to deploy

## Tech Stack
- FastAPI
- React + Material UI
- keras-facenet
- OpenCV
- scikit-learn

##  Running the App

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
cd frontend
npm start 
