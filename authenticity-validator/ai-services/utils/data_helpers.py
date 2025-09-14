"""
Data Helper Utilities
Functions for extracting and validating certificate data
"""

import re
import json
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

def extract_certificate_data(ocr_text: str) -> Dict[str, Any]:
    """
    Extract structured data from OCR text
    
    Args:
        ocr_text: Raw OCR extracted text
        
    Returns:
        Dictionary with extracted certificate data
    """
    try:
        data = {
            "student_name": None,
            "roll_number": None,
            "institution_name": None,
            "course": None,
            "degree": None,
            "issue_date": None,
            "grades": {},
            "confidence": 0.0,
            "extracted_fields": []
        }
        
        # Clean and normalize text
        cleaned_text = _clean_text(ocr_text)
        
        # Extract student name
        name = _extract_student_name(cleaned_text)
        if name:
            data["student_name"] = name
            data["extracted_fields"].append("student_name")
        
        # Extract roll number
        roll = _extract_roll_number(cleaned_text)
        if roll:
            data["roll_number"] = roll
            data["extracted_fields"].append("roll_number")
        
        # Extract institution name
        institution = _extract_institution_name(cleaned_text)
        if institution:
            data["institution_name"] = institution
            data["extracted_fields"].append("institution_name")
        
        # Extract course information
        course = _extract_course_info(cleaned_text)
        if course:
            data["course"] = course
            data["extracted_fields"].append("course")
        
        # Extract degree information
        degree = _extract_degree_info(cleaned_text)
        if degree:
            data["degree"] = degree
            data["extracted_fields"].append("degree")
        
        # Extract issue date
        date = _extract_issue_date(cleaned_text)
        if date:
            data["issue_date"] = date
            data["extracted_fields"].append("issue_date")
        
        # Extract grades
        grades = _extract_grades(cleaned_text)
        if grades:
            data["grades"] = grades
            data["extracted_fields"].append("grades")
        
        # Calculate confidence based on extracted fields
        data["confidence"] = len(data["extracted_fields"]) / 7.0
        
        return data
        
    except Exception as e:
        logger.error(f"Error extracting certificate data: {str(e)}")
        return {"error": str(e)}

def validate_certificate_format(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate extracted certificate data
    
    Args:
        data: Extracted certificate data
        
    Returns:
        Validation results
    """
    try:
        validation = {
            "is_valid": True,
            "errors": [],
            "warnings": [],
            "completeness_score": 0.0
        }
        
        required_fields = ["student_name", "roll_number", "institution_name", "course", "degree"]
        optional_fields = ["issue_date", "grades"]
        
        # Check required fields
        missing_required = []
        for field in required_fields:
            if not data.get(field):
                missing_required.append(field)
        
        if missing_required:
            validation["is_valid"] = False
            validation["errors"].append(f"Missing required fields: {', '.join(missing_required)}")
        
        # Check data quality
        if data.get("student_name") and len(data["student_name"]) < 3:
            validation["warnings"].append("Student name seems too short")
        
        if data.get("roll_number") and not re.match(r'^[A-Za-z0-9\-_]+$', data["roll_number"]):
            validation["warnings"].append("Roll number format seems unusual")
        
        if data.get("issue_date"):
            try:
                # Validate date format
                if isinstance(data["issue_date"], str):
                    datetime.strptime(data["issue_date"], "%Y-%m-%d")
                elif isinstance(data["issue_date"], datetime):
                    pass  # Already a datetime object
                else:
                    validation["warnings"].append("Issue date format is not standard")
            except ValueError:
                validation["warnings"].append("Issue date is not in valid format")
        
        # Calculate completeness score
        total_fields = len(required_fields) + len(optional_fields)
        present_fields = sum(1 for field in required_fields + optional_fields if data.get(field))
        validation["completeness_score"] = present_fields / total_fields
        
        return validation
        
    except Exception as e:
        logger.error(f"Error validating certificate data: {str(e)}")
        return {"error": str(e)}

def _clean_text(text: str) -> str:
    """Clean and normalize OCR text"""
    # Remove extra whitespace
    text = re.sub(r'\s+', ' ', text)
    
    # Remove special characters but keep alphanumeric, spaces, and common punctuation
    text = re.sub(r'[^\w\s\-.,/()]', '', text)
    
    # Normalize case for certain patterns
    text = re.sub(r'\b(UNIVERSITY|COLLEGE|INSTITUTE)\b', lambda m: m.group(1).title(), text, flags=re.IGNORECASE)
    
    return text.strip()

def _extract_student_name(text: str) -> Optional[str]:
    """Extract student name from text"""
    # Common patterns for student names
    patterns = [
        r'(?:name|student|candidate)[\s:]*([A-Za-z\s]+?)(?:\n|$|roll|reg|id)',
        r'(?:this is to certify that|certify that)\s+([A-Za-z\s]+?)(?:\s+has|has)',
        r'^([A-Za-z\s]{3,30})$',  # Single line with just name
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
        if match:
            name = match.group(1).strip()
            if len(name) >= 3 and len(name) <= 50:
                return name.title()
    
    return None

def _extract_roll_number(text: str) -> Optional[str]:
    """Extract roll number from text"""
    patterns = [
        r'(?:roll|reg|id|enrollment)[\s:]*([A-Za-z0-9\-_]+)',
        r'(?:roll no|roll number)[\s:]*([A-Za-z0-9\-_]+)',
        r'\b([A-Za-z]{2,4}[0-9]{4,8}[A-Za-z0-9]*)\b',  # Common roll number pattern
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            roll = match.group(1).strip()
            if len(roll) >= 4 and len(roll) <= 20:
                return roll.upper()
    
    return None

def _extract_institution_name(text: str) -> Optional[str]:
    """Extract institution name from text"""
    # Look for common institution keywords
    institution_keywords = ['university', 'college', 'institute', 'academy', 'school']
    
    lines = text.split('\n')
    for line in lines:
        line = line.strip()
        if any(keyword in line.lower() for keyword in institution_keywords):
            # Clean up the line
            line = re.sub(r'^(?:this is to certify that|certify that)', '', line, flags=re.IGNORECASE)
            line = re.sub(r'(?:has successfully|successfully completed)', '', line, flags=re.IGNORECASE)
            line = line.strip()
            
            if len(line) >= 5 and len(line) <= 100:
                return line.title()
    
    return None

def _extract_course_info(text: str) -> Optional[str]:
    """Extract course information from text"""
    patterns = [
        r'(?:course|program|degree)[\s:]*([A-Za-z\s&]+?)(?:\n|$|in|with)',
        r'(?:bachelor|master|phd|diploma|certificate)[\s:]*([A-Za-z\s&]+?)(?:\n|$|in|with)',
        r'in\s+([A-Za-z\s&]+?)(?:\n|$|with|and)',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            course = match.group(1).strip()
            if len(course) >= 3 and len(course) <= 50:
                return course.title()
    
    return None

def _extract_degree_info(text: str) -> Optional[str]:
    """Extract degree information from text"""
    degree_patterns = [
        r'\b(bachelor|master|phd|diploma|certificate|degree)\b',
        r'\b(b\.?a\.?|b\.?s\.?|m\.?a\.?|m\.?s\.?|ph\.?d\.?)\b',
    ]
    
    for pattern in degree_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            degree = match.group(1).strip()
            return degree.upper()
    
    return None

def _extract_issue_date(text: str) -> Optional[str]:
    """Extract issue date from text"""
    date_patterns = [
        r'(?:date|issued|awarded)[\s:]*(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})',
        r'(?:date|issued|awarded)[\s:]*(\d{1,2}\s+\w+\s+\d{4})',
        r'(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})',
        r'(\d{1,2}\s+\w+\s+\d{4})',
    ]
    
    for pattern in date_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            date_str = match.group(1).strip()
            try:
                # Try to parse and normalize the date
                parsed_date = _parse_date(date_str)
                if parsed_date:
                    return parsed_date.strftime("%Y-%m-%d")
            except:
                continue
    
    return None

def _extract_grades(text: str) -> Dict[str, str]:
    """Extract grades from text"""
    grades = {}
    
    # Common grade patterns
    grade_patterns = [
        r'(?:grade|cgpa|gpa|score)[\s:]*([0-9.]+)',
        r'([0-9.]+)\s*(?:out of|/)\s*([0-9.]+)',
        r'([A-F][+-]?)\s*(?:grade|in)',
    ]
    
    for pattern in grade_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        for match in matches:
            if isinstance(match, tuple):
                if len(match) == 2:
                    grades[f"score_{len(grades)}"] = f"{match[0]}/{match[1]}"
                else:
                    grades[f"grade_{len(grades)}"] = match[0]
            else:
                grades[f"grade_{len(grades)}"] = match
    
    return grades

def _parse_date(date_str: str) -> Optional[datetime]:
    """Parse date string into datetime object"""
    formats = [
        "%d/%m/%Y",
        "%m/%d/%Y", 
        "%d-%m-%Y",
        "%m-%d-%Y",
        "%d %B %Y",
        "%B %d, %Y",
        "%d %b %Y",
        "%b %d, %Y",
    ]
    
    for fmt in formats:
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            continue
    
    return None

def format_certificate_data(data: Dict[str, Any]) -> str:
    """
    Format certificate data for display
    
    Args:
        data: Certificate data dictionary
        
    Returns:
        Formatted string representation
    """
    try:
        formatted = []
        
        if data.get("student_name"):
            formatted.append(f"Student: {data['student_name']}")
        
        if data.get("roll_number"):
            formatted.append(f"Roll Number: {data['roll_number']}")
        
        if data.get("institution_name"):
            formatted.append(f"Institution: {data['institution_name']}")
        
        if data.get("course"):
            formatted.append(f"Course: {data['course']}")
        
        if data.get("degree"):
            formatted.append(f"Degree: {data['degree']}")
        
        if data.get("issue_date"):
            formatted.append(f"Issue Date: {data['issue_date']}")
        
        if data.get("grades"):
            grades_str = ", ".join([f"{k}: {v}" for k, v in data["grades"].items()])
            formatted.append(f"Grades: {grades_str}")
        
        return "\n".join(formatted)
        
    except Exception as e:
        logger.error(f"Error formatting certificate data: {str(e)}")
        return str(data)


