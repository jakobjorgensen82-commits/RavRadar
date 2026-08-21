# RavRadar 4.0.244

## Copernicus målrettes DMI-huller
- Normal timekørsel vælger kun kystdele uden en gyldig lokal DMI-vektor for den ønskede time.
- En landsdækkende 673-dels Copernicus-kørsel kræver nu et eksplicit manuelt full_coast-valg.
- Hver samling bindes til sin præcise målliste og den centrale punktgeometri.
- DMI er fortsat førstevalg; de otte regionale DMI-proxyer og den offentlige RavScore-adfærd ændres ikke.
- Ingen land- eller vandpunkter er flyttet.

Status ved commit: kandidat, afventer PR-gates og præcis produktionsverifikation.