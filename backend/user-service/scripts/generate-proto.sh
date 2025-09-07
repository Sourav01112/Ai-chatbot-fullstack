#!/bin/bash

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Get the project root (parent of scripts directory)
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🚀 Setting up User Service."
echo "📍 Project root: $PROJECT_ROOT"

# Change to project root
cd "$PROJECT_ROOT"

# 1. Install protobuf tools (one time)
echo "📦 Installing protobuf tools..."
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest

# 2. Check if proto file exists
echo "🔍 Checking proto file..."
if [ ! -f "proto/user_service.proto" ]; then
    echo "❌ Proto file not found at: $(pwd)/proto/user_service.proto"
    echo "📁 Current directory contents:"
    ls -la
    echo "📁 Proto directory contents:"
    ls -la proto/ 2>/dev/null || echo "Proto directory doesn't exist"
    exit 1
fi

echo "✅ Proto file found: $(pwd)/proto/user_service.proto"

# 3. Clean old generated files
echo "🧹 Cleaning old proto files..."
rm -f proto/*.pb.go
echo "✅ Old proto files cleaned"

# 4. Generate proto files
echo "🔧 Generating protobuf files..."
protoc --go_out=proto \
       --go_opt=paths=source_relative \
       --go-grpc_out=proto \
       --go-grpc_opt=paths=source_relative \
       --proto_path=proto \
       proto/user_service.proto

# Verify generation was successful
if [ -f "proto/user_service.pb.go" ] && [ -f "proto/user_service_grpc.pb.go" ]; then
    echo "✅ Proto files generated successfully"
    echo "   📄 Generated: proto/user_service.pb.go"
    echo "   📄 Generated: proto/user_service_grpc.pb.go"
else
    echo "❌ Proto generation failed"
    echo "📁 Proto directory after generation:"
    ls -la proto/
    exit 1
fi

# 5. Download dependencies
echo "📥 Getting dependencies..."
go mod tidy

# 6. Test compilation
echo "🔍 Testing compilation..."
go build ./cmd/server

if [ $? -eq 0 ]; then
    echo "✅ Compilation successful"
else
    echo "❌ Compilation failed"
    exit 1
fi

echo "🎉 Setup complete! Your User Service is ready to run."


# gRPC 
# evans --host localhost --port 50052 --proto proto/user_service.proto

# package user
# service UserService  
# show service
# call Register