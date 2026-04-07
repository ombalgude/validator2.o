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
import Tesseract from "tesseract.js";
import Button from "../components/Button";
import AppFooter from "../components/Footer";
import AppHeader from "../components/Header";
import { api, publicApi } from "../lib/api";
import useAuth from "../hooks/useAuth";

function getErrorMessage(error, fallback) {
	return error?.response?.data?.message || error?.message || fallback;
}

const OCRPage = () => {
	const [imageData, setImageData] = useState(null);
	const [selectedFileName, setSelectedFileName] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [statusText, setStatusText] = useState("");
	const [isCopied, setIsCopied] = useState(false);
	const [ocrResult, setOcrResult] = useState("");
	const [confidenceScore, setConfidenceScore] = useState(null);
	const [healthStatus, setHealthStatus] = useState({
		loading: true,
		ok: false,
		message: "Checking backend health...",
	});
	const [verifyLoading, setVerifyLoading] = useState(false);
	const [verifyError, setVerifyError] = useState("");
	const [verifyResult, setVerifyResult] = useState(null);
	const [socketNotice, setSocketNotice] = useState("");
	const workerRef = useRef(null);
	const { lastStatusUpdate } = useAuth();

	useEffect(() => {
		async function checkHealth() {
			setHealthStatus({
				loading: true,
				ok: false,
				message: "Checking backend health...",
			});

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
					message: getErrorMessage(
						error,
						"Backend health check failed. Start the API server to continue."
					),
				});
			}
		}

		checkHealth();
	}, []);

	useEffect(() => {
		const setupWorker = async () => {
			const worker = await Tesseract.createWorker("eng");
			workerRef.current = worker;
		};

		setupWorker();

		return () => {
			workerRef.current?.terminate();
			workerRef.current = null;
		};
	}, []);

	useEffect(() => {
		if (!lastStatusUpdate?.certificateId) {
			return;
		}

		setSocketNotice(
			lastStatusUpdate.message ||
				`Certificate ${lastStatusUpdate.certificateId} updated to ${lastStatusUpdate.newStatus}.`
		);
	}, [lastStatusUpdate]);

	function handleReset() {
		setImageData(null);
		setSelectedFileName("");
		setOcrResult("");
		setConfidenceScore(null);
		setIsCopied(false);
		setStatusText("");
		setVerifyError("");
		setVerifyResult(null);
	}

	function handleCopy() {
		if (!ocrResult) {
			return;
		}

		navigator.clipboard.writeText(ocrResult);
		setIsCopied(true);
	}

	function loadFile(file) {
		if (!file) {
			return;
		}

		const reader = new FileReader();
		reader.onloadend = () => {
			setImageData(reader.result);
			setSelectedFileName(file.name || "");
			setIsCopied(false);
			setOcrResult("");
			setConfidenceScore(null);
			setVerifyError("");
			setVerifyResult(null);
		};
		reader.readAsDataURL(file);
	}

	async function handleExtractValue() {
		if (!imageData || !workerRef.current) {
			return;
		}

		setIsLoading(true);
		setStatusText("Recognizing text...");
		setVerifyError("");
		setVerifyResult(null);

		try {
			const response = await workerRef.current.recognize(imageData);
			const extractedText = response.data?.text || "";
			const nextConfidenceScore = response.data?.confidence || 0;

			setOcrResult(extractedText);
			setConfidenceScore(nextConfidenceScore);
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
					getErrorMessage(
						error,
						"Blockchain verification is unavailable in this environment."
					)
				);
			} else {
				setVerifyError(
					getErrorMessage(error, "Public verify request failed.")
				);
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

	function handleDragIn(event) {
		handleDrag(event);
		setIsDragging(true);
	}

	function handleDragOut(event) {
		handleDrag(event);
		setIsDragging(false);
	}

	function handleDrop(event) {
		handleDrag(event);
		setIsDragging(false);
		const file = event.dataTransfer.files?.[0];
		loadFile(file);
	}

	const dragOverClasses = isDragging
		? "border-blue-500 bg-gray-100"
		: "border-gray-300";

	return (
		<div className="min-h-screen w-full flex flex-col bg-gradient-to-br from-indigo-50 to-purple-50 text-gray-800 font-product-sans">
			<AppHeader />
			<main className="flex-grow flex flex-col items-center justify-center p-6">
				<div className="w-full max-w-6xl mx-auto space-y-6">
					<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
						<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
							<div>
								<h1 className="text-3xl font-bold text-gray-900">OCR Demo</h1>
								<p className="text-gray-600">
									Extract text locally, check backend health, and optionally call
									the public verify endpoint.
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
										setHealthStatus((current) => ({
											...current,
											loading: true,
										}));
										try {
											const response = await api.get("/health");
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
												message: getErrorMessage(
													error,
													"Backend health check failed."
												),
											});
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
						{socketNotice ? (
							<div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
								{socketNotice}
							</div>
						) : null}
					</div>

					<div className="w-full bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
							<div
								className={`flex flex-col items-center justify-center p-6 bg-gray-50 rounded-xl border-2 border-dashed transition-all duration-300 ${dragOverClasses}`}
								onDragEnter={handleDragIn}
								onDragLeave={handleDragOut}
								onDragOver={handleDrag}
								onDrop={handleDrop}
							>
								{!imageData ? (
									<label
										htmlFor="file-upload"
										className="flex flex-col items-center justify-center text-center cursor-pointer p-8"
									>
										<UploadCloud className="w-16 h-16 text-indigo-500 mb-4" />
										<h3 className="text-xl font-semibold text-gray-800">
											Drag and drop a certificate image
										</h3>
										<p className="text-gray-500 mt-1">or click to browse</p>
										<input
											id="file-upload"
											type="file"
											accept="image/*"
											className="opacity-0 w-0 h-0"
											onChange={(event) =>
												loadFile(event.target.files?.[0] || null)
											}
										/>
									</label>
								) : (
									<div className="relative w-full text-center animate-fade-in-up">
										<img
											src={imageData}
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
										<p className="mt-4 text-sm text-slate-500">
											{selectedFileName || "Selected image"}
										</p>
									</div>
								)}
							</div>

							<div className="flex flex-col gap-6">
								<div className="flex-grow bg-gray-900 text-gray-50 rounded-xl p-6 relative h-96 overflow-y-auto font-mono text-sm shadow-inner">
									{isLoading ? (
										<div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/85 z-10">
											<Loader className="w-12 h-12 text-indigo-400 animate-spin" />
											<p className="mt-4 text-lg">{statusText}</p>
										</div>
									) : null}
									{!ocrResult && !isLoading ? (
										<div className="text-center text-gray-400 h-full flex flex-col justify-center items-center">
											<FileText size={48} className="mb-4 opacity-50" />
											<p>Extracted text will appear here.</p>
										</div>
									) : null}
									{ocrResult ? (
										<>
											<button
												type="button"
												onClick={handleCopy}
												className="absolute bottom-3 right-3 p-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
												title="Copy to clipboard"
											>
												{isCopied ? (
													<Check className="text-emerald-400" />
												) : (
													<Copy />
												)}
											</button>
											<pre className="whitespace-pre-wrap">{ocrResult}</pre>
										</>
									) : null}
								</div>

								<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
									<Button
										type="button"
										className="w-full justify-center bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
										onClick={handleExtractValue}
										disabled={!imageData || isLoading}
									>
										{isLoading ? (
											<>
												<Loader className="animate-spin" />
												Processing...
											</>
										) : (
											<>
												<FileText />
												Extract Text
											</>
										)}
									</Button>
									<Button
										type="button"
										className="w-full justify-center bg-slate-900 text-white hover:bg-slate-800 disabled:bg-slate-400 disabled:cursor-not-allowed"
										onClick={handlePublicVerify}
										disabled={!ocrResult.trim() || verifyLoading}
									>
										{verifyLoading ? (
											<>
												<Loader className="animate-spin" />
												Sending...
											</>
										) : (
											<>
												<FileSearch />
												Public Verify
											</>
										)}
									</Button>
								</div>

								<div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
									<p>
										OCR confidence:{" "}
										<span className="font-semibold text-slate-900">
											{confidenceScore === null
												? "Not available yet"
												: `${Math.round(confidenceScore)}%`}
										</span>
									</p>
									<p className="mt-2">
										Public verify sends `documentData` to `/verify`. Some
										environments return `503` when blockchain services are not
										configured.
									</p>
								</div>
							</div>
						</div>

						{verifyError ? (
							<div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
								{verifyError}
							</div>
						) : null}

						{verifyResult ? (
							<div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
								<div className="flex items-center gap-2 text-emerald-700">
									<ShieldCheck className="h-5 w-5" />
									<span className="font-semibold">
										Public verify response received.
									</span>
								</div>
								<pre className="mt-3 overflow-x-auto rounded-lg bg-emerald-950 p-3 text-xs text-emerald-50">
									{JSON.stringify(verifyResult, null, 2)}
								</pre>
							</div>
						) : null}
					</div>
				</div>
			</main>
			<AppFooter />
		</div>
	);
};

export default OCRPage;
