FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
EXPOSE 5000

# Run the FastAPI app using Uvicorn.
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "5000"]
