import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ThemeProvider, CssBaseline, Box } from '@mui/material'
import { createTheme } from '@mui/material/styles'

// Components
import Header from './components/Header'
import CameraList from './components/CameraList'
import AddCamera from './components/AddCamera'
import EditCamera from './components/EditCamera'
import Status from './components/Status'

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#90caf9',
    },
    secondary: {
      main: '#f48fb1',
    },
    background: {
      default: '#0a0a0a',
      paper: '#1a1a1a',
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(145deg, #1a1a1a 0%, #2a2a2a 100%)',
          border: '1px solid #333',
          borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(90deg, #1a1a1a 0%, #2a2a2a 100%)',
          borderBottom: '1px solid #333',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
        },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          margin: 0,
          padding: 0,
          width: '100%',
          overflowX: 'hidden',
        },
        html: {
          margin: 0,
          padding: 0,
          width: '100%',
        },
        '#root': {
          width: '100%',
          margin: 0,
          padding: 0,
        },
      },
    },
  },
})

function App() {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Router>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0a0a0a 100%)',
          backgroundSize: '400% 400%',
          animation: 'gradient 15s ease infinite',
          '@keyframes gradient': {
            '0%': { backgroundPosition: '0% 50%' },
            '50%': { backgroundPosition: '100% 50%' },
            '100%': { backgroundPosition: '0% 50%' },
          },
        }}>
          <Header />
          <Box 
            component="main" 
            sx={{ 
              mt: 4, 
              mb: 4, 
              flex: 1,
              width: '100%',
              overflow: 'hidden',
            }}
          >
            <Routes>
              <Route path="/" element={<CameraList />} />
              <Route path="/add" element={<AddCamera />} />
              <Route path="/edit/:cameraName" element={<EditCamera />} />
              <Route path="/status" element={<Status />} />
            </Routes>
          </Box>
        </Box>
      </Router>
    </ThemeProvider>
  )
}

export default App
