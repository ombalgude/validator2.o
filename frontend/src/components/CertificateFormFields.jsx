import React from 'react';

export default function CertificateFormFields({
	title,
	values,
	institutions = [],
	showInstitutionField = false,
	institutionFieldDisabled = false,
	onRootChange,
	onSectionChange,
	onSubjectChange,
	onAddSubject,
	onRemoveSubject,
}) {
	return (
		<div className="space-y-6">
			{title ? (
				<div>
					<h3 className="text-lg font-semibold text-slate-900">{title}</h3>
					<p className="text-sm text-slate-500">
						Enter the certificate metadata exactly as it appears on the trusted
						document.
					</p>
				</div>
			) : null}

			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<label className="space-y-2">
					<span className="text-sm font-medium text-slate-700">
						Certificate ID
					</span>
					<input
						className="w-full rounded-lg border border-slate-300 px-3 py-2"
						value={values.certificateId}
						onChange={(event) =>
							onRootChange('certificateId', event.target.value)
						}
						placeholder="CERT-123"
						required
					/>
				</label>

				{showInstitutionField ? (
					<label className="space-y-2">
						<span className="text-sm font-medium text-slate-700">
							Institution
						</span>
						{institutions.length > 0 ? (
							<select
								className="w-full rounded-lg border border-slate-300 px-3 py-2"
								value={values.institutionId}
								onChange={(event) =>
									onRootChange('institutionId', event.target.value)
								}
								disabled={institutionFieldDisabled}
								required
							>
								<option value="">Select an institution</option>
								{institutions.map((institution) => (
									<option key={institution.id} value={institution.id}>
										{institution.name} ({institution.code})
									</option>
								))}
							</select>
						) : (
							<input
								className="w-full rounded-lg border border-slate-300 px-3 py-2"
								value={values.institutionId}
								onChange={(event) =>
									onRootChange('institutionId', event.target.value)
								}
								disabled={institutionFieldDisabled}
								placeholder="Institution Mongo ID"
								required
							/>
						)}
					</label>
				) : null}
			</div>

			<section className="space-y-4 rounded-xl border border-slate-200 p-4">
				<h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
					Student
				</h4>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<input
						className="rounded-lg border border-slate-300 px-3 py-2"
						value={values.student.name}
						onChange={(event) =>
							onSectionChange('student', 'name', event.target.value)
						}
						placeholder="Student name"
						required
					/>
					<input
						className="rounded-lg border border-slate-300 px-3 py-2"
						value={values.student.seatNo}
						onChange={(event) =>
							onSectionChange('student', 'seatNo', event.target.value)
						}
						placeholder="Seat number"
						required
					/>
					<input
						className="rounded-lg border border-slate-300 px-3 py-2"
						value={values.student.prn}
						onChange={(event) =>
							onSectionChange('student', 'prn', event.target.value)
						}
						placeholder="PRN"
					/>
					<input
						className="rounded-lg border border-slate-300 px-3 py-2"
						value={values.student.motherName}
						onChange={(event) =>
							onSectionChange('student', 'motherName', event.target.value)
						}
						placeholder="Mother name"
					/>
				</div>
			</section>

			<section className="space-y-4 rounded-xl border border-slate-200 p-4">
				<h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
					Institution and Exam
				</h4>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<input
						className="rounded-lg border border-slate-300 px-3 py-2"
						value={values.college.code}
						onChange={(event) =>
							onSectionChange('college', 'code', event.target.value)
						}
						placeholder="College code"
						required
					/>
					<input
						className="rounded-lg border border-slate-300 px-3 py-2"
						value={values.college.name}
						onChange={(event) =>
							onSectionChange('college', 'name', event.target.value)
						}
						placeholder="College name"
						required
					/>
					<input
						className="rounded-lg border border-slate-300 px-3 py-2"
						value={values.exam.course}
						onChange={(event) =>
							onSectionChange('exam', 'course', event.target.value)
						}
						placeholder="Course"
						required
					/>
					<input
						className="rounded-lg border border-slate-300 px-3 py-2"
						value={values.exam.branchCode}
						onChange={(event) =>
							onSectionChange('exam', 'branchCode', event.target.value)
						}
						placeholder="Branch code"
					/>
					<input
						className="rounded-lg border border-slate-300 px-3 py-2"
						value={values.exam.session}
						onChange={(event) =>
							onSectionChange('exam', 'session', event.target.value)
						}
						placeholder="Session"
						required
					/>
					<input
						className="rounded-lg border border-slate-300 px-3 py-2"
						value={values.exam.year}
						onChange={(event) =>
							onSectionChange('exam', 'year', event.target.value)
						}
						placeholder="Year"
						required
					/>
				</div>
			</section>

			<section className="space-y-4 rounded-xl border border-slate-200 p-4">
				<h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
					Issue and Summary
				</h4>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<input
						type="date"
						className="rounded-lg border border-slate-300 px-3 py-2"
						value={values.issue.date}
						onChange={(event) =>
							onSectionChange('issue', 'date', event.target.value)
						}
						required
					/>
					<input
						className="rounded-lg border border-slate-300 px-3 py-2"
						value={values.issue.serialNo}
						onChange={(event) =>
							onSectionChange('issue', 'serialNo', event.target.value)
						}
						placeholder="Serial number"
					/>
					<input
						type="number"
						step="0.01"
						className="rounded-lg border border-slate-300 px-3 py-2"
						value={values.summary.sgpa}
						onChange={(event) =>
							onSectionChange('summary', 'sgpa', event.target.value)
						}
						placeholder="SGPA"
					/>
					<input
						type="number"
						className="rounded-lg border border-slate-300 px-3 py-2"
						value={values.summary.totalCredits}
						onChange={(event) =>
							onSectionChange('summary', 'totalCredits', event.target.value)
						}
						placeholder="Total credits"
					/>
				</div>
			</section>

			<section className="space-y-4 rounded-xl border border-slate-200 p-4">
				<div className="flex items-center justify-between gap-3">
					<div>
						<h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
							Subjects
						</h4>
						<p className="text-sm text-slate-500">
							At least one subject is required by the backend validation rules.
						</p>
					</div>
					<button
						type="button"
						onClick={onAddSubject}
						className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
					>
						Add Subject
					</button>
				</div>

				<div className="space-y-4">
					{values.subjects.map((subject, index) => (
						<div
							key={`${subject.courseCode}-${index}`}
							className="rounded-lg border border-slate-200 bg-slate-50 p-4"
						>
							<div className="mb-3 flex items-center justify-between gap-3">
								<h5 className="font-medium text-slate-800">
									Subject {index + 1}
								</h5>
								<button
									type="button"
									onClick={() => onRemoveSubject(index)}
									className="text-sm font-medium text-rose-600 hover:text-rose-700"
								>
									Remove
								</button>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								<input
									className="rounded-lg border border-slate-300 px-3 py-2"
									value={subject.courseCode}
									onChange={(event) =>
										onSubjectChange(index, 'courseCode', event.target.value)
									}
									placeholder="Course code"
									required
								/>
								<input
									className="rounded-lg border border-slate-300 px-3 py-2 md:col-span-2"
									value={subject.courseName}
									onChange={(event) =>
										onSubjectChange(index, 'courseName', event.target.value)
									}
									placeholder="Course name"
									required
								/>
								<input
									className="rounded-lg border border-slate-300 px-3 py-2"
									value={subject.type}
									onChange={(event) =>
										onSubjectChange(index, 'type', event.target.value)
									}
									placeholder="Type"
								/>
								<input
									type="number"
									className="rounded-lg border border-slate-300 px-3 py-2"
									value={subject.credits}
									onChange={(event) =>
										onSubjectChange(index, 'credits', event.target.value)
									}
									placeholder="Credits"
								/>
								<input
									className="rounded-lg border border-slate-300 px-3 py-2"
									value={subject.grade}
									onChange={(event) =>
										onSubjectChange(index, 'grade', event.target.value)
									}
									placeholder="Grade"
								/>
								<input
									type="number"
									className="rounded-lg border border-slate-300 px-3 py-2"
									value={subject.creditPoints}
									onChange={(event) =>
										onSubjectChange(index, 'creditPoints', event.target.value)
									}
									placeholder="Credit points"
								/>
							</div>
						</div>
					))}
				</div>
			</section>
		</div>
	);
}
