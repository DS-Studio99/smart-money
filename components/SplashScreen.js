'use client'
import { useState, useEffect } from 'react'

export default function SplashScreen() {
    const [show, setShow] = useState(true)
    const [fade, setFade] = useState(false)

    useEffect(() => {
        // Start fading out after 2.5 seconds
        const t1 = setTimeout(() => {
            setFade(true)
        }, 2500)

        // completely hide after 3 seconds
        const t2 = setTimeout(() => {
            setShow(false)
        }, 3000)

        return () => { clearTimeout(t1); clearTimeout(t2) }
    }, [])

    if (!show) return null

    return (
        <div className={`splash-screen ${fade ? 'fade-out' : ''}`}>
            <div className="splash-bg">
                <div className="splash-orb splash-orb-1"></div>
                <div className="splash-orb splash-orb-2"></div>
                <div className="splash-orb splash-orb-3"></div>
            </div>
            
            <div className="splash-content">
                <div className="splash-logo-container">
                    <div className="splash-logo-icon">💰</div>
                    <div className="splash-ring splash-ring-1"></div>
                    <div className="splash-ring splash-ring-2"></div>
                    <div className="splash-ring splash-ring-3"></div>
                </div>
                <h1 className="splash-title">স্মার্ট মানি</h1>
                <div className="splash-subtitle">আপনার অর্থনৈতিক সাফল্যের পথপ্রদর্শক</div>
                
                <div className="splash-loader">
                    <div className="splash-loader-bar"></div>
                </div>
            </div>
        </div>
    )
}
