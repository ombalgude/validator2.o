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
102003 SYSTEMS IN MECH. ENGG. TH 03 03 A 27
102003 SYSTEMS IN MECH. ENGG. PR 01 01 A 09
104010 BASIC ELECTRONICS ENGG. TH 03 03 C 21
104010 BASIC ELECTRONICS ENGG. PR 01 01 O 10
107001 ENGINEERING MATHEMATICS I TH 03 03 A 27
107001 ENGINEERING MATHEMATICS I TW 01 01 O 10
107009 ENGINEERING CHEMISTRY TH 04 04 B 32
107009 ENGINEERING CHEMISTRY PR 01 01 O 10
111006 WORKSHOP PR 01 01 A 09
101007 ENVIRONMENTAL STUDIES-I AC 00 00 AC 00
SEM.::2
102012 ENGINEERING GRAPHICS * TH 01 01 C 07
102012 ENGINEERING GRAPHICS * TW 01 01 O 10
103004 BASIC ELECTRICAL ENGG. * TH 03 03 A 27
103004 BASIC ELECTRICAL ENGG. * PR 01 01 O 10
107002 ENGINEERING PHYSICS * TH 04 04 B 32
107002 ENGINEERING PHYSICS * PR 01 01 O 10
107008 ENGINEERING MATHEMATICS II * TH 04 04 B 32
107008 ENGINEERING MATHEMATICS II * TW 01 01 O 10
110005 PROG. & PROBLEM SOLVING * TH 03 03 C 21
110005 PROG. & PROBLEM SOLVING * PR 01 01 A 09
110013 PROJECT BASED LEARNING * TW+PR 02 02 O 20
101014 ENVIRONMENTAL STUDIES-II * AC 00 00 AC 00
107015 PHY.EDU.-EXER.& FIELD ACTI. * AC 00 00 AC 00
22295 DEMOCRACY, ELECTION AND GOV. * AC 00 00 AC 00
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
    assert len(data["subjects"]) == 26
    assert all(subject["grade"] for subject in data["subjects"])
    assert [subject["course_name"] for subject in data["subjects"]] == [
        "Engineering Mechanics",
        "Engineering Mechanics",
        "Systems In Mech. Engg.",
        "Systems In Mech. Engg.",
        "Basic Electronics Engg.",
        "Basic Electronics Engg.",
        "Engineering Mathematics I",
        "Engineering Mathematics I",
        "Engineering Chemistry",
        "Engineering Chemistry",
        "Workshop",
        "Environmental Studies-I",
        "Engineering Graphics",
        "Engineering Graphics",
        "Basic Electrical Engg.",
        "Basic Electrical Engg.",
        "Engineering Physics",
        "Engineering Physics",
        "Engineering Mathematics II",
        "Engineering Mathematics II",
        "Prog. & Problem Solving",
        "Prog. & Problem Solving",
        "Project Based Learning",
        "Environmental Studies-II",
        "Phy.Edu.-Exer.& Field Acti.",
        "Democracy, Election And Gov.",
    ]
    assert data["subjects"][0] == {
        "course_code": "101011",
        "course_name": "Engineering Mechanics",
        "type": "TH",
        "credits": "03",
        "grade": "D",
        "credit_points": "18",
    }
    assert data["subjects"][1] == {
        "course_code": "101011",
        "course_name": "Engineering Mechanics",
        "type": "PR",
        "credits": "01",
        "grade": "O",
        "credit_points": "10",
    }
    assert data["subjects"][4] == {
        "course_code": "104010",
        "course_name": "Basic Electronics Engg.",
        "type": "TH",
        "credits": "03",
        "grade": "C",
        "credit_points": "21",
    }
    assert data["subjects"][20] == {
        "course_code": "110005",
        "course_name": "Prog. & Problem Solving",
        "type": "TH",
        "credits": "03",
        "grade": "C",
        "credit_points": "21",
    }


def test_extract_sppu_marksheet_grades_from_noisy_grade_column():
    noisy_text = """
    COURSE CODE COURSE NAME CO. TYPE TOT. CRD EARN. CRD GRD CRD. PTS
    101011 ENGINEERING MECHANICS PR 01 10 0 10
    104010 BASIC ELECTRONICS ENGG. PR 01 0 10
    107001 ENGINEERING MATHEMATICS 1 TW 01 0 10
    104010 BASIC ELECTRONICS ENGG. TH 03 03 \u00a9 21
    102012 ENGINEERING GRAPHICS * TH 01 0 7
    107008 ENGINEERING MATHEMATICS II * TW 01 0 10
    102012 ENGINEERING GRAPHICS * TH 01 7
    107001 ENGINEERING MATHEMATICS I TH 03 03 A 04
    110005 PROG. & PROBLEM SOLVING * TH 03 03 21
    110006 WORKSHOP PR 01 01 A 04
    110013 PROJECT BASED LEARNING * TW+PR 02 02 0 20
    101007 <<ENVIRONMENTAL STUDIES-I AC 00 00 AC 00
    101014 ENVIRONMENTAL STUDIES-Ii * AC 60 60 AC 60
    107015 PHY. EDU.-EXER.& FIELD ACTI * AC 00 00 AC 00
    22295 DEMORACY, ELECTION AND GOV * AC 00 00 AC 00
    """

    data = extract_certificate_data(noisy_text)

    assert data["subjects"] == [
        {
            "course_code": "101011",
            "course_name": "Engineering Mechanics",
            "type": "PR",
            "credits": "01",
            "grade": "O",
            "credit_points": "10",
        },
        {
            "course_code": "104010",
            "course_name": "Basic Electronics Engg.",
            "type": "PR",
            "credits": "01",
            "grade": "O",
            "credit_points": "10",
        },
        {
            "course_code": "107001",
            "course_name": "Engineering Mathematics I",
            "type": "TW",
            "credits": "01",
            "grade": "O",
            "credit_points": "10",
        },
        {
            "course_code": "104010",
            "course_name": "Basic Electronics Engg.",
            "type": "TH",
            "credits": "03",
            "grade": "C",
            "credit_points": "21",
        },
        {
            "course_code": "102012",
            "course_name": "Engineering Graphics",
            "type": "TH",
            "credits": "01",
            "grade": "C",
            "credit_points": "07",
        },
        {
            "course_code": "107008",
            "course_name": "Engineering Mathematics II",
            "type": "TW",
            "credits": "01",
            "grade": "O",
            "credit_points": "10",
        },
        {
            "course_code": "102012",
            "course_name": "Engineering Graphics",
            "type": "TH",
            "credits": "01",
            "grade": "C",
            "credit_points": "07",
        },
        {
            "course_code": "107001",
            "course_name": "Engineering Mathematics I",
            "type": "TH",
            "credits": "03",
            "grade": "A",
            "credit_points": "27",
        },
        {
            "course_code": "110005",
            "course_name": "Prog. & Problem Solving",
            "type": "TH",
            "credits": "03",
            "grade": "C",
            "credit_points": "21",
        },
        {
            "course_code": "110006",
            "course_name": "Workshop",
            "type": "PR",
            "credits": "01",
            "grade": "A",
            "credit_points": "09",
        },
        {
            "course_code": "110013",
            "course_name": "Project Based Learning",
            "type": "TW+PR",
            "credits": "02",
            "grade": "O",
            "credit_points": "20",
        },
        {
            "course_code": "101007",
            "course_name": "Environmental Studies-I",
            "type": "AC",
            "credits": "00",
            "grade": "AC",
            "credit_points": "00",
        },
        {
            "course_code": "101014",
            "course_name": "Environmental Studies-II",
            "type": "AC",
            "credits": "00",
            "grade": "AC",
            "credit_points": "00",
        },
        {
            "course_code": "107015",
            "course_name": "Phy.Edu.-Exer.& Field Acti.",
            "type": "AC",
            "credits": "00",
            "grade": "AC",
            "credit_points": "00",
        },
        {
            "course_code": "22295",
            "course_name": "Democracy, Election And Gov.",
            "type": "AC",
            "credits": "00",
            "grade": "AC",
            "credit_points": "00",
        },
    ]
