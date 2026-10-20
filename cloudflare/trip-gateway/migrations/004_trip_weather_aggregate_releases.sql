-- PRIVATE UNINSTALLED successor of the previous draft004; NEVER apply both.
-- Same account-level8 units, cost4; NO lifetime reset, rotation, refund or public release.
CREATE TABLE trip_weather_aggregate_policy_anchor (
  schema_version INTEGER NOT NULL CHECK(schema_version=1),
  ledger_id TEXT NOT NULL PRIMARY KEY CHECK(ledger_id='rr-trip-descriptive-GLOBAL'),
  policy_sha256 TEXT NOT NULL CHECK(policy_sha256='3587b34f5e3c96f328a56a954db84560977a1e1c614732bbb9887962792a13c9'),
  mechanism_sha256 TEXT NOT NULL CHECK(mechanism_sha256='ffd3389017064fce904ec2f8f850b4e60248db0e29185f9a0ed83021be73117b'),
  accounting_scope TEXT NOT NULL CHECK(accounting_scope='PER_ACCOUNT_LIFETIME'),
  accounting_sha256 TEXT NOT NULL CHECK(accounting_sha256='1e79fc2cd2ba9c06c07537458b4628d3a6ae878b750a69885a256108206feb56'),
  cost_units INTEGER NOT NULL CHECK(cost_units=4),
  maximum_units INTEGER NOT NULL CHECK(maximum_units=8),
  status TEXT NOT NULL CHECK(status='PRIVATE_UNISSUED_REVIEW_ONLY'),
  public_release_issued INTEGER NOT NULL CHECK(public_release_issued=0)
);
INSERT INTO trip_weather_aggregate_policy_anchor VALUES
  (1,'rr-trip-descriptive-GLOBAL',
   '3587b34f5e3c96f328a56a954db84560977a1e1c614732bbb9887962792a13c9',
   'ffd3389017064fce904ec2f8f850b4e60248db0e29185f9a0ed83021be73117b',
   'PER_ACCOUNT_LIFETIME','1e79fc2cd2ba9c06c07537458b4628d3a6ae878b750a69885a256108206feb56',
   4,8,'PRIVATE_UNISSUED_REVIEW_ONLY',0);
CREATE TRIGGER trip_weather_aggregate_policy_no_replace BEFORE INSERT ON trip_weather_aggregate_policy_anchor
BEGIN SELECT CASE WHEN EXISTS(SELECT 1 FROM trip_weather_aggregate_policy_anchor) THEN RAISE(ABORT,'DP_POLICY_IMMUTABLE') END; END;
CREATE TRIGGER trip_weather_aggregate_policy_no_update BEFORE UPDATE ON trip_weather_aggregate_policy_anchor
BEGIN SELECT RAISE(ABORT,'DP_POLICY_IMMUTABLE'); END;
CREATE TRIGGER trip_weather_aggregate_policy_no_delete BEFORE DELETE ON trip_weather_aggregate_policy_anchor
BEGIN SELECT RAISE(ABORT,'DP_POLICY_IMMUTABLE'); END;

CREATE TABLE trip_weather_aggregate_releases (
  schema_version INTEGER NOT NULL CHECK(schema_version=1),
  ledger_id TEXT NOT NULL CHECK(ledger_id='rr-trip-descriptive-GLOBAL'),
  release_key TEXT NOT NULL PRIMARY KEY CHECK(length(release_key)=64 AND release_key NOT GLOB '*[^a-f0-9]*'),
  period_start TEXT NOT NULL UNIQUE,
  period_end TEXT NOT NULL CHECK(period_end>period_start),
  model_binding_sha256 TEXT NOT NULL CHECK(length(model_binding_sha256)=64 AND model_binding_sha256 NOT GLOB '*[^a-f0-9]*'),
  policy_sha256 TEXT NOT NULL CHECK(length(policy_sha256)=64 AND policy_sha256 NOT GLOB '*[^a-f0-9]*'),
  budget_units INTEGER NOT NULL CHECK(budget_units=4),
  proposal_only INTEGER NOT NULL CHECK(proposal_only=1),
  report_json TEXT NOT NULL CHECK(json_valid(report_json)),
  report_sha256 TEXT NOT NULL CHECK(length(report_sha256)=64 AND report_sha256 NOT GLOB '*[^a-f0-9]*'),
  preference_basis_sha256 TEXT NOT NULL CHECK(length(preference_basis_sha256)=64 AND preference_basis_sha256 NOT GLOB '*[^a-f0-9]*'),
  erasure_basis_sha256 TEXT NOT NULL CHECK(length(erasure_basis_sha256)=64 AND erasure_basis_sha256 NOT GLOB '*[^a-f0-9]*'),
  contributor_subjects_json TEXT NOT NULL CHECK(json_valid(contributor_subjects_json) AND json_type(contributor_subjects_json)='array' AND json_array_length(contributor_subjects_json)<=1000),
  accounting_sha256 TEXT NOT NULL CHECK(accounting_sha256='1e79fc2cd2ba9c06c07537458b4628d3a6ae878b750a69885a256108206feb56'),
  created_at TEXT NOT NULL DEFAULT(strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
-- Internal pseudonymous budget metadata, NOT anonymous output or a trip history.
-- No model/policy/year column occurs in its lifetime budget key.
CREATE TABLE trip_weather_aggregate_account_charges (
  owner_subject TEXT NOT NULL CHECK(length(owner_subject)=50 AND substr(owner_subject,1,7)='usr_v1_' AND substr(owner_subject,8) NOT GLOB '*[^A-Za-z0-9_-]*'),
  period_start TEXT NOT NULL,
  release_key TEXT NOT NULL,
  budget_units INTEGER NOT NULL CHECK(budget_units=4),
  PRIMARY KEY(owner_subject,period_start)
);
CREATE INDEX trip_weather_aggregate_account_release ON trip_weather_aggregate_account_charges(release_key,owner_subject);
CREATE TRIGGER trip_weather_aggregate_insert_guard BEFORE INSERT ON trip_weather_aggregate_releases BEGIN
  SELECT CASE WHEN EXISTS(SELECT 1 FROM trip_weather_aggregate_releases
    WHERE period_start=NEW.period_start OR release_key=NEW.release_key) THEN RAISE(ABORT,'DP_PERIOD_IMMUTABLE') END;
  SELECT CASE WHEN EXISTS(SELECT 1 FROM json_each(NEW.contributor_subjects_json)
    WHERE type<>'text' OR length(value)<>50 OR substr(value,1,7)<>'usr_v1_' OR substr(value,8) GLOB '*[^A-Za-z0-9_-]*')
    OR (SELECT count(DISTINCT value) FROM json_each(NEW.contributor_subjects_json))<>json_array_length(NEW.contributor_subjects_json)
    THEN RAISE(ABORT,'DP_ACCOUNT_MEMBERSHIP_INVALID') END;
  SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM trip_weather_aggregate_policy_anchor
    WHERE ledger_id=NEW.ledger_id AND policy_sha256=NEW.policy_sha256 AND accounting_sha256=NEW.accounting_sha256
      AND accounting_scope='PER_ACCOUNT_LIFETIME' AND cost_units=NEW.budget_units AND maximum_units=8
      AND status='PRIVATE_UNISSUED_REVIEW_ONLY' AND public_release_issued=0)
    THEN RAISE(ABORT,'DP_POLICY_BASIS_MISMATCH') END;
  SELECT CASE WHEN EXISTS(SELECT 1 FROM json_each(NEW.contributor_subjects_json) selected WHERE
    (SELECT coalesce(sum(budget_units),0) FROM trip_weather_aggregate_account_charges WHERE owner_subject=selected.value)+4>8)
    THEN RAISE(ABORT,'DP_ACCOUNT_LIFETIME_BUDGET_EXHAUSTED') END;
END;
CREATE TRIGGER trip_weather_aggregate_charge_guard BEFORE INSERT ON trip_weather_aggregate_account_charges BEGIN
  SELECT CASE WHEN EXISTS(SELECT 1 FROM trip_weather_aggregate_account_charges
    WHERE owner_subject=NEW.owner_subject AND period_start=NEW.period_start)
    THEN RAISE(ABORT,'DP_ACCOUNT_CHARGE_IMMUTABLE') END;
  SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM trip_weather_aggregate_releases r
    WHERE r.release_key=NEW.release_key AND r.period_start=NEW.period_start
      AND EXISTS(SELECT 1 FROM json_each(r.contributor_subjects_json) WHERE value=NEW.owner_subject))
    THEN RAISE(ABORT,'DP_ACCOUNT_CHARGE_ORPHAN') END;
  SELECT CASE WHEN (SELECT coalesce(sum(budget_units),0) FROM trip_weather_aggregate_account_charges WHERE owner_subject=NEW.owner_subject)+NEW.budget_units>8
    THEN RAISE(ABORT,'DP_ACCOUNT_LIFETIME_BUDGET_EXHAUSTED') END;
END;
CREATE TRIGGER trip_weather_aggregate_commit_charges AFTER INSERT ON trip_weather_aggregate_releases BEGIN
  INSERT INTO trip_weather_aggregate_account_charges(owner_subject,period_start,release_key,budget_units)
    SELECT value,NEW.period_start,NEW.release_key,4 FROM json_each(NEW.contributor_subjects_json);
END;
CREATE TRIGGER trip_weather_aggregate_no_update BEFORE UPDATE ON trip_weather_aggregate_releases
BEGIN SELECT RAISE(ABORT,'DP_LEDGER_IMMUTABLE'); END;
CREATE TRIGGER trip_weather_aggregate_no_delete BEFORE DELETE ON trip_weather_aggregate_releases
BEGIN SELECT RAISE(ABORT,'DP_LEDGER_IMMUTABLE'); END;
CREATE TRIGGER trip_weather_aggregate_charge_no_update BEFORE UPDATE ON trip_weather_aggregate_account_charges
BEGIN SELECT RAISE(ABORT,'DP_ACCOUNT_CHARGE_IMMUTABLE'); END;
CREATE TRIGGER trip_weather_aggregate_charge_no_delete BEFORE DELETE ON trip_weather_aggregate_account_charges
BEGIN SELECT RAISE(ABORT,'DP_ACCOUNT_CHARGE_IMMUTABLE'); END;
