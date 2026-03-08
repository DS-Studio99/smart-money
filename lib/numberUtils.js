/**
 * Bengali Number Utilities
 * English ↔ Bengali digit conversion + input helpers
 */

const EN_TO_BN = { '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪', '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯' }
const BN_TO_EN = { '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4', '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9' }

/** English → Bengali digits.  e.g. "1234.5" → "১২৩৪.৫" */
export function toBengali(value) {
    if (value === null || value === undefined) return ''
    return String(value).replace(/[0-9]/g, d => EN_TO_BN[d])
}

/** Bengali → English digits.  e.g. "১২৩৪.৫" → "1234.5" */
export function fromBengali(value) {
    if (!value) return ''
    return String(value).replace(/[০-৯]/g, d => BN_TO_EN[d])
}

/**
 * Use inside an onChange handler for number inputs.
 * Accepts English or Bengali digits, always stores as English numeric string.
 * Returns the numeric string to put in state.
 *
 * Usage:
 *   onChange={e => setForm(f => ({ ...f, amount: handleBengaliInput(e.target.value) }))}
 */
export function handleBengaliInput(rawValue) {
    // Convert any Bengali digits → English
    const english = fromBengali(String(rawValue))
    // Allow only digits and a single decimal point
    return english.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1')
}

/**
 * Format a stored English numeric string for display as Bengali.
 * e.g. "1234" → "১২৩৪"
 */
export function displayBengali(value) {
    if (value === '' || value === null || value === undefined) return ''
    return toBengali(value)
}
