# Frontend Existing-Page API Integration

**API Basics**

- Base URL: http://localhost:5000/api
- Auth: send Authorization: Bearer <jwt> on every private endpoint.
- Roles in backend: admin, institution_admin, university_admin, company_admin, verifier, user.
- Uploads use multipart/form-data; single file field is certificate, bulk file field is certificates; max file size is 10MB; allowed types are pdf, jpg, jpeg, png, tiff, tif.
- Main certificate statuses: verified, suspicious, fake, pending.
- Paginated list responses generally return {..., total, currentPage, totalPages}.

**Auth**

- POST /auth/register public; body: { email, password, fullName }; creates only a normal user; response: { message, token, user }.
- POST /auth/login public; body: { email, password }; response: { message, token, user }.
- GET /auth/me private; returns current user with populated institutionId.

**Users**

- GET /users admin only; query: page, limit, role, isActive, institutionId, email.
- POST /users admin only; body: email, password plus optional fullName, role, institutionId, companyName, emailVerified, permissions, isActive.
- GET /users/:id admin or same user.
- PUT /users/:id admin or same user; self can update only fullName and companyName; admin can also update email, role, institutionId, companyName, emailVerified, permissions, isActive, password.
- DELETE /users/:id admin only; soft delete only, sets isActive=false.

**Access Profiles**

- Types are institution-admins, university-admins, company-admins, verifiers.
- For every type, these routes exist: GET /access/:type/me, GET /access/:type, POST /access/:type, GET /access/:type/:id, PUT /access/:type/:id, DELETE /access/:type/:id.
- GET /access/:type / POST / PUT / DELETE are admin only.
- GET /access/:type/me is for the logged-in owner of that role or admin.
- Create/update payloads:
- institution-admins: userId, institutionId required; optional adminCode, department, title, canIssueCertificates, permissions, isActive.
- university-admins: userId, institutionId required; optional adminCode, department, title, permissions, canApproveInstitutionAdmins, isActive.
- company-admins: userId, companyName required; optional companyCode, institutionIds, accessScope, permissions, isActive.
- verifiers: userId required; optional organizationName, verifierType, assignedInstitutionIds, accessLevel, lastVerifiedAt, isActive.
- Important: creating an access profile is what syncs the base user into role-specific access.

**Institutions**

- GET /institutions private; query: page, limit, search, verified, institutionType, parentInstitutionId, city, state, country, sortBy, sortOrder.
- GET /institutions/:id private.
- POST /institutions admin only; minimum body: { name, code }; can also send institutionType, parentInstitutionId, address, contactInfo, officialDomains, establishedYear, accreditation, apiEndpoint, certificateTemplates.
- PUT /institutions/:id admin only; same body shape as create.
- DELETE /institutions/:id admin only; blocked if certificates already exist for that institution.
- PUT /institutions/:id/verify admin only; body: { isVerified, verificationReason? }.

**Certificates**

- POST /certificates/verify roles admin|institution_admin|university_admin; multipart/form-data; file field certificate; body should use this shape:
  json
  {
  "certificateId": "CERT-123",
  "institutionId": "mongoId",
  "student": { "name": "Asha Patil", "seatNo": "SEAT-101", "prn": "PRN-101", "motherName": "..." },
  "college": { "code": "ENG01", "name": "Engineering College" },
  "exam": { "session": "Summer", "year": "2025", "course": "B.Tech", "branchCode": "CSE" },
  "subjects": [{ "courseCode": "CS101", "courseName": "Algorithms", "credits": 4, "grade": "A" }],
  "summary": { "sgpa": 8.5, "totalCredits": 4 },
  "issue": { "date": "2025-06-01", "serialNo": "SER-1" }
  }

- For institution/university admins, institutionId can be omitted and is taken from the token.
- Response from POST /certificates/verify: { message, certificate: { id, certificateId, certificateHash, status } }.
- POST /certificates/bulk same roles; multipart/form-data; files under certificates; text field records must be a JSON array matching file order 1:1.
- POST /certificates/validate roles admin|institution_admin|university_admin|company_admin|verifier; file field certificate is optional; body uses the same certificate shape except institutionId is not required; response: { success, isMatch, verificationStatus, matchType, message, candidateCertificate, trustedCertificate }.
- GET /certificates private; query: page, limit, sortBy, sortOrder, status, institutionId, studentName, rollNumber, certificateId, certificateHash, dateFrom, dateTo.
- GET /certificates/:id private; accepts Mongo \_id or certificateId.
- PUT /certificates/:id/verify roles admin|verifier|company_admin; body: { status, reason?, verificationMethod?, verificationResults? }; response: { message, certificate }.

**Verification Logs**

- GET /verification-logs roles admin|verifier|company_admin|institution_admin|university_admin; query: page, limit, certificateId, verifiedBy, institutionId, result, verificationMethod.
- GET /verification-logs/:id same roles.

**Dashboard**

- GET /dashboard/stats admin only.
- GET /dashboard/trends admin only; query: period=7d|30d|90d.
- GET /dashboard/alerts admin only.

**Health / Blockchain**

- GET /health public.
- POST /admin/blockchain/add-document optional; body: { documentData }; currently no auth middleware; can return 503 if blockchain config is unavailable.
- POST /verify optional; body: { documentData }; public; can return 503 if blockchain config is unavailable.

**Frontend Workflow**

1. Public user flow: register/login -> store JWT -> call GET /auth/me.
2. Admin setup flow: create institution -> create base user -> create role profile under /access/:type.
3. Institution/university flow: upload trusted certs via /certificates/verify or /certificates/bulk -> list/view via /certificates.
4. Company/verifier flow: validate candidate document via /certificates/validate -> if needed manually override via /certificates/:id/verify -> inspect /verification-logs.
5. Admin ops flow: use /users, /institutions, /access/_, /dashboard/_.

**Important Caveats**

- POST /certificates/verify is badly named for UI purposes: it only stores the trusted certificate record and returns pending; it does not run the AI verification method.
- GET /institutions is available to any authenticated user; only institution/university admins are auto-scoped to their own institution.
- Socket.IO is present. Client should connect to backend and emit authenticate with { userId, role, institutionId }. The route currently guaranteed to emit a live event is manual status change via PUT /certificates/:id/verify (status_update).

## Summary

- [x] First execution step: create `frontend-routes-implementation-plan.md` in the repo root with this checklist.
- [x] Limit this pass to the current frontend pages: auth, dashboard, certificates, upload, and OCR demo.
- [x] Keep `/dashboard` admin-only and keep institution signup public, but clarify that it creates only a normal user account until admin role assignment happens later.

## Execution Steps

- [x] Phase 1: add shared frontend infrastructure in `frontend/src` for API access, token persistence, `GET /auth/me` bootstrap, auth state, role helpers, and Socket.IO connection/authentication.
- [x] Phase 2: update `frontend/src/App.jsx`, layout, and guards so protected routes use shared auth state, `/dashboard` is admin-only, and post-login redirects are role-based.
- [x] Phase 3: wire `LoginPage`, `LoginInstitution`, `RegisterUser`, and `RegisterInstitution` to the real auth contracts; include `fullName`, store JWT, fetch current user, and adjust institution registration copy to match backend reality.
- [x] Phase 4: replace `DashboardPage` mock data with `GET /dashboard/stats`, `GET /dashboard/trends`, and `GET /dashboard/alerts`, including period switching and 403 redirect handling.
- [x] Phase 5: rebuild `Certificates.jsx` into the main certificate workspace with paginated `GET /certificates`, filters/sort, detail fetch via `GET /certificates/:id`, candidate validation via `POST /certificates/validate`, and manual override via `PUT /certificates/:id/verify` for allowed roles.
- [x] Phase 6: rework `Upload.jsx` into trusted certificate upload with single `POST /certificates/verify` and bulk `POST /certificates/bulk`, client-side file validation, shared certificate-form serialization, and admin-only institution selection.
- [x] Phase 7: keep `OCRPage` public, add backend health check via `GET /health`, optional public `/verify` demo action, graceful `503` handling, and live `status_update` refresh behavior.
- [x] Phase 8: install frontend dependencies and verify the production build. Manual runtime QA against a live backend is still pending.

## Interfaces / Behavior

- [x] Normalize frontend certificate form state to `certificateId`, optional `institutionId`, `student`, `college`, `exam`, `subjects`, `summary`, and `issue`.
- [x] Use one multipart serializer that sends trusted uploads as `certificateData` plus `certificate`, and bulk uploads as `records` plus `certificates`.
- [x] Define shared frontend models for auth user, dashboard responses, institution summaries, certificate list/detail, validation response, and manual status update payload.
- [x] Restrict sections within existing pages by role instead of adding new admin CRUD pages in this pass.

## Test Plan

- [ ] Auth register/login/bootstrap/logout and 401 handling against a running backend.
- [ ] Admin dashboard data loading and non-admin redirect from `/dashboard` against a running backend.
- [ ] Certificates list, filters, pagination, detail panel, candidate validation, and manual status update against a running backend.
- [ ] Single and bulk trusted uploads, file validation, and institution resolution by role against a running backend.
- [ ] OCR demo health check, public verify path, and blockchain-unavailable `503` state against a running backend.
- [ ] Realtime `status_update` handling after manual verification changes against a running backend.
- [x] Frontend install/build verification completed successfully after installing dependencies.

## Assumptions

- [x] The plan file name is `frontend-routes-implementation-plan.md` in the repo root.
- [x] This pass does not add new pages for `/users`, `/access/*`, `/institutions` CRUD, `/verification-logs`, or `/admin/blockchain/add-document`.
- [x] `RegisterInstitution` remains public but creates only a normal `user`.
- [x] `socket.io-client` was added during implementation.
- [x] Frontend dependencies were installed and `npm run build` now succeeds.
