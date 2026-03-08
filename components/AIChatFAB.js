'use client'
import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useAISettings } from '@/context/AISettingsContext'
import { usePathname } from 'next/navigation'

// Dynamic suggestion questions based on finance context
const SUGGESTION_POOLS = [
    'আমার এই মাসের খরচ কেমন?',
    'কোন ক্যাটাগরিতে বেশি খরচ হচ্ছে?',
    'আমি কি বেশি খরচ করছি?',
    'আমাকে বাজেট প্ল্যান করতে সাহায্য কর',
    'কীভাবে বেশি সেভ করতে পারি?',
    'আমার লক্ষ্য পূরণ হবে কখন?',
    'এই মাসে কত টাকা বাকি আছে?',
    'আমার সঞ্চয় হার কত?',
    'কোথায় খরচ কমাতে পারি?',
    'আমার আর্থিক অবস্থা কেমন?',
    'এই মাসের রিপোর্ট দাও',
    'দ্রুত ধনী হওয়ার উপায় কী?',
    'জরুরি সঞ্চয় ফান্ড কীভাবে তৈরি করব?',
    'বিনিয়োগ শুরু করব কীভাবে?',
    'ঋণমুক্ত হওয়ার কৌশল কী?',
]

function getRandomSuggestions(count = 3) {
    const shuffled = [...SUGGESTION_POOLS].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, count)
}

// ── Markdown-style renderer ──
function renderAIMessage(text) {
    if (!text) return null
    const lines = text.split('\n')
    const elements = []
    let i = 0

    while (i < lines.length) {
        const line = lines[i]

        // Skip empty lines but add spacing
        if (line.trim() === '') {
            i++
            continue
        }

        // Section header: lines starting with ══ or ──
        if (/^[═─]{2,}/.test(line.trim()) || /[═─]{2,}$/.test(line.trim())) {
            i++
            continue
        }

        // Heading style: line with *** or ### or all caps emoji prefix
        if (/^#{1,3}\s/.test(line)) {
            const headText = line.replace(/^#{1,3}\s/, '')
            elements.push(
                <div key={i} className="ai-msg-heading">{inlineFormat(headText)}</div>
            )
            i++
            continue
        }

        // Numbered list
        const numMatch = line.match(/^(\d+)\.\s+(.*)$/)
        if (numMatch) {
            elements.push(
                <div key={i} className="ai-msg-num-item">
                    <span className="ai-msg-num">{numMatch[1]}.</span>
                    <span>{inlineFormat(numMatch[2])}</span>
                </div>
            )
            i++
            continue
        }

        // Bullet list: * or - or •
        const bulletMatch = line.match(/^[*\-•]\s+(.*)$/)
        if (bulletMatch) {
            elements.push(
                <div key={i} className="ai-msg-bullet">
                    <span className="ai-msg-dot">●</span>
                    <span>{inlineFormat(bulletMatch[1])}</span>
                </div>
            )
            i++
            continue
        }

        // Regular paragraph
        elements.push(
            <p key={i} className="ai-msg-para">{inlineFormat(line)}</p>
        )
        i++
    }

    return <div className="ai-msg-body">{elements}</div>
}

// Inline formatting: **bold**, *italic*, `code`, ৳amounts
function inlineFormat(text) {
    if (!text) return null
    // Split by bold/italic/code markers
    const parts = []
    const regex = /\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`/g
    let lastIndex = 0
    let match
    while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push(<span key={lastIndex}>{text.slice(lastIndex, match.index)}</span>)
        }
        if (match[1]) parts.push(<strong key={match.index} className="ai-msg-bold">{match[1]}</strong>)
        else if (match[2]) parts.push(<em key={match.index} className="ai-msg-italic">{match[2]}</em>)
        else if (match[3]) parts.push(<code key={match.index} className="ai-msg-code">{match[3]}</code>)
        lastIndex = match.index + match[0].length
    }
    if (lastIndex < text.length) {
        parts.push(<span key={lastIndex}>{text.slice(lastIndex)}</span>)
    }
    return parts.length > 0 ? parts : text
}

export default function AIChatFAB() {
    const { user, profile } = useAuth()
    const { getAIBody } = useAISettings()
    const pathname = usePathname()

    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState([])
    const [input, setInput] = useState('')
    const [thinking, setThinking] = useState(false)
    const [suggestions, setSuggestions] = useState([])
    const [fabVisible, setFabVisible] = useState(true)
    const [isAnimating, setIsAnimating] = useState(false)
    const bottomRef = useRef(null)
    const inputRef = useRef(null)
    const intervalRef = useRef(null)

    const displayName = profile?.name || user?.email?.split('@')[0] || 'বন্ধু'
    const isLoggedIn = !!user && pathname !== '/'

    // Rotate suggestions
    useEffect(() => {
        if (!isLoggedIn) return
        setSuggestions(getRandomSuggestions(3))
        const iv = setInterval(() => {
            if (!isOpen) setSuggestions(getRandomSuggestions(3))
        }, 8000)
        intervalRef.current = iv
        return () => clearInterval(iv)
    }, [isOpen, isLoggedIn])

    // Scroll to bottom
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, thinking])

    // Focus input when open
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 300)
        }
    }, [isOpen])

    // Init greeting message
    useEffect(() => {
        if (isOpen && messages.length === 0) {
            setMessages([{
                role: 'ai',
                text: `নমস্কার ${displayName}! 👋 আমি আপনার AI মানি ম্যানেজার। আপনার আর্থিক বিষয়ে যেকোনো প্রশ্ন করুন।`
            }])
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen])

    function handleOpen() {
        setIsAnimating(true)
        setIsOpen(true)
        setTimeout(() => setIsAnimating(false), 400)
    }

    function handleClose() {
        setIsOpen(false)
    }

    async function sendMessage(text) {
        const msg = text || input.trim()
        if (!msg || thinking) return
        setInput('')
        setMessages(m => [...m, { role: 'user', text: msg }])
        setThinking(true)
        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: msg, userId: user.id, ...getAIBody() })
            })
            const data = await res.json()
            setMessages(m => [...m, { role: 'ai', text: data.reply }])
        } catch {
            setMessages(m => [...m, { role: 'ai', text: 'দুঃখিত, সংযোগে সমস্যা হয়েছে। আবার চেষ্টা করুন।' }])
        }
        setThinking(false)
    }

    if (!isLoggedIn) return null

    return (
        <>
            {/* FAB Button */}
            {!isOpen && (
                <div className="ai-fab-wrapper" onClick={handleOpen}>
                    <div className="ai-fab-pulse" />
                    <div className="ai-fab-pulse ai-fab-pulse-2" />
                    <button className="ai-fab-btn" aria-label="AI আর্থিক সহকারী খুলুন">
                        <div className="ai-fab-logo">
                            <img
                                src="/samrat-avatar.png"
                                alt="Samrat"
                                className="ai-fab-avatar-img"
                            />
                        </div>
                    </button>
                </div>
            )}

            {/* Chat Modal */}
            {isOpen && (
                <div className={`ai-fab-modal ${isAnimating ? 'ai-fab-modal-entering' : 'ai-fab-modal-open'}`}>
                    {/* Header */}
                    <div className="ai-fab-modal-header">
                        <div className="ai-fab-header-glow" />
                        <div className="ai-fab-header-left">
                            <div className="ai-fab-header-logo">
                                <img
                                    src="/samrat-avatar.png"
                                    alt="Samrat"
                                    className="ai-fab-header-avatar-img"
                                />
                            </div>
                            <div>
                                <div className="ai-fab-header-title">AI মানি ম্যানেজার</div>
                                <div className="ai-fab-header-sub">
                                    <span className="ai-fab-online-dot" />
                                    সক্রিয় — সবসময় প্রস্তুত
                                </div>
                            </div>
                        </div>
                        <button className="ai-fab-close-btn" onClick={handleClose} aria-label="বন্ধ করুন">
                            <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
                                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                            </svg>
                        </button>
                    </div>

                    {/* Suggestion chips */}
                    <div className="ai-fab-suggestions">
                        {suggestions.map((s, i) => (
                            <button
                                key={`${s}-${i}`}
                                className="ai-fab-chip"
                                onClick={() => sendMessage(s)}
                                disabled={thinking}
                            >
                                {s}
                            </button>
                        ))}
                    </div>

                    {/* Messages */}
                    <div className="ai-fab-messages">
                        {messages.map((msg, i) => (
                            <div key={i} className={`ai-fab-msg-row ${msg.role === 'user' ? 'ai-fab-msg-user' : 'ai-fab-msg-ai'}`}>
                                {msg.role === 'ai' && (
                                    <div className="ai-fab-avatar-small">
                                        <img src="/samrat-avatar.png" alt="AI" className="ai-fab-msg-avatar-img" />
                                    </div>
                                )}
                                <div className={`ai-fab-bubble ${msg.role === 'ai' ? 'ai-fab-bubble-ai' : 'ai-fab-bubble-user'}`}>
                                    {msg.role === 'ai' ? renderAIMessage(msg.text) : msg.text}
                                </div>
                            </div>
                        ))}
                        {thinking && (
                            <div className="ai-fab-msg-row ai-fab-msg-ai">
                                <div className="ai-fab-avatar-small">
                                    <img src="/samrat-avatar.png" alt="AI" className="ai-fab-msg-avatar-img" />
                                </div>
                                <div className="ai-fab-bubble ai-fab-bubble-ai ai-fab-thinking">
                                    <span className="ai-dot" />
                                    <span className="ai-dot" />
                                    <span className="ai-dot" />
                                </div>
                            </div>
                        )}
                        <div ref={bottomRef} />
                    </div>

                    {/* Input */}
                    <div className="ai-fab-input-row">
                        <input
                            ref={inputRef}
                            className="ai-fab-input"
                            placeholder="প্রশ্ন করুন..."
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && sendMessage()}
                            disabled={thinking}
                        />
                        <button
                            className="ai-fab-send-btn"
                            onClick={() => sendMessage()}
                            disabled={thinking || !input.trim()}
                            aria-label="পাঠান"
                        >
                            <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
                                <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            {/* Backdrop */}
            {isOpen && <div className="ai-fab-backdrop" onClick={handleClose} />}
        </>
    )
}
