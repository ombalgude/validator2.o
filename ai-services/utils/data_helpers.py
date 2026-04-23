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


def _extract_by_label_proximity(lines: List[str]) -> Dict[str, Optional[str]]:
    """
    Context-aware field extraction.
    Looks for known label keywords, then grabs the value on the same line
    (after the colon/dash) or on the next non-empty line.
    Much more robust than full-text regex for real certificate layouts.
    """
    LABEL_MAP = {
        "student_name": [
            "name", "student name", "candidate name", "student's name",
            "this is to certify that", "certify that",
        ],
        "roll_number": [
            "roll no", "roll number", "reg no", "registration no",
            "student id", "enrollment no", "enroll no", "id no",
        ],
        "institution_name": [
            "university", "college", "institute", "institution", "school",
        ],
        "course": [
            "course", "programme", "program", "stream",
        ],
        "degree": [
            "degree", "bachelor", "master", "diploma", "certificate of",
            "b.tech", "b.e.", "m.tech", "m.e.", "b.sc", "m.sc", "phd",
        ],
        "issue_date": [
            "date", "issued on", "dated", "date of issue",
        ],
        "grade": [
            "grade", "gpa", "cgpa", "sgpa", "percentage", "marks", "result",
            "division", "class",
        ],
    }

    extracted: Dict[str, Optional[str]] = {k: None for k in LABEL_MAP}

    def _value_after_label(line: str, label: str) -> Optional[str]:
        """Return text after label + optional separator on the same line."""
        pattern = re.compile(
            r"(?i)" + re.escape(label) + r"\s*[:\-\u2013\u2014]?\s*(.+)"
        )
        match = pattern.search(line)
        if match:
            val = match.group(1).strip().strip(".")
            return val if len(val) >= 2 else None
        return None

    for i, line in enumerate(lines):
        line_lower = line.lower()
        for field, labels in LABEL_MAP.items():
            if extracted[field]:
                continue
            for label in labels:
                if label in line_lower:
                    # Try value on the same line
                    value = _value_after_label(line, label)
                    if not value:
                        # Try the next non-empty line
                        for j in range(i + 1, min(i + 3, len(lines))):
                            if lines[j].strip():
                                value = lines[j].strip().strip(".")
                                break
                    if value and len(value) >= 2:
                        extracted[field] = value
                    break

    return extracted


def _merge_extractions(
    label_data: Dict[str, Optional[str]],
    regex_data: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Merge label-proximity results (higher confidence) with
    regex results (fallback for fields label-proximity missed).
    """
    merged = dict(regex_data)  # start with regex as base
    for field, value in label_data.items():
        if value:  # label-proximity wins when it found something
            merged[field] = value
    return merged

def extract_certificate_data(ocr_text: str) -> Dict[str, Any]:
    """
    Extract structured data from OCR text.
    Uses label-proximity parsing first, falls back to regex for missed fields.

    Args:
        ocr_text: Raw OCR extracted text

    Returns:
        Dictionary with extracted certificate data
    """
    try:
        lines = [l.strip() for l in (ocr_text or "").splitlines() if l.strip()]

        # 1. Label-proximity extraction (context-aware)
        label_data = _extract_by_label_proximity(lines)

        # 2. Regex extraction (existing logic, used as fallback)
        cleaned_text = _clean_text(ocr_text)
        regex_data: Dict[str, Any] = {
            "student_name": None,
            "roll_number": None,
            "institution_name": None,
            "course": None,
            "degree": None,
            "issue_date": None,
            "grades": {},
            "confidence": 0.0,
            "extracted_fields": [],
        }

        name = _extract_student_name(cleaned_text)
        if name: regex_data["student_name"] = name

        roll = _extract_roll_number(cleaned_text)
        if roll: regex_data["roll_number"] = roll

        institution = _extract_institution_name(cleaned_text)
        if institution: regex_data["institution_name"] = institution

        course = _extract_course_info(cleaned_text)
        if course: regex_data["course"] = course

        degree = _extract_degree_info(cleaned_text)
        if degree: regex_data["degree"] = degree

        date = _extract_issue_date(cleaned_text)
        if date: regex_data["issue_date"] = date

        grades = _extract_grades(cleaned_text)
        if grades: regex_data["grades"] = grades

        # 3. Merge — label-proximity wins, regex fills gaps
        merged = _merge_extractions(label_data, regex_data)

        # 4. Recompute extracted_fields and confidence
        key_fields = ["student_name", "roll_number", "institution_name", "course", "degree"]
        merged["extracted_fields"] = [f for f in key_fields if merged.get(f)]
        merged["confidence"] = round(
            (len(merged["extracted_fields"]) / len(key_fields)) * 100, 2
        )

        return merged

    except Exception as e:
        logger.error(f"Error extracting certificate data: {e}")
        return {
            "student_name": None, "roll_number": None, "institution_name": None,
            "course": None, "degree": None, "issue_date": None,
            "grades": {}, "confidence": 0.0, "extracted_fields": [],
        }


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


