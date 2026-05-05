# Authenticity Validator Diagrams

These diagrams reflect the current repository structure and runtime behavior.

- Core runtime path: frontend -> nginx -> backend -> MongoDB / AI service
- Blockchain: optional extension path
- Redis: provisioned in Docker but not currently used by application logic

## Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor U as User/Admin/Verifier
    participant FE as React Frontend
    participant NX as Nginx
    participant BE as Express Backend
    participant DB as MongoDB
    participant AI as FastAPI AI Service
    participant WS as Socket.IO
    participant BC as Optional Blockchain

    U->>FE: Open app / login / choose workflow
    FE->>NX: HTTP request
    NX->>BE: /api/auth/login or /api/auth/register
    BE->>DB: Validate or create user
    DB-->>BE: User record
    BE-->>FE: JWT token
    FE->>NX: GET /api/auth/me
    NX->>BE: Forward request with Bearer token
    BE->>DB: Load current user
    DB-->>BE: User + role + institution
    BE-->>FE: Normalized session
    FE->>WS: Connect and emit authenticate(userId, role, institutionId)
    WS-->>FE: Join user/institution/admin rooms

    alt Trusted certificate upload
        U->>FE: Upload file + structured certificate data
        FE->>NX: POST /api/certificates/verify (multipart)
        NX->>BE: Forward trusted upload
        BE->>BE: Normalize payload + validate role/scope
        BE->>BE: Compute documentHash + certificateHash
        BE->>DB: Save pending certificate record
        DB-->>BE: Certificate stored
        BE->>AI: POST /ai/verify/complete
        AI->>AI: OCR + tampering + template + anomaly analysis
        AI-->>BE: verification_status + confidence + analysis
        BE->>DB: Update certificate status/results
        BE->>DB: Save verification log
        BE-->>FE: Upload + verification response
        BE->>WS: Emit verification_complete / alerts
        WS-->>FE: Real-time status update
    end

    alt Candidate certificate validation
        U->>FE: Submit candidate data and optional file
        FE->>NX: POST /api/certificates/validate
        NX->>BE: Forward validation request
        BE->>BE: Normalize candidate payload
        BE->>BE: Compute candidate certificateHash
        BE->>DB: Find trusted record by certificateHash
        alt Exact hash match found
            DB-->>BE: Trusted certificate
            BE->>DB: Save verification log
            BE-->>FE: verified
        else Same certificateId but hash differs
            DB-->>BE: Trusted certificate by certificateId
            BE->>DB: Save verification log
            BE-->>FE: fake
        else No trusted record
            DB-->>BE: No match
            BE-->>FE: suspicious
        end
    end

    opt Public OCR demo / blockchain verify
        U->>FE: Run client-side OCR demo
        FE->>FE: Tesseract.js extracts text in browser
        FE->>NX: POST /api/verify with documentData
        NX->>BE: Forward public verify request
        BE->>BC: verifyDocument(hash)
        BC-->>BE: verified + issuer + timestamp
        BE-->>FE: Public blockchain verification result
    end
```

## Data Flow Diagram

```mermaid
flowchart LR
    U[User / Admin / Verifier]
    FE[React Frontend]
    OCR[Tesseract.js OCR Demo]
    NX[Nginx Reverse Proxy]

    AUTH[Auth + Session Handling]
    CERT[Certificate Workflow Service]
    LOGIC[Hashing + Scope + Status Logic]
    NOTIFY[Socket.IO Notification Service]
    DB[(MongoDB)]
    AI[FastAPI AI Service]
    BC[(Optional Blockchain Contract)]
    REDIS[(Redis - provisioned, not used)]

    U -->|UI actions, uploads, searches| FE
    FE -->|Browser OCR demo| OCR
    FE -->|REST + WebSocket| NX

    NX -->|/api/auth, /api/users, /api/institutions| AUTH
    NX -->|/api/certificates, /api/dashboard, /api/access| CERT
    NX -->|/socket.io| NOTIFY
    NX -->|/ai/* direct access if needed| AI

    AUTH -->|JWT auth, current user| DB

    CERT -->|normalize payloads| LOGIC
    LOGIC -->|certificateHash, documentHash, access scope, status| CERT

    CERT -->|trusted records, users, institutions, verification logs| DB
    CERT -->|complete verification request| AI
    AI -->|OCR text, tamper score, anomaly score, template score| CERT

    CERT -->|verification_complete / status_update / alert| NOTIFY
    NOTIFY -->|real-time events| FE

    FE -->|public verify documentData| NX
    NX -->|/api/verify| CERT
    CERT -->|hash lookup / verification| BC
    BC -->|verified, issuer, timestamp| CERT

    REDIS -. provisioned in docker only .- NX
```

## Architecture Diagram

```mermaid
flowchart TB
    subgraph Client["Client Layer"]
        B[Browser]
        F[React + Vite Frontend<br/>AuthContext, Routes, Fetch API, Socket.IO Client]
        D[OCR Demo<br/>Tesseract.js in browser]
        B --> F
        F --> D
    end

    subgraph Edge["Edge Layer"]
        N[Nginx Reverse Proxy<br/>/ , /api/* , /ai/* , /socket.io/*]
    end

    subgraph App["Application Layer"]
        BE[Node.js + Express Backend<br/>Auth, Users, Institutions, Certificates,<br/>Dashboard, Access, Verification Logs]
        WS[Socket.IO Server<br/>user/institution/admin rooms]
        AIS[Python FastAPI AI Service<br/>OCR, tampering, template, anomaly]
    end

    subgraph Data["Data Layer"]
        MDB[(MongoDB)]
        UP[(Uploads Volume)]
        R[(Redis<br/>provisioned but currently unused)]
    end

    subgraph Trust["Trust Extension"]
        EVM[(EVM Contract via ethers.js)]
        SOL[(Solana Anchor prototype)]
    end

    subgraph AIInternals["AI Internals"]
        TESS[Pytesseract]
        CV[OpenCV + Pillow + NumPy]
        PDF[PyMuPDF]
    end

    B --> N
    N -->|/| F
    N -->|/api/*| BE
    N -->|/socket.io/*| WS
    N -->|/ai/*| AIS

    F -->|REST API calls| BE
    F -->|WebSocket auth + updates| WS

    BE --> MDB
    BE --> UP
    BE -->|AI verification| AIS
    BE -->|optional admin/public verification| EVM

    AIS --> TESS
    AIS --> CV
    AIS --> PDF

    SOL -. present in repo, not wired into backend runtime .- BE
    R -. docker service only .- BE
```
