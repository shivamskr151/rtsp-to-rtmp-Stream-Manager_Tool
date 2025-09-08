const express = require('express');
const cors = require('cors');
const YAML = require('yaml');
const fs = require('fs-extra');
const path = require('path');
const fetch = require('node-fetch');
const { exec } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';
const CONFIG_FILE_PATH = process.env.CONFIG_FILE_PATH || '../mediamtx.yml';
const MEDIAMTX_API_URL = process.env.MEDIAMTX_API_URL || 'http://mediamtx:9997';

// Function to reload MediaMTX configuration via API
const reloadMediaMTXConfig = async () => {
  try {
    console.log('Reloading MediaMTX configuration...');
    
    // Get MediaMTX auth credentials
    const authHeaders = getMediaMTXAuthHeaders();
    
    // Use direct docker restart as the most reliable method
    try {
      console.log('Attempting to restart MediaMTX container...');
      const { exec } = require('child_process');
      
      // Use host docker command via mounted socket
      const dockerCommand = 'docker restart mediamtx';
      
      // Execute the command
      const result = await new Promise((resolve, reject) => {
        exec(dockerCommand, (error, stdout, stderr) => {
          if (error) {
            console.error(`Docker restart error: ${error.message}`);
            reject(new Error(`Docker restart failed: ${error.message}`));
            return;
          }
          if (stderr) {
            console.log(`Docker restart stderr: ${stderr}`);
          }
          console.log(`Docker restart stdout: ${stdout}`);
          resolve(stdout);
        });
      });
      
      console.log('MediaMTX container restarted successfully');
      
      // Wait for MediaMTX to start up and verify it's running
      console.log('Waiting for MediaMTX to start up...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Verify MediaMTX is running by checking container status
      const checkStatus = await new Promise((resolve, reject) => {
        exec('docker ps --filter "name=mediamtx" --format "{{.Status}}"', (error, stdout, stderr) => {
          if (error) {
            console.error(`Status check error: ${error.message}`);
            reject(new Error(`Status check failed: ${error.message}`));
            return;
          }
          if (stdout.trim()) {
            console.log(`MediaMTX status: ${stdout.trim()}`);
            resolve(stdout.trim());
          } else {
            reject(new Error('MediaMTX container not found or not running'));
          }
        });
      });
      
      console.log('MediaMTX reload completed successfully');
      return result;
    } catch (error) {
      console.error('Error restarting MediaMTX:', error);
      throw new Error(`MediaMTX restart failed: ${error.message}`);
    }
  } catch (error) {
    console.error('Error in MediaMTX reload process:', error);
    throw error; // Re-throw the error to be handled by the calling function
  }
};

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    const allowed = (CORS_ORIGIN || '').split(',').map(s => s.trim());
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());

// Path to mediamtx.yml file
const configPath = path.resolve(__dirname, CONFIG_FILE_PATH);

// Get the current configuration
app.get('/api/config', (req, res) => {
  try {
    const fileContents = fs.readFileSync(configPath, 'utf8');
    const config = YAML.parse(fileContents);
    res.json(config);
  } catch (error) {
    console.error('Error reading config file:', error);
    res.status(500).json({ error: 'Failed to read configuration file' });
  }
});

// Update the configuration
app.post('/api/config', (req, res) => {
  try {
    const newConfig = req.body;
    const yamlStr = YAML.stringify(newConfig);
    fs.writeFileSync(configPath, yamlStr, 'utf8');
    res.json({ success: true, message: 'Configuration updated successfully' });
  } catch (error) {
    console.error('Error writing config file:', error);
    res.status(500).json({ error: 'Failed to update configuration file' });
  }
});

// Function to get MediaMTX auth headers
const getMediaMTXAuthHeaders = () => {
  try {
    const fileContents = fs.readFileSync(configPath, 'utf8');
    const config = YAML.parse(fileContents);
    
    // Try to get credentials from the new authInternalUsers format
    let user = 'wrakash';
    let pass = 'akash@1997';
    
    if (config.authInternalUsers && config.authInternalUsers.length > 0) {
      // Use the first user from authInternalUsers
      user = config.authInternalUsers[0].user || 'wrakash';
      pass = config.authInternalUsers[0].pass || 'akash@1997';
    } else {
      // Fallback to old format if it exists
      user = config.paths?.all?.readUser || 'wrakash';
      pass = config.paths?.all?.readPass || 'akash@1997';
    }
    
    const auth = Buffer.from(`${user}:${pass}`).toString('base64');
    console.log('Auth credentials:', { user, pass, encodedAuth: auth });
    return {
      'Authorization': `Basic ${auth}`
    };
  } catch (error) {
    console.error('Error getting MediaMTX auth headers:', error);
    // Fallback to default credentials
    const auth = Buffer.from('wrakash:akash@1997').toString('base64');
    console.log('Using fallback auth:', { encodedAuth: auth });
    return {
      'Authorization': `Basic ${auth}`
    };
  }
};

// Update streaming parameters for a specific camera
app.put('/api/cameras/:name/stream-settings', async (req, res) => {
  try {
    const { name } = req.params;
    const { resolution, bitrate, framerate, quality, preset } = req.body;
    
    const fileContents = fs.readFileSync(configPath, 'utf8');
    const config = YAML.parse(fileContents);
    
    if (!config.paths || !config.paths[name]) {
      return res.status(404).json({ error: 'Camera not found' });
    }
    
    // Parse current ffmpeg command
    const currentCommand = config.paths[name].runOnReady;
    const parts = currentCommand.split(' ');
    
    // Find and update parameters
    let newCommand = currentCommand;
    
    // Update resolution
    if (resolution) {
      const scaleIndex = parts.findIndex(part => part === '-vf');
      if (scaleIndex !== -1) {
        parts[scaleIndex + 1] = `scale=${resolution}`;
      } else {
        // Insert scale parameter before -an
        const anIndex = parts.findIndex(part => part === '-an');
        if (anIndex !== -1) {
          parts.splice(anIndex, 0, '-vf', `scale=${resolution}`);
        }
      }
    }
    
    // Update bitrate
    if (bitrate) {
      const maxrateIndex = parts.findIndex(part => part === '-maxrate');
      if (maxrateIndex !== -1) {
        parts[maxrateIndex + 1] = `${bitrate}k`;
      }
      
      const bufsizeIndex = parts.findIndex(part => part === '-bufsize');
      if (bufsizeIndex !== -1) {
        parts[bufsizeIndex + 1] = `${parseInt(bitrate) * 2}k`;
      }
    }
    
    // Update framerate
    if (framerate) {
      const rIndex = parts.findIndex(part => part === '-r');
      if (rIndex !== -1) {
        parts[rIndex + 1] = framerate.toString();
      } else {
        // Insert framerate parameter before -an
        const anIndex = parts.findIndex(part => part === '-an');
        if (anIndex !== -1) {
          parts.splice(anIndex, 0, '-r', framerate.toString());
        }
      }
    }
    
    // Update quality (CRF)
    if (quality) {
      const crfIndex = parts.findIndex(part => part === '-crf');
      if (crfIndex !== -1) {
        parts[crfIndex + 1] = quality.toString();
      }
    }
    
    // Update preset
    if (preset) {
      const presetIndex = parts.findIndex(part => part === '-preset');
      if (presetIndex !== -1) {
        parts[presetIndex + 1] = preset;
      }
    }
    
    config.paths[name].runOnReady = parts.join(' ');
    
    // Write updated config back to file
    const yamlStr = YAML.stringify(config);
    fs.writeFileSync(configPath, yamlStr, 'utf8');
    
    // Restart MediaMTX to apply changes
    await reloadMediaMTXConfig();
    
    res.json({ 
      success: true, 
      message: 'Stream settings updated and MediaMTX restarted successfully',
      updatedCommand: config.paths[name].runOnReady
    });
  } catch (error) {
    console.error('Error updating stream settings:', error);
    res.status(500).json({ error: 'Failed to update stream settings' });
  }
});

// Get stream settings for a camera
app.get('/api/cameras/:name/stream-settings', (req, res) => {
  try {
    const { name } = req.params;
    
    const fileContents = fs.readFileSync(configPath, 'utf8');
    const config = YAML.parse(fileContents);
    
    if (!config.paths || !config.paths[name]) {
      return res.status(404).json({ error: 'Camera not found' });
    }
    
    const command = config.paths[name].runOnReady;
    const parts = command.split(' ');
    
    // Parse current settings
    const settings = {
      resolution: '640:360',
      bitrate: '400',
      framerate: '15',
      quality: '32',
      preset: 'veryfast'
    };
    
    // Extract resolution
    const scaleIndex = parts.findIndex(part => part === '-vf');
    if (scaleIndex !== -1 && parts[scaleIndex + 1]) {
      const scaleMatch = parts[scaleIndex + 1].match(/scale=(\d+:\d+)/);
      if (scaleMatch) {
        settings.resolution = scaleMatch[1];
      }
    }
    
    // Extract bitrate
    const maxrateIndex = parts.findIndex(part => part === '-maxrate');
    if (maxrateIndex !== -1 && parts[maxrateIndex + 1]) {
      settings.bitrate = parts[maxrateIndex + 1].replace('k', '');
    }
    
    // Extract framerate
    const rIndex = parts.findIndex(part => part === '-r');
    if (rIndex !== -1 && parts[rIndex + 1]) {
      settings.framerate = parts[rIndex + 1];
    }
    
    // Extract quality
    const crfIndex = parts.findIndex(part => part === '-crf');
    if (crfIndex !== -1 && parts[crfIndex + 1]) {
      settings.quality = parts[crfIndex + 1];
    }
    
    // Extract preset
    const presetIndex = parts.findIndex(part => part === '-preset');
    if (presetIndex !== -1 && parts[presetIndex + 1]) {
      settings.preset = parts[presetIndex + 1];
    }
    
    res.json(settings);
  } catch (error) {
    console.error('Error getting stream settings:', error);
    res.status(500).json({ error: 'Failed to get stream settings' });
  }
});

// Add a new camera
app.post('/api/cameras', async (req, res) => {
  try {
    const { name, rtspUrl, rtmpUrl } = req.body;
    
    if (!name || !rtspUrl || !rtmpUrl) {
      return res.status(400).json({ error: 'Missing required fields: name, rtspUrl, and rtmpUrl are required' });
    }
    
    // Validate URLs
    if (!rtspUrl.startsWith('rtsp://')) {
      return res.status(400).json({ error: 'RTSP URL must start with rtsp://' });
    }
    
    if (!rtmpUrl.startsWith('rtmp://')) {
      return res.status(400).json({ error: 'RTMP URL must start with rtmp://' });
    }
    
    const fileContents = fs.readFileSync(configPath, 'utf8');
    const config = YAML.parse(fileContents);
    
    if (!config.paths) {
      config.paths = {};
    }
    
    // Check if camera already exists
    if (config.paths[name]) {
      return res.status(400).json({ error: 'Camera with this name already exists' });
    }
    
    // Add new camera configuration matching cam2 format exactly
    config.paths[name] = {
      source: rtspUrl,
      runOnReady: `/usr/bin/ffmpeg -rtsp_transport tcp -i ${rtspUrl} -c:v libx264 -preset veryfast -crf 32 -maxrate 400k -bufsize 800k -g 30 -keyint_min 15 -vf scale=640:360 -r 15 -an -f flv ${rtmpUrl} -y -reconnect 1 -reconnect_at_eof 1 -reconnect_streamed 1 -reconnect_delay_max 2 -timeout 5000000`,
      runOnReadyRestart: true
    };
    
    // Write updated config back to file
    const yamlStr = YAML.stringify(config);
    fs.writeFileSync(configPath, yamlStr, 'utf8');
    
    console.log(`Camera ${name} configuration written to file successfully`);
    
    // Try to restart MediaMTX to apply changes
    try {
      await reloadMediaMTXConfig();
      console.log(`MediaMTX restarted successfully for camera ${name}`);
    } catch (reloadError) {
      console.error('MediaMTX restart failed, but configuration was saved:', reloadError);
      // Don't fail the request if MediaMTX restart fails
    }
    
    res.status(201).json({ 
      success: true, 
      message: 'Camera added successfully',
      camera: {
        name,
        rtspUrl,
        rtmpUrl,
        ...config.paths[name]
      }
    });
  } catch (error) {
    console.error('Error adding camera:', error);
    res.status(500).json({ 
      error: 'Failed to add camera',
      details: error.message 
    });
  }
});

// Delete a camera
app.delete('/api/cameras/:name', async (req, res) => {
  try {
    const { name } = req.params;
    
    console.log(`Attempting to delete camera: ${name}`);
    
    // Validate camera name
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ 
        error: 'Invalid camera name',
        details: 'Camera name is required and must be a non-empty string'
      });
    }
    
    // Read current configuration
    let fileContents;
    try {
      fileContents = fs.readFileSync(configPath, 'utf8');
    } catch (fileError) {
      console.error('Error reading config file:', fileError);
      return res.status(500).json({ 
        error: 'Failed to read configuration file',
        details: fileError.message
      });
    }
    
    let config;
    try {
      config = YAML.parse(fileContents);
    } catch (parseError) {
      console.error('Error parsing config file:', parseError);
      return res.status(500).json({ 
        error: 'Failed to parse configuration file',
        details: parseError.message
      });
    }
    
    // Check if camera exists
    if (!config.paths || !config.paths[name]) {
      return res.status(404).json({ 
        error: 'Camera not found',
        details: `Camera '${name}' does not exist in the configuration`
      });
    }
    
    console.log(`Camera '${name}' found, removing from configuration...`);
    
    // Remove the camera
    delete config.paths[name];
    
    // Write updated config back to file
    let yamlStr;
    try {
      yamlStr = YAML.stringify(config);
      fs.writeFileSync(configPath, yamlStr, 'utf8');
      console.log(`Configuration file updated successfully for camera '${name}'`);
    } catch (writeError) {
      console.error('Error writing config file:', writeError);
      return res.status(500).json({ 
        error: 'Failed to update configuration file',
        details: writeError.message
      });
    }
    
    // Restart MediaMTX to apply changes
    try {
      console.log(`Restarting MediaMTX to apply changes for camera '${name}'...`);
      await reloadMediaMTXConfig();
      console.log(`MediaMTX restarted successfully for camera '${name}'`);
    } catch (reloadError) {
      console.error('Error reloading MediaMTX:', reloadError);
      // Even if MediaMTX restart fails, the configuration was updated
      // Return a warning but still consider the deletion successful
      return res.status(200).json({ 
        success: true, 
        message: 'Camera deleted successfully, but MediaMTX restart failed',
        warning: 'Configuration has been updated. Please restart MediaMTX manually to apply changes.',
        details: reloadError.message
      });
    }
    
    res.json({ 
      success: true, 
      message: `Camera '${name}' deleted and MediaMTX restarted successfully` 
    });
  } catch (error) {
    console.error('Error deleting camera:', error);
    res.status(500).json({ 
      error: 'Failed to delete camera',
      details: error.message
    });
  }
});

// Get all cameras
app.get('/api/cameras', (req, res) => {
  try {
    const fileContents = fs.readFileSync(configPath, 'utf8');
    const config = YAML.parse(fileContents);
    
    if (!config.paths) {
      return res.json([]);
    }
    
    const cameras = Object.entries(config.paths).map(([name, config]) => {
      // Extract RTMP URL from runOnReady command
      let rtmpUrl = 'RTMP URL not available';
      if (config.runOnReady && typeof config.runOnReady === 'string') {
        // Look for rtmp:// in the command
        const rtmpMatch = config.runOnReady.match(/rtmp:\/\/([^\s"']+)/);
        if (rtmpMatch) {
          rtmpUrl = `rtmp://${rtmpMatch[1]}`;
        }
      }
      
      return {
        name,
        rtspUrl: config.source,
        rtmpUrl: rtmpUrl,
        ...config
      };
    });
    
    res.json(cameras);
  } catch (error) {
    console.error('Error getting cameras:', error);
    res.status(500).json({ error: 'Failed to get cameras' });
  }
});

// Update a camera
app.put('/api/cameras/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const { rtspUrl, rtmpUrl } = req.body;
    
    if (!rtspUrl || !rtmpUrl) {
      return res.status(400).json({ error: 'Missing required fields: rtspUrl and rtmpUrl are required' });
    }
    
    // Validate URLs
    if (!rtspUrl.startsWith('rtsp://')) {
      return res.status(400).json({ error: 'RTSP URL must start with rtsp://' });
    }
    
    if (!rtmpUrl.startsWith('rtmp://')) {
      return res.status(400).json({ error: 'RTMP URL must start with rtmp://' });
    }
    
    const fileContents = fs.readFileSync(configPath, 'utf8');
    const config = YAML.parse(fileContents);
    
    if (!config.paths || !config.paths[name]) {
      return res.status(404).json({ error: 'Camera not found' });
    }
    
    // Update camera configuration
    config.paths[name] = {
      ...config.paths[name],
      source: rtspUrl,
      runOnReady: `/usr/bin/ffmpeg -rtsp_transport tcp -i ${rtspUrl} -c:v libx264 -preset veryfast -crf 32 -maxrate 400k -bufsize 800k -g 30 -keyint_min 15 -vf scale=640:360 -r 15 -an -f flv ${rtmpUrl} -y -reconnect 1 -reconnect_at_eof 1 -reconnect_streamed 1 -reconnect_delay_max 2 -timeout 5000000`,
      runOnReadyRestart: true
    };
    
    // Write updated config back to file
    const yamlStr = YAML.stringify(config);
    fs.writeFileSync(configPath, yamlStr, 'utf8');
    
    console.log(`Camera ${name} configuration updated successfully`);
    
    // Try to restart MediaMTX to apply changes
    try {
      await reloadMediaMTXConfig();
      console.log(`MediaMTX restarted successfully for camera ${name}`);
    } catch (reloadError) {
      console.error('MediaMTX restart failed, but configuration was saved:', reloadError);
      // Don't fail the request if MediaMTX restart fails
    }
    
    res.json({ 
      success: true, 
      message: 'Camera updated successfully',
      camera: {
        name,
        rtspUrl,
        rtmpUrl,
        ...config.paths[name]
      }
    });
  } catch (error) {
    console.error('Error updating camera:', error);
    res.status(500).json({ 
      error: 'Failed to update camera',
      details: error.message 
    });
  }
});

// Helper function to retry API calls with exponential backoff
const retryApiCall = async (url, options, maxRetries = 3, baseDelay = 1000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempting API call to ${url} (attempt ${attempt}/${maxRetries})`);
      const response = await fetch(url, options);
      
      if (response.ok) {
        return response;
      }
      
      // If it's a server error (5xx), retry
      if (response.status >= 500 && attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.log(`Server error ${response.status}, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // For client errors (4xx), don't retry
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (error) {
      console.error(`API call attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Check if it's a DNS/connection error that should be retried
      if (error.code === 'EAI_AGAIN' || error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.log(`Connection error, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // For other errors, don't retry
      throw error;
    }
  }
};

// Get stream status and statistics
app.get('/api/status', async (req, res) => {
  try {
    // Get MediaMTX API stats
    const mediamtxApiUrl = MEDIAMTX_API_URL;
    
    // Get authentication headers
    const authHeaders = getMediaMTXAuthHeaders();
    
    // Fetch paths data from MediaMTX API with retry logic
    const pathsResponse = await retryApiCall(`${mediamtxApiUrl}/v3/paths/list`, { headers: authHeaders });
    
    if (!pathsResponse.ok) {
      throw new Error(`Failed to fetch paths: ${pathsResponse.statusText}`);
    }
    
    const pathsData = await pathsResponse.json();
    
    // Transform the data to match what the Status component expects
    const paths = pathsData.items || [];
    
    // Calculate totals
    const totalBytesReceived = paths.reduce((sum, path) => sum + (path.bytesReceived || 0), 0);
    const totalBytesSent = paths.reduce((sum, path) => sum + (path.bytesSent || 0), 0);
    const activePaths = paths.filter(path => path.ready);
      
      // Get detailed information for each active path
    const ffmpegProcesses = [];
    const rtmpOutputs = [];
    let externalRtmpStreams = 0;
    
    for (const path of activePaths) {
        try {
          // Get path configuration details
        const configPath = '/mediamtx.yml';
          const fileContents = fs.readFileSync(configPath, 'utf8');
          const config = YAML.parse(fileContents);
          
          if (config.paths && config.paths[path.name]) {
            const pathConfig = config.paths[path.name];
            const source = pathConfig.source || '';
            const runOnReady = pathConfig.runOnReady || '';
            
            // Add ffmpeg process info
            if (runOnReady) {
            ffmpegProcesses.push({
                name: path.name,
                command: runOnReady,
                status: 'running',
              source: source
              });
            
            // Extract RTMP URL and add to outputs
                if (runOnReady.includes('rtmp://')) {
                const rtmpMatch = runOnReady.match(/rtmp:\/\/([^\s"']+)/);
                if (rtmpMatch) {
                  const rtmpUrl = `rtmp://${rtmpMatch[1]}`;
                rtmpOutputs.push({
                    name: path.name,
                    rtmpUrl: rtmpUrl,
                    status: 'active',
                    source: source,
                  isExternal: true
                  });
                externalRtmpStreams++;
              }
                }
              }
            }
          } catch (error) {
            console.error(`Error getting details for path ${path.name}:`, error);
      }
    }
    
    // Get RTSP sessions
    let rtspSessions = [];
    try {
      const rtspsResponse = await retryApiCall(`${mediamtxApiUrl}/v3/rtspsessions/list`, { headers: authHeaders });
      if (rtspsResponse.ok) {
        const rtspsData = await rtspsResponse.json();
        rtspSessions = rtspsData.items || [];
      }
    } catch (error) {
      console.error('Error fetching RTSP sessions:', error);
    }
    
    // Get RTMP sessions
    let rtmpSessions = [];
    try {
      const rtmpsResponse = await retryApiCall(`${mediamtxApiUrl}/v3/rtmpsessions/list`, { headers: authHeaders });
      if (rtmpsResponse.ok) {
        const rtmpsData = await rtmpsResponse.json();
        rtmpSessions = rtmpsData.items || [];
      }
    } catch (error) {
      console.error('Error fetching RTMP sessions:', error);
    }
    
    // Create the response structure that matches what the Status component expects
    const status = {
      active: activePaths.map(path => ({
        name: path.name,
        bytesReceived: path.bytesReceived || 0,
        tracks: path.tracks || []
      })),
      sessions: [...rtspSessions, ...rtmpSessions],
      total: {
        active: activePaths.length,
        sessions: rtspSessions.length + rtmpSessions.length,
        sent: totalBytesSent,
        received: totalBytesReceived
      },
      raw: {
        itemCount: paths.length,
        pageCount: 1,
        items: paths.map(path => ({
          name: path.name,
          confName: path.confName || path.name,
          source: {
            type: 'rtspSource',
            id: path.source || path.name
          },
          ready: path.ready || false,
          readyTime: path.readyTime || new Date().toISOString(),
          tracks: path.tracks || [],
          bytesReceived: path.bytesReceived || 0,
          bytesSent: path.bytesSent || 0,
          readers: []
        }))
      },
      // Keep the original structure for backward compatibility
      paths: paths,
      rtsps: rtspSessions,
      rtmps: rtmpSessions,
      streamProcessing: {
        ffmpegProcesses: ffmpegProcesses,
        rtmpOutputs: rtmpOutputs,
        transferStats: {
          totalInputs: paths.length,
          activeInputs: activePaths.length,
          totalOutputs: rtmpOutputs.length,
          activeOutputs: rtmpOutputs.filter(o => o.status === 'active').length,
          externalRtmpStreams: externalRtmpStreams,
          processingEfficiency: paths.length > 0 ? 
            (activePaths.length / paths.length * 100).toFixed(2) + '%' : '0%'
        }
      },
      summary: {
        totalPaths: paths.length,
        activeStreams: activePaths.length,
        totalRTSPSessions: rtspSessions.length,
        totalRTMPSessions: rtmpSessions.length,
        ffmpegProcesses: ffmpegProcesses.length,
        rtmpOutputs: rtmpOutputs.length,
        externalRtmpStreams: externalRtmpStreams
      }
    };

    res.json(status);
  } catch (error) {
    console.error('Error getting status:', error);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

// Get detailed stream information
app.get('/api/streams/:name/status', async (req, res) => {
  try {
    const { name } = req.params;
    const mediamtxApiUrl = MEDIAMTX_API_URL;
    
    const authHeaders = getMediaMTXAuthHeaders();
    
    const response = await retryApiCall(`${mediamtxApiUrl}/v3/paths/get/${name}`, { headers: authHeaders });
    
    if (!response.ok) {
      return res.status(404).json({ error: 'Stream not found' });
    }
    
    const streamData = await response.json();
    res.json(streamData);
  } catch (error) {
    console.error('Error getting stream status:', error);
    res.status(500).json({ error: 'Failed to get stream status' });
  }
});

// Get detailed stream processing information
app.get('/api/streams/:name/processing', async (req, res) => {
  try {
    const { name } = req.params;
    const mediamtxApiUrl = MEDIAMTX_API_URL;
    
    const authHeaders = getMediaMTXAuthHeaders();
    
    const response = await retryApiCall(`${mediamtxApiUrl}/v3/paths/get/${name}`, { headers: authHeaders });
    
    if (!response.ok) {
      return res.status(404).json({ error: 'Stream not found' });
    }
    
    const streamData = await response.json();
    
    // Extract ffmpeg command and RTMP output information
    const processingInfo = {
      name: name,
      source: streamData.source,
      ready: streamData.ready,
      ffmpegProcess: {
        command: streamData.runOnReady,
        status: streamData.ready ? 'running' : 'stopped',
        restartPolicy: streamData.runOnReadyRestart ? 'enabled' : 'disabled'
      },
      rtmpOutput: {
        url: null,
        status: 'inactive',
        target: null
      },
      transferStatus: {
        inputConnected: streamData.ready,
        outputConnected: false,
        processingActive: streamData.ready && streamData.runOnReady
      }
    };
    
    // Extract RTMP output URL from ffmpeg command
    if (streamData.runOnReady && streamData.runOnReady.includes('rtmp://')) {
      const rtmpUrl = streamData.runOnReady.split('rtmp://')[1].split(' ')[0];
      processingInfo.rtmpOutput.url = `rtmp://${rtmpUrl}`;
      processingInfo.rtmpOutput.status = streamData.ready ? 'active' : 'inactive';
      processingInfo.rtmpOutput.target = rtmpUrl;
      processingInfo.transferStatus.outputConnected = streamData.ready;
    }
    
    res.json(processingInfo);
  } catch (error) {
    console.error('Error getting stream processing info:', error);
    res.status(500).json({ error: 'Failed to get stream processing info' });
  }
});

// Get MediaMTX server info
app.get('/api/server/info', async (req, res) => {
  try {
    const mediamtxApiUrl = MEDIAMTX_API_URL;
    
    const authHeaders = getMediaMTXAuthHeaders();
    
    const response = await retryApiCall(`${mediamtxApiUrl}/v3/config/global/get`, { headers: authHeaders });
    
    if (!response.ok) {
      return res.status(500).json({ error: 'Failed to get server info' });
    }
    
    const serverInfo = await response.json();
    res.json(serverInfo);
  } catch (error) {
    console.error('Error getting server info:', error);
    res.status(500).json({ error: 'Failed to get server info' });
  }
});

// Get Docker logs for a container
app.get('/api/logs/:container', async (req, res) => {
  try {
    const { container } = req.params;
    const { lines = 100 } = req.query;
    
    // Validate container name for security
    if (!['mediamtx', 'rtsp-api', 'rtsp-ui'].includes(container)) {
      return res.status(400).json({ error: 'Invalid container name' });
    }
    
    // Execute docker logs command
    
    exec(`docker logs --tail ${lines} ${container}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error getting logs for ${container}:`, error);
        return res.status(500).json({ error: `Failed to get logs for ${container}` });
      }
      
      const logs = stdout.split('\n').map(line => {
        // Try to parse log level and timestamp if possible
        let level = 'info';
        if (line.includes('ERROR') || line.includes('error')) level = 'error';
        if (line.includes('WARN') || line.includes('warn')) level = 'warning';
        if (line.includes('DEBUG') || line.includes('debug')) level = 'debug';
        
        return {
          timestamp: new Date().toISOString(), // Approximate timestamp
          message: line,
          level
        };
      });
      
      res.json({ container, logs });
    });
  } catch (error) {
    console.error('Error getting container logs:', error);
    res.status(500).json({ error: 'Failed to get container logs' });
  }
});

// Enhanced stream status endpoint with I/O data
app.get('/api/streams/:name/io', async (req, res) => {
  try {
    const { name } = req.params;
    const mediamtxApiUrl = MEDIAMTX_API_URL;
    
    const authHeaders = getMediaMTXAuthHeaders();
    
    // Get path details
    const pathResponse = await retryApiCall(`${mediamtxApiUrl}/v3/paths/get/${name}`, { headers: authHeaders });
    
    if (!pathResponse.ok) {
      return res.status(404).json({ error: 'Stream not found' });
    }
    
    const pathData = await pathResponse.json();
    
    // Get RTSP sessions for this path
    const rtspSessionsResponse = await retryApiCall(`${mediamtxApiUrl}/v3/rtspsessions/list`, { headers: authHeaders });
    let rtspSessions = [];
    
    if (rtspSessionsResponse.ok) {
      const rtspData = await rtspSessionsResponse.json();
      rtspSessions = rtspData.items.filter(session => session.path === name) || [];
    }
    
    // Get RTMP sessions for this path (internal MediaMTX RTMP)
    const rtmpSessionsResponse = await retryApiCall(`${mediamtxApiUrl}/v3/rtmpsessions/list`, { headers: authHeaders });
    let rtmpSessions = [];
    
    if (rtmpSessionsResponse.ok) {
      const rtmpData = await rtmpSessionsResponse.json();
      rtmpSessions = rtmpData.items.filter(session => session.path === name) || [];
    }
    
    // Calculate I/O metrics from RTSP sessions
    const bytesReceived = rtspSessions.reduce((sum, session) => sum + (session.bytesReceived || 0), 0);
    const inputBitrate = rtspSessions.reduce((sum, session) => sum + (session.bitrate || 0), 0);
    
    // Extract RTMP output URL from ffmpeg command
    let rtmpOutputUrl = null;
    let rtmpTarget = null;
    let outputConnected = false;
    let bytesSent = 0;
    let outputBitrate = 0;
    
    if (pathData.runOnReady && pathData.runOnReady.includes('rtmp://')) {
      // Extract RTMP URL from ffmpeg command
      const rtmpMatch = pathData.runOnReady.match(/rtmp:\/\/([^\s"']+)/);
      if (rtmpMatch) {
        rtmpOutputUrl = `rtmp://${rtmpMatch[1]}`;
        rtmpTarget = rtmpMatch[1];
        
        // For external RTMP servers, we can't get actual bytes sent/bitrate
        // So we'll estimate based on the ffmpeg command parameters
        outputConnected = pathData.ready; // Assume connected if stream is ready
        
        // Extract bitrate from ffmpeg command if available
        const bitrateMatch = pathData.runOnReady.match(/-b:v\s+(\d+)k/);
        if (bitrateMatch) {
          outputBitrate = parseInt(bitrateMatch[1], 10);
        } else {
          // Fallback: estimate output bitrate as 70-90% of input bitrate (compression)
          outputBitrate = Math.floor(inputBitrate * 0.8);
        }
        
        // Estimate bytes sent based on bitrate and time
        if (pathData.lastActivity) {
          const streamDuration = (Date.now() - new Date(pathData.lastActivity).getTime()) / 1000;
          bytesSent = Math.floor((outputBitrate * 1000 / 8) * streamDuration);
        }
      }
    }
    
    // If we have internal RTMP sessions, use that data instead of estimates
    if (rtmpSessions.length > 0) {
      outputConnected = true;
      bytesSent = rtmpSessions.reduce((sum, session) => sum + (session.bytesSent || 0), 0);
      outputBitrate = rtmpSessions.reduce((sum, session) => sum + (session.bitrate || 0), 0);
    }
    
    // Construct enhanced status object
    const ioStatus = {
      name,
      source: pathData.source,
      ready: pathData.ready,
      lastActivity: pathData.lastActivity,
      input: {
        connected: pathData.ready,
        protocol: 'RTSP',
        url: pathData.source,
        sessions: rtspSessions.length,
        bytesReceived,
        bitrate: inputBitrate
      },
      output: {
        connected: outputConnected,
        protocol: 'RTMP',
        url: rtmpOutputUrl,
        sessions: rtmpSessions.length,
        bytesSent,
        bitrate: outputBitrate
      },
      ffmpeg: {
        command: pathData.runOnReady,
        status: pathData.ready ? 'running' : 'stopped',
        restartPolicy: pathData.runOnReadyRestart ? 'enabled' : 'disabled'
      },
      metrics: {
        bytesReceived,
        bytesSent,
        totalBytes: bytesReceived + bytesSent,
        inputBitrate,
        outputBitrate,
        efficiency: bytesReceived > 0 ? ((bytesSent / bytesReceived) * 100).toFixed(2) + '%' : '0%'
      },
      rtspSessions,
      rtmpSessions
    };
    
    res.json(ioStatus);
  } catch (error) {
    console.error('Error getting stream I/O data:', error);
    res.status(500).json({ error: 'Failed to get stream I/O data' });
  }
});

// Pause a camera stream
app.post('/api/cameras/:name/pause', async (req, res) => {
  try {
    const { name } = req.params;
    
    const fileContents = fs.readFileSync(configPath, 'utf8');
    const config = YAML.parse(fileContents);
    
    if (!config.paths || !config.paths[name]) {
      return res.status(404).json({ error: 'Camera not found' });
    }
    
    // Store the original configuration for later restoration
    const originalConfig = { ...config.paths[name] };
    
    // Temporarily disable the stream by setting runOnReady to null
    config.paths[name].runOnReady = null;
    config.paths[name].runOnReadyRestart = false;
    
    // Add a flag to indicate the stream is paused
    config.paths[name].paused = true;
    config.paths[name].originalRunOnReady = originalConfig.runOnReady;
    config.paths[name].originalRunOnReadyRestart = originalConfig.runOnReadyRestart;
    
    // Write updated config back to file
    const yamlStr = YAML.stringify(config);
    fs.writeFileSync(configPath, yamlStr, 'utf8');
    
    // Restart MediaMTX to apply changes
    try {
      await reloadMediaMTXConfig();
      console.log(`Camera ${name} paused successfully`);
      
      res.json({ 
        success: true, 
        message: `Camera '${name}' paused successfully`,
        status: 'paused'
      });
    } catch (reloadError) {
      console.error('MediaMTX restart failed, but pause configuration was saved:', reloadError);
      res.json({ 
        success: true, 
        message: 'Camera paused, but MediaMTX restart failed',
        warning: 'Please restart MediaMTX manually to apply changes.',
        status: 'paused'
      });
    }
  } catch (error) {
    console.error('Error pausing camera:', error);
    res.status(500).json({ error: 'Failed to pause camera' });
  }
});

// Play/Resume a camera stream
app.post('/api/cameras/:name/play', async (req, res) => {
  try {
    const { name } = req.params;
    
    const fileContents = fs.readFileSync(configPath, 'utf8');
    const config = YAML.parse(fileContents);
    
    if (!config.paths || !config.paths[name]) {
      return res.status(404).json({ error: 'Camera not found' });
    }
    
    // Check if the stream was paused
    if (config.paths[name].paused && config.paths[name].originalRunOnReady) {
      // Restore the original configuration
      config.paths[name].runOnReady = config.paths[name].originalRunOnReady;
      config.paths[name].runOnReadyRestart = config.paths[name].originalRunOnReadyRestart;
      
      // Remove pause-related properties
      delete config.paths[name].paused;
      delete config.paths[name].originalRunOnReady;
      delete config.paths[name].originalRunOnReadyRestart;
    } else {
      return res.status(400).json({ error: 'Camera is not paused or no original configuration found' });
    }
    
    // Write updated config back to file
    const yamlStr = YAML.stringify(config);
    fs.writeFileSync(configPath, yamlStr, 'utf8');
    
    // Restart MediaMTX to apply changes
    try {
      await reloadMediaMTXConfig();
      console.log(`Camera ${name} resumed successfully`);
      
      res.json({ 
        success: true, 
        message: `Camera '${name}' resumed successfully`,
        status: 'playing'
      });
    } catch (reloadError) {
      console.error('MediaMTX restart failed, but resume configuration was saved:', reloadError);
      res.json({ 
        success: true, 
        message: 'Camera resumed, but MediaMTX restart failed',
        warning: 'Please restart MediaMTX manually to apply changes.',
        status: 'playing'
      });
    }
  } catch (error) {
    console.error('Error resuming camera:', error);
    res.status(500).json({ error: 'Failed to resume camera' });
  }
});

// Get camera status (including pause state)
app.get('/api/cameras/:name/status', async (req, res) => {
  try {
    const { name } = req.params;
    
    const fileContents = fs.readFileSync(configPath, 'utf8');
    const config = YAML.parse(fileContents);
    
    if (!config.paths || !config.paths[name]) {
      return res.status(404).json({ error: 'Camera not found' });
    }
    
    const cameraConfig = config.paths[name];
    const isPaused = cameraConfig.paused === true;
    const isActive = cameraConfig.runOnReady && !isPaused;
    
    res.json({
      name,
      status: isPaused ? 'paused' : (isActive ? 'active' : 'inactive'),
      paused: isPaused,
      active: isActive,
      runOnReady: cameraConfig.runOnReady,
      runOnReadyRestart: cameraConfig.runOnReadyRestart
    });
  } catch (error) {
    console.error('Error getting camera status:', error);
    res.status(500).json({ error: 'Failed to get camera status' });
  }
});

app.get('/', (req, res) => {
  res.send('RTSP API is running. See /api/cameras, /api/config, etc.');
});

// Function to test MediaMTX connection on startup
const testMediaMTXConnection = async () => {
  const maxRetries = 10;
  const retryDelay = 5000; // 5 seconds
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Testing MediaMTX connection (attempt ${attempt}/${maxRetries})...`);
      const authHeaders = getMediaMTXAuthHeaders();
      const response = await fetch(`${MEDIAMTX_API_URL}/v3/config/global/get`, { 
        headers: authHeaders,
        timeout: 10000 // 10 second timeout
      });
      
      if (response.ok) {
        console.log('✅ MediaMTX connection successful!');
        return true;
      } else {
        console.log(`❌ MediaMTX responded with status ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ MediaMTX connection failed (attempt ${attempt}): ${error.message}`);
      
      if (attempt === maxRetries) {
        console.error('❌ Failed to connect to MediaMTX after all retries. Server will start anyway but API calls may fail.');
        return false;
      }
      
      console.log(`⏳ Waiting ${retryDelay/1000} seconds before retry...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
  
  return false;
};

// Start server with MediaMTX connection test
const startServer = async () => {
  console.log('🚀 Starting RTSP API server...');
  
  // Test MediaMTX connection
  await testMediaMTXConnection();
  
  // Start the server
  app.listen(PORT, () => {
    console.log(`✅ RTSP API server running on port ${PORT}`);
    console.log(`📡 MediaMTX API URL: ${MEDIAMTX_API_URL}`);
    console.log(`🌐 CORS Origin: ${CORS_ORIGIN}`);
  });
};

// Start the server
startServer().catch(error => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
}); 