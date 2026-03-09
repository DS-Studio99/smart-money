'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useAISettings } from '@/context/AISettingsContext'
import Sidebar from '@/components/Sidebar'

const QUICK_QUESTIONS = [
    '🔮 AI Life Simulator (ভবিষ্যৎ সিমুলেট কর)',
    '🤖 AI Money Personality (আমার স্বভাব কেমন?)',
    '🧠 AI Life Event Planner (একটি ইভেন্ট প্ল্যান কর)',
    '🚨 AI Fraud Detection (কোন অস্বাভাবিক খরচ আছে কি?)',
    '📈 AI Investment Advisor (রিস্ক অনুযায়ী সাজেশন)',
    '🎭 AI Money Roast (আমাকে মজার রোস্ট কর!)',
    '⚖️ AI "What If" (যদি ৫০০০ টাকা সেভ করি, কী হবে?)',
]

// ── Markdown-style renderer ──
function renderAIMessage(text) {
    if (!text) return null
    const lines = text.split('\n')
    const elements = []
    let i = 0
    while (i < lines.length) {
        const line = lines[i]
        if (line.trim() === '') { i++; continue }
        if (/^[═─]{2,}/.test(line.trim()) || /[═─]{2,}$/.test(line.trim())) { i++; continue }
        if (/^#{1,3}\s/.test(line)) {
            elements.push(<div key={i} className="ai-msg-heading">{inlineFormat(line.replace(/^#{1,3}\s/, ''))}</div>)
            i++; continue
        }
        const numMatch = line.match(/^(\d+)\.\s+(.*)$/)
        if (numMatch) {
            elements.push(
                <div key={i} className="ai-msg-num-item">
                    <span className="ai-msg-num">{numMatch[1]}.</span>
                    <span>{inlineFormat(numMatch[2])}</span>
                </div>
            )
            i++; continue
        }
        const bulletMatch = line.match(/^[*\-•]\s+(.*)$/)
        if (bulletMatch) {
            elements.push(
                <div key={i} className="ai-msg-bullet">
                    <span className="ai-msg-dot">●</span>
                    <span>{inlineFormat(bulletMatch[1])}</span>
                </div>
            )
            i++; continue
        }
        elements.push(<p key={i} className="ai-msg-para">{inlineFormat(line)}</p>)
        i++
    }
    return <div className="ai-msg-body">{elements}</div>
}

function inlineFormat(text) {
    if (!text) return null
    const parts = []
    const regex = /\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`/g
    let lastIndex = 0, match
    while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) parts.push(<span key={lastIndex}>{text.slice(lastIndex, match.index)}</span>)
        if (match[1]) parts.push(<strong key={match.index} className="ai-msg-bold">{match[1]}</strong>)
        else if (match[2]) parts.push(<em key={match.index} className="ai-msg-italic">{match[2]}</em>)
        else if (match[3]) parts.push(<code key={match.index} className="ai-msg-code">{match[3]}</code>)
        lastIndex = match.index + match[0].length
    }
    if (lastIndex < text.length) parts.push(<span key={lastIndex}>{text.slice(lastIndex)}</span>)
    return parts.length > 0 ? parts : text
}

export default function ChatPage() {
    const { user, loading } = useAuth()
    const { getAIBody } = useAISettings()
    const router = useRouter()
    const [messages, setMessages] = useState([
        { role: 'ai', text: 'আস-সালামু আলাইকুম! 👋 আমি আপনার AI মানি ম্যানেজার। আপনার আর্থিক বিষয়ে যেকোনো প্রশ্ন করুন — খরচ বিশ্লেষণ, সঞ্চয় টিপস, রিপোর্ট, বা দ্রুত ধনী হওয়ার পরামর্শ!' }
    ])
    const [input, setInput] = useState('')
    const [thinking, setThinking] = useState(false)
    const bottomRef = useRef(null)

    useEffect(() => { if (!loading && !user) router.push('/') }, [user, loading, router])
    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, thinking])

    async function sendMessage(text) {
        const msg = text || input.trim()
        if (!msg || thinking) return
        setInput('')
        setMessages(m => [...m, { role: 'user', text: msg }])
        setThinking(true)
        try {
            const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: msg, userId: user.id, ...getAIBody() }) })
            const data = await res.json()
            setMessages(m => [...m, { role: 'ai', text: data.reply }])
        } catch { setMessages(m => [...m, { role: 'ai', text: 'দুঃখিত, সংযোগে সমস্যা হয়েছে। আবার চেষ্টা করুন।' }]) }
        setThinking(false)
    }

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content" style={{ display: 'flex', flexDirection: 'column' }}>
                {/* Header */}
                <div className="gl-chat-header">
                    <div className="gl-chat-header-bg"></div>
                    <div className="gl-chat-header-inner">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(139,92,246,0.1))', border: '1px solid rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, boxShadow: '0 0 20px rgba(59,130,246,0.2)' }}>🤖</div>
                            <div>
                                <h1 style={{ fontSize: 20, fontWeight: 800, background: 'linear-gradient(135deg, #F1F5F9, #60A5FA, #A855F7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AI আর্থিক সহকারী</h1>
                                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>আপনার সকল আর্থিক প্রশ্নের উত্তর পান</p>
                            </div>
                        </div>
                        <div className="gl-chat-status"><div className="gl-chat-status-dot"></div>সক্রিয়</div>
                    </div>
                </div>

                {/* Quick Questions */}
                <div className="gl-chat-quick">
                    {QUICK_QUESTIONS.map((q, i) => (
                        <button key={i} className="gl-chat-quick-btn" onClick={() => sendMessage(q)}>{q}</button>
                    ))}
                </div>

                {/* Messages */}
                <div className="gl-chat-messages">
                    {messages.map((msg, i) => (
                        <div key={i} className={`gl-chat-msg ${msg.role === 'user' ? 'gl-msg-user' : 'gl-msg-ai'}`}>
                            <div className={`gl-chat-avatar ${msg.role === 'ai' ? 'gl-av-ai' : 'gl-av-user'}`}>
                                {msg.role === 'ai'
                                    ? <img src="/samrat-avatar.png" alt="AI" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', borderRadius: '50%', display: 'block' }} />
                                    : '😊'
                                }
                            </div>
                            <div className={`gl-chat-bubble ${msg.role === 'ai' ? 'gl-bubble-ai' : 'gl-bubble-user'}`}>
                                {msg.role === 'ai' ? renderAIMessage(msg.text) : msg.text}
                            </div>
                        </div>
                    ))}
                    {thinking && (
                        <div className="gl-chat-msg gl-msg-ai">
                            <div className="gl-chat-avatar gl-av-ai">
                                <img src="/samrat-avatar.png" alt="AI" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', borderRadius: '50%', display: 'block' }} />
                            </div>
                            <div className="gl-chat-bubble gl-bubble-ai" style={{ display: 'flex', gap: 6, padding: '16px 22px' }}>
                                <div className="loader-dot" /><div className="loader-dot" /><div className="loader-dot" />
                            </div>
                        </div>
                    )}
                    <div ref={bottomRef} />
                </div>

                {/* Input */}
                <div className="gl-chat-input-area">
                    <div className="gl-chat-input-glow"></div>
                    <input
                        placeholder="আপনার প্রশ্ন লিখুন... (যেমন: আমার রিপোর্ট দেখাও)"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && sendMessage()}
                        disabled={thinking}
                    />
                    <button onClick={() => sendMessage()} disabled={thinking || !input.trim()}>
                        {thinking ? '⏳' : '📤'}
                    </button>
                </div>
            </main>
        </div>
    )
}
