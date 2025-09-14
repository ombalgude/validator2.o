"""
Image Analysis Service for Certificate Verification
Provides tampering detection and digital forensics capabilities
"""

import cv2
import numpy as np
from PIL import Image
import io
from typing import Dict, List, Tuple, Optional
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ImageAnalyzer:
    """Main class for image analysis and tampering detection"""
    
    def __init__(self):
        self.tampering_threshold = 0.3
        self.noise_threshold = 0.1
        
    def analyze_image(self, image_data: bytes) -> Dict:
        """
        Comprehensive image analysis for tampering detection
        
        Args:
            image_data: Raw image bytes
            
        Returns:
            Dict containing analysis results
        """
        try:
            # Convert bytes to OpenCV image
            nparr = np.frombuffer(image_data, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                return {"error": "Invalid image format"}
            
            # Perform various analysis
            results = {
                "tampering_detected": False,
                "confidence_score": 0.0,
                "analysis_details": {},
                "recommendations": []
            }
            
            # Error Level Analysis (ELA)
            ela_score = self._error_level_analysis(image)
            results["analysis_details"]["ela_score"] = ela_score
            
            # Noise Analysis
            noise_score = self._analyze_noise_patterns(image)
            results["analysis_details"]["noise_score"] = noise_score
            
            # Compression Analysis
            compression_score = self._analyze_compression_artifacts(image)
            results["analysis_details"]["compression_score"] = compression_score
            
            # Metadata Analysis
            metadata_analysis = self._analyze_metadata(image_data)
            results["analysis_details"]["metadata"] = metadata_analysis
            
            # Calculate overall tampering score
            tampering_score = self._calculate_tampering_score(
                ela_score, noise_score, compression_score, metadata_analysis
            )
            
            results["confidence_score"] = tampering_score
            results["tampering_detected"] = tampering_score > self.tampering_threshold
            
            # Generate recommendations
            results["recommendations"] = self._generate_recommendations(
                ela_score, noise_score, compression_score, metadata_analysis
            )
            
            return results
            
        except Exception as e:
            logger.error(f"Error in image analysis: {str(e)}")
            return {"error": f"Analysis failed: {str(e)}"}
    
    def _error_level_analysis(self, image: np.ndarray) -> float:
        """
        Perform Error Level Analysis (ELA) to detect tampering
        
        Args:
            image: OpenCV image array
            
        Returns:
            ELA score (0-1, higher indicates more tampering)
        """
        try:
            # Convert to grayscale
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Apply Gaussian blur
            blurred = cv2.GaussianBlur(gray, (3, 3), 0)
            
            # Calculate ELA
            ela = cv2.absdiff(gray, blurred)
            
            # Normalize and calculate score
            ela_normalized = ela.astype(np.float32) / 255.0
            score = np.mean(ela_normalized)
            
            return float(score)
            
        except Exception as e:
            logger.error(f"Error in ELA analysis: {str(e)}")
            return 0.0
    
    def _analyze_noise_patterns(self, image: np.ndarray) -> float:
        """
        Analyze noise patterns for tampering detection
        
        Args:
            image: OpenCV image array
            
        Returns:
            Noise analysis score (0-1)
        """
        try:
            # Convert to grayscale
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Apply Laplacian filter for edge detection
            laplacian = cv2.Laplacian(gray, cv2.CV_64F)
            laplacian_var = laplacian.var()
            
            # Normalize score
            score = min(laplacian_var / 1000.0, 1.0)
            
            return float(score)
            
        except Exception as e:
            logger.error(f"Error in noise analysis: {str(e)}")
            return 0.0
    
    def _analyze_compression_artifacts(self, image: np.ndarray) -> float:
        """
        Analyze compression artifacts for tampering detection
        
        Args:
            image: OpenCV image array
            
        Returns:
            Compression analysis score (0-1)
        """
        try:
            # Convert to grayscale
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Apply DCT to detect compression artifacts
            dct = cv2.dct(gray.astype(np.float32))
            
            # Calculate high-frequency components
            hf_components = np.sum(np.abs(dct[8:, 8:]))
            total_components = np.sum(np.abs(dct))
            
            score = hf_components / total_components if total_components > 0 else 0
            
            return float(score)
            
        except Exception as e:
            logger.error(f"Error in compression analysis: {str(e)}")
            return 0.0
    
    def _analyze_metadata(self, image_data: bytes) -> Dict:
        """
        Analyze image metadata for inconsistencies
        
        Args:
            image_data: Raw image bytes
            
        Returns:
            Metadata analysis results
        """
        try:
            # Open image with PIL to access metadata
            image = Image.open(io.BytesIO(image_data))
            
            metadata = {
                "format": image.format,
                "mode": image.mode,
                "size": image.size,
                "has_exif": hasattr(image, '_getexif') and image._getexif() is not None,
                "exif_data": {}
            }
            
            # Extract EXIF data if available
            if metadata["has_exif"]:
                exif = image._getexif()
                if exif:
                    for tag, value in exif.items():
                        metadata["exif_data"][tag] = str(value)
            
            return metadata
            
        except Exception as e:
            logger.error(f"Error in metadata analysis: {str(e)}")
            return {"error": str(e)}
    
    def _calculate_tampering_score(self, ela_score: float, noise_score: float, 
                                 compression_score: float, metadata: Dict) -> float:
        """
        Calculate overall tampering score based on all analysis
        
        Args:
            ela_score: Error Level Analysis score
            noise_score: Noise pattern analysis score
            compression_score: Compression artifact score
            metadata: Metadata analysis results
            
        Returns:
            Overall tampering score (0-1)
        """
        # Weighted combination of different analysis scores
        weights = {
            "ela": 0.4,
            "noise": 0.3,
            "compression": 0.2,
            "metadata": 0.1
        }
        
        # Calculate metadata score
        metadata_score = 0.0
        if "error" not in metadata:
            # Check for suspicious metadata patterns
            if metadata.get("has_exif", False):
                exif_data = metadata.get("exif_data", {})
                # Look for suspicious EXIF tags
                suspicious_tags = [271, 272, 306, 315]  # Camera make, model, date, artist
                for tag in suspicious_tags:
                    if str(tag) in exif_data:
                        metadata_score += 0.1
        
        # Calculate weighted score
        total_score = (
            weights["ela"] * ela_score +
            weights["noise"] * noise_score +
            weights["compression"] * compression_score +
            weights["metadata"] * min(metadata_score, 1.0)
        )
        
        return min(total_score, 1.0)
    
    def _generate_recommendations(self, ela_score: float, noise_score: float,
                                compression_score: float, metadata: Dict) -> List[str]:
        """
        Generate recommendations based on analysis results
        
        Args:
            ela_score: Error Level Analysis score
            noise_score: Noise pattern analysis score
            compression_score: Compression artifact score
            metadata: Metadata analysis results
            
        Returns:
            List of recommendations
        """
        recommendations = []
        
        if ela_score > 0.5:
            recommendations.append("High ELA score detected - possible digital tampering")
        
        if noise_score > 0.4:
            recommendations.append("Unusual noise patterns detected - image may be edited")
        
        if compression_score > 0.6:
            recommendations.append("Heavy compression artifacts - image quality may be compromised")
        
        if metadata.get("has_exif", False):
            exif_data = metadata.get("exif_data", {})
            if len(exif_data) < 5:
                recommendations.append("Limited EXIF data - may indicate image processing")
        
        if not recommendations:
            recommendations.append("No obvious signs of tampering detected")
        
        return recommendations

def detect_tampering(image_data: bytes) -> Dict:
    """
    Main function to detect image tampering
    
    Args:
        image_data: Raw image bytes
        
    Returns:
        Analysis results dictionary
    """
    analyzer = ImageAnalyzer()
    return analyzer.analyze_image(image_data)

def analyze_certificate_security(image_data: bytes) -> Dict:
    """
    Specialized analysis for certificate documents
    
    Args:
        image_data: Raw image bytes
        
    Returns:
        Certificate-specific analysis results
    """
    try:
        # Basic tampering detection
        basic_analysis = detect_tampering(image_data)
        
        # Additional certificate-specific checks
        nparr = np.frombuffer(image_data, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            return {"error": "Invalid image format"}
        
        # Check for certificate-specific features
        certificate_analysis = {
            "has_signature_area": False,
            "has_seal_area": False,
            "text_clarity": 0.0,
            "border_integrity": 0.0
        }
        
        # Convert to grayscale for analysis
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Look for signature areas (dark regions at bottom)
        height, width = gray.shape
        bottom_region = gray[int(height * 0.8):, :]
        signature_pixels = np.sum(bottom_region < 100)  # Dark pixels
        certificate_analysis["has_signature_area"] = signature_pixels > (width * 0.1)
        
        # Look for seal areas (circular patterns)
        circles = cv2.HoughCircles(gray, cv2.HOUGH_GRADIENT, 1, 20,
                                 param1=50, param2=30, minRadius=10, maxRadius=100)
        certificate_analysis["has_seal_area"] = circles is not None
        
        # Analyze text clarity using edge detection
        edges = cv2.Canny(gray, 50, 150)
        text_clarity = np.sum(edges) / (height * width)
        certificate_analysis["text_clarity"] = float(text_clarity)
        
        # Check border integrity
        border_edges = np.concatenate([
            edges[0, :],  # Top
            edges[-1, :],  # Bottom
            edges[:, 0],  # Left
            edges[:, -1]   # Right
        ])
        border_integrity = np.sum(border_edges) / (2 * (height + width))
        certificate_analysis["border_integrity"] = float(border_integrity)
        
        # Combine results
        result = {
            **basic_analysis,
            "certificate_analysis": certificate_analysis,
            "is_likely_authentic": (
                not basic_analysis.get("tampering_detected", True) and
                certificate_analysis["has_signature_area"] and
                certificate_analysis["text_clarity"] > 0.01
            )
        }
        
        return result
        
    except Exception as e:
        logger.error(f"Error in certificate analysis: {str(e)}")
        return {"error": f"Certificate analysis failed: {str(e)}"}

if __name__ == "__main__":
    # Test the image analysis
    print("Image Analysis Service for Certificate Verification")
    print("This module provides tampering detection and digital forensics capabilities")

