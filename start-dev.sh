#!/bin/bash

# Pipeline Job Board - Development Startup Script
echo "🚀 Starting Pipeline Job Board in development mode..."
echo ""

# Check if node_modules exists in both directories
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

if [ ! -d "backend/node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    cd backend && npm install && cd ..
fi

echo ""
echo "🔥 Starting both frontend and backend servers..."
echo "   Frontend will be available at: http://localhost:3000"
echo "   Backend will be available at: http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Start both servers concurrently
npm run dev