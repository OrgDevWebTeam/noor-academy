# Docker image for the AI service (mock mode on laptops). Owner: Qussai.
# Build from services/ai/: docker build -t noor-ai .
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

ENV MOCK_MODE=true
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
