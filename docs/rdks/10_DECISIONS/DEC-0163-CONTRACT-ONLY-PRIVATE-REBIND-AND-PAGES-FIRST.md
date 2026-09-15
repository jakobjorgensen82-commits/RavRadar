# DEC-0163 – Uændret privat model genbruges, og sikker kode-only går online før central status

**Status:** Aktiv; implementeret lokalt i 4.0.381, produktionsbevis afventer
**Dato:** 2026-09-15

## Evidens

4.0.380 bestod exact-head sourcegate `35015984953`, blev merged gennem PR
#322 som main `de8ae966`, og providerfri code-only `35016734197` genbrugte
sourcebeviset, læste central tilstand og gennemførte databaseleddet. Den fandt
og gendannede derefter den beskyttede pointers faktiske private current.

Kørslen stoppede på `Integrated model binding does not require migration`.
Den faktiske private current og 4.0.380 havde samme RavScore-modelbinding, men
nye runtime-/sikkerhedsscripts gav et nyt kontraktfingeraftryk. Migratoren
havde kun en vej for ændret modelbundle og afviste derfor det korrekte resultat
"modellen er allerede den samme". Der var ingen providerkald, Pages-deploy
eller nye private writes efter stoppet.

Helikoptergennemgangen viste også, at historisk central vedligeholdelse lå før
Pages i kode-only-deployet. En ren plan- eller central statusfejl kunne derfor
forhindre en allerede bygget, privacykontrolleret og ellers verificerbar
hjemmeside i at blive forsøgt lagt online.

## Beslutning

- En aktuel privat runtime kan overføres på to eksakte måder: enten ændres kun
  kendte modelbundlehashfelter, eller også er modelbindingen uændret og alle ni
  private runtimefiler kopieres byte-for-byte.
- Ved uændret model skal den gamle runtime stadig bestå både forgængerens og
  den aktuelle kodes validering. Målinger, scorer, fortsættelsestilstande og
  Candidate G-state må ikke ændres.
- Same-reference-publicering accepterer kontrakt-only-rebinding alene med
  eksakt current-descriptor, ancestorbevis, to verificerede manifests, samme
  filinventar og byteidentiske private filer. Kun kontraktfingeraftrykket og
  producentens source-head må flyttes frem.
- Kode-only skal fortsat stoppe før Pages ved forkert artifact, privatlivsfejl,
  model-/kildeuoverensstemmelse eller hvis committen ikke længere er nyeste
  `main`.
- Når Pages-artifactet har bestået disse krav, deployes og verificeres Pages
  før den centrale historiske status opdateres. En efterfølgende central
  statusfejl må gøre slutrapporten rød, men må ikke rulle et allerede sikkert
  og verificeret Pages-deploy tilbage eller forhindre det i at blive forsøgt.

## Drift

4.0.381 kræver én exact-head sourcegate, merge og en providerfri kode-only-
kørsel. Ingen normal weather eller oneoff før den offentlige kode/model er
verificeret. Derefter bruges en almindelig tidsbegrænset vejrkørsel til at
bevise numeriske scorer, DMI-rotation og cachevedligeholdelse.
