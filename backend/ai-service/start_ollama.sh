#!/usr/bin/env bash
set -e

###########################################################################
# 0. Sanity checks & required packages
###########################################################################
if ! command -v nvidia-smi >/dev/null 2>&1; then
  echo "❌  NVIDIA driver not found — install it first."; exit 1; fi

if ! dpkg -l | grep -q nvidia-cuda-toolkit; then
  echo "→ Installing CUDA userspace libraries …"
  sudo apt-get update && sudo apt-get install -y nvidia-cuda-toolkit
fi

###########################################################################
# 1. Install Ollama if it is not already present
###########################################################################
if ! command -v ollama >/dev/null 2>&1; then
  echo "→ Installing Ollama …"
  curl -fsSL https://ollama.com/install.sh | sh
fi

###########################################################################
# 2. Stop any existing ollama service to prevent conflicts
###########################################################################
if systemctl is-active --quiet ollama.service 2>/dev/null; then
  echo "→ Stopping existing Ollama service..."
  sudo systemctl stop ollama.service
fi

# Reset failed service state if it exists
sudo systemctl reset-failed ollama.service 2>/dev/null || true

###########################################################################
# 3. Create a dedicated systemd unit with proper configuration
###########################################################################
sudo bash -c 'cat >/etc/systemd/system/ollama.service' <<'UNIT'
[Unit]
Description=Ollama local LLM service
After=network.target nvidia-persistenced.service

[Service]
Type=exec
Environment=CUDA_VISIBLE_DEVICES=0
Environment=OLLAMA_HOST=127.0.0.1:11434
ExecStart=/usr/local/bin/ollama serve
Restart=on-failure
RestartSec=10
StartLimitBurst=3
StartLimitInterval=60
User=root
Group=root

[Install]
WantedBy=multi-user.target
UNIT

sudo systemctl daemon-reload

###########################################################################
# 4. Check if Ollama is running, start if needed
###########################################################################
echo "→ Checking if Ollama is running..."

# First try to start the service
if ! systemctl is-active --quiet ollama.service; then
  echo "→ Starting Ollama service..."
  sudo systemctl enable ollama.service
  sudo systemctl start ollama.service
  
  # Wait for service to start
  sleep 5
fi

# Check if the service is responding
MAX_RETRIES=10
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if curl -s http://127.0.0.1:11434 >/dev/null 2>&1; then
    echo "✅  Ollama service is running and responding"
    break
  else
    echo "→ Waiting for Ollama to start... (attempt $((RETRY_COUNT + 1))/$MAX_RETRIES)"
    sleep 3
    RETRY_COUNT=$((RETRY_COUNT + 1))
  fi
done

# If still not responding, try manual start
if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
  echo "→ Service not responding, trying manual start..."
  sudo systemctl stop ollama.service 2>/dev/null || true
  
  # Start ollama serve in background
  nohup /usr/local/bin/ollama serve > /tmp/ollama.log 2>&1 &
  OLLAMA_PID=$!
  
  sleep 5
  
  if curl -s http://127.0.0.1:11434 >/dev/null 2>&1; then
    echo "✅  Ollama started manually (PID: $OLLAMA_PID)"
  else
    echo "❌  Failed to start Ollama. Check logs:"
    cat /tmp/ollama.log
    exit 1
  fi
fi

###########################################################################
# 5. Check if model exists, pull if not present
###########################################################################
MODEL_NAME="mistral:7b-instruct-v0.2-q4_K_M"

if ollama list | grep -q "$MODEL_NAME" 2>/dev/null; then
  echo "✅  Model $MODEL_NAME already installed, skipping download..."
else
  echo "→ Model not found, pulling $MODEL_NAME …"
  ollama pull "$MODEL_NAME"
fi

###########################################################################
# 6. Warm-load the model so the first request is instant
###########################################################################
echo "→ Warming up the model..."
curl -s http://127.0.0.1:11434/api/generate \
     -d "{\"model\":\"$MODEL_NAME\",\"prompt\":\"ping\",\"stream\":false}" >/dev/null

###########################################################################
# 7. Show GPU memory usage for confirmation
###########################################################################
nvidia-smi
echo "✅  Ollama is up at http://127.0.0.1:11434"
