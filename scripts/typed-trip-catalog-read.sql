-- REVIEW PROPOSAL ONLY. One fixed, metadata-only SELECT; not a migration.
-- No user function, observation row, auth user, secret or role-setting value is read.
WITH
target AS (
  SELECT c.oid, c.relkind, c.relowner, c.relrowsecurity, c.relforcerowsecurity,
    EXISTS (SELECT 1 FROM pg_catalog.pg_inherits i
      WHERE i.inhrelid = c.oid OR i.inhparent = c.oid) AS has_inheritance
  FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'observations'
),
wanted_roles(name) AS (VALUES ('anon'), ('authenticated'), ('service_role')),
roles AS (
  SELECT w.name, r.oid, r.rolsuper, r.rolinherit, r.rolcreaterole,
    r.rolcreatedb, r.rolcanlogin, r.rolreplication, r.rolbypassrls
  FROM wanted_roles w LEFT JOIN pg_catalog.pg_roles r ON r.rolname = w.name
),
wanted_functions(signature) AS (VALUES
  ('auth.role()'), ('auth.uid()'),
  ('public.ravradar_trip_payload_has_sensitive_key(jsonb)'),
  ('public.ravradar_trip_v3_score_quality_allowed(text,jsonb)'),
  ('public.ravradar_trip_v3_calibration_truth_allowed(text,jsonb,boolean,text,text,text,text)'),
  ('public.ravradar_trip_v3_binding_allowed(text,jsonb,boolean,text,text,text,text)'),
  ('public.ravradar_trip_v3_active_binding_admitted(text,text,text,text,text,text,text,text,text,text,text,jsonb,boolean,text,text,text,text)'),
  ('public.ravradar_observation_require_active_v3_binding()'),
  ('public.ravradar_trip_v3_js9_projection_matches(numeric,numeric,integer)'),
  ('public.ravradar_trip_v3_ffc_historical_original_valid(public.observations)'),
  ('public.ravradar_trip_v3_ffc_historical_admitted(jsonb,uuid)')
),
column_source AS (
  SELECT a.attnum, a.attname, a.atttypmod, a.attnotnull, a.attidentity,
    a.attgenerated, a.attndims, a.atthasmissing, t.typtype,
    tn.nspname AS type_schema, t.typname AS type_name,
    pg_catalog.format_type(a.atttypid, a.atttypmod) AS formatted_type,
    pg_catalog.pg_get_expr(d.adbin, d.adrelid, false) AS default_definition
  FROM target x JOIN pg_catalog.pg_attribute a ON a.attrelid = x.oid
  JOIN pg_catalog.pg_type t ON t.oid = a.atttypid
  JOIN pg_catalog.pg_namespace tn ON tn.oid = t.typnamespace
  LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
  WHERE a.attnum > 0 AND NOT a.attisdropped
),
constraint_source AS (
  SELECT c.conname, c.contype, c.convalidated, c.condeferrable, c.condeferred,
    pg_catalog.pg_get_constraintdef(c.oid, false) AS definition
  FROM target x JOIN pg_catalog.pg_constraint c ON c.conrelid = x.oid
),
index_source AS (
  SELECT c.relname AS name, i.indisunique, i.indisprimary, i.indisvalid, i.indisready,
    pg_catalog.pg_get_indexdef(i.indexrelid, 0, false) AS definition
  FROM target x JOIN pg_catalog.pg_index i ON i.indrelid = x.oid
  JOIN pg_catalog.pg_class c ON c.oid = i.indexrelid
),
trigger_source AS (
  SELECT t.tgname, t.tgenabled, t.tgtype, t.tgattr::text AS columns,
    t.tgisinternal, t.tgconstraint <> 0 AS is_constraint_trigger,
    t.tgfoid::pg_catalog.regprocedure::text AS function_signature,
    pg_catalog.pg_get_triggerdef(t.oid, false) AS definition
  FROM target x JOIN pg_catalog.pg_trigger t ON t.tgrelid = x.oid
  WHERE NOT t.tgisinternal
),
function_source AS (
  SELECT w.signature, p.oid, p.proowner, p.prokind, p.provolatile, p.proisstrict,
    p.prosecdef, p.proretset, p.proacl, l.lanname,
    pg_catalog.pg_get_function_identity_arguments(p.oid) AS arguments,
    pg_catalog.pg_get_function_result(p.oid) AS result_type,
    (SELECT v FROM pg_catalog.unnest(p.proconfig) v
      WHERE v LIKE 'search_path=%' ORDER BY v LIMIT 1) AS search_path,
    EXISTS (SELECT 1 FROM pg_catalog.unnest(p.proconfig) v
      WHERE v NOT LIKE 'search_path=%') AS has_other_local_configuration,
    CASE WHEN p.prokind = 'f' AND l.lanname IN ('sql', 'plpgsql')
      AND NOT EXISTS (SELECT 1 FROM pg_catalog.unnest(p.proconfig) v
        WHERE v NOT LIKE 'search_path=%')
      THEN pg_catalog.pg_get_functiondef(p.oid) END AS definition
  FROM wanted_functions w
  LEFT JOIN pg_catalog.pg_proc p ON p.oid = pg_catalog.to_regprocedure(w.signature)
  LEFT JOIN pg_catalog.pg_language l ON l.oid = p.prolang
),
membership_source AS (
  SELECT parent.rolname AS granted_role, member.rolname AS member_role,
    m.admin_option,
    (pg_catalog.to_jsonb(m)->>'inherit_option')::boolean AS inherit_option,
    (pg_catalog.to_jsonb(m)->>'set_option')::boolean AS set_option
  FROM pg_catalog.pg_auth_members m
  JOIN pg_catalog.pg_roles parent ON parent.oid = m.roleid
  JOIN pg_catalog.pg_roles member ON member.oid = m.member
  WHERE m.roleid IN (SELECT oid FROM roles) OR m.member IN (SELECT oid FROM roles)
),
rows(kind, name, metadata) AS (
  SELECT 'engine', 'server', pg_catalog.jsonb_build_object(
    'serverVersionNum', pg_catalog.current_setting('server_version_num')::integer,
    'targetCount', (SELECT count(*) FROM target),
    'counts', pg_catalog.jsonb_build_object(
      'columns', (SELECT count(*) FROM column_source),
      'constraints', (SELECT count(*) FROM constraint_source),
      'indexes', (SELECT count(*) FROM index_source),
      'triggers', (SELECT count(*) FROM trigger_source),
      'functions', (SELECT count(*) FROM function_source),
      'roles', (SELECT count(*) FROM roles),
      'memberships', (SELECT count(*) FROM membership_source)))
  UNION ALL
  SELECT 'relation', 'public.observations', pg_catalog.jsonb_build_object(
    'kind', x.relkind, 'owner', pg_catalog.pg_get_userbyid(x.relowner),
    'rls', x.relrowsecurity, 'forceRls', x.relforcerowsecurity,
    'hasInheritance', x.has_inheritance) FROM target x
  UNION ALL
  SELECT 'column', s.attname::text, pg_catalog.jsonb_build_object(
    'position', s.attnum, 'typeSchema', s.type_schema, 'typeName', s.type_name,
    'typeKind', s.typtype, 'formattedType', s.formatted_type, 'typmod', s.atttypmod,
    'notNull', s.attnotnull, 'identity', s.attidentity, 'generated', s.attgenerated,
    'arrayDimensions', s.attndims, 'hasMissingValue', s.atthasmissing,
    'defaultBytes', pg_catalog.octet_length(s.default_definition),
    'default', CASE WHEN pg_catalog.octet_length(s.default_definition) <= 2048
      THEN s.default_definition END)
  FROM (SELECT attnum, attname, atttypmod, attnotnull, attidentity, attgenerated,
    attndims, atthasmissing, typtype, type_schema, type_name, formatted_type,
    default_definition FROM column_source ORDER BY attnum LIMIT 65) s
  UNION ALL
  SELECT 'constraint', s.conname::text, pg_catalog.jsonb_build_object(
    'type', s.contype, 'validated', s.convalidated, 'deferrable', s.condeferrable,
    'deferred', s.condeferred, 'definitionBytes', pg_catalog.octet_length(s.definition),
    'definition', CASE WHEN pg_catalog.octet_length(s.definition) <= 32768
      THEN s.definition END)
  FROM (SELECT conname, contype, convalidated, condeferrable, condeferred,
    definition FROM constraint_source ORDER BY conname LIMIT 33) s
  UNION ALL
  SELECT 'index', s.name::text, pg_catalog.jsonb_build_object(
    'unique', s.indisunique, 'primary', s.indisprimary, 'valid', s.indisvalid,
    'ready', s.indisready, 'definitionBytes', pg_catalog.octet_length(s.definition),
    'definition', CASE WHEN pg_catalog.octet_length(s.definition) <= 4096
      THEN s.definition END)
  FROM (SELECT name, indisunique, indisprimary, indisvalid, indisready,
    definition FROM index_source ORDER BY name LIMIT 33) s
  UNION ALL
  SELECT 'trigger', s.tgname::text, pg_catalog.jsonb_build_object(
    'enabled', s.tgenabled, 'events', s.tgtype, 'columns', s.columns,
    'internal', s.tgisinternal, 'constraintTrigger', s.is_constraint_trigger,
    'function', s.function_signature, 'definitionBytes', pg_catalog.octet_length(s.definition),
    'definition', CASE WHEN pg_catalog.octet_length(s.definition) <= 4096
      THEN s.definition END)
  FROM (SELECT tgname, tgenabled, tgtype, columns, tgisinternal, is_constraint_trigger,
    function_signature, definition FROM trigger_source ORDER BY tgname LIMIT 9) s
  UNION ALL
  SELECT 'function', s.signature, pg_catalog.jsonb_build_object(
    'present', s.oid IS NOT NULL, 'owner', pg_catalog.pg_get_userbyid(s.proowner),
    'kind', s.prokind, 'language', s.lanname, 'arguments', s.arguments,
    'result', s.result_type, 'volatility', s.provolatile, 'strict', s.proisstrict,
    'securityDefiner', s.prosecdef, 'returnsSet', s.proretset, 'searchPath', s.search_path,
    'otherConfiguration', s.has_other_local_configuration,
    'definitionBytes', pg_catalog.octet_length(s.definition),
    'definition', CASE WHEN pg_catalog.octet_length(s.definition) <= 32768
      THEN s.definition END,
    'sameNameCount', (SELECT count(*) FROM pg_catalog.pg_proc q
      JOIN pg_catalog.pg_namespace n ON n.oid = q.pronamespace
      WHERE n.nspname = pg_catalog.split_part(s.signature, '.', 1)
        AND q.proname = pg_catalog.split_part(pg_catalog.split_part(s.signature, '.', 2), '(', 1)),
    'aclCount', (SELECT count(*) FROM pg_catalog.aclexplode(
      coalesce(s.proacl, pg_catalog.acldefault('f', s.proowner)))),
    'execute', (SELECT pg_catalog.jsonb_object_agg(r.name,
      pg_catalog.has_function_privilege(r.oid, s.oid, 'EXECUTE')) FROM roles r),
    'acl', (SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'grantee', CASE WHEN a.grantee = 0 THEN 'PUBLIC'
        WHEN a.grantee = s.proowner THEN 'OWNER'
        WHEN a.grantee IN (SELECT oid FROM roles) THEN pg_catalog.pg_get_userbyid(a.grantee)
        ELSE 'OTHER' END,
      'grantorIsOwner', a.grantor = s.proowner,
      'privilege', a.privilege_type, 'grantable', a.is_grantable)
      ORDER BY a.grantee, a.privilege_type)
      FROM (SELECT grantee, grantor, privilege_type, is_grantable
        FROM pg_catalog.aclexplode(coalesce(s.proacl,
          pg_catalog.acldefault('f', s.proowner)))
        ORDER BY grantee, privilege_type LIMIT 17) a))
  FROM function_source s
  UNION ALL
  SELECT 'role', r.name, pg_catalog.jsonb_build_object(
    'present', r.oid IS NOT NULL, 'superuser', r.rolsuper, 'inherit', r.rolinherit,
    'createRole', r.rolcreaterole, 'createDb', r.rolcreatedb, 'login', r.rolcanlogin,
    'replication', r.rolreplication, 'bypassRls', r.rolbypassrls,
    'tablePrivileges', (SELECT pg_catalog.jsonb_build_object(
      'select', pg_catalog.has_table_privilege(r.oid, x.oid, 'SELECT'),
      'insert', pg_catalog.has_table_privilege(r.oid, x.oid, 'INSERT'),
      'update', pg_catalog.has_table_privilege(r.oid, x.oid, 'UPDATE'),
      'delete', pg_catalog.has_table_privilege(r.oid, x.oid, 'DELETE'),
      'anyColumnSelect', pg_catalog.has_any_column_privilege(r.oid, x.oid, 'SELECT'),
      'anyColumnInsert', pg_catalog.has_any_column_privilege(r.oid, x.oid, 'INSERT'),
      'anyColumnUpdate', pg_catalog.has_any_column_privilege(r.oid, x.oid, 'UPDATE'))
      FROM target x))
  FROM roles r
  UNION ALL
  SELECT 'membership', s.granted_role::text || '<-' || s.member_role::text,
    pg_catalog.jsonb_build_object('grantedRole', s.granted_role, 'memberRole', s.member_role,
      'admin', s.admin_option, 'inherit', s.inherit_option, 'set', s.set_option)
  FROM (SELECT granted_role, member_role, admin_option, inherit_option, set_option
    FROM membership_source ORDER BY granted_role, member_role LIMIT 33) s
),
document AS (
  SELECT pg_catalog.jsonb_build_object('schemaVersion', 'ravradar-typed-trip-catalog-read-v1',
    'rows', pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'kind', kind, 'name', name, 'metadata', metadata) ORDER BY kind, name)) AS payload
  FROM rows
)
SELECT pg_catalog.octet_length(payload::text) AS bytes,
  CASE WHEN pg_catalog.octet_length(payload::text) <= 196608 THEN payload END AS metadata
FROM document;

