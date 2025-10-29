export function unicodeHash(str: string): string {
    // Default: escape every character as a \uXXXX sequence
    return Array.from(str).map(char => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`).join('');
}

// Deterministic shuffle using provided RNG function
function shuffleWithRng<T>(arr: T[], rng: () => number) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}

export function scrambleStringWithRng(str: string, rng: () => number): string {
    // Produce a mostly-escaped representation where ~1/6 of characters remain literal
    const parts: string[] = [];
    for (const ch of Array.from(str)) {
        // roughly 1 out of 6 characters left unescaped (deterministic via rng)
        if (rng() < 1 / 6) {
            parts.push(ch);
            continue;
        }

        // escape as \uXXXX but randomize hex case deterministically for variation
        const code = ch.charCodeAt(0).toString(16).padStart(4, '0');
        const mixed = code.split('').map(c => (/[a-f]/i.test(c) && rng() < 0.5 ? c.toUpperCase() : c)).join('');
        parts.push(`\\u${mixed}`);
    }

    // Deterministic shuffle for tokens
    if (parts.length > 2) {
        shuffleWithRng(parts, rng);
    }

    return parts.join('');
}

export function scrambleObjectWithRng(obj: Record<string, any>, rng: () => number): Record<string, any> {
    const scrambledObj: Record<string, any> = {};
    const entries = Object.entries(obj);
    shuffleWithRng(entries, rng);

    for (const [key, value] of entries) {
        if (typeof value === 'string') {
            scrambledObj[scrambleStringWithRng(key, rng)] = scrambleStringWithRng(value, rng);
        } else if (Array.isArray(value)) {
            scrambledObj[scrambleStringWithRng(key, rng)] = value.map(v => (typeof v === 'string' ? scrambleStringWithRng(v, rng) : (typeof v === 'object' && v !== null ? scrambleObjectWithRng(v, rng) : v)));
        } else if (typeof value === 'object' && value !== null) {
            scrambledObj[scrambleStringWithRng(key, rng)] = scrambleObjectWithRng(value, rng);
        } else {
            scrambledObj[scrambleStringWithRng(key, rng)] = value;
        }
    }
    return scrambledObj;
}

// (old random-based helper removed; use deterministic RNG variants above)