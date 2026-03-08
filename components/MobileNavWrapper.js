'use client'
import { usePathname } from 'next/navigation'
import MobileNav from '@/components/MobileNav'
import { useAuth } from '@/context/AuthContext'
import { useUI } from '@/context/UIContext'

export default function MobileNavWrapper({ children }) {
    const pathname = usePathname()
    const { user } = useAuth()
    const { sidebarOpen } = useUI()

    // Don't show mobile nav on the landing/auth page
    const showNav = pathname !== '/' && user

    return (
        <div className={sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}>
            {showNav && <MobileNav />}
            {children}
        </div>
    )
}
