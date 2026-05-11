from pathlib import Path
import sys
import json

from fastapi.testclient import TestClient


API_DIR = Path(__file__).resolve().parents[1] / "api"
if str(API_DIR) not in sys.path:
    sys.path.insert(0, str(API_DIR))

import main


client = TestClient(main.app)


def test_tampering_output_converts_numpy_values_for_json(monkeypatch):
    def fake_analyze_certificate_security(_raw_bytes):
        return {
            "tampering_detected": main.np.bool_(False),
            "confidence_score": main.np.float32(0.12),
            "analysis_details": {
                "scores": main.np.array([main.np.float32(0.1), main.np.float32(0.2)]),
                "metadata": {"has_exif": main.np.bool_(True)},
            },
            "certificate_analysis": {
                "has_signature_area": main.np.bool_(True),
                "border_integrity": main.np.float64(0.03),
            },
            "is_likely_authentic": main.np.bool_(True),
        }

    monkeypatch.setattr(main, "analyze_certificate_security", fake_analyze_certificate_security)

    payload = main._build_tampering_output(b"fake-image-bytes")

    json.dumps(payload)
    assert payload["tampering_detected"] is False
    assert payload["analysis_details"]["metadata"]["has_exif"] is True
    assert payload["certificate_analysis"]["has_signature_area"] is True


def test_process_ocr_routes_structured_email_to_deterministic_validation():
    response = client.post(
        "/ai/process-ocr",
        json={
            "raw_text": "Primary Contact: validator.team@example.com",
            "confidence": 91,
        },
    )

    assert response.status_code == 200
    payload = response.json()

    assert set(payload.keys()) == {
        "validation_results",
        "integration_requirements",
        "ledger_update",
    }
    assert payload["validation_results"]["triage"]["route"] == "deterministic_validation"
    assert payload["validation_results"]["deterministic_validation"]["status"] == "Passed"
    assert payload["validation_results"]["ai_contextual_validation"] is None
    assert len(payload["ledger_update"]) >= 3


def test_process_ocr_routes_resume_text_to_contextual_validation():
    resume_text = """
    Jane Doe
    jane.doe@example.com
    Education
    Bachelor of Science in Computer Science
    Experience
    Software Engineer 2022 2024
    Skills
    Python, FastAPI, React
    Projects
    Authenticity validation platform
    """

    response = client.post(
        "/ai/process-ocr",
        json={
            "raw_text": resume_text,
            "confidence": 78,
        },
    )

    assert response.status_code == 200
    payload = response.json()

    assert payload["validation_results"]["analysis"]["document_type"] == "resume"
    assert payload["validation_results"]["triage"]["route"] == "ai_contextual_validation"
    assert payload["validation_results"]["deterministic_validation"] is None
    assert payload["validation_results"]["ai_contextual_validation"]["status"] == "Passed"
    assert payload["ledger_update"][0]["action"] == "Analyzed input packet"
