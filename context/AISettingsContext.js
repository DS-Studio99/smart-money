'use client'
import { createContext, useContext, useState, useEffect } from 'react'

const AISettingsContext = createContext({})

// Available OpenRouter models (free + popular)
export const OPENROUTER_MODELS = [
    { id: 'google/gemini-2.0-flash-lite-001', name: '💎 Gemini 2.0 Flash Lite', desc: 'Google — দ্রুত ও হালকা', free: false },
    { id: 'google/gemini-2.0-pro-exp-02-05:free', name: '💎 Gemini Pro (Free)', desc: 'Google — সবচেয়ে শক্তিশালী', free: true },
    { id: 'meta-llama/llama-3.3-70b-instruct:free', name: '🦙 Llama 3.3 70B', desc: 'Meta — খুব দ্রুত, স্মার্ট', free: true },
    { id: 'qwen/qwen-2.5-72b-instruct:free', name: '⚡ Qwen 2.5 72B', desc: 'Alibaba — দারুণ বাংলা সাপোর্ট', free: true },
    { id: 'deepseek/deepseek-r1:free', name: '🔬 DeepSeek R1', desc: 'Reasoning মডেল', free: true },
]

const DEFAULT_SETTINGS = {
    provider: 'gemini',         // 'gemini' | 'openrouter'
    geminiKey: '',
    openrouterKey: '',
    openrouterModel: 'google/gemini-2.0-flash-lite-001',    // selected model ID
    enableReasoning: false,     // reasoning mode toggle
}

export function AISettingsProvider({ children }) {
    const [settings, setSettings] = useState(DEFAULT_SETTINGS)
    const [loaded, setLoaded] = useState(false)

    useEffect(() => {
        try {
            const saved = localStorage.getItem('ai_settings')
            if (saved) {
                const parsed = JSON.parse(saved)
                setSettings(prev => ({ ...prev, ...parsed }))
            }
        } catch (_) { }
        setLoaded(true)
    }, [])

    function updateSettings(newSettings) {
        const updated = { ...settings, ...newSettings }
        setSettings(updated)
        try {
            localStorage.setItem('ai_settings', JSON.stringify(updated))
        } catch (_) { }
    }

    // Build query params for GET requests
    function getAIParams() {
        const params = new URLSearchParams()
        if (settings.provider) params.set('aiProvider', settings.provider)
        if (settings.provider === 'gemini' && settings.geminiKey) params.set('aiGeminiKey', settings.geminiKey)
        if (settings.provider === 'openrouter') {
            if (settings.openrouterKey) params.set('aiOpenrouterKey', settings.openrouterKey)
            if (settings.openrouterModel) {
                params.set('aiModel', settings.openrouterModel)
            }
            if (settings.enableReasoning) params.set('aiReasoning', '1')
        }
        return params.toString()
    }

    // Build body object for POST requests
    function getAIBody() {
        const body = { aiProvider: settings.provider }
        if (settings.provider === 'gemini' && settings.geminiKey) body.aiGeminiKey = settings.geminiKey
        if (settings.provider === 'openrouter') {
            if (settings.openrouterKey) body.aiOpenrouterKey = settings.openrouterKey
            if (settings.openrouterModel) {
                body.aiModel = settings.openrouterModel
            }
            if (settings.enableReasoning) body.aiReasoning = true
        }
        return body
    }

    return (
        <AISettingsContext.Provider value={{ settings, updateSettings, getAIParams, getAIBody, loaded }}>
            {children}
        </AISettingsContext.Provider>
    )
}

export function useAISettings() {
    return useContext(AISettingsContext)
}
