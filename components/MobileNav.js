'use client'
import { useUI } from '@/context/UIContext'

export default function MobileNav() {
    const { toggleSidebar } = useUI()

    return (
        <div className="mobile-nav">
            <button className="hamburger" onClick={toggleSidebar}>☰</button>
            <div className="mobile-logo">💰 স্মার্ট মানি</div>
            <div style={{ width: 40 }} /> {/* Spacer */}
        </div>
    )
}
