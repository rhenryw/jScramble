import { Command } from 'commander';
import { scrambleJson } from './scramble';
import * as fs from 'fs';
import * as path from 'path';
import { seedFromKey } from './crypto';

const program = new Command();

program
  .version('1.0.0')
  .description('CLI tool to scramble JSON data')
  .argument('<file>', 'path to the JSON file to scramble')
  .action((file: string) => {
    fs.readFile(file, 'utf8', (err, data) => {
      if (err) {
        console.error(`Error reading file: ${err.message}`);
        process.exit(1);
      }

      try {
        const jsonData = JSON.parse(data);
        const { scrambled, keyBase64 } = scrambleJson(jsonData);

  // write out an obfuscated output file instead of overwriting
  const base = path.basename(file, path.extname(file));
  const outName = `${base}-obfiscated.json`;
  const outPath = path.join(path.dirname(file), outName);
  const outJson = JSON.stringify(scrambled, null, 2);
  fs.writeFileSync(outPath, outJson, 'utf8');

  // generate read.js next to the obfuscated JSON file so pages can include it
  const seeds = seedFromKey(keyBase64);
  const reader = makeReaderJs(keyBase64, seeds);
  const readerPath = path.join(path.dirname(outPath), 'read.js');
  fs.writeFileSync(readerPath, reader, 'utf8');

  console.log(`Wrote scrambled JSON to ${outPath} and wrote reader to ${readerPath}`);
      } catch (parseError) {
        const msg = parseError instanceof Error ? parseError.message : String(parseError);
        console.error(`Error parsing JSON: ${msg}`);
        process.exit(1);
      }
    });
  });

// Generate a heavily obfuscated reader script which embeds the base64 key and seeds
function makeReaderJs(keyBase64: string, seeds: number[]) {
  // build the plaintext reader source (same logic as before) but we'll XOR-obfuscate it
  const src = `
(function(){
  const keyB64 = '${keyBase64}';
  const seeds = ${JSON.stringify(seeds)};
  function makeRng(seeds){var a=seeds[0]>>>0,b=seeds[1]>>>0,c=seeds[2]>>>0,d=seeds[3]>>>0;return function(){a|=0;b|=0;c|=0;d|=0;var t=(a+b)|0;a=b^(b>>>9);b=(c+(c<<3))|0;c=(c<<21)|(c>>>11);d=(d+1)|0;t=(t+d)|0;c=(c+t)|0;return (t>>>0)/4294967296;};}
  function tokensFromStr(s){const out=[];for(let i=0;i<s.length;){if(s[i]=='\\\\'&&s[i+1]=='u'){out.push(s.slice(i,i+6));i+=6;}else{out.push(s[i]);i+=1;}}return out;}
  function inversePerm(perm){const inv=new Array(perm.length);for(let i=0;i<perm.length;i++)inv[perm[i]]=i;return inv;}
  function shuffleIndices(n,rng){const arr=new Array(n);for(let i=0;i<n;i++)arr[i]=i;for(let i=n-1;i>0;i--){const j=Math.floor(rng()*(i+1));const t=arr[i];arr[i]=arr[j];arr[j]=t;}return arr;}
  function tokensToRaw(tokens){return tokens.map(tok=>tok.startsWith('\\u')?String.fromCharCode(parseInt(tok.slice(2),16)):tok).join('');}
  function b64ToUint8Array(b64){const bin=atob(b64);const len=bin.length;const bytes=new Uint8Array(len);for(let i=0;i<len;i++)bytes[i]=bin.charCodeAt(i);return bytes;}
  async function importKey(){const keyBytes=b64ToUint8Array(keyB64);return await crypto.subtle.importKey('raw',keyBytes,'AES-GCM',false,['decrypt']);}
  async function decryptB64(b64,cryptoKey){const all=b64ToUint8Array(b64);const iv=all.slice(0,12);const ct=all.slice(12);const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:iv},cryptoKey,ct);return new TextDecoder().decode(new Uint8Array(plain));}
  async function unscrambleString(scr,cryptoKey){const tokens=tokensFromStr(scr);const rng=makeRng(seeds);const perm=shuffleIndices(tokens.length,rng);const inv=inversePerm(perm);const origTokens=new Array(tokens.length);for(let i=0;i<tokens.length;i++)origTokens[inv[i]]=tokens[i];const raw=tokensToRaw(origTokens);return await decryptB64(raw,cryptoKey);}  
  async function decryptObj(obj,cryptoKey){if(typeof obj==='string'){try{return await unscrambleString(obj,cryptoKey);}catch(e){return obj;}}if(Array.isArray(obj)){return await Promise.all(obj.map(v=>decryptObj(v,cryptoKey)));}if(obj&&typeof obj==='object'){const out={};const entries=Object.entries(obj);for(const [k,v] of entries){const newKey=typeof k==='string'?await decryptObj(k,cryptoKey):k;out[newKey]=await decryptObj(v,cryptoKey);}return out;}return obj;}  
  // readiness promise
  window.__read_ready = new Promise((resolve)=>{window.__read_resolve=resolve;});
  (async function(){const cryptoKey=await importKey();window.__unscramble=async function(obj){return await decryptObj(obj,cryptoKey);};const origJson=Response.prototype.json;Response.prototype.json=function(){return origJson.call(this).then(async (obj)=>await decryptObj(obj,cryptoKey));};window.__read_resolve();})();
})();
`;

  // XOR-obfuscate source with PRNG bytes derived from seeds, then base64 encode
  const plain = Buffer.from(src, 'utf8');
  // create deterministic keystream from seeds (sfc32)
  function mkKeystream(seedsLocal: number[], len: number) {
    let a = seedsLocal[0] >>> 0, b = seedsLocal[1] >>> 0, c = seedsLocal[2] >>> 0, d = seedsLocal[3] >>> 0;
    const out = Buffer.alloc(len);
    for (let i = 0; i < len; i++) {
      a |= 0; b |= 0; c |= 0; d |= 0;
      let t = (a + b) | 0;
      a = b ^ (b >>> 9);
      b = (c + (c << 3)) | 0;
      c = (c << 21) | (c >>> 11);
      d = (d + 1) | 0;
      t = (t + d) | 0;
      c = (c + t) | 0;
      const rnd = (t >>> 0) / 4294967296;
      out[i] = Math.floor(rnd * 256);
    }
    return out;
  }

  const ks = mkKeystream(seeds, plain.length);
  const xorred = Buffer.alloc(plain.length);
  for (let i = 0; i < plain.length; i++) xorred[i] = plain[i] ^ ks[i];
  const payload = xorred.toString('base64');

  // loader reconstructs keystream using seeds, XORs and evals
  const loader = `(function(p,s){function mk(len,se){var a=se[0]>>>0,b=se[1]>>>0,c=se[2]>>>0,d=se[3]>>>0,arr=new Uint8Array(len);for(var i=0;i<len;i++){a|=0;b|=0;c|=0;d|=0;var t=(a+b)|0;a=b^(b>>>9);b=(c+(c<<3))|0;c=(c<<21)|(c>>>11);d=(d+1)|0;t=(t+d)|0;c=(c+t)|0;var r=(t>>>0)/4294967296;arr[i]=Math.floor(r*256);}return arr;}var b=atob(p);var len=b.length;var ba=new Uint8Array(len);for(var i=0;i<len;i++)ba[i]=b.charCodeAt(i);var ks=mk(len,s);for(var i=0;i<len;i++)ba[i]=ba[i]^ks[i];var src='';for(var i=0;i<len;i++)src+=String.fromCharCode(ba[i]);eval(src);}('${payload}',${JSON.stringify(seeds)});`;
  return loader;
}

program.parse(process.argv);