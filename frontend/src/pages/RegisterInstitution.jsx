import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Button from '../components/Button'
// import { AuthAPI } from '../lib/api'

export default function RegisterInstitution() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [institutionId, setInstitutionId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const navigate = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      await AuthAPI.registerInstitution(email, password, institutionId)
      setSuccess('Institution account created. You can now sign in.')
      setTimeout(() => navigate('/login-institution', { replace: true }), 800)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-6xl mx-auto px-6 pt-10">
        <div className="flex items-center justify-between">
          <div className="font-semibold text-lg">Authenticity Validator</div>
          <div className="text-sm text-slate-600">Already onboarded? <Link to="/login-institution" className="underline">Sign in</Link></div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="max-w-md">
          <h1 className="text-3xl font-bold mb-4">Onboard institution</h1>
          <div className="card">
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">Institution email</label>
                <input className="w-full border rounded px-3 py-2" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Password</label>
                <input className="w-full border rounded px-3 py-2" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Institution ID</label>
                <input className="w-full border rounded px-3 py-2" placeholder="mongo id of Institution" value={institutionId} onChange={e => setInstitutionId(e.target.value)} required />
              </div>
              {error && <div className="text-red-600 text-sm">{error}</div>}
              {success && <div className="text-emerald-600 text-sm">{success}</div>}
              <Button className="w-full" disabled={loading}>{loading ? 'Onboarding…' : 'Create institution account'}</Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}


