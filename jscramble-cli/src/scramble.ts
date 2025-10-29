import { generateKeyBase64, encryptAesGcmBase64, seedFromKey } from './crypto';
import { scrambleObjectWithRng, scrambleStringWithRng } from './utils/hash';

function makeRngFromSeeds(seeds: number[]) {
    // sfc32 PRNG using four 32-bit seeds
    let a = seeds[0] >>> 0, b = seeds[1] >>> 0, c = seeds[2] >>> 0, d = seeds[3] >>> 0;
    return function () {
        a |= 0; b |= 0; c |= 0; d |= 0;
        var t = (a + b) | 0;
        a = b ^ (b >>> 9);
        b = (c + (c << 3)) | 0;
        c = (c << 21) | (c >>> 11);
        d = (d + 1) | 0;
        t = (t + d) | 0;
        c = (c + t) | 0;
        return (t >>> 0) / 4294967296;
    };
}

function scrambleJson(jsonData: object): { scrambled: object; keyBase64: string; } {
    // generate unique key per-run
    const keyBase64 = generateKeyBase64();
    const seeds = seedFromKey(keyBase64);
    const rng = makeRngFromSeeds(seeds);

    // walk jsonData and replace strings with encrypted+obfuscated payloads
    const transform = (value: any): any => {
        if (typeof value === 'string') {
            const cipher = encryptAesGcmBase64(keyBase64, value);
            // obfuscate the base64 cipher using deterministic scramble of the string itself
            return scrambleStringWithRng(cipher, rng);
        } else if (Array.isArray(value)) {
            return value.map(transform);
        } else if (typeof value === 'object' && value !== null) {
            const out: Record<string, any> = {};
            for (const [k, v] of Object.entries(value)) {
                // scramble keys and values using deterministic scramble on strings
                const encKeyRaw = typeof k === 'string' ? scrambleStringWithRng(k, rng) : String(k);
                const encKey = String(encKeyRaw);
                out[encKey] = transform(v);
            }
            return out;
        }
        return value;
    };

    const scrambled = transform(jsonData);
    return { scrambled, keyBase64 };
}

export { scrambleJson };