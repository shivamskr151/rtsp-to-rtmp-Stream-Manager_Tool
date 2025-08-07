# RTSP/RTMP Stream Manager Tool

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-16+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19.1.0-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue.svg)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Required-blue.svg)](https://www.docker.com/)

A modern web application for dynamically managing RTSP and RTMP streams using MediaMTX. This tool provides an intuitive interface to configure, monitor, and control video streams with real-time updates.

## 🚀 Features

- **📹 Camera Management**: Add, edit, and delete camera configurations
- **🔄 Real-time Updates**: Dynamic MediaMTX configuration updates
- **🎥 Stream Monitoring**: View and manage RTSP/RTMP streams
- **🌐 Web Interface**: Modern React-based UI with Material-UI components
- **🔧 RESTful API**: Express.js backend for configuration management
- **🐳 Docker Support**: Complete containerized deployment
- **📊 Stream Statistics**: Monitor stream health and performance

## 🏗️ Architecture

The application consists of three main components:

- **MediaMTX**: Media server for handling RTSP/RTMP streams
- **rtsp-api**: Express.js backend API for configuration management
- **rtsp-ui**: React frontend with TypeScript and Material-UI

## 📁 Project Structure

```
rtsp-to-rtmp-stream-manager/
├── docker-compose.yaml          # Docker Compose configuration
├── mediamtx.yml                # MediaMTX server configuration
├── Dockerfile                  # Main Dockerfile
├── rtsp-api/                   # Backend API
│   ├── server.js              # Express.js server
│   ├── package.json           # Node.js dependencies
│   └── Dockerfile            # API container
├── rtsp-ui/                   # Frontend UI
│   ├── src/                  # React source code
│   ├── package.json          # React dependencies
│   └── Dockerfile           # UI container
└── README.md                 # This file
```

## 🛠️ Technology Stack

### Backend
- **Node.js** (v16+) - Runtime environment
- **Express.js** (v5.1.0) - Web framework
- **YAML** - Configuration parsing
- **fs-extra** - File system operations

### Frontend
- **React** (v19.1.0) - UI framework
- **TypeScript** (v5.8.3) - Type safety
- **Material-UI** (v7.2.0) - UI components
- **Vite** (v4.5.2) - Build tool
- **Axios** - HTTP client
- **React Router** - Navigation

### Infrastructure
- **Docker** - Containerization
- **MediaMTX** - Media server
- **FFmpeg** - Video processing

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher)
- [Docker](https://www.docker.com/) and Docker Compose
- [Git](https://git-scm.com/)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/shivamskr151/rtsp-to-rtmp-Stream-Manager_Tool.git
   cd rtsp-to-rtmp-stream-manager
   ```

2. **Start with Docker Compose (Recommended)**
   ```bash
   docker-compose up -d
   ```
   
   This will start all services:
   - MediaMTX server on port 8554 (RTSP) and 1935 (RTMP)
   - API server on port 3002
   - Web UI on port 3000

3. **Access the application**
   - Web UI: http://localhost:3000
   - MediaMTX Stats: http://localhost:8888
   - API: http://localhost:3002

### Manual Setup

If you prefer to run services individually:

1. **Start MediaMTX**
   ```bash
   docker-compose up -d mediamtx
   ```

2. **Start the API server**
   ```bash
   cd rtsp-api
   npm install
   npm start
   ```

3. **Start the UI**
   ```bash
   cd rtsp-ui
   npm install
   npm run dev
   ```

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/cameras` | Get all configured cameras |
| `POST` | `/api/cameras` | Add a new camera |
| `DELETE` | `/api/cameras/:name` | Delete a camera |
| `GET` | `/api/config` | Get MediaMTX configuration |
| `POST` | `/api/config` | Update MediaMTX configuration |

### Example API Usage

```bash
# Get all cameras
curl http://localhost:3002/api/cameras

# Add a new camera
curl -X POST http://localhost:3002/api/cameras \
  -H "Content-Type: application/json" \
  -d '{
    "name": "camera1",
    "rtspUrl": "rtsp://admin:password@192.168.1.100:554/stream",
    "rtmpUrl": "rtmp://localhost:1935/live/camera1"
  }'
```

## 🎯 Usage Guide

### Adding a Camera

1. Open the web interface at http://localhost:3000
2. Click "Add Camera" in the navigation
3. Fill in the camera details:
   - **Name**: Unique identifier for the camera
   - **RTSP URL**: Source stream URL (e.g., `rtsp://admin:password@192.168.1.100:554/stream`)
   - **RTMP URL**: Destination URL (e.g., `rtmp://localhost:1935/live/camera1`)
4. Click "Add Camera" to save

### Managing Streams

- **View Cameras**: All configured cameras are displayed on the main page
- **Edit Camera**: Click the edit icon to modify camera settings
- **Delete Camera**: Click the delete icon to remove a camera
- **Monitor Streams**: Use the MediaMTX stats page to monitor stream health

## 🔧 Configuration

### Environment Variables

Create `.env` files in the respective directories:

**rtsp-api/.env:**
```env
RTSP_API_PORT=3002
MEDIAMTX_CONFIG_PATH=/mediamtx.yml
```

**rtsp-ui/.env:**
```env
RTSP_UI_PORT=3000
REACT_APP_API_URL=http://localhost:3002
```

### MediaMTX Configuration

The `mediamtx.yml` file contains the MediaMTX server configuration. Key settings:

```yaml
logLevel: info
rtmp: true
rtsp: true
api: true
apiAddress: :9997
authMethod: internal
```

## 🐳 Docker Deployment

### Production Deployment

```bash
# Build and start all services
docker-compose -f docker-compose.yaml up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Custom Ports

Modify the `docker-compose.yaml` file to change default ports:

```yaml
ports:
  - "8554:8554"     # RTSP
  - "1935:1935"     # RTMP
  - "3000:3000"     # Web UI
  - "3002:3002"     # API
```

## 🧪 Development

### Running in Development Mode

```bash
# Start MediaMTX
docker-compose up -d mediamtx

# Start API in development mode
cd rtsp-api
npm install
npm run dev

# Start UI in development mode
cd rtsp-ui
npm install
npm run dev
```

### Building for Production

```bash
# Build UI
cd rtsp-ui
npm run build

# Build API
cd rtsp-api
npm install --production
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [MediaMTX](https://github.com/bluenviron/mediamtx) - Media server
- [React](https://reactjs.org/) - UI framework
- [Material-UI](https://mui.com/) - UI components
- [Express.js](https://expressjs.com/) - Web framework

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/shivamskr151/rtsp-to-rtmp-Stream-Manager_Tool/issues) page
2. Create a new issue with detailed information
3. Include logs and configuration details

---

**Made with ❤️ by [Shivam Kumar](https://github.com/shivamskr151)** 