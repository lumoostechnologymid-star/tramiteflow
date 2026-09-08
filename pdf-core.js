/* Exact identifier comparison. Never coerce folios to numbers. */
(function(root){
 const normalize = value => String(value ?? '').normalize('NFKC').toUpperCase().replace(/[\s‐‑‒–—-]/g,'');
 function compare(pages, tramites) {
  const locations = new Map();
  const add = (token,page) => {const key=normalize(token); if(!key)return; if(!locations.has(key))locations.set(key,new Set()); locations.get(key).add(page);};
  pages.forEach((text,index)=>{
   // Preserve token boundaries: 123 is not a match inside 1234.
   for(const token of text.normalize('NFKC').toUpperCase().match(/[A-Z0-9]+(?:[-‐‑‒–—][A-Z0-9]+)*/g)||[]) add(token,index+1);
   // CFE commonly prints the 12-digit RPU in three groups of four.
   for(const m of text.matchAll(/(?<![A-Za-z0-9])\d{4}[ \t]+\d{4}[ \t]+\d{4}(?![ \t]*\d|[A-Za-z])/g))add(m[0],index+1);
  });
  const known=new Set(tramites.map(t=>normalize(t.folio)));
  return {
   resultados:tramites.map(t=>({id:t.id,folio:t.folio,cliente_nombre:t.cliente_nombre,estado:t.estado,match:locations.has(normalize(t.folio)),paginas:[...(locations.get(normalize(t.folio))||[])]})),
   no_registrados:[...locations].filter(([key])=>/^\d{12,13}$/.test(key)&&!known.has(key)).map(([folio,ps])=>({folio,paginas:[...ps]}))
  };
 }
 root.PdfCompare={normalize,compare};
 if(typeof module!=='undefined')module.exports=root.PdfCompare;
})(globalThis);
