.PHONY: build run test clean proto deps docker-build docker-run dev-env help

APP_NAME=chat-service
VERSION?=1.0.0
DOCKER_IMAGE=$(APP_NAME):$(VERSION)

GOCMD=go
GOBUILD=$(GOCMD) build
GOTEST=$(GOCMD) test
GOMOD=$(GOCMD) mod
BINARY_DIR=bin
BINARY_NAME=$(APP_NAME)

build: proto
	@echo "Building $(APP_NAME)..."
	@mkdir -p $(BINARY_DIR)
	$(GOBUILD) -o $(BINARY_DIR)/$(BINARY_NAME) -v ./cmd/server

run: build
	@echo "Running $(APP_NAME)..."
	./$(BINARY_DIR)/$(BINARY_NAME)

dev:
	@echo "Starting development server with live reload..."
	air

test:
	@echo "Running tests..."
	$(GOTEST) -v -race -coverprofile=coverage.out ./...

test-coverage: test
	@echo "Generating coverage report..."
	$(GOCMD) tool cover -html=coverage.out -o coverage.html

clean:
	@echo "Cleaning..."
	@rm -rf $(BINARY_DIR)
	@rm -f coverage.out coverage.html

proto:
	@echo "Generating protobuf files..."
	@mkdir -p proto/generated
	protoc --go_out=proto/generated --go_opt=paths=source_relative \
		--go-grpc_out=proto/generated --go-grpc_opt=paths=source_relative \
		proto/*.proto

deps:
	@echo "Downloading dependencies..."
	$(GOMOD) download
	$(GOMOD) tidy

fmt:
	@echo "Formatting code..."
	$(GOCMD) fmt ./...

lint:
	@echo "Linting code..."
	golangci-lint run

migrate-up:
	@echo "Running database migrations..."
	migrate -path migrations -database "$(DATABASE_URL)" up

migrate-down:
	@echo "Rolling back database migrations..."
	migrate -path migrations -database "$(DATABASE_URL)" down

docker-build:
	@echo "Building Docker image..."
	docker build -t $(DOCKER_IMAGE) .

docker-run: docker-build
	@echo "Running Docker container..."
	docker run --rm -p 50051:50051 --env-file .env $(DOCKER_IMAGE)

dev-env:
	@echo "Starting development environment..."
	docker-compose -f docker-compose.dev.yml up -d

dev-env-down:
	@echo "Stopping development environment..."
	docker-compose -f docker-compose.dev.yml down

help:
	@echo "Available commands:"
	@echo "  build       - Build the application"
	@echo "  run         - Build and run the application"
	@echo "  dev         - Run with live reload"
	@echo "  test        - Run tests"
	@echo "  clean       - Clean build artifacts"
	@echo "  proto       - Generate protobuf files"
	@echo "  deps        - Download dependencies"
	@echo "  docker-build - Build Docker image"
	@echo "  dev-env     - Start development environment"