# DEC-0076 – Offentlig Om RavRadar-side og frivillig støtte

**Status:** AKTIV – PRODUKTIONSVERIFICERET FRA 4.0.279; BILLEDRETTELSE I 4.0.280

**Dato:** 2026-08-25

**Berører:** offentlig navigation, ny statisk informationsside, responsive billedaktiver, kontakt og frivillig MobilePay-støtte

**Ændrer ikke:** Candidate G, RavScore, vejr- eller havdata, zoner, geometri, land-/vandpunkter, admin-data, brugerdata eller produktionsstate

## Formål

RavRadar skal have en tydelig offentlig afsenderside, så brugeren kan forstå, hvem der står bag projektet, hvorfor det findes, hvordan RavScore bør tolkes, og hvordan Jakob Jørgensen kan kontaktes. Siden skal samtidig gøre det klart, at RavRadar er gratis, frivilligt udviklet og ikke en garanti for rav.

## Beslutning

1. Forsidens topmenu får linket **Om RavRadar** ved siden af konto, **Start ravtur** og **Spørg RavRadar**.
2. Siden præsenterer Jakob Jørgensen, projektets idé, den frivillige indsats og ønsket om at samle relevante data og forklaringer, så brugeren både kan vælge bedre og lære om ravjagt.
3. RavScore forklares som en vurdering af de aktuelle forhold for den enkelte kyststrækning, ikke som et mål for den grundlæggende mængde rav i landsdelen. Eksemplet Limfjorden 95 mod Sæby 75 bruges i almindeligt sprog.
4. Siden forklarer, at komplekse vejr-, hav- og kystforhold kræver generaliseringer og kompromiser. Noget, der ser forkert ud, kan være en fejl eller en bevidst forenkling af hensyn til helheden.
5. Kontakt foregår gennem et almindeligt `mailto`-link til ejeren. Der indsamles ingen ekstra brugerdata på siden.
6. Frivillig støtte vises samlet med projektets omkostninger, MobilePay Box `4214MX`, synlig betalingsadresse og en lokal QR-kode, der linker til den samme MobilePay-boks. Støtte giver ingen særlige funktioner eller scorer.
7. Ejerens to billeder leveres som komprimerede, responsive billedvarianter. Orienteringen skal være fysisk indarbejdet i de leverede pixels og må ikke afhænge af browserens EXIF-fortolkning. Siden skal fungere uden vandret rulning på mobil og bruge et luftigt tospaltet layout på større skærme.
8. Siden og dens lokale aktiver indgår i service-workerens appskal, så den følger samme versionsstyrede cache som resten af den offentlige app.
9. Ejeren giver stående godkendelse til, at de to beskyttede geodatafilers topversionsfelt automatisk følger enhver fremtidig reel RavRadar-release. Godkendelsen gælder kun, når en præcis diffkontrol beviser, at `data/kystdata.json` og `data/zones.geojson` ikke ændrer andet end versionsfeltet. Enhver øvrig geodataændring er fortsat uden for denne godkendelse og skal stoppe arbejdsforløbet.
10. **Udvidelse i 4.0.320:** Den eksisterende Om-side skal indeholde en kort trin-for-trin-vejledning til at lægge RavRadar på hjemmeskærmen fra iPhone/Safari og Android/Chrome på DA/DE/EN. Manifestet skal have gyldige 192/512-pixels ikoner, og iPhone skal have et 180-pixels Apple-touch-ikon. Forsiden og Om-siden skal pege på samme relative manifest/appidentitet, så installation starter på RavRadars forside. Dette er en installerbar webapp, ikke en App Store-/Play Store-app.

## Kontrol

- Topmenuen skal vise linket i det godkendte handlingsområde.
- Kontakt-, MobilePay- og QR-link skal pege på de godkendte adresser.
- Tekstkontrakten skal indeholde ejer, formål, begrænsning, scorekontekst, kompleksitet og frivillig støtte.
- Responsive brudpunkter, billedvarianternes faktiske orientering og dimensioner samt fravær af vandret overflow skal kontrolleres målrettet.
- Pages- og service-worker-kontrakter skal indeholde siden og alle nødvendige aktiver.
- Den målrettede Om-test skal kontrollere installationsvejledning på DA/DE/EN, standalone/start/scope, manifest-/Apple-links og de faktiske 192/512/180-pixels PNG-dimensioner.
- Hver release skal kontrollere de to beskyttede geodatafiler særskilt og afvise ændringen, hvis diffen indeholder andet end det forventede versionsfelt.
- Offentlig efterkontrol skal bekræfte den mergede version på både bred og smal visning.

## Erstattede beslutninger

Ingen. Siden er et nyt offentligt informationslag og påvirker ikke eksisterende model- eller databeslutninger.
