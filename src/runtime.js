// Runtime deobfuscator template. Produces a minified, self-contained script with the key embedded.
// The builder in build.js will inject KEY_B64 and export a small API.

export function buildRuntimeJs({ keyB64, minify = true }) {
	// Write clear, then perform a crude minify at the end.
			const src = `
			(function(g){
				'use strict';
				var K=\`${keyB64}\`;
				function dUE(s){
					return s.replace(/\\\\u([0-9a-fA-F]{4})/g,function(_,h){return String.fromCharCode(parseInt(h,16));});
				}
				function b64toBuf(b64){
					if (typeof atob==='function'){
						var bin=atob(b64), len=bin.length, bytes=new Uint8Array(len);
						for (var i=0;i<len;i++) bytes[i]=bin.charCodeAt(i);
						return bytes.buffer;
					}
					return Buffer.from(b64,'base64');
				}
				function bufToStr(buf){
					if (typeof TextDecoder!=='undefined') return new TextDecoder().decode(buf);
					return Buffer.from(buf).toString('utf8');
				}
				function b64toKey(b64){
					var raw=b64toBuf(b64);
					if (g.crypto&&g.crypto.subtle){
						return g.crypto.subtle.importKey('raw', raw, {name:'AES-GCM'}, false, ['decrypt']);
					} else if (typeof require==='function'){
						var webcrypto=(require('crypto').webcrypto);return webcrypto.subtle.importKey('raw',raw,{name:'AES-GCM'},false,['decrypt']);
					} else { throw new Error('No WebCrypto available'); }
				}
				function subtle(){
					if (g.crypto&&g.crypto.subtle) return g.crypto.subtle;
					if (typeof require==='function') return require('crypto').webcrypto.subtle;
					throw new Error('No WebCrypto');
				}
				async function read(ob){
					var ivB64=dUE(ob.i), ctB64=dUE(ob.c);
					var iv=b64toBuf(ivB64), all=b64toBuf(ctB64);
					var ct=new Uint8Array(all.byteLength-16); ct.set(new Uint8Array(all).subarray(0,all.byteLength-16));
					var tag=new Uint8Array(16); tag.set(new Uint8Array(all).subarray(all.byteLength-16));
					var combo=new Uint8Array(ct.length+tag.length); combo.set(ct,0); combo.set(tag,ct.length);
					var key=await b64toKey(K);
					var pt=await subtle().decrypt({name:'AES-GCM',iv: new Uint8Array(iv)}, key, combo);
					var txt=bufToStr(pt);
					return JSON.parse(txt);
				}
				g.jscramble=g.jscramble||{}; g.jscramble.read=read;
			})(typeof globalThis!=='undefined'?globalThis:window);
			`;
	// crude minifier: strip newlines and extra spaces
				const mini = src
					.replace(/\/\*[\s\S]*?\*\//g,'')
					.replace(/\n+/g,' ')
					.replace(/\s{2,}/g,' ')
					.replace(/\s?([{}();,:=\[\]])\s?/g,'$1');
			return minify ? mini : src;
}

export default { buildRuntimeJs };
