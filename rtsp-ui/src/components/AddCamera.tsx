import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography,
  TextField,
  Button,
  Box,
  Paper,
  Alert,
  CircularProgress
} from '@mui/material';
import api from '../services/api';
import type { CameraFormData } from '../services/api';

const AddCamera = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<CameraFormData>({
    name: '',
    rtspUrl: '',
    rtmpUrl: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simple validation
    if (!formData.name || !formData.rtspUrl || !formData.rtmpUrl) {
      setError('All fields are required');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      await api.addCamera(formData);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add camera. Please try again.');
      console.error('Error adding camera:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ mb: 4, textAlign: 'center', px: { xs: 2, sm: 3, md: 4 } }}>
        <Typography 
          variant="h3" 
          gutterBottom 
          sx={{ 
            fontWeight: 'bold',
            background: 'linear-gradient(45deg, #90caf9, #f48fb1)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 2,
          }}
        >
          Add New Camera
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
          Configure a new RTSP to RTMP streaming camera
        </Typography>
      </Box>
      
      <Box sx={{ px: { xs: 2, sm: 3, md: 4 } }}>
        <Paper 
          elevation={3} 
          sx={{ 
            p: 4, 
            width: '100%',
            background: 'linear-gradient(145deg, #1a1a1a 0%, #2a2a2a 100%)',
            border: '1px solid #333',
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          }}
        >
          {error && (
            <Alert 
              severity="error" 
              sx={{ 
                mb: 3,
                borderRadius: 2,
                background: 'linear-gradient(145deg, #d32f2f 0%, #f44336 100%)',
                border: '1px solid #ff5252',
              }}
            >
              {error}
            </Alert>
          )}
          
          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Camera Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              margin="normal"
              required
              helperText="A unique identifier for this camera (e.g. cam1, entrance, etc.)"
              sx={{
                '& .MuiOutlinedInput-root': {
                  background: 'linear-gradient(145deg, #333 0%, #444 100%)',
                  border: '1px solid #555',
                  borderRadius: 2,
                },
              }}
            />
            
            <TextField
              fullWidth
              label="RTSP URL"
              name="rtspUrl"
              value={formData.rtspUrl}
              onChange={handleChange}
              margin="normal"
              required
              helperText="The RTSP URL of your camera (e.g. rtsp://192.168.1.100:554/stream)"
              sx={{
                '& .MuiOutlinedInput-root': {
                  background: 'linear-gradient(145deg, #333 0%, #444 100%)',
                  border: '1px solid #555',
                  borderRadius: 2,
                },
              }}
            />
            
            <TextField
              fullWidth
              label="RTMP URL"
              name="rtmpUrl"
              value={formData.rtmpUrl}
              onChange={handleChange}
              margin="normal"
              required
              helperText="The RTMP URL where the stream will be published (e.g. rtmp://server/live/stream)"
              sx={{
                '& .MuiOutlinedInput-root': {
                  background: 'linear-gradient(145deg, #333 0%, #444 100%)',
                  border: '1px solid #555',
                  borderRadius: 2,
                },
              }}
            />
            
            <Box sx={{ 
              mt: 4, 
              display: 'flex', 
              justifyContent: 'space-between',
              gap: 2,
              flexWrap: 'wrap'
            }}>
              <Button 
                variant="outlined" 
                onClick={() => navigate('/')}
                disabled={loading}
                sx={{ 
                  borderRadius: 2,
                  borderColor: '#666',
                  color: '#666',
                  px: 4,
                  py: 1.5,
                }}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                variant="contained" 
                color="primary"
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : null}
                sx={{ 
                  borderRadius: 2,
                  background: 'linear-gradient(145deg, #90caf9 0%, #64b5f6 100%)',
                  px: 4,
                  py: 1.5,
                  '&:hover': {
                    background: 'linear-gradient(145deg, #64b5f6 0%, #42a5f5 100%)',
                  },
                }}
              >
                {loading ? 'Adding...' : 'Add Camera'}
              </Button>
            </Box>
          </form>
        </Paper>
      </Box>
    </Box>
  );
};

export default AddCamera; 