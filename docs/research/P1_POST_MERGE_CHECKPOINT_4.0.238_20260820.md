# P1 post-merge-checkpoint - RavRadar 4.0.238

## Produktionsgrundlag
- PR #2 mergecommit: `e1f835a3`.
- Push-run: `#32354210495`.
- Support: `RavRadar-support-3256`.
- Datasæt: `rr-20260820093508-210`.
- Fuld validering, releasegate, Supabase, Pages og efterfølgende 210/673-browserkontrol bestod.

## 72-timers historik
Alle 210 zoner har 70 rå `samples72h` over 41,489 timer. De 198 geografisk verificerbare zoner har 41,489 timers verificeret fælles DMI-U/V-spænd; en zone har 52 og 197 zoner har 58 verificerede prøver. De 12 kendte parenthuller har nul verificerede prøver. Alle 210 er fortsat under 72 timer, og næste mulige naturlige exit er efter 2026-08-21T16:05:48Z. Ingen backfill er tilladt.

## 168-timers supplement og shadow
Den offentlige kontrollerede supplementhistorik har 45 unikke validtider over 45 timer og dækker 625 Copernicus-dele samt 8 regionalproxydele. Shadow-cachen har cirka 104 timers capture-spænd, har besøgt 673/673 dele og er fortsat `scoreImpact=false` og `publicRuntime=false`. Den registrerer 622 dele med fælles lokalt DMI-par inden for 5 km, 47 med kun fjernere par og 4 uden observeret fælles par. Det fulde 168-timersvindue er ikke nået.

## Komponentcyklusser og mangler
HARMONIE 20. august 00Z, WAM 19. august 18Z og DKSS 19. august 12Z er uændrede fra #3252. Overgangsmålene er uændrede. Feggesund er fortsat den ene wave-missing, og de 12 parent-currenthuller er fortsat eksplicitte. Der godkendes ingen ny tærskel, fallback eller scoreændring.

## Drift og vedligeholdelse
`build-and-prepare` tog 410 sekunder. Medianen for syv fulde builds er 473 sekunder, og ingen gate er reduceret. Den naturlige Copernicus-kørsel `#32355447654` blev korrekt duplicate-suppressed og tæller ikke som ny time.

GitHub runneren varslede Node 20-deprecation for flere officielle actions. Den lokale kandidat opgraderer alle ni berørte workflows til de officielle Node 24-majorer uden ændrede gates, jobrækkefølger, inputs eller betingelser. PR-CI og frisk produktionskontrol mangler.

Ingen rå/private payloads, U/V-værdier, credentials, score-, kilde-, fallback-, geometri- eller land-/vandpunktsændringer indgår i checkpointet.
