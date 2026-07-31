-- RavRadar 4.0.56 — samlet Supabase-adgangskontrol
begin;

-- Udvid tilladte rettigheder uden at antage constraint-navnet.
do $$
declare c record;
begin
  for c in select oid, conname from pg_constraint where conrelid='public.user_permissions'::regclass and contype='c' loop
    if pg_get_constraintdef(c.oid) ilike '%permission_key%' then execute format('alter table public.user_permissions drop constraint %I',c.conname); end if;
  end loop;
end $$;
alter table public.user_permissions add constraint user_permissions_permission_key_check check(permission_key in ('admin_access','handbook_view','handbook_review','rules_view','rules_edit','rules_publish','zones_view','zones_weather_edit','diagnostics_view','diagnostics_download','observations_view','learning_manage','experts_manage','system_manage','full_admin'));

create or replace function public.has_ravradar_permission(p_key text) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.profiles where id=auth.uid() and role='owner' and is_active)
 or exists(select 1 from public.user_permissions up join public.profiles p on p.id=up.user_id where up.user_id=auth.uid() and p.is_active and up.permission_key='full_admin' and up.enabled)
 or exists(select 1 from public.user_permissions up join public.profiles p on p.id=up.user_id where up.user_id=auth.uid() and p.is_active and up.permission_key=p_key and up.enabled);
$$;

create or replace function public.ravradar_document_permission(p_document_key text) returns text language sql immutable as $$
 select case
  when p_document_key='handbook' then 'handbook_view'
  when p_document_key in ('rules','rule-history') then 'rules_view'
  when p_document_key in ('water-level-station-routing','direction-reviews','zone-overrides','dmi-station-registry','coastline-overrides') then 'zones_view'
  when p_document_key like 'diagnostic-%' or p_document_key in ('diagnostics-settings','runtime-diagnostics','weather-health','dmi-water-stations','water-station-routing-audit','ocean-diagnostics','cache-audit','implementation-audit') then 'diagnostics_view'
  else 'full_admin' end;
$$;


create or replace function public.ravradar_document_write_permission(p_document_key text) returns text language sql immutable as $$
 select case
  when p_document_key='handbook' then 'full_admin'
  when p_document_key in ('rules','rule-history') then 'rules_edit'
  when p_document_key in ('water-level-station-routing','direction-reviews','zone-overrides','dmi-station-registry','coastline-overrides') then 'zones_weather_edit'
  when p_document_key like 'diagnostic-%' or p_document_key in ('diagnostics-settings','runtime-diagnostics','weather-health','dmi-water-stations','water-station-routing-audit','ocean-diagnostics','cache-audit','implementation-audit') then 'system_manage'
  else 'full_admin' end;
$$;

create or replace function public.can_manage_ravradar_document(p_document_key text) returns boolean language sql stable security definer set search_path=public as $$
 select public.is_ravradar_owner() or public.has_ravradar_permission('full_admin') or public.has_ravradar_permission(public.ravradar_document_write_permission(p_document_key));
$$;

create or replace function public.save_ravradar_permissions(p_user_id uuid,p_permissions jsonb) returns void language plpgsql security definer set search_path=public set row_security=off as $$
declare k text; begin
 if not (public.is_ravradar_owner() or public.has_ravradar_permission('full_admin') or public.has_ravradar_permission('experts_manage')) then raise exception 'PERMISSION_DENIED' using errcode='42501'; end if;
 if exists(select 1 from public.profiles where id=p_user_id and role='owner') and not public.is_ravradar_owner() then raise exception 'OWNER_PROTECTED' using errcode='42501'; end if;
 foreach k in array array['admin_access','handbook_view','handbook_review','rules_view','rules_edit','rules_publish','zones_view','zones_weather_edit','diagnostics_view','diagnostics_download','observations_view','learning_manage','experts_manage','system_manage','full_admin'] loop
  insert into public.user_permissions(user_id,permission_key,enabled,updated_at) values(p_user_id,k,coalesce((p_permissions->>k)::boolean,false),now())
  on conflict(user_id,permission_key) do update set enabled=excluded.enabled,updated_at=now();
 end loop;
 insert into public.admin_audit_log(event_type,subject_key,actor_id,details) values('permissions_saved',p_user_id::text,auth.uid(),p_permissions);
end $$;


drop policy if exists ravradar_admin_documents_read on public.admin_documents;
create policy ravradar_admin_documents_read on public.admin_documents for select to authenticated
using(public.is_ravradar_owner() or public.has_ravradar_permission('full_admin') or public.has_ravradar_permission(public.ravradar_document_permission(document_key)));
drop policy if exists ravradar_admin_document_versions_read on public.admin_document_versions;
create policy ravradar_admin_document_versions_read on public.admin_document_versions for select to authenticated
using(public.is_ravradar_owner() or public.has_ravradar_permission('full_admin') or public.has_ravradar_permission(public.ravradar_document_permission(document_key)));

-- Bevar eksisterende eksperters hidtidige håndbogsadgang efter migrationen.
insert into public.user_permissions(user_id,permission_key,enabled)
select distinct user_id,'admin_access',true from public.user_permissions where permission_key='handbook_review' and enabled
on conflict(user_id,permission_key) do update set enabled=true;
insert into public.user_permissions(user_id,permission_key,enabled)
select distinct user_id,'handbook_view',true from public.user_permissions where permission_key='handbook_review' and enabled
on conflict(user_id,permission_key) do update set enabled=true;

-- Håndbogen lagres som et beskyttet admin-dokument.
insert into public.admin_documents(document_key,payload,updated_by) values('handbook','{"schemaVersion": 1, "handbookVersion": "4.0.54", "updatedAt": "2026-07-31", "title": "RavRadar – levende faglig og teknisk drejebog", "sections": [{"id": "forord", "title": "1. Formål og løfte", "summary": "Hvad RavRadar lover – og ikke lover.", "body": "<p>RavRadar er beslutningsstøtte til ravjagt langs danske kyster. Systemet hjælper med valg af sted og tidspunkt, men en høj score er aldrig et løfte om fund.</p><p>Rav skal være til stede, frigøres, transporteres, koncentreres eller aflejres og til sidst være tilgængeligt under jagtbare forhold. Appen skal derfor være ærlig om data, fallback, antagelser og usikkerhed.</p>"}, {"id": "historie", "title": "2. Projektets udvikling", "summary": "Fra vandstandskort til et samlet, auditerbart ravsystem.", "body": "<p>Projektet begyndte som et ønske om gratis vandstandsprognoser langs hele Danmark. Det udviklede sig til et landsdækkende system med zoner, vind, bølger, strøm, vandstand, RavScore, diagnostik og administration.</p><ul><li>DMI blev autoritativ kilde, mens Open-Meteo blev fallback.</li><li>Brede førstegenerationszoner blev erstattet af ét detaljeret register.</li><li>Stationsvalg blev udbygget fra afstand til topologi, historik og override.</li><li>RDKS bevarer historien uden at genindføre forældede løsninger.</li></ul>"}, {"id": "natur", "title": "3. Rav og kystprocesser", "summary": "Den procesmodel, som score og forklaring skal følge.", "body": "<ol><li>Tilstedeværelse</li><li>Frigivelse</li><li>Transport</li><li>Koncentration eller aflejring</li><li>Tilgængelighed og jagtbarhed</li></ol><p>En statisk faktor som rev eller lavt vand må ikke alene skabe høj score. Den kan højst forstærke en dokumenteret dynamisk proces.</p><p>Regler mærkes som dokumenterede, observerede, hypoteser eller validerede i RavRadar.</p>"}, {"id": "dataflow", "title": "4. Datakilder og pipeline", "summary": "DMI-prioritet, separate komponentserier og sammenhængende forecast.", "body": "<p>DMI er autoritativ dansk kilde. Open-Meteo er fallback. Vind, bølger, strøm, vandstand og temperatur behandles separat og samles på faste UTC-timer.</p><p>Timevis pendlen DMI → fallback → DMI er forbudt, fordi den kan skabe kunstige spring. En ærlig horisont på 118–119 timer accepteres frem for kunstigt at tvinge 120 timer.</p>"}, {"id": "stationer", "title": "5. Observationer, cache og DMI-stationer", "summary": "Stationens registerstatus er ikke det samme som dens datastatus.", "body": "<p>RavRadar skal holde DMI-registerstatus, observationsstatus og prognose-/cachestatus adskilt. En station kan være midlertidigt tavs, men stadig prognosebrugbar, hvis gyldige cachedata findes.</p><p>Admin skal på sigt vise seneste observation, cache gyldig til, samlet anvendelighed og historisk leveringsstabilitet. Kendte stationer bevares med historik i stedet for at forsvinde efter en mangelfuld kørsel.</p><p>Administratoroverride erstatter automatikken, når override opfylder de valgte leveringskrav. Det automatiske valg kan vises som reference.</p>"}, {"id": "retninger", "title": "6. Retninger og lokal geometri", "summary": "Vind, strøm og pålandsretning må aldrig blandes sammen.", "body": "<ul><li>Vind: hvor vinden kommer fra.</li><li>Strøm: hvor vandet bevæger sig hen.</li><li>Påland: lokal retning fra hav mod land.</li></ul><p>En korrekt matematisk konvention garanterer ikke korrekt zonegeometri. Land-/havpunkt og <code>onshoreDirectionDeg</code> skal auditeres lokalt.</p><p>En forklarende diskussion om en funktion er ikke automatisk en bestilling på at ændre den.</p>"}, {"id": "zoner", "title": "7. Zoner og kystlinjer", "summary": "Ét register, naturlig kyst og præcis redigering.", "body": "<p>Alle dele af systemet bruger ét detaljeret officielt zoneregister. Brede gamle zoner er udfaset. Als Odde og Helberskov ligger nord for Mariager Fjord mod Øster Hurup.</p><p>Kysteditoren skal bevare præcisionsmarkøren, understøtte glatte lokale kurver, deaktivering uden datatab, central lagring og rollback. Naturlig kyst må ikke ukritisk erstattes af retningen på moler og kajer.</p>"}, {"id": "score", "title": "8. Procesmodel og RavScore", "summary": "Fra rådata til forklarlig score.", "body": "<p>Scoreforklaringen skal vise rådata, kilde, retninger, delscorer, bonusser, fradrag, caps, aktive regler og eventuelt AI-bidrag.</p><p>RavRadar skal også kunne forklare, hvorfor en zone afviger fra nabozonen. Usandsynligt høje scorer skal flagges til audit.</p>"}, {"id": "vandstand", "title": "9. Vandstand og kontinuitet", "summary": "Undgå kunstige spring uden at udglatte ægte tidevand.", "body": "<p>Historiske timevise kildeskift skabte kunstige vandstandsspring og må ikke vende tilbage. Store svingninger i Vadehavet kan være ægte tidevand og skal vurderes ud fra mønster, kilde og geografi.</p><p>Observation og prognose skal vises som forskellige datatyper. Mismatch, eksempelvis ved Frederikshavn, skal kunne spores og forklares.</p>"}, {"id": "admin", "title": "10. Administration og regelbygger", "summary": "Menneskeførst i stedet for datamodelførst.", "body": "<p>En ikke-teknisk administrator skal forstå hvert felt, dets effekt og et konkret eksempel. Regelbyggeren skal være trinvist opbygget med livepreview, forståelig geografi og konflikttjek.</p><p>Prioritet vises som Lav, Normal, Høj eller Kritisk. Dialoger lukkes via kryds, Annuller, Escape og klik udenfor med advarsel ved ikke-gemte ændringer.</p>"}, {"id": "ai", "title": "11. AI, ekspertviden og feedback", "summary": "AI hjælper, men bestemmer ikke alene.", "body": "<p>AI kan strukturere fri tekst, forklare, auditere og foreslå mønstre. AI må ikke aktivere regler, ændre vægte eller lære direkte af rå feedback uden menneskelig kontrol og validering.</p><p>Både fund og ture uden fund er nødvendige og skal knyttes til zone, tid, viste data og scoremotorversion.</p>"}, {"id": "lagring", "title": "12. Central lagring og rollback", "summary": "Historik skal følge ændringerne.", "body": "<p>Zoner, geometri, stationer, regler, ekspertreviews og rettigheder skal lagres centralt med revisionshistorik. Lokale kladder er nødmekanisme.</p><p>Rollback er nødvendig, så geografiske og regelmæssige ændringer kan spores og tilbageføres sikkert.</p>"}, {"id": "drift", "title": "13. Diagnostik, drift og release", "summary": "Brugerstatus, DMI-status og pipeline-status er forskellige.", "body": "<p>En næsten komplet brugerprognose kan eksistere samtidig med degraderet DMI-dækning, fordi fallback udfylder data. Diagnostikken skal forklare acquisition, konvertering, horisont, observationer, cache og fallback.</p><p>Ved hver release skal RDKS, changelog og relevante håndbogsafsnit opdateres, og tests skal bestå, før ZIP-filen afleveres.</p>"}, {"id": "rdks", "title": "14. RDKS og historiske chats", "summary": "Projektets vedvarende og versionsstyrede hukommelse.", "body": "<p>RDKS indeholder aktive beslutninger, krav, implementeringsstatus, kendte issues og historiske kilder. Syv gamle chats er kronologiseret efter tekst og versionsforløb og bevaret med hash og sporbarhed.</p><p>Gamle chats kan forklare, hvorfor projektet ændrede retning, men de giver aldrig alene tilladelse til kodeændringer. Nyere aktive beslutninger vinder.</p>"}, {"id": "status", "title": "15. Aktuel status og næste spor", "summary": "Hvad der især mangler lige nu.", "body": "<ul><li>Fuld observations- kontra prognose-/cachestatus pr. station.</li><li>Cacheudløb og historisk stabilitet i admin.</li><li>Notifikation ved nye stationer, udfald, genoptagelse og bedre routing.</li><li>Fortsat officiel DMI-stationsaudit.</li><li>Komplet RavScore-forklaring og nabozoneaudit.</li><li>Mobil regressionstest af kysteditor og regelbygger.</li><li>Ekstern ekspertvalidering af faglige rav- og sedimentantagelser.</li></ul>"}, {"id": "ordbog", "title": "16. Ordbog", "summary": "De vigtigste begreber.", "body": "<dl><dt>Observation</dt><dd>Faktisk måling.</dd><dt>Prognose</dt><dd>Modelberegnet fremtidig værdi.</dd><dt>Cache</dt><dd>Tidligere hentet data, som stadig kan være gyldig.</dd><dt>Routing</dt><dd>Valg og vægtning af datakilder eller stationer for en zone.</dd><dt>Override</dt><dd>Administratorens bevidste erstatning af automatik.</dd><dt>RDKS</dt><dd>RavRadar Decision &amp; Knowledge System.</dd></dl>"}]}'::jsonb,null)
on conflict(document_key) do update set payload=excluded.payload;

-- Ingen anonym adgang til admin-tabeller eller ekspert-review.
revoke all on public.profiles,public.user_permissions,public.admin_documents,public.admin_document_versions,public.admin_audit_log,public.handbook_reviews,public.handbook_review_versions from anon;

-- Handbook reviews kræver den konkrete rettighed.
drop policy if exists "authenticated users submit handbook reviews" on public.handbook_reviews;
drop policy if exists "users read own handbook reviews" on public.handbook_reviews;
drop policy if exists "authenticated admins manage handbook reviews" on public.handbook_reviews;
drop policy if exists "authenticated reviewers read handbook review queue" on public.handbook_reviews;
create policy handbook_review_insert on public.handbook_reviews for insert to authenticated with check(created_by=auth.uid() and public.has_ravradar_permission('handbook_review'));
create policy handbook_review_read on public.handbook_reviews for select to authenticated using(public.has_ravradar_permission('handbook_review') and (created_by=auth.uid() or public.is_ravradar_owner() or public.has_ravradar_permission('full_admin')));
create policy handbook_review_manage on public.handbook_reviews for update to authenticated using(public.is_ravradar_owner() or public.has_ravradar_permission('full_admin')) with check(public.is_ravradar_owner() or public.has_ravradar_permission('full_admin'));

notify pgrst,'reload schema';
commit;
