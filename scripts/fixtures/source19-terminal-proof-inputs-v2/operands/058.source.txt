// Private native-fixture producer only. Never imported by a product caller.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { ravScoreModelBinding } from '../js/core/ravscore-model-contract.js';
import * as workflow from '../scripts/private-production-runtime-workflow.mjs';
import * as bundle from '../scripts/private-production-runtime-bundle.mjs';
import * as protectedRuntime from '../scripts/protected-private-production-runtime.mjs';
import * as readiness from '../scripts/integrated-cutover-readiness.mjs';
import { PRIVATE_WEATHER_COMPONENT_FILES } from '../scripts/lib/private-weather-component-inventory.mjs';
import { SOURCE_GATE_PRODUCERS } from '../scripts/lib/weather-source-gate.mjs';
import { PROTECTED_RAVSCORE_CHECKPOINT_DOCUMENT_KEY } from '../scripts/protected-ravscore-continuation-checkpoint.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const lf = value => value.replace(/\r\n/g, '\n');

const fixtureIdentity=Object.freeze({
  "schemaVersion": 1,
  "kind": "PRIVATE_SOURCE19_ACTUAL_S_ONLY_CP_ORIGINAL_H71_NATIVE_CALLER_D504_SUCCESSOR_FIXED_DIAGNOSTICS_OBSERVATION_V2_RESTORE_BOUNDS_V3_CONTINUITY_FIXTURE_V4_IMMUTABLE_B_V5_OFFLINE_SUFFIX_VIEW_V6_ACTUAL_MAIN579_INTEGRATION_V7_EXPLICIT_STATISTICS_SOURCE_SEED_V8",
  "sourceBase": "ccbf984611ed368891f8645cd833f44d02af1bf1",
  "parentProductIdentity": "aa2fa16afd79a45f43992b38735b7dbc80bbda44d3ca2a708ec0578d01ba0420",
  "progressOnlySuccessorSha256": "e6faf23edfba043177e4de2ae7ca69677b600f11dbefb4543265e131b72a549d",
  "productIdentity": "ed9f992551b768beafdd4d2ad27cdf1cb6f50cbe5edee4310d139be423701610",
  "pathCount": 27,
  "evidence": "LINUX_UNRUN_NO_ADMISSION",
  "scope": "ACTUAL_ACTION_NORMAL_PRELUDE_B_INSTALL_AUTHENTICATED_S_PACK_H71_NATIVE_MERGED_WORKING_INSTALL",
  "finalizer": "UNRUN_NORMAL_SAVE_TRANSPORT_AND_VALID_FULL_RUNTIME_MISSING",
  "cpOriginalPortSha256": "e32a3a6038502fe0a384ccdde71c385f476dde283c65c110e2f8d51afd1f9c17",
  "newSOnlyCpOriginals": "REQUIRED_REAL_OBJECT_AND_RECEIPT",
  "syntheticProviderInput": "EXPLICIT_OWN_EMPTY_STATIONS_DOCUMENT",
  "syntheticAdminInput": "EXPLICIT_OWN_EMPTY_DOCUMENTS",
  "sourceParent": "dbb16b65e4626aa55c3ab06f7f61ac4b60fb4c60",
  "frozenFixturePath": "scripts/test-source19-union-native-fixture.mjs",
  "frozenFixtureSha256": "a47a5ef9042c08da572c2e7c82bc8165cff9afe547975c4a7268c1fb2d7b6787",
  "successorCompositionId": "81ba8b9a448f5d475d019d5ce6c44dbd9fa3ee8bebeb9e4e4d816de2395f4dfa",
  "diagnosticBaseHead": "6969e3c161ff076640aa958247506f4eebfeb765",
  "diagnosticParentFixture": "scripts/test-source19-union-native-d504-fixture.mjs",
  "diagnosticParentSha256": "071b18ba7763a31452d00c4a1d4855b28e08227e48151a41c7ce67d9656775f6",
  "diagnosticCompositionId": "972618c2e0e139820f8547ca1183b7906988b0eda8d15c422a47eb4a95e2751a",
  "compositionId": "ab298b1cd26e3ca6a5303131da6ca8b0bba89db5cf451a923dbba805ba7f36bd",
  "diagnosticCompositionVersion": 2,
  "diagnosticV1CompositionId": "aa2fa16afd79a45f43992b38735b7dbc80bbda44d3ca2a708ec0578d01ba0420",
  "diagnosticObservationTest": "scripts/test-protected-private-production-runtime.mjs",
  "diagnosticObservationParentSha256": "ad4056293d74a98e15304dc8c13c680e46da7600df14db368fe40297167dedd0",
  "restoreBoundsCompositionId": "916ccf64aca16ffca20cca31a52dcae9fa8000cdb3ac5b3c7de1084db5001091",
  "restoreBoundsParentCompositionId": "972618c2e0e139820f8547ca1183b7906988b0eda8d15c422a47eb4a95e2751a",
  "restoreBoundsParentFixture": "scripts/test-source19-union-native-d504-diagnostics-fixture.mjs",
  "restoreBoundsParentSha256": "549f06d55b1bea3ecd8e1155d33ec49cf216697062b1b87612fca088004311f5",
  "restoreBoundsVersion": 3,
  "continuityCompositionId": "d9f38f656fbc4de5fe388c9a7b95b83e4b200f95283dbc8b821dd2fa91e2004e",
  "continuityParentCompositionId": "916ccf64aca16ffca20cca31a52dcae9fa8000cdb3ac5b3c7de1084db5001091",
  "continuityParentFixture": "scripts/test-source19-union-native-d504-restore-bounds-fixture.mjs",
  "continuityParentSha256": "510ebb1230b460be71fffcefa62c14def7116fe5a2fc05f7dbd8caa25dfe692a",
  "continuityVersion": 4,
  "syntheticMissingInput": "FULL_673_PART_NULL_CONTINUITY_AND_118_HONESTLY_MISSING_PUBLIC_HOURS",
  "immutableBCompositionId": "662b7058013388611b2e153a90e777b79419a0e1ae9da0cbb16cb0e804b3792d",
  "immutableBParentCompositionId": "d9f38f656fbc4de5fe388c9a7b95b83e4b200f95283dbc8b821dd2fa91e2004e",
  "immutableBParentProductIdentity": "5aebce851e38f0b247e933f8f9519ccc51aadf79f3b5e81435be8d7f6b73c76d",
  "immutableBParentFixture": "scripts/test-source19-union-native-d504-continuity-fixture.mjs",
  "immutableBParentSha256": "fb00652d695fd9e6237e3df6ae55375f525633cb194c96a0b75e27600e130164",
  "immutableBVersion": 5,
  "offlineSuffixCompositionId": "2a917d25e89809de71e170c618f3926885d548e704e5817149db6dbcb3055624",
  "offlineSuffixParentCompositionId": "662b7058013388611b2e153a90e777b79419a0e1ae9da0cbb16cb0e804b3792d",
  "offlineSuffixParentFixture": "scripts/test-source19-union-native-d504-immutable-b-fixture.mjs",
  "offlineSuffixParentSha256": "27dc1534ef2331ab36502bd5485f073c9de96ce81eb5e1d58e94e5fcf931bd7e",
  "offlineSuffixVersion": 6,
  "main579CompositionId": "ac872a7f0771df689e743ebb1b069bae7fa485724c05e0e198146b8e5c746cea",
  "main579SourceParent": "3b9c0de3ff6069d4f618a87877afa2d5a6edbea9",
  "main579MainParent": "d897f3eb88239db85389fb798ff5d960a02ed6d4",
  "main579MainTree": "d7343c62a8dc38cb6a9d07652906555f58500e7a",
  "main579ParentCompositionId": "2a917d25e89809de71e170c618f3926885d548e704e5817149db6dbcb3055624",
  "main579ParentFixture": "scripts/test-source19-union-native-d504-offline-suffix-fixture.mjs",
  "main579ParentSha256": "746edf1eae0d3d8499761f935adbf5afeff57119bc83d4bbbb6058bf321940f3",
  "main579Version": 7,
  "seedClosureCompositionId": "ab298b1cd26e3ca6a5303131da6ca8b0bba89db5cf451a923dbba805ba7f36bd",
  "seedClosureParentCompositionId": "ac872a7f0771df689e743ebb1b069bae7fa485724c05e0e198146b8e5c746cea",
  "seedClosureParentFixture": "scripts/test-source19-union-native-main579-fixture.mjs",
  "seedClosureParentSha256": "9b8ccad6e9a4b6fa27c5e2bd3362d2c3dccc3324217f401e48ef23cb60d98d24",
  "seedClosureAsset": "scripts/fixtures/statistics-preference-revision-input.json",
  "seedClosureAssetSha256": "4990770bb2b0ca4bbad5da97156b88a186ef6df95319415ca91819cef8ff49af",
  "seedClosureVersion": 8
});
const fixtureProductPins=Object.freeze({
  ".github/actions/save-owned-dmi-grib/index.cjs": "dd8bd752a5cef8c927db2c00e642ab240638e3ab10c56d9f57c9546ab4e02926",
  ".github/actions/save-owned-dmi-grib/package-lock.json": "920ad50fc3b7084879c1257d5b11e0e3ce52367b42f05871ffc68f8a66f66c47",
  ".github/actions/save-owned-dmi-grib/package.json": "27ec4c37add8a4fb54de05e6ceb797b42c95ff15dd84526b4aa326f64c073d99",
  "scripts/check-dmi-bulk-operational-ready.py": "0b8387364f936bf686f22806d3cf2fb88d61972cde7dcf73de265fceb95d68c4",
  "scripts/lib/copernicus_component_process.py": "aa832d73a46efd23c8466fb685fe034ad25acac44e26fcacf7fb26dca7e22e07",
  "scripts/lib/dmi-forecast-file.mjs": "467c1f8ffd6a9a8440deda6d201c0d9f9389e61dfb8441276748256c389af11f",
  "scripts/lib/private-weather-component-pack.mjs": "50ad83b417688848870e5ea772cb40a78ba51ae9b84c04556db3cf5b8b7d1b24",
  "scripts/lib/source-union-birth-journal.mjs": "896d5b52129580f3239c7be328a5a23404959567f380b221b15380e0acfcb423",
  "scripts/lib/source_union_birth_journal.py": "fe415bd438a7c89b63bb32f763121a703cb9680429e5684480cc873a3036ab44",
  "scripts/lib/verified-dmi-progress-inputs.mjs": "0ea08f33003a5a19dbea0cd7c208f441368fe437fa5c9c00d87451248beeb0e6",
  "scripts/lib/verified-protected-progress-components.mjs": "e32a3a6038502fe0a384ccdde71c385f476dde283c65c110e2f8d51afd1f9c17",
  "scripts/materialize-dmi-bulk-storage.py": "445eec99139717b5021b38a8d6d26de9520b8c74e173d45dc8d00605dcef1e82",
  "scripts/merge-verified-current-donor-banks.py": "f5f5dfd6ddb0c5d41ecb33652c5047b8825906a61de8c1f836ae564e31ae4671",
  "scripts/migrate-post-cutover-private-runtime.mjs": "1f9daed66722801bcd6b4e710fd0c2a70fc82e73da03443ab8012afbb5effb53",
  "scripts/prepare-historical-wave-predecessor-restore.mjs": "ada6fd0dcdd0ceff359e17e21b157b1dfec736def4c29ac95cb0f1c7484b8382",
  "scripts/private-production-runtime-workflow.mjs": "aec9f6ed9fef575e73ad51b63a166f8c6ffa6fcb28b29ea807ed43511ffe69f8",
  "scripts/protected-private-production-runtime.mjs": "8807ea819c8e4f53f8fa8977e185d7e3f66ea4d12413f49ff455fb14f02da5ae",
  "scripts/run-copernicus-weather-components.py": "ad775661c9b41a801bb73d792649e72436b43efa7cfae86e8af141989547460c",
  "scripts/run-dmi-bulk-supervised.py": "3572b4e8dde5a12c290999ef2b64d2c0d059a8e72a410e65270f96b318f8e877",
  "scripts/source-progress-union-consumer.mjs": "4cc33cc26be4988e5d580e5c6e1a9ba33721ef616a8f78b7af69fe02292942e3",
  "scripts/test-dmi-supervisor-parent-loss.py": "da53d801c19801ed7539d5561d2eb9b161b44452bc61bb35cc13fc3799e1f9a1",
  "scripts/test-owned-dmi-grib-save-native.py": "c31e1da21738d94d4fb7ff1faf7da3e71730518d0ea8006db6fc3e1f02982b6f",
  "scripts/test-protected-private-production-runtime.mjs": "ea544fe8a8fa017b80ec9e5beb7da7d3f478fd48976bf5372aeeb9fc554bac09",
  "scripts/test-weather-component-progress-workflow.mjs": "d0793d047155d80a1b9fd2edfb0d2a28e37923c10e3adc647f6958ef2ef80204",
  "scripts/verified-weather-source-handoff.mjs": "2c62ffa0d1733e1fbc6447ba54948e3f73ca3b6c7d21683d5682cb8de733a7a3",
  "scripts/weather-component-progress-cache.mjs": "e6faf23edfba043177e4de2ae7ca69677b600f11dbefb4543265e131b72a549d",
  "scripts/weather-source-gate.mjs": "3dbc78e87636f121c60c25904d97c42b79fb374adedf06ca9cb95dfbee33a3d6"
});
async function assertFixtureSourceIdentity() {
  const seedClosureParent=path.join(ROOT,fixtureIdentity.seedClosureParentFixture);
  const seedClosureParentStat=await fs.lstat(seedClosureParent);
  assert.ok(seedClosureParentStat.isFile()&&!seedClosureParentStat.isSymbolicLink()&&seedClosureParentStat.nlink===1,'SEED_CLOSURE_PARENT_REGULAR_SOURCE_REQUIRED');
  assert.equal(digest(lf(await fs.readFile(seedClosureParent,'utf8'))),fixtureIdentity.seedClosureParentSha256,'FROZEN_V7_FIXTURE_BYTES_CHANGED');
  const seedClosureAsset=path.join(ROOT,fixtureIdentity.seedClosureAsset);
  const seedClosureAssetStat=await fs.lstat(seedClosureAsset);
  assert.ok(seedClosureAssetStat.isFile()&&!seedClosureAssetStat.isSymbolicLink()&&seedClosureAssetStat.nlink===1,'SEED_CLOSURE_ASSET_REGULAR_SOURCE_REQUIRED');
  assert.equal(digest(lf(await fs.readFile(seedClosureAsset,'utf8'))),fixtureIdentity.seedClosureAssetSha256,'SEED_CLOSURE_ASSET_BYTES_CHANGED');
  const main579Parent=path.join(ROOT,fixtureIdentity.main579ParentFixture);
  const main579ParentStat=await fs.lstat(main579Parent);
  assert.ok(main579ParentStat.isFile()&&!main579ParentStat.isSymbolicLink()&&main579ParentStat.nlink===1,'MAIN579_PARENT_REGULAR_SOURCE_REQUIRED');
  assert.equal(digest(lf(await fs.readFile(main579Parent,'utf8'))),fixtureIdentity.main579ParentSha256,'FROZEN_V6_FIXTURE_BYTES_CHANGED');
  const offlineSuffixParent=path.join(ROOT,fixtureIdentity.offlineSuffixParentFixture);
  const offlineSuffixParentStat=await fs.lstat(offlineSuffixParent);
  assert.ok(offlineSuffixParentStat.isFile()&&!offlineSuffixParentStat.isSymbolicLink()&&offlineSuffixParentStat.nlink===1,'OFFLINE_SUFFIX_PARENT_REGULAR_SOURCE_REQUIRED');
  assert.equal(digest(lf(await fs.readFile(offlineSuffixParent,'utf8'))),fixtureIdentity.offlineSuffixParentSha256,'FROZEN_V5_FIXTURE_BYTES_CHANGED');
  const immutableBParent=path.join(ROOT,fixtureIdentity.immutableBParentFixture);
  const immutableBParentStat=await fs.lstat(immutableBParent);
  assert.ok(immutableBParentStat.isFile()&&!immutableBParentStat.isSymbolicLink()&&immutableBParentStat.nlink===1,'IMMUTABLE_B_PARENT_REGULAR_SOURCE_REQUIRED');
  assert.equal(digest(lf(await fs.readFile(immutableBParent,'utf8'))),fixtureIdentity.immutableBParentSha256,'FROZEN_IMMUTABLE_B_PARENT_BYTES_CHANGED');
  const continuityParent=path.join(ROOT,fixtureIdentity.continuityParentFixture);
  const continuityParentStat=await fs.lstat(continuityParent);
  assert.ok(continuityParentStat.isFile()&&!continuityParentStat.isSymbolicLink()&&continuityParentStat.nlink===1,'CONTINUITY_PARENT_REGULAR_SOURCE_REQUIRED');
  assert.equal(digest(lf(await fs.readFile(continuityParent,'utf8'))),fixtureIdentity.continuityParentSha256,'FROZEN_V3_FIXTURE_BYTES_CHANGED');
  const restoreBoundsParent = path.join(ROOT, fixtureIdentity.restoreBoundsParentFixture);
  const restoreBoundsParentStat = await fs.lstat(restoreBoundsParent);
  assert.ok(restoreBoundsParentStat.isFile() && !restoreBoundsParentStat.isSymbolicLink() && restoreBoundsParentStat.nlink === 1, 'RESTORE_BOUNDS_PARENT_REGULAR_SOURCE_REQUIRED');
  assert.equal(digest(lf(await fs.readFile(restoreBoundsParent, 'utf8'))), fixtureIdentity.restoreBoundsParentSha256, 'FROZEN_V2_FIXTURE_BYTES_CHANGED');
  const diagnosticParent = path.join(ROOT, fixtureIdentity.diagnosticParentFixture);
  const diagnosticParentStat = await fs.lstat(diagnosticParent);
  assert.ok(diagnosticParentStat.isFile() && !diagnosticParentStat.isSymbolicLink() && diagnosticParentStat.nlink === 1, 'DIAGNOSTIC_PARENT_REGULAR_SOURCE_REQUIRED');
  assert.equal(digest(lf(await fs.readFile(diagnosticParent, 'utf8'))), fixtureIdentity.diagnosticParentSha256, 'FROZEN_D504_FIXTURE_BYTES_CHANGED');
  const frozenFixture = path.join(ROOT, fixtureIdentity.frozenFixturePath);
  const frozenStat = await fs.lstat(frozenFixture);
  assert.ok(frozenStat.isFile() && !frozenStat.isSymbolicLink() && frozenStat.nlink === 1, 'FROZEN_FIXTURE_REGULAR_SOURCE_REQUIRED');
  assert.equal(digest(lf(await fs.readFile(frozenFixture, 'utf8'))), fixtureIdentity.frozenFixtureSha256, 'FROZEN_FIXTURE_BYTES_CHANGED');
  for(const [relative,expected] of Object.entries(fixtureProductPins)) {
    const file=path.join(ROOT,relative),stat=await fs.lstat(file);
    assert.ok(stat.isFile()&&!stat.isSymbolicLink()&&stat.nlink===1,'FIXTURE_PRODUCT_FILE_INVALID');
    assert.equal(digest(lf(await fs.readFile(file,'utf8'))),expected,'FIXTURE_COMPOSED_SOURCE_CHANGED:'+relative);
  }
  return fixtureIdentity;
}
const factoryPins = Object.freeze({
  factory: '458cca26ba913f507307f2316e194fb1e0ac0826e27c82c7bcc4a119007dd065',
  setup: '2b57d6cfdcf3e7f1b5646739a7abeb8967a57cabdab44f9272e68c03776b061f',
  central: '685e83586553d9fb9c78b2e60d8e7ec6dc188c0e4d23e30cf619b9f6e4fec08d',
  rpc: 'e2629990fd209c1cca3e4d9b792965474010aa906166e6dd08774c201a0a9cfa',
});
const syntheticAdminDocuments = Object.freeze({
  'direction-reviews': { schemaVersion: 1, zones: {} },
  rules: { schemaVersion: 1, rules: [] },
  'coastline-overrides': { overrides: {}, partOwnership: {}, disabledParts: {} },
});
async function write(root, relative, value) {
  const file = path.join(root, relative);
  assert.ok(file.startsWith(root + path.sep));
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, Buffer.isBuffer(value) || typeof value === 'string' ? value : JSON.stringify(value));
}

// Synthetic provider data only. All bundle/GCM/pack/INSTALL/H issuers remain
// the actual normal product functions in this independently pinned fixture.
const unionFixtureKey=Buffer.alloc(32,109).toString('base64');
const unionReference=target=>new Date(Date.parse(target)-3600000).toISOString();
async function prepareSource19UnionNativeData(output,target,python) {
  const {build}=await import('../scripts/build-public-coastal-parts-v2.mjs');
  await write(output,'synthetic-direction-reviews.json',syntheticAdminDocuments['direction-reviews']);
  await write(output,'synthetic-coastline-overrides.json',syntheticAdminDocuments['coastline-overrides']);
  const registry=await build({source:path.join(ROOT,'data/geometry-v2/active-national-coastal-parts'),
    output:path.join(output,'union-central-parts.json'),overrides:path.join(output,'synthetic-coastline-overrides.json'),
    directionReviews:path.join(output,'synthetic-direction-reviews.json'),zonesFile:path.join(ROOT,'data/zones.geojson')});
  const part=Object.entries(registry.zones).flatMap(([parentZoneId,rows])=>rows.map(row=>({...row,parentZoneId})))
    .find(row=>row.waterPoint[0]>=7.5&&row.waterPoint[0]<=10.5&&row.waterPoint[1]>=55.5&&row.waterPoint[1]<=58);
  assert.ok(part,'NORMAL_CENTRAL_NWS_FIXTURE_POINT_MISSING');
  const descriptor={partId:part.partId,parentZoneId:part.parentZoneId,waterPoint:part.waterPoint};
  const destination=path.join(output,'union-cp-originals'),request=path.join(output,'union-native-data-request.json');
  await write(output,path.basename(request),{kind:'SOURCE19_SYNTHETIC_NATIVE_UNION_DATA',part:descriptor,
    reference:unionReference(target),output:destination});
  execFileSync(python,['-I','-B','scripts/test-source19-union-native-data.py',request],{
    cwd:ROOT,env:{...Object.fromEntries(Object.entries(process.env).filter(([name])=>
      ['PATH','LD_LIBRARY_PATH','LIBRARY_PATH','LANG','LC_ALL','LC_CTYPE'].includes(name))),
      PYTHONUTF8:'1',PYTHONDONTWRITEBYTECODE:'1'},timeout:60000,stdio:'pipe'});
  return {directory:destination,part:descriptor,reference:unionReference(target)};
}
// Additive test-data constructor. No measured weather, score, READY or release
// completeness is invented; normal projection, pack and B/S guards stay intact.
async function prepareSource19UnionPublicHours(fixture,baseGeneration,output,native) {
  const {RAVSCORE_PUBLIC_FORECAST_HOURS}=await import('../js/core/ravscore-model-contract.js');
  const {resolvePublicRavScoreProfile}=await import('../js/core/ravscore-public-model.js');
  const {ravScoreVerifiedEvidenceTrust}=await import('../js/core/ravscore-evidence-trust-contract.js');
  const {buildPublicConditionDetails,buildPublicDeliveryDocument,compactJson,resolvePublicNationalForecast}=await import('../scripts/public-conditions-lib.mjs');
  const {buildPrivatePublicHourDeliveryPack,compactPrivateConditionsForPersistence,
    inspectPrivatePublicHourDeliveryPack,installPrivateConditionsAndHourPack}=await import('../scripts/lib/public-hour-delivery-pack.mjs');
  const registry=JSON.parse(await fs.readFile(path.join(output,'union-central-parts.json'),'utf8'));
  const binding=ravScoreModelBinding(),zones={},scoreZones={},parts={};
  for(const [zoneId,local]of Object.entries(registry.zones)){
    for(const part of local)parts[part.partId]={...part,id:part.partId,zoneId,current:null,hourly:[]};
    zones[zoneId]={current:{windSpeedMps:null,waveHeightM:null,currentSpeedMps:null,waterLevelCm:null,waterTemperatureC:null},
      forecast:{generatedAt:native.reference,hourly:[]}};
    scoreZones[zoneId]={expectedPartCount:local.length,scoredPartCount:0,currentReferenceAt:null,hourly:[]};
  }
  assert.equal(Object.keys(zones).length,210);assert.equal(Object.keys(parts).length,673);
  const full={...baseGeneration.conditions,zones,coastalParts:{schemaVersion:2,enabled:true,
    modelBinding:binding,evidenceTrust:ravScoreVerifiedEvidenceTrust(),scoreProfile:resolvePublicRavScoreProfile(),
    expectedPartCount:673,scoredPartCount:0,parts,zones:scoreZones}};
  const live=path.join(fixture.repository,'data/live'),pack=path.join(fixture.repository,'.cache/public-hour-delivery.pack');
  await write(fixture.repository,'data/live/coastal-parts-v2.json',registry);
  await write(fixture.repository,'data/zones.geojson',await fs.readFile(path.join(ROOT,'data/zones.geojson')));
  const details=buildPublicConditionDetails(full),detailsSha256=digest(compactJson(details));
  const publicManifest={datasetId:full.datasetId,generatedAt:full.generatedAt,productionReferenceAt:full.productionReferenceAt,
    coastalPartCount:673,ravScoreModelBinding:binding,publicConditionDetailsSha256:detailsSha256,
    detailDelivery:{schemaVersion:1,sourceDetailsSha256:detailsSha256,hours:{}}};
  // Same normal hour projection + descriptor shape used by writePublicDelivery
  // and test-public-hour-delivery-pack. Missing rows remain absent in each hour.
  for(let i=0;i<RAVSCORE_PUBLIC_FORECAST_HOURS;i++){
    const time=new Date(Date.parse(native.reference)+i*3600000).toISOString();
    const text=compactJson(buildPublicDeliveryDocument(full,details,publicManifest,'hour',time));
    const hash=digest(text),file=hash+'.json';
    await write(fixture.repository,'data/live/forecast/'+file,text);
    publicManifest.detailDelivery.hours[time]={path:'./forecast/'+file,sha256:hash,bytes:Buffer.byteLength(text)};
  }
  const stagedPack=pack+'.source19-stage',stagedConditions=path.join(live,'conditions.json.source19-stage');
  const built=await buildPrivatePublicHourDeliveryPack({liveDirectory:live,publicManifest,
    startupNationalForecast:resolvePublicNationalForecast(full),outputPath:stagedPack});
  const conditions=compactPrivateConditionsForPersistence(full,built.marker);
  await write(fixture.repository,'data/live/conditions.json.source19-stage',JSON.stringify(conditions)+'\n');
  await installPrivateConditionsAndHourPack({stagedConditionsPath:stagedConditions,conditionsPath:path.join(live,'conditions.json'),
    stagedPackPath:stagedPack,packPath:pack});
  assert.equal((await inspectPrivatePublicHourDeliveryPack({packPath:pack,conditions})).manifest.entries.length,RAVSCORE_PUBLIC_FORECAST_HOURS);
  return conditions;
}

async function prepareSource19UnionB(fixture,baseGeneration,output,target,python,native) {
  const {dmiWaterSourceFixture}=await import('../scripts/test-helpers/dmi-water-source-fixture.mjs');
  const {buildWaterSourceForecastIndex,packWaterSourceForecastContinuity}=await import('../scripts/lib/water-source-forecast-routing.mjs');
  const source={sourceKey:'tidewater:SOURCE19-PRIVATE-SYNTHETIC',stationId:'SOURCE19-PRIVATE-SYNTHETIC',
    sourceType:'forecast-point',name:'Private synthetic fixture only',point:[...native.part.waterPoint]};
  const hourly=Object.fromEntries([0,3,6].map(hour=>{
    const time=new Date(Date.parse(native.reference)+hour*3600000).toISOString();
    return[time,dmiWaterSourceFixture(source,time,20+hour,native.reference)];
  }));
  const original=buildWaterSourceForecastIndex([source],{generatedAt:native.reference,timeStrideHours:3,
    zones:{['SOURCE::'+source.sourceKey]:{hourly}}},native.reference);
  const sparse=structuredClone(original),missing=new Date(Date.parse(native.reference)+4*3600000).toISOString();
  assert.ok(sparse.get(source.sourceKey).hourly.some(row=>row.time===missing));
  sparse.get(source.sourceKey).hourly=sparse.get(source.sourceKey).hourly.filter(row=>row.time!==missing);
  const {DMI_FORECAST_HOURS,buildDmiForecastHourly,createDmiForecastRecord}=await import('../scripts/lib/dmi-forecast-store.mjs');
  const {packDmiPartContinuity,unpackDmiPartContinuity}=await import('../scripts/lib/dmi-part-continuity.mjs');
  const registry=JSON.parse(await fs.readFile(path.join(output,'union-central-parts.json'),'utf8'));
  const parts=Object.values(registry.zones).flat().map(({partId,waterPoint})=>({partId,waterPoint}));
  assert.equal(parts.length,bundle.PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY.expectedPartCount);
  assert.ok(parts.some(part=>part.partId===native.part.partId&&JSON.stringify(part.waterPoint)===JSON.stringify(native.part.waterPoint)));
  const missingHourly=buildDmiForecastHourly({generatedAt:native.reference,startAt:native.reference}).hourly;
  assert.equal(missingHourly.length,DMI_FORECAST_HOURS);
  for(const hour of missingHourly)for(const component of ['wind','wave','current','waterLevel','waterTemperature'])assert.equal(hour.sources[component].provider,'missing');
  const partRecords=new Map(parts.map(part=>[part.partId,createDmiForecastRecord({
    zoneId:'PART::'+part.partId,point:part.waterPoint,generatedAt:native.reference,hourly:missingHourly})]));
  const partContinuity=await packDmiPartContinuity(partRecords,parts,native.reference);
  const decodedParts=await unpackDmiPartContinuity(partContinuity,parts,native.reference);
  assert.equal(decodedParts.size,parts.length);
  for(const part of parts)assert.deepEqual(decodedParts.get(part.partId).hourly,partRecords.get(part.partId).hourly);
  const minimal={schemaVersion:2,generatedAt:native.reference,runtime:{nextZoneCursor:0},zones:{},partContinuity};
  const baselineForecast={...minimal,waterSourceContinuity:await packWaterSourceForecastContinuity(sparse,native.reference)};
  const progressForecast={...minimal,waterSourceContinuity:await packWaterSourceForecastContinuity(original,native.reference)};
  await write(fixture.repository,'data/live/dmi-forecast-cache.json',baselineForecast);
  await write(fixture.repository,'data/live/dmi-water-stations.json',{schemaVersion:1,stations:[]});
  // The old test-only createGeneration deliberately used arbitrary byte strings
  // in these files. Build a NEW own B through the normal bundle constructor;
  // never rewrite that already-created B or fake its manifest/hash binding.
  const conditions=await prepareSource19UnionPublicHours(fixture,baseGeneration,output,native);
  const spec=await workflow.buildPrivateRuntimeCreateSpec({repositoryRoot:fixture.repository});
  const bundlePath=path.join(fixture.privateRoot,'bundle-union-native');
  await bundle.createPrivateProductionRuntimeBundle({privateRoot:fixture.privateRoot,bundlePath,
    repositoryRoot:fixture.repository,...spec});
  return {...baseGeneration,bundlePath,conditions,union:{baselineForecast,progressForecast,native,
    expectedRecoveredSourceHours:1,syntheticProviderBytes:true}};
}
async function prepareSource19UnionCipher(fixture,generation,output,documents,python) {
  const {weatherComponentProgressCache,WEATHER_PROGRESS_CIPHER_PATH}=await import('../scripts/weather-component-progress-cache.mjs');
  const descriptor=documents.row().payload.current;
  assert.match(descriptor.bundleContentSha256,/^[0-9a-f]{64}$/);
  const basePath=path.join(output,'union-progress-base.json');
  const common={repositoryRoot:fixture.repository,basePath,repository:'fixture/repo',
    encryptionKey:unionFixtureKey,pythonExecutable:python,productionReferenceAt:generation.union.native.reference};
  const captured=await weatherComponentProgressCache({...common,mode:'capture-base',protectedBundleSha256:descriptor.bundleContentSha256});
  assert.equal(captured.captured,true);
  const baselineCp=await fs.readFile(path.join(fixture.repository,PRIVATE_WEATHER_COMPONENT_FILES.copernicusBank));
  const nativeProgress=path.join(generation.union.native.directory,'progress');
  const nativeProfile=JSON.parse(await fs.readFile(path.join(generation.union.native.directory,'native-union-profile.json'),'utf8'));
  assert.equal(nativeProfile.kind,'SOURCE19_REAL_SYNTHETIC_S_ONLY_CP_INPUTS');
  assert.equal(nativeProfile.cpSourceOnlyFiles.length,2);
  await write(fixture.repository,PRIVATE_WEATHER_COMPONENT_FILES.copernicusBank,await fs.readFile(path.join(nativeProgress,'bank.json')));
  await fs.cp(path.join(nativeProgress,'cache'),path.join(fixture.repository,'.cache/copernicus-components'),
    {recursive:true,force:false,errorOnExist:false});
  await write(fixture.repository,'data/live/dmi-forecast-cache.json',generation.union.progressForecast);
  const saved=await weatherComponentProgressCache({...common,mode:'save'});assert.equal(saved.saved,true);
  const body=await fs.readFile(path.join(fixture.repository,WEATHER_PROGRESS_CIPHER_PATH));
  await write(output,'union-progress.encrypted',body);
  await write(fixture.repository,'data/live/dmi-forecast-cache.json',generation.union.baselineForecast);
  await write(fixture.repository,PRIVATE_WEATHER_COMPONENT_FILES.copernicusBank,baselineCp);
  return {cpSourceOnlyFiles:nativeProfile.cpSourceOnlyFiles,kind:'SOURCE19_ACTUAL_GCM_PACK_SYNTHETIC_INPUT',relativePath:'union-progress.encrypted',
    bytes:body.length,sha256:digest(body),reference:generation.union.native.reference,
    protectedBundleContentSha256:descriptor.bundleContentSha256,baselineSha256:digest(await fs.readFile(path.join(fixture.repository,'data/live/conditions.json'))),
    expectedRecoveredSourceHours:generation.union.expectedRecoveredSourceHours,syntheticProviderBytes:true};
}


async function inventory() {
  await assertFixtureSourceIdentity();
  // Actual import closure plus explicitly named normal prelude/fixture assets,
  // not a checkout/revision copy and not an arbitrary external file selector.
  const names = new Set(['package.json', 'config.js',
    '.github/actions/save-owned-dmi-grib/index.cjs',
    '.github/actions/save-owned-dmi-grib/package.json',
    '.github/actions/save-owned-dmi-grib/package-lock.json',
    'scripts/run-owned-dmi-grib-save.py',
    'scripts/fixtures/statistics-preference-revision-input.json',
    'scripts/test-source19-union-native-main579-seed-fixture.mjs',
    'scripts/test-source19-union-native-main579-fixture.mjs',
    'scripts/test-source19-union-native-d504-offline-suffix-fixture.mjs',
    'scripts/test-source19-union-native-d504-immutable-b-fixture.mjs',
    'scripts/test-source19-union-native-d504-continuity-fixture.mjs',
    'scripts/test-source19-union-native-d504-restore-bounds-fixture.mjs',
    'scripts/test-source19-union-native-d504-diagnostics-fixture.mjs',
    'scripts/test-source19-union-native-d504-fixture.mjs',
    'scripts/test-source19-union-native-fixture.mjs',
    'scripts/test-source19-union-native-data.py',
    'scripts/test-protected-private-production-runtime.mjs',
    'scripts/test-integrated-cutover-readiness.mjs',
    'scripts/test-owned-dmi-grib-save-native.py',
    'scripts/test-copernicus-component-production.py',
    'scripts/test-copernicus-weather-components.py',
    'scripts/run-copernicus-weather-components.py',
    'scripts/lib/copernicus_component_process.py',
    'scripts/lib/copernicus-component-spatial-policy.json',
    'scripts/lib/dmi-marine-zone-exclusions.json',
    'scripts/refine-coastlines-constrained-4.0.48.py',
    'scripts/sync-admin-config.py', 'scripts/apply-central-zone-reviews.py',
    'scripts/build-public-coastal-parts-v2.mjs',
    'scripts/integrated-cutover-readiness.mjs',
    'scripts/protected-private-production-runtime.mjs',
    'scripts/private-production-runtime-workflow.mjs',
    'scripts/protected-ravscore-continuation-checkpoint.mjs',
    'data/zones.geojson', 'data/water-level-station-routing.json',
    'data/geometry-snapshots/zones-4.0.44.geojson',
    'data/geometry-snapshots/zones-4.0.47-generated.geojson',
    'knowledge/rav-assistant-public-v1.json',
  ]);
  for (const file of Object.keys(fixtureProductPins)) names.add(file); // Exact 27-file final composition closure, never a directory wildcard.
  for (const file of Object.values(workflow.PRIVATE_RUNTIME_CONTRACT_FILES).flat()) names.add(file);
  for (const file of readiness.REQUIRED_CUTOVER_MIGRATIONS) names.add('supabase/migrations/' + file.filename);
  for (const directory of ['data/admin', 'data/geometry-v2/active-national-coastal-parts']) {
    for (const entry of await fs.readdir(path.join(ROOT, directory), { withFileTypes: true })) {
      if (entry.isFile() && /\.(?:mjs|js|py|json|geojson)$/.test(entry.name)) names.add(directory + '/' + entry.name);
    }
  }
  const visited = new Set();
  while (visited.size < names.size) for (const file of [...names]) {
    if (visited.has(file)) continue;
    visited.add(file);
    if (!/\.(?:mjs|js|cjs|py)$/.test(file)) continue;
    if (file.startsWith('scripts/test-') && !file.endsWith('.py')
      && file !== 'scripts/test-source19-union-native-main579-seed-fixture.mjs') continue;
    const source = await fs.readFile(path.join(ROOT, file), 'utf8');
    if (file.endsWith('.py')) {
      const modules = new Set();
      for (const match of source.matchAll(/^\s*from\s+(\.[\w.]+|lib\.[\w.]+)\s+import\s/gm)) modules.add(match[1]);
      for (const match of source.matchAll(/^\s*from\s+(\.|lib)\s+import\s+([^\n]+)/gm)) {
        for (const name of match[2].replace(/[()]/g, '').split(',')) {
          const module = name.trim().split(/\s+as\s+/)[0];
          assert.match(module, /^[A-Za-z_]\w*$/, 'FIXTURE_LOCAL_IMPORT_FORM_UNSUPPORTED');
          modules.add(match[1] === '.' ? '.' + module : 'lib.' + module);
        }
      }
      for (const match of source.matchAll(/^\s*import\s+(lib\.[\w.]+)/gm)) modules.add(match[1]);
      for (const module of modules) {
        assert.ok(!module.startsWith('..'), 'FIXTURE_LOCAL_IMPORT_ESCAPES');
        const relative = module.startsWith('.')
          ? path.posix.join(path.posix.dirname(file), module.slice(1).replaceAll('.', '/') + '.py')
          : 'scripts/' + module.replaceAll('.', '/') + '.py';
        names.add(relative);
      }
      assert.ok(names.size <= 900, 'FIXTURE_SOURCE_INVENTORY_BOUND');
      continue;
    }
    for (const match of source.matchAll(/(?:from\s*|(?:import|require(?:\.resolve)?)\s*\(\s*)['"]([^'"]+)['"]/g)) {
      const specifier = match[1].split('?')[0];
      if (!specifier.startsWith('.')) continue;
      const relative = path.relative(ROOT, path.resolve(ROOT, path.dirname(file), specifier)).split(path.sep).join('/');
      assert.ok(!relative.startsWith('../') && !path.isAbsolute(relative));
      names.add(relative);
    }
    assert.ok(names.size <= 900, 'FIXTURE_SOURCE_INVENTORY_BOUND');
  }
  const files = [];
  for (const relativePath of [...names].sort()) {
    const stat = await fs.lstat(path.join(ROOT, relativePath));
    assert.ok(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1);
    const bytes = await fs.readFile(path.join(ROOT, relativePath));
    assert.ok(bytes.length < 32 * 1024 * 1024);
    files.push({ relativePath, bytes: bytes.length, sha256: digest(bytes) });
  }
  return { files, fixtureIdentity, head: execFileSync('git', ['rev-parse', 'HEAD^{commit}'], { cwd: ROOT, encoding: 'utf8' }).trim() };
}

async function prepare(output, target, python) {
  await assertFixtureSourceIdentity();
  assert.equal(new Date(target).toISOString(), target);
  assert.equal(Date.parse(target) % 3_600_000, 0);
  output = await fs.realpath(output);
  const sourceTestUrl = new URL('../scripts/test-protected-private-production-runtime.mjs', import.meta.url).href;
  const test = lf(await fs.readFile(fileURLToPath(sourceTestUrl), 'utf8'));
  const first = test.indexOf('const clone = value =>');
  const end = test.indexOf('\ntry {\n  await fs.mkdir(repository', first);
  const setupEnd = test.indexOf('\n  const baselineContracts =', end);
  const centralStart = test.indexOf('async function sourceNormalCurrentFixture() {');
  const centralEnd = test.indexOf('\nawait test(', centralStart);
  const factories = test.slice(first, end), setup = test.slice(end + '\ntry {'.length, setupEnd);
  const central = test.slice(centralStart, centralEnd);
  for (const [name, text] of Object.entries({ factory: factories, setup, central })) {
    assert.equal(digest(text), factoryPins[name], 'NORMAL_FIXTURE_SOURCE_CHANGED:' + name);
  }
  const args = { fs, os, path, crypto, process, Buffer, assert,
    PRIVATE_RUNTIME_FILES: workflow.PRIVATE_RUNTIME_FILES,
    PRIVATE_RUNTIME_CONTRACT_FILES: workflow.PRIVATE_RUNTIME_CONTRACT_FILES,
    ravScoreModelBinding, buildPrivateRuntimeCreateSpec: workflow.buildPrivateRuntimeCreateSpec,
    buildPrivateRuntimeExpectation: workflow.buildPrivateRuntimeExpectation,
    createPrivateProductionRuntimeBundle: bundle.createPrivateProductionRuntimeBundle };
  // ONLY the already-existing test data/store factories are extracted. Product
  // issuers/driver/ownership bodies are never extracted or rewritten.
  const fixture = await Function(...Object.keys(args), 'return (async()=>{\n' + factories + setup
    + '\nreturn { temp, repository, privateRoot, createGeneration, fakeDocuments, fakeStorage };})()')(...Object.values(args));
  try {
    const centralCode = central.replaceAll('import.meta.url', 'sourceTestUrl')
      .replace(/import\((['"])([^'"]+)\1\)/g, (_, quote, spec) => 'import(' + JSON.stringify(new URL(spec, sourceTestUrl).href) + ')');
    const centralRows = await Function('fs', 'crypto', 'assert', 'sourceTestUrl',
      centralCode + '\nreturn sourceNormalCurrentFixture();')(fs, crypto, assert, sourceTestUrl);
    const r = lf(await fs.readFile(path.join(ROOT, 'scripts/test-integrated-cutover-readiness.mjs'), 'utf8'));
    const rpcStart = r.indexOf('const databaseReadback = {'), rpcEnd = r.indexOf('\nlet rpcRequestBody = null;', rpcStart);
    const rpcCode = r.slice(rpcStart, rpcEnd);
    assert.equal(digest(rpcCode), factoryPins.rpc);
    const rpcArgs = { REQUIRED_CUTOVER_MIGRATIONS: readiness.REQUIRED_CUTOVER_MIGRATIONS,
      LATEST_RAVSCORE_BINDING_MIGRATION: readiness.LATEST_RAVSCORE_BINDING_MIGRATION,
      expectedPolicy: await readiness.expectedTripBindingPolicy(),
      expectedActiveAdmissionPolicy: await readiness.expectedTripActiveAdmissionPolicy(),
      expectedCheckpointContract: await readiness.expectedCheckpointCasContract() };
    const rpc = Function(...Object.keys(rpcArgs), rpcCode + '\nreturn { databaseReadback, checkpointDatabaseReadback };')(...Object.values(rpcArgs));
    const native=await prepareSource19UnionNativeData(output,target,python);
    const cp=native.directory;
    const bankBytes = await fs.readFile(path.join(cp, 'bank.json'));
    const bank = JSON.parse(bankBytes);
    assert.ok(bank.records.length > 0);
    const ledger = '{"synthetic":"SOURCE-install-only-selected-components"}\n';
    await write(fixture.repository, PRIVATE_WEATHER_COMPONENT_FILES.copernicusBank, bankBytes);
    await fs.cp(path.join(cp, 'cache'), path.join(fixture.repository, '.cache/copernicus-components'), { recursive: true });
    await write(fixture.repository, PRIVATE_WEATHER_COMPONENT_FILES.selectedComponents, ledger);
    const previous = new Date(Date.parse(target) - 3_600_000).toISOString();
    const baseGeneration = await fixture.createGeneration(0, { metadataOverride: {
      generatedAt: previous, productionReferenceAt: previous,
      weatherComponentInputs: { schemaVersion: 1, kind: 'PRIVATE_WEATHER_COMPONENT_INPUTS', sourceSelectionApplied: true,
        openMeteoBankSha256: null, copernicusBankSha256: bank.bankSha256, selectedComponentsSha256: digest(ledger) },
    } });
    const generation=await prepareSource19UnionB(fixture,baseGeneration,output,target,python,native);
    const expected = await workflow.buildPrivateRuntimeExpectation({ repositoryRoot: fixture.repository, targetReferenceAt: target, now: target });
    const documents = fixture.fakeDocuments(), storage = fixture.fakeStorage();
    const head = execFileSync('git', ['rev-parse', 'HEAD^{commit}'], { cwd: ROOT, encoding: 'utf8' }).trim();
    await protectedRuntime.publishProtectedPrivateProductionRuntime({ privateRoot: fixture.privateRoot,
      bundlePath: generation.bundlePath, repositoryRoot: fixture.repository, expected,
      now: target, sourceHead: head, request: documents.request, storage: storage.client });
    const union=await prepareSource19UnionCipher(fixture,generation,output,documents,python);
    const originals = [];
    const {PRIVATE_PUBLIC_HOUR_DELIVERY_PACK_FILE}=await import('../scripts/lib/private-weather-component-inventory.mjs');
    for (const descriptor of [...workflow.PRIVATE_RUNTIME_FILES,PRIVATE_PUBLIC_HOUR_DELIVERY_PACK_FILE]) {
      const bytes = await fs.readFile(path.join(fixture.repository, descriptor.relativePath));
      await write(output, 'originals/' + descriptor.relativePath, bytes);
      originals.push({ relativePath: descriptor.relativePath, bytes: bytes.length, sha256: digest(bytes) });
    }
    // The exact normal unpack confirms the CP source inventory, before any
    // actual SOURCE-action process is launched. This is not H ownership proof.
    const unpackRoot = path.join(output, 'unpacked-original');
    const packed = await import('../scripts/lib/private-weather-component-pack.mjs');
    const componentFiles = await packed.unpackPrivateWeatherComponentPack({ restoredRoot: fixture.repository,
      outputRoot: unpackRoot, conditions: generation.conditions, pythonExecutable: python });
    for (const file of componentFiles) {
      await write(output, 'originals/' + file.relativePath, await fs.readFile(file.sourcePath));
      originals.push({ relativePath: file.relativePath, bytes: file.bytes, sha256: file.sha256 });
    }
    const objectRows = [];
    for (const [key, bytes] of storage.objects) {
      const relative = 'objects/' + digest(key);
      await write(output, relative, bytes);
      objectRows.push({ key, relativePath: relative, bytes: bytes.length, sha256: digest(bytes) });
    }
    const admin = structuredClone(centralRows.centralRows);
    const adminMap = { 'water-level-station-routing': 'data/water-level-station-routing.json',
      'coastal-parts-v2-activation': 'data/geometry-v2/active-national-coastal-parts/manifest.json' };
    for (const [document_key, file] of Object.entries(adminMap)) admin.push({ document_key, version: 1,
      updated_at: target, payload: JSON.parse(await fs.readFile(path.join(ROOT, file), 'utf8')) });
    for (const [document_key, payload] of Object.entries(syntheticAdminDocuments)) admin.push({
      document_key, version: 1, updated_at: target, payload: structuredClone(payload) });
    admin.push({ document_key: 'dmi-water-stations', version: 1, updated_at: target,
      payload: { schemaVersion: 1, generatedAt: target, stations: [] } });
    for (const row of admin) row.updated_at ??= target;
    const policy = protectedRuntime.PROTECTED_PRIVATE_RUNTIME_POLICY;
    await write(output, 'protocol.json', { kind: 'SOURCE19_CP_INSTALL_NATIVE_SYNTHETIC_PROTOCOL', schemaVersion: 1,
      fixtureIdentity,
      head, target, admin, pointer: documents.row(), rpc, objectRows, originals, union,
      sourceJobName: SOURCE_GATE_PRODUCERS['.github/workflows/update-and-deploy.yml'].gates[0].job,
      checkpointDocumentKey: PROTECTED_RAVSCORE_CHECKPOINT_DOCUMENT_KEY,
      bucket: { id: policy.bucketId, name: policy.bucketId, public: false,
        file_size_limit: policy.maximumArchiveBytes, allowed_mime_types: [policy.mimeType] } });
    console.log(JSON.stringify({ fixturePrepared: true, realCpOriginals: componentFiles.filter(x => x.relativePath.endsWith('.nc')).length,
      fabricatedIssuer: false, sourceAdmission: false, realNetwork: 0 }));
  } finally {
    const owned = await fs.realpath(fixture.temp);
    assert.equal(path.dirname(owned), await fs.realpath(os.tmpdir()));
    assert.match(path.basename(owned), /^ravradar-protected-private-runtime-/);
    await fs.rm(owned, { recursive: true, force: false }); // Existing fixture-owned temporary root only.
  }
}

if (process.argv[2] === '--inventory' && process.argv.length === 3) console.log(JSON.stringify(await inventory()));
else if (process.argv[2] === '--prepare' && process.argv.length === 6) await prepare(process.argv[3], process.argv[4], process.argv[5]);
else throw new Error('FIXTURE_ARGUMENTS_INVALID');
