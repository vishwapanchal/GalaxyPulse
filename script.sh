#!/bin/bash

echo "🚀 Bringing GalaxyPulse LIVE..."

# Define paths
ROOT_DIR=$(pwd)
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

# 1. Start Backend
echo "======================================"
echo "⚙️  Starting Backend (FastAPI)"
echo "======================================"
cd "$BACKEND_DIR" || exit

# Check if python or python3 is available
PYTHON="python"
if ! command -v $PYTHON &> /dev/null; then
    PYTHON="python3"
fi

if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    $PYTHON -m venv venv
fi

# Activate virtual environment
if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]] || [[ "$OSTYPE" == "win32" ]]; then
    source venv/Scripts/activate
else
    source venv/bin/activate
fi

echo "Installing backend dependencies..."
pip install -r requirements.txt

echo "Starting Uvicorn server..."
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# 2. Start Frontend
echo "======================================"
echo "🌐 Starting Frontend (Next.js)"
echo "======================================"
cd "$FRONTEND_DIR" || exit

if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install --legacy-peer-deps
fi

echo "Starting Next.js development server..."
npm run dev &
FRONTEND_PID=$!

# 3. Wait and cleanup
echo "======================================"
echo "✅ GalaxyPulse is now LIVE!"
echo "📡 Backend API: http://localhost:8000"
echo "🖥️  Frontend UI: http://localhost:3000"
echo "🛑 Press [CTRL+C] to stop both servers."
echo "======================================"

# Handle termination gracefully
trap "echo -e '\nShutting down servers...'; kill $BACKEND_PID; kill $FRONTEND_PID; exit" INT TERM
wait
