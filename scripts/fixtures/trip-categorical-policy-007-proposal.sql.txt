-- PRIVATE007 DRAFT ONLY. Not an installation or activation grant.
-- Preserve004/005/006, the old policy anchor, original reports and all account
-- charges. The one INSERT guard is extended under attested OFF/lease only;
-- exact additive schema readback is required before any later activation.
CREATE TABLE trip_weather_aggregate_categorical_policy_anchor (
  schema_version INTEGER NOT NULL CHECK(schema_version=1),
  ledger_id TEXT NOT NULL PRIMARY KEY CHECK(ledger_id='rr-trip-descriptive-GLOBAL'),
  report_schema_version INTEGER NOT NULL CHECK(report_schema_version=3),
  cell_count INTEGER NOT NULL CHECK(cell_count=160),
  policy_sha256 TEXT NOT NULL CHECK(policy_sha256='58ea1d3d218ca754aa511bc55d25bc7d5dbc9dcbbe580ffb7ecd656df56ee1c6'),
  mechanism_sha256 TEXT NOT NULL CHECK(mechanism_sha256='68b677e15effda12cf4b48a29b888f14218a3537b0b6342e927be1aaf0f56af6'),
  legacy_mechanism_sha256 TEXT NOT NULL CHECK(legacy_mechanism_sha256='ffd3389017064fce904ec2f8f850b4e60248db0e29185f9a0ed83021be73117b'),
  accounting_sha256 TEXT NOT NULL CHECK(accounting_sha256='1e79fc2cd2ba9c06c07537458b4628d3a6ae878b750a69885a256108206feb56'),
  cost_units INTEGER NOT NULL CHECK(cost_units=4),
  maximum_units INTEGER NOT NULL CHECK(maximum_units=8),
  status TEXT NOT NULL CHECK(status='PRIVATE_UNISSUED_REVIEW_ONLY'),
  public_release_issued INTEGER NOT NULL CHECK(public_release_issued=0)
);
INSERT INTO trip_weather_aggregate_categorical_policy_anchor VALUES (
  1,
  'rr-trip-descriptive-GLOBAL',
  3,
  160,
  '58ea1d3d218ca754aa511bc55d25bc7d5dbc9dcbbe580ffb7ecd656df56ee1c6',
  '68b677e15effda12cf4b48a29b888f14218a3537b0b6342e927be1aaf0f56af6',
  'ffd3389017064fce904ec2f8f850b4e60248db0e29185f9a0ed83021be73117b',
  '1e79fc2cd2ba9c06c07537458b4628d3a6ae878b750a69885a256108206feb56',
  4,
  8,
  'PRIVATE_UNISSUED_REVIEW_ONLY',
  0
);
CREATE TRIGGER trip_weather_aggregate_categorical_policy_no_replace BEFORE INSERT ON trip_weather_aggregate_categorical_policy_anchor
BEGIN SELECT CASE WHEN EXISTS(SELECT 1 FROM trip_weather_aggregate_categorical_policy_anchor) THEN RAISE(ABORT,'DP_CATEGORICAL_POLICY_IMMUTABLE') END; END;
CREATE TRIGGER trip_weather_aggregate_categorical_policy_no_update BEFORE UPDATE ON trip_weather_aggregate_categorical_policy_anchor
BEGIN SELECT RAISE(ABORT,'DP_CATEGORICAL_POLICY_IMMUTABLE'); END;
CREATE TRIGGER trip_weather_aggregate_categorical_policy_no_delete BEFORE DELETE ON trip_weather_aggregate_categorical_policy_anchor
BEGIN SELECT RAISE(ABORT,'DP_CATEGORICAL_POLICY_IMMUTABLE'); END;
DROP TRIGGER trip_weather_aggregate_insert_guard;
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
    AND NOT EXISTS(SELECT 1 FROM trip_weather_aggregate_categorical_policy_anchor c
      JOIN trip_weather_aggregate_policy_anchor p ON p.ledger_id=c.ledger_id
      WHERE c.ledger_id=NEW.ledger_id AND c.policy_sha256=NEW.policy_sha256
        AND c.accounting_sha256=NEW.accounting_sha256 AND c.cost_units=NEW.budget_units
        AND c.maximum_units=8 AND c.status='PRIVATE_UNISSUED_REVIEW_ONLY' AND c.public_release_issued=0
        AND p.accounting_sha256=c.accounting_sha256 AND p.accounting_scope='PER_ACCOUNT_LIFETIME'
        AND p.cost_units=c.cost_units AND p.maximum_units=c.maximum_units
        AND p.mechanism_sha256=c.legacy_mechanism_sha256
        AND p.status='PRIVATE_UNISSUED_REVIEW_ONLY' AND p.public_release_issued=0
        AND json_extract(NEW.report_json,'$.schemaVersion')=c.report_schema_version
        AND json_extract(NEW.report_json,'$.kind')='PRIVATE_UNISSUED_DP_REVIEW_REPORT'
        AND json_extract(NEW.report_json,'$.policyId')='rr-self-reported-mode-result-geometric-v3-UNISSUED'
        AND json_extract(NEW.report_json,'$.policySha256')=c.policy_sha256
        AND json_type(NEW.report_json,'$.publicReleaseIssued')='false'
        AND json_extract(NEW.report_json,'$.effortStatus')='ALL_VALIDATED_REPORTED_EFFORT_UNADJUSTED'
        AND json_type(NEW.report_json,'$.cells')='array' AND json_array_length(NEW.report_json,'$.cells')=c.cell_count)
    THEN RAISE(ABORT,'DP_POLICY_BASIS_MISMATCH') END;
  SELECT CASE WHEN EXISTS(SELECT 1 FROM json_each(NEW.contributor_subjects_json) selected WHERE
    (SELECT coalesce(sum(budget_units),0) FROM trip_weather_aggregate_account_charges WHERE owner_subject=selected.value)+4>8)
    THEN RAISE(ABORT,'DP_ACCOUNT_LIFETIME_BUDGET_EXHAUSTED') END;
END;
