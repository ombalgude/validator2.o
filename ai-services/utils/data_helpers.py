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


def _non_empty_lines(text: str) -> List[str]:
    return [line.strip() for line in (text or "").splitlines() if line.strip()]


def _compact_line(line: str) -> str:
    return re.sub(r"\s+", " ", line or "").strip()


def _clean_field_value(value: str) -> str:
    return _compact_line(value).strip(" .:-_")


def _clean_college_name(value: str) -> str:
    value = _clean_field_value(value)
    value = re.split(r"\s+\||\s+[=_-]{2,}|\s+COURSE\s+CO\b", value, maxsplit=1, flags=re.I)[0]
    return _clean_field_value(value)


def _parse_date_to_iso(value: str) -> Optional[str]:
    normalized = _clean_field_value(value).upper()
    parsed = _parse_date(normalized)
    return parsed.strftime("%Y-%m-%d") if parsed else None


def _strip_short_lowercase_tail(value: str) -> str:
    return re.sub(r"\s+[a-z]{1,3}$", "", _clean_field_value(value)).strip()


def _extract_by_label_proximity(lines: List[str]) -> Dict[str, Optional[str]]:
    """
    Context-aware field extraction.
    Looks for known label keywords, then grabs the value on the same line
    (after the colon/dash) or on the next non-empty line.
    Much more robust than full-text regex for real certificate layouts.
    """
    LABEL_MAP = {
        "student_name": [
            "student name", "candidate name", "student's name", "name",
            "this is to certify that", "certify that",
        ],
        "roll_number": [
            "seat no", "roll no", "roll number", "perm. reg. no",
            "perm reg no", "reg no", "registration no", "student id",
            "enrollment no", "enroll no", "id no",
        ],
        "institution_name": [
            "university", "college", "institute", "institution", "school",
        ],
        "course": [
            "statement of marks", "exam", "course", "programme", "program", "stream",
        ],
        "degree": [
            "degree", "bachelor", "master", "diploma", "certificate of",
            "b.tech", "b.e.", "m.tech", "m.e.", "b.sc", "m.sc", "phd",
        ],
        "issue_date": [
            "date", "issued on", "dated", "date of issue",
        ],
        "grade": [
            "grade", "percentage", "result", "division", "class",
        ],
    }

    extracted: Dict[str, Optional[str]] = {k: None for k in LABEL_MAP}

    def _value_after_label(line: str, label: str) -> Optional[str]:
        """Return text after label + optional separator on the same line."""
        pattern = re.compile(
            r"(?i)\b" + re.escape(label) + r"\b\s*[:#.\-\u2013\u2014]*\s*(.+)"
        )
        match = pattern.search(line)
        if match:
            val = _clean_field_value(match.group(1))
            return val if len(val) >= 2 else None
        return None

    for i, line in enumerate(lines):
        line_lower = line.lower()
        for field, labels in LABEL_MAP.items():
            if extracted[field]:
                continue
            for label in labels:
                if not re.search(r"\b" + re.escape(label) + r"\b", line_lower):
                    continue

                if field == "student_name" and label == "name" and re.search(
                    r"\b(course|college|school|university|mother)\b", line_lower
                ):
                    continue

                if field == "course" and re.search(r"\b(course\s+code|course\s+name)\b", line_lower):
                    continue

                if field == "grade" and "marks/grades" in line_lower:
                    continue

                # Try value on the same line
                value = _value_after_label(line, label)
                if not value:
                    # Try the next non-empty line
                    for j in range(i + 1, min(i + 3, len(lines))):
                        if lines[j].strip():
                            value = _clean_field_value(lines[j])
                            break
                if value and len(value) >= 2:
                    extracted[field] = value
                break

    return extracted


def _extract_sppu_marksheet_data(ocr_text: str) -> Dict[str, Any]:
    """
    Extract fields from Savitribai Phule Pune University marksheets.
    The table-heavy layout needs stricter patterns than the generic parser.
    """
    text = ocr_text or ""
    lines = _non_empty_lines(text)
    flat_text = _compact_line(text)
    data: Dict[str, Any] = {}

    for line in lines[:5]:
        no_match = re.search(r"^\s*No\.?\s*[:#-]?\s*(?:\d+\s*[-/]\s*)?([A-Z0-9]{5,})\b", line, re.I)
        if no_match:
            data["certificate_id"] = no_match.group(1).upper()
            data["serial_no"] = no_match.group(1).upper()
            break

    seat_match = re.search(r"\bSEAT\s*NO\.?\s*[:#-]?\s*([A-Z0-9_-]{4,})\b", flat_text, re.I)
    if seat_match:
        data["roll_number"] = seat_match.group(1).upper()

    prn_match = re.search(r"\bPERM\.?\s*REG\.?\s*NO\.?\s*[:#-]?\s*([A-Z0-9_-]{4,})\b", flat_text, re.I)
    if prn_match:
        data["prn"] = prn_match.group(1).upper()

    name_match = re.search(
        r"\bNAME\s*[^A-Z0-9]{0,8}\s*([A-Z][A-Z\s.'-]{2,}?)(?=\s+MOTHER\b|\s+COLLEGE\b|\s+SEAT\b|\s+PERM\b|$)",
        flat_text,
        re.I,
    )
    if name_match:
        data["student_name"] = _clean_field_value(name_match.group(1)).title()

    mother_match = re.search(r"\bMOTHER\s*[^A-Z0-9]{0,8}\s*([A-Z][A-Za-z\s.'-]{1,40}?)(?=\s+COLLEGE\b|\s+COURSE\b|$)", flat_text)
    if mother_match:
        data["mother_name"] = _strip_short_lowercase_tail(mother_match.group(1)).title()

    college_match = re.search(
        r"\bCOLLEGE/SCHOOL\s*[\[{(]*\s*([A-Z0-9O_-]{3,})\s*[\])}]*\s*[-:]?\s*(.+?)(?=\s+(?:COURSE\s+CO\.?|COURSE\s+CODE|SEM\.?\s*::?|FIRST\s+YEAR|DATE\s*:)|$)",
        flat_text,
        re.I,
    )
    if college_match:
        data["college_code"] = college_match.group(1).upper()
        data["institution_code"] = data["college_code"]
        data["college_name"] = _clean_college_name(college_match.group(2)).title()
        data["institution_name"] = data["college_name"]

    branch_match = re.search(r"\bBRANCH\s+CODE\s*[:#-]?\s*([A-Z0-9_-]+)\b", flat_text, re.I)
    if branch_match:
        data["branch_code"] = branch_match.group(1).upper()

    exam_match = re.search(
        r"STATEMENT\s+OF\s+MARKS\s*/?\s*GRADES\s+FOR\s+(.+?)\s+EXAM\s*[,.:-]?\s*([A-Z]+\s*/\s*[A-Z]+|[A-Z]+)\s+((?:19|20)\d{2})",
        flat_text,
        re.I,
    )
    if exam_match:
        data["course"] = _clean_field_value(exam_match.group(1)).upper()
        session = re.sub(r"\s*/\s*", "/", exam_match.group(2).upper())
        data["exam_session"] = f"{session} {exam_match.group(3)}"
        data["exam_year"] = exam_match.group(3)
        data["year"] = exam_match.group(3)

    date_match = re.search(r"\bDATE\s*[:#-]?\s*([OQ0-3]?[OQ0-9]{1,2}\s*[A-Z]{3,9}\s*(?:19|20)\d{2})\b", flat_text, re.I)
    if date_match:
        data["issue_date"] = _parse_date_to_iso(date_match.group(1))

    sgpa_match = re.search(r"\bSGPA\s*[:#-]?\s*([0-9](?:\.[0-9]+)?|10(?:\.0+)?)\b", flat_text, re.I)
    if sgpa_match:
        data["grades"] = {"sgpa": sgpa_match.group(1)}
        data["summary_sgpa"] = sgpa_match.group(1)

    credits_match = re.search(r"\bTOTAL\s+CREDITS\s+EARNED\s*[:#-]?\s*(\d{1,3})\b", flat_text, re.I)
    if credits_match:
        data["total_credits"] = credits_match.group(1)

    subject_pattern = re.compile(
        r"^\s*(\d{5,6})\s+(.+?)\s+\*?\s*(TH|PR|TW\s*\+\s*PR|TW|AC)\s+([O0]?\d{1,2})\s+([O0]?\d{1,2})\s+([A-Z]{1,2})\s+([O0]?\d{1,3})\s*$",
        re.I,
    )
    loose_subject_pattern = re.compile(
        r"^\s*\D{0,4}(\d{5,6})\s+(.+?)\s+\*?\s*(TH|PR|TW\s*\+\s*PR|TW|AC)\b(.*)$",
        re.I,
    )

    def normalize_number_token(value: str) -> str:
        normalized = value.upper().replace("O", "0")
        if len(normalized) > 2:
            normalized = normalized[-2:]
        return normalized.zfill(2) if normalized.isdigit() and len(normalized) < 2 else normalized

    subjects = []
    for line in lines:
        compact_line = _compact_line(line)
        match = subject_pattern.match(compact_line)
        if match:
            course_code, course_name, subject_type, _total_credits, earned_credits, grade, credit_points = match.groups()
            subject_type = re.sub(r"\s+", "", subject_type)
            subjects.append({
                "course_code": course_code.upper(),
                "course_name": _clean_field_value(course_name).title(),
                "type": subject_type.upper(),
                "credits": normalize_number_token(earned_credits),
                "grade": grade.upper(),
                "credit_points": normalize_number_token(credit_points),
            })
            continue

        loose_match = loose_subject_pattern.match(compact_line)
        if not loose_match:
            continue

        course_code, course_name, subject_type, rest = loose_match.groups()
        subject_type = re.sub(r"\s+", "", subject_type)
        number_tokens = [normalize_number_token(token) for token in re.findall(r"[O0]?\d{1,3}", rest)]
        grade_match = re.search(r"\b(AC|[ABCDO])\b", rest, re.I)
        subjects.append({
            "course_code": course_code.upper(),
            "course_name": _clean_field_value(course_name).title(),
            "type": subject_type.upper(),
            "credits": number_tokens[1] if len(number_tokens) > 1 else "",
            "grade": grade_match.group(1).upper() if grade_match else "",
            "credit_points": number_tokens[-1] if number_tokens else "",
        })

    if subjects:
        data["subjects"] = subjects
        data["subject_code"] = subjects[0]["course_code"]
        data["subject_name"] = subjects[0]["course_name"]
        data["subject"] = subjects[0]["course_name"]

    return {key: value for key, value in data.items() if value not in (None, "", [], {})}


def _merge_extractions(
    label_data: Dict[str, Optional[str]],
    regex_data: Dict[str, Any],
    specialized_data: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Merge label-proximity results (higher confidence) with
    regex results (fallback for fields label-proximity missed).
    """
    merged = dict(regex_data)  # start with regex as base
    for field, value in label_data.items():
        if value:  # label-proximity wins when it found something
            merged[field] = value
    for field, value in (specialized_data or {}).items():
        if value:
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
        lines = _non_empty_lines(ocr_text)

        # 1. Label-proximity extraction (context-aware)
        label_data = _extract_by_label_proximity(lines)
        specialized_data = _extract_sppu_marksheet_data(ocr_text)

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
            "subjects": [],
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
        merged = _merge_extractions(label_data, regex_data, specialized_data)

        # 4. Recompute extracted_fields and confidence
        key_fields = ["student_name", "roll_number", "institution_name", "course", "issue_date"]
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
        
        required_fields = ["student_name", "roll_number", "institution_name", "course", "issue_date"]
        optional_fields = ["degree", "grades", "subjects"]
        
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
    # Normalize spacing inside lines but preserve line breaks for field regexes.
    lines = [re.sub(r'[ \t]+', ' ', line).strip() for line in (text or "").splitlines()]
    text = "\n".join(line for line in lines if line)
    
    # Remove special characters but keep alphanumeric, spaces, and common punctuation
    text = re.sub(r'[^\w\s\-.,/():#\[\]]', '', text)
    
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
            if re.search(r"\b(course|type|crd|grd|pts|code)\b", name, re.I):
                continue
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
    date_str = _compact_line(date_str).upper()

    def normalize_day(match: re.Match) -> str:
        day_text = match.group(1).replace("O", "0").replace("Q", "0")
        try:
            day = int(day_text)
        except ValueError:
            return match.group(0)
        return f"{day:02d} {match.group(2)} {match.group(3)}"

    date_str = re.sub(
        r"\b([OQ0-3]?[OQ0-9]{1,2})\s*([A-Z]{3,9})\s*((?:19|20)\d{2})\b",
        normalize_day,
        date_str,
    )
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


