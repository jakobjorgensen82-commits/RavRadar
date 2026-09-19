# RavRadar 4.0.433 – lever den aktuelle kode før lokal vind genhentes

Dato: 2026-09-19

## Hvad 4.0.432-kørslen beviste

- 4.0.432 bestod exact-head, PR #377 og blev merged som `0d2fd78a`.
- Providerfri `35449470349` bestod central ACTIVE-readback, migration,
  forgænger-restore, importkontrol og privat runtimegenbygning.
- Den bevarede præcis 210 zoner og 673 kystdele uden providerkald eller
  ændring af vejrdata.

## Hvorfor den stoppede

Den gemte runtime har vind på zoneniveau, men ingen lokal vind på de 673
kystdele. Derfor mangler alle 420 aktuelle scorevisninger. Auditen rapporterede
seks følgefejl om cohort, manifest og profil og stoppede før artifact/deploy.
En providerfri kørsel kan ikke skabe de manglende lokale vindmålinger.

## Rettelsen

- Kun `integrated-historical-maintenance` med metadata-only-migration må
  fortsætte på præcis de seks kendte fejlkoder og tællere.
- Fortsættelsen kræver fortsat 210/673, 1.346 rekonstruerede aktuelle modes,
  præcis 420 utilgængelige modes, nul replayfejl, fuld public privacy og en
  fejlfri generationsbundet privat fortsættelse.
- Enhver ukendt diagnostik eller dataintegritets-/privacyafvigelse stopper.
- Code-only-jobbet får 60 minutter i stedet for 30, så den observerede cirka
  20 minutters genbygning efterlader reel tid til artifact og Pages-deploy.
- Candidate G er pensioneret som offentligt produkt- og rollbackvalg. Den
  offentlige produktionsdispatcher tilbyder kun `none`; inert historisk
  kompatibilitetskode fjernes først i en særskilt sikker oprydning.

RavRadar har fortsat kun én offentlig scoremodel: den integrerede RavScore.
Efter kodeleveringen skal en almindelig vejrkørsel hente den manglende lokale
vind og bevise score, komplethed og normal selvkørende vedligeholdelse.
