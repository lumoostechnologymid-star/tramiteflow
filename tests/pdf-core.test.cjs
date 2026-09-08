const {test}=require('node:test');const assert=require('node:assert/strict');const {compare}=require('../pdf-core.js');
const rows=[{id:'1',folio:'001234567890'},{id:'2',folio:'774241100711'},{id:'3',folio:'ABC-123'},{id:'4',folio:'1234'}];
test('exact matches, leading zeroes, grouped RPU and duplicate page references',()=>{const r=compare(['001234567890 7742 4110 0711 ABC-123 12345','001234567890'],rows);assert.deepEqual(r.resultados.map(r=>r.match),[true,true,true,false]);assert.deepEqual(r.resultados[0].paginas,[1,2]);});
test('unknown RPU and no partial numeric match',()=>{const r=compare(['999999999999 10012345678901'],rows);assert.equal(r.resultados[0].match,false);assert.deepEqual(r.no_registrados,[{folio:'999999999999',paginas:[1]}]);});
test('empty document gives no matches',()=>{assert.ok(compare([''],rows).resultados.every(r=>!r.match));});
