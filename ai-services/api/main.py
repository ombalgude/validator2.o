from fastapi import FastAPI, File, UploadFile, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import os
import tempfile
import json
from typing import Dict, Any
import logging

from ocr_service import OCRService
from image_analysis import ImageAnalysisService

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="AI Certificate Verification Service",
    description="AI-powered certificate verification and tampering detection",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
ocr_service = OCRService()
image_analyzer = ImageAnalysisService()

# Create upload directory
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.get("/")
async def root():
    return {"message": "AI Certificate Verification Service", "status": "running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ai-verification"}

@app.post("/ai/ocr/extract")
async def extract_text(file: UploadFile = File(...)):
    """
    Extract text from uploaded document using OCR
    """
    try:
        # Validate file type
        if not file.content_type.startswith(('image/', 'application/pdf')):
            raise HTTPException(status_code=400, detail="Only images and PDF files are allowed")
        
        # Save uploaded file
        with tempfile.NamedTemporaryFile(delete=False, suffix=f"_{file.filename}") as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_file_path = tmp_file.name
        
        try:
            # Process based on file type
            if file.content_type == "application/pdf":
                result = ocr_service.extract_from_pdf(tmp_file_path)
            else:
                result = ocr_service.extract_text(tmp_file_path)
            
            # Validate extracted data
            validation = ocr_service.validate_certificate_data(result.get('structured_data', {}))
            
            return JSONResponse(content={
                "success": True,
                "data": result,
                "validation": validation
            })
            
        finally:
            # Clean up temporary file
            if os.path.exists(tmp_file_path):
                os.unlink(tmp_file_path)
                
    except Exception as e:
        logger.error(f"OCR extraction error: {e}")
        raise HTTPException(status_code=500, detail=f"OCR extraction failed: {str(e)}")

@app.post("/ai/verify/tampering")
async def detect_tampering(file: UploadFile = File(...)):
    """
    Detect image tampering and forgery
    """
    try:
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="Only image files are allowed")
        
        # Save uploaded file
        with tempfile.NamedTemporaryFile(delete=False, suffix=f"_{file.filename}") as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_file_path = tmp_file.name
        
        try:
            # Analyze image for tampering
            tampering_result = image_analyzer.detect_tampering(tmp_file_path)
            
            # Calculate image hash
            image_hash = image_analyzer.calculate_image_hash(tmp_file_path)
            
            return JSONResponse(content={
                "success": True,
                "tampering_analysis": tampering_result,
                "image_hash": image_hash
            })
            
        finally:
            # Clean up temporary file
            if os.path.exists(tmp_file_path):
                os.unlink(tmp_file_path)
                
    except Exception as e:
        logger.error(f"Tampering detection error: {e}")
        raise HTTPException(status_code=500, detail=f"Tampering detection failed: {str(e)}")

@app.post("/ai/verify/template")
async def match_template(file: UploadFile = File(...), template_id: str = None):
    """
    Match certificate against known templates
    """
    try:
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="Only image files are allowed")
        
        # Save uploaded file
        with tempfile.NamedTemporaryFile(delete=False, suffix=f"_{file.filename}") as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_file_path = tmp_file.name
        
        try:
            # For now, return placeholder template matching results
            # In a real implementation, you would compare against known templates
            template_match = {
                "template_id": template_id or "unknown",
                "match_score": 85.5,
                "is_matched": True,
                "confidence": 0.87,
                "differences": [
                    "Font size variation detected",
                    "Minor layout differences"
                ]
            }
            
            return JSONResponse(content={
                "success": True,
                "template_match": template_match
            })
            
        finally:
            # Clean up temporary file
            if os.path.exists(tmp_file_path):
                os.unlink(tmp_file_path)
                
    except Exception as e:
        logger.error(f"Template matching error: {e}")
        raise HTTPException(status_code=500, detail=f"Template matching failed: {str(e)}")

@app.post("/ai/analyze/anomaly")
async def detect_anomalies(file: UploadFile = File(...)):
    """
    Detect anomalies in certificate data using ML models
    """
    try:
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="Only image files are allowed")
        
        # Save uploaded file
        with tempfile.NamedTemporaryFile(delete=False, suffix=f"_{file.filename}") as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_file_path = tmp_file.name
        
        try:
            # Detect anomalies
            anomaly_result = image_analyzer.detect_anomalies(tmp_file_path)
            
            return JSONResponse(content={
                "success": True,
                "anomaly_analysis": anomaly_result
            })
            
        finally:
            # Clean up temporary file
            if os.path.exists(tmp_file_path):
                os.unlink(tmp_file_path)
                
    except Exception as e:
        logger.error(f"Anomaly detection error: {e}")
        raise HTTPException(status_code=500, detail=f"Anomaly detection failed: {str(e)}")

@app.post("/ai/verify/complete")
async def complete_verification(file: UploadFile = File(...)):
    """
    Complete verification process combining all AI services
    """
    try:
        # Validate file type
        if not file.content_type.startswith(('image/', 'application/pdf')):
            raise HTTPException(status_code=400, detail="Only images and PDF files are allowed")
        
        # Save uploaded file
        with tempfile.NamedTemporaryFile(delete=False, suffix=f"_{file.filename}") as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_file_path = tmp_file.name
        
        try:
            results = {}
            
            # OCR extraction
            if file.content_type == "application/pdf":
                ocr_result = ocr_service.extract_from_pdf(tmp_file_path)
            else:
                ocr_result = ocr_service.extract_text(tmp_file_path)
            
            results['ocr'] = ocr_result
            
            # Image analysis (only for images)
            if file.content_type.startswith('image/'):
                tampering_result = image_analyzer.detect_tampering(tmp_file_path)
                anomaly_result = image_analyzer.detect_anomalies(tmp_file_path)
                
                results['tampering'] = tampering_result
                results['anomaly'] = anomaly_result
            
            # Calculate overall verification score
            ocr_confidence = ocr_result.get('confidence', 0)
            tampering_score = results.get('tampering', {}).get('tampering_score', 0)
            anomaly_score = results.get('anomaly', {}).get('anomaly_score', 0)
            
            # Normalize scores (lower tampering and anomaly scores are better)
            normalized_tampering = max(0, 100 - tampering_score)
            normalized_anomaly = max(0, 100 - anomaly_score)
            
            overall_score = (ocr_confidence + normalized_tampering + normalized_anomaly) / 3
            
            # Determine verification status
            if overall_score >= 80:
                status = "verified"
            elif overall_score >= 60:
                status = "suspicious"
            else:
                status = "fake"
            
            return JSONResponse(content={
                "success": True,
                "verification_status": status,
                "overall_score": overall_score,
                "results": results
            })
            
        finally:
            # Clean up temporary file
            if os.path.exists(tmp_file_path):
                os.unlink(tmp_file_path)
                
    except Exception as e:
        logger.error(f"Complete verification error: {e}")
        raise HTTPException(status_code=500, detail=f"Verification failed: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)
