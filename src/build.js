// CLI orchestrator for JSON obfuscation
import { readFileSync, writeFileSync } from 'fs';
import { dirname, basename, extname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { obfuscateJsonString } from './obfuscate.js';
import { buildRuntimeJs } from './runtime.js';
import JavaScriptObfuscator from 'javascript-obfuscator';

function ensureJsonExt(p) { return extname(p).toLowerCase() === '.json'; }

export async function main(argv = []) {
	if (!argv[0]) {
		console.error('Usage: npm run ob <path/to/file.json> OR ob <path/to/file.json>');
		process.exit(2);
	}
	const inPath = resolve(argv[0]);
	if (!ensureJsonExt(inPath)) {
		console.error('Input must be a .json file');
		process.exit(2);
	}
	const src = readFileSync(inPath, 'utf8');
	// Validate JSON
	let parsed;
	try { parsed = JSON.parse(src); }
	catch(e){
		console.error('Input is not valid JSON:', e.message);
		process.exit(2);
	}
	const jsonString = JSON.stringify(parsed);
	const { keyB64, payload } = obfuscateJsonString(jsonString);

	const dir = dirname(inPath);
	const base = basename(inPath, extname(inPath));
	const obPath = resolve(dir, `${base}-ob.json`);
	const jsPath = resolve(dir, `read.js`);

	// Write the obfuscated JSON
	writeFileSync(obPath, JSON.stringify(payload));

	// Generate the runtime with embedded key
				let runtimeJs = buildRuntimeJs({ keyB64, minify: true });
				// Additional obfuscation pass using javascript-obfuscator
				const obf = JavaScriptObfuscator.obfuscate(runtimeJs, {
					compact: true,
					controlFlowFlattening: true,
					controlFlowFlatteningThreshold: 0.75,
					deadCodeInjection: true,
					deadCodeInjectionThreshold: 0.2,
					numbersToExpressions: true,
					simplify: true,
					stringArray: true,
					stringArrayThreshold: 0.75,
					stringArrayShuffle: true,
					stringArrayIndexesType: ['hexadecimal-number'],
					renameGlobals: true,
					unicodeEscapeSequence: true,
				});
				runtimeJs = obf.getObfuscatedCode();
				writeFileSync(jsPath, runtimeJs);

	console.log(`[ob] Wrote ${obPath}`);
	console.log(`[ob] Wrote ${jsPath}`);
}

export default { main };
