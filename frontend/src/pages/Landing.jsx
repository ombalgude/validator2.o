import React from 'react'
import { Link } from 'react-router-dom'

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <header className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="font-semibold text-lg">Authenticity Validator</div>
        <nav className="flex items-center gap-4">
          <Link to="/login" className="text-slate-700 hover:text-slate-900">User Login</Link>
          <Link to="/login-institution" className="text-slate-700 hover:text-slate-900">Institution Login</Link>
          <Link to="/register" className="text-slate-700 hover:text-slate-900">Sign up</Link>
          <Link to="/register-institution" className="text-slate-700 hover:text-slate-900">Institution Sign up</Link>
          <Link to="/dashboard" className="btn">Go to App</Link>
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">Verify academic certificates with confidence</h1>
            <p className="mt-4 text-slate-600">AI-powered OCR and tamper detection, real-time status updates, and streamlined institution workflows.</p>
            <div className="mt-6 flex gap-3">
              <Link className="btn" to="/login">Verify a certificate</Link>
              <Link className="btn bg-slate-200 text-slate-800 hover:bg-slate-300" to="/login-institution">Institution portal</Link>
              <Link className="btn bg-slate-200 text-slate-800 hover:bg-slate-300" to="/register">Sign up</Link>
            </div>
          </div>
          <div className="card">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded bg-blue-50">
                <div className="text-sm text-slate-600">Daily verifications</div>
                <div className="text-3xl font-semibold">1,250+</div>
              </div>
              <div className="p-4 rounded bg-emerald-50">
                <div className="text-sm text-slate-600">Accuracy</div>
                <div className="text-3xl font-semibold">98%</div>
              </div>
              <div className="p-4 rounded bg-amber-50">
                <div className="text-sm text-slate-600">Avg. time</div>
                <div className="text-3xl font-semibold">6s</div>
              </div>
              <div className="p-4 rounded bg-rose-50">
                <div className="text-sm text-slate-600">Institutions</div>
                <div className="text-3xl font-semibold">250+</div>
              </div>
            </div>
          </div>
        </div>

        <section className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { title: 'OCR Extraction', desc: 'Extracts fields and validates structure' },
            { title: 'Tamper Detection', desc: 'Flags edits, overlays, font anomalies' },
            { title: 'Real-time Updates', desc: 'Live status via WebSocket or polling' },
          ].map((f, i) => (
            <div key={i} className="card">
              <div className="text-lg font-medium">{f.title}</div>
              <div className="text-slate-600 mt-1">{f.desc}</div>
            </div>
          ))}
        </section>
      </main>
    </div>
  )
}


