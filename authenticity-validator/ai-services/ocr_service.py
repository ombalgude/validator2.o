import cv2
import numpy as np
import pytesseract
from PIL import Image
import re
import json
from typing import Dict, List, Tuple, Optional
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class OCRService:
    def __init__(self):
        # Configure Tesseract path (adjust for your system)
        # pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
        pass
    
    def preprocess_image(self, image_path: str) -> np.ndarray:
        """
        Preprocess image for better OCR accuracy
        """
        try:
            # Read image
            image = cv2.imread(image_path)
            if image is None:
                raise ValueError(f"Could not read image: {image_path}")
            
            # Convert to grayscale
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Apply Gaussian blur to reduce noise
            blurred = cv2.GaussianBlur(gray, (5, 5), 0)
            
            # Apply adaptive thresholding
            thresh = cv2.adaptiveThreshold(
                blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
            )
            
            # Morphological operations to clean up the image
            kernel = np.ones((1, 1), np.uint8)
            cleaned = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
            
            return cleaned
        except Exception as e:
            logger.error(f"Error preprocessing image: {e}")
            raise
    
    def extract_text(self, image_path: str) -> Dict[str, any]:
        """
        Extract text from image using OCR
        """
        try:
            # Preprocess image
            processed_image = self.preprocess_image(image_path)
            
            # Extract text with confidence scores
            data = pytesseract.image_to_data(processed_image, output_type=pytesseract.Output.DICT)
            
            # Extract text
            text = pytesseract.image_to_string(processed_image)
            
            # Calculate average confidence
            confidences = [int(conf) for conf in data['conf'] if int(conf) > 0]
            avg_confidence = sum(confidences) / len(confidences) if confidences else 0
            
            # Extract structured data
            structured_data = self.extract_structured_data(text)
            
            return {
                'raw_text': text,
                'confidence': avg_confidence,
                'structured_data': structured_data,
                'word_data': data
            }
        except Exception as e:
            logger.error(f"Error extracting text: {e}")
            raise
    
    def extract_structured_data(self, text: str) -> Dict[str, str]:
        """
        Extract structured data from certificate text
        """
        structured_data = {}
        
        # Common patterns for certificate data
        patterns = {
            'student_name': [
                r'(?:Name|Student Name|Candidate Name)[\s:]*([A-Za-z\s]+)',
                r'(?:This is to certify that|This certifies that)\s+([A-Za-z\s]+)',
                r'([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)'
            ],
            'roll_number': [
                r'(?:Roll No|Roll Number|Student ID|ID)[\s:]*([A-Za-z0-9\-]+)',
                r'(?:Registration No|Reg No)[\s:]*([A-Za-z0-9\-]+)'
            ],
            'course': [
                r'(?:Course|Program|Degree)[\s:]*([A-Za-z\s&]+)',
                r'in\s+([A-Za-z\s&]+)\s+program'
            ],
            'degree': [
                r'(?:Bachelor|Master|Doctor|Diploma|Certificate)\s+of\s+([A-Za-z\s]+)',
                r'([A-Za-z\s]+)\s+(?:Bachelor|Master|Doctor|Diploma|Certificate)'
            ],
            'institution': [
                r'(?:University|College|Institute|School)[\s:]*([A-Za-z\s&]+)',
                r'([A-Za-z\s&]+)\s+(?:University|College|Institute|School)'
            ],
            'date': [
                r'(?:Date|Issued on|Dated)[\s:]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})',
                r'(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})'
            ],
            'grade': [
                r'(?:Grade|GPA|Score|Marks)[\s:]*([A-F\+\-]|\d+\.?\d*)',
                r'(?:First|Second|Third|Distinction|Pass)\s+(?:Class|Division)'
            ]
        }
        
        for field, pattern_list in patterns.items():
            for pattern in pattern_list:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    structured_data[field] = match.group(1).strip()
                    break
        
        return structured_data
    
    def extract_from_pdf(self, pdf_path: str) -> Dict[str, any]:
        """
        Extract text from PDF file
        """
        try:
            # For PDF processing, you might want to use pdf2image or PyMuPDF
            # This is a simplified version
            import fitz  # PyMuPDF
            
            doc = fitz.open(pdf_path)
            text = ""
            
            for page in doc:
                text += page.get_text()
            
            doc.close()
            
            # Process the extracted text
            structured_data = self.extract_structured_data(text)
            
            return {
                'raw_text': text,
                'confidence': 85.0,  # PDF text extraction is generally more reliable
                'structured_data': structured_data,
                'source': 'pdf'
            }
        except Exception as e:
            logger.error(f"Error extracting from PDF: {e}")
            raise
    
    def validate_certificate_data(self, structured_data: Dict[str, str]) -> Dict[str, any]:
        """
        Validate extracted certificate data
        """
        validation_results = {
            'is_valid': True,
            'missing_fields': [],
            'confidence_score': 0,
            'warnings': []
        }
        
        required_fields = ['student_name', 'roll_number', 'course', 'degree']
        present_fields = [field for field in required_fields if structured_data.get(field)]
        
        validation_results['missing_fields'] = [field for field in required_fields if field not in structured_data]
        validation_results['confidence_score'] = (len(present_fields) / len(required_fields)) * 100
        
        if validation_results['missing_fields']:
            validation_results['is_valid'] = False
            validation_results['warnings'].append("Missing required fields")
        
        return validation_results

# Example usage
if __name__ == "__main__":
    ocr_service = OCRService()
    
    # Test with a sample image
    # result = ocr_service.extract_text("sample_certificate.jpg")
    # print(json.dumps(result, indent=2))
