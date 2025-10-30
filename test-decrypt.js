import { readFileSync } from 'fs';
import './read.js';
const ob = JSON.parse(readFileSync('./test-ob.json', 'utf8'));
const go = async ()=>{
  const data = await globalThis.jscramble.read(ob);
  console.log('[roundtrip]', JSON.stringify(data));
};
await go();
