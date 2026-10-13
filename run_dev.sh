#!/bin/bash

set -e

echo "================================================="
echo " Starting Multi-Agent Starter System"
echo "================================================="

# Pre-flight check: Root .env file
if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    echo "⚠️  No root .env found. Generating .env from .env.example..."
    cp .env.example .env
    echo "👉 Please edit .env with your GOOGLE_API_KEY and credentials."
  fi
fi

# Pre-flight check: Frontend .env file
if [ ! -f frontend/.env.development ] && [ -f frontend/.env.example ]; then
  echo "⚠️  No frontend/.env.development found. Generating from frontend/.env.example..."
  cp frontend/.env.example frontend/.env.development
fi

# Pre-flight check: Frontend dependencies
if [ ! -d frontend/node_modules ]; then
  echo "📦 Installing frontend node modules..."
  (cd frontend && npm install)
fi

# Start FastAPI backend
echo "🚀 Starting FastAPI Backend on port 8000..."
uvicorn api:app --reload --port 8000 &
BACKEND_PID=$!

# Start Vite frontend
echo "🚀 Starting Vite Frontend on port 5173..."
(cd frontend && npm run dev) &
FRONTEND_PID=$!

# Trap SIGINT and SIGTERM to cleanly shut down both servers
trap "echo 'Shutting down servers...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM

echo "✅ System initialized:"
echo "   Backend API: http://localhost:8000"
echo "   Frontend UI: http://localhost:5173"
echo "Press Ctrl+C to stop both servers."

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
