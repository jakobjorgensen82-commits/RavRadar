# DEC-0276 – Læsbare søgetekster og tre rigtige sprogindgange

**Status:** Afgrænset 4.0.529-kandidat med afsluttet lokal versions-/måltestkontrol; exact-head CI og offentlig levering afventer.
**Dato:** 2026-10-02.

## Ejerordre og konkret implementering

Ejeren har bestilt ravradar.dk, fortsat GitHub-vedligehold og naturlige
søgetekster for rav, ravkort, ravudsigten, ravprognose, ravjagt, ravjæger,
kese, ravkese og ravlygte samt tyske og engelske ækvivalenter. Hjælpeteksten
skal stå diskret, men læsbart lige over Kilder, kort og licenser.

529 tilføjer denne footer med den eksisterende registerI18nMessages-udvidelse,
ikke ved ændring af den frosne i18n/modelkode. Tre statiske, synlige guides
har egne URL'er: ravjagt.html, bernsteinsuche.html og amber-hunting.html.
Hver guide har sit faktiske sprog, selvrefererende canonical, gensidige
hreflang-links og almindelig navigation. Guidernes sprogindgange er ikke
påståede oversættelser af hele appen. Appens nuværende sprogvalg bevares;
DE/EN-guide forklarer, at det vælges inde i appen.

Forsiden får canonical https://ravradar.dk/. robots.txt henviser til et
sitemap med seks faktiske offentlige sider. Ingen falske lastmod-tider,
meta-keywords, skjult ordliste, private/admin-URL'er eller garanti for
indeksering og søgerang. De nye sider bruger lokale CSS-filer og ingen
JavaScript; deres CSP tillader ikke scripts. Pc/mobil får normal ombrydning
og scrolling, ikke faste højder eller en ny indre scrollbar.

## Kilder og afgrænsning

Googles aktuelle primære vejledning beskriver særskilte URL'er og oversat
synligt indhold frem for et rent cookie-/localStorage-sprogvalg samt
korrekte gensidige hreflang-henvisninger:

- https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites
- https://developers.google.com/search/docs/specialty/international/localized-versions

Det begrunder de tre rigtige guides. Det er ikke et løfte om, at alle
appvisninger indekseres på tre sprog. Ingen søgekonto, betalt SEO, webhotel,
nøgle eller planændring er nødvendig for denne pakke. Eksisterende Pages-
pakning tager root-siderne med; workflow, domæne/DNS og login ændres ikke.

RavScore-formel, frossen67-filers bundle, de otte bindinger, geometri,
vejrhentning, data, sortering, top5 og historikadvarsler er urørte. Top20 er
stadig en separat bestilt opgave, ikke skjult aktiveret her. Nye browserfiler
bliver derimod en del af den normale offentlige implementation-identitet;
gamle browsermanifest-hashes genbruges eller ommærkes ikke.

## Målrettet kontrol og levering

Fire måltests kører den faktiske copy-registrering og kontrollerer footerens
placering/ord, uændret frosset MESSAGES, sprog/canonical/hreflang/lokale
links samt sitemap/robots. Før versionering bestod4/4 på115.8773ms uden skips.
Model --check bekræftede c557f91a520ae64211f9441f25fc72a9c230691cdb7b48551ecb7286463420eb
og otte forbrugere. Den nye test tilføjes kun til den eksisterende
public-hour-gruppe; alle tidligere gates bevares og sourceplanen forbliver47.
Versions-/RDKS-/docs/security-kontrol og én exact-head GitHub-CI kræves.
Faktisk pc/mobil-visning og offentlig læsbarhed skal kontrolleres efter deploy;
søgeindeksering/rangering er endnu ikke målt.

Efter versionering består den afgrænsede Node-målkommando8/8 på263.4773ms
uden skips: fire SEO-cases og eksisterende modelversion/security/beskyttede
dokumenttests. Den første kommando nævnte også et ikke-eksisterende håndbogs-
testnavn; der påstås ikke kontrol fra dette navn. Den korrekte eksisterende
4.0.70-håndbogstest bestod derefter407kapitler. Pages-modullukning, release-
version, RDKS4.0.529/14chat og102browserfilers lille syntax/sourcegate består.
Sourceplan47, model67/8bindinger, geodataONLYtopversion og SQLONLYhåndbog er
separat kontrolleret;59andre browserfiler er kun normal versionering.
Første RDKS-forsøg fandt manglende fuldt versionsnavn i Master Log; teksten
blev rettet, ikke validatoren. Public browser closure vokser normalt til83
transitive moduler, uden ændring af modelidentiteten.

Samme Chrome viste den rigtige guide på pc1280. Ved et dokumenteret viewport-
forsøg ændrede billedudsnittet sig, men DOM-bredden forblev1280; det tælles
ikke som mobilbevis. En disponibel lokal375CSS-pixel browserramme viste
derefter faktisk tysk guide og den udtrukne uændrede footer med deres rigtige
CSS, uden vandret overløb (guide360/360 med scrollbar; footer375/375).
Der blev kun serveret offentlige allowlist-filer, ingen appdata/providers.
Dette er afgrænset lokal responsive-layoutkontrol, ikke en rigtig telefon,
den fulde app eller offentlig levering. Previewserver/faner er lukket og
viewport nulstillet. Et engelsk klik var ikke frisk navigationverificeret;
engelsk runtimeoversættelse er måltestet, ikke browserbevist her.

## Nyere faktisk drift erstatter kandidatstatus i ældre afsnit

527 og528 er nu leveret. Ordinary36920739569 på526 afsluttede00.49.37DK med
faktisk progresssave/upload, no-loss,54/54artifact+3/3release og deploy.
528 er offentlig på mainba085f6b med datasetrr-20261001215041-210,210/673.
Kortets fyldte bund er faktisk kontrolleret på pc og mobil efter zoom/resize.
ravradar.dk har godkendt apex/www-certifikat og tvunget HTTPS; Simply-DNS,
redirects og Supabase exact-root-redirect er kontrolleret. Rigtig kontologin,
mail, offline/PWA-install og første nye-domain vejrhentning er ikke bevist.
Ingen Simply-webhotel blev købt. GitHub er eneste kode-/deploysted.

Cron8348098 er aktiv på uændret firetimersplan; næste naturlige start02.19DK.
Ingen ekstra vejrhentning for SEO eller domæne. Main må ikke ændres under
aktiv weather. Den store519-revision og særskilte sikkerhedsafvisninger består.
