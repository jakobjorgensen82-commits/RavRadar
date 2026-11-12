const need=ok=>{if(!ok)throw Object.assign(new Error('LOCAL_RESTORE_FAILED_CLOSED'),{code:'ARCHIVE_AUTH_GUARD_NAME'});};
function name(schema){need(/^rr_archive_auth_[a-f0-9]{16}$/.test(schema));return '"'+schema+'"';}

// Only the disposable B database receives these objects. GoTrue normally
// updates users and retires sessions; using a new email alone does not protect
// restored original rows from those background writes. ALWAYS also covers the
// session_replication_role setting admitted by the existing role export.
export function installOriginalAuthGuardSql(schema){const q=name(schema);return `
SET TimeZone='UTC'; SET DateStyle='ISO, YMD'; SET IntervalStyle='postgres'; SET extra_float_digits=3; SET bytea_output='hex';
CREATE SCHEMA ${q};
REVOKE ALL ON SCHEMA ${q} FROM PUBLIC;
CREATE TABLE ${q}.relations(relation_id oid PRIMARY KEY);
CREATE TABLE ${q}.original_rows(relation_id oid NOT NULL,row_sha bytea NOT NULL,copies bigint NOT NULL,PRIMARY KEY(relation_id,row_sha));
REVOKE ALL ON ALL TABLES IN SCHEMA ${q} FROM PUBLIC;
CREATE FUNCTION ${q}.protect_original() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog
 SET TimeZone='UTC' SET DateStyle='ISO, YMD' SET IntervalStyle='postgres' SET extra_float_digits=3 SET bytea_output='hex' AS $rr_auth_guard$
BEGIN
 IF TG_OP='TRUNCATE' THEN RAISE SQLSTATE '55000' USING MESSAGE='ARCHIVE_ORIGINAL_AUTH_PROTECTED'; END IF;
 IF EXISTS(SELECT 1 FROM ${q}.original_rows WHERE relation_id=TG_RELID
   AND row_sha=pg_catalog.sha256(pg_catalog.convert_to(pg_catalog.to_jsonb(OLD)::text,'UTF8')))
 THEN RAISE SQLSTATE '55000' USING MESSAGE='ARCHIVE_ORIGINAL_AUTH_PROTECTED'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END; $rr_auth_guard$;
DO $rr_auth_install$
DECLARE relation record; total integer;
BEGIN
 IF EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='auth' AND c.relkind IN('p','f'))
 THEN RAISE SQLSTATE '55000' USING MESSAGE='ARCHIVE_AUTH_RELATION_UNSUPPORTED'; END IF;
 SELECT count(*) INTO total FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='auth' AND c.relkind='r';
 IF total<1 OR total>128 THEN RAISE SQLSTATE '55000' USING MESSAGE='ARCHIVE_AUTH_RELATION_BOUND'; END IF;
 FOR relation IN SELECT c.oid,n.nspname,c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='auth' AND c.relkind='r' ORDER BY c.oid LOOP
  INSERT INTO ${q}.relations VALUES(relation.oid);
  EXECUTE format('INSERT INTO ${q}.original_rows SELECT %s,pg_catalog.sha256(pg_catalog.convert_to(pg_catalog.to_jsonb(value)::text,''UTF8'')),count(*) FROM ONLY %I.%I value GROUP BY 2',relation.oid,relation.nspname,relation.relname);
  EXECUTE format('CREATE TRIGGER rr_archive_original_row BEFORE UPDATE OR DELETE ON %I.%I FOR EACH ROW EXECUTE FUNCTION ${q}.protect_original()',relation.nspname,relation.relname);
  EXECUTE format('CREATE TRIGGER rr_archive_original_truncate BEFORE TRUNCATE ON %I.%I FOR EACH STATEMENT EXECUTE FUNCTION ${q}.protect_original()',relation.nspname,relation.relname);
  EXECUTE format('ALTER TABLE %I.%I ENABLE ALWAYS TRIGGER rr_archive_original_row',relation.nspname,relation.relname);
  EXECUTE format('ALTER TABLE %I.%I ENABLE ALWAYS TRIGGER rr_archive_original_truncate',relation.nspname,relation.relname);
 END LOOP;
END; $rr_auth_install$;
`;
}
export function checkOriginalAuthGuardSql(schema){const q=name(schema);return `
SET TimeZone='UTC'; SET DateStyle='ISO, YMD'; SET IntervalStyle='postgres'; SET extra_float_digits=3; SET bytea_output='hex';
DO $rr_auth_check$
DECLARE relation record; intact boolean; total integer;
BEGIN
 SELECT count(*) INTO total FROM ${q}.relations;
 IF total<1 OR total>128 THEN RAISE SQLSTATE '55000' USING MESSAGE='ARCHIVE_AUTH_GUARD_BOUND'; END IF;
 FOR relation IN SELECT original.relation_id,c.relname,n.nspname FROM ${q}.relations original
   LEFT JOIN pg_class c ON c.oid=original.relation_id LEFT JOIN pg_namespace n ON n.oid=c.relnamespace LOOP
  IF relation.nspname IS DISTINCT FROM 'auth' OR relation.relname IS NULL
  THEN RAISE SQLSTATE '55000' USING MESSAGE='ARCHIVE_AUTH_RELATION_CHANGED'; END IF;
  IF (SELECT count(*) FROM pg_trigger WHERE tgrelid=relation.relation_id AND NOT tgisinternal AND tgenabled='A'
    AND tgfoid='${q}.protect_original()'::regprocedure AND tgname IN('rr_archive_original_row','rr_archive_original_truncate'))<>2
  THEN RAISE SQLSTATE '55000' USING MESSAGE='ARCHIVE_AUTH_GUARD_CHANGED'; END IF;
  EXECUTE format('WITH actual AS (SELECT pg_catalog.sha256(pg_catalog.convert_to(pg_catalog.to_jsonb(value)::text,''UTF8'')) row_sha,count(*) copies FROM ONLY %I.%I value GROUP BY 1) SELECT NOT EXISTS(SELECT 1 FROM ${q}.original_rows original LEFT JOIN actual USING(row_sha) WHERE original.relation_id=%s AND COALESCE(actual.copies,0)<original.copies)',relation.nspname,relation.relname,relation.relation_id) INTO intact;
  IF NOT intact THEN RAISE SQLSTATE '55000' USING MESSAGE='ARCHIVE_ORIGINAL_AUTH_CHANGED'; END IF;
 END LOOP;
END; $rr_auth_check$;
SELECT to_jsonb(true);
`;
}
