import React, { useState } from 'react'
import Button from '../components/Button'
//import { CertificatesAPI } from '../lib/api'

export default function UploadPage() {
  const [file, setFile] = useState(null)
  const [form, setForm] = useState({ studentName: '', rollNumber: '', course: '', degree: '', issueDate: '' })
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setResult(null)
    if (!file) { setError('Please select a file'); return }
    setLoading(true)
    try {
      const data = await CertificatesAPI.upload({ ...form, file })
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Upload Certificate</h1>
      <div className="card">
        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input className="border rounded px-3 py-2" placeholder="Student Name" value={form.studentName} onChange={e => setForm({ ...form, studentName: e.target.value })} required />
          <input className="border rounded px-3 py-2" placeholder="Roll Number" value={form.rollNumber} onChange={e => setForm({ ...form, rollNumber: e.target.value })} required />
          <input className="border rounded px-3 py-2" placeholder="Course" value={form.course} onChange={e => setForm({ ...form, course: e.target.value })} required />
          <input className="border rounded px-3 py-2" placeholder="Degree" value={form.degree} onChange={e => setForm({ ...form, degree: e.target.value })} required />
          <input className="border rounded px-3 py-2" type="date" placeholder="Issue Date" value={form.issueDate} onChange={e => setForm({ ...form, issueDate: e.target.value })} required />
          <input className="border rounded px-3 py-2" type="file" accept="image/*,application/pdf" onChange={e => setFile(e.target.files?.[0] || null)} />
          {error && <div className="text-red-600 md:col-span-2">{error}</div>}
          <div className="md:col-span-2">
            <Button className="btn" disabled={loading}>{loading ? 'Uploading…' : 'Upload & Verify'}</Button>
          </div>
        </form>
      </div>
      {result && (
        <div className="card">
          <h2 className="font-medium mb-2">Server Response</h2>
          <pre className="text-sm overflow-auto">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}
