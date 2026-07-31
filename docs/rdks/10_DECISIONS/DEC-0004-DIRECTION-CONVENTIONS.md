# DEC-0004 – Retningskonventioner og lokal geometri

- **Status:** AKTIV OG IMPLEMENTERET
- **Prioritet:** KRITISK

Vind angives meteorologisk som retningen, vinden kommer fra. Strøm angives som retningen, vandet bevæger sig imod. Lokal pålandsretning defineres fra hav mod land. Matematik, UI-pile, rådata og RavScore skal testes ende til ende for at undgå 180°-fejl. En korrekt global konvention fritager ikke zonernes `onshoreDirectionDeg` og punkter for lokal audit.
