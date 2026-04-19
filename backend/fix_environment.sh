#!/bin/bash

# POS Environment Repair Script
echo "🔍 Detecting Python environment..."

PYTHON_EXE=$(which python3)
PIP_EXE=$(which pip3)

echo "✅ Python found at: $PYTHON_EXE"
echo "✅ Pip found at: $PIP_EXE"

echo "📦 Installing missing dependencies into your active environment..."

# Install into the current shell's python environment
$PYTHON_EXE -m pip install django-cors-headers psycopg2-binary django-environ djangorestframework djangorestframework-simplejwt

if [ $? -eq 0 ]; then
    echo "🎉 Dependencies installed successfully!"
    echo "🚀 You can now start the server with: python3 manage.py runserver"
else
    echo "❌ Installation failed. You might need to run with sudo if using system python: sudo $PYTHON_EXE -m pip install django-cors-headers"
fi

# Check if we should also fix the project venv
if [ -d "./venv" ]; then
    echo "📂 Local virtual environment found. Syncing it as well..."
    ./venv/bin/python3 -m pip install -r requirements.txt
fi
