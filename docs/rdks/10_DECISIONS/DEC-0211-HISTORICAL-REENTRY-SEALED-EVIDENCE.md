# DEC-0211 – Historisk genoptagelse følger sit forseglede bevis

**Status:** Aktiv; implementeret lokalt i 4.0.431, produktionsbevis mangler  
**Dato:** 2026-09-19  
**Grundlag:** Providerfri reentry `35447099504` af PENDING version 30

## Problem

Det allerede offentlige 4.0.429-target blev korrekt fundet, verificeret og
backfillet til holdbar privat evidens af 4.0.430. Central completion blev
alligevel afvist, fordi den gamle readiness ikke indeholdt en migration, som
først blev tilføjet i 4.0.430. Derefter ville den gamle diagnostiske audit
også være blevet afvist, selv om den oprindelige immutable plan udtrykkeligt
havde sat kalibrering til falsk og tilladt deploy med de kendte fund.

## Beslutning

En allerede PENDING overgang vurderes mod sin egen eksakte, centrale
forsegling. Senere kode må ikke kræve, at den historiske fil efterfølgende
indeholder nye migrationer eller bliver omskrevet til en grøn audit.

Det er ikke en generel lempelse:

- Readiness skal stadig matche central SHA-256, source head, requested model,
  implementation closure, central profil og assistantbinding. Migrationer
  skal være en unik bounded liste af gyldige identiteter.
- Nye overgange valideres fortsat mod hele den aktuelle migrationsliste og de
  aktuelle policyhashes, før de overhovedet kan skabe PENDING.
- Diagnostiske auditfund accepteres ved historisk integrated maintenance kun,
  når den forseglede plan har `calibrationEligibleAfterVerifiedActivation`
  sat til falsk. Fejlkoder og positive tællere skal være entydige, bounded og
  del af den eksakte forseglede audithash.
- 210 zoner, 673 dele, modelbinding, offentlig manifestidentitet, privacy,
  measured-warmup/rollback, historik, stabil offentlig observation og central
  compare-and-swap forbliver hårde krav.

## Drift

4.0.431 skal først afslutte den eksisterende PENDING providerfrit. Den må ikke
starte en ny vejrkørsel for at genskabe beviset. Derefter kan code-only deploy
fortsætte, og de samlede vejrændringer bevises i almindelig drift.

