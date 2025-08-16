# AI Chatbot Microservices

Production-grade distributed AI chatbot with microservices architecture, RAG capabilities, and comprehensive observability.

## Architecture

```
Next.js Frontend → API Gateway → [Chat | AI | User] Services → [PostgreSQL | Elasticsearch | Redis | RabbitMQ]
```

## Tech Stack

**Services**: Node.js with TypeScript (Gateway), Go (Chat/User), Python/FastAPI (AI)
**Data**: PostgreSQL, Elasticsearch, Redis, RabbitMQ  
**Monitoring**: Prometheus, Grafana, ELK Stack
**Infrastructure**: Docker, Kubernetes, CI/CD

## Features

- Multi-turn conversations with context
- Hybrid search RAG with Elasticsearch
- Real-time WebSocket communication
- Event-driven async processing
- Auto-scaling and load balancing
- Full observability stack

## Quick Start

```bash
curl http://localhost:8080/health
```

## Services

- **API Gateway** (:8080) - Routing, auth, rate limiting
- **Chat Service** (:8081) - Conversation management
- **AI Service** (:8082) - Ollama integration, RAG
- **User Service** (:8083) - User management

## Monitoring

- Grafana: http://localhost:3000
- Kibana: http://localhost:5601
- Prometheus: http://localhost:9090
