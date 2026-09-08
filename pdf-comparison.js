/* Shared PDF comparisons are visible only to maestro accounts (also enforced by RLS). */
let pdfActive=null,pdfHistory=[],pdfBusy=false,pdfHistoryLoaded=false;
const pdfPanel=document.createElement('section');
pdfPanel.className='panel pdf-panel';
pdfPanel.innerHTML=`<h3>Comparar PDF con trámites</h3><p class=mut>Busca coincidencias por RPU o folio completo y conserva un historial de cada comparación.</p>
<div class=pdf-controls><div><label for=pdfInput>PDF con texto · máximo 10 MB</label><input id=pdfInput type=file accept=application/pdf,.pdf></div><button id=pdfProcess class=p>Comparar PDF</button></div>
<label class=pdf-check><input id=pdfDiscard type=checkbox checked>Eliminar el PDF después de procesarlo y conservar los resultados</label>
<p class=pdf-note>Si desmarcas la opción, guardaremos el PDF y podrás eliminarlo después. Los PDFs escaneados requieren una versión con texto reconocible.</p>
<div id=pdfMessage class=msg role=status aria-live=polite></div>
<label for=pdfHistory>Historial de comparaciones</label><select id=pdfHistory><option value="">Sin comparación seleccionada</option></select>
<button id=pdfOlder class=g type=button>Cargar más historial</button>
<div id=pdfDetails></div>`;
$('master').prepend(pdfPanel);
const pdfFilter=document.createElement('select');pdfFilter.id='pdfFilter';pdfFilter.setAttribute('aria-label','Filtrar por coincidencia en PDF');pdfFilter.innerHTML='<option value="">Todos los resultados PDF</option><option value="yes">Coincidencias en PDF</option><option value="no">No encontrados en PDF</option>';
$('f').after(pdfFilter);
function pdfMessage(text,error=false){$('pdfMessage').textContent=text;$('pdfMessage').className='msg '+(error?'err':'ok');}
function pdfMatch(t){return pdfActive?.resultados.find(r=>r.id===t.id&&r.folio===t.folio);}
function pdfBadge(t){const r=pdfMatch(t);return r?`<span class="pdf-result ${r.match?'pdf-found':'pdf-missing'}">${r.match?'Coincidencia':'No encontrado'}</span>`:'<span class=mut>Sin comparar</span>';}
const baseRender=render;
render=function(){
 const original=a;
 try{if(pdfFilter.value)a=original.filter(t=>{const r=pdfMatch(t);return r&&(pdfFilter.value==='yes'?r.match:!r.match);});baseRender();}finally{a=original;}
 // Totals and access selector always refer to the complete collection.
 s0.textContent=a.length;s1.textContent=a.filter(t=>t.estado==='Ingresado para SC1').length;s2.textContent=a.filter(t=>t.estado==='Ingresado para planeacion').length;s3.textContent=a.filter(t=>['Llegaron convenios','Convenios entregados'].includes(t.estado)).length;s4.textContent=a.filter(t=>t.estado==='Finalizado').length;
 xt.innerHTML='<option value="">Selecciona trámite</option>'+a.map(t=>`<option value="${esc(t.id)}">${esc(t.cliente_nombre)} · ${esc(t.folio)}</option>`).join('');
 const rows=$('T').querySelectorAll('tr');if(rows.length){const th=document.createElement('th');th.textContent='Resultado PDF';rows[0].insertBefore(th,rows[0].lastElementChild);rows.forEach((row,i)=>{if(!i)return;const button=row.querySelector('button');const id=button?.getAttribute('onclick')?.match(/detail\('([^']+)'\)/)?.[1];const t=a.find(t=>t.id===id);if(!t)return;const td=document.createElement('td');td.innerHTML=pdfBadge(t);row.insertBefore(td,row.lastElementChild);const r=pdfMatch(t);if(r)row.classList.add(r.match?'pdf-row-found':'pdf-row-missing');});}
};
q.oninput=render;f.onchange=render;pdfFilter.onchange=render;
// Fetch all pages: comparisons must not silently omit records after the API's row limit.
load=async function(){try{let all=[];for(let start=0;;start+=1000){const r=await sb.from('tramites').select('*').order('fecha_entrega',{ascending:false}).order('id').range(start,start+999);if(r.error)throw r.error;all.push(...r.data);if(r.data.length<1000)break;}a=all;render();if(!pdfHistoryLoaded){pdfHistoryLoaded=true;await pdfLoadHistory();}}catch(e){pdfMessage('No se pudieron cargar los trámites: '+e.message,true);throw e;}};
async function pdfLoadHistory(more=false){
 try{const offset=more?pdfHistory.length:0;const r=await sb.from('pdf_comparaciones').select('id,nombre,created_at,created_by,storage_path,pdf_deleted_at').order('created_at',{ascending:false}).order('id').range(offset,offset+29);if(r.error)throw r.error;pdfHistory=more?pdfHistory.concat(r.data):r.data;$('pdfOlder').hidden=r.data.length<30;
 $('pdfHistory').innerHTML='<option value="">Sin comparación seleccionada</option>'+pdfHistory.map(d=>`<option value="${esc(d.id)}">${esc(d.nombre)} · ${esc(new Date(d.created_at).toLocaleString('es-MX'))}</option>`).join('');if(pdfActive)$('pdfHistory').value=pdfActive.id;else if(!more&&pdfHistory.length)await pdfSelect(pdfHistory[0].id);
 }catch(e){pdfHistoryLoaded=false;pdfMessage('No se pudo cargar el historial: '+e.message,true);}
}
async function pdfSelect(id){if(pdfBusy)return;if(!id){pdfActive=null;pdfFilter.value='';pdfDraw();render();return;}try{const r=await sb.from('pdf_comparaciones').select('*').eq('id',id).single();if(r.error)throw r.error;pdfActive=r.data;$('pdfHistory').value=id;pdfDraw();render();}catch(e){pdfMessage(e.message,true);}}
$('pdfHistory').onchange=e=>pdfSelect(e.target.value);$('pdfOlder').onclick=()=>pdfLoadHistory(true);
function pdfDraw(){
 const el=$('pdfDetails');if(!pdfActive){el.innerHTML='';return;}const d=pdfActive,yes=d.resultados.filter(r=>r.match),no=d.resultados.length-yes.length;
 el.innerHTML=`<div class=pdf-summary><span class="pdf-result pdf-found">${yes.length} coincidencias</span><span class="pdf-result pdf-missing">${no} ${no===1?'no encontrado':'no encontrados'}</span><span>${d.paginas} ${d.paginas===1?'página':'páginas'}</span></div>
 <p class=pdf-note>Resultados de ${esc(d.nombre)} al ${esc(new Date(d.created_at).toLocaleString('es-MX'))}. Los trámites añadidos después aparecen sin comparar.</p>
 <div class=pdf-history-actions>${d.storage_path?'<button id=pdfOpen class=g>Abrir PDF</button><button id=pdfDelete class="g danger">Eliminar PDF</button>':'<span class=mut>PDF eliminado o no conservado. Resultados disponibles.</span>'}</div>
 <details open><summary>Revisar coincidencias y actualizar estados</summary><p class=pdf-note>Selecciona los trámites que quieres actualizar. Subir un PDF no cambia sus estados.</p>
 <div class=pdf-results>${yes.length?`<table><thead><tr><th>Elegir</th><th>Cliente / folio</th><th>Página</th><th>Estado actual</th></tr></thead><tbody>${yes.map(r=>{const t=a.find(t=>t.id===r.id&&t.folio===r.folio);return `<tr><td><input class=pdf-select type=checkbox aria-label="Seleccionar ${esc(r.folio)}" value="${esc(r.id)}" ${t?'':'disabled'}></td><td>${esc(r.cliente_nombre)}<br><b>${esc(r.folio)}</b></td><td>${r.paginas.map(Number).join(', ')}</td><td>${esc(t?sl(t.estado):'Eliminado o folio modificado')}</td></tr>`;}).join('')}</tbody></table>`:'<p>No hay coincidencias para actualizar.</p>'}</div>
 ${yes.length?'<div class=pdf-controls><div><label for=pdfState>Nuevo estado</label><select id=pdfState>'+est.innerHTML+'</select></div><button id=pdfApply class=p>Actualizar seleccionados</button></div>':''}</details>
 <details style="margin-top:15px"><summary>RPUs del PDF sin trámite registrado (${d.no_registrados.length})</summary><p class=pdf-note>Posibles RPUs de 12 o 13 dígitos. Revisa el documento antes de registrarlos.</p>${d.no_registrados.map(r=>`<p><span class="pdf-result pdf-missing">${esc(r.folio)}</span> · página ${r.paginas.map(Number).join(', ')}</p>`).join('')}</details>`;
 if($('pdfOpen'))$('pdfOpen').onclick=pdfOpen;if($('pdfDelete'))$('pdfDelete').onclick=pdfDelete;if($('pdfApply'))$('pdfApply').onclick=pdfApply;
}
function pdfLock(lock){pdfBusy=lock;for(const id of ['pdfProcess','pdfInput','pdfDiscard','pdfHistory','pdfOlder','pdfApply','pdfDelete','pdfOpen'])if($(id))$(id).disabled=lock;}
async function pdfRead(file){
 const lib=await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.624/build/pdf.min.mjs');lib.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.624/build/pdf.worker.min.mjs';
 const task=lib.getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false});let doc;
 try{doc=await task.promise;if(doc.numPages>300)throw new Error('El PDF supera 300 páginas. Divídelo en archivos más pequeños.');const pages=[];for(let n=1;n<=doc.numPages;n++){pdfMessage('Leyendo página '+n+' de '+doc.numPages+'…');const page=await doc.getPage(n);const content=await page.getTextContent();let text='';for(const item of content.items){if('str'in item)text+=item.str+(item.hasEOL?'\n':' ');}if(text.replace(/\s/g,'').length<5)throw new Error('La página '+n+' no tiene texto reconocible. Usa un PDF con texto u OCR; no se guardó una comparación incompleta.');pages.push(text);page.cleanup();}return pages;}finally{await task.destroy();}
}
$('pdfProcess').onclick=async()=>{
 if(pdfBusy||pr?.role!=='maestro')return;const file=$('pdfInput').files[0];if(!file||!file.name.toLowerCase().endsWith('.pdf'))return pdfMessage('Selecciona un PDF.',true);if(file.size>10485760)return pdfMessage('El PDF supera 10 MB.',true);
 const keep=!$('pdfDiscard').checked;pdfLock(true);let saved=false,path=null;
 try{const pages=await pdfRead(file);await load();const result=PdfCompare.compare(pages,a);const id=crypto.randomUUID();
 // Save the comparison first. A failed upload never discards its results.
 const r=await sb.from('pdf_comparaciones').insert({id,nombre:file.name,paginas:pages.length,...result}).select('*').single();if(r.error)throw r.error;pdfActive=r.data;saved=true;
 if(keep){path=u.id+'/'+id+'.pdf';const meta=await sb.from('pdf_comparaciones').update({storage_path:path}).eq('id',id).select('id').single();if(meta.error)throw meta.error;pdfActive.storage_path=path;const upload=await sb.storage.from('comparacion-pdfs').upload(path,file,{contentType:'application/pdf'});if(upload.error)throw upload.error;}
 $('pdfInput').value='';pdfMessage('Comparación guardada. '+(keep?'PDF conservado.':'PDF descartado; solo se conservan los resultados.'));
 }catch(e){pdfMessage((saved?'Resultados guardados, pero no se pudo conservar el PDF: ':'No se completó la comparación: ')+e.message,true);}finally{pdfLock(false);await pdfLoadHistory();pdfDraw();render();}
};
async function pdfOpen(){const tab=window.open('about:blank','_blank');if(tab)tab.opener=null;try{const r=await sb.storage.from('comparacion-pdfs').createSignedUrl(pdfActive.storage_path,120);if(r.error)throw r.error;if(tab)tab.location.href=r.data.signedUrl;else pdfMessage('Permite las ventanas emergentes para abrir el PDF.',true);}catch(e){tab?.close();pdfMessage(e.message,true);}}
async function pdfDelete(){if(pdfBusy||!pdfActive?.storage_path)return;if(!confirm('¿Eliminar este PDF? Las coincidencias y el historial se conservarán.'))return;pdfLock(true);try{const r=await sb.storage.from('comparacion-pdfs').remove([pdfActive.storage_path]);if(r.error)throw r.error;const v={storage_path:null,pdf_deleted_at:new Date().toISOString(),pdf_deleted_by:u.id};const m=await sb.from('pdf_comparaciones').update(v).eq('id',pdfActive.id).select('id').single();if(m.error)throw m.error;Object.assign(pdfActive,v);pdfMessage('PDF eliminado. Los resultados y el historial se conservan.');}catch(e){pdfMessage('No se completó la eliminación. Puedes reintentar: '+e.message,true);}finally{pdfLock(false);pdfDraw();}}
async function pdfApply(){
 if(pdfBusy)return;const ids=[...document.querySelectorAll('.pdf-select:checked')].map(e=>e.value);if(!ids.length)return pdfMessage('Selecciona al menos un trámite.',true);const state=$('pdfState').value;const cambios=ids.map(id=>({id,estado:a.find(t=>t.id===id)?.estado}));if(!confirm('¿Actualizar '+ids.length+' trámite(s) a «'+sl(state)+'»? Se registrará el cambio en su historial.'))return;
 let applied=false;pdfLock(true);try{const r=await sb.rpc('aplicar_comparacion_pdf',{p_comparacion:pdfActive.id,p_cambios:cambios,p_estado:state});if(r.error)throw r.error;applied=true;await load();pdfMessage(r.data+' trámite(s) actualizados. Historial guardado.');}catch(e){pdfMessage((applied?'Cambios guardados; no se pudo refrescar la pantalla: ':'No se aplicaron los cambios: ')+e.message,true);}finally{pdfLock(false);pdfDraw();}
}
// Show the existing audit trail in each expediente, including PDF-driven updates.
const pdfBaseDetail=window.detail;
window.detail=async function(id){await pdfBaseDetail(id);if(did!==id)return;const result=await sb.from('tramite_historial').select('descripcion,created_at,user_id').eq('tramite_id',id).order('created_at',{ascending:false}).limit(50);if(did!==id)return;const box=document.createElement('section');box.innerHTML='<h4>Historial de cambios</h4>'+(result.error?'<p>No se pudo cargar el historial.</p>':result.data.length?result.data.map(h=>`<p>${esc(h.descripcion)}<br><small class=mut>${esc(new Date(h.created_at).toLocaleString('es-MX'))} · Usuario ${esc(h.user_id)}</small></p>`).join(''):'<p class=mut>Sin cambios registrados.</p>');$('db').append(box);};
if(pr?.role==='maestro')load();
