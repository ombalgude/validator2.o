import React, { useEffect, useState } from 'react'
import { CertificatesAPI } from '../lib/api'

export default function CertificatesPage() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    CertificatesAPI.list()
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Certificates</h1>
      {error && <div className="text-red-600">{error}</div>}
      <div className="card">
        {loading ? 'Loading…' : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-2">ID</th>
                <th className="py-2">Student</th>
                <th className="py-2">Course</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {data?.certificates?.map(c => (
                <tr key={c._id} className="border-t">
                  <td className="py-2">{c.certificateId}</td>
                  <td className="py-2">{c.studentName}</td>
                  <td className="py-2">{c.course}</td>
                  <td className="py-2">{c.verificationStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
