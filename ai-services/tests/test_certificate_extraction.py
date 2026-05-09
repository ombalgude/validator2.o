from pathlib import Path
import sys


UTILS_DIR = Path(__file__).resolve().parents[1] / "utils"
if str(UTILS_DIR) not in sys.path:
    sys.path.insert(0, str(UTILS_DIR))

from data_helpers import extract_certificate_data


SPPU_MARKSHEET_TEXT = """
No.: 23 - 1118343
SAVITRIBAI PHULE PUNE UNIVERSITY
STATEMENT OF MARKS/GRADES FOR F.E. (2019 CRED PAT) EXAM, APR/MAY 2023
BRANCH CODE: 05
SEAT NO. F190800262 CENTRE BSCOER[80] PERM. REG. NO: 72255807E
NAME : YAMAJI NEERAJ GURUNATH MOTHER: SAVITA
COLLEGE/SCHOOL [CEGP015710] - BHIVARABAI SAWANT COLL. OF ENGG. &
RESEARCH, NARHE
COURSE CODE COURSE NAME CO. TYPE TOT. CRD EARN. CRD GRD CRD. PTS
SEM.::1
101011 ENGINEERING MECHANICS TH 03 03 D 18
101011 ENGINEERING MECHANICS PR 01 01 O 10
SEM.::2
102012 ENGINEERING GRAPHICS * TH 01 01 C 07
102012 ENGINEERING GRAPHICS * TW 01 01 O 10
103004 BASIC ELECTRICAL ENGG. * TH 03 03 A 27
FIRST YEAR SGPA : 8.43, TOTAL CREDITS EARNED : 44
DATE:O5 SEP 2023 R23122829005
"""


def test_extract_sppu_marksheet_fields_without_table_bleed():
    data = extract_certificate_data(SPPU_MARKSHEET_TEXT)

    assert data["certificate_id"] == "1118343"
    assert data["roll_number"] == "F190800262"
    assert data["prn"] == "72255807E"
    assert data["student_name"] == "Yamaji Neeraj Gurunath"
    assert data["mother_name"] == "Savita"
    assert data["college_code"] == "CEGP015710"
    assert data["institution_name"] == "Bhivarabai Sawant Coll. Of Engg. & Research, Narhe"
    assert data["branch_code"] == "05"
    assert data["course"] == "F.E. (2019 CRED PAT)"
    assert data["exam_session"] == "APR/MAY 2023"
    assert data["issue_date"] == "2023-09-05"
    assert data["grades"]["sgpa"] == "8.43"
    assert data["total_credits"] == "44"
    assert data["subjects"][0] == {
        "course_code": "101011",
        "course_name": "Engineering Mechanics",
        "type": "TH",
        "credits": "03",
        "grade": "D",
        "credit_points": "18",
    }
