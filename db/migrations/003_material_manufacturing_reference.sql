-- Starter manufacturing corpus. Published/reference values remain distinguishable from ASCEND measured values.
create table if not exists measurement_source (
 id text primary key, title text not null, publisher text, locator text not null, retrieved_on date,
 source_kind text not null default 'manufacturer-published'
);
create table if not exists substrate_profile (
 id text primary key,name text not null,fiber text not null,construction text not null,
 gsm_min numeric,gsm_max numeric,stretch_x numeric,stretch_y numeric,
 confidence text not null default 'reference-published',properties jsonb not null default '{}'::jsonb
);
create table if not exists machine_profile (
 id text primary key,maker text not null,model text not null,process text not null,
 field_x_mm numeric not null,field_y_mm numeric not null,supports_tubular boolean not null default false,
 supports_finished_sleeve boolean not null default false,max_spm integer,source_id text references measurement_source(id),
 confidence text not null default 'reference-published',capabilities jsonb not null default '{}'::jsonb
);
create table if not exists garment_measurement (
 id uuid primary key,garment_ref text not null,size_label text not null,pom text not null,
 value_mm numeric not null,source_id text references measurement_source(id),
 confidence text not null default 'reference-published',measurement_method text,
 unique(garment_ref,size_label,pom)
);
create table if not exists manufacturing_projection (
 id uuid primary key,candidate_id uuid references synthesis_candidate(id) on delete cascade,
 substrate_id text references substrate_profile(id),machine_id text references machine_profile(id),
 medium text not null,projection jsonb not null,validation_status text not null default 'estimated',
 created_at timestamptz not null default now()
);

insert into measurement_source(id,title,publisher,locator,retrieved_on) values
 ('brother-pr1055x','PR1055X published specifications','Brother','https://www.brother-usa.com/products/pr1055x','2026-10-03'),
 ('tajima-tmbp2-sc','TMBP2-SC published specifications','Tajima','https://www.tajima.com/product/tmbp2-sc/','2026-10-03'),
 ('tajima-tmbp2-xc','TMBP2-XC published specifications','Tajima','https://www.tajima.com/product/tmbp2-xc/','2026-10-03'),
 ('barudan-c01','C01 published specifications','Barudan','https://www.barudanamerica.com/c01/','2026-10-03')
on conflict(id) do nothing;

insert into substrate_profile(id,name,fiber,construction,gsm_min,gsm_max,properties) values
 ('linen-woven','Linen / linen-rich woven','linen','woven',140,220,'{"status":"starter-envelope"}'),
 ('cotton-linen','Cotton-linen woven','cotton/linen','woven',160,240,'{"status":"starter-envelope"}'),
 ('cotton-twill','Cotton twill','cotton','twill',220,300,'{"status":"starter-envelope"}'),
 ('cotton-canvas','Cotton duck / canvas','cotton','duck/canvas',280,400,'{"status":"starter-envelope"}')
on conflict(id) do nothing;

insert into machine_profile(id,maker,model,process,field_x_mm,field_y_mm,supports_tubular,supports_finished_sleeve,max_spm,source_id) values
 ('brother-pr1055x','Brother','PR1055X','embroidery',356,203,false,false,1000,'brother-pr1055x'),
 ('tajima-tmbp2-sc','Tajima','TMBP2-SC','embroidery',360,500,true,true,null,'tajima-tmbp2-sc'),
 ('tajima-tmbp2-xc','Tajima','TMBP2-XC','embroidery',550,600,true,true,null,'tajima-tmbp2-xc'),
 ('barudan-c01','Barudan','C01','embroidery',450,520,false,false,1300,'barudan-c01')
on conflict(id) do nothing;
