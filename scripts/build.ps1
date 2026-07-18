Write-Host "🔨 Building CodeWithBotina Blog..."

# Build Frontend (Astro/Node.js)
Write-Host "📦 Building Frontend (Astro)..."
Set-Location frontend
npm run build
Set-Location ..

Write-Host "✅ Frontend built successfully"

# Build Backend (Deno)
Write-Host "🦕 Building Backend (Deno)..."
Set-Location backend
deno task build
Set-Location ..

Write-Host "✅ Backend built successfully"

Write-Host "🎉 Build complete!"
