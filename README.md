# RTSP/RTMP Manager

A web application to dynamically manage RTSP and RTMP streams using MediaMTX.

## Features

- View all configured cameras
- Add new camera configurations with RTSP source and RTMP destination
- Delete existing camera configurations
- Real-time updates to MediaMTX configuration

## Project Structure

- `rtsp-api`: Express.js backend API to manage MediaMTX configuration
- `rtsp-ui`: React frontend UI for managing cameras
- `mediamtx.yml`: MediaMTX configuration file
- `docker-compose.yaml`: Docker Compose configuration for MediaMTX

## Setup Instructions

### Prerequisites

- Node.js (v16+)
- npm or yarn
- Docker and Docker Compose (for MediaMTX)

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd rtsp
```

2. Start MediaMTX using Docker:

```bash
docker-compose up -d
```

3. Start the backend API:

```bash
cd rtsp-api
npm install
npm start
```

4. Start the frontend UI:

```bash
cd rtsp-ui
npm install
npm run dev
```

5. Open your browser and navigate to `http://localhost:5173`

## API Endpoints

- `GET /api/cameras`: Get all configured cameras
- `POST /api/cameras`: Add a new camera
- `DELETE /api/cameras/:name`: Delete a camera
- `GET /api/config`: Get the full MediaMTX configuration
- `POST /api/config`: Update the full MediaMTX configuration

## Usage

1. Add a new camera by clicking "Add Camera" in the navigation bar
2. Fill in the camera details:
   - Name: A unique identifier for the camera
   - RTSP URL: The source RTSP stream URL
   - RTMP URL: The destination RTMP URL where the stream will be published
3. View all cameras on the main page
4. Delete cameras as needed

## License

MIT 