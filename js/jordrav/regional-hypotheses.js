// Exploratory regional readings. Bounds only move the viewport: they never
// delimit amber potential, classify polygons or change the frozen dataset.
export const REGIONAL_HYPOTHESES = [
  {
    id:'rubjerg', expertId:'JH-005', bounds:[[57.40,9.68],[57.52,10.02]],
    sources:[{name:'Pedersen 2005 · s. 46–48',url:'https://www.geus.dk/media/13810/nr8_p001-192.pdf'}],
    copy:{
      da:{name:'Rubjerg–Lønstrup og baglandet',basis:'Ravpindelag er beskrevet i smeltevandssedimenter i et glaciotektonisk kompleks.',chain:'Et muligt ældre lager kan være flyttet som sandflager og omlejret af vand.',focus:'Undersøg sandlag, erosionskontakter og yngre modtagere, som kan forbindes stratigrafisk.',challenge:'En lignende jordart kan have en anden tilførsel; en fast afstand fra klinten er utilstrækkelig.'},
      de:{name:'Rubjerg–Lønstrup und das Hinterland',basis:'Bernsteinhaltige Holzlagen sind in Schmelzwassersedimenten eines glazialtektonischen Komplexes beschrieben.',chain:'Ein mögliches älteres Lager kann als Sandscholle versetzt und durch Wasser umgelagert worden sein.',focus:'Sandlagen, Erosionskontakte und jüngere Empfänger mit möglicher stratigrafischer Verbindung untersuchen.',challenge:'Gleiches Material kann andere Zufuhr haben; ein fester Abstand zur Klippe reicht nicht.'},
      en:{name:'Rubjerg–Lønstrup and the hinterland',basis:'Amber-bearing wood layers are described in meltwater sediments within a glaciotectonic complex.',chain:'A possible older store may have moved as sand sheets and been reworked by water.',focus:'Examine sand layers, erosion contacts and younger receivers with possible stratigraphic links.',challenge:'Similar material can have different supply; a fixed distance from the cliff is insufficient.'}
    }
  },
  {
    id:'northeast-zealand', expertId:'JH-006', bounds:[[55.86,12.12],[56.12,12.48]],
    sources:[{name:'Houmark-Nielsen 2024 · s. 67–68, 81',url:'https://2dgf.dk/xpdf/gt2024-32-106..pdf'},{name:'Hartz 1909 · s. 107',url:'https://archive.org/details/bidragtildanmark00hart'}],
    copy:{
      da:{name:'Gribskov–Allerød, Nordøstsjælland',basis:'Regionens lagfølger viser yngre vandløbs- og søaflejring oven på ældre sand og moræner.',chain:'Erosion kan forbinde et muligt ældre lager med yngre dal- og bassinlag.',focus:'Undersøg kontakter mellem sandlag, erosionsdale og bassinrande; vurder dæklag særskilt.',challenge:'Flere generationer af åse deler ikke nødvendigvis alder, tilførsel eller ravhistorie.'},
      de:{name:'Gribskov–Allerød, Nordostseeland',basis:'Regionale Schichten zeigen jüngere Fluss- und Seeablagerungen über älterem Sand und Moränen.',chain:'Erosion kann ein mögliches älteres Lager mit jüngeren Tal- und Beckenschichten verbinden.',focus:'Kontakte zwischen Sand, Erosionstälern und Beckenrändern untersuchen; Deckschichten gesondert bewerten.',challenge:'Mehrere Eskergenerationen teilen nicht unbedingt Alter, Zufuhr oder Bernsteingeschichte.'},
      en:{name:'Gribskov–Allerød, north-east Zealand',basis:'Regional sequences show younger river and lake deposits above older sand and tills.',chain:'Erosion may link a possible older store to younger valley and basin layers.',focus:'Examine contacts between sand, erosion valleys and basin margins; assess cover separately.',challenge:'Several esker generations need not share age, supply or amber history.'}
    }
  },
  {
    id:'stenstrup', expertId:'JH-007', bounds:[[55.04,10.44],[55.20,10.70]],
    sources:[{name:'Smed 1962 · s. 50–51',url:'https://2dgf.dk/xpdf/bull-1962-15-1-1-74.pdf'},{name:'Hartz 1909 · s. 107',url:'https://archive.org/details/bidragtildanmark00hart'}],
    copy:{
      da:{name:'Stenstrup og Kirkebysand, Sydfyn',basis:'Issøens østlige og sydøstlige tilløb er beskrevet; yngre ler kan indeholde omlejret rav.',chain:'Vand kan have frigjort materiale fra ældre lag og afsat det i et yngre bassin.',focus:'Undersøg sandede indløb, sand–ler-kontakter og erosion af yngre bassinlag.',challenge:'Issøens forskellige sider havde ikke samme tilførsel; dybt ler er ikke automatisk markrelevant.'},
      de:{name:'Stenstrup und Kirkebysand, Südfünen',basis:'Östliche und südöstliche Seezuflüsse sind beschrieben; jüngerer Ton kann umgelagerten Bernstein enthalten.',chain:'Wasser kann Material aus älteren Schichten freigesetzt und in einem jüngeren Becken abgesetzt haben.',focus:'Sandige Zuflüsse, Sand–Ton-Kontakte und Erosion jüngerer Beckenschichten untersuchen.',challenge:'Beckenseiten hatten unterschiedliche Zufuhr; tiefer Ton ist nicht automatisch für Feldbernstein relevant.'},
      en:{name:'Stenstrup and Kirkebysand, south Funen',basis:'Eastern and south-eastern lake inflows are described; younger clay can contain reworked amber.',chain:'Water may have released material from older layers and deposited it in a younger basin.',focus:'Examine sandy inflows, sand–clay contacts and erosion of younger basin layers.',challenge:'Basin sides had different supply; deep clay is not automatically relevant to field amber.'}
    }
  },
  {
    id:'varde', expertId:'JH-008', bounds:[[55.49,8.30],[55.77,8.73]],
    sources:[{name:'Høyer m.fl. 2013 · abstract',url:'https://pub.geus.dk/da/publications/deeply-rooted-glaciotectonism-in-western-denmark-geological-compo/'}],
    copy:{
      da:{name:'Varde bakkeø og erosionsrande',basis:'Miocæne og kvartære lag er opskudt, delvist borteroderet og senere blotlagt.',chain:'Ældre sedimenter kan være mulige fødekilder til yngre, lokale modtageraflejringer.',focus:'Undersøg blotlagte lagkontakter og sandede modtagere ved erosionsrandene.',challenge:'Ravtilførsel er uafklaret; brunkul og istryk alene giver ikke en højere klasse.'},
      de:{name:'Varde-Hügelinsel und Erosionsränder',basis:'Miozäne und quartäre Schichten wurden aufgeschoben, teilweise erodiert und später freigelegt.',chain:'Ältere Sedimente können mögliche Quellen jüngerer lokaler Aufnahmeablagerungen sein.',focus:'Freigelegte Schichtkontakte und sandige Empfänger an Erosionsrändern untersuchen.',challenge:'Bernsteinzufuhr ist ungeklärt; Braunkohle und Eisdruck allein erhöhen die Klasse nicht.'},
      en:{name:'Varde hill-island and erosion margins',basis:'Miocene and Quaternary layers were thrust, partly eroded and later exposed.',chain:'Older sediments may be possible sources for younger local receiving deposits.',focus:'Examine exposed layer contacts and sandy receivers along erosion margins.',challenge:'Amber supply is unresolved; lignite and ice pressure alone do not raise the class.'}
    }
  }
];
