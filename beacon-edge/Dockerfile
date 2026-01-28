######################################################################
# Project BEACON Edge Gateway Dockerfile
#
# - Target: Raspberry Pi Zero 2 W (ARMv7/v8)
# - Python 3.9, minimal image
# - Installs dependencies and copies all code
# - Uses .env for configuration (see docker-compose.yml)
# - Entrypoint: main.py (runs harvester and syncer threads)
#
# Usage:
#   docker build -t beacon-edge .
#   docker run --env-file .env beacon-edge
#
# For development, use docker-compose.yml for memory limits and volume.
######################################################################
FROM python:3.9-slim-buster

# Set working directory
WORKDIR /app

# Install Python dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Set environment variables for production
ENV PYTHONUNBUFFERED=1

# Run the main entry point
CMD ["python", "main.py"]