import React, { useState } from 'react'
import { supabase } from '../supabaseClient'

export function Auth() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    // This sends a "Magic Link" to the user's email
    const { error } = await supabase.auth.signInWithOtp({ email })

    if (error) {
      alert(error.error_description || error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: '#111', color: 'white', fontFamily: 'sans-serif'
    }}>
      <div style={{ background: '#222', padding: '40px', borderRadius: '10px', width: '300px' }}>
        <h2 style={{ textAlign: 'center', marginTop: 0 }}>Welcome to Floorplan AI</h2>
        <p style={{ textAlign: 'center', color: '#888', marginBottom: '20px' }}>
          Sign in to save projects & use AI.
        </p>
        
        {sent ? (
          <div style={{ color: '#4ade80', textAlign: 'center' }}>
            Check your email for the magic link!
          </div>
        ) : (
          <form onSubmit={handleLogin}>
            <input
              type="email"
              placeholder="Your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%', padding: '10px', marginBottom: '10px',
                borderRadius: '5px', border: '1px solid #333', background: '#000', color: 'white'
              }}
            />
            <button
              disabled={loading}
              style={{
                width: '100%', padding: '10px', borderRadius: '5px',
                border: 'none', background: '#3b82f6', color: 'white', cursor: 'pointer'
              }}
            >
              {loading ? 'Sending link...' : 'Send Magic Link'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}