.PHONY: proto proto-clean

# Generate protobuf files
proto:
	@echo "Generating protobuf files..."
	@mkdir -p proto
	protoc --go_out=. \
	       --go_opt=paths=source_relative \
	       --go-grpc_out=. \
	       --go-grpc_opt=paths=source_relative \
	       --proto_path=. \
	       proto/*.proto
	@echo "✅ Proto files generated successfully!"

# Clean generated proto files
proto-clean:
	@echo "Cleaning generated proto files..."
	@rm -f proto/*.pb.go
	@echo "✅ Proto files cleaned!"

# Build with proto generation
build: proto
	@echo "Building application..."
	@mkdir -p bin
	$(GOBUILD) -o bin/$(BINARY_NAME) -v ./cmd/server

# Development with proto
dev: proto
	@echo "Starting development server..."
	air