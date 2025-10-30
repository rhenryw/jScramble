// Obfuscation utilities: AES-GCM encrypt, base64 encode, and aggressively unicode-escape ~5/6th characters.
// Node-side only (uses crypto). Returns obfuscated payload and key.

import { randomBytes, createCipheriv } from 'crypto';

const b64 = (buf) => Buffer.from(buf).toString('base64');

// Simple seeded PRNG (Mulberry32)
function mulberry32(seed) {
	let t = seed >>> 0;
	return function() {
		t += 0x6D2B79F5;
		let r = Math.imul(t ^ t >>> 15, 1 | t);
		r ^= r + Math.imul(r ^ r >>> 7, 61 | r);
		return ((r ^ r >>> 14) >>> 0) / 4294967296;
	};
}

// Unicode-escape approximately f/d fraction of characters.
export function unicodeEscapeFraction(str, f = 5, d = 6, seed = Date.now() & 0xffffffff) {
	const rnd = mulberry32(seed);
	const targetFraction = f / d;
	let escaped = '';
	for (let i = 0; i < str.length; i++) {
		const ch = str[i];
		if (rnd() < targetFraction) {
			const code = ch.codePointAt(0).toString(16).padStart(4, '0');
			escaped += `\\u${code}`; // literal \uXXXX
		} else {
			escaped += ch;
		}
	}
	return { s: escaped, seed };
}

// Generate some junk strings for camouflage
export function generateJunk(count = 8, seed = (Date.now() * 1.3) & 0xffffffff) {
	const rnd = mulberry32(seed ^ 0xA5A5A5A5);
	const out = [];
	for (let i = 0; i < count; i++) {
		const len = 24 + Math.floor(rnd() * 24);
		const raw = randomBytes(len);
		const s = b64(raw);
		const esc = unicodeEscapeFraction(s, 5, 6, (seed + i * 997) >>> 0).s;
		out.push(esc);
	}
	return out;
}

// AES-GCM-256 encrypt a UTF-8 string
export function aesEncryptGCM(plaintext, keyBytes = randomBytes(32), ivBytes = randomBytes(12)) {
	const cipher = createCipheriv('aes-256-gcm', keyBytes, ivBytes);
	const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
	const tag = cipher.getAuthTag();
	return {
		key: keyBytes, // Buffer
		iv: ivBytes,   // Buffer
		ct: Buffer.concat([enc, tag]) // ciphertext || tag
	};
}

// High-level obfuscator for a JSON string
export function obfuscateJsonString(jsonString) {
	const { key, iv, ct } = aesEncryptGCM(jsonString);
	const ivB64 = b64(iv);
	const ctB64 = b64(ct);

	const seed = (randomBytes(4).readUInt32LE(0)) >>> 0;
	const ivEsc = unicodeEscapeFraction(ivB64, 5, 6, seed);
	const ctEsc = unicodeEscapeFraction(ctB64, 5, 6, seed ^ 0xDEADBEEF);

	const junk = generateJunk(10, seed ^ 0xABCDEF01);

	return {
		keyB64: b64(key),
		payload: {
			v: 1,
			a: 'AES-GCM',
			i: ivEsc.s,
			c: ctEsc.s,
			e: { f: 5, d: 6, s: seed >>> 0 },
			j: junk
		}
	};
}

export default {
	unicodeEscapeFraction,
	generateJunk,
	aesEncryptGCM,
	obfuscateJsonString
};
