-- Privat, uudstedt 006-forslag. Ikke en aktiv migration eller installation.
-- Kræver præcis normal 001/004/005. Ingen rapport, budget, ture eller policy ændres.
-- NULL bevarer ældre 005-rækker som originale hash-only-rækker.
ALTER TABLE trip_weather_aggregate_jobs ADD COLUMN model_binding_json TEXT
  CHECK(model_binding_json IS NULL OR
    (typeof(model_binding_json)='text' AND length(CAST(model_binding_json AS BLOB)) BETWEEN 1 AND 4096
      AND json_valid(model_binding_json) AND json_type(model_binding_json)='object'));
CREATE TRIGGER trip_weather_aggregate_job_binding_required
BEFORE INSERT ON trip_weather_aggregate_jobs
BEGIN
  SELECT CASE WHEN NEW.model_binding_json IS NULL
    THEN RAISE(ABORT,'AGGREGATE_JOB_ORIGINAL_BINDING_REQUIRED') END;
END;
CREATE TRIGGER trip_weather_aggregate_job_binding_immutable
BEFORE UPDATE ON trip_weather_aggregate_jobs
BEGIN
  SELECT CASE WHEN NEW.model_binding_json IS NOT OLD.model_binding_json
    THEN RAISE(ABORT,'AGGREGATE_JOB_ORIGINAL_BINDING_IMMUTABLE') END;
END;
