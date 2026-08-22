# RavRadar 4.0.253

## Score-neutral Candidate G-produktkontrakt

- Eksakte komponenter, vægtede bidrag og fysisk gate rekonstruerer alle 1.460 private kandidatscorer uden at ændre scoreværdierne.
- Den foretrukne variant uden direkte vind dokumenterer waders-konflikten: 219 evalueringer har jagtbarhed under 35, 7 af dem har mindst 55 point, og det kanoniske højenergiforløb er 0/79.
- Pilen fastholdes som aktuel lokal strøm. Historik beskrives separat, når forløbet før nu påvirker kandidatens transportpotentiale.
- Den nationale shadowrapport klassificerer coverage samlet og afviser parentzonens morfologi som lokal kystdelsevidens.

## Uændret

- Candidate G er fortsat privat og diagnostic-only; offentlig RavScore er fortsat 25/40/35.
- Offentlig UI, regler, DMI/fallback, central admin og produktionens scorelogik er uændret.
- Ingen geometri, land-/vandpunkter, private artifacts eller beskyttede data er ændret.
- Offentlig waders-/forklaringskobling kræver ejerbeslutning og efterfølgende fuld relevant validering.

## Produktionsverifikation

- PR #62 bestod exact-head-kildegaten og leverede kode-/analysebaselinen som `b2951d90`; dokumentationscheckpointene PR #63 og #64 bestod også deres exact-head-gates.
- Fuld produktionsverifikation `32570223437`, support `RavRadar-support-3382`, Supabase og Pages-deployment `6036286717` er grønne på PR #64-merget `01904b92`.
- Det verificerede live-snapshot `rr-20260822112859-210` viste version 4.0.253, 210 zoner og 673/673 scorede kystdele. Aktuelt datasæt er bevidst rullende og kontrolleres live.
