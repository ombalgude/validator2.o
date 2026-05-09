# Database & Hashing Implementation Guide

This document answers all your questions regarding the database implementation, how data is saved, how hashes are generated, and what tasks remain.

---

## 1. Is the Database part done? Are we hitting it correctly?
**YES. The database code logic is 100% complete.** 

The system uses **MongoDB** as its database, and your Node.js backend connects to it perfectly using the **Mongoose** library. The code to create, read, update, and search the database is fully implemented inside `backend/services/certificate_service.js`.

**How are we hitting it?**
Whenever the backend needs to save a certificate, it creates a new instance of the Mongoose `Certificate` model and calls the `save()` function. For example, in the backend code, it looks like this:
```javascript
const certificate = new Certificate({ ...data });
await certificate.save(); // This perfectly hits the MongoDB database and saves the record.
```

---

## 2. How is data going to the database?

Here is the exact step-by-step journey of how the data flows into the database when a user uploads a certificate:

1. **Upload & AI Extraction:** The frontend sends the PDF/Image to the backend. The backend forwards it to the Python AI. The Python AI extracts data like Student Name, Roll Number, and Issue Date.
2. **Payload Preparation:** The Node.js backend (`CertificateService.js`) receives this extracted text and maps it to your exact MongoDB schema structure (e.g., it assigns the AI's "student_name" to the database's `student.name` field).
3. **Record Creation:** The backend creates a new database record (a Document) in memory. It automatically sets the `verificationStatus` to `'pending'`.
4. **First Save:** It calls `.save()` to insert this pending record into MongoDB.
5. **AI Deep Verification:** It then asks the AI to perform deep security checks (tampering, anomalies). 
6. **Final Update:** The AI returns a final score. The backend updates the record in memory, changes the status to `'verified'` or `'fake'`, and calls `.save()` a second time to lock the final result into the database.

---

## 3. How are we creating the Hashes?

The system generates **two distinct cryptographic hashes** for maximum security before the data is saved to the database or blockchain. The code logic for this is fully complete.

### A. The Document Hash (File Fingerprint)
*   **What it is:** A secure hash of the actual physical file (PDF/JPG) the user uploaded. 
*   **How it is created:** The Node.js backend takes the raw binary buffer of the file and uses the built-in Node.js `crypto` library to run a SHA-256 algorithm on it.
*   **Code Implementation:**
    ```javascript
    const documentHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    ```
*   **Why we do it:** If someone changes even one single pixel on the certificate image and uploads it again, this hash will change completely, proving it was tampered with.

### B. The Certificate Hash (Data Fingerprint)
*   **What it is:** A hash of the core textual data (Student Name, Course, College Code).
*   **How it is created:** The backend runs a custom utility function (`computeCertificateHash`) that takes the normalized AI-extracted data payload and hashes it.
*   **Why we do it:** This hash is specifically what gets recorded onto the Blockchain Smart Contract. When an employer wants to verify a certificate later, the system recreates this hash and checks the blockchain to see if it exists.

---

## 4. Is anything related to the database remaining?

**Code-wise, nothing is remaining.** All the Mongoose schemas, queries, and save operations are correctly programmed.

**Operationally, only Environment Setup is remaining:**
Because the code is finished, the only things you need to do to make the database work in real life are setup tasks:

1. **MongoDB Server:** You need to actually have a MongoDB database running. This can be installed locally on your computer (MongoDB Compass) or hosted in the cloud (MongoDB Atlas).
2. **Environment Variable (`.env`):** You must ensure that your backend's `.env` file contains the correct connection string to your running database.
    *   *Example:* `MONGODB_URI=mongodb://localhost:27017/authenticity_validator_db`
3. **Initial Data Seeding:** The backend relies on an `Institution` (University) existing in the database so that uploaded certificates can be linked to a specific university. You will need to manually insert at least one University record into the database (or use an admin API if you built one) so the uploads don't fail looking for a valid institution.
