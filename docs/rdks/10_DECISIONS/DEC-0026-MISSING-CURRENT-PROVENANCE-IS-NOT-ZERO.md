# DEC-0026 – Manglende strømproveniens er ikke nulstrøm

**Status:** Gældende  
**Version:** 4.0.78  
**Dato:** 2026-08-02

## Beslutning

Manglende, tomme eller ikke-verificerbare `current-u`/`current-v`-værdier må aldrig omsættes til tallet nul. Nul betyder fysisk ingen øst-/vest- eller nord-/sydbevægelse og må kun gemmes, når DMI faktisk har leveret nul.

En prognosetime får kun status `verified`, når begge komponenter kan knyttes til samme marine gitterpunkt og til et eksakt eller kontrolleret interpoleret tidspunkt. Ellers fjernes u/v-felterne, mens den eksisterende viste strømværdi bevares, og timen mærkes `unverified` med årsag.

## Begrundelse

JavaScript konverterer `null` og tom tekst til `0` med `Number(...)`. Det skabte falske 0/0-komponenter og fik den videnskabelige audit til at sammenligne en virkelig vist strøm med en opdigtet nulstrøm. Det er både fagligt forkert og farligt for sporbarheden.

## Bindende testkrav

- Null, undefined, tom tekst og boolean må ikke accepteres som numeriske komponenter.
- Ikke-verificerede timer må ikke indeholde u/v-komponenter.
- Verificerede timer skal indeholde status, DMI-provider, gitterpunkt, metode og kildetidspunkter.
- Audit må kun efterprøve retning og hastighed på verificerede timer.
- Releasen stopper ved reel uoverensstemmelse, men rapporterer manglende proveniens særskilt.
