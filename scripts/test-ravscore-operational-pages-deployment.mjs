import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import {
  ravScoreModelBinding as integratedModelBinding,
} from '../js/core/ravscore-model-contract.js';
import {
  ravScoreModelBinding as candidateModelBinding,
} from './rollback-assets/ravscore-model-contract.js';
import {
  assertKnownSourceRepairBrowserClosure,
  computeSealedPublicImplementationClosureIdentity,
  verifyRavScoreOperationalPagesDeployment,
} from './verify-ravscore-operational-pages-deployment.mjs';
import {
  RAVSCORE_PUBLIC_BROWSER_CLOSURE_NORMALIZATION,
  RAVSCORE_PUBLIC_BROWSER_CLOSURE_SCHEMA,
  RAVSCORE_PUBLIC_BROWSER_EXECUTABLE_ENTRYPOINTS,
  RAVSCORE_PUBLIC_BROWSER_REQUIRED_MODEL_CONSUMERS,
  ravScorePublicEntrypointDescriptor,
} from './lib/ravscore-public-browser-closure.mjs';

const sourceHead = 'e'.repeat(40);
const productionReferenceAt = '2026-08-29T12:00:00.000Z';
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const canonical = value => Array.isArray(value)
  ? value.map(canonical)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]))
    : value;
const REQUIRED_CLOSURE = Object.freeze([...new Set([
  ...RAVSCORE_PUBLIC_BROWSER_EXECUTABLE_ENTRYPOINTS,
  ...RAVSCORE_PUBLIC_BROWSER_REQUIRED_MODEL_CONSUMERS,
])]);
const MODEL_CLOSURE = Object.freeze([
  'js/core/best-time-selector.js',
  'js/core/local-zone-score.js',
  'js/services/rav-assistant.js',
  'js/services/trip-evidence-public-adapter.js',
]);
// Genuine immutable implementation; every weather/score cell below is synthetic.
// The normal viewer and all product modules are imported whole and never hooked.
const FROZEN_594_FIXTURE_REF = '6ea7c72bbf15c2ff79179b13d69d4b7bf0cb2e55';
const FROZEN_594_FIXTURE_TREE = '51515275e13c281bddd72a903bcac47878198b95';
const FROZEN_594_FIXTURE_SOURCES = Object.freeze([
  {
    "path": "admin.html",
    "bytes": 2865,
    "gitBlob": "6358f6eadbcd0897333945c57a9b20b7103f89ee",
    "sha256": "37f4436cd2fc974d2434641f149039b1a7c0cce28d125b5930d163ff07a6b9b4"
  },
  {
    "path": "app.js",
    "bytes": 61191,
    "gitBlob": "23f748ecc8b0a82a9fdfc4e4146812b7918efc41",
    "sha256": "5a051b50c66c055c0e9e3af918266d68c42279fd7c994bf237e2e2e5fa643c82"
  },
  {
    "path": "bootstrap.js",
    "bytes": 1576,
    "gitBlob": "7dc752dcd8b1d59f3733cb26f2ae28eeb0831e70",
    "sha256": "bc8c51748dada81b3783937eef861043deb5339c5b280591cf5f900f25172304"
  },
  {
    "path": "config.js",
    "bytes": 379,
    "gitBlob": "1d8989418d4e85eacde80137b807d2723c49e188",
    "sha256": "7cb635a4fbfad6693774ecc776dd5df6bef024d59aba51c50eeab380fdc4ed0d"
  },
  {
    "path": "data/jordrav/context-20261006/profiles.json",
    "bytes": 19372,
    "gitBlob": "58aa3b581fef42537d1c4a7850313b66f779f504",
    "sha256": "bdfee755c5be9f0e80e0b4ecb2614ead6fd91980a5882250d01efdf563afe4a6"
  },
  {
    "path": "index.html",
    "bytes": 15262,
    "gitBlob": "f9e7e00f3f530db12ee327818b03098cf8b5579f",
    "sha256": "4744445e4aa348ba9e6177fcac15bdb271a33c9121557bd3b9b02271fa5e7e47"
  },
  {
    "path": "js/core/about-home-return.js",
    "bytes": 1061,
    "gitBlob": "9ff0473650b0d2aa9ce20fac0af106f62e715791",
    "sha256": "5c51be78cff4173df9edddcfb65175dd6291fb9598369b2b7d976d0d331fa403"
  },
  {
    "path": "js/core/adaptive-model.js",
    "bytes": 5870,
    "gitBlob": "99edd21ff047adc8ae33d7b12cb38fb121af0b40",
    "sha256": "9dfe107a9a35c8ba6459d2c1103c97054e7593f1efdb44136c771385c7a69faf"
  },
  {
    "path": "js/core/best-time-policy.js",
    "bytes": 6392,
    "gitBlob": "2cd94a73f89848a694b28ef776ced58db343b6ff",
    "sha256": "81c45d1b7d1da0c635c66c2f1bd39236ea42fd37d43fe9f72fc0f1d29850f899"
  },
  {
    "path": "js/core/best-time-selector.js",
    "bytes": 2611,
    "gitBlob": "510ee370b79b529da2122f170edd26e3250ba203",
    "sha256": "c8c3caec6d61abad48410e39021c6a11b1f90945436848b4b6c996532631f618"
  },
  {
    "path": "js/core/coastal-process-model.js",
    "bytes": 8758,
    "gitBlob": "70bdb22b0212c9ff089f81a8e66aee4c73e26a7f",
    "sha256": "dd04f8f1184b26336b66aab07badd2ee5606ea0c67242df19b40162a275d1687"
  },
  {
    "path": "js/core/coastline-editor-model.js",
    "bytes": 8017,
    "gitBlob": "f809be07da8fdc13f6873efc24a2fcd7d3546a23",
    "sha256": "e870114e43d83565e28f9a577bf9593d7ab876afb10caafd6016dd95930ab3b5"
  },
  {
    "path": "js/core/current-direction-audit.js",
    "bytes": 1729,
    "gitBlob": "5c642d5dc7f14267023c6ec4af737f821638ffc6",
    "sha256": "668d18b108e7bce448d928662b64eaaaac876d667949ebdb8dc25f9468650f59"
  },
  {
    "path": "js/core/debug-trace.js",
    "bytes": 892,
    "gitBlob": "7cce81d7c6b65b652d3c6447b67e85a149bf39c1",
    "sha256": "bed68c5a2031ec30b4acf2f9bc5fea20ec5ee21e206d7cfee7b0124caab8ad8e"
  },
  {
    "path": "js/core/direction-anchors.js",
    "bytes": 4429,
    "gitBlob": "daca276fb12429d384e8ea6a3d1d5c0870581db0",
    "sha256": "0003c0e5c5f13c344384f0bb5956a3b2f083b3f0d05f1e32e99eccc1426d6c85"
  },
  {
    "path": "js/core/forecast-calendar.js",
    "bytes": 2181,
    "gitBlob": "27156866e4404736d9b76e82c1853440147c4c25",
    "sha256": "7d1cb4e9dec2c072cf51fd08537aa5b870605f83345c341d92651e1a11f89658"
  },
  {
    "path": "js/core/free-text-rule-assistant.js",
    "bytes": 2728,
    "gitBlob": "82f41f6edc9924d553bb564e96b36f8eab4bb4d4",
    "sha256": "de23bfc3bffcc255476b0441c0daddfb368c701e9ac569e6b2abc366f3baee13"
  },
  {
    "path": "js/core/geographic-areas.js",
    "bytes": 4102,
    "gitBlob": "0fdc2235ec9c06fd07e45dfff586dc9e06723d1d",
    "sha256": "d022ce15f40c7d541c9c68021abe8517149407c88b754b284296bfcd1fcacd68"
  },
  {
    "path": "js/core/local-zone-score.js",
    "bytes": 19425,
    "gitBlob": "6d069b068de42ad85925c370ef9c29eaa319f7c5",
    "sha256": "07aa29f351766546a967867bb1873cd1bd55d197d13c02c8a1efa3b9c1135f27"
  },
  {
    "path": "js/core/phase-d-process-candidate.js",
    "bytes": 14109,
    "gitBlob": "db9d082b051ab5af1bcbc404610c69f8bd1ba800",
    "sha256": "d745f8ead7554bb0c63bd2f3740efff243ee761c99f86e93fc7276883a64fcfa"
  },
  {
    "path": "js/core/phase-d-wave-process-candidate.js",
    "bytes": 5223,
    "gitBlob": "c968fb74b00b7d568f0d2fed889345d2cb258d41",
    "sha256": "d5674b191d309c3b5f92b761b0c54a181057dadde54b6246633a47bae9d9a7fa"
  },
  {
    "path": "js/core/prediction-engine.js",
    "bytes": 3960,
    "gitBlob": "e0ade28fb998d7d1f9f9aba3cac925994dd1e28c",
    "sha256": "8a43cb50ce68a393e1b1de129fde39db41f6d4b974c2a74709ec97587e6eb928"
  },
  {
    "path": "js/core/public-delivery-contract.js",
    "bytes": 9266,
    "gitBlob": "af956d7bc66ecdd6d52a4d0d4ce3b287b1cf0618",
    "sha256": "0571025b79e74cf5c0c71d2356146da4a4c5159ee2571de7d45448361b85692d"
  },
  {
    "path": "js/core/public-page-resume.js",
    "bytes": 1914,
    "gitBlob": "c5e657b3e4e4499d4710c6e7e9474a2d636bdce1",
    "sha256": "5f10b77c43aaf4e3691970d0ad0c131c5b92295a4c46220222f11e03be9c5374"
  },
  {
    "path": "js/core/ravscore-candidate-g-state-pipeline.js",
    "bytes": 16255,
    "gitBlob": "57084ac2f486a67017a845bb7da5c414c3734625",
    "sha256": "fe4b7e7e8e4a07dcd74d1da0c3e566971df33e3ef418fd7f2fc3f1028008c3e7"
  },
  {
    "path": "js/core/ravscore-candidate-g.js",
    "bytes": 25702,
    "gitBlob": "9b33b4b228ce11fe761532b4d253203bcf611359",
    "sha256": "85fa35b8286386f2917a541b8d0c42b639d8117e67e00333201793da2f590e9f"
  },
  {
    "path": "js/core/ravscore-current-supply-memory.js",
    "bytes": 32847,
    "gitBlob": "86f1d369d02df60abe6368c7dd297fca890170fe",
    "sha256": "7e462b10982724d121ab1566a5fe497beb62f49b0f821bf768165af29e5401da"
  },
  {
    "path": "js/core/ravscore-evidence-trust-contract.js",
    "bytes": 3477,
    "gitBlob": "45f1cc37807498bef6b11c9d828071b7e5761e1f",
    "sha256": "81a8560d2c9e7b372a7e6608da80dab993b7249ca7ef1c573378e6e9303e9157"
  },
  {
    "path": "js/core/ravscore-huntability.js",
    "bytes": 4005,
    "gitBlob": "5a95211058b36b0ff871b3a408991e1909451b32",
    "sha256": "eabc93f7bf66d8daab6f29221d759c01ede4f3832a828da383cc864169d608d7"
  },
  {
    "path": "js/core/ravscore-integrated-explanation-presenter.js",
    "bytes": 37066,
    "gitBlob": "aa56cf5d7cb7552b2396bb9d9588567c15f7daf9",
    "sha256": "eec81708bf0db842c55811383126fb4f54e5e1578b2b9b9f8ff1a7fcc739dab9"
  },
  {
    "path": "js/core/ravscore-integrated-state-pipeline.js",
    "bytes": 99166,
    "gitBlob": "de16f3f32d10f5ce8e8ae1c2257edc47372bc331",
    "sha256": "b81dcc45ea939f54aaedffe60af90cf1709239941129057fe2007c12d1e27f2a"
  },
  {
    "path": "js/core/ravscore-integrated.js",
    "bytes": 27487,
    "gitBlob": "a91493211d7830ecd39fff9bef355c5deed617b6",
    "sha256": "ba041c23de74829cade71b679dc8a566befeb41140bf1ee3fa1ceefc6e803317"
  },
  {
    "path": "js/core/ravscore-mobilisation-memory.js",
    "bytes": 6749,
    "gitBlob": "4c4e4e4d1c62d5fd26fa63d05b5b3cc7cb3ee403",
    "sha256": "fdb8c104f6df2e31eba05ea1e31d844e5a376a9b754784793a79398843231031"
  },
  {
    "path": "js/core/ravscore-mode-huntability-research.js",
    "bytes": 3722,
    "gitBlob": "82342b6378da0143e7411fd1bb24d41ff050acf6",
    "sha256": "f40ef10d0ccf6ec8a4b22af5c33b87332bdff93ceb8ceba094807cfc6b04dc7c"
  },
  {
    "path": "js/core/ravscore-model-bundle.generated.js",
    "bytes": 16920,
    "gitBlob": "0b336df4fee5c2541e5ceebe6fe3acdf8dd14e05",
    "sha256": "37d27d1f5a199ef371124e2d06da1d8142b0734aafb6b8416242cf9d423cfa02"
  },
  {
    "path": "js/core/ravscore-model-contract.js",
    "bytes": 13790,
    "gitBlob": "251e476c24a278cdf24fcca37a8bac4f86e5c9c7",
    "sha256": "6edf369edf09b50005a0d04ce0ec892cf6455ddcea02ab4a7f2e51b644b8baab"
  },
  {
    "path": "js/core/ravscore-profile-switch.js",
    "bytes": 24065,
    "gitBlob": "bf918082c7862193d9df8c98bed625bfa7a65d42",
    "sha256": "446e6ba22f5d9c2b1aefc300890c950cdd95f158750f99cea3aa224df879c36b"
  },
  {
    "path": "js/core/ravscore-public-model.js",
    "bytes": 33663,
    "gitBlob": "b7c2d37cd0d9661c23aeafbe4e21baad10f9693b",
    "sha256": "08180f603fbc738bbc12201a10d043f4319c5008947ad90099cf63fddebbc983"
  },
  {
    "path": "js/core/ravscore-public-profile-contract.js",
    "bytes": 5565,
    "gitBlob": "99c90a387e825a2ee9dd1cbd5620710065d44010",
    "sha256": "ac011932b79b2ff5adf228e71882cdbea228b6fbc528887ccaa645d318dd86b4"
  },
  {
    "path": "js/core/ravscore-public-runtime-contract.js",
    "bytes": 34644,
    "gitBlob": "4caebd3c42b5e63168b6763e8aeffa5efc22348b",
    "sha256": "d1040e1fdd958584416b45fae6c5aa725db822a441b2b927d34858f2e089da5d"
  },
  {
    "path": "js/core/ravscore-public-weather-source-age.js",
    "bytes": 7151,
    "gitBlob": "841303a80ce361a27f29727e7ba09ec9cd42a11b",
    "sha256": "e06902c660ad0337be478c5d9140c59cc0477164caa50efb5c9dc3b9f3faca26"
  },
  {
    "path": "js/core/ravscore-regime-memory.js",
    "bytes": 36237,
    "gitBlob": "90e9a19af406e5d4755e227f0814f44b87a325b3",
    "sha256": "fd361b0b0d5cbb6bf7d7af632aad070be7c3e49dd4870837476bc96fe3f1cb22"
  },
  {
    "path": "js/core/ravscore-time.js",
    "bytes": 1550,
    "gitBlob": "65786c3044d3b5ce0a024d368eda286a058853db",
    "sha256": "b2311b8f2426968da59b387096522c29a191c4640afe39913ec0ae0c5b0272fa"
  },
  {
    "path": "js/core/ravscore-wave-approach-state.js",
    "bytes": 15550,
    "gitBlob": "0d60b888931800eb0249f44e17c7e983398b37f0",
    "sha256": "6900c089a30e3036dcb05ef1c985b71299c2c408257deea37f18fdbcbcba4e2c"
  },
  {
    "path": "js/core/ravscore-wave-mobilisation-state.js",
    "bytes": 22009,
    "gitBlob": "3794d40770ec15d411eeb748ba7ff5bf47d1d209",
    "sha256": "f845fdaa95733b1b57fd7b53b085e3b9d5e60ea431ac84072b442d07aa89fb35"
  },
  {
    "path": "js/core/rule-engine.js",
    "bytes": 4305,
    "gitBlob": "8d3215c3dea4dc1368822331575d963c635a5404",
    "sha256": "e7ca43742abd156f586d367081c8975352bc8a1ee084fd12173ba5ac889ab1e3"
  },
  {
    "path": "js/core/score-candidates.js",
    "bytes": 4524,
    "gitBlob": "324bf310c1816cb3cbd0a1d037bae1e1579ff332",
    "sha256": "12c880bdd952599e6e70df756b1f8d275148b2060ecfc1e281a6cc26cf42ff7b"
  },
  {
    "path": "js/core/score-engine.js",
    "bytes": 19093,
    "gitBlob": "da52b07033df6922a95bd43f2e4f8b501ec52aab",
    "sha256": "ef6691c1347511d39efde65d0c198c2d12cf83e81bcbb4689f23147d79126a90"
  },
  {
    "path": "js/core/score-presentation.js",
    "bytes": 746,
    "gitBlob": "1c76f74b1c4379198776764ffcb61ed7d1b4a261",
    "sha256": "b8d8fe611b42eb1114e2d42a6cf5e8cc32fef8e6de59ae86baf10b15c15ef75f"
  },
  {
    "path": "js/core/water-station-routing.js",
    "bytes": 6653,
    "gitBlob": "2517c9586c2966659304d6956de12ed3e26775af",
    "sha256": "46a0930e382fcbefb08c4e1f66868cc54f91396b7bbaa6243c1ca88ba6e7434b"
  },
  {
    "path": "js/core/wave-approach.js",
    "bytes": 3626,
    "gitBlob": "ee2431f7c3edc95dfe2e3eca4229c414a322cfa2",
    "sha256": "1dda08cdd8e8e0eedbd5e426237372e2dba3c076af4da26f757066fb91d5076c"
  },
  {
    "path": "js/core/zone-ranking.js",
    "bytes": 5240,
    "gitBlob": "949e7e29505bea3a47cac4e5e4896f0b3fc92f24",
    "sha256": "6a672a90255894357ec0b5985da474d314b502f21b4e5f0b7bea1e1c1c0ea464"
  },
  {
    "path": "js/i18n.js",
    "bytes": 127262,
    "gitBlob": "02c2cdd3a7e293b42804970887cf02e7533233b9",
    "sha256": "d0ac1b3e3e3874fd88e828aa1805364b7f47023a0b527165ad8f59bd26acefe8"
  },
  {
    "path": "js/jordrav/accessibility.js",
    "bytes": 1188,
    "gitBlob": "b6e7c8dbeaa5e11e7825904e678bff8badf79be0",
    "sha256": "af2e405f37735c53f8770f8466d4ca2f9a8d6be060523ec4539f53a6f32a8b7e"
  },
  {
    "path": "js/jordrav/context-messages.js",
    "bytes": 26741,
    "gitBlob": "805ea1dc5938d7158ab8a616f4b9734554fc022a",
    "sha256": "faafadbf833e66a3ee7af0234d03d48e919bed66568da66adb77439cae1a2e15"
  },
  {
    "path": "js/jordrav/data-service.js",
    "bytes": 6307,
    "gitBlob": "08d235e3656678c3ff5e1938c1121ec9846e7c74",
    "sha256": "81ecb4ecf74e3c5fa50f202597f2e19bb7308c352d61572798340d556b76fa45"
  },
  {
    "path": "js/jordrav/dataset-binding.js",
    "bytes": 322,
    "gitBlob": "0c03c70e491ab8c97089cc73fc15d5c6f41db8ed",
    "sha256": "8b1a5c73fbd94ce9d075ed6dd64712a12d696ee86e62ff6b476c8b2b9fb611a4"
  },
  {
    "path": "js/jordrav/evidence-chain.js",
    "bytes": 1614,
    "gitBlob": "c6e2d18923823f7dbe54665bd3e1cd366937bad7",
    "sha256": "ff9c0e9f01670b4756b407d18c08715a26fc4616b4e969b4586de7b93eb2ba44"
  },
  {
    "path": "js/jordrav/field-context.js",
    "bytes": 2317,
    "gitBlob": "c64d74e5b2c419582b82bfecc83dc0b15c094e90",
    "sha256": "5b06eb84d0bf0f6c1c69c1388e2ddf01186b4c0d8d8a0ab57f6504d11c9f4ba9"
  },
  {
    "path": "js/jordrav/landscape-context.js",
    "bytes": 3551,
    "gitBlob": "6e669d35db3d06f7b4b2b2d4636069eceb8dc15e",
    "sha256": "c400aabbfdc909da087e96037b481113debb94dc96a47ef7655c77929210114b"
  },
  {
    "path": "js/jordrav/layer-access.js",
    "bytes": 1812,
    "gitBlob": "b762c7076c6ec034b56f0618b8395e215c3012e6",
    "sha256": "2a9d689aaf887aabbb8546dc6137a0c4052b3cc6929346dfad3b9113e9c57224"
  },
  {
    "path": "js/jordrav/map.js",
    "bytes": 35112,
    "gitBlob": "1287491da972cb923d51642ab25dcd76ac408182",
    "sha256": "42364fe193efbaef1bc66fa943b4600f94b5623a91b787fcde05deb94b820981"
  },
  {
    "path": "js/jordrav/messages.js",
    "bytes": 110123,
    "gitBlob": "c5d6c0b6ff5f959a123700b39ade5643cac19349",
    "sha256": "1369dc726407674c6544ab0a5fac8b37fcb9f9535d85bee794a53df3703f3946"
  },
  {
    "path": "js/jordrav/profile-examples.js",
    "bytes": 2266,
    "gitBlob": "8b01f19374ccc76605bfd21d4515c4d4eae53ffa",
    "sha256": "ce910aebf4182b1186c3d212541672ca9c5fb394838734164c3739dbdada1db5"
  },
  {
    "path": "js/jordrav/public-context.js",
    "bytes": 9264,
    "gitBlob": "9ac731b69d93c23ff432c4123b5966ab60a81407",
    "sha256": "efacbc9315bdb02df3ec2c33bda9f389550628186b7a438f5cf5259a6a28b155"
  },
  {
    "path": "js/jordrav/regional-hypotheses.js",
    "bytes": 23929,
    "gitBlob": "29a8f5691d385424831f02661f2484b69fd1f6f5",
    "sha256": "ec9da8c58ac068ea8cc9b632a98348ae889eb000063f26abb871dd8658d2628d"
  },
  {
    "path": "js/jordrav/search-context.js",
    "bytes": 2385,
    "gitBlob": "727ab64256701d81057d41b9c99967a3ed588a9d",
    "sha256": "06672b010b88bdd96ee5d828079b26990b2b1b1edef962d04eb070607efdb212"
  },
  {
    "path": "js/jordrav/view-state.js",
    "bytes": 3555,
    "gitBlob": "d4194bf148f2cbfb8f3e9b32dd8edaf97ce69e17",
    "sha256": "271a8f71eb42ebb89d19a25aee90cdd73e72985d1526710548f56aeaa0f2ffc3"
  },
  {
    "path": "js/map/current-arrow-land-mask.js",
    "bytes": 6900,
    "gitBlob": "bf4c818d08da8256911b8fdd484c7c523f4fcabd",
    "sha256": "d35060c6e4ee4a72a3ba38082cc22428fc0d8f9769339f8f7be1e4b99320644e"
  },
  {
    "path": "js/map/map-view.js",
    "bytes": 27242,
    "gitBlob": "3fc63ed0ce0324f04da04382983fff1caf1766ad",
    "sha256": "e3a91cd91bc376e59e4e4691ff6449f6c84a193761417c3cfdba0253603dbd8f"
  },
  {
    "path": "js/map/public-coast-projection.js",
    "bytes": 1604,
    "gitBlob": "3f57990fc671dc747b7465a08dcfc8b203c9150b",
    "sha256": "491a6d2598a5ddd086c589eae78118a503e1b079d32cd1da8eef58382f507f69"
  },
  {
    "path": "js/services/account-trip-report-contract.js",
    "bytes": 5067,
    "gitBlob": "443f08fe8c887492c3300606fb96d81378be26da",
    "sha256": "785d526ed22152240e52fbea46ec75fab0761f6a017eb2d81c7ec14799242bfa"
  },
  {
    "path": "js/services/admin-account-categories.js",
    "bytes": 2625,
    "gitBlob": "52e6224468dd8240875b108135db3bc9026f92cf",
    "sha256": "9067ad39e04bbc6ed3d7cfcefe54d231db82a2a1e1f757aaf61e508afeacd1a3"
  },
  {
    "path": "js/services/admin-document-store.js",
    "bytes": 5303,
    "gitBlob": "2179b927661f1296dfbf0420d3cb02b62b3b158d",
    "sha256": "aa72b1b3b36a9016a5ba6bf96af96a0160bcf372790d4d569a6bfd06420fc931"
  },
  {
    "path": "js/services/admin-trip-count.js",
    "bytes": 1874,
    "gitBlob": "2ff49333989c7567b646503b4d965bfc81c1aa00",
    "sha256": "c2f4ed0c1f51c9c6b4c0a4e37e450f8b12f258d47a2fa4360e072273877d85f2"
  },
  {
    "path": "js/services/app-update-flow.js",
    "bytes": 5380,
    "gitBlob": "c7aa78ee5333f6aa78d0a1c42dc585b041517453",
    "sha256": "6392f0d00f313adeb287e557c9ec812b01957d33351ce19c68646c96550c37c7"
  },
  {
    "path": "js/services/auth-service.js",
    "bytes": 17277,
    "gitBlob": "4edb6f34b06d5cb27cd8330c215a11b56c32c377",
    "sha256": "e5a24622da00da63d4f4e7015faac67727e151ff5301b09ff835f7749c91b78f"
  },
  {
    "path": "js/services/calibration-eligibility.js",
    "bytes": 36418,
    "gitBlob": "9c34d0820f40654337ec7577a658b7f52c9047e2",
    "sha256": "30c37a9a4ea6dee8b16312cf7509e30064b6087bfcf9ceeca366201f1b292b72"
  },
  {
    "path": "js/services/data-service.js",
    "bytes": 80875,
    "gitBlob": "7718e65f7c2e13e944789d0a33b0fb3c2d90e4ce",
    "sha256": "d8ecd7709b01ea6d6bb3fcd06235acab50e68b6f4c119341e3624af195863145"
  },
  {
    "path": "js/services/forecast-share-contract.js",
    "bytes": 7580,
    "gitBlob": "9f14a99b1dd20e53ddf4857c406a636790eea526",
    "sha256": "8e56531098a165ef7e8eb63f1683b2b660ddf4c4db026b33d3860acd1852d373"
  },
  {
    "path": "js/services/forecast-share-projection.js",
    "bytes": 12084,
    "gitBlob": "27a6f8972d0e9fb5cf145b43fd1eea61fb14b754",
    "sha256": "ab8b6ab2d6e59d93e3834e4cbc2683dc716d2147c9c3847b75741df1339b7155"
  },
  {
    "path": "js/services/handbook-review-store.js",
    "bytes": 8610,
    "gitBlob": "fa91a4acd062e6cddf2a3412409ff81cb3c522a9",
    "sha256": "0bda47c3e744fd9135af7ba534900fdada39139ac26dfd7e56331e8dbac98ff9"
  },
  {
    "path": "js/services/historical-analysis.js",
    "bytes": 2020,
    "gitBlob": "8a30366430720223486cc40c56b35d966b1304c9",
    "sha256": "62da45b1351c90be41a3201c86a4a994f5fa5d760e4f542dea96bb7a04207622"
  },
  {
    "path": "js/services/html-sanitizer.js",
    "bytes": 1906,
    "gitBlob": "e92cffa7bcfc5c8dafd8dd9f2bc1cf543e86b7c0",
    "sha256": "b19e49b9a67497749447669b3da4709645d9cafe6b91f92234c2dee399be42a7"
  },
  {
    "path": "js/services/learning-analysis.js",
    "bytes": 3842,
    "gitBlob": "7dc154efe506bcf2e8f5b9df3e05c34e6d4af79c",
    "sha256": "4764f48af0792d94ed9c3516476245ba008c08def7ee78be735cdddbce4b3f91"
  },
  {
    "path": "js/services/map-forecast-view.js",
    "bytes": 4672,
    "gitBlob": "f3728238d5bec1fb39430d916868c1c815a1db70",
    "sha256": "b77c363c14019b583e8227c907de7d612f4fd4c8defc506b65520b4f1da54767"
  },
  {
    "path": "js/services/observation-service.js",
    "bytes": 32141,
    "gitBlob": "f0cb615aeb6d37b28d244de69ec3fd2df67386e3",
    "sha256": "84a881ca4c5deb4e23dd3b2fc2cce93707b5ed94669dfc978536917b6932d15c"
  },
  {
    "path": "js/services/own-trip-export.js",
    "bytes": 3164,
    "gitBlob": "992e69fd99b0a9e70f47ce6964608f2578483fa6",
    "sha256": "6add028836a5fef4bd5adbe314e9251a47221af604da112953ed08e3ca74fdd9"
  },
  {
    "path": "js/services/permissions-service.js",
    "bytes": 6716,
    "gitBlob": "287e4f755bf416ed3d1cdef298168ed968eaa177",
    "sha256": "9d0af1b42fa784583ae6505ee6b31394c21672915ef2c7100069cf82ad8bfe21"
  },
  {
    "path": "js/services/persistence-test-service.js",
    "bytes": 2929,
    "gitBlob": "b4f3f073bf7e2b89597b44a12b6183cb6cd7682f",
    "sha256": "8c01d3a19e3a1f1fbe2d07052ece5bdc80e14eddd4bb60a92d87f901523cd986"
  },
  {
    "path": "js/services/plain-map-hour.js",
    "bytes": 9834,
    "gitBlob": "f6f798f3776a07c86a46763bf8dbcd1a3471b1a0",
    "sha256": "02d1d1752784e9936c7da67a0983469b8e4f2e1ad0b3fe021b276a23a7076a5d"
  },
  {
    "path": "js/services/private-trip-study.js",
    "bytes": 5908,
    "gitBlob": "4cc481c2982ca1baf5d03de224e79eadfdb7a921",
    "sha256": "b3f72f6447a3c802d90814db4c843ac21f3b29f56096c31c8b9e11ce28500e67"
  },
  {
    "path": "js/services/protected-runtime-envelope.js",
    "bytes": 2446,
    "gitBlob": "a457c76ae092a5e16585b31d1b209c0d58ea052c",
    "sha256": "2627d6fa8d35619ce05bf621e92e6408296f31052f9b60074d9f1d0b8fcef79e"
  },
  {
    "path": "js/services/public-delivery-transport-binding.js",
    "bytes": 2762,
    "gitBlob": "ea3806be8e1fd80fd85fc681f8b095ba60743be2",
    "sha256": "854429582b1f6a0c69b4ff776e19566dd741d79557a6f23268f6d7eaecc78f23"
  },
  {
    "path": "js/services/public-json-transport.js",
    "bytes": 11002,
    "gitBlob": "e0e78ac3f6a5b7560429d30bb8cfefc6e9dbdd45",
    "sha256": "03a8808adfb8db9517aec7213baae2dc4b5d877fca2b2434bae316decedd6721"
  },
  {
    "path": "js/services/rav-assistant.js",
    "bytes": 85634,
    "gitBlob": "2f79a3e19143f1fc143c7234a1112cdf308f3a74",
    "sha256": "a5d02562f128fe0091e6371ae73cfb94f385b834165759646e41fe2e8553a1e0"
  },
  {
    "path": "js/services/rule-service.js",
    "bytes": 1096,
    "gitBlob": "ebeca920644914786a1b05cfbb45c9a9059ae2ac",
    "sha256": "885bc07d88152634ee8dddb75ba28c949e64deca684d941308bd4ba6ed6f8e7c"
  },
  {
    "path": "js/services/site-function-test-service.js",
    "bytes": 27715,
    "gitBlob": "c3c6125ff60c75a0981ff1ad746c387743efd8c3",
    "sha256": "5f43cc9723da10284f9bdc60fc671f729913b411f94a5fc463dcf1852abd027a"
  },
  {
    "path": "js/services/storage-safety.js",
    "bytes": 3630,
    "gitBlob": "26a4ebb55bea191e9f88e10dc2f3b6d33de66930",
    "sha256": "44df9c7fdb8df977fc269dcd2fdb20df8a79773502465f7d155c92e9bbd12038"
  },
  {
    "path": "js/services/trip-evidence-contract.js",
    "bytes": 28009,
    "gitBlob": "268f04c4e23ba0cf641fafe8352bdf70962ea514",
    "sha256": "0a2bdf43501ad88cc9817c47c8ec3f29cc1ff76403bb6acde81d30a365ad0d0b"
  },
  {
    "path": "js/services/trip-evidence-controller.js",
    "bytes": 2929,
    "gitBlob": "96b15c4c36b865b0921a4d0b6682badd378a77f5",
    "sha256": "49484fdb4b4163299bc18c80bed10e372fc590ece45a40fe3ef481c1eeabc478"
  },
  {
    "path": "js/services/trip-evidence-legacy-bridge.js",
    "bytes": 1862,
    "gitBlob": "e34036d7cb7a64fbce48aa70f4a6e8f2224252da",
    "sha256": "acb37c4f9d2cc910af281ef8107270d9d8bde528d9e9c74ed7b938deb96db754"
  },
  {
    "path": "js/services/trip-evidence-public-adapter.js",
    "bytes": 11414,
    "gitBlob": "09c9477eb3cfd63475329db364252a50d817fb5e",
    "sha256": "cdfb3e0c5d250b21a2fbd983184079d0da7b0f40e8455f2f9ca582be351bf4db"
  },
  {
    "path": "js/services/trip-evidence-runtime.js",
    "bytes": 3793,
    "gitBlob": "25426693fe4ae64db1e4edc5eec57a38a739dd17",
    "sha256": "9139d8cbf90c1c9d2041b7791566e5a4c7aab1f70b4fc07fd405ac528452f079"
  },
  {
    "path": "js/services/trip-evidence-store.js",
    "bytes": 5829,
    "gitBlob": "9487d0d2c5011876985285f105e2485d0a5e7d51",
    "sha256": "353440f3206beb90762fc85d7fed98e1f0eea535d626ae3ac71d69fabbd8ac1b"
  },
  {
    "path": "js/services/trip-evidence-upload.js",
    "bytes": 3052,
    "gitBlob": "0e25e5f398f983dd113c565f4868937f9a41a132",
    "sha256": "47522c5cee11d36aec9dd2ced168918590f96b1e5822126cb06a9275a906670f"
  },
  {
    "path": "js/services/trip-service.js",
    "bytes": 3267,
    "gitBlob": "94828e6b4e615f6203867785ce0f6d14b9d1bea6",
    "sha256": "2c6cd0b2970911ec4288d47a5ee202d2377d3c3977fc5face3d2da7c410174a7"
  },
  {
    "path": "js/services/vendor/fflate-0.8.2/browser.js",
    "bytes": 89406,
    "gitBlob": "43152c4581b4c5e941fcc2198598a6114c97db89",
    "sha256": "3eaf25846fc9ff95f4905ea16d2c33fa74b588da39b9746bc409bb7a44f96d0e"
  },
  {
    "path": "js/services/vendor/fflate-0.8.2/LICENSE",
    "bytes": 1069,
    "gitBlob": "e84f0d6caca033c62946025c0237a499459af698",
    "sha256": "805f6cb28bb8b6d3a0badd83c93bccd9671fa01a3b4b92b7042b0743325ac243"
  },
  {
    "path": "js/services/vendor/fflate-0.8.2/PROVENANCE.json",
    "bytes": 2414,
    "gitBlob": "511e2b9a0cb137053a5ece88c76090346900fff0",
    "sha256": "76481886ad9ec38dcffc526329cefbcd623b3c19ec6ac38f27a04ce7789b3fe1"
  },
  {
    "path": "js/services/vendor/fflate-0.8.2/UPSTREAM.patch",
    "bytes": 560,
    "gitBlob": "148b1edf5210442fbb01bea671a3251df4ca499c",
    "sha256": "dbccfc0511bb534622a9c9075e5645a3f158e33e36a55d68c55c7fff35d0d195"
  },
  {
    "path": "js/services/visit-counter.js",
    "bytes": 1505,
    "gitBlob": "2e85076203b607d0a6b1c61ce030081c7069e036",
    "sha256": "ee95fbafc913e7f89c664b70a6e106527b1cbbd3d5378f5a47c5199be6aebf98"
  },
  {
    "path": "js/services/visitor-report-service.js",
    "bytes": 771,
    "gitBlob": "b5c557b52f71aa8cf82f1688f29538dee5075965",
    "sha256": "a61e0f54405886aed40cf83d47521d36f72219e301475503d8dd6e3260acf225"
  },
  {
    "path": "js/services/zone-hour-preview.js",
    "bytes": 3929,
    "gitBlob": "0d21eece806c3aaa63484e802f4ab2e009898a1e",
    "sha256": "0c09ca433aafcbef18a91a90648e325e491a2c61af12dfa9936a4ac2bc9e1289"
  },
  {
    "path": "js/services/zone-registry.js",
    "bytes": 1722,
    "gitBlob": "7862e22af933fdd762a720dc36f2bc99f6391170",
    "sha256": "5935f86e229373c309bc620d372c459c0731c05681a007f608b1782687ed26e0"
  },
  {
    "path": "js/ui/about-explainer-i18n.js",
    "bytes": 64073,
    "gitBlob": "0fa0872dd075d8f2ea2ffdb6dfc4a827660d11e1",
    "sha256": "7d0e315e7d015787ae8068e16556fe3469243b208ecfd213ac7234e600549dab"
  },
  {
    "path": "js/ui/about-explainer.js",
    "bytes": 8550,
    "gitBlob": "db7932f78d81575b5f5ae3f770ce339cb95f0583",
    "sha256": "36720860cb3c011f9e030dff82277c044b8b528143a1b78f85f0ffcaf15a8a01"
  },
  {
    "path": "js/ui/about-i18n.js",
    "bytes": 19337,
    "gitBlob": "d7ef7672f2a0208beb4c361bd3dea351f9941ba1",
    "sha256": "6586ba3b2af47fe19e0dea3e475d16b4b5647d02eaa1d22aae994babb3804e21"
  },
  {
    "path": "js/ui/about.js",
    "bytes": 841,
    "gitBlob": "9ae2e943a51406080962aded4344453a105398f3",
    "sha256": "3e081b84aa55a4996014156417106341911a5c16a16b588b130261dd95ecd1da"
  },
  {
    "path": "js/ui/account-panel.js",
    "bytes": 17433,
    "gitBlob": "455cbee5013de3198373b17094f8cb4c73459456",
    "sha256": "633b12abf772dc3dd0da1a16895946d9b84ee98a2d17b8b83f1fd4f024e865cd"
  },
  {
    "path": "js/ui/admin-active-ravscore.js",
    "bytes": 11230,
    "gitBlob": "0de5fa408c63436ed597f92fc6b1c2f90fb57e4c",
    "sha256": "7feeb4c48972dc8c7fdd8e84ff925e1bb8003575dae61f85b3bd7c189786f9f8"
  },
  {
    "path": "js/ui/admin-app.js",
    "bytes": 99723,
    "gitBlob": "642c7613e799e57b97a0fdba27daeccaff22371c",
    "sha256": "d91d6dfc4eeddd0fda7a76472768237be3281cdd330bf866e77b3ab9f26987c3"
  },
  {
    "path": "js/ui/admin-coastline-editor.js",
    "bytes": 29443,
    "gitBlob": "89b958b88d6a372d6da9f5870d73ec111caefc4d",
    "sha256": "bbe36f921f473fededdc57d7352e499b0d221c515d5066e7ee984aa6787d8f2b"
  },
  {
    "path": "js/ui/admin-dashboard.js",
    "bytes": 150371,
    "gitBlob": "4fb5464698739daf7eb563ed6acd90270edfb267",
    "sha256": "f2bbd07fc3d923dcbc5fa4b3edc1371a774df4021de5af6cc27cff91b77db133"
  },
  {
    "path": "js/ui/admin-direction-editor.js",
    "bytes": 21604,
    "gitBlob": "dc45faba687ade521b41ea1fa9b349e1869123c9",
    "sha256": "09eb2b49aeccfef76e1f04b47c626441b4272b06c4f91010d395356d47a663d0"
  },
  {
    "path": "js/ui/admin-gate.js",
    "bytes": 2256,
    "gitBlob": "ca46ab423ee5a915371c33ab96f2065dfeb5c000",
    "sha256": "8debb0d3aee8adb701fbca37feb5b0d275ba7a3ab950194cf925b4b0a085047f"
  },
  {
    "path": "js/ui/admin-private-trip-study.js",
    "bytes": 7229,
    "gitBlob": "e4d7116af53c76a8d09ba91b038987d817c3366b",
    "sha256": "2af3197515f4cb04687377d4b2ca20ef1c7908990d418710b3be92dde2ca6e12"
  },
  {
    "path": "js/ui/developer-panel.js",
    "bytes": 4148,
    "gitBlob": "c48c34395b78f451830991e9c89addc883e917c0",
    "sha256": "35e89fb9aaf05df495e0c7501d561ce7df2eca6a6b84be562819d236defb9b18"
  },
  {
    "path": "js/ui/documentation.js",
    "bytes": 607,
    "gitBlob": "6dc21f9b36fd0350a8bcdb342bfb2b3f3b943725",
    "sha256": "1f806adb4f4a7b27233895bd9242347cfc04246d613aa29c4e015cfa6d5f14f3"
  },
  {
    "path": "js/ui/forecast-share.js",
    "bytes": 6245,
    "gitBlob": "0ee5ce9619d2147d3b2f6c301f03516fac268e45",
    "sha256": "fccb589c385b5bd56a4da5baa9aa7c20c2e858bcf6946f030e0a1f762c57d72b"
  },
  {
    "path": "js/ui/handbook.js",
    "bytes": 6014,
    "gitBlob": "5fe61a59e0f774f8f6f5a701504a198d48c003c2",
    "sha256": "9b3ad3388327de5ca1e2c6a9b287cb32517e6b6bcbc14235bce3c2b6f974e574"
  },
  {
    "path": "js/ui/info-panel.js",
    "bytes": 32933,
    "gitBlob": "e60f3413656fa81f1ebae20e18dc4371decefaff",
    "sha256": "ed0494cea8c48218b511124ded92e23bb44d0df65242e10957b8253b3eae8a08"
  },
  {
    "path": "js/ui/learn-i18n-de.js",
    "bytes": 29487,
    "gitBlob": "db30839e2981b63642187d28e20736be971b9e17",
    "sha256": "1fc66067568d8d4e14583047da483e4883156c8e316cfdfa7ede04cd7091523a"
  },
  {
    "path": "js/ui/learn-i18n-en.js",
    "bytes": 27027,
    "gitBlob": "13d4198f98f60fd91473fd78c07e4408a5936112",
    "sha256": "d2fc547025a210eda3c2c700ec76e19b861ce47cb076c0fcb64d0b1a1cb5fe26"
  },
  {
    "path": "js/ui/learn-i18n.js",
    "bytes": 8688,
    "gitBlob": "5ec07cda9ad7b823f476027c1c25ce898e0a50b5",
    "sha256": "d002ba4a0766b0b6d17632816a61c7b251a24a750b0d25c2b48431e6ebf3dd21"
  },
  {
    "path": "js/ui/map-tab-copy.js",
    "bytes": 417,
    "gitBlob": "07d7dc1e8a5c7e8221f657c31b2447110431d18d",
    "sha256": "33b9ce4de17e6de44df8f167b34e4ec7d78e96766a69b3b3820a37748663387a"
  },
  {
    "path": "js/ui/map-timeline-copy.js",
    "bytes": 2887,
    "gitBlob": "cc41a6c57ab29194f59d3d5fb125db7c8db6ce69",
    "sha256": "900e8d3f0e6e54474ca3d6c518ecbcc342eff58ad0c0fedf7330fbecb37833fe"
  },
  {
    "path": "js/ui/map-timeline.js",
    "bytes": 7504,
    "gitBlob": "f3ce19668537db50e56dc71335025ad63937a626",
    "sha256": "d48314d2ee148a6385af9a60d336b555ce97ac81443179be7fba3f64e8f5d00f"
  },
  {
    "path": "js/ui/ranking-copy.js",
    "bytes": 1657,
    "gitBlob": "580320aecfeb1e22be080481720b0ce8eb0e332c",
    "sha256": "0b6d07372cbad15bee0a02b2142bf20acd7fd9a8d26ee0ca1b829e0b1ac69431"
  },
  {
    "path": "js/ui/score-prognosis-copy.js",
    "bytes": 18496,
    "gitBlob": "5210596f6e7b76cc294b0e98cdfb19c1a9bd34f2",
    "sha256": "985b8c1aef5be5cb9dab546a18d5e621adbb25d95e48408c4e6b7f985347a7f9"
  },
  {
    "path": "js/ui/site-search-copy.js",
    "bytes": 1729,
    "gitBlob": "dc0373cd20852e7f4be5b2a3f277188cb3d72fad",
    "sha256": "b3711cf3e51d333e8f53944c5080c9338adcc32a1c1cccdb258e76f5851dbd5f"
  },
  {
    "path": "js/ui/supabase-setup.js",
    "bytes": 3396,
    "gitBlob": "c1d0395783114bbb0ceb73687973f2c94a63e9a3",
    "sha256": "af81793b79127a5152cad8d7a605a162c834e8cda5381776866ebf0d970a0d68"
  },
  {
    "path": "js/ui/trip-evidence-dialog.js",
    "bytes": 19872,
    "gitBlob": "72ab477abb4aaa0458f5772c299b358ddb747504",
    "sha256": "6d96602ea2482be3d8a9aaa2b336703fd11a2aeaa0f5b3e086d32f36be9d5f2c"
  },
  {
    "path": "knowledge/rav-assistant-local-v2.js",
    "bytes": 48676,
    "gitBlob": "7ea79bf0974e4e446e2cff8fa8e9a1d14532a317",
    "sha256": "e6cb2451eac50bcf3e4959d4b571aad6e9422c5f025edac2bc65a0e8f6aec754"
  },
  {
    "path": "knowledge/rav-assistant-research-coast-v1.js",
    "bytes": 52235,
    "gitBlob": "c3ba153a1550fd64c4080fc57d86769e3c34a553",
    "sha256": "2e86a4ab2c01638bc7297153d81caf0be6040571f8fcd4be11d6132d820ff0de"
  },
  {
    "path": "knowledge/rav-assistant-research-material-v1.js",
    "bytes": 54877,
    "gitBlob": "4bb593b212bdd82c5f2d6da2e6e6b19aedfffaf2",
    "sha256": "28d298b173064e00d12cbe1bbc44d54db23b4f2cd7f412ea9862d28186712b59"
  },
  {
    "path": "knowledge/rav-assistant-research-v1.js",
    "bytes": 479,
    "gitBlob": "ba052cfd98b0ebcd289e04421f46c9c593b376ae",
    "sha256": "bebd5a709e5505b1d958e6424056b196385f2ca7a9f607348919e32f95079df2"
  },
  {
    "path": "knowledge/rav-assistant-sources-v1.js",
    "bytes": 8912,
    "gitBlob": "a82e1172e2381ef9a74ddbcd02811031b5bc09be",
    "sha256": "c9a387ca9ed30d4c5a9932eb1b1133a99ae651c23c822b7d0ad1c8adbd8c43a6"
  },
  {
    "path": "package.json",
    "bytes": 50765,
    "gitBlob": "4e33ca75bf692216c119b1317e26c646d0e18d08",
    "sha256": "5d303a5f5b07198d74c681cbac93afed13417ed2ec88640d0a14666c0e0b8347"
  },
  {
    "path": "scripts/build-forecast-share-projection.mjs",
    "bytes": 8967,
    "gitBlob": "9bab818c29c9d1ce5d0a28a3ce5a00e8ebb757f3",
    "sha256": "efac1953b6de6b86c2da1260c168a82ea3751246c4480adb952f1050be04e2fb"
  },
  {
    "path": "scripts/lib/local-current-reference.mjs",
    "bytes": 2253,
    "gitBlob": "e6e24d9d46ca53e4f9e7b10134826a8b1461f027",
    "sha256": "6e1c6a28cb3cf704d760e5c6f52dade2e0c81112e1299a1264b3a9502851a75b"
  },
  {
    "path": "scripts/lib/private-weather-component-inventory.mjs",
    "bytes": 5021,
    "gitBlob": "74165842787c0e802c090f873ce1c4837ccd97bb",
    "sha256": "125e1a2acee5bff8d16ac549e96004dc8c80bbcea684782c45b3cfc666edba3c"
  },
  {
    "path": "scripts/lib/public-hour-delivery-pack.mjs",
    "bytes": 25913,
    "gitBlob": "3c37c6755b54f44bbcd34eb5071b4e1f2ff9e43a",
    "sha256": "10a1bab2155b7eedd791045209a514f41bda08e3dc9470840729b87967fb7f6d"
  },
  {
    "path": "scripts/public-conditions-lib.mjs",
    "bytes": 65524,
    "gitBlob": "197115e9d933877e7a7e0b95f5d6f0f89d9ceed5",
    "sha256": "e5a921d2a818694cfa13d5fcb30392cad972dc3b7038e929bc1d659a95f8017d"
  },
  {
    "path": "scripts/test-ravscore-public-data-service-binding.mjs",
    "bytes": 52794,
    "gitBlob": "50c8cd35750af2e7149770579a69e0ff47d77968",
    "sha256": "95f0225a1433f854364264b4297faf8e71ff35a92a313dd5e3a5dae39e1be84a"
  },
  {
    "path": "service-worker.js",
    "bytes": 6971,
    "gitBlob": "e1d8fc2fec85d6ba1bf742652c5387eac97df23c",
    "sha256": "14ce684b294874004e64132dcb21dc628ba41fb762ddbbf5befdf3590a11bd35"
  }
]);

async function verifySealed594CompactShareRegression({ reproduceOnly = false } = {}) {
  const path = await import('node:path');
  const os = await import('node:os');
  const {execFileSync} = await import('node:child_process');
  const {fileURLToPath,pathToFileURL} = await import('node:url');
  const {registerHooks} = await import('node:module');
  const repository = fileURLToPath(new URL('..',import.meta.url));
  const gitRoot=execFileSync('git',['rev-parse','--show-toplevel'],{cwd:repository,windowsHide:true}).toString().trim();
  const git = (args,input) => execFileSync('git',args,{cwd:gitRoot,windowsHide:true,maxBuffer:64*1024*1024,...(input?{input}:{})});
  assert.equal(git(['rev-parse',FROZEN_594_FIXTURE_REF+'^{tree}']).toString().trim(),FROZEN_594_FIXTURE_TREE);
  const work = await fs.mkdtemp(path.join(os.tmpdir(),'ravradar-sealed594-sharing-'));
  try {
    const legacy = path.join(work,'source'), workspace = path.join(work,'synthetic');
    await fs.mkdir(legacy);await fs.mkdir(workspace);
    // cat-file emits immutable raw blobs. git archive on Windows may apply
    // checkout CRLF conversion before tar sees a member; no text roundtrip is
    // permitted for these genuine sealed implementation bytes.
    const request=Buffer.from(FROZEN_594_FIXTURE_SOURCES.map(file=>file.gitBlob).join('\n')+'\n');
    const raw=git(['cat-file','--batch'],request);let offset=0;
    for(const file of FROZEN_594_FIXTURE_SOURCES){
      assert(!file.path.startsWith('/')&&!file.path.includes('\\')&&!file.path.split('/').includes('..'));
      const end=raw.indexOf(10,offset);assert(end>=offset);
      assert.deepEqual(raw.subarray(offset,end).toString('ascii').split(' '),[file.gitBlob,'blob',String(file.bytes)]);
      const bytes=raw.subarray(end+1,end+1+file.bytes);assert.equal(bytes.length,file.bytes);
      assert.equal(sha256(bytes),file.sha256);assert.equal(raw[end+1+file.bytes],10);
      const destination=path.join(legacy,file.path);await fs.mkdir(path.dirname(destination),{recursive:true});
      await fs.writeFile(destination,bytes,{flag:'wx'});assert.deepEqual(await fs.readFile(destination),bytes);
      offset=end+file.bytes+2;
    }
    assert.equal(offset,raw.length);
    const contractText=await fs.readFile(path.join(legacy,'js/core/ravscore-model-contract.js'),'utf8');
    const bundleText=await fs.readFile(path.join(legacy,'js/core/ravscore-model-bundle.generated.js'),'utf8');
    assert.equal(sha256(Buffer.from(contractText)),'6edf369edf09b50005a0d04ce0ec892cf6455ddcea02ab4a7f2e51b644b8baab');
    assert.equal(sha256(Buffer.from(bundleText)),'37d27d1f5a199ef371124e2d06da1d8142b0734aafb6b8416242cf9d423cfa02');
    const load=relative=>import(pathToFileURL(path.join(legacy,relative)).href);
    const binding=(await load('js/core/ravscore-model-contract.js')).ravScoreModelBinding();
    assert.notEqual(binding.modelBundleSha256,integratedModelBinding().modelBundleSha256);
    const {computeRavScorePublicBrowserClosure}=await import('./lib/ravscore-public-browser-closure.mjs');
    const publicClosure=(await computeRavScorePublicBrowserClosure({root:legacy})).manifest;
    assert(publicClosure.files.some(item=>item.path==='js/services/forecast-share-projection.js'));
    computeSealedPublicImplementationClosureIdentity({expectedModel:'integrated',expectedBinding:binding,
      expectedContractText:contractText,expectedBundleText:bundleText,expectedPublicClosure:publicClosure});
    const factoryPath=path.join(legacy,'scripts/test-ravscore-public-data-service-binding.mjs');
    const factoryUrl=pathToFileURL(factoryPath).href+'?sealed594CompactShareFixture';
    const factorySource=(await fs.readFile(factoryPath,'utf8')).replace(/\r\n/g,'\n');
    const sentinel="const primary = bundle('primary-integrated', 61);";
    assert.equal(factorySource.split(sentinel).length,2);
    const prefix=factorySource.split(sentinel)[0];
    assert.equal(sha256(prefix),'091f68c8be579ab7f555a0a4caeefe5159f0a2027bdd0300438b1e64d0c90014');
    // This is the existing pure TEST fixture factory, not a product projection.
    const fixtureModule=prefix+'\nexport {full,horizonTimes,coastalPartsText,zoneRegistryText};\n';
    const hook=registerHooks({load(url,context,next){return url===factoryUrl?
      {format:'module',source:fixtureModule,shortCircuit:true}:next(url,context);}});
    let factory;try{factory=await import(factoryUrl);}finally{hook.deregister();}
    const {full,horizonTimes,coastalPartsText,zoneRegistryText}=factory;
    const source=full('rr-synthetic-sealed594-sharing-210',42),availableIndex=2;
    for(const zone of Object.values(source.coastalParts.zones))for(let i=0;i<zone.hourly.length;i++){
      if(i===0||i===availableIndex)continue;
      for(const mode of ['waders','beach'])zone.hourly[i][mode]={
        available:false,score:null,scoreQuality:'UNAVAILABLE',scoreBounds:null,calibrationEligible:false,
        scoreSemantics:null,conservativeTailResetApplied:false,historyCoverageHours:null,historyReasonCodes:[],
        modelBinding:binding,status:'unavailable',validPartCount:0,expectedPartCount:zone.expectedPartCount,
        comparisonPartCount:0,unavailableParts:[],unavailability:{available:false,code:'SYNTHETIC_NO_EXACT_INPUT',
          messageDa:'Syntetisk prøvetime uden data.',policy:'integrated-model-local-fail-closed',
          validPartCount:0,expectedPartCount:zone.expectedPartCount},reasons:['Syntetisk prøvetime uden data.']};
    }
    for(const part of Object.values(source.coastalParts.parts))part.hourly=[];
    const lib=await load('scripts/public-conditions-lib.mjs');
    const share=await load('scripts/build-forecast-share-projection.mjs');
    const live=path.join(workspace,'data/live');await fs.mkdir(live,{recursive:true});
    const startup=lib.buildPublicConditions(source),details=lib.buildPublicConditionDetails(source);
    const startupText=lib.compactJson(startup),detailsText=lib.compactJson(details);
    const manifest=lib.buildPublicManifest(source,startupText,detailsText,coastalPartsText,zoneRegistryText);
    manifest.detailDelivery={schemaVersion:1,forecastHours:118,sourceDetailsSha256:manifest.publicConditionDetailsSha256,hours:{},zones:{}};
    const files=new Map([['/data/live/public-conditions.json',Buffer.from(startupText)],
      ['/data/live/public-condition-details.json',Buffer.from(detailsText)],
      ['/data/live/coastal-parts-v2.json',Buffer.from(coastalPartsText)],['/data/zones.geojson',Buffer.from(zoneRegistryText)]]);
    async function delivery(document){const bytes=Buffer.from(lib.compactJson(document)),hash=sha256(bytes);
      manifest.detailDelivery[document.delivery.kind==='hour'?'hours':'zones'][document.delivery.key]={path:'./forecast/'+hash+'.json',sha256:hash,bytes:bytes.length};
      files.set('/data/live/forecast/'+hash+'.json',bytes);}
    // Same complete schema fixture as the existing normal projection target.
    // No invented national ranking or future current is added to hour files.
    const {ravScoreRuntime:_envelope,...detailBody}=details;
    for(const time of horizonTimes){
      const parts=Object.fromEntries(Object.entries(details.coastalParts.parts).map(([id,part])=>{
        const {current,flowPoints,...metadata}=part;return[id,current?.time===time?part:metadata];}));
      await delivery({...detailBody,delivery:{schemaVersion:1,kind:'hour',key:time,sourceDetailsSha256:manifest.publicConditionDetailsSha256,modelBinding:binding},
        zones:Object.fromEntries(Object.entries(details.zones).map(([id,zone])=>[id,{...zone,forecast:{...zone.forecast,hourly:zone.forecast.hourly.filter(row=>row.time===time)}}])),
        coastalParts:{...details.coastalParts,parts,zones:Object.fromEntries(Object.entries(details.coastalParts.zones).map(([id,zone])=>[id,{...zone,currentReferenceAt:time,hourly:zone.hourly.filter(row=>row.time===time)}]))}});
    }
    for(const id of Object.keys(details.zones))await delivery(lib.buildPublicDeliveryDocument(source,details,manifest,'zone',id));
    const manifestBytes=jsonBytes(manifest);files.set('/data/live/manifest.json',manifestBytes);
    await fs.writeFile(path.join(live,'manifest.json'),manifestBytes);
    await fs.writeFile(path.join(live,'public-condition-details.json'),detailsText);
    await fs.writeFile(path.join(workspace,'data/zones.geojson'),zoneRegistryText);
    await share.writeForecastShareProjection({repository:workspace,producerResult:{publicDocument:startup,
      detailsDocument:details,manifest,publicText:startupText,detailsText}});
    const shared=await share.readForecastShareProjectionFiles({liveDirectory:live,manifestText:manifestBytes.toString('utf8'),required:true});
    files.set('/data/live/forecast-share.json',shared.descriptorBytes);
    for(const item of shared.zoneFiles)files.set('/data/live/'+item.entry.path.slice(2),item.bytes);
    for(const item of publicClosure.files)files.set('/'+item.path,await fs.readFile(path.join(legacy,item.path)));
    for(const item of publicClosure.htmlEntrypoints)files.set('/'+item.path,await fs.readFile(path.join(legacy,item.path)));
    files.set('/js/core/ravscore-model-contract.js',Buffer.from(contractText));
    files.set('/js/core/ravscore-model-bundle.generated.js',Buffer.from(bundleText));
    const common={baseUrl:'https://ravradar.example.test/',sourceHead:FROZEN_594_FIXTURE_REF,
      expectedManifest:manifest,expectedModel:'integrated',expectedBinding:binding,
      expectedContractText:contractText,expectedBundleText:bundleText,expectedPublicClosure:publicClosure,
      observationNonce:'synthetic-real-sealed594-sharing',attempts:1};
    const result=await verifyRavScoreOperationalPagesDeployment({...common,fetchImpl:mockFetch(files)});
    assert.equal(result.status,'passed');assert.deepEqual(result.modelBinding,binding);
    if(reproduceOnly)return;
    const currentShare=await import('../js/services/forecast-share-projection.js');
    const direct=()=>currentShare.assertForecastShareProjectionParity({projection:shared.projection,
      descriptor:shared.descriptor,manifest,details,registry:JSON.parse(zoneRegistryText)},binding);
    assert.equal(direct().comparisons,49560);
    const defaults=[()=>currentShare.assertForecastShareDescriptor(shared.descriptor,manifest,sha256(manifestBytes)),
      ()=>currentShare.assertForecastShareProjection(shared.projection,shared.descriptor,manifest),
      ()=>currentShare.assertForecastShareZoneProjection(shared.zoneFiles[0].payload,shared.descriptor,manifest,shared.descriptor.zones[0]),
      ()=>currentShare.assembleForecastShareProjection(shared.zoneFiles.map(f=>f.payload),shared.descriptor,manifest),
      ()=>currentShare.assertForecastShareProjectionParity({projection:shared.projection,descriptor:shared.descriptor,manifest,details,registry:JSON.parse(zoneRegistryText)})];
    for(const check of defaults)assert.throws(check,/incompatible modelBundleSha256/);
    const mutate=async(label,change,pattern)=>{const altered=new Map(files);change(altered);
      await assert.rejects(()=>verifyRavScoreOperationalPagesDeployment({...common,fetchImpl:mockFetch(altered)}),pattern,label);};
    const descriptorPath='/data/live/forecast-share.json';
    await mutate('descriptor manifest mismatch',m=>{const d=structuredClone(shared.descriptor);d.manifestSha256='0'.repeat(64);m.set(descriptorPath,jsonBytes(d));},/FORECAST_SHARE_DESCRIPTOR_BINDING/);
    await mutate('descriptor model mismatch',m=>{const d=structuredClone(shared.descriptor);d.modelBinding={...binding,modelBundleSha256:'0'.repeat(64)};m.set(descriptorPath,jsonBytes(d));},/FORECAST_SHARE_PROJECTION_GENERATION/);
    const first=shared.zoneFiles[0];
    await mutate('payload byte mismatch',m=>m.set('/data/live/'+first.entry.path.slice(2),Buffer.from(first.bytes.toString()+' ')),/projection digest mismatch/);
    const coherent=change=>m=>{const payload=structuredClone(first.payload);change(payload);const bytes=jsonBytes(payload),hash=sha256(bytes),d=structuredClone(shared.descriptor);
      d.zones[0]={id:first.entry.id,path:'./share/'+hash+'.json',sha256:hash,bytes:bytes.length};m.delete('/data/live/'+first.entry.path.slice(2));
      m.set('/data/live/share/'+hash+'.json',bytes);m.set(descriptorPath,jsonBytes(d));};
    await mutate('coherent payload model mismatch',coherent(p=>p.modelBinding={...binding,modelBundleSha256:'0'.repeat(64)}),/FORECAST_SHARE_PROJECTION_GENERATION/);
    await mutate('coherent score mismatch',coherent(p=>p.zone.rows[availableIndex][0][1]+=1),/FORECAST_SHARE_PARITY_MISMATCH/);
    await mutate('later final browser seal still required',m=>m.set('/app.js',Buffer.from('/* changed genuine sealed browser bytes */')),/public browser implementation closure drifted/);
    let descriptorReads=0;await assert.rejects(()=>verifyRavScoreOperationalPagesDeployment({...common,
      expectedBinding:{...binding,modelBundleSha256:'0'.repeat(64)},fetchImpl:async(...args)=>{
        if(new URL(args[0]).pathname==='/data/live/forecast-share.json')descriptorReads++;return mockFetch(files)(...args);
      }}),/not exact|incompatible|differs/);assert.equal(descriptorReads,0);
    console.log('Genuine594 sealed implementation + synthetic210/673 share fixture: complete current verifier,49,560 parity, strict default, coherent model/score tamper and final browser seal: passed.');
  } finally {
    const resolved=path.resolve(work),parent=path.resolve(os.tmpdir());
    assert(resolved.startsWith(parent+path.sep)&&path.basename(resolved).startsWith('ravradar-sealed594-sharing-'));
    await fs.rm(resolved,{recursive:true,force:true});
  }
}



if(process.argv.includes('--sealed594-share-regression-only')){
  await verifySealed594CompactShareRegression({reproduceOnly:true});
  process.exit(0);
}

const completeSourceRepair = Object.freeze({
  expectedPublicFileCount: 79,
  knownMissingPublicFile: null,
});
assert.equal(assertKnownSourceRepairBrowserClosure({
  knownSourceRepair: completeSourceRepair,
  expectedPublicFileCount: 79,
  missingPublicFiles: [],
}), true, 'a pinned complete 79/79 source must be repairable without inventing a missing file');
assert.throws(() => assertKnownSourceRepairBrowserClosure({
  knownSourceRepair: completeSourceRepair,
  expectedPublicFileCount: 79,
  missingPublicFiles: [{
    path: 'unexpected.js', sha256: 'a'.repeat(64), httpStatus: 404,
  }],
}), /exact pinned browser closure/,
'a complete source repair must reject any missing browser file');
const oneMissingSourceRepair = Object.freeze({
  expectedPublicFileCount: 79,
  knownMissingPublicFile: Object.freeze({
    path: 'known-missing.js', sha256: 'b'.repeat(64), expectedHttpStatus: 404,
  }),
});
assert.equal(assertKnownSourceRepairBrowserClosure({
  knownSourceRepair: oneMissingSourceRepair,
  expectedPublicFileCount: 79,
  missingPublicFiles: [{
    path: 'known-missing.js', sha256: 'b'.repeat(64), httpStatus: 404,
  }],
}), true, 'the older one-file repair shape must remain exact and supported');
const INDEX_HTML = '<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src \'self\'; script-src \'self\' https://unpkg.com"><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script type="module" src="bootstrap.js?v=4.0.308"></script>';
const ADMIN_HTML = '<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src \'self\'; script-src \'self\' https://unpkg.com"><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script type="module" src="js/ui/admin-dashboard.js?v=4.0.308"></script>';
const normalizedSource = value => String(value)
  .replace(/^\uFEFF/, '')
  .replace(/\r\n?/g, '\n')
  .replace(/([?&]v=)\d+\.\d+\.\d+(?=["'])/g, '$1<release-version>');

function bodySha256(document) {
  const { ravScoreRuntime: _runtime, ...body } = document;
  return sha256(JSON.stringify(canonical(body)));
}

function jsonBytes(value) {
  return Buffer.from(JSON.stringify(value));
}

function response(bytes) {
  const copy = Uint8Array.from(bytes);
  return {
    ok: true,
    status: 200,
    arrayBuffer: async () => copy.buffer,
  };
}

function sealedImplementation(baseBinding, mode) {
  const contractText = `// sealed ${mode} contract\n`;
  const contractPath = mode === 'integrated'
    ? 'js/core/ravscore-model-contract.js'
    : 'scripts/rollback-assets/ravscore-model-contract.js';
  const sources = new Map(REQUIRED_CLOSURE.map(relative => [
    relative,
    `// sealed ${mode} public closure: ${relative}\n`,
  ]));
  sources.set('js/core/ravscore-model-contract.js', contractText);
  const modelSources = new Map(MODEL_CLOSURE.map(relative => [relative, sources.get(relative)]));
  modelSources.set(contractPath, contractText);
  const fileKey = mode === 'integrated' ? 'path' : 'file';
  const files = [...modelSources].map(([relative, source]) => ({
    [fileKey]: relative,
    sha256: sha256(normalizedSource(source)),
  }));
  const manifest = mode === 'integrated'
    ? {
      schemaVersion: '1.0.0',
      normalizationId: 'lexer-esm-relative-import-closure-utf8-lf-static-cachebuster-v2',
      contractSha256: baseBinding.modelContractSha256,
      entrypoints: [...REQUIRED_CLOSURE],
      files,
    }
    : {
      schemaVersion: 'candidate-g-operational-rollback-bundle-v1',
      normalizationId: 'candidate-g-rollback-lexer-esm-closure-utf8-lf-static-cachebuster-v2',
      entrypoints: [...REQUIRED_CLOSURE],
      excludedModules: [
        'js/core/ravscore-model-bundle.generated.js',
        'js/core/ravscore-model-contract.js',
        'scripts/rollback-assets/ravscore-model-bundle.generated.js',
      ],
      files,
    };
  const bundleSha256 = sha256(mode === 'integrated'
    ? JSON.stringify(canonical(manifest)) : JSON.stringify(manifest));
  const binding = Object.freeze({ ...baseBinding, modelBundleSha256: bundleSha256 });
  const publicClosure = Object.freeze({
    schemaVersion: RAVSCORE_PUBLIC_BROWSER_CLOSURE_SCHEMA,
    normalizationId: RAVSCORE_PUBLIC_BROWSER_CLOSURE_NORMALIZATION,
    htmlEntrypoints: [
      Object.freeze({
        path: 'index.html',
        sourceSha256: sha256(normalizedSource(INDEX_HTML)),
        executableSurface: ravScorePublicEntrypointDescriptor(INDEX_HTML, {
          expectedModuleScripts: ['bootstrap.js'],
        }),
      }),
      Object.freeze({
        path: 'admin.html',
        sourceSha256: sha256(normalizedSource(ADMIN_HTML)),
        executableSurface: ravScorePublicEntrypointDescriptor(ADMIN_HTML, {
          expectedModuleScripts: ['js/ui/admin-dashboard.js'],
        }),
      }),
    ],
    executableEntrypoints: [...RAVSCORE_PUBLIC_BROWSER_EXECUTABLE_ENTRYPOINTS],
    files: [...sources].sort(([left], [right]) => left.localeCompare(right))
      .map(([relative, source]) => Object.freeze({
        path: relative,
        sha256: sha256(normalizedSource(source)),
      })),
  });
  const bundleText = [
    `// Generated by synthetic ${mode} verifier fixture.`,
    `export const GENERATED_RAVSCORE_MODEL_CONTRACT_SHA256 = '${binding.modelContractSha256}';`,
    `export const GENERATED_RAVSCORE_MODEL_BUNDLE_SHA256 = '${binding.modelBundleSha256}';`,
    `export const GENERATED_RAVSCORE_MODEL_BUNDLE_MANIFEST = Object.freeze(${JSON.stringify(manifest, null, 2)});`,
    '',
  ].join('\n');
  return Object.freeze({
    binding,
    contractText,
    bundleText,
    sources,
    publicClosure,
  });
}

function profileFor(binding, mode) {
  const candidate = mode === 'candidate-g';
  return {
    schemaVersion: candidate ? '2.0.0' : '3.0.0',
    switchVersion: candidate
      ? 'RAVSCORE-OPERATIONAL-ROLLBACK-DEC-0110-V2'
      : 'RAVSCORE-PROFILE-SWITCH-INTEGRATED-1.0.0',
    requestedProfileId: binding.modelId,
    activeProfileId: binding.modelId,
    stateSchemaVersion: binding.stateSchemaVersion,
    variantId: binding.variantId,
    profileId: binding.profileId,
    componentSchemaId: binding.componentSchemaId,
    explanationSchemaId: binding.explanationSchemaId,
    rankingPolicyId: binding.rankingPolicyId,
    bestTimePolicyId: binding.bestTimePolicyId,
    presentationPolicyId: binding.presentationPolicyId,
    modelContractSha256: binding.modelContractSha256,
    modelBundleSha256: binding.modelBundleSha256,
    rollbackModelId: candidate
      ? null : 'RRS-CANDIDATE-G-CURRENT-LED-WAVE-MOBILISATION-RESEARCH-3',
    runtimeFallbackModelId: null,
    modelCoverageReady: true,
    modelMemoryReady: true,
    modelMigrationReady: true,
    memoryReferenceScope: 'CURRENT_COMMON_ZONE_REFERENCE',
    activationState: candidate
      ? 'manual-candidate-g-only-local-fail-closed'
      : 'integrated-model-only-local-fail-closed',
    advisories: [],
    publicAvailabilityPolicy: candidate
      ? 'candidate-g-local-fail-closed'
      : 'integrated-model-local-fail-closed',
    crossModelRuntimeFallbackAllowed: false,
    automaticActivationAllowed: false,
  };
}

function buildFixture(binding, mode) {
  const datasetId = `rr-20260829120000-${mode}`;
  const zones = Object.fromEntries(Array.from({ length: 210 }, (_, index) => [
    `zone-${index + 1}`,
    { available: true },
  ]));
  const parts = Object.fromEntries(Array.from({ length: 673 }, (_, index) => [
    `part-${index + 1}`,
    { available: true, modelBinding: binding },
  ]));
  const scoreProfile = profileFor(binding, mode);
  const integratedScore = {
    available: true,
    score: 50,
    scoreQuality: 'FULL_HISTORY',
    calibrationEligible: true,
    scoreSemantics: 'EXACT_POINT_SCORE',
    conservativeTailResetApplied: false,
    scoreBounds: {
      lower: 50, upper: 50, modelUncertaintyPoints: 0, rawLower: 50, rawUpper: 50,
    },
    historyCoverageHours: 48,
    historyReasonCodes: [],
    modelBinding: binding,
  };
  const scoreZones = Object.fromEntries(Object.keys(zones).map(zoneId => [zoneId, {
    currentReferenceAt: productionReferenceAt,
    hourly: [{
      time: productionReferenceAt,
      waders: structuredClone(integratedScore),
      beach: structuredClone(integratedScore),
    }],
  }]));
  const integratedAvailability = {
    schemaVersion: 2,
    policy: 'integrated-model-local-fail-closed',
    allZonesActive: true,
    activeZoneCount: 210,
    unavailableZoneCount: 0,
    totalZoneCount: 210,
    allCurrentScoresFullHistory: true,
    fullHistoryModeCount: 420,
    historyIncompleteModeCount: 0,
    historyIncompleteZoneCount: 0,
    evaluatedAt: productionReferenceAt,
    unavailableZones: [],
    historyIncompleteZones: [],
  };
  const startupBody = {
    datasetId,
    productionReferenceAt,
    zones,
    coastalParts: mode === 'integrated'
      ? {
        scoreProfile,
        scoreAvailability: structuredClone(integratedAvailability),
        zones: structuredClone(scoreZones),
      }
      : { scoreProfile },
  };
  const startup = {
    ...startupBody,
    ravScoreRuntime: {
      schemaVersion: '1.0.0',
      kind: 'RAVSCORE_PUBLIC_STARTUP',
      datasetId,
      productionReferenceAt,
      payloadBodySha256: bodySha256(startupBody),
      modelBinding: binding,
    },
  };
  const detailsBody = {
    datasetId,
    productionReferenceAt,
    zones,
    coastalParts: mode === 'integrated'
      ? {
        modelBinding: binding,
        scoreProfile,
        scoreAvailability: structuredClone(integratedAvailability),
        parts,
        zones: structuredClone(scoreZones),
      }
      : { modelBinding: binding, scoreProfile, parts },
  };
  const details = {
    ...detailsBody,
    ravScoreRuntime: {
      schemaVersion: '1.0.0',
      kind: 'RAVSCORE_PUBLIC_DETAILS',
      datasetId,
      productionReferenceAt,
      payloadBodySha256: bodySha256(detailsBody),
      modelBinding: binding,
    },
  };
  const coastalParts = {
    schemaVersion: 2,
    zoneCount: 210,
    partCount: 673,
    modelBinding: binding,
  };
  const zoneRegistry = {
    type: 'FeatureCollection',
    features: Array.from({ length: 210 }, (_, index) => ({
      type: 'Feature',
      properties: { id: `zone-${index + 1}` },
      geometry: null,
    })),
  };
  const files = new Map([
    ['/index.html', Buffer.from(INDEX_HTML)],
    ['/admin.html', Buffer.from(ADMIN_HTML)],
    ['/data/live/public-conditions.json', jsonBytes(startup)],
    ['/data/live/public-condition-details.json', jsonBytes(details)],
    ['/data/live/coastal-parts-v2.json', jsonBytes(coastalParts)],
    ['/data/zones.geojson', jsonBytes(zoneRegistry)],
  ]);
  const manifest = {
    schemaVersion: 4,
    complete: true,
    datasetId,
    productionReferenceAt,
    zoneCount: 210,
    coastalPartCount: 673,
    publicConditionsSha256: sha256(files.get('/data/live/public-conditions.json')),
    publicConditionsBytes: files.get('/data/live/public-conditions.json').length,
    publicConditionDetailsSha256: sha256(files.get('/data/live/public-condition-details.json')),
    publicConditionDetailsBytes: files.get('/data/live/public-condition-details.json').length,
    coastalPartsSha256: sha256(files.get('/data/live/coastal-parts-v2.json')),
    coastalPartsBytes: files.get('/data/live/coastal-parts-v2.json').length,
    zoneRegistrySha256: sha256(files.get('/data/zones.geojson')),
    zoneRegistryBytes: files.get('/data/zones.geojson').length,
    ravScoreModelBinding: binding,
    ravScoreRuntime: {
      schemaVersion: '1.0.0',
      modelBinding: binding,
      startup: {
        kind: 'RAVSCORE_PUBLIC_STARTUP',
        payloadBodySha256: startup.ravScoreRuntime.payloadBodySha256,
        fileSha256: sha256(files.get('/data/live/public-conditions.json')),
        bytes: files.get('/data/live/public-conditions.json').length,
      },
      details: {
        kind: 'RAVSCORE_PUBLIC_DETAILS',
        payloadBodySha256: details.ravScoreRuntime.payloadBodySha256,
        fileSha256: sha256(files.get('/data/live/public-condition-details.json')),
        bytes: files.get('/data/live/public-condition-details.json').length,
      },
    },
    ravScoreProfile: scoreProfile,
    ravScoreAvailability: mode === 'integrated' ? {
      schemaVersion: 2,
      policy: 'integrated-model-local-fail-closed',
      allZonesActive: true,
      activeZoneCount: 210,
      unavailableZoneCount: 0,
      totalZoneCount: 210,
      allCurrentScoresFullHistory: true,
      fullHistoryModeCount: 420,
      historyIncompleteModeCount: 0,
      historyIncompleteZoneCount: 0,
      evaluatedAt: productionReferenceAt,
      unavailableZones: [],
      historyIncompleteZones: [],
    } : {
      allZonesActive: true,
      unavailableZoneCount: 0,
    },
  };
  files.set('/data/live/manifest.json', jsonBytes(manifest));
  return { datasetId, files, manifest, startup, details };
}

function installHistoryIncompleteIntegratedState(fixture) {
  const incompleteProfile = {
    ...fixture.startup.coastalParts.scoreProfile,
    modelMemoryReady: false,
    advisories: ['LOCAL_MODEL_MEMORY_INCOMPLETE'],
  };
  fixture.startup.coastalParts.scoreProfile = structuredClone(incompleteProfile);
  fixture.details.coastalParts.scoreProfile = structuredClone(incompleteProfile);
  fixture.manifest.ravScoreProfile = structuredClone(incompleteProfile);
  fixture.manifest.ravScoreAvailability = {
    ...fixture.manifest.ravScoreAvailability,
    allCurrentScoresFullHistory: false,
    fullHistoryModeCount: 419,
    historyIncompleteModeCount: 1,
    historyIncompleteZoneCount: 1,
    historyIncompleteZones: [{
      zoneId: 'zone-1',
      zoneName: 'Zone 1',
      modes: ['waders'],
      historyCoverageHours: 24,
      historyReasonCodes: ['CURRENT_HISTORY_INCOMPLETE'],
    }],
  };
  for (const document of [fixture.startup, fixture.details]) {
    document.coastalParts.scoreAvailability = structuredClone(
      fixture.manifest.ravScoreAvailability,
    );
    Object.assign(document.coastalParts.zones['zone-1'].hourly[0].waders, {
      scoreQuality: 'HISTORY_INCOMPLETE',
      calibrationEligible: false,
      scoreSemantics: 'CONSERVATIVE_ENCLOSING_LOWER_BOUND',
      historyCoverageHours: 24,
      historyReasonCodes: ['CURRENT_HISTORY_INCOMPLETE'],
    });
  }
  resealPublicDocuments(fixture);
}

function unavailableIntegratedMode(fixture) {
  return {
    available: false,
    score: null,
    scoreQuality: 'UNAVAILABLE',
    calibrationEligible: false,
    scoreSemantics: null,
    conservativeTailResetApplied: false,
    scoreBounds: null,
    historyCoverageHours: null,
    historyReasonCodes: [],
    validPartCount: 0,
    expectedPartCount: 1,
    unavailableParts: [{
      partId: 'part-1',
      name: 'Part 1',
      code: 'DIRECT_INPUT_MISSING',
      reason: 'Et direkte lokalt input mangler.',
    }],
    modelBinding: fixture.manifest.ravScoreModelBinding,
    status: 'unavailable',
    reasons: ['Et direkte lokalt input mangler.'],
    unavailability: {
      available: false,
      code: 'DIRECT_INPUT_MISSING',
      messageDa: 'Et direkte lokalt input mangler.',
      policy: 'integrated-model-local-fail-closed',
      validPartCount: 0,
      expectedPartCount: 1,
    },
  };
}

function installLocallyUnavailableIntegratedState(fixture) {
  const localProfile = {
    ...fixture.startup.coastalParts.scoreProfile,
    modelCoverageReady: false,
    advisories: ['LOCAL_MODEL_COVERAGE_INCOMPLETE'],
  };
  const localAvailability = {
    ...fixture.manifest.ravScoreAvailability,
    allZonesActive: false,
    activeZoneCount: 209,
    unavailableZoneCount: 1,
    allCurrentScoresFullHistory: false,
    fullHistoryModeCount: 419,
    unavailableZones: [{
      zoneId: 'zone-1',
      zoneName: 'Zone 1',
      modes: ['waders'],
      reasons: ['Et direkte lokalt input mangler.'],
    }],
  };
  const unavailableMode = unavailableIntegratedMode(fixture);
  for (const document of [fixture.startup, fixture.details]) {
    document.coastalParts.scoreProfile = structuredClone(localProfile);
    document.coastalParts.scoreAvailability = structuredClone(localAvailability);
    document.coastalParts.zones['zone-1'].hourly[0].waders = structuredClone(unavailableMode);
  }
  fixture.manifest.ravScoreProfile = structuredClone(localProfile);
  fixture.manifest.ravScoreAvailability = structuredClone(localAvailability);
  resealPublicDocuments(fixture);
}

function installCompletelyUnavailableMigrationPendingState(fixture) {
  const unavailableProfile = {
    ...fixture.startup.coastalParts.scoreProfile,
    modelCoverageReady: false,
    modelMemoryReady: false,
    modelMigrationReady: false,
    advisories: [
      'LOCAL_MODEL_COVERAGE_INCOMPLETE',
      'LOCAL_MODEL_MEMORY_INCOMPLETE',
      'MODEL_STATE_NOT_CONTINUED_OR_MIGRATED',
    ],
  };
  const unavailableZones = Object.keys(fixture.startup.coastalParts.zones)
    .sort().map(zoneId => ({
      zoneId,
      zoneName: `Zone ${zoneId.slice(5)}`,
      modes: ['waders', 'beach'],
      reasons: ['Et direkte lokalt input mangler.'],
    }));
  const unavailableAvailability = {
    ...fixture.manifest.ravScoreAvailability,
    allZonesActive: false,
    activeZoneCount: 0,
    unavailableZoneCount: unavailableZones.length,
    allCurrentScoresFullHistory: false,
    fullHistoryModeCount: 0,
    historyIncompleteModeCount: 0,
    historyIncompleteZoneCount: 0,
    unavailableZones,
    historyIncompleteZones: [],
  };
  const unavailableMode = unavailableIntegratedMode(fixture);
  for (const document of [fixture.startup, fixture.details]) {
    document.coastalParts.scoreProfile = structuredClone(unavailableProfile);
    document.coastalParts.scoreAvailability = structuredClone(unavailableAvailability);
    for (const zone of Object.values(document.coastalParts.zones)) {
      zone.hourly[0].waders = structuredClone(unavailableMode);
      zone.hourly[0].beach = structuredClone(unavailableMode);
    }
  }
  fixture.manifest.ravScoreProfile = structuredClone(unavailableProfile);
  fixture.manifest.ravScoreAvailability = structuredClone(unavailableAvailability);
  resealPublicDocuments(fixture);
}

function mockFetch(files) {
  return async url => {
    const bytes = files.get(new URL(url).pathname);
    return bytes ? response(bytes) : { ok: false, status: 404, arrayBuffer: async () => new ArrayBuffer(0) };
  };
}

function resealPublicDocuments(fixture) {
  for (const document of [fixture.startup, fixture.details]) {
    document.ravScoreRuntime.payloadBodySha256 = bodySha256(document);
  }
  const startupBytes = jsonBytes(fixture.startup);
  const detailsBytes = jsonBytes(fixture.details);
  fixture.files.set('/data/live/public-conditions.json', startupBytes);
  fixture.files.set('/data/live/public-condition-details.json', detailsBytes);
  fixture.manifest.publicConditionsSha256 = sha256(startupBytes);
  fixture.manifest.publicConditionsBytes = startupBytes.length;
  fixture.manifest.publicConditionDetailsSha256 = sha256(detailsBytes);
  fixture.manifest.publicConditionDetailsBytes = detailsBytes.length;
  Object.assign(fixture.manifest.ravScoreRuntime.startup, {
    payloadBodySha256: fixture.startup.ravScoreRuntime.payloadBodySha256,
    fileSha256: fixture.manifest.publicConditionsSha256,
    bytes: startupBytes.length,
  });
  Object.assign(fixture.manifest.ravScoreRuntime.details, {
    payloadBodySha256: fixture.details.ravScoreRuntime.payloadBodySha256,
    fileSha256: fixture.manifest.publicConditionDetailsSha256,
    bytes: detailsBytes.length,
  });
  fixture.files.set('/data/live/manifest.json', jsonBytes(fixture.manifest));
}

async function verifyBoundedTransientHttpContract() {
  const implementation = sealedImplementation(integratedModelBinding(), 'integrated');
  const { binding, contractText, bundleText, publicClosure } = implementation;
  const fixture = buildFixture(binding, 'integrated');
  fixture.files.set('/js/core/ravscore-model-contract.js', Buffer.from(contractText));
  fixture.files.set('/js/core/ravscore-model-bundle.generated.js', Buffer.from(bundleText));
  for (const [relative, source] of implementation.sources)
    fixture.files.set('/' + relative, Buffer.from(source));
  const options = {
    baseUrl: 'https://ravradar.example.test/', sourceHead,
    expectedManifest: fixture.manifest, expectedModel: 'integrated', expectedBinding: binding,
    expectedContractText: contractText, expectedBundleText: bundleText,
    expectedPublicClosure: publicClosure, observationNonce: 'fixture-bounded-http',
    retryDelayMs: 0,
  };
  const manifestPath = '/data/live/manifest.json';
  const detailsPath = '/data/live/public-condition-details.json';
  const legacyPaths = ['/data/live/public-conditions.json', detailsPath,
    '/data/live/coastal-parts-v2.json', '/data/zones.geojson'];
  const makeFetch = intercept => {
    const counts = new Map(), requests = new Map();
    let cancelled = 0;
    const refused = status => ({
      ok: false, status,
      body: { cancel: async () => { cancelled++; } },
      arrayBuffer: async () => { throw new Error('refused HTTP body must never be read'); },
    });
    const normal = mockFetch(fixture.files);
    return {
      counts, requests, cancellations: () => cancelled,
      fetch: async (url, init) => {
        const pathname = new URL(url).pathname, count = (counts.get(pathname) ?? 0) + 1;
        counts.set(pathname, count);
        requests.set(pathname, [...(requests.get(pathname) ?? []), { url, init }]);
        const selected = await intercept?.({ pathname, count, refused, url, init });
        return selected ?? normal(url, init);
      },
    };
  };
  const baseline = makeFetch();
  assert.equal((await verifyRavScoreOperationalPagesDeployment({
    ...options, fetchImpl: baseline.fetch,
  })).status, 'passed');
  for (const relative of legacyPaths) assert.equal(baseline.counts.get(relative), 1);

  for (const [status, failedPath] of [[502, detailsPath], [503, detailsPath], [504, '/index.html']]) {
    const transient = makeFetch(({ pathname, count, refused }) =>
      pathname === failedPath && count === 1 ? refused(status) : undefined);
    assert.equal((await verifyRavScoreOperationalPagesDeployment({
      ...options, fetchImpl: transient.fetch,
    })).status, 'passed');
    assert.equal(transient.cancellations(), 1);
    for (const [relative, count] of baseline.counts)
      assert.equal(transient.counts.get(relative), count + Number(relative === failedPath),
        'successful files must not be downloaded again after another file has transient HTTP');
    const requests = transient.requests.get(failedPath);
    assert.deepEqual(requests[1], requests[0], 'retry preserves exact URL, source nonce and request options');
  }

  for (const failedPath of [manifestPath, detailsPath]) {
    const permanent = makeFetch(({ pathname, refused }) =>
      pathname === failedPath ? refused(503) : undefined);
    await assert.rejects(verifyRavScoreOperationalPagesDeployment({
      ...options, fetchImpl: permanent.fetch,
    }), /returned HTTP 503/);
    assert.equal(permanent.counts.get(failedPath), 3, 'one file has at most three total attempts');
    assert.equal(permanent.cancellations(), 3);
    assert.equal(permanent.counts.get(manifestPath), failedPath === manifestPath ? 3 : 1,
      '121 manifest observations cannot multiply the exhausted transient budget');
  }

  const globalPaths = [manifestPath, legacyPaths[0], detailsPath, legacyPaths[2]];
  const shared = makeFetch(({ pathname, count, refused }) =>
    globalPaths.includes(pathname) && count === 1 ? refused(503) : undefined);
  await assert.rejects(verifyRavScoreOperationalPagesDeployment({
    ...options, fetchImpl: shared.fetch,
  }), /returned HTTP 503/);
  assert.deepEqual(globalPaths.map(relative => shared.counts.get(relative)), [2, 2, 2, 1],
    'one invocation shares exactly three retry tokens across manifest and all payload files');
  assert.equal(shared.cancellations(), 4);

  const betweenObservations = makeFetch(({ pathname, count, refused }) => {
    assert.equal(pathname, manifestPath);
    return count % 2 ? refused(503) : response(jsonBytes({ datasetId: 'previous-generation' }));
  });
  await assert.rejects(verifyRavScoreOperationalPagesDeployment({
    ...options, fetchImpl: betweenObservations.fetch,
  }), /returned HTTP 503/);
  assert.equal(betweenObservations.counts.get(manifestPath), 7,
    'transient budget is not renewed when a stale manifest starts the next observation');
  assert.equal(betweenObservations.cancellations(), 4);

  const corrupt = makeFetch(({ pathname, count, refused }) => pathname !== detailsPath
    ? undefined : count === 1 ? refused(503) : response(Buffer.from('corrupt after HTTP retry')));
  await assert.rejects(verifyRavScoreOperationalPagesDeployment({
    ...options, fetchImpl: corrupt.fetch,
  }), /artifact digest mismatch.*public-condition-details/);
  assert.equal(corrupt.counts.get(manifestPath), 1);
  assert.equal(corrupt.counts.get(detailsPath), 2);
  assert.equal(corrupt.counts.size, 5);
  for (const relative of legacyPaths.filter(relative => relative !== detailsPath))
    assert.equal(corrupt.counts.get(relative), 1, 'digest failure never restarts the payload closure');

  for (const [status, failedPath] of [[404, manifestPath], [404, detailsPath],
    [401, detailsPath], [403, detailsPath], [429, detailsPath], [500, detailsPath]]) {
    const hard = makeFetch(({ pathname, refused }) => pathname === failedPath ? refused(status) : undefined);
    await assert.rejects(verifyRavScoreOperationalPagesDeployment({
      ...options, fetchImpl: hard.fetch,
    }), new RegExp('returned HTTP ' + status));
    assert.equal(hard.counts.get(failedPath), 1, 'only502/503/504 may retry');
    assert.equal(hard.cancellations(), 1);
    assert.equal(hard.counts.get(manifestPath), 1, 'hard HTTP failures never become manifest propagation');
  }
  const malformed = makeFetch(({ pathname }) =>
    pathname === manifestPath ? response(Buffer.from('{invalid JSON')) : undefined);
  await assert.rejects(verifyRavScoreOperationalPagesDeployment({
    ...options, fetchImpl: malformed.fetch,
  }), /manifest is not JSON/);
  assert.equal(malformed.counts.get(manifestPath), 1);

  for (const phase of ['fetch', 'body', 'cleanup']) {
    const abort = new Error('synthetic abort'); abort.name = 'AbortError';
    const interrupted = makeFetch(({ pathname }) => {
      if (pathname !== detailsPath) return undefined;
      if (phase === 'fetch') throw abort;
      if (phase === 'body') return { ok: true, status: 200, arrayBuffer: async () => { throw abort; } };
      return { ok: false, status: 503, body: { cancel: async () => { throw abort; } } };
    });
    await assert.rejects(verifyRavScoreOperationalPagesDeployment({
      ...options, fetchImpl: interrupted.fetch,
    }), error => error === abort, 'abort/failed physical response cleanup must keep the original failure');
    assert.equal(interrupted.counts.get(detailsPath), 1);
    assert.equal(interrupted.counts.get(manifestPath), 1);
  }
  console.log('Transient HTTP: exact-file502/503/504 retries, shared three-token bound, cleanup, hard failures, abort and one payload pass: passed.');
}

async function verifyManifestOnlyPropagationContract() {
  const implementation = sealedImplementation(integratedModelBinding(), 'integrated');
  const { binding, contractText, bundleText, publicClosure } = implementation;
  const fixture = buildFixture(binding, 'integrated');
  fixture.files.set('/js/core/ravscore-model-contract.js', Buffer.from(contractText));
  fixture.files.set('/js/core/ravscore-model-bundle.generated.js', Buffer.from(bundleText));
  for (const [relative, source] of implementation.sources)
    fixture.files.set('/' + relative, Buffer.from(source));
  const options = {
    baseUrl: 'https://ravradar.example.test/', sourceHead,
    expectedManifest: fixture.manifest, expectedModel: 'integrated', expectedBinding: binding,
    expectedContractText: contractText, expectedBundleText: bundleText,
    expectedPublicClosure: publicClosure, observationNonce: 'fixture-manifest-propagation',
    retryDelayMs: 0,
  };
  const manifestPath = '/data/live/manifest.json';
  const currentFetch = mockFetch(fixture.files);
  const counts = new Map(), manifestNonces = new Set();
  let manifestReads = 0;
  const delayedFetch = async (url, init) => {
    const parsed = new URL(url), relative = parsed.pathname;
    counts.set(relative, (counts.get(relative) ?? 0) + 1);
    if (relative === manifestPath) {
      manifestReads++;
      assert.equal(manifestNonces.has(parsed.searchParams.get('ravscore-observation')), false);
      manifestNonces.add(parsed.searchParams.get('ravscore-observation'));
      if (manifestReads <= 40) {
        assert.equal(counts.size, 1, 'stale manifest polling must not fetch payloads');
        return response(jsonBytes({ datasetId: 'previous-generation' }));
      }
    }
    return currentFetch(url, init);
  };
  const propagated = await verifyRavScoreOperationalPagesDeployment({
    ...options, fetchImpl: delayedFetch,
  });
  assert.equal(propagated.status, 'passed');
  assert.equal(manifestReads, 41, 'default polling must survive more than 36 stale observations');
  assert.equal(manifestNonces.size, 41);
  const expectedPayloadReads = new Map();
  for (const relative of [
    '/data/live/public-conditions.json', '/data/live/public-condition-details.json',
    '/data/live/coastal-parts-v2.json', '/data/zones.geojson',
    '/js/core/ravscore-model-contract.js', '/js/core/ravscore-model-bundle.generated.js',
    ...publicClosure.htmlEntrypoints.map(item => '/' + item.path),
    ...publicClosure.files.map(item => '/' + item.path),
  ]) expectedPayloadReads.set(relative, (expectedPayloadReads.get(relative) ?? 0) + 1);
  assert.deepEqual(new Map([...counts].filter(([relative]) => relative !== manifestPath)),
    expectedPayloadReads, 'one unchanged complete verification pass follows manifest match');

  for (const [label, alteredManifest] of [
    ['old generation', { datasetId: 'previous-generation' }],
    ['same dataset with changed manifest', { ...fixture.manifest, publicConditionsBytes: fixture.manifest.publicConditionsBytes + 1 }],
  ]) {
    let reads = 0, payloadReads = 0;
    await assert.rejects(verifyRavScoreOperationalPagesDeployment({
      ...options,
      fetchImpl: async url => {
        if (new URL(url).pathname !== manifestPath) {
          payloadReads++;
          throw new Error('unexpected payload fetch before exact manifest');
        }
        reads++;
        return response(jsonBytes(alteredManifest));
      },
    }), /manifest differs from the sealed artifact/, label);
    assert.equal(reads, 121, label + ' exhausts only the bounded manifest phase');
    assert.equal(payloadReads, 0, label + ' must never qualify by dataset id alone');
  }

  const mutatedCounts = new Map();
  const mutatedFetch = async (url, init) => {
    const relative = new URL(url).pathname;
    mutatedCounts.set(relative, (mutatedCounts.get(relative) ?? 0) + 1);
    if (relative === '/data/live/public-condition-details.json')
      return response(Buffer.from('detail mutation after exact manifest'));
    return currentFetch(url, init);
  };
  await assert.rejects(verifyRavScoreOperationalPagesDeployment({
    ...options, fetchImpl: mutatedFetch,
  }), /artifact digest mismatch.*public-condition-details/);
  assert.equal(mutatedCounts.get(manifestPath), 1);
  assert.equal(mutatedCounts.size, 5, 'only manifest and the four original payloads precede digest rejection');
  for (const [relative, count] of mutatedCounts)
    assert.equal(count, 1, relative + ' must fail immediately without a full-package retry');

  for (const [key, invalidValues] of [
    ['attempts', [0, 122, 1.5, -1, NaN, Infinity, '121', null]],
    ['retryDelayMs', [-1, 5001, 0.5, NaN, Infinity, '0', null]],
  ]) {
    for (const invalid of invalidValues) {
      let fetches = 0;
      await assert.rejects(verifyRavScoreOperationalPagesDeployment({
        ...options, [key]: invalid,
        fetchImpl: async () => { fetches++; throw new Error('invalid polling inputs must not fetch'); },
      }), /verification inputs are incompatible/, key + ' must be a bounded safe integer');
      assert.equal(fetches, 0);
    }
  }
  console.log('Manifest-only propagation: 40 stale then exact, 121 bounded mismatches, same-id drift, single payload pass and input bounds: passed.');
}

async function verifySealedStartupPropagationContract() {
  const implementation = sealedImplementation(integratedModelBinding(), 'integrated');
  const { binding, contractText, bundleText, publicClosure } = implementation;
  const fixture = buildFixture(binding, 'integrated');
  fixture.files.set('/js/core/ravscore-model-contract.js', Buffer.from(contractText));
  fixture.files.set('/js/core/ravscore-model-bundle.generated.js', Buffer.from(bundleText));
  for (const [relative, source] of implementation.sources)
    fixture.files.set('/' + relative, Buffer.from(source));
  const options = {
    baseUrl: 'https://ravradar.example.test/', sourceHead,
    expectedManifest: fixture.manifest, expectedModel: 'integrated', expectedBinding: binding,
    expectedContractText: contractText, expectedBundleText: bundleText,
    expectedPublicClosure: publicClosure, observationNonce: 'fixture-startup-propagation', retryDelayMs: 0,
  };
  const manifestPath = '/data/live/manifest.json', startupPath = '/data/live/public-conditions.json';
  const detailsPath = '/data/live/public-condition-details.json';
  const normal = mockFetch(fixture.files), counts = new Map(), nonces = new Set();
  let observations = 0;
  const verified = await verifyRavScoreOperationalPagesDeployment({
    ...options, fetchImpl: async (url, init) => {
      const parsed = new URL(url), relative = parsed.pathname;
      counts.set(relative, (counts.get(relative) ?? 0) + 1);
      assert.equal(init.cache, 'no-store');
      if (relative === manifestPath) {
        observations++;
        const nonce = parsed.searchParams.get('ravscore-observation');
        assert(!nonces.has(nonce)); nonces.add(nonce);
        return normal(url, init);
      }
      if (relative === startupPath && observations <= 8) {
        assert.equal(counts.get(detailsPath) ?? 0, 0, 'stale startup must not download large details');
        return response(Buffer.from('previous startup generation'));
      }
      return normal(url, init);
    },
  });
  assert.equal(verified.status, 'passed');
  assert.equal(observations, 9); assert.equal(nonces.size, 9);
  assert.equal(counts.get(startupPath), 9, 'matched startup bytes are reused without another GET');
  assert.equal(counts.get(detailsPath), 1, 'the complete large payload is checked once');

  const permanent = new Map();
  await assert.rejects(verifyRavScoreOperationalPagesDeployment({
    ...options, attempts: 3, fetchImpl: async (url, init) => {
      const relative = new URL(url).pathname; permanent.set(relative, (permanent.get(relative) ?? 0) + 1);
      return relative === startupPath ? response(Buffer.from('persistent invalid startup')) : normal(url, init);
    },
  }), /artifact digest mismatch.*public-conditions/);
  assert.deepEqual(permanent, new Map([[manifestPath, 3], [startupPath, 3]]),
    'bounded corruption refuses without any large payload or implementation request');

  const changedManifest = { ...fixture.manifest, datasetId: 'different generation' };
  const moving = new Map(); let movingObservation = 0;
  assert.equal((await verifyRavScoreOperationalPagesDeployment({
    ...options, attempts: 3, fetchImpl: async (url, init) => {
      const parsed = new URL(url), relative = parsed.pathname;
      moving.set(relative, (moving.get(relative) ?? 0) + 1);
      if (relative === manifestPath) {
        movingObservation++;
        return movingObservation === 2 ? response(jsonBytes(changedManifest)) : normal(url, init);
      }
      if (relative === startupPath) {
        assert.equal(parsed.searchParams.get('ravscore-observation'), options.observationNonce + '-' + movingObservation);
        if (movingObservation === 1) return response(Buffer.from('previous startup generation'));
      }
      return normal(url, init);
    },
  })).status, 'passed');
  assert.equal(moving.get(manifestPath), 3); assert.equal(moving.get(startupPath), 2);
  assert.equal(moving.get(detailsPath), 1, 'a new manifest must be read before every startup observation');

  for (const failure of ['http404', 'network', 'body']) {
    const failed = new Map();
    await assert.rejects(verifyRavScoreOperationalPagesDeployment({
      ...options, fetchImpl: async (url, init) => {
        const relative = new URL(url).pathname; failed.set(relative, (failed.get(relative) ?? 0) + 1);
        if (relative !== startupPath) return normal(url, init);
        if (failure === 'http404') return { ok: false, status: 404 };
        if (failure === 'network') throw new Error('fixed synthetic network refusal');
        return { ok: true, status: 200, arrayBuffer: async () => { throw new Error('fixed synthetic body refusal'); } };
      },
    }), /HTTP 404|fixed synthetic (?:network|body) refusal/);
    assert.deepEqual(failed, new Map([[manifestPath, 1], [startupPath, 1]]),
      'hard HTTP, transport and body errors never become propagation retries');
  }
  console.log('Sealed manifest/startup pair: delayed200 then exact, permanent corruption, changed manifest, no large refetch and hard failures: passed.');
}


async function verifyNormalPublishedOwnerCompletion() {
  const {default:path}=await import('node:path'),{tmpdir}=await import('node:os');
  const p=await import('./protected-operational-reentry-evidence.mjs');
  const repository='jakobjorgensen82-commits/RavRadar',runId=88001,attemptId='pages-88001-1';
  const owner={repository,runId,runAttempt:1,headSha:sourceHead,attemptId};
  const sealed=sealedImplementation(integratedModelBinding(),'integrated');
  const {binding,contractText,bundleText,publicClosure}=sealed;
  const implementation=computeSealedPublicImplementationClosureIdentity({expectedModel:'integrated',
    expectedBinding:binding,expectedContractText:contractText,expectedBundleText:bundleText,expectedPublicClosure:publicClosure});
  const f=buildFixture(binding,'integrated');
  for(const [name,bytes]of sealed.sources)f.files.set('/'+name,Buffer.from(bytes));
  f.files.set('/index.html',Buffer.from(INDEX_HTML));f.files.set('/admin.html',Buffer.from(ADMIN_HTML));
  f.files.set('/js/core/ravscore-model-bundle.generated.js',Buffer.from(bundleText));
  const directory=await fs.mkdtemp(path.join(tmpdir(),'rr-pages-owner-public-completion-'));
  const priorToken=process.env.GH_TOKEN;process.env.GH_TOKEN='synthetic-owner-token';
  try {
    const seal={schemaVersion:'ravscore-operational-pages-artifact-seal-v1',repository,runId,runAttempt:1,
      headSha:sourceHead,ref:'refs/heads/main',attemptId,artifactId:99001,artifactName:'github-pages',
      artifactDigestSha256:'b'.repeat(64),artifactSizeBytes:12345,targetPublicManifestSha256:sha256(JSON.stringify(canonical(f.manifest))),
      targetImplementationClosureSha256:implementation.implementationClosureSha256,targetModelBinding:binding,
      createdAt:'2026-08-29T12:06:00.000Z',privatePayloadIncluded:false};
    const handoff={schemaVersion:'ravscore-operational-deploy-handoff-v2',action:'integrated',sourceHead,centralVersion:3,
      legacySourceRequired:false,checkpointDisposition:'READY_PUBLISHED',checkpointDispositionSha256:'c'.repeat(64),
      checkpointDatasetId:f.datasetId,checkpointRuntimeAuditSha256:'d'.repeat(64),
      checkpointBuildOutcome:'success',checkpointSaveOutcome:'success',checkpointPublishOutcome:'success',privatePayloadIncluded:false};
    const writes={'manifest.json':JSON.stringify(f.manifest),'handoff.json':JSON.stringify(handoff),
      'pages-artifact-seal.json':JSON.stringify(seal),'target-binding.json':JSON.stringify(binding),
      'target-public-closure.json':JSON.stringify(publicClosure),'target-contract.js':contractText,
      'target-bundle.generated.js':bundleText,'public-audit.json':JSON.stringify({datasetId:f.datasetId,privatePayloadIncluded:false}),
      'checkpoint-disposition.json':JSON.stringify({datasetId:f.datasetId,privatePayloadIncluded:false}),
      'checkpoint-runtime-audit.json':JSON.stringify({datasetId:f.datasetId,privatePayloadIncluded:false})};
    for(const[name,text]of Object.entries(writes))await fs.writeFile(path.join(directory,name),text);
    const built=await p.buildProtectedOperationalEvidenceArchive({directory,deploymentId:attemptId,repository});
    const pointer={document_key:p.PROTECTED_OPERATIONAL_REENTRY_EVIDENCE_POLICY.documentKey,version:7,
      payload:{schemaVersion:'3.0.0',kind:p.PROTECTED_OPERATIONAL_REENTRY_EVIDENCE_POLICY.pointerKind,
        current:built.descriptor,previous:null,pagesWrite:{target:built.descriptor,owner}}};
    const skipped=(id,name)=>({id,run_id:runId,run_attempt:1,head_sha:sourceHead,name,status:'completed',conclusion:'skipped'});
    const jobs=[{...skipped(1,'Deploy prepared Pages artifact'),conclusion:'failure',steps:[
      {name:'Deploy to GitHub Pages',number:30,status:'completed',conclusion:'failure',completed_at:'2026-08-29T12:07:00Z'},
      {name:'Confirm scheduled Pages writes are terminal and unpublished',number:31,status:'completed',conclusion:'skipped'}]},
      skipped(2,'Finish an interrupted generation before new work / resume-pre-activation-pages'),
      skipped(3,'Redeploy only a helper-proven exact sealed Pages target')];
    const run={id:runId,run_attempt:1,head_sha:sourceHead,head_branch:'main',repository:{full_name:repository},
      path:'.github/workflows/run-current-weather-once.yml',status:'completed',conclusion:'failure',updated_at:'2026-08-29T12:08:00Z'};
    async function invoke({publicFiles=f.files,mutateRun,mutateJobs,mutatePointer,corruptArchive=false,storagePresent=true}={}) {
      let publicReads=0,githubReads=0,writes=0,downloads=0;
      const fetchImpl=async(input,options={})=>{
        assert(!options.method||options.method==='GET','completion never creates/cancels/retries a deployment');
        const url=new URL(input);
        if(url.origin==='https://api.github.com'){githubReads++;
          const value=url.pathname.endsWith('/jobs')?{total_count:jobs.length,jobs:structuredClone(jobs)}:structuredClone(run);
          if(value.jobs&&mutateJobs)mutateJobs(value.jobs,publicReads);
          if(!value.jobs&&mutateRun)mutateRun(value,publicReads);
          return {ok:true,json:async()=>value};}
        assert.equal(url.origin,'https://ravradar.dk');publicReads++;
        const bytes=publicFiles.get(url.pathname);return new Response(bytes??'',{status:bytes?200:404});
      };
      const request=async(_suffix,options={})=>{if(options.method&&options.method!=='GET'){writes++;throw Error('Unexpected completion write');}
        const row=structuredClone(pointer);if(mutatePointer)mutatePointer(row,publicReads);return[row];};
      const storage={download:async name=>{downloads++;assert.equal(name,built.descriptor.objectPath);
        return corruptArchive?Buffer.from('not the sealed archive'):Buffer.from(built.archive);}};
      const result=await p.assertProtectedPagesWritesClosed({request,repository,fetchImpl,...(storagePresent?{storage}:{})});
      assert.equal(writes,0);return{result,publicReads,githubReads,downloads};
    }
    const completed=await invoke();assert.equal(completed.result.closed,true);assert(completed.publicReads>publicClosure.files.length);
    assert(completed.githubReads>=6,'full authenticated writer metadata is read again after public verification');
    assert.equal(completed.downloads,1);
    const unchanged=JSON.stringify(pointer);
    for(const options of [
      {storagePresent:false},{corruptArchive:true},
      {publicFiles:new Map([...f.files].filter(([name])=>name!=='/js/services/rav-assistant.js'))},
      {publicFiles:new Map([...f.files].map(([name,bytes])=>[name,name==='/data/live/manifest.json'?Buffer.from('{}'):bytes]))},
      {mutateJobs:rows=>{rows[1].status='in_progress';}},
      {mutateJobs:rows=>{rows[0].steps[0].number=0;}},
      {mutateJobs:rows=>{rows[0].steps[0].completed_at=null;}},
      {mutateRun:value=>{value.updated_at=null;}},
      {mutateJobs:rows=>{rows.push({...rows[0],id:4,name:'Unknown extra writer'});}},
      {mutateRun:(value,reads)=>{if(reads)value.run_attempt=2;}},
      {mutateRun:(value,reads)=>{if(reads)value.updated_at='2026-08-29T12:09:00Z';}},
      {mutateJobs:(rows,reads)=>{if(reads)rows[0].steps[0].conclusion='success';}},
      {mutatePointer:(value,reads)=>{if(reads){value.payload.pagesWrite.owner.runId++;value.payload.pagesWrite.owner.attemptId='pages-88002-1';}}},
      {mutatePointer:(value,reads)=>{if(reads)value.version++;}},
    ])await assert.rejects(invoke(options),/PAGES_OWNER_/);
    assert.equal(JSON.stringify(pointer),unchanged,'no completion qualification changes or deletes the durable owner');
    console.log('Normal protected Pages owner: exact public target after failed observation, full verifier and fresh all-writer/pointer reads; strict negatives: passed.');
  } finally {if(priorToken===undefined)delete process.env.GH_TOKEN;else process.env.GH_TOKEN=priorToken;
    await fs.rm(directory,{recursive:true,force:true});}
}
if(process.argv.includes('--owner-completion-only')) {
  await verifyNormalPublishedOwnerCompletion();
  await verifyPreActivationClearRestoresLegacyPointer();
  await verifyPreActivationClearRestoresLegacyPointer({publishedOrdinary:true});
  await verifyPreActivationClearRestoresLegacyPointer({publishedOrdinary:true,pagesWriteOnly:true});
  console.log('Owner-completion and existing final phase-clear guards: passed.');
  process.exit(0);
}
await verifyNormalPublishedOwnerCompletion();

await verifySealed594CompactShareRegression();
await verifySealedStartupPropagationContract();
await verifyManifestOnlyPropagationContract();
await verifyBoundedTransientHttpContract();

for (const [mode, baseBinding] of [
  ['integrated', integratedModelBinding()],
  ['candidate-g', candidateModelBinding()],
]) {
  const implementation = sealedImplementation(baseBinding, mode);
  const { binding, contractText, bundleText, publicClosure } = implementation;
  const fixture = buildFixture(binding, mode);
  fixture.files.set('/js/core/ravscore-model-contract.js', Buffer.from(contractText));
  fixture.files.set('/js/core/ravscore-model-bundle.generated.js', Buffer.from(bundleText));
  for (const [relative, source] of implementation.sources) {
    fixture.files.set(`/${relative}`, Buffer.from(source));
  }
  const result = await verifyRavScoreOperationalPagesDeployment({
    baseUrl: 'https://ravradar.example.test/',
    sourceHead,
    expectedManifest: fixture.manifest,
    expectedModel: mode,
    expectedBinding: binding,
    expectedContractText: contractText,
    expectedBundleText: bundleText,
    expectedPublicClosure: publicClosure,
    observationNonce: 'fixture-observation-01',
    fetchImpl: mockFetch(fixture.files),
    attempts: 1,
  });
  assert.equal(result.status, 'passed');
  assert.equal(result.model, mode);
  assert.equal(result.zoneCount, 210);
  assert.equal(result.coastalPartCount, 673);
  assert.equal(result.privatePayloadRead, false);
  assert.deepEqual(result.modelBinding, binding);
  if (mode === 'integrated') {
    const fetchCurrent = mockFetch(fixture.files);
    let staleManifestReads = 0;
    const delayedPagesFetch = async url => {
      if (new URL(url).pathname === '/data/live/manifest.json'
        && staleManifestReads++ < 12) {
        return response(Buffer.from('{"datasetId":"previous-generation"}'));
      }
      return fetchCurrent(url);
    };
    const delayedResult = await verifyRavScoreOperationalPagesDeployment({
      baseUrl: 'https://ravradar.example.test/',
      sourceHead,
      expectedManifest: fixture.manifest,
      expectedModel: mode,
      expectedBinding: binding,
      expectedContractText: contractText,
      expectedBundleText: bundleText,
      expectedPublicClosure: publicClosure,
      observationNonce: 'fixture-delayed-pages',
      fetchImpl: delayedPagesFetch,
      attempts: 13,
      retryDelayMs: 0,
    });
    assert.equal(delayedResult.status, 'passed');
    assert.equal(staleManifestReads, 13,
      'a valid sealed artifact must survive Pages serving an old manifest for twelve checks');
  }
  const predeployIdentity = computeSealedPublicImplementationClosureIdentity({
    expectedModel: mode,
    expectedBinding: binding,
    expectedContractText: contractText,
    expectedBundleText: bundleText,
    expectedPublicClosure: publicClosure,
  });
  assert.equal(result.implementationClosureSha256,
    predeployIdentity.implementationClosureSha256,
    'the predeploy seal and deployed byte verification must produce one canonical identity');
  const mutatedClosure = structuredClone(publicClosure);
  const mutableItem = mutatedClosure.files.find(item => item.path === 'bootstrap.js');
  mutableItem.sha256 = 'f'.repeat(64);
  const mutatedIdentity = computeSealedPublicImplementationClosureIdentity({
    expectedModel: mode,
    expectedBinding: binding,
    expectedContractText: contractText,
    expectedBundleText: bundleText,
    expectedPublicClosure: mutatedClosure,
  });
  assert.notEqual(mutatedIdentity.implementationClosureSha256,
    predeployIdentity.implementationClosureSha256,
    'a mutated transitive public file must alter the predeploy implementation identity');

  const tamperedFiles = new Map(fixture.files);
  tamperedFiles.set('/data/live/public-condition-details.json', Buffer.from('tampered'));
  await assert.rejects(() => verifyRavScoreOperationalPagesDeployment({
    baseUrl: 'https://ravradar.example.test/',
    sourceHead,
    expectedManifest: fixture.manifest,
    expectedModel: mode,
    expectedBinding: binding,
    expectedContractText: contractText,
    expectedBundleText: bundleText,
    expectedPublicClosure: publicClosure,
    observationNonce: 'fixture-observation-02',
    fetchImpl: mockFetch(tamperedFiles),
    attempts: 1,
  }), /digest mismatch/);

  for (const [label, mutate] of [
    ['partial startup profile', invalid => {
      delete invalid.startup.coastalParts.scoreProfile.rankingPolicyId;
      resealPublicDocuments(invalid);
    }],
    ['extra detail profile field', invalid => {
      invalid.details.coastalParts.scoreProfile.unexpectedShadowBinding = 'forbidden';
      resealPublicDocuments(invalid);
    }],
    ['forged manifest profile policy', invalid => {
      invalid.manifest.ravScoreProfile.bestTimePolicyId = 'forged-best-time';
      invalid.files.set('/data/live/manifest.json', jsonBytes(invalid.manifest));
    }],
    ['extra payload envelope field', invalid => {
      invalid.startup.ravScoreRuntime.hiddenFallback = true;
      resealPublicDocuments(invalid);
    }],
    ['extra manifest runtime field', invalid => {
      invalid.manifest.ravScoreRuntime.hiddenFallback = true;
      invalid.files.set('/data/live/manifest.json', jsonBytes(invalid.manifest));
    }],
    ['partial manifest runtime descriptor', invalid => {
      delete invalid.manifest.ravScoreRuntime.details.fileSha256;
      invalid.files.set('/data/live/manifest.json', jsonBytes(invalid.manifest));
    }],
  ]) {
    const invalid = buildFixture(binding, mode);
    invalid.files.set('/js/core/ravscore-model-contract.js', Buffer.from(contractText));
    invalid.files.set('/js/core/ravscore-model-bundle.generated.js', Buffer.from(bundleText));
    for (const [relative, source] of implementation.sources) {
      invalid.files.set(`/${relative}`, Buffer.from(source));
    }
    mutate(invalid);
    await assert.rejects(() => verifyRavScoreOperationalPagesDeployment({
      baseUrl: 'https://ravradar.example.test/',
      sourceHead,
      expectedManifest: invalid.manifest,
      expectedModel: mode,
      expectedBinding: binding,
      expectedContractText: contractText,
      expectedBundleText: bundleText,
      expectedPublicClosure: publicClosure,
      observationNonce: 'fixture-observation-invalid',
      fetchImpl: mockFetch(invalid.files),
      attempts: 1,
    }), /profile|runtime|field set|match|incompatible/i, `${mode}: ${label}`);
  }

  const transitiveMutation = new Map(fixture.files);
  transitiveMutation.set('/js/core/local-zone-score.js', Buffer.from('// mutated transitive score consumer\n'));
  await assert.rejects(() => verifyRavScoreOperationalPagesDeployment({
    baseUrl: 'https://ravradar.example.test/',
    sourceHead,
    expectedManifest: fixture.manifest,
    expectedModel: mode,
    expectedBinding: binding,
    expectedContractText: contractText,
    expectedBundleText: bundleText,
    expectedPublicClosure: publicClosure,
    observationNonce: 'fixture-observation-transitive',
    fetchImpl: mockFetch(transitiveMutation),
    attempts: 1,
  }), /public browser implementation closure drifted.*local-zone-score/);

  const bootstrapMutation = new Map(fixture.files);
  bootstrapMutation.set('/bootstrap.js', Buffer.from('// loads a different app\n'));
  await assert.rejects(() => verifyRavScoreOperationalPagesDeployment({
    baseUrl: 'https://ravradar.example.test/',
    sourceHead,
    expectedManifest: fixture.manifest,
    expectedModel: mode,
    expectedBinding: binding,
    expectedContractText: contractText,
    expectedBundleText: bundleText,
    expectedPublicClosure: publicClosure,
    observationNonce: 'fixture-observation-bootstrap',
    fetchImpl: mockFetch(bootstrapMutation),
    attempts: 1,
  }), /public browser implementation closure drifted.*bootstrap/);

  const htmlTargetMutation = new Map(fixture.files);
  htmlTargetMutation.set('/index.html', Buffer.from('<script type="module" src="evil.js"></script>'));
  await assert.rejects(() => verifyRavScoreOperationalPagesDeployment({
    baseUrl: 'https://ravradar.example.test/', sourceHead,
    expectedManifest: fixture.manifest, expectedModel: mode, expectedBinding: binding,
    expectedContractText: contractText, expectedBundleText: bundleText,
    expectedPublicClosure: publicClosure,
    observationNonce: 'fixture-observation-html',
    fetchImpl: mockFetch(htmlTargetMutation), attempts: 1,
  }), /HTML entrypoint differs from the sealed browser closure/);

  const contractSideEffect = `${contractText}globalThis.forbidden = true;\n`;
  const contractMutation = new Map(fixture.files);
  contractMutation.set('/js/core/ravscore-model-contract.js', Buffer.from(contractSideEffect));
  await assert.rejects(() => verifyRavScoreOperationalPagesDeployment({
    baseUrl: 'https://ravradar.example.test/', sourceHead,
    expectedManifest: fixture.manifest, expectedModel: mode, expectedBinding: binding,
    expectedContractText: contractSideEffect, expectedBundleText: bundleText,
    expectedPublicClosure: publicClosure,
    observationNonce: 'fixture-observation-contract',
    fetchImpl: mockFetch(contractMutation), attempts: 1,
  }), /contract source differs from the bundle closure/);

  await assert.rejects(() => verifyRavScoreOperationalPagesDeployment({
    baseUrl: 'https://ravradar.example.test/',
    sourceHead,
    expectedManifest: fixture.manifest,
    expectedModel: mode,
    expectedBinding: binding,
    expectedContractText: contractText,
    expectedBundleText: `${bundleText}\nconsole.log('forbidden');\n`,
    expectedPublicClosure: publicClosure,
    observationNonce: 'fixture-observation-bundle',
    fetchImpl: mockFetch(fixture.files),
    attempts: 1,
  }), /executable extra syntax|manifest is not JSON/);
}

const historyImplementation = sealedImplementation(integratedModelBinding(), 'integrated');
const attachIntegratedImplementation = fixture => {
  fixture.files.set('/js/core/ravscore-model-contract.js',
    Buffer.from(historyImplementation.contractText));
  fixture.files.set('/js/core/ravscore-model-bundle.generated.js',
    Buffer.from(historyImplementation.bundleText));
  for (const [relative, source] of historyImplementation.sources) {
    fixture.files.set(`/${relative}`, Buffer.from(source));
  }
  return fixture;
};
const verifyIntegratedFixture = fixture => verifyRavScoreOperationalPagesDeployment({
  baseUrl: 'https://ravradar.example.test/',
  sourceHead,
  expectedManifest: fixture.manifest,
  expectedModel: 'integrated',
  expectedBinding: historyImplementation.binding,
  expectedContractText: historyImplementation.contractText,
  expectedBundleText: historyImplementation.bundleText,
  expectedPublicClosure: historyImplementation.publicClosure,
  observationNonce: 'fixture-history-incomplete',
  fetchImpl: mockFetch(fixture.files),
  attempts: 1,
});

const historyIncomplete = attachIntegratedImplementation(
  buildFixture(historyImplementation.binding, 'integrated'),
);
installHistoryIncompleteIntegratedState(historyIncomplete);
assert.equal((await verifyIntegratedFixture(historyIncomplete)).status, 'passed',
  'an exact all-active HISTORY_INCOMPLETE deployment remains operational');

// The normal producer can have mature state memory while causal wave or
// last-mile uncertainty remains. Keep the lower-bound quality and its reasons;
// a complete 48-hour current window is not a FULL_HISTORY claim.
for (const reason of ['WAVE_MOBILISATION_HISTORY_INCOMPLETE',
  'LAST_MILE_HISTORY_INCOMPLETE']) {
  const readyWithCausalUncertainty = attachIntegratedImplementation(
    buildFixture(historyImplementation.binding, 'integrated'),
  );
  installHistoryIncompleteIntegratedState(readyWithCausalUncertainty);
  for (const profile of [readyWithCausalUncertainty.startup.coastalParts.scoreProfile,
    readyWithCausalUncertainty.details.coastalParts.scoreProfile,
    readyWithCausalUncertainty.manifest.ravScoreProfile]) {
    profile.modelMemoryReady = true;
    profile.advisories = [];
  }
  for (const availability of [readyWithCausalUncertainty.manifest.ravScoreAvailability,
    readyWithCausalUncertainty.startup.coastalParts.scoreAvailability,
    readyWithCausalUncertainty.details.coastalParts.scoreAvailability]) {
    availability.historyIncompleteZones[0].historyCoverageHours = 48;
    availability.historyIncompleteZones[0].historyReasonCodes = [reason];
  }
  for (const document of [readyWithCausalUncertainty.startup,
    readyWithCausalUncertainty.details]) {
    const mode = document.coastalParts.zones['zone-1'].hourly[0].waders;
    mode.historyCoverageHours = 48;
    mode.historyReasonCodes = [reason];
  }
  resealPublicDocuments(readyWithCausalUncertainty);
  assert.equal((await verifyIntegratedFixture(readyWithCausalUncertainty)).status,
    'passed', 'mature memory must preserve and accept causal uncertainty: ' + reason);
  assert.equal(readyWithCausalUncertainty.manifest.ravScoreAvailability
    .allCurrentScoresFullHistory, false);
  assert.equal(readyWithCausalUncertainty.details.coastalParts.zones['zone-1']
    .hourly[0].waders.calibrationEligible, false);
}

const partialParts = attachIntegratedImplementation(
  buildFixture(historyImplementation.binding, 'integrated'),
);
for (const profile of [partialParts.startup.coastalParts.scoreProfile,
  partialParts.details.coastalParts.scoreProfile, partialParts.manifest.ravScoreProfile]) {
  profile.modelCoverageReady = false;
  profile.advisories = ['LOCAL_MODEL_COVERAGE_INCOMPLETE'];
}
resealPublicDocuments(partialParts);
assert.equal((await verifyIntegratedFixture(partialParts)).status, 'passed',
  'usable zones do not falsely imply every underlying part has direct-input coverage');

const mixedInitialization = attachIntegratedImplementation(
  buildFixture(historyImplementation.binding, 'integrated'),
);
installHistoryIncompleteIntegratedState(mixedInitialization);
for (const profile of [mixedInitialization.startup.coastalParts.scoreProfile,
  mixedInitialization.details.coastalParts.scoreProfile,
  mixedInitialization.manifest.ravScoreProfile]) {
  profile.modelMigrationReady = false;
  profile.advisories.push('MODEL_STATE_NOT_CONTINUED_OR_MIGRATED');
}
resealPublicDocuments(mixedInitialization);
assert.equal((await verifyIntegratedFixture(mixedInitialization)).status, 'passed',
  'an honestly declared migration advisory does not reject a sealed usable deployment');

const entirelyUnavailable = attachIntegratedImplementation(
  buildFixture(historyImplementation.binding, 'integrated'),
);
installCompletelyUnavailableMigrationPendingState(entirelyUnavailable);
assert.equal((await verifyIntegratedFixture(entirelyUnavailable)).status, 'passed',
  'an honestly unavailable sealed deployment can complete bookkeeping without inventing scores');

const locallyUnavailable = attachIntegratedImplementation(
  buildFixture(historyImplementation.binding, 'integrated'),
);
installLocallyUnavailableIntegratedState(locallyUnavailable);
assert.equal((await verifyIntegratedFixture(locallyUnavailable)).status, 'passed',
  'one exact local direct-input gap must not reject the otherwise sealed deployment');

const unavailableWithIncompleteMemory = attachIntegratedImplementation(
  buildFixture(historyImplementation.binding, 'integrated'),
);
installLocallyUnavailableIntegratedState(unavailableWithIncompleteMemory);
for (const profile of [
  unavailableWithIncompleteMemory.startup.coastalParts.scoreProfile,
  unavailableWithIncompleteMemory.details.coastalParts.scoreProfile,
  unavailableWithIncompleteMemory.manifest.ravScoreProfile,
]) {
  profile.modelMemoryReady = false;
  profile.advisories = [
    'LOCAL_MODEL_COVERAGE_INCOMPLETE',
    'LOCAL_MODEL_MEMORY_INCOMPLETE',
  ];
}
resealPublicDocuments(unavailableWithIncompleteMemory);
assert.equal((await verifyIntegratedFixture(unavailableWithIncompleteMemory)).status, 'passed',
  'one local direct-input gap may coexist with honestly incomplete raw model memory');

const combinedButFalseMemoryReady = attachIntegratedImplementation(
  buildFixture(historyImplementation.binding, 'integrated'),
);
installLocallyUnavailableIntegratedState(combinedButFalseMemoryReady);
const combinedAvailability = {
  ...combinedButFalseMemoryReady.manifest.ravScoreAvailability,
  fullHistoryModeCount: 418,
  historyIncompleteModeCount: 1,
  historyIncompleteZoneCount: 1,
  historyIncompleteZones: [{
    zoneId: 'zone-2',
    zoneName: 'Zone 2',
    modes: ['waders'],
    historyCoverageHours: 24,
    historyReasonCodes: ['CURRENT_HISTORY_INCOMPLETE'],
  }],
};
combinedButFalseMemoryReady.manifest.ravScoreAvailability = combinedAvailability;
for (const document of [
  combinedButFalseMemoryReady.startup,
  combinedButFalseMemoryReady.details,
]) {
  document.coastalParts.scoreAvailability = structuredClone(combinedAvailability);
  Object.assign(document.coastalParts.zones['zone-2'].hourly[0].waders, {
    scoreQuality: 'HISTORY_INCOMPLETE',
    calibrationEligible: false,
    scoreSemantics: 'CONSERVATIVE_ENCLOSING_LOWER_BOUND',
    historyCoverageHours: 24,
    historyReasonCodes: ['CURRENT_HISTORY_INCOMPLETE'],
  });
}
resealPublicDocuments(combinedButFalseMemoryReady);
await assert.rejects(() => verifyIntegratedFixture(combinedButFalseMemoryReady),
  /history controls/i,
  'local unavailability must not hide a false memory-ready profile elsewhere');

for (const [label, mutate] of [
  ['malformed history counts', fixture => {
    fixture.manifest.ravScoreAvailability.historyIncompleteModeCount = 2;
    fixture.manifest.ravScoreAvailability.fullHistoryModeCount = 418;
  }],
  ['malformed history zone summary', fixture => {
    fixture.manifest.ravScoreAvailability.historyIncompleteZones[0]
      .historyReasonCodes = [];
  }],
  ['unavailable zone', fixture => {
    fixture.manifest.ravScoreAvailability.allZonesActive = false;
    fixture.manifest.ravScoreAvailability.activeZoneCount = 209;
    fixture.manifest.ravScoreAvailability.unavailableZoneCount = 1;
    fixture.manifest.ravScoreAvailability.unavailableZones = [{ zoneId: 'zone-2' }];
  }],
  ['migration not ready', fixture => {
    for (const profile of [
      fixture.startup.coastalParts.scoreProfile,
      fixture.details.coastalParts.scoreProfile,
      fixture.manifest.ravScoreProfile,
    ]) profile.modelMigrationReady = false;
  }],
  ['coverage not ready', fixture => {
    for (const profile of [
      fixture.startup.coastalParts.scoreProfile,
      fixture.details.coastalParts.scoreProfile,
      fixture.manifest.ravScoreProfile,
    ]) profile.modelCoverageReady = false;
  }],
]) {
  const invalid = attachIntegratedImplementation(
    buildFixture(historyImplementation.binding, 'integrated'),
  );
  installHistoryIncompleteIntegratedState(invalid);
  mutate(invalid);
  resealPublicDocuments(invalid);
  await assert.rejects(() => verifyIntegratedFixture(invalid),
    /availability|history|operational controls|malformed|incompatible/i, label);
}

const strictCandidateImplementation = sealedImplementation(candidateModelBinding(), 'candidate-g');
const candidateMemoryIncomplete = buildFixture(
  strictCandidateImplementation.binding, 'candidate-g',
);
candidateMemoryIncomplete.startup.coastalParts.scoreProfile.modelMemoryReady = false;
candidateMemoryIncomplete.startup.coastalParts.scoreProfile.advisories =
  ['LOCAL_MODEL_MEMORY_INCOMPLETE'];
candidateMemoryIncomplete.details.coastalParts.scoreProfile = structuredClone(
  candidateMemoryIncomplete.startup.coastalParts.scoreProfile,
);
candidateMemoryIncomplete.manifest.ravScoreProfile = structuredClone(
  candidateMemoryIncomplete.startup.coastalParts.scoreProfile,
);
resealPublicDocuments(candidateMemoryIncomplete);
candidateMemoryIncomplete.files.set('/js/core/ravscore-model-contract.js',
  Buffer.from(strictCandidateImplementation.contractText));
candidateMemoryIncomplete.files.set('/js/core/ravscore-model-bundle.generated.js',
  Buffer.from(strictCandidateImplementation.bundleText));
for (const [relative, source] of strictCandidateImplementation.sources) {
  candidateMemoryIncomplete.files.set(`/${relative}`, Buffer.from(source));
}
await assert.rejects(() => verifyRavScoreOperationalPagesDeployment({
  baseUrl: 'https://ravradar.example.test/', sourceHead,
  expectedManifest: candidateMemoryIncomplete.manifest,
  expectedModel: 'candidate-g', expectedBinding: strictCandidateImplementation.binding,
  expectedContractText: strictCandidateImplementation.contractText,
  expectedBundleText: strictCandidateImplementation.bundleText,
  expectedPublicClosure: strictCandidateImplementation.publicClosure,
  observationNonce: 'fixture-candidate-strict',
  fetchImpl: mockFetch(candidateMemoryIncomplete.files), attempts: 1,
}), /Candidate G operational controls/,
'Candidate G must remain strict when memory is incomplete');

const mixedImplementation = sealedImplementation(integratedModelBinding(), 'integrated');
const integrated = buildFixture(mixedImplementation.binding, 'integrated');
const candidate = candidateModelBinding();
const mixedStartup = structuredClone(integrated.startup);
mixedStartup.ravScoreRuntime.modelBinding = candidate;
const mixedBytes = jsonBytes(mixedStartup);
integrated.files.set('/data/live/public-conditions.json', mixedBytes);
integrated.manifest.publicConditionsSha256 = sha256(mixedBytes);
integrated.manifest.publicConditionsBytes = mixedBytes.length;
integrated.files.set('/data/live/manifest.json', jsonBytes(integrated.manifest));
const integratedContract = mixedImplementation.contractText;
const integratedBundle = mixedImplementation.bundleText;
const integratedPublicClosure = mixedImplementation.publicClosure;
integrated.files.set('/js/core/ravscore-model-contract.js', Buffer.from(integratedContract));
integrated.files.set('/js/core/ravscore-model-bundle.generated.js', Buffer.from(integratedBundle));
for (const [relative, source] of mixedImplementation.sources) {
  integrated.files.set(`/${relative}`, Buffer.from(source));
}
await assert.rejects(() => verifyRavScoreOperationalPagesDeployment({
  baseUrl: 'https://ravradar.example.test/',
  sourceHead,
  expectedManifest: integrated.manifest,
  expectedModel: 'integrated',
  expectedBinding: mixedImplementation.binding,
  expectedContractText: integratedContract,
  expectedBundleText: integratedBundle,
  expectedPublicClosure: integratedPublicClosure,
  observationNonce: 'fixture-observation-mixed',
  fetchImpl: mockFetch(integrated.files),
  attempts: 1,
}), /incompatible|exact|another model/);

console.log('Operational Pages exact integrated/Candidate 210/673 verification and mixed/tampered fail-closed: passed.');

// The existing complete 210/673 public fixture drives the real verifier here;
// neither a caller supplied "verified" object nor a stubbed clear is used.
async function buildNormalPublishedOrdinaryFixture(work,implementation) {
  const {registerHooks}=await import('node:module');
  const factoryUrl=new URL('./test-ravscore-public-data-service-binding.mjs?published-ordinary',import.meta.url).href;
  const factorySource=(await fs.readFile(new URL('./test-ravscore-public-data-service-binding.mjs',import.meta.url),'utf8')).replace(/\r\n/g,'\n');
  const sentinel="const primary = bundle('primary-integrated', 61);";assert.equal(factorySource.split(sentinel).length,2);
  const hook=registerHooks({load(url,context,next){return url===factoryUrl?{format:'module',
    source:factorySource.split(sentinel)[0]+'\nexport {full,horizonTimes,coastalPartsText,zoneRegistryText};\n',shortCircuit:true}:next(url,context);}});
  let factory;try{factory=await import(factoryUrl);}finally{hook.deregister();}
  const {full,horizonTimes,coastalPartsText,zoneRegistryText}=factory;
  const source=full('rr-published-ordinary-normal-210',42);
  // Reuse the existing normal sharing fixture's unavailable future cells.
  // They are explicit missing inputs, never fabricated forecast scores.
  for(const zone of Object.values(source.coastalParts.zones))for(let index=1;index<zone.hourly.length;index++){
    for(const mode of ['waders','beach'])zone.hourly[index][mode]={available:false,score:null,scoreQuality:'UNAVAILABLE',scoreBounds:null,
      calibrationEligible:false,scoreSemantics:null,conservativeTailResetApplied:false,historyCoverageHours:null,historyReasonCodes:[],
      modelBinding:implementation.binding,status:'unavailable',validPartCount:0,expectedPartCount:zone.expectedPartCount,comparisonPartCount:0,
      unavailableParts:[],unavailability:{available:false,code:'SYNTHETIC_NO_EXACT_INPUT',messageDa:'Syntetisk prøvetime uden data.',
        policy:'integrated-model-local-fail-closed',validPartCount:0,expectedPartCount:zone.expectedPartCount},reasons:['Syntetisk prøvetime uden data.']};
  }
  for(const part of Object.values(source.coastalParts.parts))part.hourly=[];
  const lib=await import('./public-conditions-lib.mjs'),share=await import('./build-forecast-share-projection.mjs');
  const projection=await import('../js/services/forecast-share-projection.js');
  const startup=lib.buildPublicConditions(source),details=lib.buildPublicConditionDetails(source);
  const startupText=lib.compactJson(startup),detailsText=lib.compactJson(details);
  const manifest=lib.buildPublicManifest(source,startupText,detailsText,coastalPartsText,zoneRegistryText);
  manifest.detailDelivery={schemaVersion:1,forecastHours:118,sourceDetailsSha256:manifest.publicConditionDetailsSha256,hours:{},zones:{}};
  const files=new Map([['/data/live/public-conditions.json',Buffer.from(startupText)],['/data/live/public-condition-details.json',Buffer.from(detailsText)],
    ['/data/live/coastal-parts-v2.json',Buffer.from(coastalPartsText)],['/data/zones.geojson',Buffer.from(zoneRegistryText)]]);
  const delivery=document=>{const bytes=Buffer.from(lib.compactJson(document)),hash=sha256(bytes);
    manifest.detailDelivery[document.delivery.kind==='hour'?'hours':'zones'][document.delivery.key]={path:'./forecast/'+hash+'.json',sha256:hash,bytes:bytes.length};
    files.set('/data/live/forecast/'+hash+'.json',bytes);};
  const {ravScoreRuntime:_envelope,...detailBody}=details;
  for(const time of horizonTimes){
    const parts=Object.fromEntries(Object.entries(details.coastalParts.parts).map(([id,part])=>{
      const{current,flowPoints,...metadata}=part;return[id,current?.time===time?part:metadata];}));
    delivery({...detailBody,delivery:{schemaVersion:1,kind:'hour',key:time,sourceDetailsSha256:manifest.publicConditionDetailsSha256,modelBinding:implementation.binding},
      zones:Object.fromEntries(Object.entries(details.zones).map(([id,zone])=>[id,{...zone,forecast:{...zone.forecast,hourly:zone.forecast.hourly.filter(row=>row.time===time)}}])),
      coastalParts:{...details.coastalParts,parts,zones:Object.fromEntries(Object.entries(details.coastalParts.zones).map(([id,zone])=>[id,{...zone,currentReferenceAt:time,hourly:zone.hourly.filter(row=>row.time===time)}]))}});
  }
  for(const id of Object.keys(details.zones))delivery(lib.buildPublicDeliveryDocument(source,details,manifest,'zone',id));
  const manifestBytes=Buffer.from(lib.compactJson(manifest));files.set('/data/live/manifest.json',manifestBytes);
  const sharing=share.serializeForecastShareProjection({projection:projection.buildForecastShareProjection({manifest,details,registry:JSON.parse(zoneRegistryText)}),
    manifest,manifestSha256:sha256(manifestBytes)});
  files.set('/data/live/forecast-share.json',sharing.descriptorBytes);
  for(const file of sharing.zoneFiles)files.set('/data/live/'+file.entry.path.slice(2),file.bytes);
  return{manifest,files,datasetId:manifest.datasetId};
}

async function verifyPreActivationClearRestoresLegacyPointer({publishedOrdinary=false,pagesWriteOnly=false}={}) {
  const path = await import('node:path');
  const os = await import('node:os');
  const {
    PROTECTED_OPERATIONAL_REENTRY_EVIDENCE_POLICY: policy,
    publishProtectedOperationalEvidence, publishProtectedPreActivationTarget,
    clearProtectedPreActivationTarget, restoreProtectedOperationalEvidence,
    validateProtectedOperationalEvidenceDescriptor,
  } = await import('./protected-operational-reentry-evidence.mjs');
  const activation = await import('./ravscore-operational-activation.mjs');
  const {CANDIDATE_G_OPERATIONAL_ROLLBACK_ID} = await import('./lib/ravscore-candidate-g-rollback-runtime.mjs');
  const canonicalSha = value => sha256(JSON.stringify(canonical(value)));
  const copy = value => structuredClone(value);
  const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const POINTER_KEYS = Object.freeze(['schemaVersion', 'kind', 'current', 'previous']);
  const PROTECTED_OPERATIONAL_REENTRY_EVIDENCE_POLICY = policy;
  function exactKeys(value, keys, label) {
    assert.ok(isObject(value), label);
    assert.deepEqual(Object.keys(value).sort(), [...keys].sort(), label);
  }
  // Whole historical validator, pinned by the private proposal against dc3900.
  // The descriptor validator it calls is also unchanged by the successor.
function legacySchemaOnePointer(value, {
  policy = PROTECTED_OPERATIONAL_REENTRY_EVIDENCE_POLICY,
} = {}) {
  exactKeys(value, POINTER_KEYS, 'Operational evidence pointer');
  if (value.schemaVersion !== policy.schemaVersion || value.kind !== policy.pointerKind) {
    throw new Error('Operational evidence pointer identity is invalid');
  }
  const current = validateProtectedOperationalEvidenceDescriptor(value.current, { policy });
  const previous = value.previous === null
    ? null
    : validateProtectedOperationalEvidenceDescriptor(value.previous, { policy });
  if (previous?.deploymentId === current.deploymentId) {
    throw new Error('Operational evidence pointer duplicates a deployment');
  }
  return { schemaVersion: value.schemaVersion, kind: value.kind, current, previous };
}
  const work = await fs.mkdtemp(path.join(os.tmpdir(),'rr-operational-clear-'));
  const repository = 'ravradar/RavRadar';
  const sourceId = 'pages-51002-1', targetId = 'pages-51003-1';
  const implementation = publishedOrdinary?await(async()=>{
    const {fileURLToPath}=await import('node:url');const root=fileURLToPath(new URL('..',import.meta.url));
    const {computeRavScorePublicBrowserClosure}=await import('./lib/ravscore-public-browser-closure.mjs');
    const closure=(await computeRavScorePublicBrowserClosure({root})).manifest;
    const sources=new Map();for(const row of [...closure.files,...closure.htmlEntrypoints])sources.set(row.path,await fs.readFile(path.join(root,row.path),'utf8'));
    return{binding:integratedModelBinding(),publicClosure:closure,sources,
      contractText:await fs.readFile(path.join(root,'js/core/ravscore-model-contract.js'),'utf8'),
      bundleText:await fs.readFile(path.join(root,'js/core/ravscore-model-bundle.generated.js'),'utf8')};
  })():sealedImplementation(integratedModelBinding(), 'integrated');
  const target = publishedOrdinary?await buildNormalPublishedOrdinaryFixture(work,implementation):buildFixture(implementation.binding, 'integrated');
  target.files.set('/js/core/ravscore-model-contract.js',Buffer.from(implementation.contractText));
  target.files.set('/js/core/ravscore-model-bundle.generated.js',Buffer.from(implementation.bundleText));
  for(const [name,text] of implementation.sources)target.files.set('/'+name,Buffer.from(text));
  const identity = computeSealedPublicImplementationClosureIdentity({expectedModel:'integrated',
    expectedBinding:implementation.binding,expectedContractText:implementation.contractText,
    expectedBundleText:implementation.bundleText,expectedPublicClosure:implementation.publicClosure});
  const sourceManifest={...copy(target.manifest),datasetId:'rr-schema-one-source-210'};
  const write=async(directory,name,value)=>fs.writeFile(path.join(directory,name),
    typeof value==='string'?value:JSON.stringify(value));
  const directoryFor = async (name,manifest,deploymentId) => {
    const directory=path.join(work,name);await fs.mkdir(directory);
    const [,runId,runAttempt]=deploymentId.match(/^pages-([1-9][0-9]*)-([1-9][0-9]*)$/);
    const seal={schemaVersion:'ravscore-operational-pages-artifact-seal-v1',repository,
      runId:Number(runId),runAttempt:Number(runAttempt),headSha:sourceHead,ref:'refs/heads/main',attemptId:deploymentId,
      artifactId:Number(runId)+1000,artifactName:'github-pages',artifactDigestSha256:'b'.repeat(64),artifactSizeBytes:12345,
      targetPublicManifestSha256:canonicalSha(manifest),targetImplementationClosureSha256:identity.implementationClosureSha256,
      targetModelBinding:implementation.binding,createdAt:'2026-08-29T12:05:00.000Z',privatePayloadIncluded:false};
    const runtimeAudit=publishedOrdinary?{schemaVersion:1,status:'passed',datasetId:manifest.datasetId,privatePayloadIncluded:false,
      model:{modelId:implementation.binding.modelId,stateSchemaVersion:implementation.binding.stateSchemaVersion,
        modelContractSha256:implementation.binding.modelContractSha256,modelBundleSha256:implementation.binding.modelBundleSha256},
      coverage:{expectedZoneCount:210,zoneCount:210,expectedPartCount:673,partCount:673},
      history:{allCurrentScoresFullHistory:true,currentFullHistoryModeCount:420,currentHistoryIncompleteModeCount:0,currentUnavailableModeCount:0},
      rollback:{status:'READY',activationReady:true,descriptorValid:true,generationReferenceBound:true,runtimePartCount:673,readyPartCount:673,reconstructedFromIntegratedState:false},
      payload:{privacyContractPassed:true,publicStateOrEvidenceIncluded:false,publicRawVectorIncluded:false,publicUnapprovedCoordinateIncluded:false,publicShadowIncluded:false},
      errors:[],errorCounts:{}}:{datasetId:manifest.datasetId,privatePayloadIncluded:false};
    const d={schemaVersion:'ravscore-continuation-checkpoint-disposition-v1',sourceHead,datasetId:manifest.datasetId,
      disposition:'READY_PUBLISHED',rollbackStatus:'READY',rollbackActivationReady:true,checkpointRequired:true,
      runtimeAuditSha256:canonicalSha(runtimeAudit),privatePayloadIncluded:false};
    const handoff={schemaVersion:'ravscore-operational-deploy-handoff-v2',action:'integrated',sourceHead,
      centralVersion:30,legacySourceRequired:false,checkpointDisposition:d.disposition,
      checkpointDispositionSha256:canonicalSha(d),checkpointDatasetId:manifest.datasetId,
      checkpointRuntimeAuditSha256:d.runtimeAuditSha256,checkpointBuildOutcome:'success',checkpointSaveOutcome:'success',
      checkpointPublishOutcome:'success',privatePayloadIncluded:false};
    for(const [file,value] of Object.entries({'manifest.json':manifest,'handoff.json':handoff,
      'pages-artifact-seal.json':seal,'target-binding.json':implementation.binding,
      'target-public-closure.json':implementation.publicClosure,'target-contract.js':implementation.contractText,
      'target-bundle.generated.js':implementation.bundleText,'public-audit.json':runtimeAudit,
      'checkpoint-disposition.json':{...d,bindingSha256:canonicalSha(d)},'checkpoint-runtime-audit.json':runtimeAudit}))
      await write(directory,file,value);
    return directory;
  };
  let row=null,central,profileRow,failCas=false;
  const objects=new Map(),removed=[],writes=[];
  const storage={ensurePrivateBucket:async()=>true,anonymousStatus:async()=>404,
    uploadImmutable:async(name,bytes)=>{if(objects.has(name))return {created:false};objects.set(name,Buffer.from(bytes));return {created:true};},
    download:async name=>Buffer.from(objects.get(name)),removeExact:async name=>{removed.push(name);objects.delete(name);}};
  const request=async(suffix,options={})=>{
    const method=options.method??'GET';
    if(suffix.includes('document_key=in.')){assert.equal(method,'GET');return copy([central,profileRow]);}
    if(method==='GET')return row?[copy(row)]:[];
    writes.push(method);if(failCas)throw null;
    const body=JSON.parse(options.body);
    if(method==='POST'){assert.equal(row,null);row={document_key:policy.documentKey,version:1,payload:body.payload};}
    else {assert.equal(method,'PATCH');assert(suffix.includes('&version=eq.'+row.version+'&'));
      row={...row,version:row.version+1,payload:body.payload};}
    return [copy(row)];
  };
  const common={request,storage,repository};
  const priorToken=process.env.GH_TOKEN;process.env.GH_TOKEN='synthetic-phase-clear-token';
  try {
    const sourceDir=await directoryFor('source',sourceManifest,sourceId);
    const targetDir=await directoryFor('target',target.manifest,targetId);
    await publishProtectedOperationalEvidence({...common,directory:sourceDir,deploymentId:sourceId});
    const profile=JSON.parse(await fs.readFile(new URL('../data/admin/ravscore-profile-selection.json',import.meta.url),'utf8'));
    profileRow={document_key:activation.RAVSCORE_PROFILE_SELECTION_DOCUMENT_KEY,version:20,
      payload:{...profile,modelBundleSha256:implementation.binding.modelBundleSha256}};
    central={document_key:activation.RAVSCORE_OPERATIONAL_ACTIVATION_DOCUMENT_KEY,version:30,payload:{
      schemaVersion:activation.RAVSCORE_OPERATIONAL_ACTIVATION_SCHEMA,status:activation.RAVSCORE_OPERATIONAL_STATUSES.integrated,
      transitionKind:activation.RAVSCORE_OPERATIONAL_TRANSITION_KINDS.integratedReturn,sourceHead,
      datasetId:sourceManifest.datasetId,productionReferenceAt:sourceManifest.productionReferenceAt,
      rollbackId:CANDIDATE_G_OPERATIONAL_ROLLBACK_ID,activeModelBinding:implementation.binding,
      requestedModelBinding:implementation.binding,sourceModelBinding:implementation.binding,
      candidatePlanSha256:null,candidateFullSha256:null,privateBundleContentSha256:null,
      publicManifestSha256:canonicalSha(sourceManifest),sourcePublicManifestSha256:canonicalSha(sourceManifest),
      requestedPublicManifestSha256:canonicalSha(sourceManifest),
      sourceImplementationClosureSha256:identity.implementationClosureSha256,
      requestedImplementationClosureSha256:identity.implementationClosureSha256,
      sourceDeploymentId:sourceId,deploymentId:sourceId,automaticActivationAllowed:false,schedulerActivationAllowed:false,
      calibrationEligible:false,requestedAt:'2026-08-29T12:05:00.000Z',activatedAt:'2026-08-29T12:05:00.000Z',failureCode:null,
      returnPlanSha256:null,integratedReadinessSha256:null,integratedPublicAuditSha256:null,integratedManifestSha256:null}};
    const resolved=activation.resolveOperationalRavScoreModel(central,{profileRow});
    const sourceCurrent={...resolved,bindingCurrent:activation.operationalResolvedBindingCurrent(resolved)};
    if(!pagesWriteOnly){
    await fs.unlink(path.join(targetDir,'handoff.json'));
    await write(targetDir,'pre-activation.json',{schemaVersion:'ravradar-current-grid-pre-activation-v1',sourceHead,
      sourceCurrent,sourceCurrentSha256:canonicalSha(sourceCurrent),checkpointOutcomes:{build:'success',save:'success',publish:'success'},
      privatePayloadIncluded:false});
    const phaseEnv=Object.fromEntries(['GITHUB_REF','GITHUB_WORKFLOW_REF','GITHUB_EVENT_NAME','GITHUB_REPOSITORY','GITHUB_RUN_ID','GITHUB_RUN_ATTEMPT','GITHUB_SHA','GITHUB_EVENT_PATH'].map(key=>[key,process.env[key]]));
    if(publishedOrdinary){
      const event=path.join(work,'ordinary-event.json');await fs.writeFile(event,JSON.stringify({inputs:{}}));
      Object.assign(process.env,{GITHUB_REF:'refs/heads/main',GITHUB_WORKFLOW_REF:repository+'/.github/workflows/run-current-weather-once.yml@refs/heads/main',
        GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_REPOSITORY:repository,GITHUB_RUN_ID:'51003',GITHUB_RUN_ATTEMPT:'1',GITHUB_SHA:sourceHead,GITHUB_EVENT_PATH:event});
    }
    try {await publishProtectedPreActivationTarget({...common,directory:targetDir,deploymentId:targetId,
      ...(publishedOrdinary?{fetchImpl:async()=>({ok:true,json:async()=>({id:51003,run_attempt:1,head_sha:sourceHead,head_branch:'main',
        path:'.github/workflows/run-current-weather-once.yml',event:'workflow_dispatch',repository:{full_name:repository},status:'in_progress'})})}:{})});}
    finally{for(const[key,value]of Object.entries(phaseEnv))if(value===undefined)delete process.env[key];else process.env[key]=value;}
    }
    // The ordinary Pages caller publishes its full handoff before begin/complete.
    // Reuse that normal archive publisher; the phase must not replace it.
    const publishedTargetDir=await directoryFor('published-target',target.manifest,targetId);
    await publishProtectedOperationalEvidence({...common,directory:publishedTargetDir,deploymentId:targetId,
      retainDeploymentId:sourceId,requireRetained:true});
    const phaseRow=copy(row),objectBefore=new Map([...objects].map(([name,bytes])=>[name,Buffer.from(bytes)]));
    if(pagesWriteOnly)assert.doesNotThrow(()=>legacySchemaOnePointer(row.payload));
    else assert.throws(()=>legacySchemaOnePointer(row.payload),'old reader must really reject an unfinished schema2 pointer');
    const publicFetch=publishedOrdinary?async input=>{const bytes=target.files.get(new URL(input).pathname);
      return new Response(bytes??'',{status:bytes?200:404});}:mockFetch(target.files);
    const fetchPublic=async(url,options)=>{
      const parsed=new URL(url);if(parsed.origin!=='https://api.github.com')return publicFetch(url,options);
      const runId=Number(parsed.pathname.match(/\/actions\/runs\/(\d+)/)?.[1]);assert([51002,51003].includes(runId));
      const run={id:runId,run_attempt:1,head_sha:sourceHead,head_branch:'main',repository:{full_name:repository},
        path:'.github/workflows/run-current-weather-once.yml',status:'completed',conclusion:'failure',updated_at:'2026-08-29T12:08:00Z'};
      const jobs=['Deploy prepared Pages artifact through reusable workflow',
        'Finish an interrupted generation before new work / resume-pre-activation-pages',
        'Redeploy only a helper-proven exact sealed Pages target'].map((name,index)=>({
          id:runId*10+index,run_id:runId,run_attempt:1,head_sha:sourceHead,name,status:'completed',conclusion:'skipped'}));
      return{ok:true,json:async()=>parsed.pathname.endsWith('/jobs')?{total_count:3,jobs}:run};
    };
    if(publishedOrdinary){
      const p=await import('./protected-operational-reentry-evidence.mjs');
      const {buildIntegratedCutoverReadiness}=await import('./integrated-cutover-readiness.mjs');
      const executorHead='f'.repeat(40),env={GITHUB_REF:'refs/heads/main',GITHUB_SHA:executorHead,GITHUB_REPOSITORY:repository,
        GITHUB_RUN_ID:'51004',GITHUB_RUN_ATTEMPT:'1',GITHUB_EVENT_NAME:'workflow_dispatch',
        GITHUB_WORKFLOW_REF:repository+'/.github/workflows/resume-operational-checkpoint.yml@refs/heads/main'};
      row={...row,payload:{...row.payload,schemaVersion:'3.0.0',pagesWrite:{target:copy(row.payload.current),
        owner:{repository,runId:51003,runAttempt:1,headSha:sourceHead,attemptId:targetId}}}};
      if(pagesWriteOnly){
        const futureManifest={...copy(target.manifest),datasetId:'rr-later-unpublished-210'};
        const futureDir=await directoryFor('future-unpublished',futureManifest,'pages-51005-1');
        await publishProtectedOperationalEvidence({...common,directory:futureDir,deploymentId:'pages-51005-1',
          retainDeploymentId:targetId,requireRetained:true});
        const laterDir=await directoryFor('later-unpublished',{...futureManifest,datasetId:'rr-second-unpublished-210'},'pages-51007-1');
        await publishProtectedOperationalEvidence({...common,directory:laterDir,deploymentId:'pages-51007-1',
          retainDeploymentId:'pages-51005-1',requireRetained:true});
        assert.equal(row.payload.current.deploymentId,'pages-51007-1');
        assert.equal(row.payload.previous.deploymentId,'pages-51005-1');
        assert.equal(row.payload.pagesWrite.target.deploymentId,targetId);
        assert(!Object.hasOwn(row.payload,'preActivation'));
      }
      const saved={row:copy(row),central:copy(central),profile:copy(profileRow),objects:new Map(objects),removed:[...removed]};
      const ready=await buildIntegratedCutoverReadiness(sourceHead,{publicImplementationClosureSha256:identity.implementationClosureSha256});
      for(const output of ['required=false\n','required=true\n','required=false\nrequired=false\n','required=false\nrequired=true\n','reason=unknown\n']){
        let invoked=0;
        const run=async(program,args,options)=>{invoked++;assert.equal(program,process.execPath);
          assert.equal(path.basename(args[0]),'weather-source-gate.mjs');assert.equal(args[1],'check');assert.equal(args.length,2);
          assert.equal(options.env.GITHUB_TOKEN,'synthetic-normal-source-token');assert.equal(options.env.GITHUB_SHA,executorHead);
          assert.equal(options.cwd,path.resolve(path.dirname(args[0]),'..'));assert.equal(options.windowsHide,true);
          await fs.writeFile(options.env.GITHUB_OUTPUT,output);
        };
        const attempt=p.checkPublishedOrdinarySource({env:{...env,GH_TOKEN:'synthetic-normal-source-token'},execute:run});
        if(output==='required=false\n')await attempt;else await assert.rejects(attempt,/source is not qualified/);
        assert.equal(invoked,1);
      }
      let calls=0,atomicWrites=0,sourceCalls=0;
      async function invoke({oldPublic=false,activeWriter=false,pointerDrift=false,centralDrift=false,mainDrift=false,badReadiness=false,lostReply=false,uncommittedLoss=false,notStarted=false,reset=true,wrongSourceVersion=false,wrongOwner=false,knownWriter=null,handoffChange=null,badSource=false,noWriter=false}={}){
        if(reset){row=copy(saved.row);central=copy(saved.central);profileRow=copy(saved.profile);}
        if(noWriter)delete row.payload.pagesWrite;
        if(wrongSourceVersion)central.version++;
        if(wrongOwner)row.payload.pagesWrite.owner={...row.payload.pagesWrite.owner,runId:51006,attemptId:'pages-51006-1'};
        if(knownWriter){delete row.payload.preActivation;
          if(knownWriter==='phase')row.payload.pagesWrite.target=copy(phaseRow.payload.preActivation.target);
          else row.payload.pagesWrite.owner={...row.payload.pagesWrite.owner,runId:51006,attemptId:'pages-recovery-51006-1'};
        }
        if(handoffChange){
          const original=await fs.readFile(path.join(publishedTargetDir,'handoff.json'),'utf8');
          try{await write(publishedTargetDir,'handoff.json',{...JSON.parse(original),...handoffChange});
            const built=await p.buildProtectedOperationalEvidenceArchive({directory:publishedTargetDir,deploymentId:targetId,repository});
            objects.set(built.descriptor.objectPath,Buffer.from(built.archive));row.payload.pagesWrite.target=copy(built.descriptor);
          }finally{await fs.writeFile(path.join(publishedTargetDir,'handoff.json'),original);}
        }
        let publicReads=0,refReads=0;
        const fetchImpl=async(input,options={})=>{
          assert(!options.method||options.method==='GET','no Pages/provider POST in completion');
          const url=new URL(input);
          if(url.origin!=='https://api.github.com'){
            publicReads++;if(pointerDrift&&publicReads===1)row.version++;if(centralDrift&&publicReads===1)central.version++;
            if(oldPublic&&url.pathname==='/data/live/manifest.json')return new Response(JSON.stringify(sourceManifest),{status:200});
            return publicFetch(input,options);
          }
          if(url.pathname.endsWith('/git/ref/heads/main'))return{ok:true,json:async()=>({object:{sha:mainDrift&&++refReads>1?'0'.repeat(40):executorHead}})};
          if(url.pathname.includes('/actions/runs/51004/'))return{ok:true,json:async()=>({id:51004,run_attempt:1,head_sha:executorHead,head_branch:'main',
            repository:{full_name:repository},status:'in_progress',event:'workflow_dispatch',path:'.github/workflows/resume-operational-checkpoint.yml'})};
          const run={id:51003,run_attempt:1,head_sha:sourceHead,head_branch:'main',repository:{full_name:repository},
            path:'.github/workflows/run-current-weather-once.yml',status:activeWriter?'in_progress':'completed',conclusion:'failure',updated_at:'2026-08-29T12:08:00Z'};
          const jobs=['Deploy prepared Pages artifact','Finish an interrupted generation before new work / resume-pre-activation-pages',
            'Redeploy only a helper-proven exact sealed Pages target'].map((name,index)=>({id:510030+index,run_id:51003,run_attempt:1,head_sha:sourceHead,
              name,status:'completed',conclusion:'skipped'}));
          if(!notStarted)Object.assign(jobs[0],{conclusion:'failure',steps:[
            {name:'Deploy to GitHub Pages',number:30,status:'completed',conclusion:'failure',completed_at:'2026-08-29T12:07:00Z'},
            {name:'Confirm scheduled Pages writes are terminal and unpublished',number:31,status:'completed',conclusion:'skipped'}]});
          return{ok:true,json:async()=>url.pathname.endsWith('/jobs')?{total_count:3,jobs}:run};
        };
        const atomicRequest=async(_suffix,options)=>{
          atomicWrites++;assert.equal(options.method,'POST');const b=JSON.parse(options.body);
          assert.equal(b.p_expected_operational_version,central.version);assert.equal(b.p_expected_profile_version,profileRow.version);
          if(!uncommittedLoss){central={...central,version:central.version+1,payload:b.p_operational_payload};
            if(canonicalSha(profileRow.payload)!==canonicalSha(b.p_profile_payload))profileRow={...profileRow,version:profileRow.version+1,payload:b.p_profile_payload};}
          if(lostReply||uncommittedLoss)throw null;
          return{operationalVersion:central.version,operationalPayload:copy(central.payload),profileVersion:profileRow.version,profilePayload:copy(profileRow.payload)};
        };
        return p.completePublishedOrdinaryPreActivationTarget({...common,atomicRequest,sourceHead:executorHead,env,fetchImpl,
          checkSource:async options=>{sourceCalls++;assert.equal(options.env,env);if(badSource)throw new Error('synthetic source qualification required');},
          checkReadiness:async options=>{calls++;assert.equal(options.sourceHead,sourceHead);assert.equal(options.publicImplementationClosureSha256,identity.implementationClosureSha256);
            return badReadiness?{...copy(ready),modelBundleSha256:'0'.repeat(64)}:copy(ready);}});
      }
      const completed=await invoke({lostReply:true});assert.equal(completed.completed,true);assert.equal(atomicWrites,1);
      assert.equal(central.payload.sourceHead,sourceHead,'immutable producer is preserved; executor is distinct');
      assert.equal(central.payload.deploymentId,targetId);assert.equal(central.payload.datasetId,target.manifest.datasetId);
      const completedPointer=copy(row),completedCentral=copy(central),completedProfile=copy(profileRow),beforeWrites=atomicWrites;
      assert.deepEqual(row.payload,saved.row.payload,'central completion does not clear/retag Pages phase');
      const readyCalls=calls;assert.equal((await invoke({notStarted:true})).completed,false);assert.equal(calls,readyCalls);
      for(const options of [{oldPublic:true},{activeWriter:true},{pointerDrift:true},{centralDrift:true},{mainDrift:true},{badReadiness:true},{badSource:true}]){
        await assert.rejects(invoke(options),undefined,JSON.stringify(options));assert.equal(atomicWrites,beforeWrites,'unsafe completion never writes central CAS');
      }
      await assert.rejects(invoke({uncommittedLoss:true}),/compare-and-swap lost/);assert.equal(atomicWrites,beforeWrites+1,'unknown CAS is never repeated');
      if(pagesWriteOnly){
        const noSourceBefore=sourceCalls,noWritesBefore=atomicWrites;
        assert.equal((await invoke({noWriter:true,badSource:true})).reason,'NO_PHASE');
        assert.equal(sourceCalls,noSourceBefore,'NO_PHASE preserves normal required=true source fallback');
        assert.equal(atomicWrites,noWritesBefore);
        for(const options of [{wrongSourceVersion:true},{wrongOwner:true},{handoffChange:{centralVersion:31}},{handoffChange:{action:'unknown'}}]){
          const before=atomicWrites;await assert.rejects(invoke(options));assert.equal(atomicWrites,before);
        }
        row=copy(completedPointer);central=copy(completedCentral);profileRow=copy(completedProfile);
        const before=atomicWrites,beforeSource=sourceCalls;assert.equal((await invoke({reset:false})).reason,'ALREADY_ACTIVE');
        assert.equal(sourceCalls,beforeSource,'ALREADY_ACTIVE does not block normal source fallback');
        assert.equal(atomicWrites,before,'exact newer central target is idempotent without matching old handoff version');
        assert.equal((await p.inspectProtectedPreActivationTarget(common)).action,'NONE');
        assert.deepEqual(row.payload,saved.row.payload,'completion preserves the newer unpublished pointer and original Pages writer');
        for(const[name,bytes]of saved.objects)assert.deepEqual(objects.get(name),bytes);
        assert.deepEqual(removed,saved.removed,'completion cannot remove objects after legitimate publisher rotation');
        console.log('Normal pagesWrite-only completion: exact central source version, pinned target beyond current/previous, fresh proof/CAS, idempotence and strict negatives passed.');
        return;
      }
      row=copy(completedPointer);central=copy(completedCentral);profileRow=copy(completedProfile);
      const result=await clearProtectedPreActivationTarget({...common,sourceHead:executorHead,baseUrl:'https://ravradar.dk/',fetchImpl:async(input,options)=>{
        if(new URL(input).origin==='https://api.github.com'){
          const run={id:51003,run_attempt:1,head_sha:sourceHead,head_branch:'main',repository:{full_name:repository},path:'.github/workflows/run-current-weather-once.yml',
            status:'completed',conclusion:'failure',updated_at:'2026-08-29T12:08:00Z'};
          const jobs=['Deploy prepared Pages artifact','Finish an interrupted generation before new work / resume-pre-activation-pages','Redeploy only a helper-proven exact sealed Pages target']
            .map((name,index)=>({id:510030+index,run_id:51003,run_attempt:1,head_sha:sourceHead,name,status:'completed',conclusion:'skipped'}));
          Object.assign(jobs[0],{conclusion:'failure',steps:[{name:'Deploy to GitHub Pages',number:30,status:'completed',conclusion:'failure',completed_at:'2026-08-29T12:07:00Z'},
            {name:'Confirm scheduled Pages writes are terminal and unpublished',number:31,status:'completed',conclusion:'skipped'}]});
          return{ok:true,json:async()=>new URL(input).pathname.endsWith('/jobs')?{total_count:3,jobs}:run};}
        return publicFetch(input,options);}});
      assert.equal(result.cleared,true);assert.equal(row.version,completedPointer.version+1);
      assert.deepEqual(row.payload.pagesWrite,saved.row.payload.pagesWrite);assert.deepEqual(central,completedCentral);
      for(const[name,bytes]of objectBefore)assert.deepEqual(objects.get(name),bytes);assert.deepEqual(removed,[]);
      for(const knownWriter of ['phase','recovery']){
        row=copy(completedPointer);central=copy(completedCentral);profileRow=copy(completedProfile);
        const before=atomicWrites,beforeSource=sourceCalls,result=await invoke({reset:false,knownWriter});
        assert.equal(sourceCalls,beforeSource,'known non-ordinary writer leaves normal source fallback reachable');
        assert.equal(result.reason,'NOT_ORDINARY','a cleared legitimate phase/recovery writer remains a normal no-op');
        assert.equal(atomicWrites,before);
      }
      console.log('Normal published ordinary completion: exact old producer/new executor, full verifier, readiness, atomic CAS/lost reply and final phase clear; negatives passed.');
      return;
    }
    let publicReads=0;
    await assert.rejects(clearProtectedPreActivationTarget({...common,sourceHead,baseUrl:'https://ravradar.example.test/',
      fetchImpl:async()=>{publicReads++;throw new Error('unexpected public read');}}),/not actually active/);
    assert.equal(publicReads,0);assert.deepEqual(row,phaseRow);
    // This is the controlled central-response oracle, not a claim that an Edge,
    // activation transaction or hosted Pages deployment happened in this test.
    central={...central,version:31,payload:{...central.payload,datasetId:target.manifest.datasetId,
      publicManifestSha256:canonicalSha(target.manifest),requestedPublicManifestSha256:canonicalSha(target.manifest),
      sourcePublicManifestSha256:canonicalSha(target.manifest),sourceDeploymentId:targetId,
      deploymentId:targetId}};
    activation.resolveOperationalRavScoreModel(central,{profileRow});
    const sourceCentral=copy(central),writeCount=writes.length;
    // The normal resolver admits this complete sealed source. It does not
    // give a changed target closure permission to clear the delivery phase.
    const changedClosure=copy(row);
    changedClosure.payload.preActivation.target.implementationClosureSha256='6'.repeat(64);
    row=changedClosure;
    await assert.rejects(clearProtectedPreActivationTarget({...common,sourceHead,baseUrl:'https://ravradar.example.test/',
      fetchImpl:async()=>{publicReads++;throw new Error('changed closure must refuse before public read');}}),
      /Pre-activation target generation changed/);
    assert.equal(publicReads,0);assert.equal(writes.length,writeCount);
    assert.deepEqual(row,changedClosure);row=copy(phaseRow);
    let drift=false;
    await assert.rejects(clearProtectedPreActivationTarget({...common,sourceHead,baseUrl:'https://ravradar.example.test/',
      fetchImpl:async(...args)=>{if(!drift){central={...central,version:central.version+1};drift=true;}return fetchPublic(...args);}}),/central completion changed/);
    assert.equal(writes.length,writeCount);assert.deepEqual(row,phaseRow);central=sourceCentral;
    let pointerDrift=false;
    await assert.rejects(clearProtectedPreActivationTarget({...common,sourceHead,baseUrl:'https://ravradar.example.test/',
      fetchImpl:async(...args)=>{if(!pointerDrift){row={...row,version:row.version+1};pointerDrift=true;}return fetchPublic(...args);}}),/Pre-activation writers changed during closure read/);
    assert.equal(writes.length,writeCount);row=copy(phaseRow);
    failCas=true;let caught;
    try{await clearProtectedPreActivationTarget({...common,sourceHead,baseUrl:'https://ravradar.example.test/',fetchImpl:fetchPublic});}
    catch(error){caught=error;}
    assert(caught instanceof Error);assert.equal(caught.cause,null);assert.deepEqual(row,phaseRow);failCas=false;
    const result=await clearProtectedPreActivationTarget({...common,sourceHead,baseUrl:'https://ravradar.example.test/',fetchImpl:fetchPublic});
    assert.equal(result.cleared,true);assert.equal(row.version,phaseRow.version+1);
    assert.deepEqual(row.payload,{schemaVersion:policy.schemaVersion,kind:phaseRow.payload.kind,
      current:phaseRow.payload.current,previous:phaseRow.payload.previous});
    assert.deepEqual(legacySchemaOnePointer(row.payload),row.payload);
    assert.deepEqual(await clearProtectedPreActivationTarget({...common,sourceHead,baseUrl:'https://ravradar.example.test/',
      fetchImpl:()=>{throw new Error('idempotent clear must not fetch');}}),{cleared:false,reason:'no-pre-activation'});
    for(const [label,descriptor] of [['current',row.payload.current],['previous',row.payload.previous]]){
      const restored=path.join(work,'restored-'+label);
      const restoredResult=await restoreProtectedOperationalEvidence({...common,directory:restored,deploymentId:descriptor.deploymentId});
      assert.equal(restoredResult.restored,true);
      const original=label==='current'?publishedTargetDir:sourceDir;
      for(const name of await fs.readdir(original))assert.deepEqual(await fs.readFile(path.join(restored,name)),await fs.readFile(path.join(original,name)));
    }
    for(const [name,bytes] of objectBefore)assert.deepEqual(objects.get(name),bytes);
    assert.deepEqual(removed,[],'no original/phase archive deletion or repinning');
  } finally {if(priorToken===undefined)delete process.env.GH_TOKEN;else process.env.GH_TOKEN=priorToken;
    await fs.rm(work,{recursive:true,force:true});}
}
await verifyPreActivationClearRestoresLegacyPointer();
await verifyPreActivationClearRestoresLegacyPointer({publishedOrdinary:true});
  await verifyPreActivationClearRestoresLegacyPointer({publishedOrdinary:true,pagesWriteOnly:true});
console.log('Pre-activation verified clear restores exact schema1/current/previous with normal public verifier and original restore: passed.');
