FROM python:3.10-slim
WORKDIR /app

# Tesseract aur PDF tools install karna
RUN apt-get update && apt-get install -y tesseract-ocr libtesseract-dev poppler-utils

# Python requirements install karna
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Saara code copy karke AI models ready karna
COPY . .
RUN python train_dummy_models.py

# Server start karna
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-10000}
