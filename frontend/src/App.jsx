import React, { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom'
import './index.css'
import { AuthAPI, DashboardAPI, setToken, getToken } from './lib/api'
import CertificatesPage from './pages/Certificates.jsx'
import UploadPage from './pages/Upload.jsx'
import Landing from './pages/Landing.jsx'
import LoginInstitution from './pages/LoginInstitution.jsx'
import RegisterUser from './pages/RegisterUser.jsx'
import RegisterInstitution from './pages/RegisterInstitution.jsx'

function Navbar({ onLogout }) {
  return (
    <div className="h-14 border-b bg-white flex items-center justify-between px-4">
      <div className="font-semibold">Authenticity Validator</div>
      <div className="flex items-center gap-3">
        <Link className="text-sm text-slate-600 hover:text-slate-900" to="/dashboard">Dashboard</Link>
        <button className="btn" onClick={onLogout}>Logout</button>
      </div>
    </div>
  )
}

function Sidebar() {
  return (
    <div className="w-56 border-r bg-white p-4 space-y-2">
      <Link className="block px-2 py-2 rounded hover:bg-slate-100" to="/dashboard">Overview</Link>
      <Link className="block px-2 py-2 rounded hover:bg-slate-100" to="/certificates">Certificates</Link>
      <Link className="block px-2 py-2 rounded hover:bg-slate-100" to="/upload">Upload</Link>
    </div>
  )
}

function Layout({ children, onLogout }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar onLogout={onLogout} />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}

function LoginPage() {
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
      const data = await AuthAPI.login(email.trim(), password.trim())
      setToken(data.token)
      navigate('/dashboard', { replace: true })
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
          <div className="text-sm text-slate-600">New here? Ask your institution for access</div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="order-2 md:order-1">
            <div className="mb-6">
              <h1 className="text-3xl md:text-4xl font-bold leading-tight">Welcome back</h1>
              <p className="mt-2 text-slate-600">Sign in to verify or manage academic certificates.</p>
            </div>

            <div className="card">
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Email</label>
                  <input className="w-full border rounded px-3 py-2" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Password</label>
                  <input className="w-full border rounded px-3 py-2" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
                </div>
                {error && <div className="text-red-600 text-sm">{error}</div>}
                <button className="btn w-full" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button>
                <div className="text-xs text-slate-500 text-center">Institution staff? Use the <a className="underline" href="/login-institution">institution login</a>.</div>
              </form>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded bg-blue-50">
                <div className="text-xs text-slate-600">Trusted</div>
                <div className="text-lg font-semibold">250+ orgs</div>
              </div>
              <div className="p-4 rounded bg-emerald-50">
                <div className="text-xs text-slate-600">Fast checks</div>
                <div className="text-lg font-semibold">~6s</div>
              </div>
              <div className="p-4 rounded bg-amber-50">
                <div className="text-xs text-slate-600">High accuracy</div>
                <div className="text-lg font-semibold">98%</div>
              </div>
            </div>
          </div>

          <div className="order-1 md:order-2">
            <div className="rounded-xl border bg-white p-6 shadow">
              <div className="aspect-video w-full rounded bg-gradient-to-br from-indigo-100 via-white to-purple-100 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-sm text-slate-500">Preview</div>
                  <div className="text-2xl font-semibold mt-1">Verify with confidence</div>
                </div>
              </div>
              <ul className="mt-6 space-y-2 text-sm text-slate-600">
                <li>• OCR extraction and field validation</li>
                <li>• Tamper and anomaly detection</li>
                <li>• Real-time status updates</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function DashboardPage() {
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')
  const [showRaw, setShowRaw] = useState(false)

  useEffect(() => {
    DashboardAPI.stats()
      .then(setStats)
      .catch(err => setError(err.message))
  }, [])

  const StatCard = ({ title, value, accent }) => (
    <div className={`card border-l-4 ${accent} flex items-center justify-between`}>
      <div>
        <div className="text-slate-500 text-sm">{title}</div>
        <div className="text-2xl font-semibold">{value ?? '—'}</div>
      </div>
    </div>
  )

  const pct = (num, den) => (typeof num === 'number' && typeof den === 'number' && den > 0)
    ? `${Math.round((num / den) * 100)}%`
    : '—'

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      {error && <div className="text-red-600">{error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total" value={stats?.total} accent="border-blue-500" />
        <StatCard title="Verified" value={`${stats?.verified ?? '—'} (${pct(stats?.verified, stats?.total)})`} accent="border-emerald-500" />
        <StatCard title="Suspicious" value={`${stats?.suspicious ?? '—'} (${pct(stats?.suspicious, stats?.total)})`} accent="border-amber-500" />
        <StatCard title="Fake" value={`${stats?.fake ?? '—'} (${pct(stats?.fake, stats?.total)})`} accent="border-rose-500" />
      </div>

      {Array.isArray(stats?.recent) && stats.recent.length > 0 && (
        <div className="card">
          <h2 className="font-medium mb-3">Recent Verifications</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-2 pr-4">Certificate ID</th>
                  <th className="py-2 pr-4">Student</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Date</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent.slice(0, 10).map((r, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="py-2 pr-4">{r.certificateId || '—'}</td>
                    <td className="py-2 pr-4">{r.studentName || '—'}</td>
                    <td className="py-2 pr-4">
                      <span className={`px-2 py-1 rounded text-xs ${
                        r.status === 'verified' ? 'bg-emerald-100 text-emerald-700' :
                        r.status === 'suspicious' ? 'bg-amber-100 text-amber-700' :
                        r.status === 'fake' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'
                      }`}>{r.status || 'pending'}</span>
                    </td>
                    <td className="py-2 pr-4">{r.createdAt ? new Date(r.createdAt).toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Raw Stats</h2>
          <button className="btn" onClick={() => setShowRaw(s => !s)}>{showRaw ? 'Hide' : 'Show'}</button>
        </div>
        {showRaw && (
          <pre className="mt-3 text-sm overflow-auto">{stats ? JSON.stringify(stats, null, 2) : 'Loading…'}</pre>
        )}
      </div>
    </div>
  )
}


function PrivateRoute({ children }) {
  const token = getToken()
  if (!token) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const navigate = useNavigate()
  const onLogout = () => { setToken(''); navigate('/login', { replace: true }) }

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/login-institution" element={<LoginInstitution />} />
      <Route path="/register" element={<RegisterUser />} />
      <Route path="/register-institution" element={<RegisterInstitution />} />
      <Route path="/" element={<PrivateRoute><Layout onLogout={onLogout}><div /></Layout></PrivateRoute>} />
      <Route path="/dashboard" element={<PrivateRoute><Layout onLogout={onLogout}><DashboardPage /></Layout></PrivateRoute>} />
      <Route path="/certificates" element={<PrivateRoute><Layout onLogout={onLogout}><CertificatesPage /></Layout></PrivateRoute>} />
      <Route path="/upload" element={<PrivateRoute><Layout onLogout={onLogout}><UploadPage /></Layout></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export function Root() {
  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  )
}
