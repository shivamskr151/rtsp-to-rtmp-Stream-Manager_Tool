import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Alert,
  Chip,
  Divider,
  ButtonGroup,
  Tooltip,
  Paper
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import { 
  Settings, 
  Speed, 
  HighQuality, 
  Videocam, 
  NetworkCheck,
  Memory,
  SignalCellular1Bar,
  SignalCellular4Bar,
  SignalCellularAlt
} from '@mui/icons-material';
import api from '../services/api';

interface StreamSettingsProps {
  cameraName: string;
  onSettingsUpdated?: () => void;
}

interface StreamSettings {
  resolution: string;
  bitrate: string;
  framerate: string;
  quality: string;
  preset: string;
}

// Predefined profiles for different network and CPU usage scenarios
const networkProfiles = {
  veryLow: {
    resolution: '320:240',
    bitrate: '200',
    framerate: '10',
    quality: '36',
    preset: 'ultrafast',
    label: 'Very Low Bandwidth',
    description: 'For very poor network conditions (200Kbps, 10fps, 240p)'
  },
  low: {
    resolution: '640:360',
    bitrate: '400',
    framerate: '15',
    quality: '32',
    preset: 'veryfast',
    label: 'Low Bandwidth',
    description: 'For limited network conditions (400Kbps, 15fps, 360p)'
  },
  medium: {
    resolution: '854:480',
    bitrate: '800',
    framerate: '20',
    quality: '28',
    preset: 'faster',
    label: 'Medium Bandwidth',
    description: 'For decent network conditions (800Kbps, 20fps, 480p)'
  },
  high: {
    resolution: '1280:720',
    bitrate: '1500',
    framerate: '25',
    quality: '23',
    preset: 'fast',
    label: 'High Bandwidth',
    description: 'For good network conditions (1.5Mbps, 25fps, 720p)'
  }
};

const cpuProfiles = {
  veryLow: {
    preset: 'ultrafast',
    quality: '36',
    label: 'Very Low CPU',
    description: 'Minimal CPU usage, lower quality'
  },
  low: {
    preset: 'veryfast',
    quality: '32',
    label: 'Low CPU',
    description: 'Low CPU usage, decent quality'
  },
  medium: {
    preset: 'faster',
    quality: '28',
    label: 'Medium CPU',
    description: 'Balanced CPU usage and quality'
  },
  high: {
    preset: 'fast',
    quality: '23',
    label: 'High CPU',
    description: 'Higher CPU usage, better quality'
  }
};

const StreamSettings: React.FC<StreamSettingsProps> = ({ cameraName, onSettingsUpdated }) => {
  const [settings, setSettings] = useState<StreamSettings>({
    resolution: '640:360',
    bitrate: '400',
    framerate: '15',
    quality: '32',
    preset: 'veryfast'
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [activeNetworkProfile, setActiveNetworkProfile] = useState<string | null>(null);
  const [activeCpuProfile, setActiveCpuProfile] = useState<string | null>(null);

  const resolutionOptions = [
    { value: '320:240', label: '240p (320x240)' },
    { value: '640:360', label: '360p (640x360)' },
    { value: '854:480', label: '480p (854x480)' },
    { value: '1280:720', label: '720p (1280x720)' },
    { value: '1920:1080', label: '1080p (1920x1080)' }
  ];

  const presetOptions = [
    { value: 'ultrafast', label: 'Ultrafast (Low CPU)' },
    { value: 'veryfast', label: 'Very Fast' },
    { value: 'faster', label: 'Faster' },
    { value: 'fast', label: 'Fast' },
    { value: 'medium', label: 'Medium' }
  ];

  useEffect(() => {
    loadSettings();
  }, [cameraName]);

  // Auto-hide success message after 3 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await api.getStreamSettings(cameraName);
      setSettings(response);
      
      // Determine if current settings match any profile
      const { networkProfile, cpuProfile } = detectActiveProfiles(response);
      setActiveNetworkProfile(networkProfile);
      setActiveCpuProfile(cpuProfile);
    } catch (err) {
      setError('Failed to load stream settings');
      console.error('Error loading settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess(false);

      await api.updateStreamSettings(cameraName, settings);
      
      setSuccess(true);
      if (onSettingsUpdated) {
        onSettingsUpdated();
      }
    } catch (err) {
      setError('Failed to update stream settings');
      console.error('Error updating settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const getBandwidthUsage = () => {
    const bitrate = parseInt(settings.bitrate);
    const framerate = parseInt(settings.framerate);
    const resolution = settings.resolution.split(':');
    const width = parseInt(resolution[0]);
    const height = parseInt(resolution[1]);
    
    // Rough estimation
    const estimatedBandwidth = Math.round((bitrate * framerate * width * height) / (640 * 360 * 15));
    return estimatedBandwidth;
  };

  const getQualityLevel = () => {
    const crf = parseInt(settings.quality);
    if (crf <= 20) return 'High';
    if (crf <= 28) return 'Medium';
    return 'Low';
  };

  const getCpuUsageLevel = () => {
    const preset = settings.preset;
    if (preset === 'ultrafast') return 'Very Low';
    if (preset === 'veryfast') return 'Low';
    if (preset === 'faster') return 'Medium';
    return 'High';
  };

  const applyNetworkProfile = (profile: keyof typeof networkProfiles) => {
    const profileSettings = networkProfiles[profile];
    setSettings({
      ...settings,
      resolution: profileSettings.resolution,
      bitrate: profileSettings.bitrate,
      framerate: profileSettings.framerate,
      // Keep the current preset and quality if a CPU profile is active
      preset: activeCpuProfile ? settings.preset : profileSettings.preset,
      quality: activeCpuProfile ? settings.quality : profileSettings.quality
    });
    setActiveNetworkProfile(profile);
  };

  const applyCpuProfile = (profile: keyof typeof cpuProfiles) => {
    setSettings({
      ...settings,
      preset: cpuProfiles[profile].preset,
      quality: cpuProfiles[profile].quality
    });
    setActiveCpuProfile(profile);
  };

  const detectActiveProfiles = (currentSettings: StreamSettings) => {
    let networkProfile: string | null = null;
    let cpuProfile: string | null = null;
    
    // Check network profiles
    for (const [key, profile] of Object.entries(networkProfiles)) {
      if (
        profile.resolution === currentSettings.resolution &&
        profile.bitrate === currentSettings.bitrate &&
        profile.framerate === currentSettings.framerate
      ) {
        networkProfile = key;
        break;
      }
    }
    
    // Check CPU profiles (only preset and quality)
    for (const [key, profile] of Object.entries(cpuProfiles)) {
      if (
        profile.preset === currentSettings.preset &&
        profile.quality === currentSettings.quality
      ) {
        cpuProfile = key;
        break;
      }
    }
    
    return { networkProfile, cpuProfile };
  };

  return (
    <Card sx={{ 
      mt: 2, 
      border: '1px solid rgba(144, 202, 249, 0.2)',
      borderRadius: 2,
      background: 'rgba(0, 0, 0, 0.2)'
    }}>
      <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
          <Settings fontSize="small" sx={{ mr: 1, color: '#90caf9' }} />
          <Typography variant="subtitle1" sx={{ color: '#90caf9', fontWeight: 'medium' }}>Stream Settings</Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 1.5, py: 0.5 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 1.5, py: 0.5 }}>Settings updated!</Alert>}

        {/* Network Usage Profiles */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <NetworkCheck fontSize="small" sx={{ mr: 0.5, color: '#2196f3' }} />
            <Typography variant="body2" sx={{ fontWeight: 'medium' }}>Network Usage</Typography>
          </Box>
          
          <Grid container spacing={1}>
            {Object.entries(networkProfiles).map(([key, profile]) => (
              <Grid item xs={6} key={`network-${key}`}>
                <Tooltip title={profile.description}>
                  <Paper 
                    sx={{ 
                      p: 1, 
                      cursor: 'pointer',
                      background: activeNetworkProfile === key
                        ? 'linear-gradient(145deg, rgba(33, 150, 243, 0.2) 0%, rgba(33, 150, 243, 0.1) 100%)' 
                        : 'linear-gradient(145deg, #222 0%, #333 100%)',
                      border: activeNetworkProfile === key
                        ? '1px solid #2196f3' 
                        : '1px solid #444',
                      borderRadius: 1,
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        background: 'linear-gradient(145deg, rgba(33, 150, 243, 0.1) 0%, rgba(33, 150, 243, 0.05) 100%)',
                        borderColor: '#90caf9'
                      }
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      applyNetworkProfile(key as keyof typeof networkProfiles);
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography variant="caption" sx={{ fontWeight: 'bold' }}>{profile.label}</Typography>
                      {key === 'veryLow' && <SignalCellular1Bar fontSize="small" sx={{ color: '#2196f3' }} />}
                      {key === 'low' && <SignalCellularAlt fontSize="small" sx={{ color: '#2196f3' }} />}
                      {key === 'medium' && <SignalCellularAlt fontSize="small" sx={{ color: '#2196f3' }} />}
                      {key === 'high' && <SignalCellular4Bar fontSize="small" sx={{ color: '#2196f3' }} />}
                    </Box>
                  </Paper>
                </Tooltip>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* CPU Usage Profiles */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Memory fontSize="small" sx={{ mr: 0.5, color: '#ff9800' }} />
            <Typography variant="body2" sx={{ fontWeight: 'medium' }}>CPU Usage</Typography>
          </Box>
          
          <Grid container spacing={1}>
            {Object.entries(cpuProfiles).map(([key, profile]) => (
              <Grid item xs={6} key={`cpu-${key}`}>
                <Tooltip title={profile.description}>
                  <Paper 
                    sx={{ 
                      p: 1, 
                      cursor: 'pointer',
                      background: activeCpuProfile === key
                        ? 'linear-gradient(145deg, rgba(255, 152, 0, 0.2) 0%, rgba(255, 152, 0, 0.1) 100%)' 
                        : 'linear-gradient(145deg, #222 0%, #333 100%)',
                      border: activeCpuProfile === key
                        ? '1px solid #ff9800' 
                        : '1px solid #444',
                      borderRadius: 1,
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        background: 'linear-gradient(145deg, rgba(255, 152, 0, 0.1) 0%, rgba(255, 152, 0, 0.05) 100%)',
                        borderColor: '#ffb74d'
                      }
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      applyCpuProfile(key as keyof typeof cpuProfiles);
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography variant="caption" sx={{ fontWeight: 'bold' }}>{profile.label}</Typography>
                      <Memory fontSize="small" sx={{ color: '#ff9800' }} />
                    </Box>
                  </Paper>
                </Tooltip>
              </Grid>
            ))}
          </Grid>
        </Box>

        <Divider sx={{ my: 1.5 }} />

        <Typography variant="body2" sx={{ fontWeight: 'medium', mb: 1 }}>
          Custom Settings
        </Typography>

        <Grid container spacing={1}>
          {/* Resolution */}
          <Grid item xs={6}>
            <FormControl fullWidth size="small" sx={{ mb: 1 }}>
              <InputLabel>Resolution</InputLabel>
              <Select
                value={settings.resolution}
                label="Resolution"
                onChange={(e) => setSettings({ ...settings, resolution: e.target.value })}
                size="small"
              >
                {resolutionOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Preset */}
          <Grid item xs={6}>
            <FormControl fullWidth size="small" sx={{ mb: 1 }}>
              <InputLabel>Preset</InputLabel>
              <Select
                value={settings.preset}
                label="Preset"
                onChange={(e) => setSettings({ ...settings, preset: e.target.value })}
                size="small"
              >
                {presetOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {/* Bitrate */}
        <Box sx={{ mb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption">Bitrate</Typography>
            <Chip 
              label={`${settings.bitrate}k`} 
              size="small" 
              variant="outlined" 
              sx={{ height: 20, '& .MuiChip-label': { px: 1, py: 0 } }}
            />
          </Box>
          <Slider
            value={parseInt(settings.bitrate)}
            onChange={(_, value) => setSettings({ ...settings, bitrate: value.toString() })}
            min={100}
            max={2000}
            step={100}
            size="small"
          />
        </Box>

        {/* Frame Rate */}
        <Box sx={{ mb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption">Frame Rate</Typography>
            <Chip 
              label={`${settings.framerate} fps`} 
              size="small" 
              variant="outlined" 
              sx={{ height: 20, '& .MuiChip-label': { px: 1, py: 0 } }}
            />
          </Box>
          <Slider
            value={parseInt(settings.framerate)}
            onChange={(_, value) => setSettings({ ...settings, framerate: value.toString() })}
            min={10}
            max={30}
            step={5}
            size="small"
          />
        </Box>

        {/* Quality */}
        <Box sx={{ mb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption">Quality (CRF)</Typography>
            <Chip 
              label={settings.quality} 
              size="small" 
              variant="outlined" 
              sx={{ height: 20, '& .MuiChip-label': { px: 1, py: 0 } }}
            />
          </Box>
          <Slider
            value={parseInt(settings.quality)}
            onChange={(_, value) => setSettings({ ...settings, quality: value.toString() })}
            min={18}
            max={40}
            step={2}
            size="small"
          />
        </Box>

        {/* Summary */}
        <Box sx={{ mt: 1.5 }}>
          <Divider sx={{ my: 1 }} />
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            <Chip 
              icon={<Speed sx={{ fontSize: '0.8rem' }} />} 
              label={`${getBandwidthUsage()}k`} 
              color="primary" 
              variant="outlined" 
              size="small"
              sx={{ height: 20, '& .MuiChip-label': { px: 0.5, py: 0 }, '& .MuiChip-icon': { fontSize: '0.8rem' } }}
            />
            <Chip 
              icon={<HighQuality sx={{ fontSize: '0.8rem' }} />} 
              label={getQualityLevel()} 
              color="secondary" 
              variant="outlined" 
              size="small"
              sx={{ height: 20, '& .MuiChip-label': { px: 0.5, py: 0 }, '& .MuiChip-icon': { fontSize: '0.8rem' } }}
            />
            <Chip 
              icon={<Memory sx={{ fontSize: '0.8rem' }} />} 
              label={getCpuUsageLevel()} 
              color="warning" 
              variant="outlined" 
              size="small"
              sx={{ height: 20, '& .MuiChip-label': { px: 0.5, py: 0 }, '& .MuiChip-icon': { fontSize: '0.8rem' } }}
            />
          </Box>
        </Box>

        <Box sx={{ mt: 1.5, display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            onClick={(e) => {
              e.preventDefault();
              handleSave();
            }}
            disabled={loading}
            startIcon={<Settings />}
            size="small"
            sx={{ py: 0.5, fontSize: '0.75rem' }}
          >
            {loading ? 'Saving...' : 'Save'}
          </Button>
          <Button
            variant="outlined"
            onClick={(e) => {
              e.preventDefault();
              loadSettings();
            }}
            disabled={loading}
            size="small"
            sx={{ py: 0.5, fontSize: '0.75rem' }}
          >
            Reset
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default StreamSettings; 