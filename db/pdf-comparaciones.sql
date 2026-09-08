create table public.pdf_comparaciones (
 id uuid primary key default gen_random_uuid(),
 nombre text not null,
 created_by uuid not null default auth.uid() references auth.users(id),
 created_at timestamptz not null default now(),
 resultados jsonb not null check (jsonb_typeof(resultados)='array'),
 no_registrados jsonb not null default '[]' check (jsonb_typeof(no_registrados)='array'),
 paginas integer not null check (paginas>0),
 storage_path text,
 pdf_deleted_at timestamptz,
 pdf_deleted_by uuid references auth.users(id)
);
alter table public.pdf_comparaciones enable row level security;
revoke all on public.pdf_comparaciones from anon,authenticated;
grant select,insert on public.pdf_comparaciones to authenticated;
grant update(storage_path,pdf_deleted_at,pdf_deleted_by) on public.pdf_comparaciones to authenticated;
create policy pdf_maestro_read on public.pdf_comparaciones for select to authenticated using(public.is_maestro());
create policy pdf_maestro_insert on public.pdf_comparaciones for insert to authenticated with check(public.is_maestro() and created_by=auth.uid());
create policy pdf_maestro_update on public.pdf_comparaciones for update to authenticated using(public.is_maestro()) with check(public.is_maestro());
create index pdf_comparaciones_created_at_idx on public.pdf_comparaciones(created_at desc);
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('comparacion-pdfs','comparacion-pdfs',false,10485760,array['application/pdf']);
create policy pdf_storage_read on storage.objects for select to authenticated using(bucket_id='comparacion-pdfs' and public.is_maestro());
create policy pdf_storage_insert on storage.objects for insert to authenticated with check(bucket_id='comparacion-pdfs' and public.is_maestro() and (storage.foldername(name))[1]=auth.uid()::text);
create policy pdf_storage_delete on storage.objects for delete to authenticated using(bucket_id='comparacion-pdfs' and public.is_maestro());
create function public.aplicar_comparacion_pdf(p_comparacion uuid,p_cambios jsonb,p_estado text) returns integer
language plpgsql security invoker set search_path='' as $$
declare doc public.pdf_comparaciones; cambio jsonb; t public.tramites; total integer:=0;
begin
 if auth.uid() is null or not public.is_maestro() then raise exception 'Solo las cuentas maestro pueden actualizar estados'; end if;
 if p_estado is null or p_estado not in ('Ingresado para SC1','Ingresado para planeacion','Llegaron convenios','Convenios entregados','Finalizado') then raise exception 'Estado no válido'; end if;
 if jsonb_typeof(p_cambios) is distinct from 'array' or jsonb_array_length(p_cambios)=0 then raise exception 'Selecciona trámites'; end if;
 select * into strict doc from public.pdf_comparaciones where id=p_comparacion;
 for cambio in select value from jsonb_array_elements(p_cambios) order by value->>'id' loop
  select * into strict t from public.tramites where id=(cambio->>'id')::uuid for update;
  if not exists(select 1 from jsonb_array_elements(doc.resultados) r where r->>'id'=t.id::text and r->>'folio'=t.folio and r->>'match'='true') then raise exception 'El trámite no coincide con esta comparación'; end if;
  if t.estado is distinct from cambio->>'estado' then raise exception 'Un estado cambió. Actualiza la página antes de continuar'; end if;
  if t.estado=p_estado then continue; end if;
  update public.tramites set estado=p_estado,fecha_finalizacion=case when p_estado='Finalizado' then (now() at time zone 'America/Mexico_City')::date else null end where id=t.id;
  insert into public.tramite_historial(tramite_id,user_id,descripcion) values(t.id,auth.uid(),'Comparación PDF '||doc.nombre||' ['||doc.id||']: '||t.estado||' → '||p_estado);
  total:=total+1;
 end loop;
 return total;
end $$;
revoke all on function public.aplicar_comparacion_pdf(uuid,jsonb,text) from public,anon;
grant execute on function public.aplicar_comparacion_pdf(uuid,jsonb,text) to authenticated;
