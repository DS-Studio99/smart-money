'use client'
import { createContext, useContext, useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'

const UIContext = createContext({})

export function UIProvider({ children }) {
    const [sidebarOpen, setSidebarOpen] = useState(true) // Default true for desktop
    const pathname = usePathname()

    useEffect(() => {
        // Set initial state based on window width
        if (window.innerWidth <= 768) {
            setSidebarOpen(false)
        }
    }, [])

    // Close sidebar when navigating to a new page on mobile
    useEffect(() => {
        if (window.innerWidth <= 768) {
            setSidebarOpen(false)
        }
    }, [pathname])

    const toggleSidebar = () => setSidebarOpen(prev => !prev)
    const closeSidebar = () => setSidebarOpen(false)

    return (
        <UIContext.Provider value={{ sidebarOpen, setSidebarOpen, toggleSidebar, closeSidebar }}>
            {children}
        </UIContext.Provider>
    )
}

export const useUI = () => useContext(UIContext)
