import * as crypto from 'crypto';

// Generate a 256-bit (32-byte) random key and return base64
export function generateKeyBase64(): string {
    const key = crypto.randomBytes(32);
    return key.toString('base64');
}

// Encrypt plaintext using AES-256-GCM. Return base64(iv + ciphertext + tag)
export function encryptAesGcmBase64(base64Key: string, plaintext: string): string {
    const key = Buffer.from(base64Key, 'base64');
    const iv = crypto.randomBytes(12); // recommended 12 bytes for GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    // store iv + ciphertext + tag
    return Buffer.concat([iv, encrypted, tag]).toString('base64');
}

// Helper: create deterministic numeric seed array from base64 key
export function seedFromKey(base64Key: string): number[] {
    // hash the key to produce a few 32-bit seeds
    const h = crypto.createHash('sha256').update(base64Key).digest();
    const seeds: number[] = [];
    for (let i = 0; i < 4; i++) {
        seeds.push(h.readUInt32LE(i * 4));
    }
    return seeds;
}

export default {};
