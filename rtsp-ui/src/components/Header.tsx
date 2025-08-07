import { AppBar, Toolbar, Typography, Button, Box, Chip } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import VideocamIcon from '@mui/icons-material/Videocam';
import SpeedIcon from '@mui/icons-material/Speed';
import SettingsIcon from '@mui/icons-material/Settings';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AddIcon from '@mui/icons-material/Add';
import AnalyticsIcon from '@mui/icons-material/Analytics';

const Header = () => {
  return (
    <AppBar 
      position="static" 
      sx={{ 
        width: '100%',
        background: 'linear-gradient(90deg, #1a1a1a 0%, #2a2a2a 100%)',
        borderBottom: '1px solid #333',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
      }}
    >
      <Toolbar sx={{ 
        width: '100%', 
        justifyContent: 'space-between',
        minHeight: '80px',
        px: { xs: 2, sm: 3, md: 4 },
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            background: 'linear-gradient(145deg, #333 0%, #444 100%)',
            borderRadius: 3,
            px: 2,
            py: 1,
            mr: 3,
            border: '1px solid #555',
          }}>
            <VideocamIcon sx={{ mr: 1, color: '#90caf9' }} />
            <Typography variant="h6" component="div" sx={{ 
              fontWeight: 'bold',
              background: 'linear-gradient(45deg, #90caf9, #f48fb1)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              RTSP to RTMP Stream Manager
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip 
              icon={<SpeedIcon />} 
              label="Optimized for Slow Networks" 
              size="small" 
              color="success" 
              variant="outlined"
              sx={{ 
                borderColor: '#4caf50',
                color: '#4caf50',
                '& .MuiChip-icon': { color: '#4caf50' },
              }}
            />
            <Chip 
              icon={<SettingsIcon />} 
              label="Adjustable Quality" 
              size="small" 
              color="info" 
              variant="outlined"
              sx={{ 
                borderColor: '#2196f3',
                color: '#2196f3',
                '& .MuiChip-icon': { color: '#2196f3' },
              }}
            />
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            color="inherit" 
            component={RouterLink} 
            to="/"
            startIcon={<DashboardIcon />}
            sx={{ 
              minWidth: 'auto', 
              px: 3,
              py: 1,
              borderRadius: 2,
              background: 'linear-gradient(145deg, #333 0%, #444 100%)',
              border: '1px solid #555',
              '&:hover': {
                background: 'linear-gradient(145deg, #444 0%, #555 100%)',
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
              },
              transition: 'all 0.3s ease',
            }}
          >
            Cameras
          </Button>
          <Button 
            color="inherit" 
            component={RouterLink} 
            to="/status"
            startIcon={<AnalyticsIcon />}
            sx={{ 
              minWidth: 'auto', 
              px: 3,
              py: 1,
              borderRadius: 2,
              background: 'linear-gradient(145deg, #f48fb1 0%, #f06292 100%)',
              color: '#fff',
              '&:hover': {
                background: 'linear-gradient(145deg, #f06292 0%, #ec407a 100%)',
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 12px rgba(244, 143, 177, 0.3)',
              },
              transition: 'all 0.3s ease',
            }}
          >
            Status
          </Button>
          <Button 
            color="inherit" 
            component={RouterLink} 
            to="/add"
            startIcon={<AddIcon />}
            sx={{ 
              minWidth: 'auto', 
              px: 3,
              py: 1,
              borderRadius: 2,
              background: 'linear-gradient(145deg, #90caf9 0%, #64b5f6 100%)',
              color: '#fff',
              '&:hover': {
                background: 'linear-gradient(145deg, #64b5f6 0%, #42a5f5 100%)',
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 12px rgba(144, 202, 249, 0.3)',
              },
              transition: 'all 0.3s ease',
            }}
          >
            Add Camera
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header; 