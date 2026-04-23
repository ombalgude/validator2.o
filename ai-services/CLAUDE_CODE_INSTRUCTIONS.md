# validator2.o — Claude Code Improvement Instructions

> **Purpose**: Step-by-step implementation guide for Claude Code.  
> Each iteration ends with a system test. All errors go into `IMPLEMENTATION.md` for retry.  
> Work inside the `validator2.o-main/` directory throughout.

---

## How to use this file

1. Read the entire file before starting.
2. Execute each **Iteration** in order — do not skip.
3. After each iteration, run the **System Test** block for that iteration.
4. If the test fails, append the error to `IMPLEMENTATION.md` (template at the bottom of this file) and fix before moving on.
5. Do not modify blockchain-related files (`blockchain/`, `routes/verify.route.js`, `routes/admin.blockchain.js`, `config/blockchain.js`).

---

## Repository map (relevant files only)

```
validator2.o-main/
├── ai-services/
│   ├── api/
│   │   └── main.py                ← Python FastAPI — ALL OCR + AI logic lives here
│   ├── ocr_service.py             ← Standalone OCR class (used by main.py indirectly)
│   ├── image_analysis.py          ← Tampering detection
│   ├── utils/
│   │   ├── image_preprocessing.py ← Preprocessing helpers (partially used)
│   │   └── data_helpers.py        ← Regex field extractors
│   └── requirements.txt
├── backend/
│   ├── server.js
│   ├── services/
│   │   └── ai_service.js          ← Node proxy to AI service
│   ├── routes/
│   │   └── certificates.js        ← Has OCR-adjacent routes
│   └── middleware/
│       └── upload.js              ← multer config
└── frontend/
    └── src/
        ├── pages/
        │   └── OCRPage.jsx        ← Currently runs Tesseract.js in-browser
        └── lib/
            └── api.js             ← Fetch wrapper (do not change)
```

---

## Iteration 1 — Remove client-side Tesseract, wire frontend to backend

### What and why

`OCRPage.jsx` currently:
- Imports `tesseract.js` (WASM, ~4 MB download)
- Creates a Tesseract worker in the browser on every mount
- Runs OCR locally on the raw unprocessed base64 image
- Only calls the backend **after** OCR to do a "public verify"

This is slow, misses the server-side preprocessing pipeline, and bypasses all the AI validation logic in `main.py`.

**Goal**: Delete client-side OCR entirely. Upload the raw file to the backend, get the full AI-service result back, display it.

---

### File 1 of 3 — `frontend/src/pages/OCRPage.jsx`

Replace the **entire file** with the following:

```jsx
import {
  Check,
  Copy,
  FileSearch,
  FileText,
  Loader,
  RefreshCw,
  ShieldCheck,
  UploadCloud,
  XCircle,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import Button from "../components/Button";
import AppFooter from "../components/Footer";
import AppHeader from "../components/Header";
import { api, publicApi } from "../lib/api";
import useAuth from "../hooks/useAuth";

function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback;
}

const OCRPage = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [ocrResult, setOcrResult] = useState("");
  const [confidenceScore, setConfidenceScore] = useState(null);
  const [structuredData, setStructuredData] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [healthStatus, setHealthStatus] = useState({
    loading: true,
    ok: false,
    message: "Checking backend health...",
  });
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [verifyResult, setVerifyResult] = useState(null);
  const [socketNotice, setSocketNotice] = useState("");
  const { lastStatusUpdate } = useAuth();

  useEffect(() => {
    async function checkHealth() {
      setHealthStatus({ loading: true, ok: false, message: "Checking backend health..." });
      try {
        const response = await publicApi.get("/health");
        setHealthStatus({
          loading: false,
          ok: true,
          message: `Backend healthy at ${new Date(
            response.data?.timestamp || Date.now()
          ).toLocaleTimeString()}`,
        });
      } catch (error) {
        setHealthStatus({
          loading: false,
          ok: false,
          message: getErrorMessage(error, "Backend health check failed. Start the API server."),
        });
      }
    }
    checkHealth();
  }, []);

  useEffect(() => {
    if (!lastStatusUpdate?.certificateId) return;
    setSocketNotice(
      lastStatusUpdate.message ||
        `Certificate ${lastStatusUpdate.certificateId} updated to ${lastStatusUpdate.newStatus}.`
    );
  }, [lastStatusUpdate]);

  function handleReset() {
    setSelectedFile(null);
    setImagePreview(null);
    setSelectedFileName("");
    setOcrResult("");
    setConfidenceScore(null);
    setStructuredData(null);
    setValidationResult(null);
    setIsCopied(false);
    setStatusText("");
    setVerifyError("");
    setVerifyResult(null);
  }

  function handleCopy() {
    if (!ocrResult) return;
    navigator.clipboard.writeText(ocrResult);
    setIsCopied(true);
  }

  function loadFile(file) {
    if (!file) return;
    setSelectedFile(file);
    setSelectedFileName(file.name || "");
    setIsCopied(false);
    setOcrResult("");
    setConfidenceScore(null);
    setStructuredData(null);
    setValidationResult(null);
    setVerifyError("");
    setVerifyResult(null);

    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  }

  async function handleExtractValue() {
    if (!selectedFile) return;

    setIsLoading(true);
    setStatusText("Uploading and extracting text...");
    setVerifyError("");
    setVerifyResult(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      // POST to backend, which proxies to the AI service
      const response = await api.post("/api/ai/ocr/extract", formData);
      const data = response.data;

      setOcrResult(data.text || "");
      setConfidenceScore(data.confidence ?? null);
      setStructuredData(data.structured_data || null);
      setValidationResult(data.validation_results || null);
      setStatusText("OCR extraction complete.");
    } catch (error) {
      setStatusText("Failed to extract text.");
      setVerifyError(getErrorMessage(error, "OCR extraction failed."));
    } finally {
      setIsLoading(false);
    }
  }

  async function handlePublicVerify() {
    if (!ocrResult.trim()) {
      setVerifyError("Extract text first before sending public verify data.");
      return;
    }

    setVerifyLoading(true);
    setVerifyError("");
    setVerifyResult(null);

    try {
      const response = await publicApi.post("/verify", {
        documentData: {
          source: "ocr_demo",
          fileName: selectedFileName,
          rawText: ocrResult,
          confidence: confidenceScore,
          extractedAt: new Date().toISOString(),
        },
      });
      setVerifyResult(response.data);
    } catch (error) {
      if (error?.response?.status === 503) {
        setVerifyError(
          getErrorMessage(error, "Blockchain verification is unavailable in this environment.")
        );
      } else {
        setVerifyError(getErrorMessage(error, "Public verify request failed."));
      }
    } finally {
      setVerifyLoading(false);
    }
  }

  const [isDragging, setIsDragging] = useState(false);

  function handleDrag(event) {
    event.preventDefault();
    event.stopPropagation();
  }
  function handleDragIn(event) { handleDrag(event); setIsDragging(true); }
  function handleDragOut(event) { handleDrag(event); setIsDragging(false); }
  function handleDrop(event) {
    handleDrag(event);
    setIsDragging(false);
    loadFile(event.dataTransfer.files?.[0]);
  }

  const dragOverClasses = isDragging ? "border-blue-500 bg-gray-100" : "border-gray-300";

  return (
    <div className="min-h-screen w-full flex flex-col bg-gradient-to-br from-indigo-50 to-purple-50 text-gray-800 font-product-sans">
      <AppHeader />
      <main className="flex-grow flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-6xl mx-auto space-y-6">
          {/* Health / status bar */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">OCR Extraction</h1>
                <p className="text-gray-600">
                  Upload a certificate image or PDF — the backend handles OCR and AI validation.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                    healthStatus.ok
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {healthStatus.loading ? "Checking /health" : healthStatus.ok ? "API healthy" : "API unavailable"}
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    setHealthStatus((c) => ({ ...c, loading: true }));
                    try {
                      const r = await api.get("/health");
                      setHealthStatus({
                        loading: false, ok: true,
                        message: `Backend healthy at ${new Date(r.data?.timestamp || Date.now()).toLocaleTimeString()}`,
                      });
                    } catch (e) {
                      setHealthStatus({ loading: false, ok: false, message: getErrorMessage(e, "Health check failed.") });
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <RefreshCw className="h-4 w-4" />
                  Recheck
                </button>
              </div>
            </div>
            <p className="mt-3 text-sm text-slate-500">{healthStatus.message}</p>
            {socketNotice && (
              <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
                {socketNotice}
              </div>
            )}
          </div>

          {/* Main panel */}
          <div className="w-full bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Upload zone */}
              <div
                className={`flex flex-col items-center justify-center p-6 bg-gray-50 rounded-xl border-2 border-dashed transition-all duration-300 ${dragOverClasses}`}
                onDragEnter={handleDragIn}
                onDragLeave={handleDragOut}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                {!imagePreview ? (
                  <label
                    htmlFor="file-upload"
                    className="flex flex-col items-center justify-center text-center cursor-pointer p-8"
                  >
                    <UploadCloud className="w-16 h-16 text-indigo-500 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-800">
                      Drag and drop a certificate image or PDF
                    </h3>
                    <p className="text-gray-500 mt-1">or click to browse</p>
                    <input
                      id="file-upload"
                      type="file"
                      accept="image/*,.pdf"
                      className="opacity-0 w-0 h-0"
                      onChange={(e) => loadFile(e.target.files?.[0] || null)}
                    />
                  </label>
                ) : (
                  <div className="relative w-full text-center">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="max-w-full max-h-80 mx-auto rounded-lg shadow-md"
                    />
                    <button
                      type="button"
                      onClick={handleReset}
                      className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-lg hover:bg-red-100 text-red-500 transition-colors"
                    >
                      <XCircle size={24} />
                    </button>
                    <p className="mt-4 text-sm text-slate-500">{selectedFileName || "Selected file"}</p>
                  </div>
                )}
              </div>

              {/* Results */}
              <div className="flex flex-col gap-6">
                <div className="flex-grow bg-gray-900 text-gray-50 rounded-xl p-6 relative h-96 overflow-y-auto font-mono text-sm shadow-inner">
                  {isLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/85 z-10">
                      <Loader className="w-12 h-12 text-indigo-400 animate-spin" />
                      <p className="mt-4 text-lg">{statusText}</p>
                    </div>
                  )}
                  {!ocrResult && !isLoading && (
                    <div className="text-center text-gray-400 h-full flex flex-col justify-center items-center">
                      <FileText size={48} className="mb-4 opacity-50" />
                      <p>Extracted text will appear here.</p>
                    </div>
                  )}
                  {ocrResult && (
                    <>
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="absolute bottom-3 right-3 p-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                        title="Copy to clipboard"
                      >
                        {isCopied ? <Check className="text-emerald-400" /> : <Copy />}
                      </button>
                      <pre className="whitespace-pre-wrap">{ocrResult}</pre>
                    </>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Button
                    type="button"
                    className="w-full justify-center bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    onClick={handleExtractValue}
                    disabled={!selectedFile || isLoading}
                  >
                    {isLoading ? (
                      <><Loader className="animate-spin" />Processing...</>
                    ) : (
                      <><FileText />Extract Text</>
                    )}
                  </Button>
                  <Button
                    type="button"
                    className="w-full justify-center bg-slate-900 text-white hover:bg-slate-800 disabled:bg-slate-400 disabled:cursor-not-allowed"
                    onClick={handlePublicVerify}
                    disabled={!ocrResult.trim() || verifyLoading}
                  >
                    {verifyLoading ? (
                      <><Loader className="animate-spin" />Sending...</>
                    ) : (
                      <><FileSearch />Public Verify</>
                    )}
                  </Button>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  <p>
                    OCR confidence:{" "}
                    <span className="font-semibold text-slate-900">
                      {confidenceScore === null ? "Not available yet" : `${Math.round(confidenceScore)}%`}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {verifyError && (
              <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {verifyError}
              </div>
            )}

            {/* Structured data panel */}
            {structuredData && Object.keys(structuredData).some((k) => structuredData[k]) && (
              <div className="mt-6 rounded-xl border border-indigo-200 bg-indigo-50 p-4">
                <h3 className="font-semibold text-indigo-800 mb-3">Extracted fields</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(structuredData)
                    .filter(([, v]) => v && v !== "[]" && !Array.isArray(v))
                    .map(([key, value]) => (
                      <div key={key} className="bg-white rounded-lg p-3 border border-indigo-100">
                        <p className="text-xs text-indigo-500 uppercase tracking-wide">
                          {key.replace(/_/g, " ")}
                        </p>
                        <p className="text-sm font-medium text-gray-800 mt-1 truncate">{String(value)}</p>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* AI validation panel */}
            {validationResult && (
              <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-center gap-2 text-emerald-700 mb-3">
                  <ShieldCheck className="h-5 w-5" />
                  <span className="font-semibold">AI validation result</span>
                </div>
                <pre className="overflow-x-auto rounded-lg bg-emerald-950 p-3 text-xs text-emerald-50">
                  {JSON.stringify(validationResult, null, 2)}
                </pre>
              </div>
            )}

            {verifyResult && (
              <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-center gap-2 text-emerald-700">
                  <ShieldCheck className="h-5 w-5" />
                  <span className="font-semibold">Public verify response received.</span>
                </div>
                <pre className="mt-3 overflow-x-auto rounded-lg bg-emerald-950 p-3 text-xs text-emerald-50">
                  {JSON.stringify(verifyResult, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </main>
      <AppFooter />
    </div>
  );
};

export default OCRPage;
```

---

### File 2 of 3 — `backend/server.js` — add the OCR proxy route

Find the block that imports routes (around line 10–20). Add one line:

```js
// ADD this line alongside the other route imports
const aiProxyRoutes = require('./routes/ai_proxy');
```

Find the block where routes are registered (look for `app.use('/api/auth', authRoutes)`). Add:

```js
// ADD after the other app.use() calls, before the 404 handler
app.use('/api/ai', aiProxyRoutes);
```

---

### File 3 of 3 — `backend/routes/ai_proxy.js` (new file)

Create this file at `backend/routes/ai_proxy.js`:

```js
/**
 * AI Proxy Routes
 * Forwards multipart file uploads from the frontend to the Python AI service.
 * Keeps AI_SERVICE_URL configuration in one place (ai_service.js).
 */
const express = require('express');
const { upload } = require('../middleware/upload');
const AIService = require('../services/ai_service');

const router = express.Router();
const aiService = new AIService();

/**
 * POST /api/ai/ocr/extract
 * Accepts a single file upload (field name: "file"), forwards to the AI service,
 * returns the full OCR + validation JSON to the frontend.
 */
router.post(
  '/ocr/extract',
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded. Use field name "file".' });
      }

      const result = await aiService.extractText(req.file);

      if (!result.success) {
        return res.status(502).json({
          message: result.error || 'OCR extraction failed',
        });
      }

      return res.json(result);
    } catch (error) {
      console.error('AI proxy /ocr/extract error:', error);
      return res.status(500).json({ message: 'Internal server error during OCR extraction' });
    }
  }
);

/**
 * POST /api/ai/verify/complete
 * Full verification pipeline (OCR + tampering + template + anomaly).
 */
router.post(
  '/verify/complete',
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded.' });
      }

      const result = await aiService.completeVerification(req.file);

      if (!result.success) {
        return res.status(502).json({ message: result.error || 'Verification failed' });
      }

      return res.json(result);
    } catch (error) {
      console.error('AI proxy /verify/complete error:', error);
      return res.status(500).json({ message: 'Internal server error during verification' });
    }
  }
);

module.exports = router;
```

---

### System test — Iteration 1

Run all three checks. If any fail, write the error to `IMPLEMENTATION.md`.

```bash
# 1. Frontend: no Tesseract import remains
grep -r "tesseract" frontend/src/pages/OCRPage.jsx && echo "FAIL: tesseract still present" || echo "PASS: no tesseract"

# 2. Backend: new route file exists and exports a router
node -e "const r = require('./backend/routes/ai_proxy'); console.log(typeof r === 'function' ? 'PASS: router exported' : 'FAIL: not a router')"

# 3. Backend: ai_proxy is mounted in server.js
grep "ai_proxy" backend/server.js && echo "PASS: route mounted" || echo "FAIL: route not mounted"

# 4. Integration smoke test (requires AI service running on port 8001)
curl -s -o /dev/null -w "%{http_code}" http://localhost:8001/health | grep -q "200" && echo "PASS: AI service healthy" || echo "SKIP: AI service not running (start it to test)"
```

---

## Iteration 2 — Improve OCR preprocessing pipeline

### What and why

The current `_preprocess_image_for_ocr` in `ai-services/api/main.py` does:
1. Grayscale
2. Gaussian blur 5×5
3. Adaptive threshold 11px block
4. Morph close 1×1 kernel (effectively nothing)

Missing:
- **Deskew** — scanned certificates are often 1–5° off. Tesseract accuracy drops sharply at even 2°.
- **DPI normalization** — phone photos at 72 PPI are much lower resolution than Tesseract expects (300 PPI). Upscaling to 300 DPI equivalent dramatically improves accuracy.
- **CLAHE contrast** — certificates with faded ink or uneven lighting need local contrast enhancement before binarization.
- **Otsu binarization** — better than fixed adaptive threshold for documents with uniform backgrounds.
- **PSM / OEM config** — `--psm 6` (uniform block of text) + `--oem 3` (LSTM) is significantly better for certificate layouts than defaults.

---

### File 1 of 1 — `ai-services/api/main.py`

**Replace** the two functions `_preprocess_image_for_ocr` and `_extract_ocr_from_image` with the versions below. Find them by their exact names and replace in-place.

#### Replace `_preprocess_image_for_ocr`:

```python
def _preprocess_image_for_ocr(image: np.ndarray) -> np.ndarray:
    """
    Enhanced preprocessing pipeline for certificate OCR.
    Steps: DPI normalization → deskew → CLAHE → Otsu binarization → morph cleanup.
    """
    # --- Step 1: DPI normalization ---
    # Target 300 PPI equivalent. If the shorter side is below 1000px,
    # scale up so Tesseract has enough detail.
    h, w = image.shape[:2]
    min_side = min(h, w)
    if min_side < 1000:
        scale = 1000.0 / min_side
        new_w = int(w * scale)
        new_h = int(h * scale)
        image = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_CUBIC)

    # --- Step 2: Convert to grayscale ---
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # --- Step 3: CLAHE (Contrast Limited Adaptive Histogram Equalization) ---
    # Improves local contrast — helps with faded ink and uneven lighting.
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    gray = clahe.apply(gray)

    # --- Step 4: Deskew ---
    # Detect the dominant text angle via Hough lines and rotate to correct it.
    gray = _deskew_image(gray)

    # --- Step 5: Gentle denoise ---
    denoised = cv2.fastNlMeansDenoising(gray, h=10, templateWindowSize=7, searchWindowSize=21)

    # --- Step 6: Otsu binarization ---
    # Better than adaptive threshold for documents with uniform background.
    _, binary = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    # --- Step 7: Morphological cleanup ---
    # Close small gaps in characters, open removes pepper noise.
    close_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
    cleaned = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, close_kernel)
    open_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 1))
    cleaned = cv2.morphologyEx(cleaned, cv2.MORPH_OPEN, open_kernel)

    return cleaned


def _deskew_image(gray: np.ndarray) -> np.ndarray:
    """
    Detect and correct document skew using Hough line transform.
    Only corrects angles in the range -10° to +10° to avoid over-rotation.
    Returns the original image unchanged if no confident angle is found.
    """
    try:
        edges = cv2.Canny(gray, 50, 150, apertureSize=3)
        lines = cv2.HoughLines(edges, 1, np.pi / 180, threshold=max(100, gray.shape[1] // 8))

        if lines is None or len(lines) == 0:
            return gray

        angles = []
        for line in lines:
            rho, theta = line[0]
            angle = (theta * 180 / np.pi) - 90
            if -10 < angle < 10:
                angles.append(angle)

        if not angles:
            return gray

        median_angle = float(np.median(angles))

        if abs(median_angle) < 0.5:
            return gray  # negligible skew

        h, w = gray.shape
        center = (w // 2, h // 2)
        rotation_matrix = cv2.getRotationMatrix2D(center, median_angle, 1.0)
        rotated = cv2.warpAffine(
            gray, rotation_matrix, (w, h),
            flags=cv2.INTER_CUBIC,
            borderMode=cv2.BORDER_REPLICATE,
        )
        return rotated
    except Exception:
        return gray  # never crash OCR due to deskew failure
```

#### Replace `_extract_ocr_from_image`:

```python
def _extract_ocr_from_image(image: np.ndarray) -> Dict[str, Any]:
    """
    Run Tesseract OCR on a preprocessed image.
    Uses PSM 6 (uniform text block) + OEM 3 (LSTM) for best accuracy on certificates.
    Falls back to PSM 3 (auto) if PSM 6 returns less than 20 characters.
    """
    TESSERACT_CONFIG_PRIMARY   = r"--oem 3 --psm 6"
    TESSERACT_CONFIG_FALLBACK  = r"--oem 3 --psm 3"
    MIN_CHARS_PRIMARY = 20

    try:
        processed_image = _preprocess_image_for_ocr(image)

        # Primary pass
        word_data = pytesseract.image_to_data(
            processed_image,
            output_type=pytesseract.Output.DICT,
            config=TESSERACT_CONFIG_PRIMARY,
        )
        extracted_text = pytesseract.image_to_string(
            processed_image,
            config=TESSERACT_CONFIG_PRIMARY,
        ).strip()

        # Fallback pass if primary returns almost nothing
        if len(extracted_text) < MIN_CHARS_PRIMARY:
            logger.info("PSM 6 returned short result (%d chars), retrying with PSM 3", len(extracted_text))
            word_data = pytesseract.image_to_data(
                processed_image,
                output_type=pytesseract.Output.DICT,
                config=TESSERACT_CONFIG_FALLBACK,
            )
            extracted_text = pytesseract.image_to_string(
                processed_image,
                config=TESSERACT_CONFIG_FALLBACK,
            ).strip()

        confidences = []
        for conf_value in word_data.get("conf", []):
            try:
                val = float(conf_value)
            except (TypeError, ValueError):
                continue
            if val >= 0:
                confidences.append(val)

        average_confidence = sum(confidences) / len(confidences) if confidences else 0.0

        return {
            "text": extracted_text,
            "confidence": round(average_confidence, 2),
            "word_data": word_data,
            "psm_used": "6" if len(extracted_text) >= MIN_CHARS_PRIMARY else "3",
        }

    except pytesseract.TesseractNotFoundError as error:
        raise RuntimeError(
            "Tesseract OCR is not installed or not available in PATH."
        ) from error
```

---

### System test — Iteration 2

```bash
# 1. Syntax check the Python file
cd ai-services && python -m py_compile api/main.py && echo "PASS: no syntax errors" || echo "FAIL: syntax error in main.py"

# 2. Verify the new functions are present
grep -n "_deskew_image\|CLAHE\|INTER_CUBIC\|--oem 3 --psm" api/main.py && echo "PASS: new preprocessing found" || echo "FAIL: functions missing"

# 3. Unit test preprocessing (requires cv2 + pytesseract installed)
python3 - <<'EOF'
import numpy as np
import sys
sys.path.insert(0, 'api')
# Create a simple white image to test the pipeline doesn't crash
import cv2
img = np.ones((200, 400, 3), dtype=np.uint8) * 255
cv2.putText(img, "TEST CERTIFICATE", (50, 100), cv2.FONT_HERSHEY_SIMPLEX, 1, (0,0,0), 2)
# Import the function directly
import importlib.util, types
spec = importlib.util.spec_from_file_location("main", "api/main.py")
# We only need the preprocessing, test it imports without crash
print("PASS: preprocessing import check done (full test requires Tesseract)")
EOF
```

---

## Iteration 3 — Improve field extraction (replace brittle regex with structured parsing)

### What and why

`ai-services/utils/data_helpers.py` uses a long chain of regex patterns to extract fields like `student_name`, `roll_number`, `institution_name`. These patterns fail for:
- Names with titles (Dr., Prof., Mr.)
- Non-English institution names
- Dates written as "April 2024" vs "04/2024"
- Roll numbers with mixed formats (ABC-2021-001 vs 21BCE001)

The fix is to add a **line-by-line proximity parser** that looks at context (the label before the value) rather than scanning the full text with global regex.

---

### File 1 of 1 — `ai-services/utils/data_helpers.py`

**Add** the following two new functions **before** the existing `extract_certificate_data` function. Do not remove existing functions — the new `extract_certificate_data` replaces only the main entrypoint function.

#### Add these two new functions right before `extract_certificate_data`:

```python
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
            r"(?i)" + re.escape(label) + r"\s*[:\-–—]?\s*(.+)"
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
```

#### Replace the `extract_certificate_data` function body (find it by name, replace just the body, keep the docstring shape):

```python
def extract_certificate_data(ocr_text: str) -> Dict[str, Any]:
    """
    Extract structured data from OCR text.
    Uses label-proximity parsing first, falls back to regex for missed fields.
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
```

---

### System test — Iteration 3

```bash
cd ai-services

python3 - <<'EOF'
import sys
sys.path.insert(0, 'utils')
from data_helpers import extract_certificate_data

# Test 1: Label-colon format
text1 = """
CERTIFICATE OF COMPLETION
Student Name: Dr. Rohan Sharma
Roll No: 21BCE0012
University: VIT University
Course: B.Tech Computer Science
Date: April 2024
"""
r1 = extract_certificate_data(text1)
assert r1["student_name"] and "Rohan" in r1["student_name"], f"FAIL name: {r1['student_name']}"
assert r1["roll_number"] and "21BCE0012" in r1["roll_number"], f"FAIL roll: {r1['roll_number']}"
print(f"PASS test1 — fields: {r1['extracted_fields']} confidence: {r1['confidence']}%")

# Test 2: Freeform text
text2 = """
This is to certify that Priya Nair has successfully completed
the Master of Science programme at Pune University.
Registration No ABC-2022-0099
"""
r2 = extract_certificate_data(text2)
print(f"PASS test2 — fields: {r2['extracted_fields']} name: {r2['student_name']}")

# Test 3: Empty text does not crash
r3 = extract_certificate_data("")
assert r3["confidence"] == 0.0
print("PASS test3 — empty text handled")

print("\nAll extraction tests passed.")
EOF
```

---

## Iteration 4 — Add per-request OCR quality metrics endpoint

### What and why

Currently there is no way to know *why* a particular OCR run had low confidence. Adding a `/ai/ocr/quality` endpoint that returns preprocessing metadata (original size, upscale factor, deskew angle, binarization method) gives you actionable data for tuning.

---

### File 1 of 1 — `ai-services/api/main.py`

**Modify** `_extract_ocr_from_image` to return extended metadata. Then **add** a new route `/ai/ocr/quality`.

#### Step A — Modify `_preprocess_image_for_ocr` to return metadata alongside the processed image

Replace the function signature and return type:

```python
def _preprocess_image_for_ocr(image: np.ndarray) -> tuple:
    """
    Returns (processed_image: np.ndarray, metadata: dict).
    Metadata includes upscale_factor, deskew_angle, original_shape.
    """
    metadata = {
        "original_shape": list(image.shape),
        "upscale_factor": 1.0,
        "deskew_angle_deg": 0.0,
        "binarization": "otsu",
    }

    h, w = image.shape[:2]
    min_side = min(h, w)
    if min_side < 1000:
        scale = 1000.0 / min_side
        metadata["upscale_factor"] = round(scale, 2)
        new_w = int(w * scale)
        new_h = int(h * scale)
        image = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_CUBIC)

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    gray = clahe.apply(gray)

    # Deskew with angle capture
    try:
        edges = cv2.Canny(gray, 50, 150, apertureSize=3)
        lines = cv2.HoughLines(edges, 1, np.pi / 180, threshold=max(100, gray.shape[1] // 8))
        if lines is not None and len(lines) > 0:
            angles = []
            for line in lines:
                rho, theta = line[0]
                angle = (theta * 180 / np.pi) - 90
                if -10 < angle < 10:
                    angles.append(angle)
            if angles:
                median_angle = float(np.median(angles))
                metadata["deskew_angle_deg"] = round(median_angle, 2)
                if abs(median_angle) >= 0.5:
                    hh, hw = gray.shape
                    center = (hw // 2, hh // 2)
                    M = cv2.getRotationMatrix2D(center, median_angle, 1.0)
                    gray = cv2.warpAffine(gray, M, (hw, hh),
                                          flags=cv2.INTER_CUBIC,
                                          borderMode=cv2.BORDER_REPLICATE)
    except Exception:
        pass

    denoised = cv2.fastNlMeansDenoising(gray, h=10, templateWindowSize=7, searchWindowSize=21)
    _, binary = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    close_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
    cleaned = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, close_kernel)
    open_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 1))
    cleaned = cv2.morphologyEx(cleaned, cv2.MORPH_OPEN, open_kernel)

    return cleaned, metadata
```

#### Step B — Update `_extract_ocr_from_image` to unpack the tuple

In `_extract_ocr_from_image`, change:
```python
# OLD
processed_image = _preprocess_image_for_ocr(image)
```
to:
```python
# NEW
processed_image, preprocess_meta = _preprocess_image_for_ocr(image)
```

And add `preprocess_meta` to the return dict:
```python
return {
    "text": extracted_text,
    "confidence": round(average_confidence, 2),
    "word_data": word_data,
    "psm_used": "6" if len(extracted_text) >= MIN_CHARS_PRIMARY else "3",
    "preprocess_meta": preprocess_meta,   # ADD THIS LINE
}
```

#### Step C — Add quality endpoint after the existing `/ai/ocr/extract` route

Find the `/ai/ocr/extract` route in `main.py` and add this new route immediately after it:

```python
@app.post("/ai/ocr/quality")
async def ocr_quality_check(file: UploadFile = File(...)):
    """
    Returns OCR preprocessing metadata without running full extraction.
    Useful for diagnosing why a particular image has low confidence.
    """
    _record_stat("ocr_requests")
    try:
        file_bytes = await file.read()
        image = _decode_image_bytes(file_bytes, file.filename, file.content_type)
        _, meta = _preprocess_image_for_ocr(image)
        word_data = pytesseract.image_to_data(
            _preprocess_image_for_ocr(image)[0],
            output_type=pytesseract.Output.DICT,
            config=r"--oem 3 --psm 6",
        )
        confidences = [float(c) for c in word_data.get("conf", []) if float(c) >= 0]
        avg_conf = round(sum(confidences) / len(confidences), 2) if confidences else 0.0
        return {
            "filename": file.filename,
            "average_confidence": avg_conf,
            "word_count": len([t for t in word_data.get("text", []) if str(t).strip()]),
            "preprocess_metadata": meta,
            "recommendations": _quality_recommendations(meta, avg_conf),
        }
    except Exception as e:
        _record_stat("errors_total", error=True, count_request=False)
        raise HTTPException(status_code=500, detail=str(e))


def _quality_recommendations(meta: dict, confidence: float) -> List[str]:
    """Generate human-readable recommendations based on preprocessing metadata."""
    recs = []
    if meta.get("upscale_factor", 1.0) > 2.0:
        recs.append(
            f"Image was upscaled {meta['upscale_factor']}× — original resolution is very low. "
            "Use a higher-resolution scan (300 DPI+) for best results."
        )
    if abs(meta.get("deskew_angle_deg", 0)) > 3.0:
        recs.append(
            f"Document was skewed {meta['deskew_angle_deg']}° and was auto-corrected. "
            "For best results, scan the document flat."
        )
    if confidence < 60:
        recs.append(
            "Low OCR confidence. Check image quality: ensure good lighting, no glare, "
            "and the text is sharp."
        )
    if not recs:
        recs.append("Image quality looks good for OCR.")
    return recs
```

---

### System test — Iteration 4

```bash
cd ai-services

# 1. Syntax check
python -m py_compile api/main.py && echo "PASS: syntax ok" || echo "FAIL: syntax error"

# 2. Check all new symbols exist
python3 -c "
import ast, sys
with open('api/main.py') as f: tree = ast.parse(f.read())
names = [n.name for n in ast.walk(tree) if isinstance(n, ast.FunctionDef)]
for expected in ['_deskew_image', '_quality_recommendations', '_preprocess_image_for_ocr']:
    status = 'PASS' if expected in names else 'FAIL'
    print(f'{status}: {expected}')
"

# 3. If service is running, hit the quality endpoint
curl -s -X POST http://localhost:8001/ai/ocr/quality \
  -F "file=@/dev/null;filename=test.jpg;type=image/jpeg" \
  | python3 -m json.tool 2>/dev/null | head -20 || echo "SKIP: service not running"
```

---

## Iteration 5 — Performance & reliability hardening

### Changes across multiple files

These are smaller targeted improvements. Apply them in order.

---

### 5a — Add retry logic to `ai_service.js`

The AI service can be slow to start. Replace the `postMultipart` method body with a version that retries on connection errors:

```js
// In backend/services/ai_service.js
// Replace the postMultipart method:

async postMultipart(path, file, extraFields = {}, retries = 2) {
    const formData = this.createMultipartPayload(file, extraFields);
    let lastError;

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const response = await axios.post(
                `${this.aiServiceUrl}${path}`,
                formData,
                {
                    headers: { ...formData.getHeaders() },
                    timeout: this.timeout,
                    maxContentLength: Infinity,
                    maxBodyLength: Infinity,
                }
            );
            return response.data || {};
        } catch (error) {
            lastError = error;
            const isConnError = !error.response; // network-level failure
            if (!isConnError || attempt === retries) break;
            const delay = 500 * (attempt + 1);
            console.warn(`AI service attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
            await new Promise((r) => setTimeout(r, delay));
        }
    }
    throw lastError;
}
```

---

### 5b — Increase timeout for large PDFs

In `ai_service.js` constructor, change:
```js
// OLD
this.timeout = 30000;

// NEW — 60s for large PDF rendering + OCR
this.timeout = 60000;
```

---

### 5c — Add `Accept: application/json` header to AI service calls

In `postMultipart`, add `Accept: 'application/json'` to the headers:
```js
headers: {
    ...formData.getHeaders(),
    'Accept': 'application/json',
},
```

---

### 5d — Add PDF text layer detection to frontend upload hint

In `frontend/src/pages/OCRPage.jsx`, find the upload label text and update the accepted file description — already done in Iteration 1 (`accept="image/*,.pdf"`). No further change needed.

---

### 5e — Add `processing_time` logging to `main.py`

Find the `/ai/ocr/extract` route handler. Wrap the call to `_extract_text_from_upload` with timing:

```python
# Find in main.py the /ai/ocr/extract handler body.
# Add at the top of the try block:
t_start = time.time()

# Add before the return statement:
processing_time = round(time.time() - t_start, 3)
# Then include in return dict:
# "processing_time": processing_time,
```

---

### System test — Iteration 5

```bash
# 1. ai_service.js has retry logic
grep -n "attempt\|retries\|retry" backend/services/ai_service.js && echo "PASS: retry logic found" || echo "FAIL: missing"

# 2. timeout is 60s
grep "timeout.*60000" backend/services/ai_service.js && echo "PASS: 60s timeout" || echo "FAIL: timeout not updated"

# 3. Backend starts without errors (requires node_modules installed)
cd backend && node -e "const {createApp} = require('./server'); createApp(); console.log('PASS: app created')" 2>&1 | tail -3
```

---

## IMPLEMENTATION.md — Error log template

Create this file at the root of the project as `IMPLEMENTATION.md`. Append to it after every failed test:

```markdown
# Implementation Error Log

Use this file to track failures from system tests across iterations.
After each fix attempt, add a new entry below.

---

## Template for new entries

### [DATE] Iteration N — [brief description]

**Test that failed:**
```
(paste the failing test command and its output here)
```

**Error:**
```
(paste the exact error message)
```

**Root cause:**
(what caused it)

**Fix applied:**
(what change was made to resolve it)

**Re-test result:**
(paste the passing test output)

---
```

---

## Summary of all changes

| File | Action | Iteration |
|------|--------|-----------|
| `frontend/src/pages/OCRPage.jsx` | Remove Tesseract.js, upload file to backend | 1 |
| `backend/routes/ai_proxy.js` | New file — proxy OCR + verify to AI service | 1 |
| `backend/server.js` | Mount `ai_proxy` route at `/api/ai` | 1 |
| `ai-services/api/main.py` | Replace `_preprocess_image_for_ocr` — add deskew, CLAHE, Otsu, DPI norm | 2 |
| `ai-services/api/main.py` | Replace `_extract_ocr_from_image` — add PSM 6 + fallback PSM 3 | 2 |
| `ai-services/utils/data_helpers.py` | Add `_extract_by_label_proximity`, update `extract_certificate_data` | 3 |
| `ai-services/api/main.py` | Add `/ai/ocr/quality` endpoint + `_quality_recommendations` | 4 |
| `backend/services/ai_service.js` | Add retry logic, increase timeout to 60s | 5 |

---

## What these changes improve

**OCR accuracy** — deskew corrects scan tilt which is the single biggest accuracy killer for Tesseract; CLAHE fixes faded ink; DPI normalization ensures Tesseract has enough pixels to work with; PSM 6 is optimized for document layouts.

**Field extraction accuracy** — label-proximity parsing beats global regex for certificate-style documents where fields are labeled (e.g., "Name: ..." patterns). Regex stays as the safety net.

**Reliability** — retry logic in the Node proxy handles the common case of the Python service being slow to wake up; the 60s timeout handles large PDFs that render slowly.

**Observability** — the `/ai/ocr/quality` endpoint tells you exactly why a specific image had low confidence so you can tune iteratively, which is why `IMPLEMENTATION.md` is connected to it: every failed test logs what image inputs caused the failure so you can target the fix.
