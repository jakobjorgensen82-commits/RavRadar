# Copernicus forecast-hour retention fix

Date: 2026-08-21

## Observed failure

Production run `32491837334` resolved fresh DMI coverage to `2026-08-21T15:00:00Z` at approximately `14:26Z`. The targeted Copernicus supplement downloaded the exact same forecast hour, but the private cache rejected every time later than wall-clock now. The workflow failed before validation and deploy.

## Root cause

The DMI-gap registry is explicitly allowed to resolve to the best verified DMI hour within three hours of the requested UTC hour. Its tie-break prefers a future hour over a past hour. The Copernicus retention layer only allowed historical and current records, so the two existing contracts disagreed.

## Bounded correction

The private cache now accepts a future hour only when all of these conditions hold:

- the collection is explicitly declared with collection time, target fingerprint and authoritative target points;
- every new record matches that exact declared hour;
- the hour is no more than three hours ahead of wall-clock now;
- the existing same-time, same-cell, same-layer and five-kilometre contracts pass;
- collection record counts remain internally consistent.

Arbitrary future records without complete collection metadata remain rejected. Restored future records without a valid matching collection are pruned. The historical retention limit remains exactly 168 hours.

## Scope

This changes no DMI selection, Copernicus target selection, raw current values, public score, geometry or land/water points. It only makes the private cache capable of retaining the already permitted bounded production forecast hour.
