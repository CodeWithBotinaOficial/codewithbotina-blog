#!/bin/bash
set -e

echo "🔨 Building CodeWithBotina Blog..."

# Build Frontend (Astro/Node.js)
echo "📦 Building Frontend (Astro)..."
cd frontend
npm run build
cd ..

echo "✅ Frontend built successfully"

# Build Backend (Deno)
echo "🦕 Building Backend (Deno)..."
cd backend
deno task build
cd ..

echo "✅ Backend built successfully"

echo "🎉 Build complete!"
