# ============================================================
# Stage 1 — Build the React frontend
# ============================================================
FROM node:22-alpine AS frontend-build

WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci
COPY frontend/ ./

ARG VITE_FIREBASE_API_KEY=AIzaSyBnMtFzmT1uT-CX1hJsPmdG-SfW6JrZPdc
ARG VITE_FIREBASE_AUTH_DOMAIN=vertaistudy.firebaseapp.com
ARG VITE_FIREBASE_PROJECT_ID=vertaistudy
ARG VITE_FIREBASE_STORAGE_BUCKET=vertaistudy.firebasestorage.app
ARG VITE_FIREBASE_MESSAGING_SENDER_ID=1073320994553
ARG VITE_FIREBASE_APP_ID=1:1073320994553:web:f92b082a5de6ba684b6428
ARG VITE_FIREBASE_MEASUREMENT_ID=G-T1GV4DKJJ6

ENV VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY \
    VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN \
    VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID \
    VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET \
    VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID \
    VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID \
    VITE_FIREBASE_MEASUREMENT_ID=$VITE_FIREBASE_MEASUREMENT_ID

RUN npm run build

# ============================================================
# Stage 2 — Python backend + compiled frontend
# ============================================================
FROM python:3.12-slim AS runtime

# Prevent Python from writing .pyc files and enable unbuffered output
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install Python dependencies first (cached unless requirements change)
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code
COPY api.py cli.py firestore_session.py lead_service.py ./
COPY agency_director/ ./agency_director/
COPY web_researcher/ ./web_researcher/
COPY shared/ ./shared/

# Copy the built frontend from Stage 1
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# Cloud Run injects $PORT (defaults to 8080)
ENV PORT=8080
EXPOSE ${PORT}

CMD ["sh", "-c", "uvicorn api:app --host 0.0.0.0 --port ${PORT} --proxy-headers --forwarded-allow-ips='*'"]
