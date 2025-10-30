# jScramble CLI

A tiny Node.js CLI to obfuscate JSON by encrypting with AES-GCM, then aggressively unicode-escaping most characters and sprinkling in junk. It also generates a small, minified `read.js` that holds the decryption key and exposes a runtime function to restore the original JSON in the browser.

## What it does
- AES-GCM encrypts the entire JSON (keys + values) with a fresh random key and IV
- Base64 encodes the ciphertext and IV
- Unicode-escapes ~5/6 of characters deterministically using a seeded PRNG
- Adds a handful of fake/junk strings to the output JSON (ignored by the runtime)
- Emits two files next to your input JSON:
  - `{name}-ob.json` — the obfuscated payload
  - `read.js` — an obfuscated/minified deobfuscator with the AES key embedded

## Install and use

You can run directly via the packaged binary using npx, or via the npm script.

- Using npx (recommended):

```bash
npx --yes . ob test.json
```

- Using npm script inside this repo:

```bash
npm run ob -- test.json
```

- After running, you will get:
  - `test-ob.json`
  - `read.js`

## Use in the browser

Include `read.js` on your page, fetch the obfuscated JSON, and decode:

```html
<script src="/path/to/read.js"></script>
<script>
  fetch('/path/to/test-ob.json')
    .then(r => r.json())
    .then(async ob => {
      const data = await window.jscramble.read(ob);
      console.log('Decrypted JSON:', data);
    });
</script>
```

## Notes
- This is security-by-obscurity for client-side assets. Anyone with access to `read.js` can ultimately recover the key; this only deters casual inspection and scraping.
- The runtime uses Web Crypto (SubtleCrypto) in browsers. For Node-based tests it falls back to `require('crypto').webcrypto`.
- The junk values are random and ignored by the runtime.

## Development

- CLI entry: `bin/ob.js`
- Orchestrator: `src/build.js`
- Obfuscation core: `src/obfuscate.js`
- Runtime template/minifier: `src/runtime.js`

Quick test:

```bash
node bin/ob.js test.json
node test-decrypt.js
```

License: MIT
