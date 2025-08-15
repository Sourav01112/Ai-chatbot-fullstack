# run server 
source venv/bin/activate
PYTHONPATH=. python app/main.py
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
python main.py


# Set environment variable to allow external connections
## --> cmd: $env:OLLAMA_HOST="0.0.0.0"
ollama serve


# on windows ----
# Stop the service first
ollama stop

# Set environment variable and start
set OLLAMA_HOST=0.0.0.0:11434
ollama serve

# 1. Flash Attention is a memory-efficient attention mechanism 
# 2. # KV Cache (Key-Value Cache) stores previous conversation context to avoid recomputing
1. set OLLAMA_FLASH_ATTENTION=1
2. set OLLAMA_KV_CACHE_TYPE=q8_0

ollama serve



# Set environment variables for better Windows performance
[Environment]::SetEnvironmentVariable("OLLAMA_NUM_PARALLEL", "1", "Machine")
[Environment]::SetEnvironmentVariable("OLLAMA_MAX_LOADED_MODELS", "1", "Machine")
[Environment]::SetEnvironmentVariable("OLLAMA_FLASH_ATTENTION", "1", "Machine")
[Environment]::SetEnvironmentVariable("OLLAMA_HOST", "127.0.0.1:11434", "Machine")

# Restart Ollama service
Stop-Process -Name "ollama" -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3
& "ollama" serve

# on windows ends ----

# on MAC ----->
brew services stop ollama
brew services list | grep ollama
OLLAMA_FLASH_ATTENTION="1" OLLAMA_KV_CACHE_TYPE="q8_0" ollama serve




# main packages
pip install pipreqs
pipreqs ./app --force

# Tree 
backend/app/
├── api/         → FastAPI route handlers (chat, auth)
├── core/        → Core app setup (config, settings, logging)
├── models/      → Pydantic models or DB schemas
├── services/    → Business logic (Ollama, external APIs, etc.)
├── main.py      → Entrypoint for FastAPI




curl http://192.168.1.11:11434/api/generate -d '{
  "model": "llama2:13b",
  "prompt": "Explain diffusion models in AI",
  "stream": false
}'


curl -X POST "http://localhost:8000/api/chat/send" \
-H "Content-Type: application/json" \
-d '{
  "model": "llama2:13b",
  "stream": true,
  "message": "Explain diffusion models in AI."
}'


