import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  CircularProgress,
  Alert,
  Paper,
  IconButton,
  Tooltip,
  Stack,
  Badge,
  LinearProgress,
  Divider,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Videocam as VideocamIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Input as InputIcon,
  Stream as StreamIcon
} from '@mui/icons-material';
import api from '../services/api';

interface StreamStatus {
  active: {
    name: string;
    bytesReceived: number;
    tracks: string[];
  }[];
  sessions: unknown[];
  total: {
    active: number;
    sessions: number;
    sent: number;
    received: number;
  };
  raw: {
    itemCount: number;
    pageCount: number;
    items: {
      name: string;
      confName: string;
      source: {
        type: string;
        id: string;
      };
      ready: boolean;
      readyTime: string;
      tracks: string[];
      bytesReceived: number;
      bytesSent: number;
      readers: unknown[];
    }[];
  };
}

const Status = () => {
  const [status, setStatus] = useState<StreamStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState(5000);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getStatus();
      setStatus(response as StreamStatus);
    } catch (err) {
      console.error('Error fetching status:', err);
      setError('Failed to fetch status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  // Format bytes to human-readable format
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '50vh',
        gap: 2
      }}>
        <CircularProgress size={40} />
        <Typography variant="body1" color="text.secondary">
          Loading stream status...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert 
        severity="error" 
        sx={{ 
          mt: 2,
          display: 'flex',
          alignItems: 'center'
        }}
        action={
          <IconButton
            color="inherit"
            size="small"
            onClick={fetchStatus}
          >
            <RefreshIcon />
          </IconButton>
        }
      >
        {error}
      </Alert>
    );
  }

  if (!status) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        No status data available
      </Alert>
    );
  }

  return (
    <Box sx={{ px:4 }}>
      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 4
      }}>
        <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <StreamIcon color="primary" /> Stream Status
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {[5000, 10000, 30000].map((interval) => (
              <Chip 
                key={interval}
                label={`${interval/1000}s`}
                color={refreshInterval === interval ? "primary" : "default"}
                onClick={() => setRefreshInterval(interval)}
                sx={{ cursor: 'pointer' }}
              />
            ))}
          </Box>
          <Tooltip title="Refresh Status">
            <IconButton onClick={fetchStatus} color="primary">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Summary Cards */}
      <Box sx={{ flexGrow: 1, mb: 4, display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' } }}>
        <Box>
          <Card sx={{ height: '100%', position: 'relative' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography color="text.secondary">Active Cameras</Typography>
                <Badge badgeContent={status.total.active} color="success">
                  <VideocamIcon color="primary" />
                </Badge>
              </Box>
              <Typography variant="h3">
                {status.total.active}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Streams: {status.raw.itemCount}
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={(status.total.active / status.raw.itemCount) * 100}
                sx={{ mt: 2 }}
              />
            </CardContent>
          </Card>
        </Box>

        <Box>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography color="text.secondary">Total Received</Typography>
                <InputIcon color="info" />
              </Box>
              <Typography variant="h5">
                {formatBytes(status.total.received)}
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Active RTSP Sessions
                </Typography>
                
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Stream List */}
      <Typography variant="h5" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
        <VideocamIcon /> Active Streams
      </Typography>
      <Box sx={{ flexGrow: 1, display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
        {status.raw.items.map((stream) => (
          <Box key={stream.name}>
            <Paper 
              sx={{ 
                p: 3,
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: (theme) => theme.shadows[4]
                }
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Typography variant="h6">{stream.name}</Typography>
                  <Chip 
                    icon={stream.ready ? <CheckCircleIcon /> : <CancelIcon />}
                    label={stream.ready ? 'Active' : 'Inactive'}
                    color={stream.ready ? 'success' : 'error'}
                    size="small"
                  />
                </Stack>
              </Box>

              <Stack spacing={2}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>Tracks</Typography>
                  <Stack direction="row" spacing={1}>
                    {stream.tracks.map((track, index) => (
                      <Chip 
                        key={index}
                        label={track}
                        size="small"
                        color={
                          track.includes('H264') || track.includes('H265') ? 'primary' :
                          track.includes('Audio') || track.includes('G711') ? 'secondary' :
                          'default'
                        }
                      />
                    ))}
                  </Stack>
                </Box>

                <Divider />

                <Box>
                  <Typography color="text.secondary" gutterBottom>Data Transfer</Typography>
                  <Box sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(2, 1fr)' }}>
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <InputIcon color="info" fontSize="small" />
                          <Box>
                            <Typography variant="body2" color="text.secondary">Received</Typography>
                            <Typography>{formatBytes(stream.bytesReceived)}</Typography>
                          </Box>
                        </Box>
                      </Box>
                      
                    </Box>
                  </Box>
                </Box>

                <Divider />

                <Box>
                  <Typography color="text.secondary" gutterBottom>Stream Info</Typography>
                  <Box sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(2, 1fr)' }}>
                      <Box>
                        <Typography variant="body2" color="text.secondary">Source Type</Typography>
                        <Typography>{stream.source.type}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">Ready Since</Typography>
                        <Typography>
                          {new Date(stream.readyTime).toLocaleString()}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Box>

                <Box>
                  <Typography color="text.secondary" gutterBottom>RTMP Status</Typography>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Chip 
                      icon={stream.ready ? <CheckCircleIcon /> : <CancelIcon />}
                      label={stream.ready ? 'RTMP Active' : 'RTMP Inactive'}
                      color={stream.ready ? 'success' : 'error'}
                      size="small"
                    />
                    {stream.ready && (
                      <Typography variant="body2" color="text.secondary">
                        Transfer Rate: {formatBytes(stream.bytesReceived / ((Date.now() - new Date(stream.readyTime).getTime()) / 1000))}/s
                      </Typography>
                    )}
                  </Stack>
                </Box>
              </Stack>
            </Paper>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default Status; 