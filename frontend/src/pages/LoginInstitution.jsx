import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Button from '../components/Button'
import axios from 'axios'


export default function LoginInstitution() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await axios.post('/api/auth/login', { email: email.trim(), password: password.trim() })
      localStorage.setItem('token', res.data.token)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Login failed'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-6xl mx-auto px-6 pt-10">
        <div className="flex items-center justify-between">
          <div className="font-semibold text-lg">Authenticity Validator</div>
          <div className="text-sm text-slate-600">
            Not an institution? <Link to="/login" className="underline">User login</Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="order-2 md:order-1">
            <div className="mb-6">
              <h1 className="text-3xl md:text-4xl font-bold leading-tight">Institution portal</h1>
              <p className="mt-2 text-slate-600">Manage issuances and track verifications for your organization.</p>
            </div>

            <div className="card">
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Institution email</label>
                  <input className="w-full border rounded px-3 py-2" type="email" placeholder="admin@university.edu" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Password</label>
                  <input className="w-full border rounded px-3 py-2" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
                </div>
                {error && <div className="text-red-600 text-sm">{error}</div>}
                <Button className=" w-full" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</Button>
                <div className="text-xs text-slate-500 text-center">Need access? Contact platform support to onboard your institution.</div>
              </form>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded bg-blue-50">
                <div className="text-xs text-slate-600">Verified issuances</div>
                <div className="text-lg font-semibold">1M+</div>
              </div>
              <div className="p-4 rounded bg-emerald-50">
                <div className="text-xs text-slate-600">Trusted orgs</div>
                <div className="text-lg font-semibold">250+</div>
              </div>
              <div className="p-4 rounded bg-amber-50">
                <div className="text-xs text-slate-600">Avg. time</div>
                <div className="text-lg font-semibold">~6s</div>
              </div>
            </div>
          </div>

          <div className="order-1 md:order-2">
            <div className="rounded-xl border bg-white p-6 shadow">
              <div className="aspect-video w-full rounded bg-gradient-to-br from-indigo-100 via-white to-purple-100 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-sm text-slate-500">Institution preview</div>
                  <div className="text-2xl font-semibold mt-1">Issue and verify at scale</div>
                </div>
              </div>
              <ul className="mt-6 space-y-2 text-sm text-slate-600">
                <li>• Bulk uploads and template management</li>
                <li>• Role-based access controls</li>
                <li>• Fraud monitoring and alerts</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


