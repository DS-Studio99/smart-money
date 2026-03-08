/**
 * Unified AI Service - Supports Gemini & OpenRouter
 * Server-side only
 */
import { GoogleGenerativeAI } from '@google/generative-ai'

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

function getRetryDelay(errMsg) {
    const match = errMsg?.match(/retry in (\d+\.?\d*)s/)
    if (match) return Math.ceil(parseFloat(match[1]) * 1000) + 1000
    return 10000
}

// ─── Gemini Provider ──────────────────────────────
async function generateWithGemini(prompt, apiKey, maxRetries = 2) {
    const genAI = new GoogleGenerativeAI(apiKey)
    const models = ['gemini-2.0-flash-lite', 'gemini-2.0-flash']

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        for (const modelName of models) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName })
                const result = await model.generateContent(prompt)
                return result.response.text()
            } catch (err) {
                console.error(`[AI/Gemini] ${modelName} attempt ${attempt + 1}:`, err.message?.substring(0, 100))
                if (err.message?.includes('429') || err.message?.includes('quota')) {
                    if (modelName === models[models.length - 1] && attempt < maxRetries) {
                        const delay = getRetryDelay(err.message)
                        console.log(`[AI/Gemini] Waiting ${delay}ms before retry...`)
                        await sleep(delay)
                    }
                    continue
                }
                if (err.message?.includes('404')) continue
                throw err
            }
        }
    }
    throw new Error('GEMINI_QUOTA_EXCEEDED')
}

// ─── OpenRouter Provider ──────────────────────────
const DEFAULT_OR_MODELS = [
    'google/gemini-2.0-flash-lite-001',
    'google/gemini-2.0-flash-001',
    'deepseek/deepseek-chat',
]

async function generateWithOpenRouter(prompt, apiKey, options = {}) {
    const { model: selectedModel, enableReasoning, maxRetries = 2 } = options

    // If user selected a specific model, try it first; otherwise use defaults
    const models = selectedModel
        ? [selectedModel, ...DEFAULT_OR_MODELS.filter(m => m !== selectedModel)]
        : DEFAULT_OR_MODELS

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        for (const modelName of models) {
            try {
                const bodyPayload = {
                    model: modelName,
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: 1024,
                }

                // Add reasoning support for models that support it
                if (enableReasoning) {
                    bodyPayload.reasoning = { enabled: true }
                }

                const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': 'https://smart-money-manager.app',
                        'X-Title': 'Smart Money Manager',
                    },
                    body: JSON.stringify(bodyPayload)
                })

                if (!res.ok) {
                    const errData = await res.json().catch(() => ({}))
                    const errMsg = errData?.error?.message || `HTTP ${res.status}`
                    console.error(`[AI/OpenRouter] ${modelName} attempt ${attempt + 1}:`, errMsg.substring(0, 120))

                    if (res.status === 429) {
                        if (modelName === models[models.length - 1] && attempt < maxRetries) {
                            await sleep(10000)
                        }
                        continue
                    }
                    if (res.status === 404 || res.status === 400) continue
                    throw new Error(errMsg)
                }

                const data = await res.json()
                const choice = data?.choices?.[0]?.message

                if (!choice?.content) throw new Error('Empty response from OpenRouter')

                // If reasoning was enabled, log it
                if (choice.reasoning_details) {
                    console.log(`[AI/OpenRouter] Reasoning used (${modelName})`)
                }

                return choice.content
            } catch (err) {
                if (err.message?.includes('429') || err.message?.includes('rate')) {
                    if (modelName === models[models.length - 1] && attempt < maxRetries) {
                        await sleep(10000)
                    }
                    continue
                }
                if (err.message?.includes('endpoints found') || err.message?.includes('returned error') || err.message?.includes('400')) {
                    continue
                }
                if (attempt === maxRetries && modelName === models[models.length - 1]) throw err
                continue
            }
        }
    }
    throw new Error('OPENROUTER_ALL_MODELS_FAILED')
}

// ─── Main Export ───────────────────────────────────
/**
 * Generate AI content using the selected provider
 * @param {string} prompt - The prompt text
 * @param {object} options - { provider, geminiKey, openrouterKey, model, enableReasoning }
 * @returns {Promise<string>} Generated text
 */
export async function generateAIContent(prompt, options = {}) {
    const provider = options.provider || process.env.DEFAULT_AI_PROVIDER || 'gemini'
    const geminiKey = options.geminiKey || process.env.GEMINI_API_KEY
    const openrouterKey = options.openrouterKey || process.env.OPENROUTER_API_KEY

    console.log(`[AI] Using provider: ${provider}${options.model ? `, model: ${options.model}` : ''}${options.enableReasoning ? ', reasoning: ON' : ''}`)

    if (provider === 'openrouter') {
        if (!openrouterKey) throw new Error('OpenRouter API key not configured')
        return generateWithOpenRouter(prompt, openrouterKey, {
            model: options.model,
            enableReasoning: options.enableReasoning,
        })
    }

    // Default: Gemini
    if (!geminiKey) throw new Error('Gemini API key not configured')
    return generateWithGemini(prompt, geminiKey)
}

/**
 * Get AI settings from request params or body
 */
export function getAISettings(params) {
    return {
        provider: params.aiProvider || params.get?.('aiProvider') || null,
        geminiKey: params.aiGeminiKey || params.get?.('aiGeminiKey') || null,
        openrouterKey: params.aiOpenrouterKey || params.get?.('aiOpenrouterKey') || null,
        model: params.aiModel || params.get?.('aiModel') || null,
        enableReasoning: params.aiReasoning === true || params.aiReasoning === '1' || params.get?.('aiReasoning') === '1',
    }
}
