# syntax=docker/dockerfile:1

FROM node:20-alpine AS frontend-builder
WORKDIR /workspace/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend ./
RUN npm run build

FROM python:3.12-slim
WORKDIR /app
RUN python -m pip install --no-cache-dir uvicorn fastapi python-dotenv httpx
COPY backend /app/backend
COPY --from=frontend-builder /workspace/frontend/out /app/backend/frontend_out
EXPOSE 8000
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
