import { useState, useEffect } from 'react';
import { 
  Typography, 
  Card, 
  CardContent, 
  Button, 
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  CircularProgress,
  Box,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import VideocamIcon from '@mui/icons-material/Videocam';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SettingsIcon from '@mui/icons-material/Settings';
import StreamIcon from '@mui/icons-material/Stream';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import LooksOneIcon from '@mui/icons-material/LooksOne';
import LooksTwoIcon from '@mui/icons-material/LooksTwo';
import Looks3Icon from '@mui/icons-material/Looks3';
import Looks4Icon from '@mui/icons-material/Looks4';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import api from '../services/api';
import type { Camera, CameraStatus } from '../services/api';
import StreamSettings from './StreamSettings';
import { useNavigate } from 'react-router-dom';

const CameraList = () => {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'error' | 'success' | 'warning'>('error');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cameraToDelete, setCameraToDelete] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [expandedCameras, setExpandedCameras] = useState<Record<string, boolean>>({});
  const [gridColumns, setGridColumns] = useState<number>(3);
  const [gridMenuAnchorEl, setGridMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [cameraStatuses, setCameraStatuses] = useState<Record<string, CameraStatus>>({});
  const [controlLoading, setControlLoading] = useState<Record<string, boolean>>({});
  const navigate = useNavigate();

  
  const fetchCameras = async () => {
    try {
      setLoading(true);
      setMessage(null);
      const data = await api.getCameras();
      setCameras(data);
      
      // Fetch status for each camera
      await fetchCameraStatuses(data);
    } catch (err) {
      setMessage('Failed to load cameras. Please try again later.');
      setMessageType('error');
      console.error('Error fetching cameras:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCameraStatuses = async (cameraList: Camera[]) => {
    try {
      const statusPromises = cameraList.map(async (camera) => {
        try {
          const status = await api.getCameraStatus(camera.name);
          return { name: camera.name, status };
        } catch (error) {
          console.error(`Error fetching status for camera ${camera.name}:`, error);
          return { name: camera.name, status: null };
        }
      });

      const statusResults = await Promise.all(statusPromises);
      const statusMap: Record<string, CameraStatus> = {};
      
      statusResults.forEach((result) => {
        if (result.status) {
          statusMap[result.name] = result.status;
        }
      });

      setCameraStatuses(statusMap);
    } catch (error) {
      console.error('Error fetching camera statuses:', error);
    }
  };

  const handlePauseCamera = async (cameraName: string) => {
    try {
      setControlLoading(prev => ({ ...prev, [cameraName]: true }));
      setMessage(null);
      
      const response = await api.pauseCamera(cameraName);
      
      if (response.success) {
        // Update the camera status
        const updatedStatus = await api.getCameraStatus(cameraName);
        setCameraStatuses(prev => ({
          ...prev,
          [cameraName]: updatedStatus
        }));
        
        // Show success message
        setMessage(`Camera '${cameraName}' paused successfully`);
        setMessageType('success');
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage(`Failed to pause camera: ${response.message}`);
        setMessageType('error');
      }
    } catch (err) {
      setMessage(`Failed to pause camera '${cameraName}'. Please try again.`);
      setMessageType('error');
      console.error('Error pausing camera:', err);
    } finally {
      setControlLoading(prev => ({ ...prev, [cameraName]: false }));
    }
  };

  const handlePlayCamera = async (cameraName: string) => {
    try {
      setControlLoading(prev => ({ ...prev, [cameraName]: true }));
      setMessage(null);
      
      const response = await api.playCamera(cameraName);
      
      if (response.success) {
        // Update the camera status
        const updatedStatus = await api.getCameraStatus(cameraName);
        setCameraStatuses(prev => ({
          ...prev,
          [cameraName]: updatedStatus
        }));
        
        // Show success message
        setMessage(`Camera '${cameraName}' resumed successfully`);
        setMessageType('success');
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage(`Failed to resume camera: ${response.message}`);
        setMessageType('error');
      }
    } catch (err) {
      setMessage(`Failed to resume camera '${cameraName}'. Please try again.`);
      setMessageType('error');
      console.error('Error resuming camera:', err);
    } finally {
      setControlLoading(prev => ({ ...prev, [cameraName]: false }));
    }
  };

  useEffect(() => {
    fetchCameras();
  }, []);

  const handleDeleteClick = (cameraName: string) => {
    setCameraToDelete(cameraName);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!cameraToDelete) return;
    
    setDeleteLoading(true);
    setMessage(null);
    
    try {
      const response = await api.deleteCamera(cameraToDelete);
      
      // Check if the response indicates success
      if (response && response.success) {
        setCameras(cameras.filter(camera => camera.name !== cameraToDelete));
        setDeleteDialogOpen(false);
        setCameraToDelete(null);
        
        // Show warning if MediaMTX restart failed but deletion was successful
        if (response.warning) {
          setMessage(`Camera deleted successfully, but there was a warning: ${response.warning}`);
          setMessageType('warning');
          // Clear the warning after 5 seconds
          setTimeout(() => setMessage(null), 5000);
        } else {
          setMessageType('success');
        }
      } else {
        throw new Error('Unexpected response format from server');
      }
    } catch (err: any) {
      console.error('Error deleting camera:', err);
      
      // Extract error message from different possible response formats
      let errorMessage = 'Failed to delete camera. Please try again later.';
      
      if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
        if (err.response.data.details) {
          errorMessage += ` (${err.response.data.details})`;
        }
      } else if (err.message) {
        errorMessage = err.message;
      } else if (err.response?.status === 404) {
        errorMessage = 'Camera not found. It may have been deleted already.';
      } else if (err.response?.status === 500) {
        errorMessage = 'Server error occurred while deleting camera.';
      } else if (err.code === 'NETWORK_ERROR' || err.code === 'ECONNREFUSED') {
        errorMessage = 'Unable to connect to server. Please check your connection.';
      }
      
      setMessage(errorMessage);
      setMessageType('error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setCameraToDelete(null);
  };

  const handleSettingsUpdated = () => {
    fetchCameras(); // This will also fetch updated statuses
  };


  const handleGridColumnsChange = (columns: number) => {
    setGridColumns(columns);
    handleGridMenuClose();
  };

  const handleGridMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setGridMenuAnchorEl(event.currentTarget);
  };

  const handleGridMenuClose = () => {
    setGridMenuAnchorEl(null);
  };

  const getGridTemplateColumns = () => {
    switch (gridColumns) {
      case 1: return 'repeat(1, 1fr)';
      case 2: return { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)' };
      case 3: return { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' };
      case 4: return { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' };
      default: return { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' };
    }
  };

  // Helper function to extract and format RTMP URL
  const formatRtmpUrl = (camera: Camera) => {
    if (!camera.runOnReady || typeof camera.runOnReady !== 'string') {
      return 'RTMP URL not available';
    }
    
    try {
      // Extract RTMP URL from ffmpeg command
      if (camera.runOnReady.includes('rtmp://')) {
        const rtmpPart = camera.runOnReady.split('rtmp://')[1];
        if (rtmpPart) {
          const rtmpUrl = rtmpPart.split(' ')[0]; // Get everything before the next space
          return `rtmp://${rtmpUrl}`;
        }
      }
      
      // Fallback to the rtmpUrl property if extraction fails
      return camera.rtmpUrl || 'RTMP URL not available';
    } catch (err) {
      console.error('Error formatting RTMP URL:', err);
      return camera.rtmpUrl || 'RTMP URL not available';
    }
  };

  if (loading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="60vh"
        sx={{
          background: 'linear-gradient(145deg, #1a1a1a 0%, #2a2a2a 100%)',
          borderRadius: 4,
          border: '1px solid #333',
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={60} sx={{ color: '#90caf9', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Loading cameras...
          </Typography>
        </Box>
      </Box>
    );
  }

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
          Camera Dashboard
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
          Manage your RTSP to RTMP streaming configurations
        </Typography>
        
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap', mb: 3 }}>
          <Chip 
            icon={<VideocamIcon />} 
            label={`${cameras.length} Camera${cameras.length !== 1 ? 's' : ''}`} 
            color="primary" 
            variant="outlined"
            sx={{ 
              borderColor: '#90caf9',
              color: '#90caf9',
              '& .MuiChip-icon': { color: '#90caf9' },
            }}
          />
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <Button
            variant="contained"
            onClick={handleGridMenuClick}
            endIcon={<KeyboardArrowDownIcon />}
            startIcon={<ViewColumnIcon />}
            sx={{
              backgroundColor: '#1e88e5',
              '&:hover': {
                backgroundColor: '#1976d2',
              },
              px: 3
            }}
          >
            {gridColumns} Column{gridColumns !== 1 ? 's' : ''}
          </Button>
          <Menu
            anchorEl={gridMenuAnchorEl}
            open={Boolean(gridMenuAnchorEl)}
            onClose={handleGridMenuClose}
            PaperProps={{
              sx: {
                bgcolor: '#1e1e1e',
                border: '1px solid #333',
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
              }
            }}
          >
            <MenuItem 
              selected={gridColumns === 1} 
              onClick={() => handleGridColumnsChange(1)}
            >
              <ListItemIcon>
                <LooksOneIcon sx={{ color: gridColumns === 1 ? '#90caf9' : 'inherit' }} />
              </ListItemIcon>
              <ListItemText>1 Column</ListItemText>
            </MenuItem>
            <MenuItem 
              selected={gridColumns === 2} 
              onClick={() => handleGridColumnsChange(2)}
            >
              <ListItemIcon>
                <LooksTwoIcon sx={{ color: gridColumns === 2 ? '#90caf9' : 'inherit' }} />
              </ListItemIcon>
              <ListItemText>2 Columns</ListItemText>
            </MenuItem>
            <MenuItem 
              selected={gridColumns === 3} 
              onClick={() => handleGridColumnsChange(3)}
            >
              <ListItemIcon>
                <Looks3Icon sx={{ color: gridColumns === 3 ? '#90caf9' : 'inherit' }} />
              </ListItemIcon>
              <ListItemText>3 Columns</ListItemText>
            </MenuItem>
            <MenuItem 
              selected={gridColumns === 4} 
              onClick={() => handleGridColumnsChange(4)}
            >
              <ListItemIcon>
                <Looks4Icon sx={{ color: gridColumns === 4 ? '#90caf9' : 'inherit' }} />
              </ListItemIcon>
              <ListItemText>4 Columns</ListItemText>
            </MenuItem>
          </Menu>
        </Box>
      </Box>
      
      {message && (
        <Box sx={{ px: { xs: 2, sm: 3, md: 4 }, mb: 3 }}>
          <Alert 
            severity={messageType} 
            sx={{ 
              borderRadius: 2,
              background: messageType === 'error' ? 'linear-gradient(145deg, #d32f2f 0%, #f44336 100%)' :
                           messageType === 'success' ? 'linear-gradient(145deg, #4caf50 0%, #66bb6a 100%)' :
                           messageType === 'warning' ? 'linear-gradient(145deg, #ff9800 0%, #ffb74d 100%)' :
                           'linear-gradient(145deg, #1e88e5 0%, #2196f3 100%)',
              border: messageType === 'error' ? '1px solid #ff5252' :
                     messageType === 'success' ? '1px solid #4caf50' :
                     messageType === 'warning' ? '1px solid #ff9800' : '1px solid #2196f3',
            }}
          >
            {message}
          </Alert>
        </Box>
      )}
      
      {cameras.length === 0 ? (
        <Box sx={{ px: { xs: 2, sm: 3, md: 4 } }}>
          <Paper 
            sx={{ 
              p: 6, 
              textAlign: 'center',
              background: 'linear-gradient(145deg, #1a1a1a 0%, #2a2a2a 100%)',
              borderRadius: 4,
              border: '1px solid #333',
            }}
          >
            <VideocamIcon sx={{ fontSize: 80, color: '#666', mb: 2 }} />
            <Typography variant="h5" gutterBottom color="text.secondary">
              No cameras configured
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Add a camera to get started with RTSP to RTMP streaming.
            </Typography>
          </Paper>
        </Box>
      ) : (
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: getGridTemplateColumns(),
          gap: 3,
          width: '100%',
          px: { xs: 2, sm: 3, md: 4 }
        }}>
          {cameras.map((camera) => (
            <Card key={camera.name} sx={{ 
              height: '100%',
              background: 'linear-gradient(145deg, #1a1a1a 0%, #2a2a2a 100%)',
              border: '1px solid #333',
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 12px 40px rgba(0, 0, 0, 0.4)',
              },
            }}>
              <CardContent sx={{ p: 3 }}>
                <Box display="flex" alignItems="center" mb={3}>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    width: 50,
                    height: 50,
                    borderRadius: '50%',
                    background: 'linear-gradient(145deg, #90caf9 0%, #64b5f6 100%)',
                    mr: 2,
                  }}>
                    <VideocamIcon sx={{ color: '#fff' }} />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                      {camera.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Camera Stream
                    </Typography>
                  </Box>
                </Box>

                {/* Status and Control Section */}
                <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                  {/* Status Indicator */}
                  <Chip
                    icon={
                      cameraStatuses[camera.name]?.paused ? (
                        <PauseIcon sx={{ fontSize: 16 }} />
                      ) : cameraStatuses[camera.name]?.active ? (
                        <CheckCircleIcon sx={{ fontSize: 16 }} />
                      ) : (
                        <ErrorIcon sx={{ fontSize: 16 }} />
                      )
                    }
                    label={
                      cameraStatuses[camera.name]?.paused ? 'Paused' :
                      cameraStatuses[camera.name]?.active ? 'Active' : 'Inactive'
                    }
                    color={
                      cameraStatuses[camera.name]?.paused ? 'warning' :
                      cameraStatuses[camera.name]?.active ? 'success' : 'error'
                    }
                    variant="outlined"
                    sx={{
                      borderColor: cameraStatuses[camera.name]?.paused ? '#ff9800' :
                                  cameraStatuses[camera.name]?.active ? '#4caf50' : '#f44336',
                      color: cameraStatuses[camera.name]?.paused ? '#ff9800' :
                             cameraStatuses[camera.name]?.active ? '#4caf50' : '#f44336',
                      '& .MuiChip-icon': {
                        color: cameraStatuses[camera.name]?.paused ? '#ff9800' :
                               cameraStatuses[camera.name]?.active ? '#4caf50' : '#f44336',
                      },
                    }}
                  />

                  {/* Pause/Play Button */}
                  {cameraStatuses[camera.name]?.paused ? (
                    <Button
                      startIcon={controlLoading[camera.name] ? <CircularProgress size={16} /> : <PlayArrowIcon />}
                      color="success"
                      variant="outlined"
                      onClick={() => handlePlayCamera(camera.name)}
                      disabled={controlLoading[camera.name]}
                      sx={{
                        borderRadius: 2,
                        borderColor: '#4caf50',
                        color: '#4caf50',
                        '&:hover': {
                          background: 'linear-gradient(145deg, #4caf50 0%, #45a049 100%)',
                          color: '#fff',
                          borderColor: '#4caf50',
                        },
                        '&:disabled': {
                          borderColor: 'rgba(76, 175, 80, 0.5)',
                          color: 'rgba(76, 175, 80, 0.5)',
                        }
                      }}
                    >
                      {controlLoading[camera.name] ? 'Resuming...' : 'Resume'}
                    </Button>
                  ) : (
                    <Button
                      startIcon={controlLoading[camera.name] ? <CircularProgress size={16} /> : <PauseIcon />}
                      color="warning"
                      variant="outlined"
                      onClick={() => handlePauseCamera(camera.name)}
                      disabled={controlLoading[camera.name]}
                      sx={{
                        borderRadius: 2,
                        borderColor: '#ff9800',
                        color: '#ff9800',
                        '&:hover': {
                          background: 'linear-gradient(145deg, #ff9800 0%, #f57c00 100%)',
                          color: '#fff',
                          borderColor: '#ff9800',
                        },
                        '&:disabled': {
                          borderColor: 'rgba(255, 152, 0, 0.5)',
                          color: 'rgba(255, 152, 0, 0.5)',
                        }
                      }}
                    >
                      {controlLoading[camera.name] ? 'Pausing...' : 'Pause'}
                    </Button>
                  )}
                </Box>
                
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>RTSP URL:</strong>
                  </Typography>
                  <Typography variant="body2" sx={{ 
                    wordBreak: 'break-all',
                    background: 'linear-gradient(145deg, #333 0%, #444 100%)',
                    p: 1,
                    borderRadius: 1,
                    border: '1px solid #555',
                  }}>
                    {camera.rtspUrl}
                  </Typography>
                </Box>
                
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>RTMP URL:</strong>
                  </Typography>
                  <Typography variant="body2" sx={{ 
                    wordBreak: 'break-all',
                    background: 'linear-gradient(145deg, #333 0%, #444 100%)',
                    p: 1,
                    borderRadius: 1,
                    border: '1px solid #555',
                  }}>
                    {formatRtmpUrl(camera)}
                  </Typography>
                </Box>
                
                <Box display="flex" justifyContent="space-between" alignItems="center" mt={3} gap={1} flexWrap="wrap">
                  <Button 
                    startIcon={<DeleteIcon />} 
                    color="error" 
                    variant="outlined"
                    onClick={() => handleDeleteClick(camera.name)}
                    sx={{ 
                      borderRadius: 2,
                      borderColor: '#f44336',
                      color: '#f44336',
                      flex: '1 1 auto',
                      minWidth: '120px',
                      '&:hover': {
                        background: 'linear-gradient(145deg, #f44336 0%, #d32f2f 100%)',
                        color: '#fff',
                        borderColor: '#f44336',
                      },
                    }}
                  >
                    Delete
                  </Button>
                  
                  <Button 
                    startIcon={<EditIcon />} 
                    color="primary" 
                    variant="outlined"
                    onClick={() => navigate(`/edit/${camera.name}`)}
                    sx={{ 
                      borderRadius: 2,
                      borderColor: '#90caf9',
                      color: '#90caf9',
                      flex: '1 1 auto',
                      minWidth: '120px',
                      '&:hover': {
                        background: 'rgba(144, 202, 249, 0.08)',
                      },
                    }}
                  >
                    Edit
                  </Button>
                  
                  <Button 
                    startIcon={<SettingsIcon />} 
                    color="primary" 
                    variant="outlined"
                    onClick={() => {
                      setExpandedCameras(prev => ({
                        ...prev,
                        [camera.name]: !prev[camera.name]
                      }));
                    }}
                    sx={{ 
                      borderRadius: 2,
                      borderColor: '#90caf9',
                      color: '#90caf9',
                      flex: '1 1 auto',
                      minWidth: '120px',
                      '&:hover': {
                        background: 'rgba(144, 202, 249, 0.08)',
                      },
                    }}
                  >
                    Settings
                  </Button>
                </Box>

                {/* Stream Settings Accordion */}
                <Accordion 
                  sx={{ 
                    mt: 3,
                    background: 'transparent',
                    boxShadow: 'none',
                    '&:before': { display: 'none' },
                    '& .MuiAccordionSummary-root': {
                      display: 'none',
                    },
                  }}
                  expanded={expandedCameras[camera.name] || false}
                >
                  <AccordionSummary 
                    expandIcon={<ExpandMoreIcon sx={{ color: '#90caf9' }} />}
                    sx={{ borderRadius: 2 }}
                  >
                    <Typography variant="subtitle1" sx={{ color: '#90caf9' }}>
                      Stream Settings
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ p: 0, pt: 2 }}>
                    <StreamSettings 
                      cameraName={camera.name} 
                      onSettingsUpdated={handleSettingsUpdated}
                    />
                  </AccordionDetails>
                </Accordion>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
      
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        PaperProps={{
          sx: {
            background: 'linear-gradient(145deg, #1a1a1a 0%, #2a2a2a 100%)',
            border: '1px solid #333',
            borderRadius: 3,
          }
        }}
      >
        <DialogTitle sx={{ color: '#f44336' }}>Delete Camera</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: 'text.secondary' }}>
            Are you sure you want to delete this camera? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button 
            onClick={handleDeleteCancel}
            variant="outlined"
            disabled={deleteLoading}
            sx={{ 
              borderRadius: 2,
              borderColor: '#666',
              color: '#666',
              '&:disabled': {
                borderColor: 'rgba(102, 102, 102, 0.5)',
                color: 'rgba(102, 102, 102, 0.5)',
              }
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            variant="contained"
            disabled={deleteLoading}
            startIcon={deleteLoading ? <CircularProgress size={16} color="inherit" /> : null}
            sx={{ 
              borderRadius: 2,
              background: 'linear-gradient(145deg, #f44336 0%, #d32f2f 100%)',
              '&:disabled': {
                background: 'rgba(244, 67, 54, 0.5)',
              }
            }}
          >
            {deleteLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CameraList; 