#!/bin/bash
# Compile gRPC protobuf files

set -e

echo "Compiling protobuf files..."

PROTO_DIR="shared/grpc/protos"
OUT_DIR="shared/grpc/generated"

# Create output directory
mkdir -p "$OUT_DIR"

# Compile each proto file
for proto_file in "$PROTO_DIR"/*.proto; do
    echo "Compiling $(basename "$proto_file")..."
    python -m grpc_tools.protoc \
        -I"$PROTO_DIR" \
        --python_out="$OUT_DIR" \
        --grpc_python_out="$OUT_DIR" \
        --pyi_out="$OUT_DIR" \
        "$proto_file"
done

# Create __init__.py
touch "$OUT_DIR/__init__.py"

echo "✓ Protocol buffers compiled successfully"

