'use client'
import { toBengali, fromBengali, handleBengaliInput } from '@/lib/numberUtils'

/**
 * BengaliNumberInput
 *
 * একটি smart number input যা:
 * - ইংরেজি টাইপ করলে বাংলায় দেখায় (1234 → ১২৩৪)
 * - বাংলা টাইপ করলেও গ্রহণ করে (১২৩৪ → store করে 1234)
 * - state-এ সবসময় English number রাখে (parseFloat-এর জন্য)
 *
 * Props:
 *   value        — state value (English string)
 *   onChange     — (englishString) => void
 *   placeholder  — optional Bengali placeholder
 *   required     — boolean
 *   min          — minimum value
 *   className    — extra classes
 *   style        — extra inline style
 *   autoFocus    — boolean
 */
export default function BengaliNumberInput({
    value,
    onChange,
    placeholder = '০',
    required = false,
    min,
    className = 'form-input',
    style = {},
    autoFocus = false,
    id,
}) {
    // Display: convert stored English value to Bengali for the input
    const displayValue = toBengali(value)

    function handleChange(e) {
        const numeric = handleBengaliInput(e.target.value)
        onChange(numeric)
    }

    return (
        <input
            id={id}
            type="text"
            inputMode="numeric"
            className={className}
            style={{ ...style, letterSpacing: '0.5px' }}
            value={displayValue}
            onChange={handleChange}
            placeholder={placeholder ? toBengali(placeholder) : '০'}
            required={required}
            min={min}
            autoFocus={autoFocus}
        />
    )
}
