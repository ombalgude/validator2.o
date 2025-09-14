"""
Image Preprocessing Utilities
Functions for enhancing image quality and preparing images for OCR and analysis
"""

import cv2
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter
import io
from typing import Tuple, Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)

def preprocess_image(image_data: bytes, target_size: Optional[Tuple[int, int]] = None) -> bytes:
    """
    Preprocess image for better OCR and analysis results
    
    Args:
        image_data: Raw image bytes
        target_size: Optional target size (width, height)
        
    Returns:
        Preprocessed image as bytes
    """
    try:
        # Convert bytes to PIL Image
        image = Image.open(io.BytesIO(image_data))
        
        # Convert to RGB if necessary
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Resize if target size specified
        if target_size:
            image = image.resize(target_size, Image.Resampling.LANCZOS)
        
        # Enhance contrast
        enhancer = ImageEnhance.Contrast(image)
        image = enhancer.enhance(1.2)
        
        # Enhance sharpness
        enhancer = ImageEnhance.Sharpness(image)
        image = enhancer.enhance(1.1)
        
        # Convert back to bytes
        img_byte_arr = io.BytesIO()
        image.save(img_byte_arr, format='PNG', optimize=True)
        return img_byte_arr.getvalue()
        
    except Exception as e:
        logger.error(f"Error preprocessing image: {str(e)}")
        return image_data

def enhance_image_quality(image_data: bytes, enhancement_type: str = 'general') -> bytes:
    """
    Enhance image quality based on specific requirements
    
    Args:
        image_data: Raw image bytes
        enhancement_type: Type of enhancement ('general', 'ocr', 'analysis')
        
    Returns:
        Enhanced image as bytes
    """
    try:
        # Convert to OpenCV format
        nparr = np.frombuffer(image_data, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            return image_data
        
        if enhancement_type == 'ocr':
            # Optimize for OCR
            enhanced = _enhance_for_ocr(image)
        elif enhancement_type == 'analysis':
            # Optimize for tampering analysis
            enhanced = _enhance_for_analysis(image)
        else:
            # General enhancement
            enhanced = _enhance_general(image)
        
        # Convert back to bytes
        _, buffer = cv2.imencode('.png', enhanced)
        return buffer.tobytes()
        
    except Exception as e:
        logger.error(f"Error enhancing image: {str(e)}")
        return image_data

def _enhance_for_ocr(image: np.ndarray) -> np.ndarray:
    """Enhance image specifically for OCR processing"""
    # Convert to grayscale
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    # Apply Gaussian blur to reduce noise
    blurred = cv2.GaussianBlur(gray, (3, 3), 0)
    
    # Apply adaptive thresholding
    thresh = cv2.adaptiveThreshold(
        blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
    )
    
    # Morphological operations to clean up
    kernel = np.ones((1, 1), np.uint8)
    cleaned = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
    
    return cleaned

def _enhance_for_analysis(image: np.ndarray) -> np.ndarray:
    """Enhance image specifically for tampering analysis"""
    # Convert to grayscale
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    # Apply histogram equalization
    equalized = cv2.equalizeHist(gray)
    
    # Apply bilateral filter to reduce noise while preserving edges
    filtered = cv2.bilateralFilter(equalized, 9, 75, 75)
    
    return filtered

def _enhance_general(image: np.ndarray) -> np.ndarray:
    """General image enhancement"""
    # Convert to LAB color space
    lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    
    # Apply CLAHE to L channel
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l = clahe.apply(l)
    
    # Merge channels and convert back to BGR
    enhanced_lab = cv2.merge([l, a, b])
    enhanced = cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2BGR)
    
    return enhanced

def detect_document_orientation(image_data: bytes) -> Dict[str, Any]:
    """
    Detect document orientation and suggest rotation
    
    Args:
        image_data: Raw image bytes
        
    Returns:
        Dictionary with orientation information
    """
    try:
        # Convert to OpenCV format
        nparr = np.frombuffer(image_data, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            return {"error": "Invalid image format"}
        
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Detect edges
        edges = cv2.Canny(gray, 50, 150, apertureSize=3)
        
        # Detect lines using Hough transform
        lines = cv2.HoughLines(edges, 1, np.pi/180, threshold=100)
        
        if lines is not None:
            # Calculate average angle
            angles = []
            for line in lines:
                rho, theta = line[0]
                angle = theta * 180 / np.pi
                if angle > 90:
                    angle -= 180
                angles.append(angle)
            
            avg_angle = np.mean(angles)
            
            return {
                "detected_angle": float(avg_angle),
                "needs_rotation": abs(avg_angle) > 5,
                "suggested_rotation": -avg_angle,
                "confidence": min(len(lines) / 10.0, 1.0)
            }
        else:
            return {
                "detected_angle": 0.0,
                "needs_rotation": False,
                "suggested_rotation": 0.0,
                "confidence": 0.0
            }
            
    except Exception as e:
        logger.error(f"Error detecting orientation: {str(e)}")
        return {"error": str(e)}

def rotate_image(image_data: bytes, angle: float) -> bytes:
    """
    Rotate image by specified angle
    
    Args:
        image_data: Raw image bytes
        angle: Rotation angle in degrees
        
    Returns:
        Rotated image as bytes
    """
    try:
        # Convert to PIL Image
        image = Image.open(io.BytesIO(image_data))
        
        # Rotate image
        rotated = image.rotate(angle, expand=True, fillcolor='white')
        
        # Convert back to bytes
        img_byte_arr = io.BytesIO()
        rotated.save(img_byte_arr, format='PNG', optimize=True)
        return img_byte_arr.getvalue()
        
    except Exception as e:
        logger.error(f"Error rotating image: {str(e)}")
        return image_data

def crop_document_region(image_data: bytes, region: Tuple[int, int, int, int]) -> bytes:
    """
    Crop specific region from document
    
    Args:
        image_data: Raw image bytes
        region: (x, y, width, height) tuple
        
    Returns:
        Cropped image as bytes
    """
    try:
        # Convert to PIL Image
        image = Image.open(io.BytesIO(image_data))
        
        # Crop region
        x, y, w, h = region
        cropped = image.crop((x, y, x + w, y + h))
        
        # Convert back to bytes
        img_byte_arr = io.BytesIO()
        cropped.save(img_byte_arr, format='PNG', optimize=True)
        return img_byte_arr.getvalue()
        
    except Exception as e:
        logger.error(f"Error cropping image: {str(e)}")
        return image_data

def get_image_metadata(image_data: bytes) -> Dict[str, Any]:
    """
    Extract metadata from image
    
    Args:
        image_data: Raw image bytes
        
    Returns:
        Dictionary with image metadata
    """
    try:
        # Convert to PIL Image
        image = Image.open(io.BytesIO(image_data))
        
        metadata = {
            "format": image.format,
            "mode": image.mode,
            "size": image.size,
            "width": image.width,
            "height": image.height,
            "has_transparency": image.mode in ('RGBA', 'LA', 'P'),
            "exif": {}
        }
        
        # Extract EXIF data if available
        if hasattr(image, '_getexif') and image._getexif():
            exif = image._getexif()
            for tag, value in exif.items():
                metadata["exif"][tag] = str(value)
        
        return metadata
        
    except Exception as e:
        logger.error(f"Error extracting metadata: {str(e)}")
        return {"error": str(e)}


