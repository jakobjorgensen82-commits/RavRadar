import { registerI18nMessages } from '../i18n.js?v=4.0.592';

registerI18nMessages({
  de: {
    'about.explainer': `
      <div class="rr-intro">
        <p class="rr-kicker">So funktioniert RavRadar</p>
        <h2 id="rr-explainer-title">So werden Meer und Wetter zum BernsteinScore</h2>
        <p class="rr-lead">Wo sind die Bedingungen am vielversprechendsten, und wann lohnt es sich, loszufahren? RavRadar hilft dir, Küsten und Zeitpunkte zu vergleichen, indem es Meeres- und Wetterprognosen zu einer Bewertung zusammenführt.</p>
        <p>Hinter den Farben auf der Karte stehen drei Fragen: Können die Wellen Material in Bewegung gesetzt haben? Hat die Strömung den Transport zur Küste unterstützt? Und wie gut sind die Bedingungen zum Suchen? Die Antworten hängen von der Ausrichtung der Küste, den Bedingungen in der gewählten Stunde und dem vorherigen Verlauf ab.</p>
        <div class="rr-note"><p><strong>Der BernsteinScore bewertet die Bedingungen — nicht die Menge an Bernstein.</strong> Ein Score von 80 bedeutet keine Fundchance von 80 Prozent. Er sagt aus, dass die Anzeichen im Modell insgesamt vielversprechender sind als bei einem niedrigen Score, nicht, dass der Strand unbedingt voller Bernstein liegt.</p></div>
        <p>Für die schnelle Tourenplanung: Wähle Strand oder Wathose, vergleiche Orte und Zeiten und öffne die Zone, um die Erklärung zu lesen. Hier erfährst du, was hinter der Bewertung steckt.</p>
      </div>
      <nav class="rr-toc" aria-label="Inhalt der Erklärung">
        <a href="#rr-data">Daten</a><a href="#rr-coast">Die örtliche Küste</a><a href="#rr-score">Der Score</a><a href="#rr-current">Strömung</a><a href="#rr-waves">Wellen</a><a href="#rr-wind">Wind und Suchweise</a><a href="#rr-water">Wasserstand</a><a href="#rr-history">Zeit und Unsicherheit</a><a href="#rr-map">Die Karte</a><a href="#rr-zone">Die Zone</a>
      </nav>

      <section class="rr-chapter" id="rr-data">
        <p class="rr-kicker">1 · Die Datengrundlage</p>
        <h3>Von den Prognosen der Anbieter auf deinen Bildschirm</h3>
        <p>RavRadar ruft automatisch Prognosen für Wind, Wellen, Strömung, Wasserstand und Wassertemperatur ab. DMI ist die erste Wahl. Die verschiedenen Angaben stammen aus unterschiedlichen Wetter- und Meeresmodellen; es sind keine Messungen einer Wetterstation an jedem Strand.</p>
        <p>Wo die entsprechenden DMI-Daten fehlen, können bestimmte Angaben durch Copernicus Marine und danach durch Open-Meteo ergänzt werden. Für jede einzelne Angabe, jeden Ort und jede Stunde wird eine Quelle gewählt — nicht ein Anbieter für ganz Dänemark. Der Wasserstand folgt seiner eigenen DMI-Datenkette und wird nicht durch eine Schätzung aus den anderen Quellen ergänzt.</p>
        <p>Vor der Berechnung prüft RavRadar unter anderem Quelle, Ort und Zeitpunkt der Daten. Gültige Angaben werden zur Wiederverwendung in einem <em>Cache</em> gespeichert. So lassen sich bereits abgerufene Daten weiterverwenden, ohne die Wetterprognose festzuschreiben: Neuere, gültige Daten können entsprechend der festgelegten Quellenpriorität an ihre Stelle treten.</p>
        <figure aria-label="Von den Daten der Anbieter zur Karte für die Nutzer">
          <ol class="rr-process">
            <li><strong>Abrufen</strong>Wetter- und Meeresprognosen</li>
            <li><strong>Prüfen</strong>Quelle, Ort und Stunde</li>
            <li><strong>Zusammenführen</strong>Neue und gültige gespeicherte Daten</li>
            <li><strong>Berechnen</strong>BernsteinScore für Küste und Stunde</li>
            <li><strong>Anzeigen</strong>Karte, Zeiten und Erklärungen</li>
          </ol>
          <figcaption>Wenn du die Seite besuchst, liest du die fertig berechnete Prognose. Dein Besuch löst keinen neuen Abruf von Wetterdaten bei den Anbietern aus.</figcaption>
        </figure>
        <p class="rr-source-links">Zu den Daten der Anbieter: <a href="https://www.dmi.dk/friedata/dokumentation/data/forecast-data-wave-model-wam" target="_blank" rel="noopener noreferrer">Wellenmodell von DMI</a>, <a href="https://www.dmi.dk/friedata/dokumentation/data/forecast-data-storm-surge-model-dkss" target="_blank" rel="noopener noreferrer">Meeresmodell von DMI</a>, <a href="https://data.marine.copernicus.eu/product/BALTICSEA_ANALYSISFORECAST_PHY_003_006/description" target="_blank" rel="noopener noreferrer">Copernicus Marine</a> und <a href="https://open-meteo.com/en/docs/marine-weather-api" target="_blank" rel="noopener noreferrer">Open-Meteo</a>.</p>
      </section>

      <section class="rr-chapter" id="rr-coast">
        <p class="rr-kicker">2 · Die örtliche Küste</p>
        <h3>Dieselbe Strömung trifft nicht jede Küste gleich</h3>
        <p>Die Küstenkarte von RavRadar umfasst 210 Zonen mit insgesamt 673 örtlichen Küstenabschnitten. Eine große Zone kann Küsten mit unterschiedlichen Ausrichtungen enthalten. Deshalb reicht es nicht, beispielsweise eine ostwärts gerichtete Strömung für das gesamte Gebiet als gut oder schlecht zu bezeichnen.</p>
        <p>Jeder Küstenabschnitt hat einen festgelegten Punkt an Land und einen im Meer. Die Richtung vom Meerespunkt zum Landpunkt legt fest, was genau dort „landwärts“ bedeutet. Die Strömungsrichtung wird mit dieser Richtung verglichen — nicht nur mit Nord, Süd, Ost und West.</p>
        <p>An einer nach Westen ausgerichteten Küste liegt das Meer im Westen, sodass eine ostwärts gerichtete Strömung auf das Land zu fließt. An einer nach Osten ausgerichteten Küste kann dieselbe Strömung vom Land wegführen. Deshalb können zwei benachbarte Küsten unterschiedlich bewertet werden, obwohl die Strömungsdaten des Anbieters ähnlich sind.</p>
        <p>Die Meeresmodelle der Anbieter berechnen die Strömung in einem Netz von Punkten. RavRadar verwendet die relevanten Modelldaten für das Meeresgebiet des Küstenabschnitts. Es bleibt ein Modellwert — kein Strömungsmesser genau dort, wo du mit deinem Bernsteinkescher stehst.</p>
      </section>

      <section class="rr-chapter" id="rr-score">
        <p class="rr-kicker">3 · BernsteinScore von 0 bis 100</p>
        <h3>Drei Teilbewertungen ergeben einen Gesamtscore</h3>
        <p>Der BernsteinScore liegt zwischen 0 und 100. Grundlage sind drei Teilbewertungen, ebenfalls von 0 bis 100, die unterschiedlich stark in das Gesamtergebnis eingehen.</p>
        <figure>
          <div class="rr-weightbar" role="img" aria-label="Der BernsteinScore gewichtet die Strömung zur Küste im Zeitverlauf mit 50 Prozent, die Möglichkeit der Wellen, Bernstein zu bewegen, mit 30 Prozent und die Suchbedingungen mit 20 Prozent">
            <span class="rr-transport">Transport<br>50 %</span><span class="rr-mobilisation">Bewegung<br>30 %</span><span class="rr-huntability">Suche<br>20 %</span>
          </div>
          <figcaption>Diese Gewichtung ist eine Arbeitsregel des Modells. Sie ist keine belegte prozentuale Aufteilung der Ursachen tatsächlicher Bernsteinfunde.</figcaption>
        </figure>
        <dl>
          <dt>Strömung zur Küste im Zeitverlauf · 50 %</dt><dd>Hat der Strömungsverlauf den Transport zur Küste unterstützt oder in die entgegengesetzte Richtung gewirkt? Verlauf und Richtung der Wellen fließen als begrenzte Korrektur ein, können die Strömung aber nicht ersetzen.</dd>
          <dt>Möglichkeit der Wellen, Bernstein zu bewegen · 30 %</dt><dd>Wie stark deuten Wellenenergie und Wellenverlauf darauf hin, dass verfügbares Material in Bewegung gesetzt worden sein könnte? Bewertet wird die Einwirkung, nicht die Anzahl der Bernsteinstücke.</dd>
          <dt>Suchbedingungen · 20 %</dt><dd>Wie gut eignen sich Wind- und Wellenbedingungen für die gewählte Suchweise: im Wasser mit Wathose oder am Strand?</dd>
        </dl>
        <div class="rr-example">
          <p class="rr-small">Rechenbeispiel mit ausreichender Historie — keine aktuellen Wetterdaten</p>
          <p>Transport 70, Welleneinwirkung 60 und Suchbedingungen 80 ergeben:</p>
          <p class="rr-calculation">35 + 18 + 16 = 69</p>
          <p class="rr-small">Die Hälfte von 70, 30 Prozent von 60 und 20 Prozent von 80. In diesem Fall müssen die zusätzlichen Begrenzungen des Modells die Summe nicht senken.</p>
        </div>
        <h4>Warum ist der Endscore nicht immer einfach die Summe?</h4>
        <p>Gute Bedingungen in einem Teilbereich sollen sehr schwache Bedingungen in einem anderen nicht ohne Weiteres ausgleichen können. Deshalb hat das Modell zusätzlich diese Begrenzungen:</p>
        <ul>
          <li><strong>Ein schwaches physikalisches Zusammenspiel dämpft das Ergebnis.</strong> Ist der Wert für Transport oder Bewegung sehr niedrig, wird die gewichtete Summe etwas gesenkt. Gutes Suchwetter allein kann die physikalische Situation nicht gut machen.</li>
          <li><strong>Für die Wathose gilt eine zusätzliche Obergrenze.</strong> Der Endscore kann den Teilscore für die Suchbedingungen nicht übersteigen. Ein weiteres Beispiel: Ergibt die Berechnung vor dieser Begrenzung 69, die Suchbedingungen aber nur 40, beträgt der Wathosen-Score höchstens 40.</li>
          <li><strong>Bei berechneter Erschöpfung nach ablandiger Strömung kann der Score null werden.</strong> Hat ein tatsächlich seewärts gerichteter Strömungsverlauf das Transportpotenzial vollständig auf null abgesenkt, wird auch der Endscore auf null gesetzt. Es reicht nicht, dass der aktuelle Pfeil ein wenig vom Land weg zeigt oder frühere Strömungsdaten unbekannt sind.</li>
        </ul>
        <p>Am Ende wird der Score als ganze Zahl angezeigt. Fehlende Historie wird gesondert behandelt; die Erklärung dazu findest du unter <a href="#rr-history">Zeit und Unsicherheit</a>.</p>
      </section>

      <section class="rr-chapter" id="rr-current">
        <p class="rr-kicker">4 · Der Strömungswinkel</p>
        <h3>Eine starke Strömung allein reicht nicht</h3>
        <p>Die Richtung ist ebenso wichtig. Eine Strömung lässt sich in einen Anteil entlang der Küste und einen quer dazu aufteilen. Der quer zur Küste gerichtete Anteil — auf das Land zu oder davon weg — wird zum Aufbau oder Abbau des Transportpotenzials verwendet.</p>
        <p>Eine Strömung direkt auf die Küste zu liefert bei gleicher Geschwindigkeit den größten landwärts gerichteten Beitrag. Eine schräge Strömung liefert weniger. Eine Strömung genau parallel zur Küste liefert in diesem Teil des Modells keinen direkten landwärts oder seewärts gerichteten Beitrag. Das bedeutet nicht, dass sie physikalisch bedeutungslos ist; Material kann auch entlang einer Küste bewegt werden, aber RavRadar verfolgt nicht den Weg jedes Bernsteinstücks zwischen benachbarten Stränden.</p>
        <figure class="rr-angle-figure">
          <h4>Wie viel der Strömung geht auf das Land zu?</h4>
          <p><strong>Wasser kann sich schnell bewegen, ohne dem Strand näher zu kommen.</strong> Das geschieht, wenn die Strömung entlang der Küste fließt. Deshalb betrachtet RavRadar nicht nur die Strömungsgeschwindigkeit, sondern auch die Richtung im Verhältnis zur Küste.</p>
          <p>In der Abbildung folgt das Wasser dem blauen Pfeil. Als einfaches Beispiel haben wir eine Geschwindigkeit von <strong>8 Zentimetern pro Sekunde</strong> gewählt. Wenn du den Schieberegler bewegst, änderst du nur die Richtung — nicht die Geschwindigkeit.</p>
          <p>Zeigt der Pfeil direkt auf das Land zu, führt die gesamte Bewegung zur Küste. Zeigt er schräg, verläuft die Bewegung sowohl entlang der Küste als auch auf sie zu. Das Wasser teilt sich nicht in zwei Strömungen; es ist eine einzige schräge Bewegung, die wir in zwei Richtungen beschreiben.</p>
          <svg class="rr-angle-drawing" role="img" aria-labelledby="rr-angle-title rr-angle-desc">
            <title id="rr-angle-title">Die Strömung im Verhältnis zur Ausrichtung der Küste</title>
            <desc id="rr-angle-desc">Eine schematische Zeichnung mit dem Meer links und dem Land rechts. Verändere unten den Winkel, um zu sehen, wie viel einer Strömung quer zur Küste verläuft.</desc>
          </svg>
          <div class="rr-angle-controls">
            <label for="rr-current-angle">Strömungswinkel gegenüber der Richtung direkt zum Land: <strong id="rr-angle-value">45°</strong></label>
            <input id="rr-current-angle" type="range" min="0" max="180" value="45" step="15">
            <div class="rr-age-labels" aria-hidden="true"><span>0°<br>Zum Land</span><span style="text-align:center">90°<br>Entlang der Küste</span><span>180°<br>Vom Land weg</span></div>
            <div id="rr-angle-result" class="rr-angle-result" aria-live="polite">Bewege den Schieberegler, um zu sehen, wie viel näher das Wasser der Küste in einer Sekunde kommt oder wie viel weiter es sich von ihr entfernt.</div>
          </div>
          <div class="rr-angle-key"><span><i class="rr-key-line" aria-hidden="true"></i>Bewegung des Wassers</span><span><i class="rr-key-line rr-key-projection" aria-hidden="true"></i>Bewegung zur Küste oder von ihr weg</span></div>
          <figcaption>Ein gedachtes Beispiel, keine aktuellen Wetterdaten. Die Abbildung erklärt die Richtung; sie berechnet weder den BernsteinScore noch den genauen Weg des Bernsteins.</figcaption>
        </figure>
        <p>Der Einfluss des Winkels verändert sich stufenlos, nicht in festen Winkelschritten. Bei 45 Grad beträgt die Geschwindigkeit quer zur Küste etwa 71 Prozent der Gesamtgeschwindigkeit. Eine starke, schräge Strömung kann daher einen größeren landwärts gerichteten Beitrag liefern als eine sehr schwache Strömung direkt zum Land. Ob der Beitrag groß genug ist, um zu zählen, hängt auch von der Stärke ab.</p>

        <h4>Stärke und Dauer wirken zusammen</h4>
        <p>Das Transportpotenzial ist das Gedächtnis des Modells für den Strömungsverlauf. Stell es dir als Behälter mit Platz für 0–100 Punkte vor: Strömung zum Land kann ihn füllen, und Strömung vom Land weg kann das aufgebaute Potenzial verringern. Es ist kein Behälter mit einer bekannten Menge Bernstein darin.</p>
        <p>Ein kurzer Moment mit auflandiger Strömung führt deshalb nicht automatisch zu einem hohen Score. Umgekehrt geht ein günstiger Verlauf nicht unbedingt verloren, nur weil sich die Strömung kurz dreht. Sowohl Stärke als auch Dauer zählen, und wenn ältere Stunden allmählich aus dem Gedächtnis fallen, kann sich auch die Bewertung ändern.</p>
        <details class="rr-technical">
          <summary>Die konkreten Grenzwerte für Stärke und Punkte</summary>
          <p>Die Geschwindigkeit quer zur Küste muss 3 cm/s (0,03 m/s) überschreiten, um einen Beitrag zu liefern. Ab 15 cm/s (0,15 m/s) zählt sie als volle Stärke. Zwischen den beiden Grenzen steigt der Stärkebeitrag allmählich an. Die Grenzen gelten in beide Richtungen.</p>
          <p>Eine zeitlich voll gewichtete Stunde mit voller landwärts gerichteter Stärke kann das Transportpotenzial um höchstens 10 Punkte erhöhen. Eine entsprechende seewärts gerichtete Stunde kann höchstens 8 Punkte abziehen. Eine schwächere Strömung quer zur Küste und ältere, geringer gewichtete Stunden zählen weniger. Es sind Punkte im Transportpotenzial — nicht direkt 10 oder 8 Punkte im gesamten BernsteinScore.</p>
          <p>Es gibt deshalb keine feste Anzahl von Stunden mit auflandiger Strömung, die immer zu einem grünen Score führt. Ausgangsniveau, Strömungsstärke, Winkel, Alter, Wellenverlauf und Suchweise wirken zusammen.</p>
        </details>
        <figure>
          <div class="rr-age" role="img" aria-label="Die Strömungshistorie reicht 48 Stunden zurück. Die letzten 24 Stunden werden voll gewichtet; ältere Stunden erhalten allmählich weniger Gewicht und bei 48 Stunden kein Gewicht mehr.">
            <div class="rr-age-old"><strong>Älterer Strömungsverlauf</strong><br>Der Einfluss nimmt stufenlos ab</div>
            <div class="rr-age-new"><strong>Die letzten 24 Stunden</strong><br>Volle zeitliche Gewichtung</div>
          </div>
          <div class="rr-age-labels"><span>48 Stunden zuvor</span><span>24 Stunden zuvor</span><span>Zeitpunkt des Scores</span></div>
          <figcaption>Das Strömungsgedächtnis. Das Wellengedächtnis folgt anderen Zeitregeln und kann weiter zurückreichen.</figcaption>
        </figure>
      </section>

      <section class="rr-chapter" id="rr-waves">
        <p class="rr-kicker">5 · Wellen</p>
        <h3>Wellen können Material in Bewegung setzen</h3>
        <p>Bernstein kann am Meeresgrund, in küstennahen Ablagerungen oder zwischen anderem Material liegen. Wellen können helfen, ihn zu lösen und zu bewegen, wenn er verfügbar ist. RavRadar verwendet Wellenhöhe und Wellenperiode als Indikator für diese Möglichkeit.</p>
        <p>Die Wellenhöhe allein sagt nicht alles. Auch die <em>Wellenperiode</em> — die Zeit zwischen den Wellen — fließt ein. Zwei Situationen mit gleicher Wellenhöhe können deshalb unterschiedliche Beiträge liefern. RavRadar verwendet beide zusammen als Indikator für die Wellenenergie, nicht als direkte Messung dessen, was am Meeresgrund geschieht.</p>
        <p>Die Welleneinwirkung baut sich im Modell allmählich auf und nimmt danach langsamer ab. Deshalb kann frühere Wellenaktivität noch zählen, wenn das Meer bereits ruhiger geworden ist. Das bedeutet nicht, dass das Modell weiß, wie lange ein bestimmtes Bernsteinstück liegen bleibt.</p>
        <div class="rr-duo" aria-label="Die zwei unterschiedlichen Rollen der Wellen">
          <div><h4>Was könnte in Bewegung gesetzt worden sein?</h4><p>Die Wellen tragen zum Teilscore „Möglichkeit der Wellen, Bernstein zu bewegen“ bei. Frühere Wellenaktivität kann noch zählen, obwohl das Meer bereits ruhiger geworden ist.</p></div>
          <div><h4>Wie sind die Suchbedingungen jetzt?</h4><p>Die aktuellen Wellen beeinflussen die Suchbedingungen. Große Wellen können also sowohl das Mobilisierungssignal erhöhen als auch die Bernsteinsuche selbst erschweren.</p></div>
        </div>
        <p>Verlauf und Richtung der Wellen fließen außerdem als begrenzte Korrektur in den Transportanteil ein. Sie kann den strömungsgestützten Beitrag dämpfen, aber keinen Transport aus dem Nichts erzeugen. RavRadar berechnet nicht genau, wo Bernstein hinter einer bestimmten Sandbank landet.</p>
        <details class="rr-technical">
          <summary>So rechnet das Modell mit Wellenenergie und Gedächtnis</summary>
          <p>Der Energieindikator ist die Wellenhöhe mit sich selbst multipliziert und anschließend mit der Wellenperiode. Bei gleicher Periode ergibt die doppelte Höhe deshalb einen viermal so großen Indikator — aber keinen viermal so hohen BernsteinScore. Der Indikator wird zunächst in einen Teilwert zwischen 0 und 100 umgerechnet.</p>
          <p>Beim Aufbau verwendet das Modell eine Halbwertszeit von 4 Stunden, beim Abklingen von 48 Stunden. Das bedeutet, dass sich der Abstand zu einem unverändert bleibenden neuen Niveau in 4 beziehungsweise 48 Stunden halbiert. Es ist eine Regel für die Anpassung des Modells, nicht für die Verweildauer des Bernsteins am Strand.</p>
        </details>
        <p class="rr-source-links">Hintergrund zu Wellenhöhe, Energie und Periode: <a href="https://www.dmi.dk/hav-og-is/temaforside-monsterbolger/bolgeteori" target="_blank" rel="noopener noreferrer">Die Erklärung von DMI zu Wellen</a>. Die Zeitregeln und Gewichtungen von RavRadar sind eigene Arbeitsregeln des Modells.</p>
      </section>

      <section class="rr-chapter" id="rr-wind">
        <p class="rr-kicker">6 · Wind und Suchweise</p>
        <h3>Ablandiger Wind ist nicht dasselbe wie ablandige Strömung</h3>
        <p>Wind kann das Meer über Wellen, Wasserstand und Strömung beeinflussen. Die Windrichtung allein sagt aber nicht, in welche Richtung die Modellströmung fließt. RavRadar vergibt deshalb nicht automatisch Transportpunkte, nur weil der Wind zum Land weht.</p>
        <p>Der direkte Einfluss des Windes auf den Score betrifft die Suchbedingungen. Mehr Wind kann die Wasseroberfläche unruhig machen, sodass es schwieriger wird, mit einer Bernsteinlampe bis zum Grund zu sehen. Der indirekte Einfluss des Windes auf das Meer spiegelt sich in den getrennten Prognosen unter anderem für Wellen und Strömung wider — nicht in zusätzlichen Transportpunkten allein für die Windrichtung.</p>
        <h4>Warum können Strand und Wathose unterschiedliche Scores bekommen?</h4>
        <p>Weil derselbe Meereszustand nicht für beide Suchweisen gleich geeignet ist. Die Bewertung für die Wathose reagiert stärker auf schwierige Wind- und Wellenbedingungen und hat die Obergrenze aus dem Abschnitt zum Score: Gute Transportbedingungen dürfen nicht verdecken, dass die Suche im Wasser schwierig ist. Die Strandbewertung hat diese zusätzliche Obergrenze nicht.</p>
        <p>Bei der Bewertung für die Wathose ist der Wind maßgeblich, während Wellen die Suchbedingungen zusätzlich verschlechtern können. Du kannst deshalb nicht erwarten, dass große Wellen durch eine günstige Strömungsrichtung ausgeglichen werden. Wähle immer die Suchweise, die du tatsächlich nutzen möchtest.</p>
        <p>Ein Verlauf mit Wellenaktivität und anschließend ruhigeren Suchbedingungen kann im Modell daher vielversprechend aussehen. Das ist keine Regel, immer bis nach windigem Wetter zu warten, und kein Versprechen, dass noch Bernstein vorhanden ist.</p>
        <div class="rr-note"><p><strong>Ein grüner Score ist keine Sicherheitsfreigabe.</strong> RavRadar beurteilt weder deine Erfahrung noch örtliche Rinnen, plötzliche Wellen oder eine sichere Wassertiefe. Suchbedingungen und Sicherheit sind nicht dasselbe.</p></div>
      </section>

      <section class="rr-chapter" id="rr-water">
        <p class="rr-kicker">7 · Die weiteren Meeresangaben</p>
        <h3>Wasserstand und Temperatur sind nützlich — ohne zusätzliche Punkte zu geben</h3>
        <h4>Wasserstand</h4>
        <p>Der Wasserstand hilft dir einzuschätzen, wo die Wasserkante und zugängliche Suchbereiche liegen könnten. Niedrigeres Wasser kann Stellen freilegen, die sonst bedeckt sind. Höheres Wasser kann die aktive Küstenzone landwärts verschieben. Das allein ist kein Beleg dafür, dass Bernstein angespült wurde.</p>
        <p>Die Zentimeterangabe beschreibt den Wasserstand in der Prognose — nicht die Wassertiefe dort, wo du stehst. Damit lässt sich nicht entscheiden, wie weit du sicher hinausgehen kannst.</p>
        <p>Die Änderung über drei Stunden blickt nach vorn: Sie vergleicht die gewählte Stunde mit drei Stunden später. Ein Minus bedeutet später niedrigeres Wasser, ein Plus höheres Wasser. Ein niedriger Wasserstand kann also durchaus steigen und ein hoher fallen. Die Änderung ist nicht nur ein Maß für die Gezeiten.</p>
        <p>Die Drei-Stunden-Änderung kann fehlen, obwohl der Wasserstand für die gewählte Stunde vorhanden ist. Dafür wird auch eine gültige Prognose für den Zeitpunkt drei Stunden später benötigt.</p>
        <p>Der Wasserstand gibt keine direkten BernsteinScore-Punkte. Sind zwei Zeitpunkte bei Score und Qualität der Historie genau gleich, können jedoch niedrigeres Wasser und danach ein nicht steigender Wasserstand entscheiden, welcher Zeitpunkt für die Wathose hervorgehoben wird. Das ändert den Score selbst nicht.</p>
        <h4>Wassertemperatur</h4>
        <p>Die Wassertemperatur wird als zusätzliche Information zu den Bedingungen angezeigt. Sie gibt im aktuellen Scoremodell weder einen eigenen Bonus noch einen Abzug. Ein hoher Score ist daher keine Bewertung, ob die Temperatur zu deiner Tour passt.</p>
      </section>

      <section class="rr-chapter" id="rr-history">
        <p class="rr-kicker">8 · Zeit und Unsicherheit</p>
        <h3>Ein Pfeil zeigt einen Augenblick. Der Score berücksichtigt auch die Stunden davor.</h3>
        <p>Du kannst durchaus einen Strömungspfeil vom Land weg und gleichzeitig einen relativ hohen Score sehen. Das kann daran liegen, dass die Stunden zuvor einen starken landwärts gerichteten Verlauf hatten. Ebenso kannst du einen Pfeil zum Land ohne hohen Score sehen, weil die Einwirkung noch schwach oder kurz ist, die Wellen wenig beigetragen haben oder die Suchbedingungen schlecht sind.</p>
        <p>„Historie“ bedeutet die Stunden vor <em>dem Zeitpunkt, den du gerade ansiehst</em> — nicht unbedingt vor dem heutigen Tag. Schaust du am Freitag auf die Montagsprognose, kann der Score für Montag auf den Strömungsprognosen für Samstag und Sonntag beruhen. Es sind weiterhin Prognosen, kein bereits eingetretenes Wetter. Das Wetter vom Dienstag wird nicht verwendet, um den Score vom Montag zu erklären.</p>
        <h4>Was bedeutet „Wetterhistorie im Aufbau“?</h4>
        <p>Fehlende Wetterdaten für die gewählte Stunde sind etwas anderes als fehlendes Wissen über die Stunden davor. Fehlen notwendige aktuelle Eingangsdaten, kann der Score nicht verfügbar sein. Sind die aktuellen Daten vorhanden, der vorherige Verlauf aber teilweise unbekannt, kann das Modell einen vorsichtigen Score zusammen mit einem Intervall anzeigen.</p>
        <p>Das Intervall zeigt, wie stark gerade die fehlende Historie die Berechnung beeinflussen kann. Der angezeigte Score orientiert sich am vorsichtigen Ende. Unbekannte Stunden werden nicht als belegte Nullströmung oder Windstille behandelt. Das Intervall ist weder eine Fundchance noch ein Gesamtmaß für alle Unsicherheiten des Wetters und der Bernsteinsuche.</p>
        <p>Zwei Orte mit fast gleichem Score können deshalb eine unterschiedliche Datengrundlage haben. Lies den Hinweis zur Historie und das Intervall mit, besonders wenn du sehr ähnliche Ergebnisse vergleichst.</p>
        <p>„Historie vollständig“ bedeutet daher nicht, dass alle örtlichen Bedingungen bekannt sind oder die Prognose sicher ist. Das Modell kennt weiterhin weder den örtlichen Bernsteinvorrat noch alle Verhältnisse direkt am Strand.</p>
        <p>Eine Lücke in den aktuellen Daten eines Küstenabschnitts muss nicht die Bewertung der gesamten Zone verhindern. Andere Abschnitte können weiterhin gültige Scores haben. Achte deshalb auch darauf, ob die Zonenangaben nur einen Teil des Gebiets abdecken.</p>
      </section>

      <section class="rr-chapter" id="rr-map">
        <p class="rr-kicker">9 · Von der Berechnung zur Karte</p>
        <h3>Farben, Pfeile und Zeitschieberegler zeigen unterschiedliche Dinge</h3>
        <p>Die Küstenfarbe zeigt den BernsteinScore für die gewählte Suchweise und die angezeigte Stunde. Pfeile zeigen eine Richtung, während die Farbe mehrere Bedingungen und ihren Verlauf zusammenfasst. Deshalb müssen Pfeil und Farbe nicht dieselbe einfache Geschichte erzählen.</p>
        <div class="rr-bandlist" aria-label="BernsteinScore-Farben">
          <span><i class="rr-dot" style="--dot:#168252" aria-hidden="true"></i>75–100 · Gut</span>
          <span><i class="rr-dot" style="--dot:#d7a107" aria-hidden="true"></i>55–74 · Mittel</span>
          <span><i class="rr-dot" style="--dot:#d77d20" aria-hidden="true"></i>35–54 · Schwach</span>
          <span><i class="rr-dot" style="--dot:#ce4c40" aria-hidden="true"></i>0–34 · Schlecht</span>
          <span><i class="rr-dot" style="--dot:#3f4e53" aria-hidden="true"></i>Keine Daten · kein Score von null</span>
        </div>
        <p>Ein Stern kennzeichnet einen besonders hohen Modellscore ab 90. Weder die grüne Farbe noch der Stern sagen aus, wie viel Bernstein tatsächlich vorhanden ist.</p>
        <dl>
          <dt>Der blaue Pfeil · Strömungsrichtung</dt><dd>Zeigt die Richtung, in die sich das Wasser in den Modelldaten bewegt. Er zeichnet nicht den genauen Weg des Bernsteins nach.</dd>
          <dt>Der weiße Pfeil · Windrichtung</dt><dd>Zeigt die Bewegung des Windes auf der Karte. In der Zahlenanzeige wird der Wind nach der üblichen Regel angegeben: woher er kommt. Westwind kommt aus Westen und bewegt sich nach Osten.</dd>
          <dt>Der Zeitschieberegler</dt><dd>Zeigt die Karte für eine andere verfügbare Prognosestunde. Die deutliche Anzeige von Tag, Datum und Uhrzeit sagt dir, welchen Zeitpunkt du ansiehst. „Jetzt“ bringt die Karte zur aktuellen Prognosestunde zurück.</dd>
        </dl>
        <p>Der Schieberegler wählt eine bereits berechnete Prognosestunde. Er ändert weder das Scoremodell noch löst er einen neuen Wetterdatenabruf aus. Wie weit du vorausblicken kannst, hängt von den verfügbaren Stunden in der aktuellen Prognose ab.</p>
      </section>

      <section class="rr-chapter" id="rr-zone">
        <p class="rr-kicker">10 · Wenn du eine Zone öffnest</p>
        <h3>Nutze die Erklärung — nicht nur die große Zahl</h3>
        <p>Wenn ein Abschnitt interessant aussieht, öffne die Zone, um zu sehen, worauf die Bewertung beruht. Prüfe zuerst Suchweise, Tag und Uhrzeit. Ein guter Score am Montagmorgen bedeutet nicht unbedingt einen guten Score am Montagnachmittag.</p>
        <dl>
          <dt>Warum dieser Score?</dt><dd>Erklärt die drei Teilbewertungen für den Ort und Zeitpunkt, den du ansiehst. Hier kannst du zwischen guten Transportbedingungen, der vorherigen Welleneinwirkung und den aktuellen Suchbedingungen unterscheiden.</dd>
          <dt>Wind, Wellen, Strömung, Wasserstand und Temperatur</dt><dd>Zeigen die konkreten Prognoseangaben hinter der Bewertung oder als zusätzlichen Kontext. Nutze sie, um eine Änderung des Scores zu verstehen — nicht als fünf gleichartige Faktoren, die jeweils Punkte geben.</dd>
          <dt>Qualität der Historie und Intervall</dt><dd>Zeigen, ob der vorherige Verlauf ausreichend bekannt ist oder die angezeigte Bewertung durch fehlende Historie geprägt wird.</dd>
          <dt>Fünf-Tage-Prognose und bester Zeitpunkt</dt><dd>Helfen dir, die kommenden Tage zu vergleichen und die vielversprechendste verfügbare Stunde zu finden. Der beste Zeitpunkt eines Tages bedeutet nicht, dass der ganze Tag denselben Score hat.</dd>
          <dt>Gesamtes Gebiet und bester Ort</dt><dd>Ein einzelner Küstenabschnitt kann gute Bedingungen haben, obwohl der Rest der Zone schwächer ist. Die Gebietsbewertung ist kein einfacher Durchschnitt: Sie berücksichtigt den besten Ort und wie breit die guten Bedingungen durch mehrere Küstenabschnitte gestützt werden. Deshalb kann die Zahl vom besten örtlichen Score abweichen.</dd>
          <dt>Die technische Erklärung</dt><dd>Gibt dir bei Interesse einen tieferen Einblick in die Berechnung. Du musst die technischen Felder nicht verstehen, um die Karte und die normalen Erklärungen zu nutzen.</dd>
        </dl>
        <p>Wenn du den Zeitschieberegler verschoben hast und eine Zone auf der Karte antippst, folgt die Zonenansicht der gewählten Prognosestunde. Öffnest du dagegen eine Zone von der Startseite über die Fünf-Tage-Prognose, wird die Zeitauswahl der Karte auf „Jetzt“ zurückgesetzt. Die Aktuell-Liste zeigt weiterhin die Bedingungen jetzt. Die Zeitangabe ist deshalb wichtig, wenn du Ansichten vergleichst.</p>
        <h4>Eine einfache Art, deine Tour zu planen</h4>
        <ol class="rr-reading-steps">
          <li><strong>Wähle die Suchweise.</strong> Beginne mit Strand oder Wathose, damit die Bewertung zu deiner Tour passt.</li>
          <li><strong>Vergleiche Orte und Zeiten.</strong> Sieh dir Karte und Fünf-Tage-Prognose an. Nutze den Schieberegler, um zu prüfen, ob die Bedingungen rund um einen vielversprechenden Zeitpunkt gut bleiben oder nur eine einzelne Stunde gut ist.</li>
          <li><strong>Lies die Erklärung in der Zone.</strong> Schau, was den Score hebt und begrenzt und wie gut der vorherige Verlauf bekannt ist.</li>
          <li><strong>Prüfe die Prognose vor der Abfahrt erneut.</strong> Neue Anbieterdaten können die Bewertung verändern. An der Küste bleiben deine eigenen Beobachtungen und eine eigenständige Sicherheitsbewertung notwendig.</li>
        </ol>
      </section>

      <section class="rr-chapter">
        <p class="rr-kicker">11 · Der wichtige Vorbehalt</p>
        <h3>Eine gute Prognose ist nicht dasselbe wie ein Strand voller Bernstein</h3>
        <p>RavRadar sieht die aktuelle Treibgutschicht nicht, untersucht den Strand nicht mit einer Kamera und weiß nicht, ob andere den verfügbaren Bernstein bereits gesammelt haben. Das Modell kennt auch weder die genaue Bernsteinmenge im Meeresboden noch alle örtlichen Sandbänke, Rinnen und geschützten Bereiche.</p>
        <p>Ein grüner Abschnitt kann deshalb leer sein — auch ohne Treibgutschicht — und du kannst bei einem niedrigen Score Bernstein finden. Verschiedene Küsten haben auch nicht denselben grundsätzlichen Bernsteinreichtum. Der Score bewertet die Bedingungen; er belegt nicht, dass eine bestimmte Küste mehr Bernstein enthält als eine andere.</p>
        <p>Die Gewichtungen, Zeitregeln und Grenzwerte des Modells sind gewählte Arbeitsregeln, keine Naturkonstanten. Der BernsteinScore ist noch nicht anhand einer repräsentativen Auswahl tatsächlicher Touren auf eine bestimmte Fundchance kalibriert. Genau deshalb soll die Zahl als Hilfe beim Vergleich von Möglichkeiten verstanden werden, nicht als Fundgarantie.</p>
        <div class="rr-note"><p><strong>Kurz gesagt:</strong> Nutze die Karte, um Möglichkeiten zu finden, die Zonenerklärung, um sie zu verstehen, und deine eigenen Beobachtungen, um den Ort einzuschätzen. RavRadar hilft bei der Entscheidung — es bestimmt nicht, was du findest.</p></div>
      </section>
`,
  },
  en: {
    'about.explainer': `
      <div class="rr-intro">
        <p class="rr-kicker">How RavRadar works</p>
        <h2 id="rr-explainer-title">How sea and weather become AmberScore</h2>
        <p class="rr-lead">Where are conditions most promising, and when is it worth heading out? RavRadar helps you compare coasts and times by bringing sea and weather forecasts together in one assessment.</p>
        <p>Three questions lie behind the map's colours: Could the waves have set material in motion? Has the current supported transport towards the coast? And how good are conditions for searching? The answers depend on the coast's orientation, conditions in the selected hour and what happened beforehand.</p>
        <div class="rr-note"><p><strong>AmberScore assesses the conditions — not the amount of amber.</strong> A score of 80 does not mean an 80 per cent chance of finding amber. It tells you that the model's signs are more promising overall than at a low score, not that the beach is necessarily full of amber.</p></div>
        <p>For quick trip planning: Choose beach or waders, compare places and times, and open the zone to read the explanation. Below, you can see what goes into the assessment.</p>
      </div>
      <nav class="rr-toc" aria-label="Contents of the explanation">
        <a href="#rr-data">Data</a><a href="#rr-coast">The local coast</a><a href="#rr-score">The score</a><a href="#rr-current">Current</a><a href="#rr-waves">Waves</a><a href="#rr-wind">Wind and search mode</a><a href="#rr-water">Water level</a><a href="#rr-history">Time and uncertainty</a><a href="#rr-map">The map</a><a href="#rr-zone">The zone</a>
      </nav>

      <section class="rr-chapter" id="rr-data">
        <p class="rr-kicker">1 · The data</p>
        <h3>From the providers' forecasts to your screen</h3>
        <p>RavRadar automatically retrieves forecasts for wind, waves, currents, water level and water temperature. DMI is the first choice. The different information comes from different weather and sea models; it is not measured by a weather station on every beach.</p>
        <p>Where the relevant DMI data is missing, certain information can be supplemented by Copernicus Marine and then Open-Meteo. A source is chosen for each individual piece of information, location and hour — not one provider for the whole of Denmark. Water level follows its own DMI data chain and is not filled in with a guess from the other sources.</p>
        <p>Before calculating, RavRadar checks, among other things, the data's source, location and time. Valid information is stored for reuse in a <em>cache</em>. This makes it possible to build on earlier downloads without freezing the forecast: Newer, valid data can take over according to the defined source priority.</p>
        <figure aria-label="From the providers' data to the user's map">
          <ol class="rr-process">
            <li><strong>Retrieve</strong>Weather and sea forecasts</li>
            <li><strong>Check</strong>Source, location and hour</li>
            <li><strong>Combine</strong>New and valid stored data</li>
            <li><strong>Calculate</strong>AmberScore for coast and hour</li>
            <li><strong>Display</strong>Map, times and explanations</li>
          </ol>
          <figcaption>When you visit the site, you read the completed forecast. Your visit does not trigger a new weather download from the providers.</figcaption>
        </figure>
        <p class="rr-source-links">About the providers' data: <a href="https://www.dmi.dk/friedata/dokumentation/data/forecast-data-wave-model-wam" target="_blank" rel="noopener noreferrer">DMI's wave model</a>, <a href="https://www.dmi.dk/friedata/dokumentation/data/forecast-data-storm-surge-model-dkss" target="_blank" rel="noopener noreferrer">DMI's sea model</a>, <a href="https://data.marine.copernicus.eu/product/BALTICSEA_ANALYSISFORECAST_PHY_003_006/description" target="_blank" rel="noopener noreferrer">Copernicus Marine</a> and <a href="https://open-meteo.com/en/docs/marine-weather-api" target="_blank" rel="noopener noreferrer">Open-Meteo</a>.</p>
      </section>

      <section class="rr-chapter" id="rr-coast">
        <p class="rr-kicker">2 · The local coast</p>
        <h3>The same current does not affect every coast in the same way</h3>
        <p>RavRadar's coastal map covers 210 zones with a total of 673 local coastal sections. A large zone can include coasts facing different directions. It is therefore not enough to say, for example, that an eastward current is good or bad throughout the area.</p>
        <p>Each coastal section has a defined point on land and one at sea. The direction from the sea point towards the land point defines what “towards land” means in that particular place. The current's direction is compared with this direction — not just with north, south, east and west.</p>
        <p>On a west-facing coast, the sea lies to the west, so an eastward current flows towards land. On an east-facing coast, the same current may flow away from land. This is why two nearby coasts can receive different assessments even when the provider's current data is similar.</p>
        <p>The providers' sea models calculate currents on a grid of points. RavRadar uses the relevant model data for the waters off the coastal section. It is still a model value — not a current meter placed exactly where you are standing with your amber net.</p>
      </section>

      <section class="rr-chapter" id="rr-score">
        <p class="rr-kicker">3 · AmberScore from 0 to 100</p>
        <h3>Three component assessments become one overall score</h3>
        <p>AmberScore ranges from 0 to 100. It starts with three component assessments, also from 0 to 100, that carry different weights in the overall result.</p>
        <figure>
          <div class="rr-weightbar" role="img" aria-label="AmberScore is weighted as 50 per cent current towards the coast over time, 30 per cent the waves' ability to move amber and 20 per cent search conditions">
            <span class="rr-transport">Transport<br>50 %</span><span class="rr-mobilisation">Movement<br>30 %</span><span class="rr-huntability">Searching<br>20 %</span>
          </div>
          <figcaption>The weighting is the model's working rule. It is not a documented percentage breakdown of the causes of real amber finds.</figcaption>
        </figure>
        <dl>
          <dt>Current towards the coast over time · 50 %</dt><dd>Has the current's course over time supported transport towards the coast or pulled in the opposite direction? The waves' course over time and direction provide a limited correction, but cannot replace the current.</dd>
          <dt>The waves' ability to move amber · 30 %</dt><dd>How strongly do wave energy and the course of wave activity suggest that available material may have been set in motion? This assesses the influence of the waves, not a count of amber.</dd>
          <dt>Search conditions · 20 %</dt><dd>How good are wind and wave conditions for the selected search mode: in the water with waders or on the beach?</dd>
        </dl>
        <div class="rr-example">
          <p class="rr-small">Calculation example with sufficient history — not current weather data</p>
          <p>Transport 70, wave influence 60 and search conditions 80 give:</p>
          <p class="rr-calculation">35 + 18 + 16 = 69</p>
          <p class="rr-small">Half of 70, 30 per cent of 60 and 20 per cent of 80. Here, the model's additional limits do not need to reduce the sum.</p>
        </div>
        <h4>Why is the final score not always just the sum?</h4>
        <p>Good conditions in one component should not simply be able to compensate for very weak conditions in another. The model therefore also has these limits:</p>
        <ul>
          <li><strong>A weak physical connection reduces the result.</strong> If transport or movement is very low, the weighted sum is reduced slightly. Good weather for searching alone cannot make the physical situation favourable.</li>
          <li><strong>Waders have an extra cap.</strong> The final score cannot exceed the search conditions component score. Another example: If the calculation before this cap gives 69, but search conditions only score 40, the waders score is at most 40.</li>
          <li><strong>Calculated depletion after an offshore current can bring the score to zero.</strong> If an actual period of outward-flowing current has brought the transport potential all the way down to zero, the final score is also set to zero. It is not enough for the current arrow to point slightly outwards or for earlier current data to be unknown.</li>
        </ul>
        <p>Finally, the score is displayed as a whole number. Missing history is handled separately; you can find that explanation under <a href="#rr-history">time and uncertainty</a>.</p>
      </section>

      <section class="rr-chapter" id="rr-current">
        <p class="rr-kicker">4 · The current's angle</p>
        <h3>A strong current is not enough on its own</h3>
        <p>Direction matters just as much. A current can be split into a component along the coast and a component across it. The cross-shore component — towards or away from land — is used to build up or reduce the transport potential.</p>
        <p>A current directly towards the coast gives the largest inward contribution at the same speed. An angled current gives less. A current exactly parallel to the coast gives no direct inward or outward contribution in this part of the model. That does not mean it has no physical significance; material can also move along a coast, but RavRadar does not track each piece of amber's route between neighbouring beaches.</p>
        <figure class="rr-angle-figure">
          <h4>How much of the current flows towards land?</h4>
          <p><strong>Water can move quickly without getting any closer to the beach.</strong> This happens when the current flows along the coast. That is why RavRadar considers not only the current's speed, but also its direction relative to the coast.</p>
          <p>In the figure, the water follows the blue arrow. We have chosen a speed of <strong>8 centimetres per second</strong> as a simple example. When you move the slider, you change only the direction — not the speed.</p>
          <p>When the arrow points directly towards land, all the movement is towards the coast. When it points at an angle, the movement is both along the coast and towards it. The water does not split into two currents; it is one angled movement that we describe in two directions.</p>
          <svg class="rr-angle-drawing" role="img" aria-labelledby="rr-angle-title rr-angle-desc">
            <title id="rr-angle-title">The current relative to the coast's orientation</title>
            <desc id="rr-angle-desc">A schematic drawing with sea on the left and land on the right. Change the angle below to see how much of a current flows across the coast.</desc>
          </svg>
          <div class="rr-angle-controls">
            <label for="rr-current-angle">Current angle from directly towards land: <strong id="rr-angle-value">45°</strong></label>
            <input id="rr-current-angle" type="range" min="0" max="180" value="45" step="15">
            <div class="rr-age-labels" aria-hidden="true"><span>0°<br>Towards land</span><span style="text-align:center">90°<br>Along the coast</span><span>180°<br>Away from land</span></div>
            <div id="rr-angle-result" class="rr-angle-result" aria-live="polite">Move the slider to see how much closer to or farther from the coast the water gets in one second.</div>
          </div>
          <div class="rr-angle-key"><span><i class="rr-key-line" aria-hidden="true"></i>The water's movement</span><span><i class="rr-key-line rr-key-projection" aria-hidden="true"></i>Movement towards or away from the coast</span></div>
          <figcaption>An illustrative example, not current weather data. The figure explains direction; it does not calculate AmberScore or the exact route of the amber.</figcaption>
        </figure>
        <p>The effect of the angle changes smoothly, not in fixed angle steps. At 45 degrees, the cross-shore speed is about 71 per cent of the total speed. A strong, angled current can therefore give a larger inward contribution than a very weak current directly towards land. Whether the contribution is large enough to count also depends on its strength.</p>

        <h4>Strength and duration work together</h4>
        <p>The transport potential is the model's memory of the current's course over time. Think of it as a container with room for 0–100 points: Current towards land can fill it, and current away from land can reduce the potential that has built up. It is not a container holding a known amount of amber.</p>
        <p>A brief moment of onshore current therefore does not automatically give a high score. Conversely, a favourable period does not necessarily lose its effect just because the current briefly turns. Both strength and duration count, and as older hours fall out of the memory, the assessment can also change.</p>
        <details class="rr-technical">
          <summary>The specific strength and point limits</summary>
          <p>The cross-shore speed must exceed 3 cm/s (0.03 m/s) to contribute. From 15 cm/s (0.15 m/s), it counts as full strength. Between the two limits, the strength contribution rises gradually. The limits apply in both directions.</p>
          <p>A fully time-weighted hour at full inward strength can add at most 10 points to the transport potential. An equivalent outward hour can subtract at most 8. Weaker cross-shore current and older, lower-weighted hours count for less. These are points in the transport potential — not 10 or 8 points directly on the overall AmberScore.</p>
          <p>There is therefore no single number of hours of onshore current that always gives a green score. Starting level, current strength, angle, age, wave history and search mode work together.</p>
        </details>
        <figure>
          <div class="rr-age" role="img" aria-label="Current history looks back 48 hours. The most recent 24 hours are fully weighted; older hours gradually receive less weight and no weight at 48 hours.">
            <div class="rr-age-old"><strong>Older current history</strong><br>Its influence decreases smoothly</div>
            <div class="rr-age-new"><strong>The most recent 24 hours</strong><br>Full time weighting</div>
          </div>
          <div class="rr-age-labels"><span>48 hours earlier</span><span>24 hours earlier</span><span>Time of the score</span></div>
          <figcaption>The current's memory. Wave memory follows different time rules and can reach further back.</figcaption>
        </figure>
      </section>

      <section class="rr-chapter" id="rr-waves">
        <p class="rr-kicker">5 · Waves</p>
        <h3>Waves can set material in motion</h3>
        <p>Amber may lie near the seabed, in nearshore deposits or among other material. Waves can help loosen and move it if it is available. RavRadar uses wave height and wave period as an indicator of this possibility.</p>
        <p>Wave height does not tell the whole story. The <em>wave period</em> — the time between waves — also matters. Two situations with the same wave height can therefore make different contributions. RavRadar uses them together as an indicator of wave energy, not as a direct measurement of what is happening at the seabed.</p>
        <p>Wave influence builds up gradually in the model and then decreases more slowly. Earlier wave activity can therefore still count after the sea has become calmer. This does not mean the model knows how long a particular piece of amber will stay in place.</p>
        <div class="rr-duo" aria-label="The two different roles of waves">
          <div><h4>What may have been set in motion?</h4><p>Waves contribute to the component score “The waves' ability to move amber”. Earlier wave activity can still count even after the sea has become calmer.</p></div>
          <div><h4>What is searching like now?</h4><p>The current waves affect search conditions. Large waves can therefore both increase the mobilisation signal and make the amber hunt itself more difficult.</p></div>
        </div>
        <p>The waves' course over time and direction also provide a limited correction to the transport component. It can reduce the current-supported contribution, but cannot create transport out of nothing. RavRadar does not calculate exactly where amber lands behind a particular sandbar.</p>
        <details class="rr-technical">
          <summary>How the model calculates wave energy and memory</summary>
          <p>The energy indicator is wave height multiplied by itself and then by wave period. Doubling the height therefore gives an indicator four times as large at the same period — but not an AmberScore four times as high. The indicator is first converted into a component value between 0 and 100.</p>
          <p>For build-up, the model uses a half-life of 4 hours, and for decline, 48 hours. This means that the gap to an unchanged new level halves in 4 and 48 hours respectively. It is a rule for the model's adjustment, not the lifetime of amber on the beach.</p>
        </details>
        <p class="rr-source-links">Background on wave height, energy and period: <a href="https://www.dmi.dk/hav-og-is/temaforside-monsterbolger/bolgeteori" target="_blank" rel="noopener noreferrer">DMI's explanation of waves</a>. RavRadar's time rules and weights are the model's own working rules.</p>
      </section>

      <section class="rr-chapter" id="rr-wind">
        <p class="rr-kicker">6 · Wind and search mode</p>
        <h3>Offshore wind is not the same as offshore current</h3>
        <p>Wind can affect the sea through waves, water level and currents. But wind direction alone does not tell you which way the modelled current flows. RavRadar therefore does not automatically award transport points just because the wind blows towards land.</p>
        <p>The wind's direct role in the score is in search conditions. More wind can make the water surface choppy, making it harder to see down to the bottom with an amber torch. The wind's indirect effect on the sea is reflected in the separate forecasts for waves, currents and other conditions — not in extra transport points for wind direction alone.</p>
        <h4>Why can beach and waders have different scores?</h4>
        <p>Because the same sea state is not equally suitable for both kinds of hunting. The waders assessment responds more strongly to difficult wind and wave conditions, and it has the cap described in the section on the score: Good transport conditions must not hide the fact that searching in the water is difficult. The beach assessment does not have this extra cap.</p>
        <p>In the waders assessment, wind is the governing factor, while waves can worsen search conditions further. You therefore cannot expect large waves to be offset by a favourable current direction. Always select the search mode you actually intend to use.</p>
        <p>A period of wave activity followed by calmer search conditions can therefore look promising in the model. This is not a rule that you should always wait until after windy weather, nor is it a promise that any amber remains.</p>
        <div class="rr-note"><p><strong>A green score is not a safety clearance.</strong> RavRadar does not assess your experience, local channels, sudden waves or a safe water depth. Search conditions and safety are not the same thing.</p></div>
      </section>

      <section class="rr-chapter" id="rr-water">
        <p class="rr-kicker">7 · The other sea information</p>
        <h3>Water level and temperature are useful — without adding extra points</h3>
        <h4>Water level</h4>
        <p>Water level helps you assess where the waterline and accessible search areas may be. Lower water can expose places that would otherwise be covered. Higher water can shift the active coastal zone inland. This is not in itself evidence that amber has arrived.</p>
        <p>The figure in centimetres describes the forecast water level — not the water depth where you are standing. It cannot tell you how far it is safe to wade out.</p>
        <p>The three-hour change looks ahead: It compares the selected hour with three hours later. A minus means lower water later; a plus means higher water. A low water level can therefore be rising, and a high one falling. The change is not just a measure of the tide.</p>
        <p>The three-hour change may be missing even when the water level for the selected hour is available. It also requires a valid forecast for the time three hours later.</p>
        <p>Water level does not directly add AmberScore points. However, if two times are exactly equal in score and history quality, lower water and then non-rising water can decide which waders time is highlighted. This does not change the score itself.</p>
        <h4>Water temperature</h4>
        <p>Water temperature is shown as extra information about the conditions. It does not give a separate bonus or penalty in the current score model. You should therefore not read a high score as an assessment of whether the temperature suits your trip.</p>
      </section>

      <section class="rr-chapter" id="rr-history">
        <p class="rr-kicker">8 · Time and uncertainty</p>
        <h3>An arrow shows a moment. The score also draws on the hours before it.</h3>
        <p>You can see a current arrow pointing away from land and still see a relatively high score. This may be because the preceding hours had a strong inward flow. You can also see an arrow towards land without a high score because the influence is still weak or brief, the waves have contributed little, or search conditions are poor.</p>
        <p>“History” means the hours before <em>the time you are looking at</em> — not necessarily before today. If you look at Monday's forecast on Friday, Monday's score may be based on the current forecasts for Saturday and Sunday. These are still forecasts, not weather that has already happened. Tuesday's weather is not used to explain Monday's score.</p>
        <h4>What does “Weather history building up” mean?</h4>
        <p>Missing weather data for the selected hour is different from missing knowledge of the hours before it. If necessary current inputs are missing, the score may be unavailable. If the current inputs exist but the earlier conditions are partly unknown, the model can show a cautious score together with a range.</p>
        <p>The range shows how much that missing history can affect the calculation. The displayed score starts from the cautious end. Unknown hours are not treated as documented zero current or calm wind. The range is neither a chance of finding amber nor an overall measure of all uncertainty in the weather and the amber hunt.</p>
        <p>Two places with almost the same score may therefore have different underlying data. Read the history indicator and range too, especially when comparing very close results.</p>
        <p>“History complete” therefore does not mean that all local conditions are known or that the forecast is certain. The model still does not know the local stock of amber or every condition right by the beach.</p>
        <p>A gap in one coastal section's current data does not have to remove the assessment for the whole zone. Other sections may still have valid scores. Check whether the zone information only covers part of the area.</p>
      </section>

      <section class="rr-chapter" id="rr-map">
        <p class="rr-kicker">9 · From calculation to map</p>
        <h3>Colours, arrows and the time slider show different things</h3>
        <p>The coast's colour shows AmberScore for the selected search mode and the displayed hour. Arrows show direction, while the colour combines several conditions and their course over time. The arrow and colour therefore do not have to tell the same simple story.</p>
        <div class="rr-bandlist" aria-label="AmberScore colours">
          <span><i class="rr-dot" style="--dot:#168252" aria-hidden="true"></i>75–100 · Good</span>
          <span><i class="rr-dot" style="--dot:#d7a107" aria-hidden="true"></i>55–74 · Moderate</span>
          <span><i class="rr-dot" style="--dot:#d77d20" aria-hidden="true"></i>35–54 · Weak</span>
          <span><i class="rr-dot" style="--dot:#ce4c40" aria-hidden="true"></i>0–34 · Poor</span>
          <span><i class="rr-dot" style="--dot:#3f4e53" aria-hidden="true"></i>No data · not a zero score</span>
        </div>
        <p>A star marks a particularly high model score, from 90 upwards. Neither the green colour nor the star tells you how much amber is actually there.</p>
        <dl>
          <dt>The blue arrow · current direction</dt><dd>Shows the direction in which the water moves in the model data. It is not a drawing of the amber's exact route.</dd>
          <dt>The white arrow · wind direction</dt><dd>Shows the wind's movement on the map. In the numerical display, wind is described using the usual convention: where it comes from. A westerly wind comes from the west and moves east.</dd>
          <dt>The time slider</dt><dd>Shows the map for another available forecast hour. The clearly displayed day, date and time tell you which moment you are viewing. “Now” returns the map to the current forecast hour.</dd>
        </dl>
        <p>The slider selects a forecast hour that has already been calculated. It does not change the score model or trigger a new weather download. How far ahead you can look depends on the hours available in the current forecast.</p>
      </section>

      <section class="rr-chapter" id="rr-zone">
        <p class="rr-kicker">10 · When you open a zone</p>
        <h3>Use the explanation — not just the big number</h3>
        <p>When a stretch looks interesting, open the zone to see what the assessment is based on. Start by checking the search mode, day and time. A good score on Monday morning does not necessarily mean a good score on Monday afternoon.</p>
        <dl>
          <dt>Why this score?</dt><dd>Explains the three component assessments for the place and time you are viewing. Here, you can distinguish between good transport conditions, earlier wave influence and conditions for searching now.</dd>
          <dt>Wind, waves, current, water level and temperature</dt><dd>Show the specific forecast information behind the assessment or as extra context. Use them to understand a change in the score — not as five equivalent point-scoring factors.</dd>
          <dt>History quality and range</dt><dd>Tell you whether the preceding conditions are sufficiently known or whether the displayed assessment is affected by missing history.</dd>
          <dt>Five-day forecast and best time</dt><dd>Help you compare the coming days and find the most promising available hour. The day's best time does not mean the whole day has the same score.</dd>
          <dt>The whole area and the best spot</dt><dd>A single coastal section can have good conditions even if the rest of the zone is weaker. The area assessment is not a simple average: It considers the best spot and how broadly the good conditions are supported across several coastal sections. The figure can therefore differ from the best local score.</dd>
          <dt>The technical explanation</dt><dd>Gives more insight into the calculation if you want to go further. You do not need to understand the technical fields to use the map and the ordinary explanations.</dd>
        </dl>
        <p>If you have moved the time slider and tap a zone on the map, the zone view follows the selected forecast hour. If, instead, you open a zone from the home page through the five-day forecast, the map's time selection resets to “Now”. The Current list continues to show conditions now. The time shown is therefore important when comparing views.</p>
        <h4>A simple way to plan your trip</h4>
        <ol class="rr-reading-steps">
          <li><strong>Choose your search mode.</strong> Start with beach or waders so the assessment matches your trip.</li>
          <li><strong>Compare places and times.</strong> Look at the map and the five-day forecast. Use the slider to check whether conditions around a promising time stay good or whether it is just one good hour.</li>
          <li><strong>Read the explanation in the zone.</strong> See what raises and limits the score, and how well the earlier conditions are known.</li>
          <li><strong>Check the forecast again before leaving.</strong> New provider data can change the assessment. At the coast, your own observations and an independent safety assessment are still necessary.</li>
        </ol>
      </section>

      <section class="rr-chapter">
        <p class="rr-kicker">11 · The important caveat</p>
        <h3>A good forecast is not the same as a beach full of amber</h3>
        <p>RavRadar does not see the current strandline debris, inspect the beach with a camera or know whether others have already collected the available amber. Nor does the model know the exact amount of amber in the seabed or all the local sandbars, channels and sheltered conditions.</p>
        <p>A green stretch can therefore be empty — even of strandline debris — and you can find amber at a low score. Different coasts do not have the same underlying abundance of amber either. The score assesses the conditions; it does not establish that one particular coast contains more amber than another.</p>
        <p>The model's weights, time rules and thresholds are chosen working rules, not constants of nature. AmberScore has not yet been calibrated to a particular chance of finding amber using a representative set of real trips. That is precisely why the number should be read as a way to compare opportunities, not as a guarantee of a find.</p>
        <div class="rr-note"><p><strong>In short:</strong> Use the map to find opportunities, the zone explanation to understand them and your own observations to assess the place. RavRadar helps with the decision — it does not determine what you find.</p></div>
      </section>
`,
  },
});
