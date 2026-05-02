import React from "react";
import { Building2, FileText, IdCard, Link as LinkIcon } from "lucide-react";

export function createUniversityAdminRequestDetails() {
	return {
		universityName: "",
		department: "",
		title: "University Admin",
		adminCode: "",
		documentLinks: "",
	};
}

export function parseSubmittedDocuments(documentLinks) {
	return String(documentLinks || "")
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean)
		.map((url, index) => ({
			name: `Supporting document ${index + 1}`,
			url,
			documentType: "supporting_document",
		}));
}

export default function UniversityAdminRequestFields({ details, onChange }) {
	return (
		<div className="space-y-4 rounded-xl border border-indigo-400/30 bg-indigo-500/10 p-4">
			<div className="flex items-start gap-3 text-indigo-100">
				<Building2 className="mt-0.5 h-5 w-5 shrink-0 text-indigo-300" />
				<div>
					<h3 className="font-semibold">University approval details</h3>
					<p className="text-sm text-indigo-100/80">
						These details are sent to the main admin for approval.
					</p>
				</div>
			</div>

			<div>
				<label className="block mb-1 text-sm font-medium text-gray-300">
					University Name
				</label>
				<div className="relative">
					<Building2 className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
					<input
						className="w-full rounded-lg border border-gray-600 py-2.5 pl-10 pr-3 placeholder-gray-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
						type="text"
						placeholder="University name"
						value={details.universityName}
						onChange={(event) => onChange("universityName", event.target.value)}
						required
					/>
				</div>
			</div>

			<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
				<div>
					<label className="block mb-1 text-sm font-medium text-gray-300">
						Department
					</label>
					<input
						className="w-full rounded-lg border border-gray-600 px-3 py-2.5 placeholder-gray-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
						type="text"
						placeholder="Examination cell"
						value={details.department}
						onChange={(event) => onChange("department", event.target.value)}
					/>
				</div>
				<div>
					<label className="block mb-1 text-sm font-medium text-gray-300">
						Title
					</label>
					<input
						className="w-full rounded-lg border border-gray-600 px-3 py-2.5 placeholder-gray-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
						type="text"
						placeholder="Registrar"
						value={details.title}
						onChange={(event) => onChange("title", event.target.value)}
					/>
				</div>
			</div>

			<div>
				<label className="block mb-1 text-sm font-medium text-gray-300">
					Admin Code
				</label>
				<div className="relative">
					<IdCard className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
					<input
						className="w-full rounded-lg border border-gray-600 py-2.5 pl-10 pr-3 uppercase placeholder-gray-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
						type="text"
						placeholder="Optional admin code"
						value={details.adminCode}
						onChange={(event) => onChange("adminCode", event.target.value)}
					/>
				</div>
			</div>

			<div>
				<label className="block mb-1 text-sm font-medium text-gray-300">
					Submitted Documents
				</label>
				<div className="relative">
					<FileText className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
					<textarea
						className="min-h-[96px] w-full rounded-lg border border-gray-600 py-2.5 pl-10 pr-3 placeholder-gray-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
						placeholder="One document link per line"
						value={details.documentLinks}
						onChange={(event) => onChange("documentLinks", event.target.value)}
					/>
				</div>
				<div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
					<LinkIcon className="h-4 w-4" />
					<span>Official letters, authorization PDFs, or accreditation references.</span>
				</div>
			</div>
		</div>
	);
}
