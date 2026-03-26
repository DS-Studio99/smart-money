'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function PinLockWrapper({ children }) {
    const [locked, setLocked] = useState(false)
    const [pin, setPin] = useState('')
    const [error, setError] = useState('')
    const [showReset, setShowReset] = useState(false)
    const [resetEmail, setResetEmail] = useState('')

    useEffect(() => {
        // Check if PIN lock is enabled
        const enabled = localStorage.getItem('sm_pin_enabled') === 'true'
        const hasPin = !!localStorage.getItem('sm_pin')
        const sessionUnlocked = sessionStorage.getItem('sm_session_unlocked') === 'true'
        
        // Show lock if enabled and session uses weren't unlocked
        if (enabled && hasPin && !sessionUnlocked) {
            setLocked(true)
        }
    }, [])

    const handleDigit = (d) => {
        if (pin.length >= 4) return
        const newPin = pin + d
        setPin(newPin)
        if (newPin.length === 4) {
            setTimeout(() => {
                const storedPin = localStorage.getItem('sm_pin')
                if (newPin === storedPin) {
                    sessionStorage.setItem('sm_session_unlocked', 'true')
                    setLocked(false)
                } else {
                    setError('❌ ভুল PIN। আবার চেষ্টা করুন।')
                    setPin('')
                }
            }, 200)
        }
    }

    const handleDelete = () => {
        setPin(p => p.slice(0, -1))
        setError('')
    }

    const handleReset = async () => {
        if (!resetEmail) return
        await supabase.auth.resetPasswordForEmail(resetEmail)
        alert('✅ আপনার ইমেইলে একটি রিসেট লিংক পাঠানো হয়েছে। লিংকে ক্লিক করার পরে PIN রিসেট হবে।')
        localStorage.removeItem('sm_pin')
        localStorage.removeItem('sm_pin_enabled')
        setLocked(false)
    }

    if (!locked) return children

    const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9]

    return (
        <div className="pin-overlay" style={{ background: '#080e1a' }}>
            <div className="pin-card">
                <div className="pin-icon">🔐</div>
                <div className="pin-title">স্মার্ট মানি</div>
                <div className="pin-sub">আপনার PIN কোড দিন</div>
                <div className="pin-dots">
                    {[0, 1, 2, 3].map(i => <div key={i} className={`pin-dot ${i < pin.length ? 'filled' : ''}`}></div>)}
                </div>
                {error && <div className="pin-error">{error}</div>}
                <div className="pin-pad">
                    {digits.map(d => (
                        <button key={d} className="pin-btn" onClick={() => handleDigit(d.toString())}>{d}</button>
                    ))}
                    <button className="pin-btn" style={{ visibility: 'hidden' }}></button>
                    <button className="pin-btn zero" onClick={() => handleDigit('0')}>0</button>
                    <button className="pin-btn delete" onClick={handleDelete}>⌫</button>
                </div>
                {!showReset ? (
                    <button className="pin-reset-btn" onClick={() => setShowReset(true)}>PIN ভুলে গেছেন?</button>
                ) : (
                    <div style={{ marginTop: 16 }}>
                        <input type="email" className="exp-form-input" placeholder="আপনার ইমেইল দিন" value={resetEmail} onChange={e => setResetEmail(e.target.value)} style={{ marginBottom: 10 }} />
                        <button onClick={handleReset} className="exp-modal-save" style={{ width: '100%', background: 'linear-gradient(135deg, #EF4444, #DC2626)' }}>
                            🔓 PIN রিসেট করুন
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
