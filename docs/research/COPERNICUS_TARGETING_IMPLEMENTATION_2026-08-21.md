# Copernicus målrettes DMI-huller

## Formål
Den normale Copernicus-kørsel skal ikke hente strømdata til hele Danmark, når
lokal DMI allerede kan levere den relevante time. DMI er fortsat førstevalg.

## Ny normal adfærd
- Den senest deployede DMI-cache hentes før måludvælgelsen.
- Kun kystdele uden en gyldig lokal DMI-vektor for den ønskede UTC-time vælges.
- Alle valgte koordinater kopieres uændret fra den centralt godkendte kystliste.
- Hvis ingen DMI-dækning kan verificeres, nægter systemet at starte en skjult
  landsdækkende Copernicus-kørsel.
- Hver samling gemmer mållistens id'er og fingeraftryk, så data fra forkerte
  punkter eller en tidligere geometri afvises.

## Manuel forskning
En landsdækkende 673-dels kørsel kan fortsat startes manuelt med workflowets
`full_coast`-valg. Den er ikke en del af den normale timekørsel.

## Hvad ændres ikke
- Ingen land- eller vandpunkter flyttes.
- DMI vinder altid, når den lokale DMI-vektor er gyldig.
- Copernicus bruges kun på manglende lokale DMI-tidspunkter.
- De otte godkendte regionale DMI-proxyer og deres grænser ændres ikke.
- RavScore-regler, vægte, pileforklaring og offentlig datakontrakt ændres ikke.
