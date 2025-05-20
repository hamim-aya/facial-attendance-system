import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000'; // Remplacez par l'URL de votre backend

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'multipart/form-data',
  },
});

export const recognizeFace = async (imageFile) => {
  const formData = new FormData();
  formData.append('file', imageFile);
  return await api.post('/recognize-face', formData);
};

export const markAttendance = async (imageFile) => {
  const formData = new FormData();
  formData.append('file', imageFile);
  return await api.post('/mark-attendance', formData);
};

export const getAttendanceReport = async () => {
  return await api.get('/attendance-report');
};

export const resetAttendance = async () => {
  return await api.post('/reset-attendance');
};

export const getKnownStudents = async () => {
  return await api.get('/known-students');
};

export const downloadCSV = (csvData) => {
  const blob = new Blob([csvData], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `attendance_${new Date().toISOString()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};