# Cloud Hosting & Native Electron Deployment Guide

This document outlines the steps to host the Mario POS backend on a cloud server and distribute the frontend as a native Electron application.

## 1. Overview: Is it possible?
**Yes, it is absolutely possible and a standard architectural pattern.**
In this setup:
- The **Backend** (Django, PostgreSQL, Redis) runs on a remote cloud server (e.g., AWS, DigitalOcean, Azure).
- The **Frontend** (Next.js + Electron) runs locally on the user's machines as a native application.
- Communication happens over HTTPS between the local Electron app and the remote Cloud API.

---

## 2. Backend Configuration (Cloud Server)

### Infrastructure Requirements
- **Server**: A VPS (Virtual Private Server) with at least 2GB RAM (e.g., DigitalOcean Droplet, AWS EC2 t3.small).
- **OS**: Ubuntu 22.04 LTS or similar Linux distribution.
- **Tools**: Docker and Docker Compose installed.

### Step-by-Step Backend Deployment

#### A. Prepare the Server
1. Point your domain (e.g., `api.mariopos.com`) to your server's IP address.
2. Install Docker and Docker Compose on the server.

#### B. Security & Environment Variables
Create a `.env` file on the server with production values:
```bash
DEBUG=False
SECRET_KEY=your-super-secret-production-key
ALLOWED_HOSTS=api.mariopos.com
CORS_ALLOWED_ORIGINS=https://localhost:3000,http://localhost:3000
# Note: Electron apps often run on local file protocols or custom schemes.
# To be safe for Electron, you may need to allow all origins or specifically handle the 'file://' protocol.
CORS_ALLOW_ALL_ORIGINS=True # Recommended for initial native app setup
DATABASE_URL=postgres://posuser:password@db:5432/posdb
REDIS_URL=redis://redis:6379/1
```

#### C. Production Docker Setup
You should update the `web` service in `docker-compose.yml` to use a production server like **Gunicorn**:
```yaml
# Example production snippet for 'web' service
command: gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 3
```

#### D. Nginx & SSL (Reverse Proxy)
Use Nginx as a reverse proxy to handle SSL (HTTPS) and serve static/media files.
1. Install Nginx: `sudo apt install nginx`
2. Configure Nginx to forward requests to port 8000.
3. Use **Certbot** for free SSL certificates:
   ```bash
   sudo certbot --nginx -d api.mariopos.com
   ```

---

## 3. Frontend Configuration (Native Electron App)

To package the frontend as a native app that points to your new cloud backend, follow these steps:

### A. Point to the Cloud API
Before building the app, you must tell the frontend where the remote API is located.
Create or update `frontend/.env.production`:
```env
NEXT_PUBLIC_API_URL=https://api.mariopos.com/api
```

### B. Build and Package
Run the following commands in the `frontend` directory:
```bash
# Install dependencies
npm install

# Package the application for your OS (Windows/Mac/Linux)
npm run electron:build
```
This command (via `electron-builder`) will:
1. Compile the Next.js application (`next build`).
2. Package the compiled files into a native executable inside the `frontend/dist/` folder.

---

## 4. Key Configurations Checklist

| Component | Configuration Needed | Recommendation |
| :--- | :--- | :--- |
| **Backend API** | `ALLOWED_HOSTS` | Set to your domain (e.g., `api.mariopos.com`). |
| **Backend CORS** | `CORS_ALLOWED_ORIGINS` | Use `CORS_ALLOW_ALL_ORIGINS=True` or explicitly handle the Electron origin. |
| **Backend Security** | SSL / HTTPS | **Mandatory.** Electron will block non-HTTPS requests to remote servers by default. |
| **Frontend API** | `NEXT_PUBLIC_API_URL` | Must point to `https://api.mariopos.com/api`. |
| **Electron Build** | `electron-builder` | Ensure `appId` and `productName` are set correctly in `package.json`. |

---

## 5. Deployment Workflow Summary
1. **Push Code** to a repository (GitHub/GitLab).
2. **Pull Code** on the Cloud Server.
3. **Run Backend**: `docker-compose up -d --build`.
4. **Setup SSL**: Point domain and run Certbot.
5. **Build Native App**: Run `npm run electron:build` on your local development machine.
6. **Distribute**: Send the generated `.exe` (Windows) or `.dmg` (Mac) from `frontend/dist/` to your users.
