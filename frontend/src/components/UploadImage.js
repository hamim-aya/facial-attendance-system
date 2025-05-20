import React, { useState } from 'react';
import axios from 'axios';

const UploadImage = () => {
  const [file, setFile] = useState(null);
  const [recognitionResults, setRecognitionResults] = useState([]);
  const [message, setMessage] = useState('');
  const [report, setReport] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setRecognitionResults([]);
    setMessage('');
  };

  const handleRecognize = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file,file.name);

    try {
      const res = await axios.post('http://localhost:8000/recognize-face', formData);
      setRecognitionResults(res.data.results);
    } catch (err) {
      setMessage('Erreur lors de la reconnaissance');
    }
  };

  const handleMarkAttendance = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post('http://localhost:8000/mark-attendance', formData);
      setMessage(`Présence enregistrée pour: ${res.data.recognized_faces.join(', ')}`);
    } catch (err) {
      setMessage('Erreur lors du marquage de présence');
    }
  };

  const handleReport = async () => {
    try {
      const res = await axios.get('http://localhost:8000/attendance-report');
      setReport(res.data);
    } catch (err) {
      setMessage('Erreur lors de la récupération du rapport');
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>📷 Système de reconnaissance faciale</h2>
      <input type="file" onChange={handleFileChange} accept="image/*" />
      <div style={{ marginTop: '10px' }}>
        <button onClick={handleRecognize}>Reconnaître</button>
        <button onClick={handleMarkAttendance}>Marquer Présence</button>
        <button onClick={handleReport}>Voir Rapport</button>
      </div>

      {message && <p>{message}</p>}

      {recognitionResults.length > 0 && (
        <div>
          <h3>Résultats :</h3>
          <ul>
            {recognitionResults.map((res, idx) => (
              <li key={idx}>
                {res.status === 'recognized'
                  ? `✅ ${res.label} (confiance: ${(res.confidence * 100).toFixed(2)}%)`
                  : `❌ Visage inconnu`}
              </li>
            ))}
          </ul>
        </div>
      )}

      {report && (
        <div>
          <h3>Rapport de présence</h3>
          <p>Total: {report.statistics.total_students}</p>
          <p>Présents: {report.statistics.present}</p>
          <p>Absents: {report.statistics.absent}</p>
          <p>Taux: {report.statistics.attendance_rate.toFixed(2)}%</p>
        </div>
      )}
    </div>
  );
};

export default UploadImage;
