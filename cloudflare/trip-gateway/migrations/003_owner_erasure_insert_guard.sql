-- Private proposal: install only after separately authorized exact schema checks.
-- Existing rows and tombstones are not rewritten; old INSERT statements are fenced.
CREATE TRIGGER trip_observations_erased_owner_no_insert
BEFORE INSERT ON trip_observations
FOR EACH ROW
WHEN EXISTS (
  SELECT 1 FROM trip_owner_erasure_tombstones
  WHERE owner_subject = NEW.owner_subject
)
BEGIN
  SELECT RAISE(ABORT, 'TRIP_OWNER_ERASED');
END;
