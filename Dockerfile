FROM alpine:latest

# Install MediaMTX and ffmpeg
RUN apk add --no-cache \
    ffmpeg \
    wget \
    ca-certificates

# Download and install MediaMTX
RUN wget -O /tmp/mediamtx.tar.gz https://github.com/bluenviron/mediamtx/releases/download/v1.12.3/mediamtx_v1.12.3_linux_amd64.tar.gz && \
    tar -xzf /tmp/mediamtx.tar.gz -C /tmp && \
    mv /tmp/mediamtx /usr/local/bin/mediamtx && \
    chmod +x /usr/local/bin/mediamtx && \
    rm -rf /tmp/*

# Set the ffmpeg path
ENV MEDIAMTX_FFMPEG_PATH=/usr/bin/ffmpeg

# Default command
CMD ["mediamtx", "/mediamtx.yml"] 