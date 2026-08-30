-- DEC-0109: trip-v2 quality lineage is an exact allowlist. Both an honestly
-- marked reconstructed RavScore and the public last-complete emergency view
-- remain useful observations, but neither may enter forecast calibration.
begin;

alter table public.observations
  drop constraint if exists ravradar_observations_trip_v2_check;

alter table public.observations
  add constraint ravradar_observations_trip_v2_check
  check (
    schema_version = 1 or (schema_version = 2 and
      trip_id is not null
      and trip_started_at is not null
      and trip_ended_at > trip_started_at
      and search_minutes between 1 and 1440
      and search_coverage in ('partial', 'normal', 'thorough')
      and actual_zone_id is not null
      and actual_coastal_part_id is not null
      and forecast_zone_id is not null
      and forecast_coastal_part_id is not null
      and coalesce(data_quality_flags, '[]'::jsonb) in (
        '[]'::jsonb,
        '["ravscore-reconstructed-derived-evidence"]'::jsonb,
        '["public-emergency-last-complete"]'::jsonb,
        '["public-emergency-last-complete","ravscore-reconstructed-derived-evidence"]'::jsonb,
        '["ravscore-evidence-trust-unattested"]'::jsonb
      )
      and calibration_eligible = (
        actual_zone_id = forecast_zone_id
        and actual_coastal_part_id = forecast_coastal_part_id
        and coalesce(data_quality_flags, '[]'::jsonb) = '[]'::jsonb
      )
      and found is not null
      and forecast_snapshot_id is not null
      and forecast_issued_at is not null
      and forecast_valid_at is not null
      and forecast_captured_at is not null
      and jsonb_typeof(calibration_features) = 'object'
      and jsonb_typeof(coalesce(calibration_features -> 'reasonCodes', '[]'::jsonb)) = 'array'
      and jsonb_path_query_array(
        coalesce(calibration_features -> 'reasonCodes', '[]'::jsonb),
        '$[*] ? (@ == "public-emergency-last-complete" || @ == "ravscore-reconstructed-derived-evidence" || @ == "ravscore-evidence-trust-unattested")'
      ) = coalesce(data_quality_flags, '[]'::jsonb)
      and ((coalesce(data_quality_flags, '[]'::jsonb) ? 'ravscore-reconstructed-derived-evidence')
        = (coalesce(calibration_features -> 'reasonCodes', '[]'::jsonb) ? 'ravscore-reconstructed-derived-evidence'))
      and ((coalesce(data_quality_flags, '[]'::jsonb) ? 'public-emergency-last-complete')
        = (coalesce(calibration_features -> 'reasonCodes', '[]'::jsonb) ? 'public-emergency-last-complete'))
      and ((coalesce(data_quality_flags, '[]'::jsonb) ? 'ravscore-evidence-trust-unattested')
        = (coalesce(calibration_features -> 'reasonCodes', '[]'::jsonb) ? 'ravscore-evidence-trust-unattested'))
      and jsonb_array_length(jsonb_path_query_array(
        coalesce(calibration_features -> 'reasonCodes', '[]'::jsonb),
        '$[*] ? (@ == "ravscore-reconstructed-derived-evidence")'
      )) <= 1
      and jsonb_array_length(jsonb_path_query_array(
        coalesce(calibration_features -> 'reasonCodes', '[]'::jsonb),
        '$[*] ? (@ == "public-emergency-last-complete")'
      )) <= 1
      and jsonb_array_length(jsonb_path_query_array(
        coalesce(calibration_features -> 'reasonCodes', '[]'::jsonb),
        '$[*] ? (@ == "ravscore-evidence-trust-unattested")'
      )) <= 1
      and forecast_issued_at <= forecast_captured_at
      and forecast_captured_at <= trip_started_at + interval '5 minutes'
    )
  ) not valid;

alter table public.observations
  validate constraint ravradar_observations_trip_v2_check;

comment on constraint ravradar_observations_trip_v2_check on public.observations is
  'Trip v2 DEC-0109-v2: exact quality allowlist and canonical quality-reason order; reconstructed, public-emergency and legacy-unattested snapshots are always excluded from calibration.';

commit;
