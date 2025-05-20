import React, { useRef, useState, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import {
  Button,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Typography
} from '@mui/material';
import axios from 'axios';
import './AttendanceApp.css';

const AttendanceApp = () => {
  const webcamRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [attendance, setAttendance] = useState({ present: [], absent: [], count: 0 });
  const [downloading, setDownloading] = useState(false);
  const [autoMode, setAutoMode] = useState(false);
  const [lastRecognized, setLastRecognized] = useState([]);

  // Fetch attendance report
  const fetchAttendanceReport = async () => {
    try {
      const response = await axios.get('http://localhost:8000/attendance-report');
      setAttendance({
        present: response.data.present,
        absent: response.data.absent,
        count: response.data.count
      });
    } catch (error) {
      console.error('Error fetching attendance:', error);
    }
  };

  // Face recognition function
  const recognizeFace = useCallback(async () => {
    if (loading) return;

    try {
      setLoading(true);
      const imageSrc = webcamRef.current.getScreenshot();

      const blob = await fetch(imageSrc)
        .then(res => res.blob())
        .then(blob => blob.type.startsWith('image/') ? blob : null);

      if (!blob) return;

      const formData = new FormData();
      formData.append('file', blob, 'capture.jpg');

      const response = await axios.post('http://localhost:8000/mark-attendance', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.status === 'success') {
        const recognized = response.data.recognized;
        setLastRecognized(recognized);
        setTimeout(() => setLastRecognized([]), 3000);

        if (response.data.newly_added?.length > 0) {
          setMessage({
            severity: 'success',
            text: `Reconnu: ${recognized.join(', ')}`
          });
          fetchAttendanceReport();
        }
      }
    } catch (error) {
      console.error("Recognition error:", error);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  // Manual capture
  const captureAndRecognize = async () => {
    if (!autoMode) {
      await recognizeFace();
    }
  };

  // Auto recognition effect
  useEffect(() => {
    let interval;
    if (autoMode) {
      interval = setInterval(recognizeFace, 50); // Fixed 3 second interval
    }
    return () => clearInterval(interval);
  }, [autoMode, recognizeFace]);

  // Reset attendance
  const resetAttendance = async () => {
    try {
      await axios.post('http://localhost:8000/reset-attendance');
      setMessage({ severity: 'success', text: 'Présences réinitialisées' });
      fetchAttendanceReport();
    } catch (error) {
      setMessage({ severity: 'error', text: error.message });
    }
  };

  // Download absent list
  const downloadAbsentCSV = async () => {
    setDownloading(true);
    try {
      const response = await axios.get('http://localhost:8000/download-absent-csv', {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;

      const filename = response.headers['content-disposition']?.split('filename=')[1] || 'absents.csv';
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();

      setMessage({ severity: 'success', text: 'Export CSV réussi' });
    } catch (error) {
      setMessage({ severity: 'error', text: error.message });
    } finally {
      setDownloading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchAttendanceReport();
  }, []);

  return (
    <Box sx={{ p: 3, maxWidth: 1200, margin: '0 auto' }}>
      <Typography variant="h4" gutterBottom sx={{ textAlign: 'center' }}>
        Système de Présence Konosys
      </Typography>

      <Box sx={{ backgroundColor: '#1976d2', color: 'white', p: 2, mb: 3, borderRadius: 2, textAlign: 'center' }}>
        <Typography variant="h5">Reconnaissance Faciale Automatique/Manuel</Typography>
      </Box>

      {/* Camera Section */}
      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        mb: 4
      }}>
        <Box sx={{
          position: 'relative',
          width: { xs: '100%', sm: '100%', md: '100%' },
          maxWidth: 400,
          borderRadius: 2,
          overflow: 'hidden',
          boxShadow: 3,
          aspectRatio: '16/9'
        }}>
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            style={{
              width: '120%',
              height: '100%',
              objectFit: 'cover'
            }}
            videoConstraints={{
              facingMode: 'user',
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }}
          />

          {loading && (
            <Box sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: 'rgba(0,0,0,0)'
            }}>
              <CircularProgress color="secondary" />
            </Box>
          )}

          {lastRecognized.length > 0 && (
            <Box sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: 'rgba(0,0,0,0.7)',
              color: 'white',
              textAlign: 'center',
              py: 1
            }}>
              <Typography variant="subtitle2">
                {lastRecognized.join(', ')}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Controls */}
        <Box sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2,
          justifyContent: 'center',
          mt: 3,
          width: '100%'
        }}>
          <Button
            variant={autoMode ? 'outlined' : 'contained'}
            onClick={captureAndRecognize}
            disabled={loading || autoMode}
            startIcon={loading && !autoMode ? <CircularProgress size={20} /> : null}
            sx={{ minWidth: 200 }}
          >
            {loading && !autoMode ? 'Analyse...' : 'Capture Manuel'}
          </Button>

          <Button
            variant={autoMode ? 'contained' : 'outlined'}
            color={autoMode ? 'success' : 'primary'}
            onClick={() => setAutoMode(!autoMode)}
            sx={{ minWidth: 200 }}
          >
            {autoMode ? 'Désactiver Auto' : 'Activer Auto'}
          </Button>
        </Box>

        {message && (
          <Alert
            severity={message.severity}
            sx={{
              mt: 2,
              width: '100%',
              maxWidth: 500
            }}
          >
            {message.text}
          </Alert>
        )}
      </Box>

      {/* Attendance Report */}
      <Box sx={{
        backgroundColor: 'background.paper',
        borderRadius: 2,
        p: 3,
        boxShadow: 1
      }}>
        <Typography variant="h5" gutterBottom sx={{ textAlign: 'center' }}>
          Rapport de Présence
        </Typography>

        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          mb: 3,
          gap: 2
        }}>
          <Typography>
            <strong>Présents:</strong> {attendance.count} |
            <strong> Absents:</strong> {attendance.absent.length}
          </Typography>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              onClick={fetchAttendanceReport}
              size="small"
            >
              Actualiser
            </Button>
            <Button
              variant="contained"
              color="secondary"
              onClick={downloadAbsentCSV}
              disabled={downloading}
              startIcon={downloading ? <CircularProgress size={20} /> : null}
              size="small"
            >
              Exporter Absents
            </Button>
            <Button
              variant="outlined"
              color="error"
              onClick={resetAttendance}
              size="small"
            >
              Réinitialiser
            </Button>
          </Box>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Étudiant</strong></TableCell>
                <TableCell><strong>Statut</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {attendance.present.map((student) => (
                <TableRow key={`present-${student}`}>
                  <TableCell>{student}</TableCell>
                  <TableCell sx={{ color: 'success.main' }}>Présent</TableCell>
                </TableRow>
              ))}
              {attendance.absent.map((student) => (
                <TableRow key={`absent-${student}`}>
                  <TableCell>{student}</TableCell>
                  <TableCell sx={{ color: 'error.main' }}>Absent</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Box>
  );
};

export default AttendanceApp;