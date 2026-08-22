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

- PR #62 bestod exact-head-kildegaten og blev merged som `b2951d90`; dokumentationscheckpoint PR #63 bestod exact-head-gate `32569597610` og blev merged som `579ea914`.
- Den seneste fulde produktion `32569650036`, support `RavRadar-support-3380`, Supabase og Pages-deployment `6036178330` er grønne på det endelige mergecommit.
- Live version 4.0.253/datasæt `rr-20260822111522-210` har 210 zoner og 673/673 scorede kystdele.
