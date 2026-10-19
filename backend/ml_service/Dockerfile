# Gunakan image Python
FROM python:3.10-slim

# Install libgomp1 (wajib untuk XGBoost / LightGBM)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# User non-root
RUN useradd -m -u 1000 user
USER user
ENV PATH="/home/user/.local/bin:$PATH"

WORKDIR /app

# Copy dan install requirements
COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy semua file program dan model AI
COPY --chown=user . .

ENV PORT=7860
EXPOSE 7860

# Jalankan server FastAPI dengan port dinamis
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-7860}"]
