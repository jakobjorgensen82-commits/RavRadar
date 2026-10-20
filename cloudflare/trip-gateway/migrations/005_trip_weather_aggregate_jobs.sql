-- PRIVATE INACTIVE scan-state successor. Requires exact001 and reviewed004.
-- No report, privacy charge, public-release policy or lifetime-budget mutation.
CREATE TABLE trip_weather_aggregate_job_control (
  singleton INTEGER NOT NULL PRIMARY KEY CHECK(singleton=1),
  erasure_revision INTEGER NOT NULL CHECK(erasure_revision BETWEEN 0 AND 9007199254740991)
);
INSERT INTO trip_weather_aggregate_job_control VALUES(1,0);
CREATE TRIGGER trip_weather_aggregate_job_control_no_replace BEFORE INSERT ON trip_weather_aggregate_job_control
BEGIN SELECT CASE WHEN EXISTS(SELECT 1 FROM trip_weather_aggregate_job_control)
  THEN RAISE(ABORT,'AGGREGATE_JOB_CONTROL_IMMUTABLE') END; END;
CREATE TRIGGER trip_weather_aggregate_job_control_no_delete BEFORE DELETE ON trip_weather_aggregate_job_control
BEGIN SELECT RAISE(ABORT,'AGGREGATE_JOB_CONTROL_IMMUTABLE'); END;
CREATE TRIGGER trip_weather_aggregate_job_control_update BEFORE UPDATE ON trip_weather_aggregate_job_control
BEGIN SELECT CASE WHEN NEW.singleton<>OLD.singleton OR NEW.erasure_revision<>OLD.erasure_revision+1
  THEN RAISE(ABORT,'AGGREGATE_JOB_CONTROL_IMMUTABLE') END; END;

CREATE TABLE trip_weather_aggregate_jobs (
  job_key TEXT NOT NULL PRIMARY KEY CHECK(length(job_key)=64 AND job_key NOT GLOB '*[^a-f0-9]*'),
  period_start TEXT NOT NULL UNIQUE, period_end TEXT NOT NULL CHECK(period_end>period_start),
  source_cutoff TEXT NOT NULL,
  execution_id TEXT NOT NULL CHECK(execution_id='rr-private-input-scan-v1-UNISSUED'),
  binding_sha256 TEXT NOT NULL CHECK(length(binding_sha256)=64),
  policy_sha256 TEXT NOT NULL CHECK(length(policy_sha256)=64),
  accounting_sha256 TEXT NOT NULL CHECK(length(accounting_sha256)=64),
  preference_sha256 TEXT NOT NULL CHECK(length(preference_sha256)=64),
  initial_erasure_sha256 TEXT NOT NULL CHECK(length(initial_erasure_sha256)=64),
  erasure_revision INTEGER NOT NULL CHECK(erasure_revision>=0),
  input_accounts INTEGER NOT NULL CHECK(input_accounts BETWEEN 0 AND 1000),
  phase TEXT NOT NULL DEFAULT 'SCANNING' CHECK(phase IN ('SCANNING','READY_INPUT','FAILED','INVALIDATED')),
  revision INTEGER NOT NULL DEFAULT 0 CHECK(revision BETWEEN 0 AND 9007199254740991),
  next_shard INTEGER NOT NULL DEFAULT 0 CHECK(next_shard BETWEEN 0 AND 10),
  after_id TEXT NOT NULL DEFAULT '',
  rows_read INTEGER NOT NULL DEFAULT 0 CHECK(rows_read BETWEEN 0 AND 4000),
  payload_bytes INTEGER NOT NULL DEFAULT 0 CHECK(payload_bytes BETWEEN 0 AND 20971520),
  winner_count INTEGER NOT NULL DEFAULT 0 CHECK(winner_count BETWEEN 0 AND 1000),
  preference_count INTEGER NOT NULL DEFAULT 0 CHECK(preference_count BETWEEN 0 AND 4000),
  erased_count INTEGER NOT NULL DEFAULT 0 CHECK(erased_count BETWEEN 0 AND 4000),
  synthetic_count INTEGER NOT NULL DEFAULT 0 CHECK(synthetic_count BETWEEN 0 AND 4000),
  ineligible_count INTEGER NOT NULL DEFAULT 0 CHECK(ineligible_count BETWEEN 0 AND 4000),
  repeat_count INTEGER NOT NULL DEFAULT 0 CHECK(repeat_count BETWEEN 0 AND 4000),
  scan_steps INTEGER NOT NULL DEFAULT 0 CHECK(scan_steps BETWEEN 0 AND 4010),
  lease_claims INTEGER NOT NULL DEFAULT 0 CHECK(lease_claims BETWEEN 0 AND 8022),
  step_claims INTEGER NOT NULL DEFAULT 0 CHECK(step_claims BETWEEN 0 AND 2),
  reserved_chunk_queries INTEGER NOT NULL DEFAULT 0 CHECK(reserved_chunk_queries=45*lease_claims),
  lease_token TEXT, lease_until_ms INTEGER,
  last_chunk_token TEXT, last_source_shard INTEGER, last_consumed_id TEXT,
  terminal_code TEXT CHECK(terminal_code IS NULL OR terminal_code IN
    ('CAPACITY','INTEGRITY','CONSENT_CHANGED','OWNER_ERASURE_CHANGED','RECOVERY_EXHAUSTED')),
  CHECK((lease_token IS NULL)=(lease_until_ms IS NULL)),
  CHECK(phase='SCANNING' OR lease_token IS NULL),
  CHECK((phase IN ('FAILED','INVALIDATED'))=(terminal_code IS NOT NULL)),
  CHECK(phase<>'SCANNING' OR next_shard<10),
  CHECK(phase<>'READY_INPUT' OR (next_shard=10 AND after_id='')),
  CHECK(scan_steps>=rows_read AND scan_steps>=next_shard AND scan_steps<=rows_read+next_shard)
);
CREATE TABLE trip_weather_aggregate_job_seen (
  job_key TEXT NOT NULL REFERENCES trip_weather_aggregate_jobs(job_key),
  client_observation_id TEXT NOT NULL,
  trip_id TEXT,
  owner_subject TEXT NOT NULL CHECK(length(owner_subject)=50 AND owner_subject GLOB 'usr_v1_*'),
  source_shard INTEGER NOT NULL CHECK(source_shard BETWEEN 0 AND 9),
  payload_bytes INTEGER NOT NULL CHECK(payload_bytes BETWEEN 0 AND 20971520),
  payload_sha256 TEXT CHECK(payload_sha256 IS NULL OR
    (length(payload_sha256)=64 AND payload_sha256 NOT GLOB '*[^a-f0-9]*')),
  PRIMARY KEY(job_key,client_observation_id), UNIQUE(job_key,trip_id),
  UNIQUE(job_key,client_observation_id,owner_subject)
);
CREATE INDEX trip_weather_aggregate_job_seen_owner ON trip_weather_aggregate_job_seen(owner_subject);
CREATE TABLE trip_weather_aggregate_job_winners (
  job_key TEXT NOT NULL REFERENCES trip_weather_aggregate_jobs(job_key),
  owner_subject TEXT NOT NULL CHECK(length(owner_subject)=50 AND owner_subject GLOB 'usr_v1_*'),
  client_observation_id TEXT NOT NULL,
  rank TEXT NOT NULL, found INTEGER NOT NULL CHECK(found IN (0,1)),
  wind_speed REAL NOT NULL, wave_height REAL NOT NULL,
  current_speed REAL NOT NULL, water_trend REAL NOT NULL,
  calibration_eligible INTEGER NOT NULL CHECK(calibration_eligible IN (0,1)),
  PRIMARY KEY(job_key,owner_subject),
  FOREIGN KEY(job_key,client_observation_id,owner_subject)
    REFERENCES trip_weather_aggregate_job_seen(job_key,client_observation_id,owner_subject),
  CHECK(abs(wind_speed)<=1.7976931348623157e308 AND abs(wave_height)<=1.7976931348623157e308
    AND abs(current_speed)<=1.7976931348623157e308 AND abs(water_trend)<=1.7976931348623157e308)
);
CREATE INDEX trip_weather_aggregate_job_winners_owner ON trip_weather_aggregate_job_winners(owner_subject);
CREATE TRIGGER trip_weather_aggregate_job_no_replace BEFORE INSERT ON trip_weather_aggregate_jobs
BEGIN SELECT CASE WHEN EXISTS(SELECT 1 FROM trip_weather_aggregate_jobs
  WHERE job_key=NEW.job_key OR period_start=NEW.period_start)
  THEN RAISE(ABORT,'AGGREGATE_JOB_NO_RESET') END; END;
CREATE TRIGGER trip_weather_aggregate_job_no_delete BEFORE DELETE ON trip_weather_aggregate_jobs
BEGIN SELECT RAISE(ABORT,'AGGREGATE_JOB_NO_RESET'); END;
CREATE TRIGGER trip_weather_aggregate_job_transition BEFORE UPDATE ON trip_weather_aggregate_jobs
BEGIN
  SELECT CASE WHEN OLD.phase IN ('FAILED','INVALIDATED') OR NEW.revision<>OLD.revision+1
    OR NEW.job_key<>OLD.job_key OR NEW.period_start<>OLD.period_start OR NEW.period_end<>OLD.period_end
    OR NEW.source_cutoff<>OLD.source_cutoff OR NEW.execution_id<>OLD.execution_id OR NEW.binding_sha256<>OLD.binding_sha256
    OR NEW.policy_sha256<>OLD.policy_sha256 OR NEW.accounting_sha256<>OLD.accounting_sha256
    OR NEW.preference_sha256<>OLD.preference_sha256 OR NEW.initial_erasure_sha256<>OLD.initial_erasure_sha256
    OR NEW.erasure_revision<>OLD.erasure_revision OR NEW.input_accounts<>OLD.input_accounts
    OR NEW.rows_read<OLD.rows_read OR NEW.payload_bytes<OLD.payload_bytes OR NEW.winner_count<OLD.winner_count
    OR NEW.preference_count<OLD.preference_count OR NEW.erased_count<OLD.erased_count
    OR NEW.synthetic_count<OLD.synthetic_count OR NEW.ineligible_count<OLD.ineligible_count OR NEW.repeat_count<OLD.repeat_count
    OR NEW.scan_steps NOT IN (OLD.scan_steps,OLD.scan_steps+1)
    OR NEW.lease_claims NOT IN (OLD.lease_claims,OLD.lease_claims+1)
    THEN RAISE(ABORT,'AGGREGATE_JOB_TRANSITION_INVALID') END;
  SELECT CASE WHEN NEW.phase IN ('SCANNING','READY_INPUT') AND (
    NEW.rows_read<>(SELECT count(*) FROM trip_weather_aggregate_job_seen WHERE job_key=NEW.job_key)
    OR NEW.payload_bytes<>(SELECT coalesce(sum(payload_bytes),0) FROM trip_weather_aggregate_job_seen WHERE job_key=NEW.job_key)
    OR NEW.winner_count<>(SELECT count(*) FROM trip_weather_aggregate_job_winners WHERE job_key=NEW.job_key))
    THEN RAISE(ABORT,'AGGREGATE_JOB_STATE_INCOMPLETE') END;
  SELECT CASE WHEN NEW.scan_steps=OLD.scan_steps AND
    (NEW.rows_read<>OLD.rows_read OR NEW.next_shard<>OLD.next_shard OR NEW.after_id<>OLD.after_id)
    THEN RAISE(ABORT,'AGGREGATE_JOB_CURSOR_WITHOUT_PROGRESS') END;
  SELECT CASE WHEN NEW.scan_steps=OLD.scan_steps+1 AND
    (NEW.rows_read NOT IN (OLD.rows_read,OLD.rows_read+1)
      OR NEW.next_shard NOT IN (OLD.next_shard,OLD.next_shard+1)
      OR (NEW.rows_read=OLD.rows_read AND NEW.next_shard=OLD.next_shard)
      OR (NEW.next_shard=OLD.next_shard AND NEW.after_id<=OLD.after_id)
      OR (NEW.next_shard=OLD.next_shard+1 AND NEW.after_id<>'')
      OR NEW.step_claims<>0 OR NEW.lease_token IS NOT NULL)
    THEN RAISE(ABORT,'AGGREGATE_JOB_CONSUMED_CURSOR_INVALID') END;
END;

-- Existing normal delete-owner inserts control0 tombstone BEFORE purging shards.
-- Every new erasure invalidates active scans, not just currently chosen owners.
CREATE TRIGGER trip_weather_aggregate_job_erasure_insert AFTER INSERT ON trip_owner_erasure_tombstones
BEGIN
  UPDATE trip_weather_aggregate_job_control SET erasure_revision=erasure_revision+1 WHERE singleton=1;
  UPDATE trip_weather_aggregate_jobs SET phase='INVALIDATED',terminal_code='OWNER_ERASURE_CHANGED',
    revision=revision+1,lease_token=NULL,lease_until_ms=NULL WHERE phase IN ('SCANNING','READY_INPUT');
  DELETE FROM trip_weather_aggregate_job_winners WHERE owner_subject=NEW.owner_subject;
  DELETE FROM trip_weather_aggregate_job_seen WHERE owner_subject=NEW.owner_subject;
END;
CREATE TRIGGER trip_weather_aggregate_job_erasure_update AFTER UPDATE ON trip_owner_erasure_tombstones
BEGIN
  UPDATE trip_weather_aggregate_job_control SET erasure_revision=erasure_revision+1 WHERE singleton=1;
  UPDATE trip_weather_aggregate_jobs SET phase='INVALIDATED',terminal_code='OWNER_ERASURE_CHANGED',
    revision=revision+1,lease_token=NULL,lease_until_ms=NULL WHERE phase IN ('SCANNING','READY_INPUT');
  DELETE FROM trip_weather_aggregate_job_winners WHERE owner_subject IN (OLD.owner_subject,NEW.owner_subject);
  DELETE FROM trip_weather_aggregate_job_seen WHERE owner_subject IN (OLD.owner_subject,NEW.owner_subject);
END;
CREATE TRIGGER trip_weather_aggregate_job_erasure_delete AFTER DELETE ON trip_owner_erasure_tombstones
BEGIN
  UPDATE trip_weather_aggregate_job_control SET erasure_revision=erasure_revision+1 WHERE singleton=1;
  UPDATE trip_weather_aggregate_jobs SET phase='INVALIDATED',terminal_code='OWNER_ERASURE_CHANGED',
    revision=revision+1,lease_token=NULL,lease_until_ms=NULL WHERE phase IN ('SCANNING','READY_INPUT');
END;
