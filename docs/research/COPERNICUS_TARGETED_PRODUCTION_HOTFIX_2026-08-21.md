# Målrettet Copernicus i produktionen - 2026-08-21

## Problem

4.0.244 begrænsede normal Copernicus til lokale DMI-huller. Den første præcise produktionskørsel stoppede korrekt ved 630 af 673 kystdele, før release og deploy. Den selvstændige pilot kunne ikke danne målregisteret for den ønskede time, fordi den kun havde ældre deployet DMI-dækning.

Det er et rækkefølgeproblem: de faktiske huller for en produktionstime er først kendt, når den friske DMI-kørsel er afsluttet.

## Løsning

Produktionens rækkefølge er nu:

1. Lås den eksakte produktionstime.
2. Hent og parse frisk DMI som hidtil.
3. Dan et målregister med kun eksakt-times lokale DMI-huller.
4. Kontrollér den private Copernicus-shadow mod netop dette målregister.
5. Hent kun manglende mål og kun den låste time.
6. Flet DMI, målrettet Copernicus og de allerede godkendte regionale DMI-proxyer.
7. Kræv fortsat verificeret strøm for alle 673 kystdele i den fulde validering.

Den selvstændige private pilot gendanner desuden den seneste progressive DMI-cache. Preserve-workflowet sender den eksakte time videre, så pilot og produktion kan arbejde mod samme time.

## Sikkerhed og afgrænsning

- DMI er fortsat førstevalg.
- Copernicus må kun udfylde målregisterets dokumenterede DMI-huller.
- En landsdækkende Copernicus-kørsel kræver fortsat et særskilt manuelt forskningsvalg.
- Den offentlige runtime må ikke indeholde credentials eller rå U/V-værdier.
- Den fulde 673/673-gate, releasegate og deployrækkefølge svækkes ikke.
- Ingen land-/vandpunkter, kystgeometri, regionale proxyer eller RavScore-regler ændres.

## Nødvendigt produktionsbevis

Kandidaten er først godkendt, når exact-head PR-gates er grønne, den præcise merge-commit har kørt den fulde friske produktionskæde, alle 673 kystdele er verificeret, releasegaten er bestået, Pages er deployet, og den korrekte commit kan genfindes i produktionen.
