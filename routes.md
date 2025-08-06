curl -N -X POST "http://localhost:8000/api/chat/stream" \
-H "Content-Type: application/json" \
-d '{
  "message": "Tell me a short joke",
  "model": "llama2:7b",
  "stream": true
}'