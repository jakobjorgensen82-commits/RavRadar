import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const selfTest = args.includes('--self-test');

function parseArguments(values) {
  const outputIndex = values.indexOf('--output');
  const output = outputIndex >= 0 ? values[outputIndex + 1] : null;
  const source = values.find((argument, index) =>
    !argument.startsWith('--') && (outputIndex < 0 || index !== outputIndex + 1));
  return { input: source || null, outputPath: output };
}

const parsed = parseArguments(args);
const outputPath = parsed.outputPath;
const input = parsed.input || process.env.RAVRADAR_PUBLIC_DETAILS;

function runJson(script, scriptArgs = []) {
  const result = spawnSync(process.execPath, [script, ...scriptArgs], {
    cwd: process.cwd(),
    encoding: 'utf8',
    maxBuffer: 128 * 1024 * 1024,
  });
  if (result.status !== 0) throw new Error(script + ' fejlede: ' + (result.stderr || result.stdout));
  return JSON.parse(result.stdout);
}

const number = value => Number.isFinite(Number(value)) ? Number(value) : null;
const format = value => number(value) === null ? '-' : Number(value).toLocaleString('da-DK', { maximumFractionDigits: 2 });
const percent = (count, total) => total ? format(100 * count / total) + ' %' : '-';

function comparisonRow(label, analysis) {
  const comparison = analysis.oldVsCurrent;
  return '| ' + label
    + ' | ' + format(analysis.records)
    + ' | ' + format(comparison.legacyScore.mean)
    + ' | ' + format(comparison.currentScore.mean)
    + ' | ' + format(comparison.deltaCurrentMinusLegacy.mean)
    + ' | ' + format(comparison.changedBand)
    + ' |';
}

function candidateRow(label, comparison, scenarios) {
  return '| ' + label
    + ' | ' + format(comparison.mean)
    + ' | ' + format(comparison.meanDeltaFromB0)
    + ' | ' + format(comparison.changedLevel)
    + ' (' + percent(comparison.changedLevel, scenarios) + ')'
    + ' | ' + format(comparison.correlationToB0)
    + ' |';
}

function stageRow(label, stage, scenarios) {
  return '| ' + label
    + ' | ' + format(stage.meanDelta)
    + ' | ' + format(stage.minimumDelta) + ' til ' + format(stage.maximumDelta)
    + ' | ' + format(stage.changedLevel)
    + ' (' + percent(stage.changedLevel, scenarios) + ')'
    + ' |';
}

function describeScenario(mode, example) {
  const input = example.inputs;
  const direction = input.currentDirection === 90 ? 'strøm mod kysten'
    : input.currentDirection === 270 ? 'strøm væk fra kysten'
      : 'tværgående strøm';
  return (mode === 'waders' ? 'Waders' : 'Strand')
    + ': vind ' + format(input.wind) + ' m/s, bølge ' + format(input.wave) + ' m, strøm '
    + format(input.current) + ' m/s (' + direction + '), tidligere maksimum '
    + format(input.maxWind) + ' m/s og ' + format(input.maxWave) + ' m, hændelsesalder '
    + format(input.eventAge) + ' timer, lokale fælder ' + (input.coastFeatures ? 'ja' : 'nej')
    + '. Score ' + format(example.scores.from) + ' til ' + format(example.scores.to)
    + ' (' + (example.delta >= 0 ? '+' : '') + format(example.delta) + ').';
}

function selectExtreme(grids, stageKey, exampleKey, preferMaximum) {
  const values = grids.map(grid => ({
    mode: grid.mode,
    example: grid.processStageComparisons[stageKey][exampleKey],
  }));
  values.sort((left, right) => preferMaximum
    ? right.example.delta - left.example.delta
    : left.example.delta - right.example.delta);
  return values[0];
}

function buildReport(synthetic, observed) {
  const lines = [];
  lines.push('# RavScore: automatisk gammel/nuværende/kandidat-sammenligning');
  lines.push('');
  lines.push('**Datasæt:** ' + (observed.dataset.datasetId || 'ukendt'));
  lines.push('**Produktionsreference:** ' + (observed.dataset.productionReferenceAt || 'ukendt'));
  lines.push('**Scorepåvirkning:** Ingen. Rapporten er read-only og kan ikke ændre RavScore.');
  lines.push('');
  lines.push('## Hvad modellerne betyder');
  lines.push('');
  lines.push('- **Gammel:** 40 % jagtbarhed, 35 % transport og 25 % mobilisering med de observerede komponenter.');
  lines.push('- **Nuværende:** Produktionens 25/40/35 og aktive regler.');
  lines.push('- **Kandidat A:** glatte kurver og hændelseshukommelse, stadig 25/40/35.');
  lines.push('- **Kandidat B:** A plus særskilt levering og fastholdelse.');
  lines.push('- **Kandidat C:** B plus en mild, glat svageste-led-begrænsning på højst 25 %.');
  lines.push('');
  lines.push('## Rigtige produktionsposter: gammel mod nuværende vægtning');
  lines.push('');
  lines.push('| Udsnit | Poster | Gammel middel | Nuværende middel | Forskel | Skiftet niveau |');
  lines.push('| --- | ---: | ---: | ---: | ---: | ---: |');
  lines.push(comparisonRow('Alle zone-/timeposter', observed.analyses.zoneWinnerHourly));
  lines.push(comparisonRow('Aktuelle zonevindere', observed.analyses.zoneWinnerCurrent));
  lines.push(comparisonRow('Aktuelle kystdele', observed.analyses.currentParts));
  lines.push('');
  lines.push('Vigtigt: Dette er en ren vægtsammenligning på de samme observerede komponenter. Den måler ikke fundchance.');
  lines.push('');
  lines.push('## Kandidat A-C på det deterministiske scenariegitter');
  lines.push('');
  for (const grid of synthetic.grids) {
    lines.push('### ' + (grid.mode === 'waders' ? 'Waders' : 'Strand') + ' - ' + format(grid.scenarios) + ' scenarier');
    lines.push('');
    lines.push('| Model | Middel | Forskel fra nu | Skiftet niveau | Sammenhæng med nu |');
    lines.push('| --- | ---: | ---: | ---: | ---: |');
    lines.push(candidateRow('Gammel 40/35/25', grid.candidateComparisons.legacyAdditive, grid.scenarios));
    lines.push(candidateRow('Nuværende 25/40/35', grid.candidateComparisons.b0, grid.scenarios));
    lines.push(candidateRow('Kandidat A', grid.candidateComparisons.phaseDProcessA, grid.scenarios));
    lines.push(candidateRow('Kandidat B', grid.candidateComparisons.phaseDProcessB, grid.scenarios));
    lines.push(candidateRow('Kandidat C', grid.candidateComparisons.phaseDProcessC, grid.scenarios));
    lines.push('');
    lines.push('| Trinvis ændring | Middelforskel | Spænd | Skiftet niveau |');
    lines.push('| --- | ---: | ---: | ---: |');
    lines.push(stageRow('Nuværende til A: glatte regler/hændelse', grid.processStageComparisons.smoothRulesVsCurrent, grid.scenarios));
    lines.push(stageRow('A til B: levering/fastholdelse', grid.processStageComparisons.deliveryAndRetention, grid.scenarios));
    lines.push(stageRow('B til C: svageste led', grid.processStageComparisons.weakestLinkGate, grid.scenarios));
    lines.push('');
    lines.push('| Automatisk kontrolsituation | Antal | Nuværende | A | B | C |');
    lines.push('| --- | ---: | ---: | ---: | ---: | ---: |');
    for (const [id, label] of [
      ['easySearchLowMobilisation', 'Let at søge, svag mobilisering'],
      ['mobilisedPoorTransport', 'Mobiliseret, dårlig transport'],
      ['physicalOpportunityHardSearch', 'Fysisk mulighed, svært at søge'],
      ['balancedHigh', 'Alle led høje'],
      ['balancedLow', 'Alle led lave'],
    ]) {
      const archetype = grid.archetypes[id];
      const means = archetype.candidateMeans;
      lines.push('| ' + label + ' | ' + format(archetype.scenarios)
        + ' | ' + format(means.b0)
        + ' | ' + format(means.phaseDProcessA)
        + ' | ' + format(means.phaseDProcessB)
        + ' | ' + format(means.phaseDProcessC)
        + ' |');
    }
    lines.push('');
  }
  const extremes = [
    ['A: største stigning fra glatte regler/hændelse', selectExtreme(synthetic.grids, 'smoothRulesVsCurrent', 'largestIncrease', true)],
    ['A: største fald fra glatte regler/hændelse', selectExtreme(synthetic.grids, 'smoothRulesVsCurrent', 'largestDecrease', false)],
    ['B: største levering-/fastholdelsesløft', selectExtreme(synthetic.grids, 'deliveryAndRetention', 'largestIncrease', true)],
    ['B: største levering-/fastholdelsesfald', selectExtreme(synthetic.grids, 'deliveryAndRetention', 'largestDecrease', false)],
    ['C: største reduktion fra svageste fysiske led', selectExtreme(synthetic.grids, 'weakestLinkGate', 'largestDecrease', false)],
  ];
  lines.push('## Fem automatisk udvalgte yderpunkter');
  lines.push('');
  extremes.forEach(([label, value], index) => {
    lines.push((index + 1) + '. **' + label + ':** ' + describeScenario(value.mode, value.example));
  });
  lines.push('');
  const current = observed.analyses.currentParts;
  lines.push('## Automatisk udvalgte forhold, som kræver faglig vurdering');
  lines.push('');
  lines.push('1. Aktuelle kystdele med mindst middel totalscore, men et svagt fysisk led: '
    + format(current.conflicts.headlineFairWithWeakPhysicalStage.count) + ' af ' + format(current.records) + '.');
  lines.push('2. Let søgbare aktuelle kystdele med svag transport eller mobilisering: '
    + format(current.conflicts.easySearchWeakPhysicalChain.count) + ' af ' + format(current.records) + '.');
  lines.push('3. Mobilisering uden tilstrækkelig transport: '
    + format(current.conflicts.mobilisedPoorTransport.count) + ' af ' + format(current.records) + '.');
  lines.push('4. Transport uden tilstrækkelig mobilisering: '
    + format(current.conflicts.transportedLowMobilisation.count) + ' af ' + format(current.records) + '.');
  lines.push('5. Den tekniske kontrakt har '
    + format(observed.validation.weightMismatchCount + observed.validation.contributionMismatchCount + observed.validation.invalidScoreCount)
    + ' fejl i vægte, bidrag eller scoregrænser.');
  lines.push('');
  lines.push('## Foreløbig beslutningsregel');
  lines.push('');
  lines.push('Rapporten vælger ikke automatisk en vinder. Kandidat A-C er forskningspriorer med lav modelmodenhed. Før en produktionsændring skal vi især kontrollere, om B forbedrer levering uden at belønne passage, og om C reducerer fysiske paradokser uden at gøre én usikker variabel dominerende.');
  lines.push('');
  lines.push('A-C er testet på et bredt syntetisk gitter, fordi det offentlige produktionsdatasæt ikke bærer hele den rå hændelseshistorik, som de nye regler kræver. Gammel mod nuværende er derimod målt direkte på produktionsposterne. Komplette ture bruges senere til egentlig kalibrering.');
  lines.push('');
  const candidateBChanges = synthetic.grids.map(grid => grid.candidateComparisons.phaseDProcessB.changedLevel / grid.scenarios);
  const gateChanges = synthetic.grids.map(grid => grid.processStageComparisons.weakestLinkGate.changedLevel / grid.scenarios);
  lines.push('## Foreløbig anbefaling');
  lines.push('');
  lines.push('- Behold den aktive 25/40/35-model. Den tidligere 40/35/25-model ligger '
    + format(Math.abs(current.oldVsCurrent.deltaCurrentMinusLegacy.mean))
    + ' point højere i gennemsnit på de aktuelle kystdele, især fordi jagtbarhed tidligere fyldte mere.');
  lines.push('- Aktivér ikke A-C samlet nu. Kandidat B ligger tæt på den nuværende middelværdi, men ændrer niveau i '
    + format(100 * Math.min(...candidateBChanges)) + '-' + format(100 * Math.max(...candidateBChanges))
    + ' % af scenarierne. Gennemsnittet skjuler derfor en stor omfordeling.');
  lines.push('- C-gaten er nu afgrænset til mobilisering og levering. Den ændrer niveau i cirka '
    + format(100 * Math.min(...gateChanges)) + '-' + format(100 * Math.max(...gateChanges))
    + ' % og bør vurderes som et muligt sikkerhedsnet, ikke som en færdig model.');
  lines.push('- Næste faglige kontrol er de fem yderpunkter ovenfor, især om B belønner reel levering eller blot passage. Først derefter vælges enkelte kandidatregler til et nyt shadow-forsøg.');
  lines.push('');
  lines.push('Ingen geometri, land-/vandpunkter, U/V, datakildeprioritet eller produktionsscore er ændret.');
  return lines.join('\n') + '\n';
}

function fixture() {
  const comparison = {
    legacyScore: { mean: 50 },
    currentScore: { mean: 45 },
    deltaCurrentMinusLegacy: { mean: -5 },
    changedBand: 1,
  };
  const analysis = {
    records: 10,
    oldVsCurrent: comparison,
    conflicts: {
      headlineFairWithWeakPhysicalStage: { count: 1 },
      easySearchWeakPhysicalChain: { count: 2 },
      mobilisedPoorTransport: { count: 1 },
      transportedLowMobilisation: { count: 1 },
    },
  };
  const candidate = { mean: 45, meanDeltaFromB0: 0, changedLevel: 0, correlationToB0: 1 };
  const stageExample = {
    delta: 1,
    inputs: {
      wind: 4,
      wave: 0.5,
      current: 0.3,
      currentDirection: 90,
      maxWind: 12,
      maxWave: 1.5,
      eventAge: 8,
      coastFeatures: false,
    },
    scores: { from: 50, to: 51 },
  };
  const stage = {
    meanDelta: 0,
    minimumDelta: -1,
    maximumDelta: 1,
    changedLevel: 0,
    largestIncrease: stageExample,
    largestDecrease: { ...stageExample, delta: -1, scores: { from: 51, to: 50 } },
  };
  const archetype = { scenarios: 1, candidateMeans: { b0: 45, phaseDProcessA: 44, phaseDProcessB: 43, phaseDProcessC: 42 } };
  return {
    synthetic: {
      grids: [{
        mode: 'beach',
        scenarios: 10,
        candidateComparisons: {
          legacyAdditive: candidate,
          b0: candidate,
          phaseDProcessA: candidate,
          phaseDProcessB: candidate,
          phaseDProcessC: candidate,
        },
        processStageComparisons: {
          smoothRulesVsCurrent: stage,
          deliveryAndRetention: stage,
          weakestLinkGate: stage,
        },
        archetypes: {
          easySearchLowMobilisation: archetype,
          mobilisedPoorTransport: archetype,
          physicalOpportunityHardSearch: archetype,
          balancedHigh: archetype,
          balancedLow: archetype,
        },
      }],
    },
    observed: {
      dataset: { datasetId: 'fixture', productionReferenceAt: '2026-01-01T00:00:00Z' },
      validation: { weightMismatchCount: 0, contributionMismatchCount: 0, invalidScoreCount: 0 },
      analyses: {
        zoneWinnerHourly: analysis,
        zoneWinnerCurrent: analysis,
        currentParts: analysis,
      },
    },
  };
}

if (selfTest) {
  assert.deepEqual(parseArguments(['input.json']), { input: 'input.json', outputPath: null });
  assert.deepEqual(parseArguments(['input.json', '--output', 'report.md']), { input: 'input.json', outputPath: 'report.md' });
  const sample = fixture();
  const report = buildReport(sample.synthetic, sample.observed);
  assert.ok(report.includes('Kandidat A-C'));
  assert.ok(report.includes('Automatisk udvalgte forhold'));
  assert.ok(!report.includes('uMps') && !report.includes('vMps'));
  console.log('OK: den danske RavScore-ejerrapport er deterministisk og dataminimeret.');
} else {
  if (!input) throw new Error('Angiv public-condition-details.json eller RAVRADAR_PUBLIC_DETAILS.');
  const synthetic = runJson('scripts/audit-ravscore-sensitivity.mjs');
  const observed = runJson('scripts/audit-ravscore-observed-ablation.mjs', [input]);
  const report = buildReport(synthetic, observed);
  if (outputPath) {
    fs.writeFileSync(outputPath, report);
    console.log('RavScore-ejerrapport skrevet til ' + outputPath);
  } else {
    process.stdout.write(report);
  }
}
