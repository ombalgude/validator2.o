import {
	Check,
	Copy,
	FileText,
	Loader,
	UploadCloud,
	XCircle,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import Tesseract from "tesseract.js";
import Button from "../components/Button";
import InvalidModal from "../components/InvalidModal";
import ValidModal from "../components/ValidModal";
import AppFooter from "../components/Footer";
import AppHeader from "../components/Header";

const OCRPage = () => {
	const [imageData, setImageData] = useState(null);
	const [isLoading, setIsLoading] = useState(false);
	const [statusText, setStatusText] = useState("");
	const [progress, setProgress] = useState(0);
	const [isCopied, setIsCopied] = useState(false);
	const [isOpenModal, setIsOpenModal] = useState(false);

	const handleReset = () => {
		setImageData(null);
		setOcrResult("");
		setIsCopied(false);
	};

	const handleCopy = () => {
		navigator.clipboard.writeText(ocrResult);
		setIsCopied(true);
	};
	const loadFile = (file) => {
		const reader = new FileReader();
		reader.onloadend = () => {
			const imageDataUri = reader.result;
			setImageData(imageDataUri);
		};
		reader.readAsDataURL(file);
	};
	const [ocrResult, setOcrResult] = useState("");

	const workerRef = useRef(null);
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

	const handleExtractValue = async () => {
		if (!imageData) return;

		setOcrResult("Recognizing...");

		try {
			const worker = workerRef.current;
			const response = await worker.recognize(imageData);
			
			const extractedText = response.data.text;
			const confidenceScore = response.data.confidence; 
			
			setOcrResult(extractedText);
			console.log("OCR Result:", response.data);
			
			await sendDataForAnalysis(extractedText, confidenceScore);
			
			setIsOpenModal(true);
		} catch (error) {
			console.error("OCR Error:", error);
			setStatusText("Failed to extract text.");
		} finally {
			setIsLoading(false);
		}
	};

	const [isDragging, setIsDragging] = useState(false);

	const handleDrag = (e) => {
		e.preventDefault();
		e.stopPropagation();
	};

	const handleDragIn = (e) => {
		handleDrag(e);
		setIsDragging(true);
	};

	const handleDragOut = (e) => {
		handleDrag(e);
		setIsDragging(false);
	};

	const handleDrop = (e) => {
		handleDrag(e);
		setIsDragging(false);
		const file = e.dataTransfer.files?.[0];
		if (file) {
			loadFile(file);
		}
	};

	const dragOverClasses = isDragging
		? "border-blue-500 bg-gray-700"
		: "border-gray-600";

	const sendDataForAnalysis = async (extractedText, confidenceScore) => {
		try {
			const aiAnalysisUrl = "http://localhost:8001/ai/process-ocr"; 
			
			const response = await fetch(aiAnalysisUrl, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					raw_text: extractedText,
					confidence: confidenceScore
				}),
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = await response.json();
			console.log("Validation from backend:", data);

		} catch (error) {
			console.error("Error sending OCR data to backend:", error);
		}
	};

	return (
		<div className="min-h-screen w-full flex flex-col bg-gradient-to-br from-indigo-50 to-purple-50 text-gray-800 font-product-sans">
			<AppHeader />
			<main className="flex-grow flex flex-col items-center justify-center p-6">
				<div className="w-full max-w-6xl mx-auto bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
					<div className="text-center mb-8">
						<h1 className="text-4xl font-extrabold text-gray-900">
							Demo
						</h1>
						<p className="text-lg text-gray-600 mt-2">
							Upload a certificate image and see our AI extract
							the text in real-time.
						</p>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
						{/* Left Column: File Upload & Preview */}
						<div
							className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 transition-all duration-300"
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
										Drag & Drop Your File Here
									</h3>
									<p className="text-gray-500 mt-1">
										or click to browse
									</p>
									<input
										id="file-upload"
										type="file"
										accept="image/*"
										className="opacity-0 w-0 h-0"
										onChange={(e) =>
											loadFile(e.target.files[0])
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
										onClick={handleReset}
										className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-lg hover:bg-red-100 text-red-500 transition-colors"
									>
										<XCircle size={24} />
									</button>
								</div>
							)}
						</div>

						{/* Right Column: Actions & Results */}
						<div className="flex flex-col gap-6">
							<div className="flex-grow bg-gray-900 text-gray-50 rounded-xl p-6 relative h-96 overflow-y-auto font-mono text-sm shadow-inner">
								{isLoading && (
									<div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 bg-opacity-80 z-10">
										<Loader className="w-12 h-12 text-indigo-400 animate-spin" />
										<p className="mt-4 text-lg capitalize">
											{statusText}
										</p>
										<div className="w-3/4 bg-gray-700 rounded-full h-2.5 mt-4">
											<div
												className="bg-indigo-500 h-2.5 rounded-full transition-all duration-300"
												style={{
													width: `${progress}%`,
												}}
											></div>
										</div>
									</div>
								)}
								{!ocrResult && !isLoading && (
									<div className="text-center text-gray-400 h-full flex flex-col justify-center items-center">
										<FileText
											size={48}
											className="mb-4 opacity-50"
										/>
										<p>Extracted text will appear here.</p>
									</div>
								)}
								{ocrResult && (
									<>
										<button
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
										<pre className="whitespace-pre-wrap">
											{ocrResult}
										</pre>
									</>
								)}
							</div>
							<Button
								className="w-full bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
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
						</div>
					</div>
				</div>
			</main>
			<AppFooter />
			{/* <ValidModal isOpen={isOpenModal} /> */}
			{/* <InvalidModal isOpen={isOpenModal} /> */}
		</div>
	);
};

export default OCRPage;
