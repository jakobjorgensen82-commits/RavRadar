# Offentlig sproggennemgang – 4.0.268

## Formål

RavRadar skal forklare ravjagt, score, login og turindberetning i almindeligt dansk. Brugeren skal kunne forstå en vurdering uden at kende interne ord fra datakæde, database eller udvikling.

## Gennemgåede brugerflader

- forsiden, ranglisten, kortforklaringen og den synlige opdateringsstatus,
- zonepanelet, femdøgnsvisningen og forklaringerne af de tre delscorer,
- **Spørg RavRadar** og de fremhævede standardspørgsmål,
- konto, magic link, efterregistrering og **Mine ture og fund**,
- fejltekster ved login, hentning og indsendelse,
- kildeafsnittet og det nye offentlige læringsmodul.

Admin- og debugvisninger er ikke skrevet om som almindelig brugerflade. De er bevidst tekniske arbejdsredskaber, men deres fejl må fortsat være afgrænsede og må ikke lække private data.

## Fund og rettelser

1. **Tekniske systemord var synlige.** `Supabase`, `fallback`, `datasæt` og interne scorereferencer stod i tekster, som en almindelig bruger kan møde. De er erstattet med blandt andet **loginforbindelsen**, **når DMI mangler en nødvendig værdi** og **senest opdateret**.
2. **Kystord var ikke konsekvente.** Kontoen skrev nogle steder *kystdel*, mens rapporteringen bruger *kyststrækning*. Den offentlige konto og turlog bruger nu *kyststrækning*.
3. **Loginfejl kunne komme direkte fra leverandøren.** Almindelige fejl som forkert kode, ubekræftet mail, eksisterende konto og for mange forsøg oversættes nu til korte danske forklaringer. Tekniske svar eller HTTP-koder vises ikke som normal logintekst.
4. **Søgeforhold og sikkerhed blev gentaget sammen.** Den offentlige score forklarer nu søgemetodens effektivitet. RavRadars afgrænsning fra sikkerhed står ét samlet sted i grundbogen og gives fortsat som ærligt svar, hvis brugeren spørger direkte.
5. **Strøm og bølger kunne lyde som samme transportmekanisme.** Forklaringerne siger nu konsekvent, at bølger kan løsne og holde materiale i bevægelse, mens strømmen står for den vigtigste vedvarende transport.
6. **Kontoens lagring lød unødigt teknisk.** Brugeren får nu at vide, at turen gemmes hos RavRadar og kan ses i turloggen. Implementeringen genbruger fortsat den samme række; der er ikke tilføjet dobbeltlagring.

## Ord, der fortsat bruges med forklaring

- **Mobilisering** forklares som, at rav løsnes og sættes i bevægelse.
- **Transport** forklares som den mere vedvarende flytning mod, langs eller væk fra kysten.
- **Brændingszone**, **opskylslinje**, **swash/backwash** og **undertow** findes kun i grundbogen sammen med forklaring eller miniordbog.
- **RavScore** forklares som et indeks over modellerede rav- og søgeforhold, ikke en procentchance for fund.

## Automatisk lås

`test:public-learning` afviser igen:

- interne standardord i offentlig status, login og kildeafsnit,
- den gamle `25/40/35`-forklaring i den nye grundbog,
- appcentrering før selve ravjagten,
- gentagne sikkerhedsadvarsler i delscorerne,
- manglende forklaring af bølgernes, strømmens og kystens forskellige roller.

Gennemgangen ændrer ingen RavScore-regel, vejrdata, geometri, land-/vandpunkter eller privat datakontrakt.
