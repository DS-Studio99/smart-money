import './globals.css'
import { Hind_Siliguri } from 'next/font/google'
import { AuthProvider } from '@/context/AuthContext'
import { UIProvider } from '@/context/UIContext'
import { AISettingsProvider } from '@/context/AISettingsContext'
import MobileNavWrapper from '@/components/MobileNavWrapper'
import AIChatFAB from '@/components/AIChatFAB'
import Watermark from '@/components/Watermark'
import PushNotificationManager from '@/components/PushNotificationManager'
import PinLockWrapper from '@/components/PinLockWrapper'

const hind = Hind_Siliguri({
    subsets: ['bengali'],
    weight: ['300', '400', '500', '600', '700'],
    variable: '--font-hind',
})

export const metadata = {
    title: 'স্মার্ট মানি ম্যানেজার',
    description: 'আপনার অর্থ পরিচালনার সেরা সহায়ক — সঞ্চয় করুন, লক্ষ্য পূরণ করুন।',
}

export default function RootLayout({ children }) {
    return (
        <html lang="bn">
            <head>
                <link rel="manifest" href="/manifest.json" />
                <meta name="theme-color" content="#F59E0B" />
                <link rel="apple-touch-icon" href="/samrat-avatar.png" />
            </head>
            <body className={hind.className}>
                <AuthProvider>
                    <PinLockWrapper>
                        <UIProvider>
                            <AISettingsProvider>
                                <MobileNavWrapper>
                                    {children}
                                    <Watermark />
                                </MobileNavWrapper>
                                <AIChatFAB />
                                <PushNotificationManager />
                            </AISettingsProvider>
                        </UIProvider>
                    </PinLockWrapper>
                </AuthProvider>
            </body>
        </html>
    )
}
