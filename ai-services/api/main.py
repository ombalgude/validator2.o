from datetime import datetime, timezone
import io
from pathlib import Path
from typing import Any, Dict, List, Optional
import logging
import re
import sys
import time

import cv2
import fitz
import numpy as np
from PIL import Image
import pytesseract
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

CURRENT_DIR = Path(__file__).resolve().parent
SERVICE_ROOT = CURRENT_DIR.parent
UTILS_DIR = SERVICE_ROOT / "utils"

if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))

if str(UTILS_DIR) not in sys.path:
    sys.path.insert(0, str(UTILS_DIR))

from image_analysis import analyze_certificate_security
from data_helpers import extract_certificate_data, validate_certificate_format

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

SERVICE_STARTED_AT = time.time()
SERVICE_STATS = {
    "requests_total": 0,
    "ocr_requests": 0,
    "tampering_requests": 0,
    "template_requests": 0,
    "anomaly_requests": 0,
    "complete_verification_requests": 0,
    "process_ocr_requests": 0,
    "errors_total": 0,
}

# --- MODELS ---
# This defines exactly what data we expect from the frontend
class OCRPayload(BaseModel):
    raw_text: str
    confidence: float
    document_type: Optional[str] = None
    schema_hint: Optional[List[str]] = None


EMAIL_REGEX = re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.IGNORECASE)
PHONE_REGEX = re.compile(r"(?:\+?\d[\d\s().-]{7,}\d)")
YEAR_REGEX = re.compile(r"\b(?:19|20)\d{2}\b")

CERTIFICATE_KEYWORDS = {
    "certificate",
    "certify",
    "awarded",
    "university",
    "college",
    "degree",
    "roll",
    "semester",
    "gpa",
}
RESUME_KEYWORDS = {
    "resume",
    "curriculum vitae",
    "experience",
    "employment",
    "education",
    "skills",
    "projects",
    "achievements",
}
DESCRIPTION_KEYWORDS = {
    "summary",
    "overview",
    "description",
    "sentiment",
    "feedback",
    "profile",
}

SCHEMA_MAP = {
    "certificate": ["student_name", "roll_number", "institution_name", "course", "degree"],
    "resume": ["candidate_name", "contact", "education", "experience", "skills"],
    "email": ["email_address"],
    "description": ["content_summary", "sentiment_signal"],
    "generic_text": ["content"],
}


def _iso_timestamp() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _append_ledger(
    ledger: List[Dict[str, str]],
    action: str,
    status: str,
    reasoning: str,
) -> None:
    ledger.append(
        {
            "timestamp": _iso_timestamp(),
            "action": action,
            "status": status,
            "reasoning": reasoning,
        }
    )


def _normalize_whitespace(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


def _non_empty_lines(text: str) -> List[str]:
    return [line.strip() for line in (text or "").splitlines() if line.strip()]


def _extract_emails(text: str) -> List[str]:
    return sorted(set(match.group(0) for match in EMAIL_REGEX.finditer(text or "")))


def _extract_phones(text: str) -> List[str]:
    return sorted(set(match.group(0).strip() for match in PHONE_REGEX.finditer(text or "")))


def _tokenize(text: str) -> List[str]:
    return re.findall(r"[A-Za-z0-9']+", (text or "").lower())


def _detect_document_type(text: str, provided_type: Optional[str] = None) -> str:
    normalized_hint = (provided_type or "").strip().lower()
    if normalized_hint in SCHEMA_MAP:
        return normalized_hint

    lower_text = (text or "").lower()
    certificate_hits = sum(1 for keyword in CERTIFICATE_KEYWORDS if keyword in lower_text)
    resume_hits = sum(1 for keyword in RESUME_KEYWORDS if keyword in lower_text)
    description_hits = sum(1 for keyword in DESCRIPTION_KEYWORDS if keyword in lower_text)

    if certificate_hits >= 2:
        return "certificate"

    if resume_hits >= 2:
        return "resume"

    if _extract_emails(text) and len(_tokenize(text)) <= 40:
        return "email"

    if description_hits >= 1 or len(_tokenize(text)) > 80:
        return "description"

    return "generic_text"


def _derive_purpose(document_type: str) -> str:
    return {
        "certificate": "academic credential validation",
        "resume": "candidate profile completeness validation",
        "email": "contact field validation",
        "description": "contextual narrative quality validation",
        "generic_text": "general text integrity validation",
    }.get(document_type, "general text validation")


def _resolve_schema(document_type: str, schema_hint: Optional[List[str]] = None) -> List[str]:
    if schema_hint:
        return [field for field in schema_hint if field]
    return SCHEMA_MAP.get(document_type, [])


def _analyze_input(data: OCRPayload) -> Dict[str, Any]:
    normalized_text = _normalize_whitespace(data.raw_text)
    document_type = _detect_document_type(normalized_text, data.document_type)
    required_schema = _resolve_schema(document_type, data.schema_hint)

    return {
        "input_format": "ocr_text",
        "document_type": document_type,
        "purpose": _derive_purpose(document_type),
        "required_schema": required_schema,
        "text_length": len(normalized_text),
        "line_count": len(_non_empty_lines(data.raw_text)),
    }


def _triage_input(analysis: Dict[str, Any], confidence: float) -> Dict[str, str]:
    document_type = analysis["document_type"]
    standard_types = {"certificate", "email"}

    if document_type in standard_types and confidence >= 45:
        return {
            "route": "deterministic_validation",
            "reason": f"{document_type} content looks structured enough for regex and type checks.",
        }

    if document_type in standard_types:
        return {
            "route": "ai_contextual_validation",
            "reason": f"{document_type} content was detected, but OCR confidence is too low for reliable regex-only validation.",
        }

    return {
        "route": "ai_contextual_validation",
        "reason": f"{document_type} content appears narrative or complex and benefits from contextual review.",
    }


def _status_from_score(score: float, hard_fail: bool = False) -> str:
    if hard_fail or score < 45:
        return "Failed"
    if score < 75:
        return "Flagged for Review"
    return "Passed"


def _build_certificate_fix_it(
    extracted_data: Dict[str, Any],
    validation: Dict[str, Any],
    confidence: float,
) -> Optional[Dict[str, Any]]:
    missing_fields = [
        field
        for field in ("student_name", "roll_number", "institution_name", "course", "degree")
        if not extracted_data.get(field)
    ]
    warnings = list(validation.get("warnings", []))

    if not missing_fields and confidence >= 60 and not warnings:
        return None

    actions = []
    if missing_fields:
        actions.append("Supply the missing certificate fields or upload a clearer document.")
    if confidence < 60:
        actions.append("Re-run OCR with a higher-resolution scan or sharper crop.")
    if warnings:
        actions.append("Review OCR output for formatting issues before resubmitting.")

    return {
        "payload_type": "certificate_fix_it",
        "missing_fields": missing_fields,
        "warnings": warnings,
        "suggested_actions": actions,
        "suggested_patch": {
            "student_name": extracted_data.get("student_name") or "",
            "roll_number": extracted_data.get("roll_number") or "",
            "institution_name": extracted_data.get("institution_name") or "",
            "course": extracted_data.get("course") or "",
            "degree": extracted_data.get("degree") or "",
        },
    }


def _run_certificate_deterministic_validation(text: str, confidence: float) -> Dict[str, Any]:
    extracted_data = extract_certificate_data(text)
    validation = validate_certificate_format(extracted_data)
    completeness = round(float(validation.get("completeness_score", 0)) * 100, 2)

    missing_fields = [
        field
        for field in ("student_name", "roll_number", "institution_name", "course", "degree")
        if not extracted_data.get(field)
    ]
    score = round((confidence * 0.45) + (completeness * 0.55), 2)
    hard_fail = bool(validation.get("error")) or len(missing_fields) >= 3 or confidence < 30
    status = _status_from_score(score, hard_fail=hard_fail or not validation.get("is_valid", True))

    if validation.get("is_valid") and confidence >= 60:
        reasoning = "Required certificate fields were extracted and OCR confidence is acceptable."
    elif missing_fields:
        reasoning = f"Certificate schema is incomplete. Missing: {', '.join(missing_fields)}."
    else:
        reasoning = "Certificate text was parsed, but confidence or field quality is too weak for a clean pass."

    return {
        "mode": "deterministic",
        "status": status,
        "score": score,
        "reasoning": reasoning,
        "extracted_data": extracted_data,
        "schema_validation": validation,
        "fix_it_payload": _build_certificate_fix_it(extracted_data, validation, confidence),
    }


def _run_email_deterministic_validation(text: str, confidence: float) -> Dict[str, Any]:
    email_addresses = _extract_emails(text)
    score = round((confidence * 0.6) + (40 if email_addresses else 0), 2)
    hard_fail = not email_addresses and confidence < 40
    status = _status_from_score(score, hard_fail=hard_fail)

    if email_addresses:
        reasoning = "At least one syntactically valid email address was detected."
    else:
        reasoning = "No valid email address pattern was found in the OCR text."

    fix_it_payload = None
    if not email_addresses or confidence < 60:
        fix_it_payload = {
            "payload_type": "email_fix_it",
            "missing_fields": ["email_address"] if not email_addresses else [],
            "suggested_actions": [
                "Confirm the email text is visible and not truncated.",
                "Re-run OCR if the @ symbol or domain was misread.",
            ],
            "suggested_patch": {
                "email_address": email_addresses[0] if email_addresses else "",
            },
        }

    return {
        "mode": "deterministic",
        "status": status,
        "score": score,
        "reasoning": reasoning,
        "extracted_data": {"email_addresses": email_addresses},
        "schema_validation": {
            "is_valid": bool(email_addresses),
            "errors": [] if email_addresses else ["Missing required field: email_address"],
            "warnings": [] if confidence >= 60 else ["OCR confidence is below the preferred threshold"],
        },
        "fix_it_payload": fix_it_payload,
    }


def _run_certificate_contextual_validation(text: str, confidence: float) -> Dict[str, Any]:
    extracted_data = extract_certificate_data(text)
    validation = validate_certificate_format(extracted_data)
    extracted_fields = extracted_data.get("extracted_fields", [])
    keyword_hits = sum(1 for keyword in CERTIFICATE_KEYWORDS if keyword in text.lower())
    schema_coverage = len(extracted_fields) / 7 if extracted_fields else 0
    score = round((confidence * 0.3) + (schema_coverage * 50) + min(keyword_hits, 5) * 4, 2)

    issues = []
    if not validation.get("is_valid", True):
        issues.extend(validation.get("errors", []))
    if confidence < 45:
        issues.append("OCR confidence is too low for a reliable document-level decision.")
    if schema_coverage < 0.5:
        issues.append("Certificate context is incomplete and needs a cleaner source document.")

    reasoning = (
        "Certificate-like language was detected, but contextual confidence is reduced by missing schema fields or noisy OCR."
        if issues
        else "Certificate context is consistent with an academic credential document."
    )

    return {
        "mode": "contextual",
        "status": _status_from_score(score, hard_fail=schema_coverage < 0.3 and confidence < 35),
        "score": score,
        "reasoning": reasoning,
        "signals": {
            "schema_coverage": round(schema_coverage, 2),
            "keyword_hits": keyword_hits,
            "extracted_fields": extracted_fields,
        },
        "issues": issues,
        "fix_it_payload": _build_certificate_fix_it(extracted_data, validation, confidence),
    }


def _run_resume_contextual_validation(text: str, confidence: float) -> Dict[str, Any]:
    lower_text = text.lower()
    sections = {
        "education": bool(re.search(r"\beducation\b", lower_text)),
        "experience": bool(re.search(r"\b(experience|employment|work history)\b", lower_text)),
        "skills": bool(re.search(r"\bskills?\b", lower_text)),
        "projects": bool(re.search(r"\bprojects?\b", lower_text)),
    }
    emails = _extract_emails(text)
    phones = _extract_phones(text)
    chronology_present = bool(YEAR_REGEX.search(text))

    section_score = (sum(1 for present in sections.values() if present) / len(sections)) * 50
    contact_score = 15 if (emails or phones) else 0
    chronology_score = 10 if chronology_present else 0
    score = round((confidence * 0.25) + section_score + contact_score + chronology_score, 2)

    missing_sections = [name for name, present in sections.items() if not present and name in {"education", "experience", "skills"}]
    issues = []
    if missing_sections:
        issues.append(f"Missing core resume sections: {', '.join(missing_sections)}.")
    if not (emails or phones):
        issues.append("No contact details were detected.")
    if confidence < 50:
        issues.append("OCR confidence is below the preferred threshold for resume parsing.")

    reasoning = (
        "Resume sections and contact details are sufficiently present for a contextual pass."
        if not issues
        else "Resume content was detected, but key narrative sections or contact details are incomplete."
    )

    fix_it_payload = None
    if issues:
        fix_it_payload = {
            "payload_type": "resume_fix_it",
            "missing_sections": missing_sections,
            "suggested_actions": [
                "Add clearly labeled Education, Experience, and Skills sections.",
                "Ensure phone number or email is readable in the source document.",
                "Use a higher-quality scan if OCR missed headings or dates.",
            ],
            "suggested_patch": {
                "contact_email": emails[0] if emails else "",
                "contact_phone": phones[0] if phones else "",
                "education": "Add education details",
                "experience": "Add experience details",
                "skills": "Add skills list",
            },
        }

    return {
        "mode": "contextual",
        "status": _status_from_score(score, hard_fail=len(missing_sections) >= 3 and confidence < 40),
        "score": score,
        "reasoning": reasoning,
        "signals": {
            "detected_sections": sections,
            "contact_detected": bool(emails or phones),
            "chronology_detected": chronology_present,
        },
        "issues": issues,
        "fix_it_payload": fix_it_payload,
    }


def _run_generic_contextual_validation(text: str, confidence: float, document_type: str) -> Dict[str, Any]:
    tokens = _tokenize(text)
    word_count = len(tokens)
    sentence_count = len(re.findall(r"[.!?]+", text)) or max(1, len(_non_empty_lines(text)))
    unique_ratio = (len(set(tokens)) / word_count) if word_count else 0
    noise_ratio = 0

    if text:
        noisy_characters = sum(1 for char in text if not (char.isalnum() or char.isspace() or char in ".,:/-()@"))
        noise_ratio = noisy_characters / len(text)

    score = round(
        min(word_count / 120, 1) * 35
        + min(sentence_count / 4, 1) * 20
        + (confidence / 100) * 25
        + min(unique_ratio, 1) * 20,
        2,
    )

    issues = []
    if word_count < 25:
        issues.append("Content is too short for reliable contextual validation.")
    if sentence_count < 2:
        issues.append("Not enough sentence structure was detected.")
    if unique_ratio < 0.35:
        issues.append("Text appears repetitive or degraded.")
    if noise_ratio > 0.12:
        issues.append("OCR noise level is high.")

    reasoning = (
        f"{document_type.replace('_', ' ').title()} content has enough textual structure for contextual assessment."
        if not issues
        else f"{document_type.replace('_', ' ').title()} content needs cleanup or enrichment before it can be trusted."
    )

    fix_it_payload = None
    if issues:
        fix_it_payload = {
            "payload_type": "context_fix_it",
            "issues": issues,
            "suggested_actions": [
                "Provide more complete text content with clearer sentence boundaries.",
                "Remove OCR artifacts and re-run extraction if characters were distorted.",
            ],
            "suggested_patch": {
                "content_summary": _normalize_whitespace(text)[:160],
            },
        }

    return {
        "mode": "contextual",
        "status": _status_from_score(score, hard_fail=word_count < 10 and confidence < 35),
        "score": score,
        "reasoning": reasoning,
        "signals": {
            "word_count": word_count,
            "sentence_count": sentence_count,
            "unique_token_ratio": round(unique_ratio, 2),
            "noise_ratio": round(noise_ratio, 2),
        },
        "issues": issues,
        "fix_it_payload": fix_it_payload,
    }


def _run_contextual_validation(text: str, confidence: float, document_type: str) -> Dict[str, Any]:
    if document_type == "certificate":
        return _run_certificate_contextual_validation(text, confidence)
    if document_type == "resume":
        return _run_resume_contextual_validation(text, confidence)
    return _run_generic_contextual_validation(text, confidence, document_type)


def _select_overall_status(*results: Optional[Dict[str, Any]]) -> str:
    statuses = [result["status"] for result in results if result]
    if "Failed" in statuses:
        return "Failed"
    if "Flagged for Review" in statuses:
        return "Flagged for Review"
    return "Passed"


def _build_integration_requirements(
    analysis: Dict[str, Any],
    confidence: float,
    overall_status: str,
) -> List[Dict[str, Any]]:
    requirements = []

    if confidence < 60:
        requirements.append(
            {
                "tool": "ocr",
                "required": True,
                "reason": "OCR confidence is below 60; re-processing the source document is recommended.",
            }
        )

    if analysis["document_type"] in {"resume", "description", "generic_text"}:
        requirements.append(
            {
                "tool": "vector_db",
                "required": False,
                "reason": "Semantic similarity search would improve contextual checks for narrative content.",
            }
        )

    if overall_status != "Passed":
        requirements.append(
            {
                "tool": "manual_review",
                "required": True,
                "reason": "Validation did not produce a clean pass and needs human confirmation.",
            }
        )

    return requirements


def _record_stat(key: str, error: bool = False, count_request: bool = True) -> None:
    if count_request:
        SERVICE_STATS["requests_total"] += 1
        if key in SERVICE_STATS:
            SERVICE_STATS[key] += 1
    if error:
        SERVICE_STATS["errors_total"] += 1


def _empty_ocr_fix_it_payload() -> Dict[str, Any]:
    return {
        "payload_type": "ocr_fix_it",
        "suggested_actions": [
            "Upload a readable image or PDF and retry OCR.",
            "Ensure the scan is not cropped, blurred, or blank.",
        ],
        "suggested_patch": {
            "raw_text": "Provide OCR extracted text here",
            "confidence": 85,
        },
    }


def _build_empty_ocr_response() -> Dict[str, Any]:
    ledger: List[Dict[str, str]] = []
    _append_ledger(
        ledger,
        "Analyzed OCR payload",
        "Failed",
        "The OCR payload did not include any readable text.",
    )
    _append_ledger(
        ledger,
        "Generated Fix-it payload",
        "Passed",
        "A remediation payload was created so the caller can retry with a better OCR source.",
    )

    return {
        "validation_results": {
            "analysis": {
                "input_format": "ocr_text",
                "document_type": "generic_text",
                "purpose": "general text integrity validation",
                "required_schema": ["content"],
                "text_length": 0,
                "line_count": 0,
            },
            "triage": {
                "route": "ai_contextual_validation",
                "reason": "No structured text is available, so contextual failure handling was used.",
            },
            "deterministic_validation": None,
            "ai_contextual_validation": {
                "mode": "contextual",
                "status": "Failed",
                "score": 0,
                "reasoning": "There is no OCR text to validate.",
                "signals": {
                    "word_count": 0,
                    "sentence_count": 0,
                    "unique_token_ratio": 0,
                    "noise_ratio": 0,
                },
                "issues": ["OCR payload is empty."],
                "fix_it_payload": _empty_ocr_fix_it_payload(),
            },
            "overall_status": "Failed",
            "fix_it_payload": _empty_ocr_fix_it_payload(),
        },
        "integration_requirements": [
            {
                "tool": "ocr",
                "required": True,
                "reason": "No OCR text was present in the request payload.",
            },
            {
                "tool": "manual_review",
                "required": True,
                "reason": "The system cannot validate an empty payload automatically.",
            },
        ],
        "ledger_update": ledger,
    }


def _process_ocr_payload(data: OCRPayload) -> Dict[str, Any]:
    ledger: List[Dict[str, str]] = []
    raw_text = (data.raw_text or "").strip()

    if not raw_text:
        return _build_empty_ocr_response()

    analysis = _analyze_input(data)
    _append_ledger(
        ledger,
        "Analyzed input packet",
        "Passed",
        f"Detected {analysis['document_type']} content for {analysis['purpose']}.",
    )

    triage = _triage_input(analysis, data.confidence)
    _append_ledger(
        ledger,
        "Triaged validation route",
        "Passed",
        triage["reason"],
    )

    deterministic_validation = None
    contextual_validation = None

    if triage["route"] == "deterministic_validation":
        if analysis["document_type"] == "certificate":
            deterministic_validation = _run_certificate_deterministic_validation(raw_text, data.confidence)
        else:
            deterministic_validation = _run_email_deterministic_validation(raw_text, data.confidence)

        _append_ledger(
            ledger,
            f"Ran {analysis['document_type']} deterministic validation",
            deterministic_validation["status"],
            deterministic_validation["reasoning"],
        )

        if deterministic_validation["status"] != "Passed" or data.confidence < 60:
            contextual_validation = _run_contextual_validation(raw_text, data.confidence, analysis["document_type"])
            _append_ledger(
                ledger,
                "Ran supplemental AI contextual validation",
                contextual_validation["status"],
                contextual_validation["reasoning"],
            )
    else:
        contextual_validation = _run_contextual_validation(raw_text, data.confidence, analysis["document_type"])
        _append_ledger(
            ledger,
            "Ran AI contextual validation",
            contextual_validation["status"],
            contextual_validation["reasoning"],
        )

    overall_status = _select_overall_status(deterministic_validation, contextual_validation)
    fix_it_payload = None

    for result in (deterministic_validation, contextual_validation):
        if result and result.get("fix_it_payload"):
            fix_it_payload = result["fix_it_payload"]
            break

    if fix_it_payload:
        _append_ledger(
            ledger,
            "Generated Fix-it payload",
            "Passed",
            "A remediation payload was prepared to help the caller correct the failed or flagged validation.",
        )

    integration_requirements = _build_integration_requirements(analysis, data.confidence, overall_status)
    _append_ledger(
        ledger,
        "Evaluated integration requirements",
        "Passed",
        "External tool recommendations were derived from OCR confidence, document type, and validation outcome.",
    )

    return {
        "validation_results": {
            "analysis": analysis,
            "triage": triage,
            "deterministic_validation": deterministic_validation,
            "ai_contextual_validation": contextual_validation,
            "overall_status": overall_status,
            "fix_it_payload": fix_it_payload,
        },
        "integration_requirements": integration_requirements,
        "ledger_update": ledger,
    }


def _is_pdf_upload(filename: str, content_type: Optional[str]) -> bool:
    lower_name = (filename or "").lower()
    normalized_type = (content_type or "").lower()
    return lower_name.endswith(".pdf") or "pdf" in normalized_type


def _render_pdf_first_page_to_png(file_bytes: bytes) -> bytes:
    document = fitz.open(stream=file_bytes, filetype="pdf")
    try:
        if document.page_count == 0:
            raise ValueError("The PDF does not contain any pages")

        page = document.load_page(0)
        pixmap = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
        image = Image.frombytes("RGB", (pixmap.width, pixmap.height), pixmap.samples)
        buffer = io.BytesIO()
        image.save(buffer, format="PNG")
        return buffer.getvalue()
    finally:
        document.close()


def _extract_pdf_text(file_bytes: bytes) -> str:
    document = fitz.open(stream=file_bytes, filetype="pdf")
    try:
        return "\n".join(page.get_text() for page in document).strip()
    finally:
        document.close()


def _decode_image_bytes(file_bytes: bytes, filename: str, content_type: Optional[str]) -> np.ndarray:
    image_bytes = _render_pdf_first_page_to_png(file_bytes) if _is_pdf_upload(filename, content_type) else file_bytes
    image_array = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError(f"Could not decode uploaded file: {filename or 'document'}")
    return image


def _preprocess_image_for_ocr(image: np.ndarray) -> np.ndarray:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    thresholded = cv2.adaptiveThreshold(
        blurred,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        11,
        2,
    )
    kernel = np.ones((1, 1), np.uint8)
    return cv2.morphologyEx(thresholded, cv2.MORPH_CLOSE, kernel)


def _extract_ocr_from_image(image: np.ndarray) -> Dict[str, Any]:
    try:
        processed_image = _preprocess_image_for_ocr(image)
        word_data = pytesseract.image_to_data(processed_image, output_type=pytesseract.Output.DICT)
        extracted_text = pytesseract.image_to_string(processed_image)

        confidences = []
        for confidence in word_data.get("conf", []):
            try:
                value = float(confidence)
            except (TypeError, ValueError):
                continue
            if value >= 0:
                confidences.append(value)

        average_confidence = sum(confidences) / len(confidences) if confidences else 0.0
        return {
            "text": extracted_text.strip(),
            "confidence": round(average_confidence, 2),
            "word_data": word_data,
        }
    except pytesseract.TesseractNotFoundError as error:
        raise RuntimeError(
            "Tesseract OCR is not installed or not available in PATH. Install Tesseract to enable image OCR."
        ) from error


def _extract_text_from_upload(
    file_bytes: bytes,
    filename: str,
    content_type: Optional[str],
) -> Dict[str, Any]:
    if _is_pdf_upload(filename, content_type):
        native_text = _extract_pdf_text(file_bytes)
        if native_text:
            structured_data = extract_certificate_data(native_text)
            validation = validate_certificate_format(structured_data)
            return {
                "text": native_text,
                "confidence": 85.0,
                "language": "en",
                "source": "pdf_text",
                "structured_data": structured_data,
                "schema_validation": validation,
            }

    image = _decode_image_bytes(file_bytes, filename, content_type)
    ocr_result = _extract_ocr_from_image(image)
    structured_data = extract_certificate_data(ocr_result["text"])
    validation = validate_certificate_format(structured_data)

    return {
        "text": ocr_result["text"],
        "confidence": ocr_result["confidence"],
        "language": "en",
        "source": "rendered_pdf_ocr" if _is_pdf_upload(filename, content_type) else "image_ocr",
        "structured_data": structured_data,
        "schema_validation": validation,
    }


def _percentage(value: Any) -> float:
    try:
        numeric = float(value or 0)
    except (TypeError, ValueError):
        numeric = 0.0
    if 0 <= numeric <= 1:
        numeric *= 100
    return round(max(0.0, min(100.0, numeric)), 2)


def _template_identifier(document_type: Optional[str], institution_name: Optional[str]) -> str:
    base_value = institution_name or document_type or "generic"
    sanitized = re.sub(r"[^a-z0-9]+", "-", str(base_value).strip().lower()).strip("-")
    return f"{sanitized or 'generic'}-template-v1"


def _build_template_match_result(
    ocr_output: Dict[str, Any],
    orchestration_output: Dict[str, Any],
    filename: str,
    content_type: Optional[str],
) -> Dict[str, Any]:
    validation_results = orchestration_output.get("validation_results", {})
    analysis = validation_results.get("analysis", {})
    document_type = analysis.get("document_type", "generic_text")
    overall_status = validation_results.get("overall_status", "Flagged for Review")
    structured_data = ocr_output.get("structured_data", {})
    extracted_fields = structured_data.get("extracted_fields", [])

    score = 10.0
    if document_type == "certificate":
        score += 35
    if overall_status == "Passed":
        score += 20
    elif overall_status == "Flagged for Review":
        score += 8

    score += min(len(extracted_fields), 5) * 6
    score += min(float(ocr_output.get("confidence", 0)), 100.0) * 0.15
    match_score = round(max(0.0, min(100.0, score)), 2)

    institution_name = structured_data.get("institution_name") or structured_data.get("institution")
    template_id = _template_identifier(document_type, institution_name)

    return {
        "match_score": match_score,
        "template_id": template_id,
        "matched_template": {
            "document_type": document_type,
            "institution_name": institution_name or "",
            "filename": filename or "",
            "source_type": "pdf" if _is_pdf_upload(filename, content_type) else "image",
            "required_schema": analysis.get("required_schema", []),
        },
        "confidence": match_score,
    }


def _build_anomaly_result(
    ocr_output: Dict[str, Any],
    tampering_output: Dict[str, Any],
    orchestration_output: Dict[str, Any],
) -> Dict[str, Any]:
    validation_results = orchestration_output.get("validation_results", {})
    overall_status = validation_results.get("overall_status", "Flagged for Review")
    analysis = validation_results.get("analysis", {})
    issues: List[str] = []
    score = 0.0

    ocr_confidence = float(ocr_output.get("confidence", 0))
    if ocr_confidence < 60:
        issues.append("OCR confidence is below the preferred threshold.")
        score += 60 - ocr_confidence

    tampering_score = _percentage(tampering_output.get("confidence_score", 0))
    if tampering_score >= 40:
        issues.append("Tampering analysis reported elevated risk.")
        score += tampering_score * 0.35

    if overall_status == "Flagged for Review":
        issues.append("Contextual validation requested manual review.")
        score += 12
    elif overall_status == "Failed":
        issues.append("Contextual validation failed.")
        score += 25

    deterministic = validation_results.get("deterministic_validation") or {}
    schema_validation = deterministic.get("schema_validation") or ocr_output.get("schema_validation") or {}
    for error_message in schema_validation.get("errors", []):
        issues.append(error_message)
        score += 8

    if analysis.get("document_type") != "certificate":
        issues.append("Uploaded document does not look like a standard certificate.")
        score += 20

    anomaly_score = round(max(0.0, min(100.0, score)), 2)
    return {
        "anomaly_score": anomaly_score,
        "anomalies": issues,
        "confidence": round(max(0.0, 100.0 - anomaly_score), 2),
        "analysis_details": {
            "ocr_confidence": ocr_confidence,
            "tampering_score": tampering_score,
            "document_type": analysis.get("document_type"),
            "overall_status": overall_status,
        },
    }


def _determine_verification_status(
    ocr_confidence: float,
    tamper_score: float,
    anomaly_score: float,
    database_match: bool = False,
) -> str:
    if tamper_score >= 70 or anomaly_score >= 70:
        return "fake"
    if tamper_score >= 40 or anomaly_score >= 40 or ocr_confidence <= 50:
        return "suspicious"
    if database_match or (tamper_score <= 20 and anomaly_score <= 20 and ocr_confidence >= 70):
        return "verified"
    return "pending"


def _calculate_verification_confidence(
    ocr_confidence: float,
    tamper_score: float,
    anomaly_score: float,
    database_match: bool = False,
) -> float:
    score = 0.0
    score += (ocr_confidence / 100.0) * 40.0
    score += ((100.0 - tamper_score) / 100.0) * 30.0
    score += 20.0 if database_match else 0.0
    score += ((100.0 - anomaly_score) / 100.0) * 10.0
    return round(max(0.0, min(100.0, score)), 2)


async def _run_complete_verification(
    file: UploadFile,
    document_type: Optional[str] = None,
    schema_hint: Optional[List[str]] = None,
) -> Dict[str, Any]:
    filename = file.filename or "uploaded-document"
    content_type = file.content_type
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    started_at = time.perf_counter()
    ocr_output = _extract_text_from_upload(file_bytes, filename, content_type)
    orchestration_output = _process_ocr_payload(
        OCRPayload(
            raw_text=ocr_output["text"],
            confidence=ocr_output["confidence"],
            document_type=document_type,
            schema_hint=schema_hint,
        )
    )

    tampering_details = analyze_certificate_security(
        _render_pdf_first_page_to_png(file_bytes) if _is_pdf_upload(filename, content_type) else file_bytes
    )
    tampering_output = {
        "tampering_detected": bool(tampering_details.get("tampering_detected", False)),
        "confidence_score": _percentage(tampering_details.get("confidence_score", 0)),
        "analysis_details": tampering_details.get("analysis_details", {}),
        "recommendations": tampering_details.get("recommendations", []),
    }
    template_output = _build_template_match_result(ocr_output, orchestration_output, filename, content_type)
    anomaly_output = _build_anomaly_result(ocr_output, tampering_output, orchestration_output)

    processing_time = round((time.perf_counter() - started_at) * 1000, 2)
    verification_status = _determine_verification_status(
        ocr_output["confidence"],
        tampering_output["confidence_score"],
        anomaly_output["anomaly_score"],
    )
    confidence_score = _calculate_verification_confidence(
        ocr_output["confidence"],
        tampering_output["confidence_score"],
        anomaly_output["anomaly_score"],
    )
    recommendations = list(
        dict.fromkeys(
            list(tampering_output.get("recommendations", []))
            + [requirement["reason"] for requirement in orchestration_output.get("integration_requirements", [])]
            + anomaly_output.get("anomalies", [])
        )
    )

    return {
        "success": True,
        "verification_status": verification_status,
        "confidence_score": confidence_score,
        "ocr_results": {
            "text": ocr_output["text"],
            "confidence": ocr_output["confidence"],
            "language": ocr_output.get("language", "en"),
            "processing_time": processing_time,
            "structured_data": ocr_output.get("structured_data", {}),
            "schema_validation": ocr_output.get("schema_validation", {}),
            "source": ocr_output.get("source", "image_ocr"),
            "orchestration": orchestration_output,
        },
        "tampering_results": tampering_output,
        "template_results": template_output,
        "anomaly_results": anomaly_output,
        "orchestration_results": orchestration_output,
        "recommendations": recommendations,
        "processing_time": processing_time,
    }

# --- ROUTES ---

@app.get("/")
async def root():
    """Root endpoint to verify the service is running."""
    return {"message": "AI Certificate Verification Service", "status": "running"}

@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring."""
    return {
        "status": "healthy",
        "service": "ai-verification",
        "uptime_seconds": round(time.time() - SERVICE_STARTED_AT, 2),
    }


@app.get("/stats")
async def get_stats():
    return {
        "uptime_seconds": round(time.time() - SERVICE_STARTED_AT, 2),
        "statistics": SERVICE_STATS,
    }

@app.post("/ai/process-ocr")
async def process_frontend_ocr(data: OCRPayload):
    """
    Receives extracted text and confidence score from the frontend.
    """
    try:
        _record_stat("process_ocr_requests")
        logger.info(f"Received OCR data. Confidence: {data.confidence}%")
        return _process_ocr_payload(data)
    except Exception as error:
        _record_stat("process_ocr_requests", error=True, count_request=False)
        logger.error(f"Error processing OCR data: {error}")
        raise HTTPException(status_code=500, detail=str(error))


@app.post("/ai/ocr/extract")
async def extract_ocr(
    file: UploadFile = File(...),
    document_type: Optional[str] = Form(None),
):
    try:
        _record_stat("ocr_requests")
        started_at = time.perf_counter()
        file_bytes = await file.read()
        if not file_bytes:
            raise HTTPException(status_code=400, detail="Uploaded file is empty")

        ocr_output = _extract_text_from_upload(file_bytes, file.filename or "", file.content_type)
        orchestration = _process_ocr_payload(
            OCRPayload(
                raw_text=ocr_output["text"],
                confidence=ocr_output["confidence"],
                document_type=document_type,
            )
        )

        return {
            "success": True,
            "text": ocr_output["text"],
            "confidence": ocr_output["confidence"],
            "language": ocr_output.get("language", "en"),
            "processing_time": round((time.perf_counter() - started_at) * 1000, 2),
            "structured_data": ocr_output.get("structured_data", {}),
            "schema_validation": ocr_output.get("schema_validation", {}),
            "validation_results": orchestration.get("validation_results"),
            "integration_requirements": orchestration.get("integration_requirements", []),
            "ledger_update": orchestration.get("ledger_update", []),
        }
    except HTTPException:
        _record_stat("ocr_requests", error=True, count_request=False)
        raise
    except Exception as error:
        _record_stat("ocr_requests", error=True, count_request=False)
        logger.error(f"OCR extraction failed: {error}")
        raise HTTPException(status_code=500, detail=str(error))


@app.post("/ai/verify/tampering")
async def verify_tampering(file: UploadFile = File(...)):
    try:
        _record_stat("tampering_requests")
        file_bytes = await file.read()
        if not file_bytes:
            raise HTTPException(status_code=400, detail="Uploaded file is empty")

        analysis = analyze_certificate_security(
            _render_pdf_first_page_to_png(file_bytes) if _is_pdf_upload(file.filename or "", file.content_type) else file_bytes
        )

        return {
            "tampering_detected": bool(analysis.get("tampering_detected", False)),
            "confidence_score": _percentage(analysis.get("confidence_score", 0)),
            "analysis_details": analysis.get("analysis_details", {}),
            "recommendations": analysis.get("recommendations", []),
            "certificate_analysis": analysis.get("certificate_analysis", {}),
            "is_likely_authentic": bool(analysis.get("is_likely_authentic", False)),
        }
    except HTTPException:
        _record_stat("tampering_requests", error=True, count_request=False)
        raise
    except Exception as error:
        _record_stat("tampering_requests", error=True, count_request=False)
        logger.error(f"Tampering verification failed: {error}")
        raise HTTPException(status_code=500, detail=str(error))


@app.post("/ai/verify/template")
async def verify_template(
    file: UploadFile = File(...),
    template_id: Optional[str] = Form(None),
):
    try:
        _record_stat("template_requests")
        file_bytes = await file.read()
        if not file_bytes:
            raise HTTPException(status_code=400, detail="Uploaded file is empty")

        ocr_output = _extract_text_from_upload(file_bytes, file.filename or "", file.content_type)
        orchestration = _process_ocr_payload(
            OCRPayload(raw_text=ocr_output["text"], confidence=ocr_output["confidence"])
        )
        template_output = _build_template_match_result(ocr_output, orchestration, file.filename or "", file.content_type)
        if template_id:
            template_output["template_id"] = template_id

        return template_output
    except HTTPException:
        _record_stat("template_requests", error=True, count_request=False)
        raise
    except Exception as error:
        _record_stat("template_requests", error=True, count_request=False)
        logger.error(f"Template verification failed: {error}")
        raise HTTPException(status_code=500, detail=str(error))


@app.post("/ai/analyze/anomaly")
async def analyze_anomaly(file: UploadFile = File(...)):
    try:
        _record_stat("anomaly_requests")
        file_bytes = await file.read()
        if not file_bytes:
            raise HTTPException(status_code=400, detail="Uploaded file is empty")

        ocr_output = _extract_text_from_upload(file_bytes, file.filename or "", file.content_type)
        orchestration = _process_ocr_payload(
            OCRPayload(raw_text=ocr_output["text"], confidence=ocr_output["confidence"])
        )
        tampering_details = analyze_certificate_security(
            _render_pdf_first_page_to_png(file_bytes) if _is_pdf_upload(file.filename or "", file.content_type) else file_bytes
        )
        tampering_output = {
            "confidence_score": _percentage(tampering_details.get("confidence_score", 0)),
        }
        return _build_anomaly_result(ocr_output, tampering_output, orchestration)
    except HTTPException:
        _record_stat("anomaly_requests", error=True, count_request=False)
        raise
    except Exception as error:
        _record_stat("anomaly_requests", error=True, count_request=False)
        logger.error(f"Anomaly analysis failed: {error}")
        raise HTTPException(status_code=500, detail=str(error))


@app.post("/ai/verify/complete")
async def verify_complete(
    file: UploadFile = File(...),
    document_type: Optional[str] = Form(None),
):
    try:
        _record_stat("complete_verification_requests")
        return await _run_complete_verification(file, document_type=document_type)
    except HTTPException:
        _record_stat("complete_verification_requests", error=True, count_request=False)
        raise
    except Exception as error:
        _record_stat("complete_verification_requests", error=True, count_request=False)
        logger.error(f"Complete verification failed: {error}")
        raise HTTPException(status_code=500, detail=str(error))

if __name__ == "__main__":
    # Runs the server on port 8001
    uvicorn.run(app, host="0.0.0.0", port=8001)
