# Dockerfile for TaX-Ray-Canada
FROM node:20-slim

# Install Python and system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
RUN python3 -m pip install --break-system-packages --no-cache-dir --upgrade pip
RUN python3 -m pip install --break-system-packages --no-cache-dir \
    openpyxl>=3.1.5 \
    pandas>=2.3.0 \
    pdfplumber>=0.11.7 \
    pypdf2>=3.0.1

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build the application (frontend only, skip esbuild for server)
RUN npm run build:frontend

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Start the application using tsx
CMD ["npx", "tsx", "server/index.ts"]
