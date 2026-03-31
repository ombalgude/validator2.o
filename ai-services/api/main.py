from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="AI Certificate Verification Service",
    description="AI-powered certificate verification handling frontend OCR data",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Note: Change "*" to your frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- MODELS ---
# This defines exactly what data we expect from the frontend
class OCRPayload(BaseModel):
    raw_text: str
    confidence: float

# --- ROUTES ---

@app.get("/")
async def root():
    """Root endpoint to verify the service is running."""
    return {"message": "AI Certificate Verification Service", "status": "running"}

@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring."""
    return {"status": "healthy", "service": "ai-verification"}

@app.post("/ai/process-ocr")
async def process_frontend_ocr(data: OCRPayload):
    """
    Receives extracted text and confidence score from the frontend.
    """
    try:
        logger.info(f"Received OCR data. Confidence: {data.confidence}%")
        print(data.raw_text)
        
        # We will add the actual AI verification/regex logic here later
        
        return {
            "success": True,
            "message": "OCR data received successfully",
            "received_data": {
                "text_length": len(data.raw_text),
                "confidence": data.confidence
            }
        }
    except Exception as e:
        logger.error(f"Error processing OCR data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    # Runs the server on port 8001
    uvicorn.run(app, host="0.0.0.0", port=8001)