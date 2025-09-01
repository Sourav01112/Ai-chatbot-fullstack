#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🚀 Setting up Chat Service."
echo "📍 Project root: $PROJECT_ROOT"

cd "$PROJECT_ROOT"

echo "📦 Installing protobuf tools..."
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest

echo "🔍 Checking proto file..."
if [ ! -f "proto/chat_service.proto" ]; then
    echo "❌ Proto file not found at: $(pwd)/proto/chat_service.proto"
    echo "📁 Current directory contents:"
    ls -la
    echo "📁 Proto directory contents:"
    ls -la proto/ 2>/dev/null || echo "Proto directory doesn't exist"
    exit 1
fi

echo "✅ Proto file found: $(pwd)/proto/chat_service.proto"

echo "🧹 Cleaning old proto files..."
rm -f proto/*.pb.go
echo "✅ Old proto files cleaned"

echo "🔧 Generating protobuf files..."
protoc --go_out=proto \
       --go_opt=paths=source_relative \
       --go-grpc_out=proto \
       --go-grpc_opt=paths=source_relative \
       --proto_path=proto \
       proto/chat_service.proto

if [ -f "proto/chat_service.pb.go" ] && [ -f "proto/chat_service_grpc.pb.go" ]; then
    echo "✅ Proto files generated successfully"
    echo "   📄 Generated: proto/chat_service.pb.go"
    echo "   📄 Generated: proto/chat_service_grpc.pb.go"
else
    echo "❌ Proto generation failed"
    echo "📁 Proto directory after generation:"
    ls -la proto/
    exit 1
fi

echo "📥 Getting dependencies..."
go mod tidy

echo "🔍 Testing compilation..."
go build ./cmd/server

if [ $? -eq 0 ]; then
    echo "✅ Compilation successful"
else
    echo "❌ Compilation failed"
    exit 1
fi

echo "🎉 Setup complete! Your Chat Service is ready to run."


# gRPC 
# evans --host localhost --port 50052 --proto proto/chat_service.proto

# package user
# service UserService  
# show service
# call Register