# PROJECT_DESCRIPTION.md

## 1. Project Overview

**Project name:** Authenticity Validator  
**Frontend branding used in the repository:** ValidX, AuthentiCert, and Authenticity Validator  
**Project type:** Full-stack academic certificate verification platform with AI-assisted document analysis, role-based trust management, optional blockchain anchoring, and real-time verification updates.

This project is a multi-service system designed to verify the authenticity of academic certificates and similar trust-sensitive documents. The repository combines a web frontend, a Node.js backend, a Python AI microservice, MongoDB persistence, optional blockchain verification routes, and deployment assets for containerized execution.

At a conceptual level, the project addresses a common institutional problem: certificates are easy to scan, copy, edit, and circulate, while manual verification is slow and difficult to scale. The system therefore attempts to combine:

- structured institutional record storage,
- AI-assisted OCR and tampering analysis,
- normalized hashing of certificate content,
- role-aware access control,
- audit logging,
- optional blockchain-backed document anchoring,
- and real-time notification of verification events.

The repository is especially suitable as a **research prototype** because it exposes not only a user-facing application, but also the internal verification heuristics, API boundaries, data models, and deployment architecture.

## 2. Research-Oriented Abstract

This project implements a distributed certificate authenticity validation platform intended to reduce academic credential fraud through a hybrid pipeline of document ingestion, structured record normalization, OCR-based text extraction, heuristic tampering detection, database-backed record comparison, and optional blockchain verification. The system follows a modular microservice style in which a React frontend handles user interaction, a Node.js backend manages authentication, authorization, certificate workflows, and audit trails, and a Python FastAPI service performs OCR, contextual validation, anomaly analysis, and tamper scoring. MongoDB stores institutional data, trusted certificate records, user roles, and verification logs. A blockchain layer is partially implemented through EVM-compatible smart contract integration and exploratory Solana/Anchor artifacts. The project demonstrates how traditional application architecture, explainable verification heuristics, and trust-oriented ledger concepts can be integrated into a practical certificate validation workflow.

## 3. Problem Statement

Academic and institutional documents are frequently verified in fragmented, manual, and non-standard ways. This creates several practical problems:

- forged or edited certificates may pass superficial inspection,
- employers or third-party reviewers may lack direct access to issuer records,
- institutions may not have a standardized digital verification pipeline,
- paper/PDF/image documents must often be validated from noisy scans,
- verification events may not be transparently logged,
- and cross-institution trust remains difficult without a shared anchoring mechanism.

This project attempts to solve these issues through a layered trust model:

- **institutional trust** through controlled record upload,
- **data trust** through normalized certificate hashing,
- **AI-assisted trust** through OCR, anomaly, and tampering analysis,
- **operational trust** through audit logs and role-based review,
- and **ledger trust** through optional blockchain anchoring.

## 4. Core Objectives

The implemented system appears to pursue the following major objectives:

1. Create a centralized trusted store of certificate records uploaded by authorized institutional actors.
2. Compare candidate documents against trusted records using deterministic content hashing.
3. Detect suspicious or fake documents using OCR confidence, anomaly scoring, and image-level tampering heuristics.
4. Support multiple operational roles such as admins, institution admins, university admins, company admins, and general users.
5. Provide explainable verification outputs rather than a black-box pass/fail response.
6. Maintain verification logs for traceability and auditability.
7. Offer optional blockchain integration for immutable document registration and later public verification.
8. Support deployable full-stack execution through Docker Compose and reverse proxying.

## 5. High-Level System Architecture

```text
+---------------------------+
| React Frontend (Vite)     |
| - Auth UI                 |
| - Dashboard               |
| - Certificate search      |
| - Trusted upload          |
| - Candidate validation    |
| - OCR demo                |
+-------------+-------------+
              |
              v
+---------------------------+
| Node.js Backend (Express) |
| - JWT auth                |
| - Role access control     |
| - Certificate workflows   |
| - Institution management  |
| - Audit logs              |
| - Socket.IO notifications |
| - Optional blockchain API |
+------+------+-------------+
       |      |
       |      +----------------------+
       |                             |
       v                             v
+-------------------+     +------------------------+
| MongoDB           |     | Python AI Service      |
| - users           |     | - OCR                  |
| - institutions    |     | - schema extraction    |
| - certificates    |     | - contextual analysis  |
| - verification    |     | - tamper heuristics    |
|   logs            |     | - anomaly scoring      |
+-------------------+     +------------------------+
                                         |
                                         v
                            +---------------------------+
                            | Optional Blockchain Layer |
                            | - Solidity/EVM contract   |
                            | - Solana/Anchor prototype |
                            +---------------------------+
```

## 6. Main Subsystems

### 6.1 Frontend

The frontend is built with **React 18**, **Vite**, **React Router**, **Tailwind CSS**, **Socket.IO client**, and **Tesseract.js**.

Its main responsibilities are:

- user registration and login,
- role-sensitive routing,
- browsing and filtering certificate records,
- viewing certificate details and verification results,
- uploading trusted certificate records,
- submitting candidate certificate validation requests,
- showing dashboard analytics for admins,
- receiving live status updates via Socket.IO,
- and providing a browser-based OCR demo.

#### Main frontend routes

| Route | Purpose |
| --- | --- |
| `/` | Marketing/landing page |
| `/demo` | OCR demo page with public verification integration |
| `/login` | General user login |
| `/login-institution` | Institution-oriented login UX |
| `/register` | Regular user registration |
| `/register-institution` | Institution-oriented registration UX |
| `/dashboard` | Admin analytics dashboard |
| `/certificates` | Certificate listing, detail view, candidate validation, manual review |
| `/upload` | Trusted certificate upload for allowed roles |

#### Important frontend design details

- Session state is managed in `AuthContext`.
- The frontend stores the JWT token locally and rehydrates the session by calling `/api/auth/me`.
- Socket.IO is used after login to subscribe the client to role/user/institution rooms.
- The OCR demo uses **client-side Tesseract.js**, which is separate from the server-side Python OCR service.
- The institution login and institution registration pages are mostly UX variations of the same backend authentication flow; they do not themselves create privileged roles.

### 6.2 Backend API

The backend is built with **Express 5**, **Mongoose**, **JWT**, **bcrypt**, **Socket.IO**, **multer**, and **ethers**.

Its responsibilities include:

- authentication and user session validation,
- role-based authorization,
- institution management,
- user management,
- access-profile management for specialized roles,
- trusted certificate ingestion,
- candidate certificate comparison,
- audit logging,
- dashboard analytics,
- and optional blockchain-facing operations.

#### Registered route groups

| Route prefix | Function |
| --- | --- |
| `/api/auth` | Register, login, current user |
| `/api/users` | User CRUD and deactivation |
| `/api/certificates` | Trusted upload, bulk upload, candidate validation, listing, detail lookup, manual review |
| `/api/institutions` | Institution CRUD and verification |
| `/api/dashboard` | Admin metrics, trends, alerts |
| `/api/verification-logs` | Audit trail access |
| `/api/access` | Institution admin, university admin, and company admin profile management |
| `/api/admin/blockchain` | Admin-only blockchain document registration |
| `/api/verify` | Public blockchain verification endpoint |
| `/api/health` | Service health |

#### Important architectural note

The backend uses `loadOptionalRoute(...)` for blockchain-related routes. If blockchain configuration is missing or route loading fails, those endpoints degrade to **HTTP 503** instead of crashing the whole application. This is an important resilience decision for a research prototype with partially optional subsystems.

### 6.3 AI Microservice

The AI service is built with **FastAPI**, **pytesseract**, **OpenCV**, **PyMuPDF**, **Pillow**, and **NumPy**.

This service is called by the Node.js backend for document analysis. Despite the repository's marketing language, the current implementation is best described as a **hybrid OCR and heuristic analysis engine**, not a deep-learning-heavy model serving stack.

Its main functions are:

- OCR extraction from uploaded PDF/image documents,
- extraction of structured certificate fields,
- deterministic validation for structured certificate/email inputs,
- contextual validation for less-structured text,
- heuristic tampering detection,
- template scoring,
- anomaly scoring,
- orchestration metadata generation,
- and complete multi-stage verification.

#### AI endpoints

| Endpoint | Purpose |
| --- | --- |
| `/health` | AI service health |
| `/stats` | Service counters |
| `/ai/process-ocr` | Analyze raw OCR text and produce validation/orchestration output |
| `/ai/ocr/extract` | OCR extraction from uploaded document |
| `/ai/verify/tampering` | Image tampering analysis |
| `/ai/verify/template` | Heuristic template scoring |
| `/ai/analyze/anomaly` | Anomaly scoring |
| `/ai/verify/complete` | Full verification pipeline |

### 6.4 Database Layer

MongoDB is the primary system of record. The main persisted entity groups represented in the application are:

- users,
- institutions,
- certificates,
- verification logs,
- institution admin profiles,
- university admin profiles,
- company admin profiles,

The database is initialized in Docker with indexes for common access paths such as:

- unique user email,
- unique institution code,
- unique certificate ID,
- certificate verification status,
- and verification log lookups.

### 6.5 Blockchain Layer

The blockchain portion of the repository is **present but not fully unified**.

There are actually two blockchain directions in the codebase:

1. **EVM/Solidity path**
   - `backend/config/blockchain.js` uses `ethers`.
   - `backend/controllers/admin.controller.js` and `verify.controller.js` call contract methods `addDocument` and `verifyDocument`.
   - `blockchain/contract.sol` defines an Ethereum-style smart contract with owner-managed issuers and document-hash storage.

2. **Solana/Anchor path**
   - `blockchain/programs/lib.rs` defines a Solana Anchor program for certificate accounts.
   - The Solana program supports `initialize_certificate`, `verify_certificate`, and `revoke_certificate`.
   - `Anchor.toml` is configured, but no tracked `blockchain/tests/**/*.ts` test file is present in the repository.

For research writing, the safest description is:

> The repository includes an experimental blockchain subsystem that currently mixes an operational EVM-style integration with an exploratory Solana/Anchor implementation. The ledger layer should therefore be treated as partially implemented and still undergoing architectural consolidation.

## 7. Data Model

### 7.1 User Model

The core user entity stores:

- full name,
- email,
- password hash,
- role,
- institution linkage,
- company name,
- permissions,
- activation state,
- email verification state,
- login timestamps,
- and password change timestamps.

Default roles defined in the backend are:

- `admin`
- `institution_admin`
- `university_admin`
- `company_admin`
- `user`

### 7.2 Institution Model

The institution schema stores:

- institution name and code,
- institution type,
- parent institution ID,
- address and contact information,
- official domains,
- establishment year,
- accreditation,
- API endpoint,
- certificate templates,
- verification state,
- total uploaded certificate count,
- and metadata on who created, updated, or verified the institution.

### 7.3 Certificate Model

This is the most important research entity in the system. A certificate record contains:

- `certificateId`
- `institutionId`
- nested `student` data
- nested `college` data
- nested `exam` data
- list of `subjects`
- `summary`
- `issue`
- derived search fields such as `studentName`, `rollNumber`, `course`, `issueDate`
- `documentHash`
- `certificateHash`
- `hashVersion`
- `verificationStatus`
- `verificationResults`
- uploader metadata
- upload time
- original file information

#### Two distinct hashes are stored

1. **`documentHash`**
   - SHA-256 of the raw uploaded file bytes.
   - Useful for file-level integrity.

2. **`certificateHash`**
   - SHA-256 of a normalized structured certificate payload.
   - Useful for semantic record matching.

This distinction is one of the most important design choices in the project. It separates:

- **binary document integrity**
from
- **content-level semantic integrity**

### 7.4 Verification Log Model

Each verification log records:

- certificate reference,
- user who performed the verification,
- institution reference,
- timestamp,
- result,
- IP address,
- user agent,
- verification method,
- certificate hash,
- actor role,
- and free-form details.

This provides traceability for audits and retrospective analysis.

### 7.5 Specialized Access Profiles

The system does not rely only on a single user role string. It also defines specialized profile collections for:

- institution admins,
- university admins,
- company admins,

These profile records store scoped permissions such as:

- institution assignment,
- company scope,
- assigned institution lists,
- access-scope settings,
- approval capability,
- admin codes,
- and active/inactive profile state.

The `applyUserAccessProfile(...)` helper synchronizes a user's main role state from these profile records.

## 8. Access Control and Trust Boundaries

The repository implements a multi-actor trust model:

| Role | Effective capability |
| --- | --- |
| `admin` | Global system control |
| `institution_admin` | Certificate verification/log access for allowed institutions |
| `university_admin` | Institution/university-scoped upload and management |
| `company_admin` | Certificate verification/log access for allowed Company Hiring Team |

Institution scoping is especially important:

- admins are unrestricted,
- institution and university admins are limited to their assigned institution,
- company admins can be limited to specific institutions or all verified institutions

This makes the project suitable for discussing **role-aware trust architectures** in research writing.

## 9. End-to-End Operational Workflows

### 9.1 User Authentication Workflow

1. A user registers or logs in through the frontend.
2. The backend validates credentials and issues a JWT.
3. The frontend stores the token and calls `/api/auth/me`.
4. The authenticated session is normalized on the client.
5. A Socket.IO connection is opened and the user joins role/user/institution rooms.

### 9.2 Institution Access Provisioning Workflow

1. A normal account is created first.
2. An admin later creates an access profile under `/api/access/...`.
3. The backend synchronizes the profile into the user's live role context.
4. Subsequent requests are institution-scoped according to that profile.

### 9.3 Trusted Certificate Upload Workflow

This is the core issuer-side ingestion path.

1. An admin, institution admin, or university admin uploads a certificate file plus structured metadata.
2. The backend normalizes the certificate payload.
3. The system verifies that the user is allowed to upload to the target institution.
4. The file is stored on disk.
5. `documentHash` is calculated from the file bytes.
6. `certificateHash` is calculated from the normalized structured content.
7. The certificate record is saved in MongoDB as a trusted record.
8. The backend sends the file to the AI microservice for full verification.
9. OCR/tampering/template/anomaly outputs are stored in `verificationResults`.
10. A final verification status is assigned.
11. A verification log is created.
12. Real-time notifications are emitted through Socket.IO.

### 9.4 Candidate Certificate Validation Workflow

This path is different from trusted upload.

1. An authorized reviewer submits structured certificate fields and optionally a file.
2. The backend normalizes the candidate payload.
3. A candidate `certificateHash` is computed.
4. The backend searches trusted records:
   - first by exact certificate hash,
   - then by certificate ID.
5. The comparison is evaluated as:
   - `verified` if the trusted hash matches,
   - `fake` if the certificate ID exists but the content hash differs,
   - `suspicious` if no trusted record exists.
6. A verification log is recorded when a trusted record is involved.

This is a strong research feature because it combines deterministic matching with explainable status transitions.

### 9.5 Manual Review Workflow

Admins and company admins can manually override certificate status through `PUT /api/certificates/:id/verify`.

This supports:

- human-in-the-loop validation,
- manual escalation,
- correction of false positives/false negatives,
- and controlled override of automated decisions.

### 9.6 Public OCR + Blockchain Demo Workflow

The `/demo` page performs OCR in the browser using Tesseract.js. After extraction, it can call the public `/api/verify` endpoint with a `documentData` payload. That payload is normalized and hashed through `backend/utils/hash.js`, then checked against the blockchain contract if blockchain configuration is available.

This means the OCR demo is not just a UI demo; it also acts as a lightweight blockchain verification experiment.

## 10. Verification Methodology

### 10.1 Certificate Payload Normalization

Before hashing or persistence, certificate data is normalized to enforce:

- uppercase for identifier-like fields,
- trimmed strings,
- normalized dates,
- normalized numeric values,
- ordered object keys for hash stability,
- and consistent subject formatting.

This ensures semantically identical certificates produce the same structured hash even when formatting varies.

### 10.2 AI-Oriented OCR Orchestration

The AI service does more than simple OCR extraction. It also:

- detects likely document type,
- triages whether deterministic or contextual validation should run,
- extracts structured certificate fields,
- creates validation results,
- creates integration recommendations,
- and emits a small ledger of reasoning actions.

This makes the analysis more explainable than a single opaque confidence score.

For uploaded documents, the extraction path is also layered:

- PDFs are first checked for native embedded text.
- If native PDF text is unavailable, the first page is rendered to an image and OCR is applied.
- Image uploads are preprocessed with grayscale conversion, blur reduction, adaptive thresholding, and morphological cleanup before OCR.

### 10.3 Tampering Detection

The tampering subsystem is heuristic and computer-vision-driven. It uses:

- grayscale conversion,
- blur and threshold preprocessing,
- error-level-style difference scoring,
- noise pattern analysis,
- compression artifact analysis,
- metadata inspection,
- signature-area heuristics,
- seal/circle detection,
- text clarity estimation,
- and border integrity checks.

This should be described in research writing as a **rule-based digital forensics heuristic module**, not as a trained forensic classifier.

### 10.4 Template Matching

Template matching is currently heuristic. The service derives a template score from:

- document type,
- validation status,
- OCR confidence,
- and number of extracted fields.

The template ID itself is generated from document type or institution name. This means the current implementation behaves more like **template inference/scoring** than a strict template-library matching system.

### 10.5 Anomaly Scoring

Anomaly detection aggregates:

- low OCR confidence,
- elevated tampering risk,
- validation errors,
- document-type mismatch,
- and contextual validation warnings.

This produces an anomaly score and a list of human-readable anomalies.

### 10.6 Verification Status Logic

The backend ultimately assigns status using explicit thresholds:

```text
If tamperScore >= 70 or anomalyScore >= 70 => fake
Else if tamperScore >= 40 or anomalyScore >= 40 or ocrConfidence <= 50 => suspicious
Else if databaseMatch is true or (tamperScore <= 20 and anomalyScore <= 20 and ocrConfidence >= 70) => verified
Else => pending
```

This is important because it provides a clear, reproducible decision rule for experimentation.

### 10.7 Verification Confidence Formula

The AI service also computes a verification confidence score using weighted factors:

```text
40% OCR confidence
30% inverse tamper score
20% database match bonus
10% inverse anomaly score
```

This can be cited as a handcrafted ensemble confidence function.

## 11. Blockchain Logic

### 11.1 Solidity Contract

The Solidity contract `DocumentVerification` supports:

- owner-managed authorized issuers,
- document hash registration by authorized issuers,
- and public verification of whether a hash exists, who issued it, and when.

This model fits a minimal trust anchoring use case:

- institutions register a canonical document hash on-chain,
- third parties later verify the presence of that hash.

### 11.2 Backend Blockchain Endpoints

- `POST /api/admin/blockchain/add-document`
  - admin-only
  - hashes `documentData`
  - submits `addDocument(...)`

- `POST /api/verify`
  - public
  - hashes `documentData`
  - calls `verifyDocument(...)`

### 11.3 Solana Program

The Solana Anchor program stores:

- certificate ID,
- student name,
- institution ID,
- document hash,
- verification status,
- verification results,
- creation time,
- update time.

It also supports revocation. Conceptually, this is richer than the Solidity contract, but it is not yet the active backend integration path.

## 12. Real-Time Notification Model

The backend maintains Socket.IO rooms for:

- individual users,
- institutions,
- and admins.

Notifications include:

- verification completion,
- status updates,
- alerts for suspicious/fake certificates,
- dashboard updates,
- institution notifications,
- user notifications,
- and system-wide notifications.

This makes the platform more than a passive database; it behaves like an event-driven verification console.

## 13. Deployment and Runtime Architecture

The repository includes Docker-based deployment for:

- MongoDB,
- backend API,
- AI service,
- frontend,
- Redis,
- and Nginx.

### Nginx routing

- `/` -> frontend
- `/api/` -> backend
- `/ai/` -> AI service
- `/socket.io/` -> backend websocket transport

### Important deployment observations

- The deployment story is strong for a prototype.
- Redis is provisioned in Docker Compose but is not currently integrated into the application logic.
- Uploads are stored in mounted volumes.
- The backend and AI services both provide health checks.

## 14. Testing Status

### Backend tests currently cover

- certificate service logic,
- institution service behavior,
- route smoke checks,
- notification service behavior,
- institution scoping,
- and access-profile synchronization.

### AI service tests currently cover

- OCR process routing for deterministic vs contextual validation,
- plus a trivial placeholder test file.

### Testing limitations

- There is no full end-to-end integration test spanning frontend -> backend -> AI -> database.
- Blockchain tests are not presently tracked in the repository even though the Anchor config expects them.
- The current test suite emphasizes service logic more than production-scale performance or adversarial robustness.

## 15. Key Strengths of the Project

The project has several strengths that make it a useful research prototype:

- It is not a single-script demo; it is a multi-service platform.
- It separates trusted record ingestion from candidate verification.
- It uses explicit, reproducible verification rules.
- It retains audit trails.
- It supports institution-scoped access control.
- It exposes explainable intermediate AI/orchestration outputs.
- It includes optional blockchain trust anchoring.
- It has a deployable architecture rather than only local scripts.

## 16. Current Limitations and Research Caveats

The following caveats are important if this project is described in an academic paper:

1. The repository uses strong product language such as "AI-powered," but the current implementation is primarily **OCR + heuristic validation + rule-based scoring**, not a large trained fraud-detection model.
2. The blockchain subsystem is **architecturally split** between Solidity/EVM and Solana/Anchor code.
3. Some branding in the frontend is inconsistent (`ValidX`, `AuthentiCert`, `Authenticity Validator`), so a paper should choose one canonical project name and state that repository branding varies.
4. Redis is configured in deployment but not yet used in the application logic.
5. Security packages such as `helmet` and `express-rate-limit` are present in dependencies but are not currently wired into the Express app.
6. Trusted upload and AI verification run synchronously in the request path; there is no queue-based asynchronous processing yet.
7. The landing page contains hard-coded illustrative metrics such as verification counts and accuracy values. These should **not** be cited as measured experimental results.
8. The shared constants file under `shared/types.js` appears to reflect an older simplified role model and should not be treated as the authoritative specification.
9. There is minor naming drift across some support files, for example around branding and verification-log collection naming, so the backend models/routes should be treated as the authoritative runtime source.

## 17. Suitable Research Themes

This repository can support research papers in several directions:

- **Academic credential fraud detection systems**
- **Explainable document verification pipelines**
- **Role-aware trust management in institutional verification systems**
- **Hybrid off-chain/on-chain certificate verification**
- **Heuristic tamper analysis for scanned educational documents**
- **Microservice-based trust infrastructure for credential validation**
- **Hash-based semantic document comparison**

## 18. Suggested Research Contributions Framed from This Project

If the project is used as a thesis or paper foundation, plausible contribution statements could be:

1. A practical architecture for combining trusted issuer uploads with third-party candidate verification.
2. A normalized certificate hashing scheme that separates file-level integrity from semantic content integrity.
3. An explainable OCR validation layer that exposes triage, reasoning ledger, and fix-it payloads.
4. A hybrid verification model that combines deterministic matching, heuristic vision analysis, and human-in-the-loop overrides.
5. A trust extension path from database validation to blockchain anchoring.

## 19. Suggested Experimental Evaluation Metrics

The codebase does not provide final benchmark results, but the following metrics are natural for research evaluation:

- OCR extraction accuracy
- certificate field extraction precision/recall
- tampered-document detection precision/recall
- false positive and false negative rates
- candidate-to-trusted match accuracy
- average end-to-end verification latency
- throughput under concurrent uploads
- institution-scoped authorization correctness
- manual-review reduction rate
- blockchain anchoring/lookup latency

## 20. Suggested Paper Structure Based on This Repository

A research paper built from this project could follow this structure:

1. Introduction and motivation
2. Problem of academic certificate fraud
3. Related work in OCR, tamper detection, digital credentials, and blockchain anchoring
4. Proposed system architecture
5. Data model and role-based trust design
6. Verification methodology
7. Implementation details
8. Experimental setup and evaluation metrics
9. Results and discussion
10. Limitations and future work

## 21. Final Technical Summary

In its current state, this project is best described as a **full-stack certificate authenticity validation platform** that combines:

- web-based user and institution workflows,
- structured trusted record storage,
- normalized certificate hashing,
- OCR-based field extraction,
- heuristic tampering and anomaly analysis,
- database-backed candidate comparison,
- audit logs and real-time notifications,
- and an experimental blockchain trust extension.

It is not merely a frontend demo or a single verification script. It is a layered trust system with clearly separable subsystems, which makes it highly suitable for adaptation into research papers, dissertations, technical reports, or capstone documentation.
