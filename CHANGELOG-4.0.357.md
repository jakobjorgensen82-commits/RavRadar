# RavRadar 4.0.357 – kanonisk retningsafrunding efter samlet cutoverkontrol

## Resultatet fra cutoveren

- PR #293 bestod exact-head-sourcegate `34761823518` og blev merged som main `b75672f7688ed6ef35cdb90822f47e95a995783e` med samme filtræ som den validerede head.
- Handoff `34763228997` gendannede de fire cacher og forseglede nyt handoff uden provider, oneoff eller ny 210/673-audit.
- Cutover `34763820124` startede korrekt og gennemførte alle fem uafhængige kontroller. Runtime/model, referencezoner, releasegate og vejrdata bestod. Kun den fulde projektkontrol fejlede.

## Den ene fejl

Den kanoniske hav→land-retning blev først afrundet korrekt til én decimal og derefter normaliseret endnu en gang. JavaScripts binære decimaltal kunne derfor gøre `126.6` til `126.60000000000002`. Den strenge roundtrip-test afviste forskellen, selv om retningen var den samme.

## Rettelsen

- Retningen normaliseres før afrunding, afrundes én gang og returneres derefter direkte.
- Det eneste særtilfælde er en afrundet `360`, som fortsat bliver kanonisk `0`.
- En syntetisk regression låser både stabil én-decimal-repræsentation og den eksisterende 360→0-kontrakt.
- Vejr, scorematematik, modelstate, geometri, land-/vandpunkter, sourceorder, database og privatliv ændres ikke.

## Næste produktionsskridt

Én exact-head-sourcegate køres på 4.0.357. Efter byteidentisk merge genskabes kun det SHA-bundne handoff fra de samme cacher, og cutoveren køres igen. Der startes ingen oneoff eller ny provideropfyldning.
