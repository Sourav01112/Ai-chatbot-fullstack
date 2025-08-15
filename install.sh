#!/bin/bash

# Exit immediately if a command fails
set -e

BASE_DIR="user-service"

echo "Creating project structure..."

# Create folder structure
mkdir -p $BASE_DIR/cmd/server
mkdir -p $BASE_DIR/internal/{grpc,models,repository,service,auth}
mkdir -p $BASE_DIR/{proto,migrations}

# Navigate into project folder
cd $BASE_DIR

# Initialize Go module if not already initialized
if [ ! -f go.mod ]; then
    echo "Initializing Go module..."
    go mod init user-service
fi

# Create a basic main.go if not present
MAIN_FILE="cmd/server/main.go"
if [ ! -f $MAIN_FILE ]; then
    cat <<EOL > $MAIN_FILE
package main

import (
    "fmt"
    "net"

    "google.golang.org/grpc"
)

func main() {
    fmt.Println("Starting User Service gRPC server...")

    lis, err := net.Listen("tcp", ":50052")
    if err != nil {
        panic(err)
    }

    grpcServer := grpc.NewServer()
    // TODO: Register your gRPC services here

    if err := grpcServer.Serve(lis); err != nil {
        panic(err)
    }
}
EOL
fi

# Create a basic .gitignore
if [ ! -f .gitignore ]; then
    cat <<EOL > .gitignore
/bin/
/vendor/
/*.exe
*.log
EOL
fi

echo "Installing gRPC and JWT dependencies..."
# Install gRPC and protobuf for Go
go get google.golang.org/grpc
go get google.golang.org/protobuf

# Install JWT library
go get github.com/golang-jwt/jwt/v5

echo "Project setup complete!"
