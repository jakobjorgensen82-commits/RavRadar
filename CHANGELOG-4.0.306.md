# RavRadar 4.0.306 – kystkausal RavScore

- Erstatter Candidate G som eneste offentlige scoremodel med `RRS-COASTAL-CAUSAL-CHAIN-1`, kontrakt 1.0.0 og state-schema 3.0.0. Candidate G bevares kun til historisk/offline sammenligning og kan ikke være offentlig shadow- eller fallbackscore.
- Kobler dokumenteret kystnært supply og bølgemobilisering med geometrisk middel, så begge fysiske led er nødvendige. Bølgeretning kan kun reducere nærkyststøtten bounded, og jagtbarhed kan højst påvirke 20 % bagefter.
- Erstatter 20/50/30, lineære +10/-8 og den kategoriske 13-timers nul-gate med glat supply-opbygning/dæmpning. Det genbrugte 48-timers vindue har fortsat rand 0 og 0,03→0,15 m/s-respons; halveringstiderne 6,578813/8,312951 timer er synlige versionspriorer.
- Indarbejder ekspertens præcisering om faldende vand: rav kan flyttes fra den inderste strand og koncentreres bag en revle eller i en rende, så et mindre område er lettere at afsøge. Effekten er begrænset til højst 10 jagtbarhedspoint mellem -3 og -15 cm/3 h og giver nul supply-, mobiliserings- eller strømvirkning.
- Holder gridstrøm, bølgeorbitaler, undertow, feeder-/langskyststrøm og ripstrømme adskilt. Modellen påstår ingen lokal batymetri, revle/rende, surfzoneudtømning, retention/beaching eller empirisk højere fundpræcision.
- Genbruger DMI/Copernicus-proveniens, 210 zoner/673 kystdele, 4/48-timers mobilisering, missing/fail-closed, state/checkpoint/recovery/privacy og atomiske startup-/detalje-/hashkontrakter. Schema-2-state kan migreres uden rå U/V, koordinater, råt vejr eller gammel score; inkompatibel state/fallback afvises.
- Binder detaljer, forklaringer, central profil, konto/ture/observationer, admin, lokal/Edge-assistent og audits til eksakt model-, state- og forklaringsversion. Ældre brugerposter forbliver læsbare.
- Opdaterer DA/DE/EN, Grundbog i ravjagt, Markdown-/webhåndbog, RDKS, workflow, produktionsaudit og releasegate. Interne modelmoduler holdes ude af Pages-artifactet; den lille offentlige modelkontrakt bevares til runtimebinding.
- Dokumenterer 288 koordinatfrie gammel-mod-ny-, ablations-, følsomheds- og glathedscases. De beviser fysisk/teknisk struktur, ikke empirisk bedre fundpræcision.
- Ændrer ingen geometri, land-/vandpunkter, koordinater, private payloads, rå U/V eller credentials. Geodatafilerne får alene den godkendte topversion 4.0.306.
- PR-, exact-head-, produktions-, Pages- og offentlig browserbevis tilføjes, når de respektive gates er bestået.
