// TEST ONLY: genuine whole586/587 PG adapters/factories, in the SAME owned native
// PostgreSQL host as the preceding phases. No current successor-byte retagging.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFile as callbackExec} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {withAuthenticated586PredecessorSource,withAuthenticated587PredecessorSource,
  withAuthenticated588PredecessorSource,assertFrozen588CodeSourceSelected,FROZEN588_CODE_SOURCE_PROVENANCE,
  withAuthenticated590PredecessorSource,assertFrozen590CodeSourceSelected,FROZEN590_CODE_SOURCE_PROVENANCE,
  withAuthenticated591PredecessorSource,assertFrozen591CodeSourceSelected,FROZEN591_CODE_SOURCE_PROVENANCE,
  withSource594CodeParent,SOURCE594_CODE_SOURCE_PROVENANCE,withSource597CodeParent,SOURCE597_CODE_SOURCE_PROVENANCE} from './check-assistant-later-h0-predecessor-source.mjs';
import {FROZEN593_NATIVE_CODE,withInstalled593CodePredecessorSource} from './check-installed593-code-predecessor-source.mjs';
import {requireAssistantAfter597Output,ASSISTANT_AFTER597_BEFORE,requireScalar597LaterH0Output,SCALAR597_LATER_H0_BEFORE,requireInstalled593Original591Output,requireAssistantLaterH0Output,requireAssistantPublic587SuccessorOutput,requireAssistantPublic588SuccessorOutput,requireAssistantPublic590SuccessorOutput,requireAssistantPublic591SuccessorOutput} from './lib/assistant-later-h0-successor-source.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
// TEST-only immutable source catalogue. This DATA grants no Source/session/native capability.
export const FROZEN597_NATIVE_READSET=Object.freeze([
  Object.freeze({"file":"config.js","mode":"100644","blob":"1d8989418d4e85eacde80137b807d2723c49e188","bytes":379,"sha256":"7cb635a4fbfad6693774ecc776dd5df6bef024d59aba51c50eeab380fdc4ed0d","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"js/core/best-time-policy.js","mode":"100644","blob":"2a2f1afec1fbfb9f51163550d02c8b0b44348e5c","bytes":6392,"sha256":"a7502feca9ad13bec98bd3dfec820362e6ea2507bc812443f495a1efe96e7f55","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"js/core/best-time-selector.js","mode":"100644","blob":"6596ec178a63ca184861e102fac7f6c6d0baf6e0","bytes":2611,"sha256":"5560384b101eb06f1240f7a0734118ace4cd3e780a16b6d74d02abc9f84ff857","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"js/core/forecast-calendar.js","mode":"100644","blob":"27156866e4404736d9b76e82c1853440147c4c25","bytes":2181,"sha256":"7d1cb4e9dec2c072cf51fd08537aa5b870605f83345c341d92651e1a11f89658","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"js/core/local-zone-score.js","mode":"100644","blob":"1777ce9df4d8dece80f9889601ee74519e8afd8c","bytes":19425,"sha256":"2e625bdeca146ae2223c6f39f8f6f6e255127bb22123776f550de655e02f37f3","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"js/core/phase-d-process-candidate.js","mode":"100644","blob":"db9d082b051ab5af1bcbc404610c69f8bd1ba800","bytes":14109,"sha256":"d745f8ead7554bb0c63bd2f3740efff243ee761c99f86e93fc7276883a64fcfa","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"js/core/phase-d-wave-process-candidate.js","mode":"100644","blob":"8d7bb7fb770336d9d67699eea4e3cdb1c9a674be","bytes":5223,"sha256":"2261dca0663eedc2e3a9a191e2f8dc5ca8531e4a9200d7d43e9290d498ebecb5","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"js/core/public-delivery-contract.js","mode":"100644","blob":"af956d7bc66ecdd6d52a4d0d4ce3b287b1cf0618","bytes":9266,"sha256":"0571025b79e74cf5c0c71d2356146da4a4c5159ee2571de7d45448361b85692d","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"js/core/ravscore-candidate-g-state-pipeline.js","mode":"100644","blob":"57084ac2f486a67017a845bb7da5c414c3734625","bytes":16255,"sha256":"fe4b7e7e8e4a07dcd74d1da0c3e566971df33e3ef418fd7f2fc3f1028008c3e7","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"js/core/ravscore-candidate-g.js","mode":"100644","blob":"aeb26d21fe030876c69575d82f23d72484c2ccd5","bytes":25702,"sha256":"127083451a2ce768c7ea45dd5091d8d83a7d3234691365a8eaa1875b2416748e","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"js/core/ravscore-current-supply-memory.js","mode":"100644","blob":"86f1d369d02df60abe6368c7dd297fca890170fe","bytes":32847,"sha256":"7e462b10982724d121ab1566a5fe497beb62f49b0f821bf768165af29e5401da","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"js/core/ravscore-evidence-trust-contract.js","mode":"100644","blob":"45f1cc37807498bef6b11c9d828071b7e5761e1f","bytes":3477,"sha256":"81a8560d2c9e7b372a7e6608da80dab993b7249ca7ef1c573378e6e9303e9157","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"js/core/ravscore-huntability.js","mode":"100644","blob":"5a95211058b36b0ff871b3a408991e1909451b32","bytes":4005,"sha256":"eabc93f7bf66d8daab6f29221d759c01ede4f3832a828da383cc864169d608d7","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"js/core/ravscore-integrated-explanation-presenter.js","mode":"100644","blob":"fc882994e3673c823a5650e58eddcfa1738c1e87","bytes":37066,"sha256":"11fd8f5a2869698133d6a025d039e42c0770f3d612d09e6332a4d43d50b4f348","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"js/core/ravscore-integrated-state-pipeline.js","mode":"100644","blob":"de16f3f32d10f5ce8e8ae1c2257edc47372bc331","bytes":99166,"sha256":"b81dcc45ea939f54aaedffe60af90cf1709239941129057fe2007c12d1e27f2a","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"js/core/ravscore-integrated.js","mode":"100644","blob":"a91493211d7830ecd39fff9bef355c5deed617b6","bytes":27487,"sha256":"ba041c23de74829cade71b679dc8a566befeb41140bf1ee3fa1ceefc6e803317","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"js/core/ravscore-mobilisation-memory.js","mode":"100644","blob":"4c4e4e4d1c62d5fd26fa63d05b5b3cc7cb3ee403","bytes":6749,"sha256":"fdb8c104f6df2e31eba05ea1e31d844e5a376a9b754784793a79398843231031","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"js/core/ravscore-model-bundle.generated.js","mode":"100644","blob":"b57373e55c1dd8ca765896995d486dd223c299e7","bytes":17073,"sha256":"0f6a76914ae24481809deb382788db5a1fce82262fc6f7acde6550564eed2784","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"js/core/ravscore-model-contract.js","mode":"100644","blob":"251e476c24a278cdf24fcca37a8bac4f86e5c9c7","bytes":13790,"sha256":"6edf369edf09b50005a0d04ce0ec892cf6455ddcea02ab4a7f2e51b644b8baab","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"js/core/ravscore-profile-switch.js","mode":"100644","blob":"bf918082c7862193d9df8c98bed625bfa7a65d42","bytes":24065,"sha256":"446e6ba22f5d9c2b1aefc300890c950cdd95f158750f99cea3aa224df879c36b","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"js/core/ravscore-public-model.js","mode":"100644","blob":"b7c2d37cd0d9661c23aeafbe4e21baad10f9693b","bytes":33663,"sha256":"08180f603fbc738bbc12201a10d043f4319c5008947ad90099cf63fddebbc983","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"js/core/ravscore-public-profile-contract.js","mode":"100644","blob":"99c90a387e825a2ee9dd1cbd5620710065d44010","bytes":5565,"sha256":"ac011932b79b2ff5adf228e71882cdbea228b6fbc528887ccaa645d318dd86b4","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"js/core/ravscore-public-runtime-contract.js","mode":"100644","blob":"4caebd3c42b5e63168b6763e8aeffa5efc22348b","bytes":34644,"sha256":"d1040e1fdd958584416b45fae6c5aa725db822a441b2b927d34858f2e089da5d","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"js/core/ravscore-public-weather-source-age.js","mode":"100644","blob":"841303a80ce361a27f29727e7ba09ec9cd42a11b","bytes":7151,"sha256":"e06902c660ad0337be478c5d9140c59cc0477164caa50efb5c9dc3b9f3faca26","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"js/core/ravscore-regime-memory.js","mode":"100644","blob":"90e9a19af406e5d4755e227f0814f44b87a325b3","bytes":36237,"sha256":"fd361b0b0d5cbb6bf7d7af632aad070be7c3e49dd4870837476bc96fe3f1cb22","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"js/core/ravscore-time.js","mode":"100644","blob":"65786c3044d3b5ce0a024d368eda286a058853db","bytes":1550,"sha256":"b2311b8f2426968da59b387096522c29a191c4640afe39913ec0ae0c5b0272fa","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"js/core/ravscore-wave-approach-state.js","mode":"100644","blob":"0d60b888931800eb0249f44e17c7e983398b37f0","bytes":15550,"sha256":"6900c089a30e3036dcb05ef1c985b71299c2c408257deea37f18fdbcbcba4e2c","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"js/core/ravscore-wave-mobilisation-state.js","mode":"100644","blob":"3794d40770ec15d411eeb748ba7ff5bf47d1d209","bytes":22009,"sha256":"f845fdaa95733b1b57fd7b53b085e3b9d5e60ea431ac84072b442d07aa89fb35","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"js/core/score-presentation.js","mode":"100644","blob":"653eed36a97db7270c3b8a86c542f1b2da36f748","bytes":746,"sha256":"426665380299c8d5302fbc08276ea4c32490ce356de27037f5a73acf2b1e6c2c","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"js/core/wave-approach.js","mode":"100644","blob":"ee2431f7c3edc95dfe2e3eca4229c414a322cfa2","bytes":3626,"sha256":"1dda08cdd8e8e0eedbd5e426237372e2dba3c076af4da26f757066fb91d5076c","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"js/core/zone-ranking.js","mode":"100644","blob":"949e7e29505bea3a47cac4e5e4896f0b3fc92f24","bytes":5240,"sha256":"6a672a90255894357ec0b5985da474d314b502f21b4e5f0b7bea1e1c1c0ea464","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"js/i18n.js","mode":"100644","blob":"02c2cdd3a7e293b42804970887cf02e7533233b9","bytes":127262,"sha256":"d0ac1b3e3e3874fd88e828aa1805364b7f47023a0b527165ad8f59bd26acefe8","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"js/services/calibration-eligibility.js","mode":"100644","blob":"9c34d0820f40654337ec7577a658b7f52c9047e2","bytes":36418,"sha256":"30c37a9a4ea6dee8b16312cf7509e30064b6087bfcf9ceeca366201f1b292b72","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"js/services/forecast-share-projection.js","mode":"100644","blob":"aa88b12ce4b3c9241d9fb545947413e8975a86fb","bytes":12084,"sha256":"44127bb8658510a47cfab7fc6fcbba815235e59da89a4165627420ee2a89fced","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"js/services/map-forecast-view.js","mode":"100644","blob":"e4ab2f7e6ea4539f13bcf9c8cd1b09d721d2d3d5","bytes":4672,"sha256":"c96a78a6d87808c7cc4a82838c669b2577ef051b1413b2f5634aa44032cfb645","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"js/services/rav-assistant.js","mode":"100644","blob":"0f7a5cc2d3ff25f2d36f1673238b093f644a4628","bytes":85634,"sha256":"9e65fe924867069ce001a9a5c02b767be4a075ceadc90466389ad2b30b3024fa","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"js/services/trip-evidence-contract.js","mode":"100644","blob":"79e8c41a38320cff8b0623e8db518d51ec350837","bytes":28009,"sha256":"06db79cb5830c6a106f7df03978ca1bde6b7ce6a39301e95e95869a4e76d4e83","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"js/services/trip-evidence-public-adapter.js","mode":"100644","blob":"b59a3458ad639ec61b41c720b5803ff2387bd653","bytes":11414,"sha256":"061e988371fc058cd933c55a8034dab07c8bb8e768d61d14e7001e51474afc0f","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"knowledge/rav-assistant-local-v2.js","mode":"100644","blob":"7ea79bf0974e4e446e2cff8fa8e9a1d14532a317","bytes":48676,"sha256":"e6cb2451eac50bcf3e4959d4b571aad6e9422c5f025edac2bc65a0e8f6aec754","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"knowledge/rav-assistant-research-coast-v1.js","mode":"100644","blob":"c3ba153a1550fd64c4080fc57d86769e3c34a553","bytes":52235,"sha256":"2e86a4ab2c01638bc7297153d81caf0be6040571f8fcd4be11d6132d820ff0de","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"knowledge/rav-assistant-research-material-v1.js","mode":"100644","blob":"4bb593b212bdd82c5f2d6da2e6e6b19aedfffaf2","bytes":54877,"sha256":"28d298b173064e00d12cbe1bbc44d54db23b4f2cd7f412ea9862d28186712b59","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"knowledge/rav-assistant-research-v1.js","mode":"100644","blob":"ba052cfd98b0ebcd289e04421f46c9c593b376ae","bytes":479,"sha256":"bebd5a709e5505b1d958e6424056b196385f2ca7a9f607348919e32f95079df2","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"knowledge/rav-assistant-sources-v1.js","mode":"100644","blob":"a82e1172e2381ef9a74ddbcd02811031b5bc09be","bytes":8912,"sha256":"c9a387ca9ed30d4c5a9932eb1b1133a99ae651c23c822b7d0ad1c8adbd8c43a6","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"package.json","mode":"100644","blob":"c0d8e77cdfd874c3cb055832f6c4f70adda43fe2","bytes":50826,"sha256":"35c66d1c7f0d77c8e902b8211340447948621c7777c2bbe65784c10d780972ca","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/build-assistant-later-h0-successor.mjs","mode":"100644","blob":"bb45459586ab7f8a6418646a3ccae35350b19341","bytes":43186,"sha256":"e789b73ba57efed3ceaab3bd6cc27a31f812aae1cc1088b395576557ac4720d5","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/build-candidate-g-rollback-bundle.mjs","mode":"100644","blob":"004eaf14227ab20639668f1240f1575621433aba","bytes":6548,"sha256":"79e030daafc41f56c20d343c1a246ad79b82fce2cd27a3f636a762f8f687dbf0","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/build-forecast-share-projection.mjs","mode":"100644","blob":"9bab818c29c9d1ce5d0a28a3ce5a00e8ebb757f3","bytes":8967,"sha256":"efac1953b6de6b86c2da1260c168a82ea3751246c4480adb952f1050be04e2fb","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/build-ravscore-model-bundle.mjs","mode":"100644","blob":"e86dba4688cd70c66db6dac013b08da37bb27bba","bytes":6644,"sha256":"974a8af2c8fdbc92217b15f582142f43a13288143d635b72dec0521021a66dcd","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/build-statistics-preference-revision.mjs","mode":"100644","blob":"060fc5b368592c0a6d70fa2b1ad150f956e75235","bytes":11350,"sha256":"2196c4362615f6ea0541578553984fb280769ec650cd3319de6feadd52cba00e","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/check-account-statistics-assistant-predecessor-source.mjs","mode":"100644","blob":"18ec795c34d56c841d5e8fb6f0ab27108e8d5b40","bytes":19091,"sha256":"10ccdee12b112bcc323689c331a7bb068b7f47ae1ac60d535caf2d4523f465c1","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/check-assistant-later-h0-predecessor-source.mjs","mode":"100644","blob":"3ce850f4471520c4d1fd4f779aed7e10fd75c458","bytes":46429,"sha256":"d07922fbe0406f46ed41bf40633d2b6ed02275dd4683acee8f37e99dae48a01a","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/check-current-memory-warmup-predecessor-source.mjs","mode":"100644","blob":"c4d281d65c3984178078f2354978f68a42893e46","bytes":10404,"sha256":"a201e4afb0da382623004d7717ca867d9a9b881ff107e7a30dd052a5b2a68989","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/check-installed593-code-predecessor-source.mjs","mode":"100644","blob":"626c0242e066369780e36c3a5b39bf628a444076","bytes":6929,"sha256":"b53be91b486ff6fd5a1d0048f85e75ac2777ebf11756c6a2dc30be436361142b","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/check-last-mile-enclosure-predecessor-source.mjs","mode":"100644","blob":"cc241074b53b2a59c0f37585824b9977929ebbd9","bytes":13644,"sha256":"ab211de90959b87ca342a7db803a43f4ed90fe97d6a37ea648314c75c53337c3","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/check-native-current-reanalysis-predecessor-source.mjs","mode":"100644","blob":"b667aed90891a0677a0a7a40d99905fadffb2429","bytes":12971,"sha256":"1c08778a28bc3931b42430eaa94d9659dd279f42528c5306631b971c4405928d","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/check-native-identity-frozen-i71-source.mjs","mode":"100644","blob":"4fda002394cb8932fe1f36841e13267b5b156cd1","bytes":22296,"sha256":"21f08e71ee3384b7e5d8a9294d356536ce0d866ffc562f7ecf94a4f547f35e77","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/check-native-original-continuity-predecessor-source.mjs","mode":"100644","blob":"887ce7efd830e6278eeb61665f1297a808babddd","bytes":20131,"sha256":"17b3ce539b1f296fb75bf592fcd7393569f0dd3614974e6d7d06a836a0020922","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/copy-public-delivery-shards.mjs","mode":"100644","blob":"168aaeadbefe329878c56921df565b62cf543403","bytes":1840,"sha256":"cc2a99e9d83598240123232bffed01d45978bf775fd687f2e4955b71015dc5d3","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/fixtures/account-assistant-successor-inputs.json","mode":"100644","blob":"978c805e4b8c597e2f636f0e720a8b229886a282","bytes":5974,"sha256":"456388ea92807f3763420970c963bd72a3a03bcd3ca5d4b0f4826dfabefdf4ed","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/fixtures/installed593-code-predecessor.json","mode":"100644","blob":"a072abe8a0d0c02f88f0643298e0b62a16eebd42","bytes":30564,"sha256":"cc93a06a980a6d0589dd294edebd1f1fcd7fb304c45a59e699873a06e353609a","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/fixtures/statistics-preference-revision-input.json","mode":"100644","blob":"f7ddedf12a846b5c03eb8c3a12b5c8f194db2276","bytes":4889,"sha256":"4990770bb2b0ca4bbad5da97156b88a186ef6df95319415ca91819cef8ff49af","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/integrated-cutover-readiness.mjs","mode":"100644","blob":"d44f54525f623de3350244af9abb2be556909dd9","bytes":127177,"sha256":"b4bca23fa87a4380f95e9d95f67c2d74641fba021fa5418fa602dcc74feee5f3","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/lib/account-assistant-successor-source.mjs","mode":"100644","blob":"665f70d7ef7332a345aee2ad0119451dad2746b7","bytes":4462,"sha256":"eb35dc46cc6792da5ddff026de0bd61258f240a6b037565c29869873afb08bc5","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/lib/account-statistics-assistant-postgres.mjs","mode":"100644","blob":"6dfcefd66305c3bfbd6477d2d17f74994b53ddf6","bytes":23300,"sha256":"a889abaa42cb2eaeacda7a1e45d7469808d66fad410d2fc350be9b33201c267b","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/lib/account-statistics-assistant-successor-source.mjs","mode":"100644","blob":"c113d10c48e64ca989c7aa1a9188aa9b1c43e0b7","bytes":8780,"sha256":"f063a7481b4ea604dc8fc6ebf32fc1d990ad8ebc01eb96bb9cdd474ee90a36b1","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/lib/assistant-later-h0-postgres.mjs","mode":"100644","blob":"c7c25866b8ece4d132f6135b81caf14e2df9e69c","bytes":44475,"sha256":"4798450acb08f9078377424f7de12a9b9e7317eb703754024a6b16b4e37bc963","sourceHead":"97d189e4a99fdab1b2764db1bfe59f96e92c3f02"}),
  Object.freeze({"file":"scripts/lib/assistant-later-h0-successor-source.mjs","mode":"100644","blob":"3db96a3f983db50459becf36eabfc93782f9f592","bytes":56169,"sha256":"e7e788248f8a321d16da75f14a827d19f9daac6b6d71ef57c135d6020a52f327","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/lib/assistant-public591-runtime-contracts.mjs","mode":"100644","blob":"b175524a56c5f855a526efe4adb9d3a141c77f92","bytes":1484,"sha256":"a6245b6efc9efe2727c37d793b511b019d0072813932bd517756da1fd20a28de","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/lib/authenticated-frozen584-predecessor.mjs","mode":"100644","blob":"a395d42d840e6a48b5879bdbbe8954aeed7d38ec","bytes":13082,"sha256":"900e9452cdf7cb4ed2ec73cebfd451510a1ae71dc55402fb06a66c4b256c1792","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/lib/authenticated-frozen585-predecessor.mjs","mode":"100644","blob":"cfe5ef126611f0ae4dac373a1682c9e0c2effbee","bytes":13234,"sha256":"b62351eb51f1871d970295957f6d4882f9a996db95ee8e7ff10b638306acc65a","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/lib/authenticated-frozen586-predecessor.mjs","mode":"100644","blob":"22504febac63cc306620c06d653b9a747fbdc2b4","bytes":21969,"sha256":"d7465a5d3d2abee68ffac57beb2a707db0dcb1c9f39811d6249181b73626b1ac","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/lib/bounded-conditions-predecessor-transition.mjs","mode":"100644","blob":"e1964ac2b9a828563c1b1912fd0ab824056c88e2","bytes":31863,"sha256":"5783e5aa4a0c0f9b794a7ff196d64119359d9b30372e1dce4aa481f2c4219425","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/lib/bounded-json-writer.mjs","mode":"100644","blob":"ecc586bd8759555a817039fa6a5d84dfbac78334","bytes":4989,"sha256":"d25c6199a18e7227e5160b58d56454abc4c9eaed52a678a55b8bb0dd00369583","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/lib/checkpoint-cas-native-postgres.mjs","mode":"100644","blob":"48d204209b8e258b01faf529a8f5b67e5e5d8c95","bytes":86624,"sha256":"ca9dc65ac3d9d2364bbe93024c77379e4973fc9d4a53a314f11a0cdfce794459","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/lib/coastal-point-stage-dmi-adapter.mjs","mode":"100644","blob":"9f2e2100445fb21c2b8a20bfb93a5b8bddabcf21","bytes":5659,"sha256":"f4dd1e46e70b5c39de014940c8451617c10541f4b5d27e7743387a6c2cd5e8e7","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/lib/coastal-point-staging-contract.mjs","mode":"100644","blob":"d1f34cc7a81032cdfd025c3a97fd3f1225badd9e","bytes":27848,"sha256":"c2abd8fb7f03a0d84628a4af9b734a5f648dd5e250fdd96ccace3d7bc5d2f851","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/lib/copernicus-component-index.mjs","mode":"100644","blob":"03cab3d25c9a081fcac5ccfb1e5098d9f7ed55f5","bytes":13504,"sha256":"cfdfdab9bbd9fe286d8ab6899845263fe031e2d2e933838f99901145ca15f48f","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/lib/copernicus-component-projection.mjs","mode":"100644","blob":"ed9342b8eefbba45c9e7cc621807fd9ddf6b1924","bytes":2660,"sha256":"08a8109dc4e1df58743a4400d3c508076e6f8ca057a82fe5e38f5d900b2686ac","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/lib/copernicus-component-spatial-policy.json","mode":"100644","blob":"060ac359c235ac640ec1bc98200288e6058b8812","bytes":2011,"sha256":"6463a4b47c9375659ac73b13cb24bdf358da4ab621acab49ba58c0d281ef2177","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/lib/copernicus-offline-environment.mjs","mode":"100644","blob":"910dc3f5ffdc69e68e23fa22a586b842b7ac19a9","bytes":886,"sha256":"a19a2de9102560936f3ed380fd843475dc125799bf9b3be948eaef0b425d9ea0","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/lib/current-grid-successor-source.mjs","mode":"100644","blob":"4df7e271a8810ee8877d7d79a78efe761b2db947","bytes":4303,"sha256":"f86aa7b2df9500942c5b4218f7cf777c6e32391722c091d3beabe4ef9f12636c","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/lib/current-memory-warmup-postgres.mjs","mode":"100644","blob":"73953a792fb0aa4fdb346c8a654d5efa8dde8de8","bytes":21181,"sha256":"2e1498b7603a6625d415a1aed8c042c73d747ddd408f4222bdb0e3aa6046e091","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/lib/current-memory-warmup-successor-source.mjs","mode":"100644","blob":"20e42e2c5c13b064dc0f4b9d9fdddd3785825336","bytes":10489,"sha256":"399e7e4690513b1db64a010c03b041d529caccfc0785fb34ab4c1b68ea5894b6","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/lib/current-transport-history.mjs","mode":"100644","blob":"9576e45411ad42eef9ded7e575b51a3846d8da6e","bytes":4967,"sha256":"c7d5b4226aee7846e307d5d314fa336ef6143cfa6c0eca966b0f567b97c1ce9d","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/lib/dmi-bulk-storage.mjs","mode":"100644","blob":"77d58251a61fa8b1c2443b4899a01eef62837cca","bytes":11401,"sha256":"fe51cae3131bc7e91022fc3ede69bc4587409b720bb8c1226d87cee2bff46f1d","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/lib/dmi-forecast-store.mjs","mode":"100644","blob":"29553dd8bced727d95dfb6af54ebd2e3e12dd7cd","bytes":60832,"sha256":"ad46c38f47e77822a8160d67d565763fe4390bd92828ef797a1c652b9e723a3a","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/lib/dmi-marine-zone-exclusions.json","mode":"100644","blob":"a4f65f8eb0396dbe3c3da442ebcb9a06d99d3287","bytes":416,"sha256":"b959dee7b87cfebe9fdc7311ffd62b835c96d5c4a263bbcff5c0485f6660ef16","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/lib/dmi-marine-zone-exclusions.mjs","mode":"100644","blob":"681f6485e3fef029e5ba46b6c17fc818c76dc3d7","bytes":1353,"sha256":"d560dda981a8f0bdec49bbca05abb60cc6a26699784b345b1b258e7f1668ac28","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/lib/established-native-current-origin-source-target-inventory.json","mode":"100644","blob":"cb077381e3fb3caba4e38686c397b4093c059697","bytes":43469,"sha256":"d20f82536e630f2fc92a9680a199b214542d90ba1950d05c444ea0801b50e0f8","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/lib/established-native-current-origin-successor-source.mjs","mode":"100644","blob":"e379cf5d1e9352484fedd2ab79c1056e78bcc283","bytes":7945,"sha256":"9f985630a0985af396d1510d9387b76596e81ca57774fbb6c0d8789598333f9b","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/lib/established-native-current-origin.mjs","mode":"100644","blob":"3df54ecb48c36c6464ba3131f251bc2925b3b449","bytes":91600,"sha256":"e4ec3e1656669229b99a2dff0170db114ae31129c5c0584a3806c74ca90b4f42","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/lib/feggesund-wave-proxy.mjs","mode":"100644","blob":"98d49388b05f1b7837eaa51efadb59e920b12fd3","bytes":22546,"sha256":"fcc6c9af2c8d58c85514d5ac8e7af9645392fe7816187d08e18bf78cbef55292","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/lib/last-mile-enclosure-postgres.mjs","mode":"100644","blob":"753bbe95004ceeb9b145488758e39f28040790ea","bytes":22604,"sha256":"ce41dc273b2fbf82f0bfd3b8fa0883c0212fd0c51a6ff05fb3017c46cb0c357b","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/lib/last-mile-enclosure-predecessor-source-inventory.json","mode":"100644","blob":"17b683ed7c2e810f5f73461f2ff74236f9561a45","bytes":46197,"sha256":"8a35db217041ddfb2f14fb2da76b09af427367989ec67bad7a4fef72d34c0e45","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/lib/last-mile-enclosure-successor-source.mjs","mode":"100644","blob":"031fb080392cd64e74352334914b2e1c634b3c5e","bytes":8720,"sha256":"0e09687c7541493fe10fe9c21f95cf42c9423732f2665664674e629d9825625d","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/lib/live-current-pilot.mjs","mode":"100644","blob":"65721877b2b816a08a357cc8bd8dccbccb3aa167","bytes":110378,"sha256":"552a709d34b828086061f148841245b32f6f4d25c3d1e8249681bda83ad45ad9","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/lib/local-current-reference.mjs","mode":"100644","blob":"e6e24d9d46ca53e4f9e7b10134826a8b1461f027","bytes":2253,"sha256":"6e1c6a28cb3cf704d760e5c6f52dade2e0c81112e1299a1264b3a9502851a75b","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/lib/model-source-imports.mjs","mode":"100644","blob":"b68616c5858c9787f24a42cdff290c9d61d50a00","bytes":17416,"sha256":"0dd3ca8c736acd3ede50de2da14f347b778fc4002d1319917708968fd1be3d82","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/lib/native-identity-checkpoint-postgres.mjs","mode":"100644","blob":"6d8fe8f4a73fccdcfa281f59c99c165c4a8682a1","bytes":26633,"sha256":"5ddbb6a6b4803bcd77a69b4131a1789a58771c0a87e644b800d1bc363ebc4bea","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/lib/native-original-continuity-postgres.mjs","mode":"100644","blob":"f3b487eff4e656c77ad301c78cb2983f40454c40","bytes":24209,"sha256":"6690b4abd7f75c8011f4646c60236a0f88ab2563477b2dce76bcdadbaa0c27b6","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/lib/native-original-continuity-successor-source.mjs","mode":"100644","blob":"c6fc359ef4fa3f508c4ffd6198a46fbfba87f7ed","bytes":9638,"sha256":"52c04b86be994c50ec7485b5d0b79231c78e5a2eb63cec8c812df5ff5250345c","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/lib/native-sampling-identity-successor-source.mjs","mode":"100644","blob":"4cc8065550be8af322ee0d9c24ebe9a19b29cad5","bytes":9042,"sha256":"a7b77c586e72e0c67be225c7fa773152d5dc3c41b5f5ea47e55504eee495d5ba","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/lib/native0600-original-successor-source.mjs","mode":"100644","blob":"ab6803be1977296b16913c344b35adf7ff329923","bytes":7442,"sha256":"bcc2ac876cafcd61ea434bc9658302224e8f061ca048905d5682222eccf348c3","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/lib/open-meteo-hourly-components.mjs","mode":"100644","blob":"b47d6c6422d63da703a7f9516037640af7ecda1c","bytes":8408,"sha256":"79518ec13546c78ff4ecbacc16d80c06d091b4c45f7d529e0ea2fef8af70b07f","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/lib/open-meteo-o1280-grid.mjs","mode":"100644","blob":"7541dcbc842e25267024f95d507596f52d972842","bytes":3226,"sha256":"1a4ac015264521fcd62fb326868608738056d918acfcc2da3157f05996e4112d","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/lib/open-meteo-part-bank.mjs","mode":"100644","blob":"1132b6f8809e9a42c8b881bf296c9a4c17a4d320","bytes":27164,"sha256":"bbce6b16fda0649c258ed727319f5e1505d68e11961ae3aa52df48533dccd665","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/lib/private-conditions-hourly.mjs","mode":"100644","blob":"0790f80d7fae3179e7ba4f987d1fd91c94826f57","bytes":8465,"sha256":"ea5fe3d5b801edd1cf8670b7d2bc3d7dbb870be70f26c56a01a8a21b2755dc0e","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/lib/private-weather-component-inventory.mjs","mode":"100644","blob":"74165842787c0e802c090f873ce1c4837ccd97bb","bytes":5021,"sha256":"125e1a2acee5bff8d16ac549e96004dc8c80bbcea684782c45b3cfc666edba3c","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/lib/private-weather-component-pack.mjs","mode":"100644","blob":"6b21462dfbf34ce8cfb6b996fc6a7be043f443c5","bytes":35929,"sha256":"e6c3b6443253f0628711f065b96e9237cf3aa29a308c771d00b838277c751516","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/lib/private-weather-progress-files.mjs","mode":"100644","blob":"be89eb603dbb78f6d573bc12ce9efe90b6654aee","bytes":336,"sha256":"441a086ab2b0aff8c259433322d85733ef65fb785e1ceca0fdd88894e2b5d5f3","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/lib/private-weather-storage-abi.json","mode":"100644","blob":"eb779329bd5446cefdca589d0fabe3f4d12d35e0","bytes":672,"sha256":"0d445cc7823602e1a5cab51b20dbdabef59d52c7e929df9bf415f1bc6293d3b3","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/lib/protected-dmi-native-current-proofs.mjs","mode":"100644","blob":"936bf7676961081f6ca7d92e7f5154f2c9d103cc","bytes":28459,"sha256":"3fedc43197cc655721c6e5ade0271f00e7be73216d3c515dedb0e2a57400028d","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/lib/public-hour-delivery-pack.mjs","mode":"100644","blob":"3c37c6755b54f44bbcd34eb5071b4e1f2ff9e43a","bytes":25913,"sha256":"10a1bab2155b7eedd791045209a514f41bda08e3dc9470840729b87967fb7f6d","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/lib/r2-private-runtime-storage.mjs","mode":"100644","blob":"4811d5713556b66899d2d903182cab711e7a6fdc","bytes":12623,"sha256":"2ec0b01fa4cc34ca4ea166681d7046fa3920a20086fba977797a50afc765e97c","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/lib/ravscore-candidate-g-rollback-runtime.mjs","mode":"100644","blob":"4a72c4ff03c9354488b17dc49fd6d37ecf7b471a","bytes":36594,"sha256":"920f790b5459a945525565498ad014c51b9d7d0a0f32360948ead9c54424adb6","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/lib/ravscore-continuation-implementation-contract.mjs","mode":"100644","blob":"356669d7d2043440bfe62455b52d7502e1dd3bad","bytes":2316,"sha256":"09a4f9a4b07717bdaed81742db94f1c22d9968adae30bdafbb5927c3dd2780b3","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/lib/ravscore-integrated-runtime.mjs","mode":"100644","blob":"7df5ed3d273d66b5a2ffefb19798782b2bd04ee2","bytes":18515,"sha256":"a75dc5f45df6db6cc97b0cfc17d5c7cd9834c017fd213ed4f7dc699f527b27c8","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/lib/ravscore-production-adapters.mjs","mode":"100644","blob":"74d955b290024462dec0bd6c0c59aa691800f0c4","bytes":48028,"sha256":"4803973bf5863862c9cc52ef8998f7afeeb732340a37066c4a895c2b8ca9a394","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/lib/ravscore-production-part-pipeline.mjs","mode":"100644","blob":"5a741cffb6d4fbef7a377e6235d46d79f5768b78","bytes":40434,"sha256":"8e979128a682a7324d7defcc3d2d2dfa5edc85ebc22d4ae714810aa085490758","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/lib/ravscore-profile-transition.mjs","mode":"100644","blob":"e06352b93bb0dc30c8ea0fe9d59d3b9e328d4d2e","bytes":9199,"sha256":"d82449cfb267802b79fdf77581494cabcde9385614fe9ef47fa96490f5b41320","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/lib/ravscore-recovery-replay.mjs","mode":"100644","blob":"1a8ffd5d1f97ae80a5b22d085c72858d710d3e73","bytes":49200,"sha256":"b7459a5d821800a9c58c303fc1fb166610b73d98a68523a8830ef29eb4e70223","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/lib/ravscore-recovery-source-priority.mjs","mode":"100644","blob":"b88212c1f1aa5368cd42b67abb819b1343e09619","bytes":51270,"sha256":"4bbfd4b6ec900cf1ba63e28b225bf8c4707b0744b23f5e0da4981bf892f4d82d","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/lib/ravscore-sampling-context.mjs","mode":"100644","blob":"9d3f05b2339326bfdaf72dfd866144ea59d8f964","bytes":979,"sha256":"5e3465826e7dc7caac4cc8b0da1d1117a3b51dac157973d09aa7c2b7baa44cf4","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/lib/static-module-closure.mjs","mode":"100644","blob":"195ea4c431ae80c04a4b563ba512d13e176e987d","bytes":7115,"sha256":"bb64f60e1a700897f6dd982b8fe9c3ed85fbb48fd3dfd0b2f46f65e3dc91b17e","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/lib/statistics-preference-revision-native-postgres.mjs","mode":"100644","blob":"79b72f3b006174f4bb8a8e8605cf57df249a421e","bytes":21218,"sha256":"bd763c72cf4a32b1093b7a19d324f688ae61897e9697c7cf31d33ce6b308d51a","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/lib/supabase-admin-rest.mjs","mode":"100644","blob":"0650fc60a62bd651de63ea54892c80eedb915727","bytes":4576,"sha256":"ce6213930e27ceec1c125f98ac4706aa92df14b228d055a20c37a864d84f8724","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/lib/weather-component-needs.mjs","mode":"100644","blob":"a2099f230fb86709701d5b0211f3ef703ae46913","bytes":6681,"sha256":"a94fa5a46acbb52300aba4d7472776b03cdec4f0675611f404f95adc279d42b4","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/lib/weather-component-selection-history.mjs","mode":"100644","blob":"d9c420b156906d2c835e399fa545d6afd841472e","bytes":6634,"sha256":"eaf41bd0fc8e72b80e291745ea8049f06170bb9f06892721bbdccb434e00c8cd","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/lib/weather-component-selection.mjs","mode":"100644","blob":"298e8e6edfe6a444482696ef57753066be984e9e","bytes":9365,"sha256":"587905b8a0453d46418e0be4ecb12cbb023e94ee3c6e861d8b638c6e08e5e35f","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/lib/weather-reserve-admission.mjs","mode":"100644","blob":"dec71df0f04368c4ae08e339f452314b3add9ed8","bytes":1637,"sha256":"c847fadb22e02e92a872726f97a4e5ea648ce08fb171f36558e6727110439c24","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/lib/weather-state-epoch-archive.mjs","mode":"100644","blob":"fc2e8f803056797a328c221e9115d85e8ce9ab82","bytes":59855,"sha256":"e3ee3638edd722723442feb41fee751184e9c943aba89b06922fde738febfc1a","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/lib/weather-state-epoch-input-view.mjs","mode":"100644","blob":"ac01b24783a292a5597811a79abe6836fe8fec5b","bytes":11064,"sha256":"26b0831e60dcb438d9e3d7647a775825d1472d962a622d0089a2e3306e1f0cf2","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/native-sampling-identity-successor-readiness.mjs","mode":"100644","blob":"42ced169225cd4114c8e5cd8badaadb0e9a74299","bytes":10540,"sha256":"78e3622c96defa966997809b6ccb989ace4d768eff06af12f719ca874e93f875","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/private-production-runtime-bundle.mjs","mode":"100644","blob":"2b704bb13e11a8cea511f1c6c15e72042ac14a51","bytes":34235,"sha256":"2eeff25c6d6e769c7a5d9b414bfed574e0105e7cb24d0bd1578e7700781d5529","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/private-production-runtime-workflow.mjs","mode":"100644","blob":"e982552eee72c67c4381ed081b84e6c17a76a894","bytes":79268,"sha256":"9d560a6c5e3415b18b07e288c61b7284d0e1d2ae57c56efa0f7cb9916701c415","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/protected-private-production-runtime.mjs","mode":"100644","blob":"60a9aa7c6db50a12d89b5071e7b782b817a5f65b","bytes":114822,"sha256":"e41b0434e14dd181c5ca3f6313456274c4fa5fcc9e97029e49f300ae0d4e4762","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/protected-ravscore-continuation-checkpoint.mjs","mode":"100644","blob":"00b0db4c896ee38f91df49366b5421626635661e","bytes":49091,"sha256":"d9e9e4facb7005cdcbdd353241bcc84de8ef3d4ede28aaba91e5c00a5aaab030","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/public-conditions-lib.mjs","mode":"100644","blob":"197115e9d933877e7a7e0b95f5d6f0f89d9ceed5","bytes":65524,"sha256":"e5a921d2a818694cfa13d5fcb30392cad972dc3b7038e929bc1d659a95f8017d","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/ravscore-continuation-checkpoint.mjs","mode":"100644","blob":"4741240186854b0e24546eefc2085defa1fe736f","bytes":54290,"sha256":"e5c20048add873a1fcf890c23f922b4ea5394ab88b867cf8d4914cde215d88bf","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/rollback-assets/ravscore-model-bundle.generated.js","mode":"100644","blob":"1ce0b0f13800c17048e8b2ac293d60d48a287c92","bytes":17293,"sha256":"4443825e476aa8f8ec11fc79822c199205a9d03f9f51a949352d74f0f38a59c1","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/rollback-assets/ravscore-model-contract.js","mode":"100644","blob":"21aaca07603d8ae263eae9ff9bd97b6d8c0aca02","bytes":7249,"sha256":"ba1c670fb3aaf30ff01b6c04583296c0a5da395866f28f03569285f7b0a2c135","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/run-frozen-current-memory-warmup-source-targets.mjs","mode":"100644","blob":"2964652f080d627924c28c575d9f6c8c3b3c5d49","bytes":17349,"sha256":"0a5146f73005ad79baf62fd4997a1ac8030573d153238ff68c8f3e1910221329","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/run-frozen-established-native-current-origin-source-targets.mjs","mode":"100644","blob":"ebaa0dcf017f83e9a42cc51a4a24e1793d200cbd","bytes":11203,"sha256":"5cccc50307b84a52dd1d2af304076be3b7bdd4c714cd32ca58708017c70ad787","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/run-frozen-native0600-source-targets.mjs","mode":"100644","blob":"3864ab76e62ea55d868878ca183a2b6ec6609fc7","bytes":9578,"sha256":"5afb97a900d256c77f36862009be7f2ce2746ccb05b31a1fb243dfdc333e9380","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/run-frozen584-checkpoint-postgres-source.mjs","mode":"100644","blob":"8373beac9c80ef7c084184d0b30d11ba99a45247","bytes":7771,"sha256":"9aa840163660538dba16d4d21c70f6ac26946a0705fa18f0f93d8aa2239a00ec","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/run-frozen585-native-continuity-postgres-source.mjs","mode":"100644","blob":"9f074bc0ba4e71d383416a7c651e54ee36af8052","bytes":8120,"sha256":"d56fab8e39ac459d942b7a0d3dfdb760d923f1b53bd4c65f69fd6ca1a47ce588","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/run-frozen586-assistant-later-h0-postgres-source.mjs","mode":"100644","blob":"740e88971b0b4b1286cf444e26952ec31a896e33","bytes":16249,"sha256":"0459a227114aaeaa830cd95afe3c5f2e06baa1b968eabfdd354ef52b3c794d63","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/test-protected-ravscore-continuation-checkpoint.mjs","mode":"100644","blob":"61be6be258a378b2d2f2f8b8d57072095712f247","bytes":71324,"sha256":"7e953c0fb1ef424d40a85396bafe506076ab642229a735800a34376b0f2f7960","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"scripts/verify-account-assistant-schema.mjs","mode":"100644","blob":"cba1e102549878567420544e8c7e2cd20252eaf9","bytes":25513,"sha256":"8bc595c8d1bef55d71cba5234c78256ff5797a0f33d17fe6a0146c9b08bddccd","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/functions/_shared/public-gateway.ts","mode":"100644","blob":"e954dad0a8ccd1aa0a0b307e6edf8984ff2bdd52","bytes":7593,"sha256":"6ecc74e84177a2e4ec3a39e6c4cfcaa3c4c70bc7b826c668899671664441625b","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/functions/_shared/trip-source-projection.js","mode":"100644","blob":"992e3fea18793d344167b8a45e01babd17015996","bytes":6955,"sha256":"5db6019a5457e145c582d4c24c35ea9f49dd67826b0000b59ab0d23d109e8a72","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/functions/_shared/trip-storage-contract-probe.js","mode":"100644","blob":"9efe00e691cde0c2f6d7ed17e9e85a155c464beb","bytes":1223,"sha256":"71103934af8d5623b743c2c3866e7f80778a8f296a8125aeb1d87e44bc2bc5b8","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/functions/_shared/trip-storage-readiness.ts","mode":"100644","blob":"2b9ee7806c5ce591fcf3af5db86cc368e0d23dd9","bytes":708,"sha256":"297b7bd026c903fb5bb63841bcf00d155a73d7ac9d70d0ce9f7a642620c17089","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/functions/_shared/trip-storage.js","mode":"100644","blob":"e31e767b5bd1ef411d8386a6d8bbe83cbdf2a6d1","bytes":49098,"sha256":"8c56f1ab467adf936df72220e6984cac03d681fb5e208f84da33a5710009e1aa","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/functions/_shared/trip-store.ts","mode":"100644","blob":"bd12e4a97f2024fc6b153b109c2323d7e5d34249","bytes":13649,"sha256":"b65814a88aa85a198b2c2e331e81cb882f83c7820868c91fa468686cff7559c3","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/functions/submit-observation/index.ts","mode":"100644","blob":"a70232a3f0788e357d9be92bd7547a8ba47003ad","bytes":10785,"sha256":"863465db9b4f2aadec00b14d46a9d383b33bb3fe9dc7ccf9ee2083e09f623617","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/migrations/20260730_handbook_reviews.sql","mode":"100644","blob":"06d47acb229053283cdb60cf4f8c8e0073b2d706","bytes":3432,"sha256":"ca86b7c5d74dcaa85def9c976bb9149a7cdb881bcfa500a49dbc0cae81cb6e84","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/migrations/20260802_handbook_review_cleanup_policy.sql","mode":"100644","blob":"961cd39444ead902d731eeff9f0fb3fe16dabb38","bytes":445,"sha256":"3ed704be059ec4fc6a651a1ffcb3baa5ee9d253d3a14edc0478452db416341bf","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/migrations/20260815_private_visitor_statistics.sql","mode":"100644","blob":"63661d134723e761ac9015f72b625cacfb4dea21","bytes":2695,"sha256":"59611f4cfac1098a883e90f6a175c57dfc3fbf57d0c5b82ce1edd3eaf70699e6","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/migrations/20260820_observation_remote_privacy.sql","mode":"100644","blob":"7a3ab757fa0ae67e2daaed24905d055456e2bf8f","bytes":1445,"sha256":"9da6e39ad5a15c593f04d5c890faf860ec972ee9e83f05b24583cd8283368701","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/migrations/20260821_trip_evidence_contract.sql","mode":"100644","blob":"4bd0dd190375cb812bfa7256770b3adec7395006","bytes":5063,"sha256":"8adad4a429b1258760c4097f02d0c81354c7f56f99f3762f108a5e8dba97042a","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/migrations/20260823_account_trip_log_contract.sql","mode":"100644","blob":"f887adda620d92bb31411d95e3e7f93bc8eb3ede","bytes":925,"sha256":"6a978e3944a484f4bf9f228fce608e8736f1d1e8f28c8fec1f6316afd8cf81ed","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/migrations/20260823_observation_upload_contract.sql","mode":"100644","blob":"48515c89ec2c2406cf4e901c3e4e89ec46fecd0d","bytes":483,"sha256":"37a33c0250003a29b60250fd4072b20c76b17511121849b88c28e90d8c7f5c2d","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/migrations/20260826_security_hardening.sql","mode":"100644","blob":"e23d5f01986801b8a096244b3b22c0e7772f2156","bytes":14253,"sha256":"b135b8d0fe2a479a50f91e3f3cd70c7cda09362a34eeb2da89236e259edd9283","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/migrations/20260829010000_ravscore_operational_documents_no_history.sql","mode":"100644","blob":"d458bee19111d94d44b9d4cf812178d62740bf47","bytes":7811,"sha256":"84e532839d69eed7afba64d01f20bef3fdf4e8699ba66b91e4d17f469300cd45","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/migrations/20260829020000_integrated_trip_calibration_binding.sql","mode":"100644","blob":"c047ca33aee334909eaf2553ca3641a16bdb82da","bytes":49473,"sha256":"3e32daa856e44f81ae900e3c841b74633ef8efb473fca8b3f3dacef47de1a96d","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/migrations/20260829_candidate_g_reconstructed_trip_exclusion.sql","mode":"100644","blob":"05df9f99055932f32e6199575ca9b4ebbe90d08c","bytes":3821,"sha256":"ff5f8401855438445a3be4e77c16eb922b37ce1aa8bb7542723b89b9755bf23c","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/migrations/20260901010000_integrated_trip_measured_warmup_admission.sql","mode":"100644","blob":"c5f9dba121694ca389d483a0746bfdfa4e91bf96","bytes":36614,"sha256":"443d7f02f7736ca9d5ab2bd5dab28b8f5f56c6dc1c7550ee548fdec611e5386c","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/migrations/20260903010000_ravscore_checkpoint_metadata_cas.sql","mode":"100644","blob":"1dbf4e6742f6e10b1bc38153ea613d13a88b4c26","bytes":74529,"sha256":"0076acd2a51ff76bc68ff9ccbcb7ad19b24848b338c22ce00b7382674d3088d5","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/migrations/20260904140000_harmonie_wind_reference_binding.sql","mode":"100644","blob":"1d670bf52f01e8419b0c38ecf5798322104d3ce4","bytes":110870,"sha256":"bb6f7cf3f637edaa95970d9e336c0cfa845200b8edaf15ff2929de0c4f822ce1","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/migrations/20260905090000_open_meteo_current_fallback_binding.sql","mode":"100644","blob":"6170f70001c2273dcdca891d6495e301026b2050","bytes":110874,"sha256":"c94b2480770edf82863416d19b0b8abc465ddec2f9ce9bccf650258e187485ac","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/migrations/20260906162332_per_pair_weather_fallback_binding.sql","mode":"100644","blob":"1b88ed433787604238690323d267fd2319b9490b","bytes":110881,"sha256":"8767e45cc001b50d00ae32c0f3e1aaaba27411c04390956a47b1f23f86e9abf2","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/migrations/20260907084343_horizon_valid_weather_binding.sql","mode":"100644","blob":"f0e949cb6ea8a1f803bb770916dab7d5cdd061b5","bytes":110881,"sha256":"f22ce2b3ee2e45c4fc86ce6a71b7a48543aef47dbbe014ecf41bd95558421c0d","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/migrations/20260909194000_wam_same_run_resolution_binding.sql","mode":"100644","blob":"2127fe6594fb1a1acc8078899be6d97f16061fb7","bytes":110901,"sha256":"a76ae8bd0de79cbbbc79edcff0af92e37c2dfb3d5798e9c35e4337cbfea6606d","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/migrations/20260912122607_measured_rollback_warmup_binding.sql","mode":"100644","blob":"c647f809d04bf93cf87e9499362e321f5d026592","bytes":110902,"sha256":"704439882eb6e77a7c038e14b8ecfd49ef9b6bb9074f9ea5778f6843f6c48137","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/migrations/20260912141641_state_only_hold_closure_v2_binding.sql","mode":"100644","blob":"f655ffb289dd0e32aa54a675e8f7bc3043daaa1e","bytes":110904,"sha256":"548c29250363ecb45d19408141ff5206e86de273092c4a9d15add2e774a8cfc9","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/migrations/20260912194206_local_unavailable_cutover_binding.sql","mode":"100644","blob":"13ebba02b1a05394ca0717b2791d8fef9c9f98f2","bytes":110903,"sha256":"24a7450ae913ceef37375e6df200a0e85e6a001128c4a1ca9b6652ae6642fbd8","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/migrations/20260913010000_public_runtime_oracle_binding.sql","mode":"100644","blob":"3e175dd4b60a384bd0689b93d0a9aaf6eba64075","bytes":110899,"sha256":"0e855c718611360ffaa633c6dd890632b791c82faed03bd4699c0a9f20a0ecd5","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/migrations/20260914010000_h0_reference_recovery_binding.sql","mode":"100644","blob":"decde68a4301efe421aa21abe090c20ffb106efa","bytes":110899,"sha256":"298e0a4c849d3dee363792b3cf4bad302f9eb7d724dc5f686a1f9bf602d38040","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/migrations/20260914020000_h0_state_snapshot_binding.sql","mode":"100644","blob":"8798affb1c801423134bd2caa7120678e8e8189f","bytes":110895,"sha256":"f664d2a36f9a9bde668a542ac74b2312eab56c1c0ef9087cc26ef71f4f3b491c","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/migrations/20260914234500_post_cutover_current_hold_binding.sql","mode":"100644","blob":"e76166fb29d232acf4135ba602b379efdd8d1609","bytes":111231,"sha256":"9386e0f6754ccb28521422c73ee5eb00c6c2e4f5899609e0bc3033048a83b840","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/migrations/20260915020000_private_runtime_storage_deny.sql","mode":"100644","blob":"fccac46043672d63f94ddc954d687bfd0cee411a","bytes":501,"sha256":"cf1291f9c595d2746323c1b73202958e6a596016acff72e9aae01e69c76c869c","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/migrations/20260916120000_valid_data_before_local_missing_binding.sql","mode":"100644","blob":"a85e92bb0718f2f9a6f9a2adf7451b993ce8c31a","bytes":111237,"sha256":"95272e1f95d07f2616cd4bc2057cbe3c82837bea1057e04bdece33e5e2958796","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/migrations/20260917001500_partial_zone_public_metadata_binding.sql","mode":"100644","blob":"e84cac1eb78cd6328611001330fede1848f60ad3","bytes":111234,"sha256":"548ba234d6ad2a534bef96f0068c57243c7857a71e8cbe88f262a7a46b5c826b","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/migrations/20260918125600_last_mile_history_envelope_binding.sql","mode":"100644","blob":"bfeb47fd87440c9710b7dd5bce1f72583066a4b5","bytes":111232,"sha256":"0548e4ad175c02b32f330c9563be89a0f7d3c4093409385155469368535d5707","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/migrations/20260918190000_weather_input_resolution_binding.sql","mode":"100644","blob":"be7500e1315a765210780e38085dab198845f5be","bytes":111230,"sha256":"9dd27fae7ffd93720a7c2c9c347ab8ea6df40cbc96d713cb1ff25c638078f2dc","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/migrations/20260919010000_current_input_foundation_binding.sql","mode":"100644","blob":"deff324ab791c09634539aa0a4160018af3255b9","bytes":111230,"sha256":"5ff2e8a01d27eb5bc5df9482c0660e1b82133fa9a738bff60e93fed5fd2b1233","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/migrations/20260919020000_measured_warmup_checkpoint.sql","mode":"100644","blob":"2115f283d759b119dc6256ccc801104a0d1bf4f0","bytes":115286,"sha256":"24fd06b77349fe993f844fa0401deca3d69c30d823205cd6840f51f93f4b2fe8","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/migrations/20260919231000_public_hour_delivery_binding.sql","mode":"100644","blob":"aed8ecf8fdfcaa7f4f326dc7fdac3863a775a31f","bytes":115288,"sha256":"491b33fe1027340ecfe389f6dc98ac3fcdcaf4c0a2351607eb98cd3b14f003be","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/migrations/20260920220000_public_hour_pack_capacity_binding.sql","mode":"100644","blob":"fe5f59679e6a6a35c6add1e8e65a8d465f0fea5a","bytes":115369,"sha256":"4ab13e16700801ee38cd6a25cc6fe4adcc87cbe188c5f226a61798bede7b2f9f","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/migrations/20260922100000_integrated_trip_binding_repair.sql","mode":"100644","blob":"3803ab3642872d1d1dfdfb3d149a4aa35e3ca36d","bytes":90491,"sha256":"f44465ffb4a4f253a15becf5b1a449781e05a120fec95de1a1ad35f959067e69","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/migrations/20260922170000_integrated_model_binding_successor.sql","mode":"100644","blob":"8ca0fbd1c33cd2a6b1342bbb5e88353cddea0895","bytes":90555,"sha256":"6746c7e9bf1a980a194aae08410bab04917b5ee0d3e6b08f7543a3470c5680d0","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/migrations/20260923052100_integrated_current_projection_binding.sql","mode":"100644","blob":"87a6402f04aeb9c548e82d60da34cac2237dc415","bytes":90630,"sha256":"26d5133de58137d121c7f1bbf4410503fdfb553c5101010bd667dfcd6decd1a6","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/migrations/20260923091500_integrated_native_hold_continuation_binding.sql","mode":"100644","blob":"f88ca2c2a37486caa8c7bc267c1057602c28e04d","bytes":90625,"sha256":"fb6b357395c11e5982eb496187a6eb3c45502c21ef036a12ecb1ad4838a5457d","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/migrations/20260923100000_integrated_checkpoint_part_identity_binding.sql","mode":"100644","blob":"dad1a1f8de551bc08096c5d4f7ea37baba661b21","bytes":90622,"sha256":"3d0b9aa386cd19ee092a1fd2cb25afd3dc4b367d92c3fb1503bc0e1b4adf130c","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/migrations/20260923110000_integrated_checkpoint_warmup_status_binding.sql","mode":"100644","blob":"0b909b5bbebc49e0e63748d60fcbbc6bd1c237ec","bytes":90518,"sha256":"24c77f96a0a21a95232dba473394b1e19783bca4bceb32069e5bb482c4421187","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/migrations/20260923120000_integrated_checkpoint_missing_state_binding.sql","mode":"100644","blob":"4dcabf5d4097692dd2a80be91882fa3ee8a2e212","bytes":90899,"sha256":"a171ed10e1520d2979fae506aba9aca17d420ded2a11fc12ba087dfb32ccd6c1","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/migrations/20260923130000_checkpoint_rejection_diagnostic.sql","mode":"100644","blob":"e36db9f5232a0d948af72444eef9de6847038677","bytes":60529,"sha256":"6c43152ca038e5d322063cb3ed922bfb43dc698de5690629b488b4a6dfbf6d57","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/migrations/20260923140000_checkpoint_native_hold_null_evidence.sql","mode":"100644","blob":"5e75e21e3ed037ae9f6db82b49491af8d9b46b35","bytes":78839,"sha256":"b502c3c1abc12fb07375eca7954f7538d4c8f5d12f776802e7dc48a8173caa8d","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/migrations/20260923150000_checkpoint_candidate_diagnostic_correction.sql","mode":"100644","blob":"fab3329744ffefa0831d66f35f778350de7b43dc","bytes":9367,"sha256":"10ebc7983bfab8677188c304f9591a5c21c7b7ff24dc329d622f9ecec3ec9c5f","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/migrations/20260923160000_checkpoint_candidate_companion_id.sql","mode":"100644","blob":"0de996e7b5fa5faadbf24bbaaf62cf3e57cfcd91","bytes":19462,"sha256":"14d2746b647006c2720a1666887f02ed59e964fe5841b626101b32efd77efe00","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/migrations/20260923210000_checkpoint_cas_bounded_timeout.sql","mode":"100644","blob":"37ce4644b06c97c947a97fb934a11f55464392e0","bytes":414,"sha256":"547d73df4294cb7ba2dadd8bc56912d9d345108c54e5933167c4a018f01c7e00","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/migrations/20260925150000_weather_selection_model_binding.sql","mode":"100644","blob":"5e822a4ef71d50d47777a4167194586ca8bf7e0f","bytes":140697,"sha256":"436a0ec8a57a6b9b5e1b9124b37c0ccf3e0328234f9bf7635b88ed23602c3bc4","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/migrations/20260926170000_exact_checkpoint_predecessor.sql","mode":"100644","blob":"ad536d7e119184560cc23e4a64cd021fac5e38cb","bytes":3850,"sha256":"e435b9c0ad8fa1137d770cda0bd1d277de0bc4b896886c14e25fbf8c5ac2e2fc","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/migrations/20260928112500_checkpoint_cas_bounded_timeout_55s.sql","mode":"100644","blob":"30f378ca3946821b14271a523f7fbb066ea23117","bytes":371,"sha256":"a6afb5329fbf9ffa4129ac63442018de6f1a0f261b0ad02179c118b61a95aef0","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/migrations/20261002080000_top20_display_binding.sql","mode":"100644","blob":"b3ff6fbd394a73687edd46e0eb8cc615d464eb68","bytes":145084,"sha256":"103de25ac4521bef4a1b041dd2ad65eb8465c6ab38dc19b23947c675ad5b60a8","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/migrations/20261002094500_restore_checkpoint_cas_timeout.sql","mode":"100644","blob":"68427b63209a3516cbc47454a104db0c2b755eb0","bytes":9274,"sha256":"31632e333f16bf07f00f95cc87e19cb66a92fd4448ac0a27c1b4f7964e9eee47","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/migrations/20261003080000_copernicus_child_close_binding.sql","mode":"100644","blob":"406ead80b2cc85565211e49c6fbdc78470ba8a9b","bytes":149708,"sha256":"b673b75476709c8bb51c5c2caba9e3acfa8f64b6666f4a74de3213ba961eb505","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/migrations/20261004190000_owner_current_source_domain_binding.sql","mode":"100644","blob":"93b82560943c086277c2583f116a3ef00a2e2e80","bytes":153959,"sha256":"4e5ae691182ae6ef7b84f346bab0cfd828eedd321501424a307d5c918e449399","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/migrations/20261005000000_owner_water_level_only_binding.sql","mode":"100644","blob":"80467f2fb66e9162a96d29115388f0a1f11b622b","bytes":158209,"sha256":"6b161bc71753b52c5728c8b9a03b02d5d0955d0e42e751a3f2a51a6ea6900496","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/migrations/20261010130000_owner_export_origin_bound_successor.sql","mode":"100644","blob":"3c429dcbcc5a3acf80635b50451030112901e7ff","bytes":162471,"sha256":"55f01dd535553ad5df708ec70de8d58d177299f3348d18a2355a188bfb4f8cb6","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/migrations/20261012200000_checkpoint_cas_single_projection_successor.sql","mode":"100644","blob":"4ba471e7dab9c1c396637f30c3c3f2a18b149736","bytes":12218,"sha256":"b03605272397585a3e6ad248398ba7bc6d88af506837f76c88a9a92955b48c18","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/migrations/20261013210000_account_assistant_original_bound_successor.sql","mode":"100644","blob":"4c48f406c2d3c1c6a9424e5687a5ccb310523b06","bytes":150567,"sha256":"80ad179bc896e9fcd62b8af103d70a2d086d3626395dd97f03e4184e52bcae5d","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/migrations/20261013220000_current_grid_original_bound_successor.sql","mode":"100644","blob":"b85f2a33d4c00cb5cd6a7bd13b0b6b2436c44d27","bytes":293911,"sha256":"77d5a60f22ff38fce3164c87e74d089ea56c0a18647310213cde465e95e4632b","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/migrations/20261013230000_account_statistics_revision.sql","mode":"100644","blob":"ac9b03721bc0a3227ff0b14968aa67c013acc35a","bytes":29257,"sha256":"af4bd9d36f9a8d4badf3802d151acb2f16f2d5edd22ce095f8086167f2a00cae","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/migrations/20261016060000_native_sampling_identity_original_bound_successor.sql","mode":"100644","blob":"d234ed018b852551ec317e274a3e5d24352462ed","bytes":213647,"sha256":"10e26f9d095b6c06eee479eb11d821114b04e4db0dbdb7c6717c13200793f019","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/migrations/20261017020000_current_memory_warmup_original_bound_successor.sql","mode":"100644","blob":"77adb635b9f8d25e4dbee66260dbc0c6090a4ef5","bytes":238629,"sha256":"c8fff609ea03bbc2e5c84bea57b1d7702b15e51cd27f1854692506b18369ef47","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/migrations/20261017140000_established_native_current_origin_bound_successor.sql","mode":"100644","blob":"fae1df6b19d3f1cc0a0589036340d5113ac5ad40","bytes":299508,"sha256":"f1d12590cfc93047afa94cdf152fab6e77f2851807695f0771127a2fdf6122b5","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/migrations/20261019060000_last_mile_enclosure_original_bound_successor.sql","mode":"100644","blob":"4758231c6f387fd6631cb88036d40e7542da2865","bytes":299757,"sha256":"7d21e67a9d9b9ef5e1322a7e746120b289185ac09f24701044cbc7254617fd67","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/migrations/20261019100000_account_statistics_assistant_original_bound_successor.sql","mode":"100644","blob":"f6507e739b891236542140854d4ae5c5f44e6778","bytes":315352,"sha256":"9cb02d5fccdb5c9458a1f924c8f8c57510044492d2f326ab28c45ff735039d59","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/migrations/20261021150500_native_original_continuity_original_bound_successor.sql","mode":"100644","blob":"52853c720f61f3c29527a2ad1a65a5fb2321175c","bytes":326605,"sha256":"b4594e2187c5326ef798551fdb12b596ce8b2bd0ae961b7529acf5b668ea5ccd","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/migrations/20261022181403_assistant_later_h0_original_bound_successor.sql","mode":"100644","blob":"d6683449194c1f1e7d1cdd9bda54d32780fb5b78","bytes":325470,"sha256":"b14ec45f920a86b9b055f4c30c716695fee767e25564249ac22ca448e1776fa7","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/migrations/20261025110000_assistant_public587_later_h0_original_bound_successor.sql","mode":"100644","blob":"d131a376bf0dcce6f3c82dd1427ba725df0ed645","bytes":332318,"sha256":"363d3f304150e8abd61e0217848839bd7babb4e5687f3e61a1a6e84b948f589f","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/migrations/20261027124633_assistant_public588_later_h0_original_bound_successor.sql","mode":"100644","blob":"32d91234a5380c93f2575993035a332a473abde4","bytes":339166,"sha256":"eb0262716b66d29d52bf0ac4412c475ab5e9ea69e1cad15eabc9a31b48bcf821","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/migrations/20261028223717_assistant_public590_later_h0_original_bound_successor.sql","mode":"100644","blob":"3ecd2b8e712c6379a66d3044671ade76c950c396","bytes":346014,"sha256":"72b53fb08ea0e5cebcda7e1cbf3bc49a8a3f2417975daeb6daf530c9029c6835","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/migrations/20261029183010_assistant_public591_later_h0_original_bound_successor.sql","mode":"100644","blob":"20c2c1eabee35a54458c3fc1830b35d9d0524068","bytes":352862,"sha256":"e5c7fb182d9491bd9222cb59dbefd3da4592867522dde805ea17e67c0d023e97","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/migrations/20261030105202_assistant_public591_later_h0_original_bound_successor.sql","mode":"100644","blob":"dbd24924fff7156f0a387fc84a6f9b74212ca75a","bytes":352862,"sha256":"47c51886a58aa1cfbbc244a5469ace67521774499135666c26fccd8c7f291bfd","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/migrations/20261031070755_installed593_original591_later_h0_bound_successor.sql","mode":"100644","blob":"35d470834b4cd1f52711ebd7f5551cc86c69ca33","bytes":307461,"sha256":"0d50a857aebf838c072ee7ccfc846fecd9744f9bb093eb6943b0484eee99c777","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"}),
  Object.freeze({"file":"supabase/migrations/20261104004400_scalar597_later_h0_original594_bound_successor.sql","mode":"100644","blob":"5b35e66c2a368af48249446870b49bb9e6da1065","bytes":360291,"sha256":"bc8735d450ed547d2c0116704a319ab8854a47e34bac86974541050260e2174e","sourceHead":"803f2c7c61237cef5c5f6b39ce0eaac5e090fb84"})
]);
const FROZEN597_ADDITIONAL_SOURCE_FILES=Object.freeze(["scripts/check-last-mile-enclosure-predecessor-source.mjs","scripts/check-native-identity-frozen-i71-source.mjs","scripts/fixtures/installed593-code-predecessor.json","scripts/lib/account-statistics-assistant-postgres.mjs","scripts/lib/checkpoint-cas-native-postgres.mjs","scripts/lib/established-native-current-origin-source-target-inventory.json","scripts/lib/last-mile-enclosure-postgres.mjs","scripts/lib/last-mile-enclosure-predecessor-source-inventory.json","scripts/lib/native-identity-checkpoint-postgres.mjs","scripts/lib/native-original-continuity-postgres.mjs","scripts/lib/statistics-preference-revision-native-postgres.mjs","scripts/native-sampling-identity-successor-readiness.mjs","scripts/run-frozen-current-memory-warmup-source-targets.mjs","scripts/run-frozen-established-native-current-origin-source-targets.mjs","scripts/run-frozen-native0600-source-targets.mjs","scripts/run-frozen584-checkpoint-postgres-source.mjs","scripts/run-frozen585-native-continuity-postgres-source.mjs","scripts/test-protected-ravscore-continuation-checkpoint.mjs","supabase/migrations/20260730_handbook_reviews.sql","supabase/migrations/20260802_handbook_review_cleanup_policy.sql","supabase/migrations/20260815_private_visitor_statistics.sql","supabase/migrations/20260820_observation_remote_privacy.sql","supabase/migrations/20260821_trip_evidence_contract.sql","supabase/migrations/20260823_account_trip_log_contract.sql","supabase/migrations/20260823_observation_upload_contract.sql","supabase/migrations/20260826_security_hardening.sql","supabase/migrations/20260829010000_ravscore_operational_documents_no_history.sql","supabase/migrations/20260829020000_integrated_trip_calibration_binding.sql","supabase/migrations/20260829_candidate_g_reconstructed_trip_exclusion.sql","supabase/migrations/20260901010000_integrated_trip_measured_warmup_admission.sql","supabase/migrations/20260903010000_ravscore_checkpoint_metadata_cas.sql","supabase/migrations/20260904140000_harmonie_wind_reference_binding.sql","supabase/migrations/20260905090000_open_meteo_current_fallback_binding.sql","supabase/migrations/20260906162332_per_pair_weather_fallback_binding.sql","supabase/migrations/20260907084343_horizon_valid_weather_binding.sql","supabase/migrations/20260909194000_wam_same_run_resolution_binding.sql","supabase/migrations/20260912122607_measured_rollback_warmup_binding.sql","supabase/migrations/20260912141641_state_only_hold_closure_v2_binding.sql","supabase/migrations/20260912194206_local_unavailable_cutover_binding.sql","supabase/migrations/20260913010000_public_runtime_oracle_binding.sql","supabase/migrations/20260914010000_h0_reference_recovery_binding.sql","supabase/migrations/20260914020000_h0_state_snapshot_binding.sql","supabase/migrations/20260914234500_post_cutover_current_hold_binding.sql","supabase/migrations/20260915020000_private_runtime_storage_deny.sql","supabase/migrations/20260916120000_valid_data_before_local_missing_binding.sql","supabase/migrations/20260917001500_partial_zone_public_metadata_binding.sql","supabase/migrations/20260918125600_last_mile_history_envelope_binding.sql","supabase/migrations/20260918190000_weather_input_resolution_binding.sql","supabase/migrations/20260919010000_current_input_foundation_binding.sql","supabase/migrations/20260919020000_measured_warmup_checkpoint.sql","supabase/migrations/20260919231000_public_hour_delivery_binding.sql","supabase/migrations/20260920220000_public_hour_pack_capacity_binding.sql","supabase/migrations/20260922100000_integrated_trip_binding_repair.sql","supabase/migrations/20260922170000_integrated_model_binding_successor.sql","supabase/migrations/20260923052100_integrated_current_projection_binding.sql","supabase/migrations/20260923091500_integrated_native_hold_continuation_binding.sql","supabase/migrations/20260923100000_integrated_checkpoint_part_identity_binding.sql","supabase/migrations/20260923110000_integrated_checkpoint_warmup_status_binding.sql","supabase/migrations/20260923120000_integrated_checkpoint_missing_state_binding.sql","supabase/migrations/20260923130000_checkpoint_rejection_diagnostic.sql","supabase/migrations/20260923140000_checkpoint_native_hold_null_evidence.sql","supabase/migrations/20260923150000_checkpoint_candidate_diagnostic_correction.sql","supabase/migrations/20260923160000_checkpoint_candidate_companion_id.sql","supabase/migrations/20260923210000_checkpoint_cas_bounded_timeout.sql","supabase/migrations/20260925150000_weather_selection_model_binding.sql","supabase/migrations/20260926170000_exact_checkpoint_predecessor.sql","supabase/migrations/20260928112500_checkpoint_cas_bounded_timeout_55s.sql","supabase/migrations/20261002080000_top20_display_binding.sql","supabase/migrations/20261002094500_restore_checkpoint_cas_timeout.sql","supabase/migrations/20261003080000_copernicus_child_close_binding.sql","supabase/migrations/20261004190000_owner_current_source_domain_binding.sql","supabase/migrations/20261005000000_owner_water_level_only_binding.sql"]);

function fixedNativeSource(profile){
  assert(profile===FROZEN586||profile===FROZEN587||profile===FROZEN588||profile===FROZEN590||profile===FROZEN591||profile===FROZEN593||profile===FROZEN594||profile===FROZEN597,'FROZEN_NATIVE_UNKNOWN_PROFILE');
  const HEAD=profile.head,TREE=profile.tree;
  // Only597 separates unchanged genuine CODE from its later corrected native adapter.
  const nativeRef=file=>profile===FROZEN597&&file===profile.adapter?profile.nativeHead:HEAD;
const ADAPTER=profile.adapter,FACTORY='scripts/test-protected-ravscore-continuation-checkpoint.mjs';
// TEST-only extension of the fixed genuine DATA producer host plus its exact native adapter.
// The native factory is separately whole-source/factory-hash bound. Every byte is
// genuine issued predecessor source; no NEXT producer/model input is changed.
const TEST_CLOSURE=Object.freeze([
  Object.freeze({file:ADAPTER,bytes:profile.adapterBytes,sha256:profile.adapterSha256}),
  Object.freeze({file:'scripts/lib/current-memory-warmup-postgres.mjs',bytes:21181,sha256:'2e1498b7603a6625d415a1aed8c042c73d747ddd408f4222bdb0e3aa6046e091'}),
  Object.freeze({file:'scripts/check-current-memory-warmup-predecessor-source.mjs',bytes:10404,sha256:'a201e4afb0da382623004d7717ca867d9a9b881ff107e7a30dd052a5b2a68989'}),
  // Native597's real scalar callback imports the genuine historical PG wrapper.
  // Only this test host adds its complete eager companion closure from CODE803f;
  // the corrected adapter remains the sole leaf read from native97d.
  ...(profile===FROZEN597?[
    Object.freeze({file:'scripts/run-frozen586-assistant-later-h0-postgres-source.mjs',bytes:16249,sha256:'0459a227114aaeaa830cd95afe3c5f2e06baa1b968eabfdd354ef52b3c794d63'}),
    Object.freeze({file:'scripts/check-installed593-code-predecessor-source.mjs',bytes:6929,sha256:'b53be91b486ff6fd5a1d0048f85e75ac2777ebf11756c6a2dc30be436361142b'}),
    ...FROZEN597_NATIVE_READSET.filter(row=>FROZEN597_ADDITIONAL_SOURCE_FILES.includes(row.file)),
  ]:[]),
]);
const FAILURE_PHASES=new Set(['TEST_CLOSURE','ADAPTER_IMPORT','FACTORY_IMPORT','NATIVE_CALLBACK','CLEANUP']);
const FAILURE_CODES=new Set(['ERR_MODULE_NOT_FOUND','ENOENT','EACCES','EPERM','ERR_ASSERTION']);
function firstFailureDiagnostic(phase,error){
  // Best-effort observation is never authority and must not replace a raw
  // failure or prevent the real guarded cleanup, even for throwing getters.
  try{
    assert(FAILURE_PHASES.has(phase));
    console.error(JSON.stringify({kind:profile.failureKind,phase,
      code:FAILURE_CODES.has(error?.code)?error.code:'UNKNOWN',privatePayloadIncluded:false}));
  }catch{}
}
const execute=promisify(callbackExec),sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const environment=()=>Object.fromEntries(['PATH','Path','SystemRoot','WINDIR','TEMP','TMP','LANG','LC_ALL']
  .filter(key=>typeof process.env[key]==='string').map(key=>[key,process.env[key]]));
const git=async(args,encoding=null)=>(await execute('git',['-C',ROOT,...args],{encoding,timeout:30000,maxBuffer:2*1024*1024,
  env:{...environment(),GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_TERMINAL_PROMPT:'0',
    GIT_CONFIG_COUNT:'1',GIT_CONFIG_KEY_0:'protocol.allow',GIT_CONFIG_VALUE_0:'never'}})).stdout;
const identity=stat=>{assert(stat.isFile()&&!stat.isSymbolicLink()&&stat.nlink===1n&&stat.ino>0n);
  return [stat.dev,stat.ino,stat.birthtimeNs,stat.size];};
async function noLinks(file){let at=path.parse(file).root;for(const piece of path.relative(at,file).split(path.sep).filter(Boolean)){
  at=path.join(at,piece);assert(!(await fs.lstat(at)).isSymbolicLink());}}
// These checks are confined to the fixed597 TEST host. Old source profiles keep their original path.
async function committed597Readset(){
  assert.equal(profile,FROZEN597);assert.equal(FROZEN597_NATIVE_READSET.length,229);
  const parse=raw=>{const map=new Map();for(const row of raw.toString('utf8').split('\0').filter(Boolean)){
    const match=/^(\d{6}) (blob|commit) ([a-f0-9]{40})\t([\s\S]+)$/.exec(row);assert(match);
    assert(!map.has(match[4]));map.set(match[4],{mode:match[1],type:match[2],blob:match[3]});}return map;};
  const code=parse(await git(['ls-tree','-rz','--full-tree',HEAD]));
  const native=parse(await git(['ls-tree','-z',profile.nativeHead,'--',ADAPTER]));assert.equal(native.size,1);
  for(const row of FROZEN597_NATIVE_READSET){
    assert.equal(row.sourceHead,row.file===ADAPTER?profile.nativeHead:HEAD);
    assert.equal(row.mode,'100644');assert.deepEqual((row.file===ADAPTER?native:code).get(row.file),
      {mode:row.mode,type:'blob',blob:row.blob},'FROZEN597_NATIVE_COMMITTED_SOURCE');
  }
  const wanted=FROZEN597_NATIVE_READSET.filter(row=>row.file.startsWith('supabase/migrations/')).map(row=>row.file).sort();
  assert.equal(wanted.length,73);
  assert.deepEqual([...code.keys()].filter(file=>file.startsWith('supabase/migrations/')).sort(),wanted,'FROZEN597_NATIVE_COMPLETE_ARCHIVE');
}
async function verify597PhysicalReadset(sourceRoot,prior=null){
  assert.equal(profile,FROZEN597);
  const sqlNames=FROZEN597_NATIVE_READSET.filter(row=>row.file.startsWith('supabase/migrations/'))
    .map(row=>path.posix.basename(row.file)).sort();assert.equal(sqlNames.length,73);
  await noLinks(path.join(sourceRoot,'supabase/migrations'));
  assert.deepEqual((await fs.readdir(path.join(sourceRoot,'supabase/migrations'))).sort(),sqlNames,'FROZEN597_NATIVE_COMPLETE_ARCHIVE');
  const observed=new Map(),buffer=Buffer.alloc(65536);
  const state=stat=>[...identity(stat),stat.mode,stat.mtimeNs,stat.ctimeNs];
  for(const row of FROZEN597_NATIVE_READSET){
    const target=path.join(sourceRoot,row.file);await noLinks(target);
    const before=await fs.lstat(target,{bigint:true}),initial=state(before);
    assert.equal(before.size,BigInt(row.bytes),'FROZEN597_NATIVE_SOURCE_SIZE');
    assert.equal(before.mode&0o111n,0n,'FROZEN597_NATIVE_SOURCE_MODE');
    assert(row.bytes>=0&&row.bytes<=2*1024*1024);
    const handle=await fs.open(target,'r');
    try{
      assert.deepEqual(state(await handle.stat({bigint:true})),initial,'FROZEN597_NATIVE_SOURCE_DESCRIPTOR');
      const digest=crypto.createHash('sha256');let offset=0;
      while(offset<row.bytes){const read=await handle.read(buffer,0,Math.min(buffer.length,row.bytes-offset),offset);
        assert(read.bytesRead>0);digest.update(buffer.subarray(0,read.bytesRead));offset+=read.bytesRead;}
      assert.equal((await handle.read(buffer,0,1,row.bytes)).bytesRead,0,'FROZEN597_NATIVE_SOURCE_SIZE');
      assert.equal(digest.digest('hex'),row.sha256,'FROZEN597_NATIVE_SOURCE_SHA256');
      assert.deepEqual(state(await handle.stat({bigint:true})),initial,'FROZEN597_NATIVE_SOURCE_DESCRIPTOR');
    }finally{await handle.close();}
    await noLinks(target);assert.deepEqual(state(await fs.lstat(target,{bigint:true})),initial,'FROZEN597_NATIVE_SOURCE_IDENTITY');
    if(prior)assert.deepEqual(initial,prior.get(row.file),'FROZEN597_NATIVE_SOURCE_IDENTITY');observed.set(row.file,initial);
  }
  assert.deepEqual((await fs.readdir(path.join(sourceRoot,'supabase/migrations'))).sort(),sqlNames,'FROZEN597_NATIVE_COMPLETE_ARCHIVE');
  return observed;
}
async function frozenFactory(sourceRoot,source){
  assert.equal(sha(source),profile.factorySourceSha256);
  const slice=(a,b)=>{assert.equal(source.split(a).length,2);assert.equal(source.split(b).length,2);
    assert(source.indexOf(a)<source.indexOf(b));return source.slice(source.indexOf(a),source.indexOf(b));};
  const factory=slice('const PART_COUNT =','const safeShape =')+slice('const samples =','const sourceDocument =');
  assert.equal(sha(factory),'832098498476efe1b119472f16fe6e254496640b2e7ad5bf23d5518088926ed2');
  const imports=[['buildIntegratedRavScoreStateSeries','js/core/ravscore-integrated-state-pipeline.js'],
    ['buildCandidateGDerivedStateSeries','js/core/ravscore-candidate-g-state-pipeline.js'],
    ['ravScoreModelBinding','js/core/ravscore-model-contract.js'],
    ['ravScoreModelBinding as candidateGRollbackModelBinding','scripts/rollback-assets/ravscore-model-contract.js'],
    ['candidateGStateKey','scripts/lib/coastal-point-staging-contract.mjs'],
    ['CANDIDATE_G_OPERATIONAL_ROLLBACK_ID','scripts/lib/ravscore-candidate-g-rollback-runtime.mjs'],
    ['RAVSCORE_CONTINUATION_CHECKPOINT_POLICY,saveRavScoreContinuationCheckpoint','scripts/ravscore-continuation-checkpoint.mjs'],
    ['ravScoreContinuationImplementationSha256','scripts/lib/ravscore-continuation-implementation-contract.mjs'],
    ['privateRuntimeContractHashes','scripts/private-production-runtime-workflow.mjs']];
  const sourceText="import crypto from 'node:crypto';\n"+imports.map(([names,file])=>
    'import { '+names+' } from '+JSON.stringify(pathToFileURL(path.join(sourceRoot,file)).href)+';').join('\n')+'\n'+factory
    +'\nexport {sourceDocumentAt,atHour,saveRavScoreContinuationCheckpoint,ravScoreModelBinding,candidateGRollbackModelBinding,CURRENT_CONTINUATION_IMPLEMENTATION_SHA256,privateRuntimeContractHashes};';
  const loaded=await import('data:text/javascript;base64,'+Buffer.from(sourceText).toString('base64'));
  assert.equal(loaded.ravScoreModelBinding().modelBundleSha256,profile.integrated);
  assert.equal(loaded.candidateGRollbackModelBinding().modelBundleSha256,profile.candidate);
  assert.equal(loaded.CURRENT_CONTINUATION_IMPLEMENTATION_SHA256,profile.continuation);
  return Object.freeze({...loaded,sourceHead:HEAD,sourceTree:TREE});
}
async function withSource(callback){
  profile.requireOutput(); // UNISSUED NEXT stops before Git, filesystem, factory or callback.
  if(profile===FROZEN591)assertFrozen591CodeSourceSelected();
  if(profile===FROZEN590)assertFrozen590CodeSourceSelected();
  if(profile===FROZEN588)assertFrozen588CodeSourceSelected();
  assert.equal(arguments.length,1);assert.equal(typeof callback,'function');
  assert.equal(String(await git(['rev-parse',HEAD+'^{tree}'],'utf8')).trim(),TREE);
  if(profile===FROZEN597)assert.equal(String(await git(['rev-parse',profile.nativeHead+'^{tree}'],'utf8')).trim(),profile.nativeTree);
  if(profile===FROZEN597)await committed597Readset();
  else for(const file of [...TEST_CLOSURE.map(row=>row.file),FACTORY])
    assert.match(String(await git(['ls-tree',nativeRef(file),'--',file],'utf8')),/^100(?:644|755) blob [a-f0-9]{40}\t/);
  const loadLeaf=async row=>{
    const raw=Buffer.from(await git(['cat-file','blob',nativeRef(row.file)+':'+row.file]));
    assert.equal(raw.length,row.bytes);assert.equal(sha(raw),row.sha256);return{...row,raw};
  };
  let leaves;
  if(profile===FROZEN597){leaves=[];for(const row of TEST_CLOSURE)leaves.push(await loadLeaf(row));}
  else leaves=await Promise.all(TEST_CLOSURE.map(loadLeaf));
  const factorySource=String(await git(['cat-file','blob',HEAD+':'+FACTORY],'utf8'));
  return profile.withSource(async sourceRoot=>{
    const staged=[];let result,first,hasFirst=false,sourceState=null,phase='TEST_CLOSURE';
    try{
      for(const row of leaves){
        const target=path.join(sourceRoot,row.file);await noLinks(path.dirname(target));
        const present=await fs.lstat(target,{bigint:true}).catch(error=>{if(error.code==='ENOENT')return null;throw error;});
        const record={target,raw:row.raw,owned:null};
        if(present){identity(present);assert.deepEqual(await fs.readFile(target),row.raw);staged.push(record);}
        else{
          await fs.writeFile(target,row.raw,{flag:'wx',mode:0o600});staged.push(record);
          record.owned=identity(await fs.lstat(target,{bigint:true}));
        }
      }
      if(profile===FROZEN597)sourceState=await verify597PhysicalReadset(sourceRoot);
      phase='ADAPTER_IMPORT';const adapter=await import(pathToFileURL(path.join(sourceRoot,ADAPTER)).href);
      phase='FACTORY_IMPORT';const factory=await frozenFactory(sourceRoot,factorySource);
      phase='NATIVE_CALLBACK';
      let originalProfile;
      if(profile===FROZEN594||profile===FROZEN597){
        const raw=Buffer.from(await git(['cat-file','blob',HEAD+':data/admin/ravscore-profile-selection.json']));
        assert.equal(raw.length,1633);
        assert.equal(sha(raw),profile===FROZEN597?'6d6a8e26d41d4c0a5898ae05b4fbf99d3ea8c523abdee39ff63bb8260f07761a'
          :'0df36f6047901873418226c2107adf625fcd11eedde9cb548f11d4710f2357c4');
        originalProfile=JSON.parse(raw);
      }
      result=await callback({adapter,factory,repositoryRoot:sourceRoot,...(originalProfile?{originalProfile}:{}),
        ...(profile===FROZEN597?{nativeSourceHead:profile.nativeHead,nativeSourceTree:profile.nativeTree}:{})});
    }catch(error){first=error;hasFirst=true;firstFailureDiagnostic(phase,error);}
    try{
      if(profile===FROZEN597&&sourceState)await verify597PhysicalReadset(sourceRoot,sourceState);
      for(const{target,raw,owned}of [...staged].reverse()){
        await noLinks(target);assert.deepEqual(await fs.readFile(target),raw);
        if(owned){assert.deepEqual(identity(await fs.lstat(target,{bigint:true})),owned);await fs.unlink(target);}
      }
    }catch(error){firstFailureDiagnostic('CLEANUP',error);if(!hasFirst){first=error;hasFirst=true;}}
    if(hasFirst)throw first;return result;
  });
}

  return withSource;
}
const FROZEN586=Object.freeze({
  head:'7df56f36f705db641b3f9476ee8ca1b4c4cfed0c',tree:'57192d6d5cfbd8709f3558ad8afaaf10dd6cafe0',
  adapter:'scripts/lib/native-original-continuity-postgres.mjs',adapterBytes:24209,
  adapterSha256:'6690b4abd7f75c8011f4646c60236a0f88ab2563477b2dce76bcdadbaa0c27b6',
  factorySourceSha256:'8111a107b16ffdf6fdc9b2b5d50be837b18105da0b1f9e2aec4988b345640bce',
  candidate:'eb042ae79b64df21537421283a0d62d39af22c2d1a38707e530970af6bc7c8dd',
  integrated:'6d8f7cca203b5f7ee5155f3c0cdb39403a02fd0eb30fecaca5070ef9f814a805',
  continuation:'d2d93920aacc4be877da22c7b9e31e21426e647227a2c5018ee14b3a267500c7',
  withSource:withAuthenticated586PredecessorSource,requireOutput:requireAssistantLaterH0Output,
  failureKind:'FROZEN586_NATIVE_FIRST_FAILURE'});
const FROZEN587=Object.freeze({
  head:'aab72babd27175a4276c2a2f1965c74bb021b4af',tree:'959f63d40c3980e804caa750da227cbd96e34a49',
  adapter:'scripts/lib/assistant-later-h0-postgres.mjs',adapterBytes:22564,
  adapterSha256:'51f12b62222bd998362186456323685ee52f26d3b6af38823428850acb4c20da',
  factorySourceSha256:'e87ee5406f02681e6c5a6848ed8481e11168088d0799f7b399bfe7715edf17b0',
  candidate:'5c0b6a2c6ceb4ba9c5f224cb5d3fda693f300a8902da3f7561167f72cbab78b4',
  integrated:'5584d8e59f8d21785fd08b32f9beb22cf879cdb4892a11ede24eb862d9a0dca2',
  continuation:'cd3a3648ad5093662871559aa39d77671eda27edf1f9edc82a104c5430a43a21',
  withSource:withAuthenticated587PredecessorSource,requireOutput:requireAssistantPublic587SuccessorOutput,
  failureKind:'FROZEN587_NATIVE_FIRST_FAILURE'});
// Ægte588 adapter/factory i separat kildekontekst; ingen child-retagging.
const FROZEN588=Object.freeze({
  head:FROZEN588_CODE_SOURCE_PROVENANCE.head,tree:FROZEN588_CODE_SOURCE_PROVENANCE.tree,
  adapter:'scripts/lib/assistant-later-h0-postgres.mjs',adapterBytes:25199,
  adapterSha256:'c8bafe6b5fe7ebed8d46eb24a4ccf778d2382f05cb0737bf7eb2335acf0281b0',
  factorySourceSha256:'3c702f489f632eada501d978502015e9b2f307867c9f3697c1707ddd2f3da4c0',
  candidate:'00905533cd243ffce8e507beedbc39c8dba26e635b59fa154e6f9ab20575780c',
  integrated:'5348f3ae7401d3a09dd180d45690f56b3cfec4a30af5a4928bdd9581f9d8ebac',
  continuation:'d98559d56d7bfe9b141cf1ddab73cddffb688a3b6766f5f9f3779b226f573701',
  withSource:withAuthenticated588PredecessorSource,requireOutput:requireAssistantPublic588SuccessorOutput,
  failureKind:'FROZEN588_NATIVE_FIRST_FAILURE'});
// Whole actual590 adapter/factory pins must come from the chosen genuine parent.
const FROZEN590=Object.freeze({
  head:FROZEN590_CODE_SOURCE_PROVENANCE.head,tree:FROZEN590_CODE_SOURCE_PROVENANCE.tree,
  adapter:'scripts/lib/assistant-later-h0-postgres.mjs',adapterBytes:26650,adapterSha256:'2f0b4fccd95b0109904e62490fffaeebf8bef78d47817c3fb22bb860a30fd41d',factorySourceSha256:'16d3eaaa236b352a345a9b599c2e297fedc022a24aec91f2eb1ef9e3e47b8124',
  candidate:'bca59cb435cb3f35041c665d2954f0ef04b189b572219771fc5628e4f7ccb551',
  integrated:'4c94c24e7d14d66c20cc3c2c3d0389cadb0c3e9e76fcfe692943c6087df56819',
  continuation:'d444e6141038f56dd04b97a55eefe07bbd98f122fb3b76a43bdddacff2d88c8a',
  withSource:withAuthenticated590PredecessorSource,requireOutput:requireAssistantPublic590SuccessorOutput,
  failureKind:'FROZEN590_NATIVE_FIRST_FAILURE'});
// Genuine issued591 PG adapter/factory; the new592 phase remains a separate normal caller.
const FROZEN591=Object.freeze({
  head:FROZEN591_CODE_SOURCE_PROVENANCE.head,tree:FROZEN591_CODE_SOURCE_PROVENANCE.tree,
  adapter:'scripts/lib/assistant-later-h0-postgres.mjs',adapterBytes:28147,
  adapterSha256:'4c1ab023207c1a2c2f3962df262330fed265c5d8353b5e514a9e673ca2fe3ce6',
  factorySourceSha256:'38154b4dc8ee862c905d0627dc0687bc981ac701a82b23a9e3f8de39dec131a4',
  candidate:'38738b7d7d3bfd74958ab2453422f2416338e99dac53d12f7098ad8c3539ec64',
  integrated:'ebd5ac3dac09b7afb51e46d18920f6932b478b7ef15bdd31190c128273cb6a54',
  continuation:'b490f11d14cfe607839d7848bbcdb8e9df7abdfe62c82983e5247fb4ca3dcc0d',
  withSource:withAuthenticated591PredecessorSource,requireOutput:requireAssistantPublic591SuccessorOutput,
  failureKind:'FROZEN591_NATIVE_FIRST_FAILURE'});
// Exact installed 594 source for the test-only native parent fixtures.
const FROZEN594=Object.freeze({
  head:SOURCE594_CODE_SOURCE_PROVENANCE.head,tree:SOURCE594_CODE_SOURCE_PROVENANCE.tree,
  adapter:'scripts/lib/assistant-later-h0-postgres.mjs',adapterBytes:31841,
  adapterSha256:'fdeca9eee1e34abb31849abfe1e5937f491c6eeb7910776f8823a256ed726172',
  factorySourceSha256:'4fd8e91b81159957c2ce84ef67e3e6bd4b651885ac88eb0705b87264d6f58b29',
  candidate:SCALAR597_LATER_H0_BEFORE.C,integrated:SCALAR597_LATER_H0_BEFORE.I,
  continuation:SCALAR597_LATER_H0_BEFORE.T,
  withSource:withSource594CodeParent,requireOutput:requireScalar597LaterH0Output,
  failureKind:'FROZEN594_NATIVE_FIRST_FAILURE',
});
// Test-only boundary for the still-unissued after597 successor. Genuine597
// model CODE remains803f; only the corrected PG adapter is taken byte-exactly
// from97. Neither identifier is production/original admission or a PG receipt.
export const FROZEN597_NATIVE_SOURCE=Object.freeze({
  codeHead:SOURCE597_CODE_SOURCE_PROVENANCE.head,codeTree:SOURCE597_CODE_SOURCE_PROVENANCE.tree,
  nativeHead:'97d189e4a99fdab1b2764db1bfe59f96e92c3f02',nativeTree:'b804a9d766e1828cfed6ef6927ddf6582d2dc326',
  adapterBytes:44475,adapterSha256:'4798450acb08f9078377424f7de12a9b9e7317eb703754024a6b16b4e37bc963',
  factorySourceSha256:'7e953c0fb1ef424d40a85396bafe506076ab642229a735800a34376b0f2f7960',
  candidate:ASSISTANT_AFTER597_BEFORE.C,integrated:ASSISTANT_AFTER597_BEFORE.I,
  continuation:ASSISTANT_AFTER597_BEFORE.T,
});
const FROZEN597=Object.freeze({
  head:FROZEN597_NATIVE_SOURCE.codeHead,tree:FROZEN597_NATIVE_SOURCE.codeTree,
  nativeHead:FROZEN597_NATIVE_SOURCE.nativeHead,nativeTree:FROZEN597_NATIVE_SOURCE.nativeTree,
  adapter:'scripts/lib/assistant-later-h0-postgres.mjs',
  adapterBytes:FROZEN597_NATIVE_SOURCE.adapterBytes,adapterSha256:FROZEN597_NATIVE_SOURCE.adapterSha256,
  factorySourceSha256:FROZEN597_NATIVE_SOURCE.factorySourceSha256,
  candidate:FROZEN597_NATIVE_SOURCE.candidate,integrated:FROZEN597_NATIVE_SOURCE.integrated,
  continuation:FROZEN597_NATIVE_SOURCE.continuation,
  withSource:withSource597CodeParent,requireOutput:requireAssistantAfter597Output,
  failureKind:'FROZEN597_NATIVE_FIRST_FAILURE',
});
const native586=fixedNativeSource(FROZEN586),native587=fixedNativeSource(FROZEN587),native588=fixedNativeSource(FROZEN588);
export async function withFrozen586CheckpointPostgresSource(callback){
  return native586(...arguments);
}
export async function withFrozen587CheckpointPostgresSource(callback){
  return native587(...arguments);
}

export async function withFrozen588CheckpointPostgresSource(callback){
  return native588(...arguments);
}

const native590=fixedNativeSource(FROZEN590);
export async function withFrozen590CheckpointPostgresSource(callback){
  return native590(...arguments);
}

const native591=fixedNativeSource(FROZEN591);
export async function withFrozen591CheckpointPostgresSource(callback){
  return native591(...arguments);
}

// Genuine installed593 code executes its own complete native phase before594.
// Its synthetic native fixtures are never production B/S or origin authority.
const FROZEN593=Object.freeze({
  head:FROZEN593_NATIVE_CODE.head,tree:FROZEN593_NATIVE_CODE.tree,
  adapter:'scripts/lib/assistant-later-h0-postgres.mjs',adapterBytes:29689,
  adapterSha256:'f0db482f36685c2c05c34fd53ff6b55e683d5c9fa71a86bd4e81e8395f4b22eb',
  factorySourceSha256:'59aa19878b924401001120ca5ddccf9433399445a7ccdac37816c88c44d5fa33',
  candidate:'12f78005304316a680716a1d437e06a582815c1645a2eb567028bcc18ff99ffa',
  integrated:'69bf81c3cc5e256deee2c116a52462597f4cfc47cb6c855c6dba969c1dcf4643',
  continuation:'e894dd096d03f71cc334d97f85931c2b3969e9b140cb5403a4787cf4b81fbc2e',
  withSource:withInstalled593CodePredecessorSource,requireOutput:requireInstalled593Original591Output,
  failureKind:'FROZEN593_NATIVE_FIRST_FAILURE'});
const native593=fixedNativeSource(FROZEN593);
export async function withFrozen593CheckpointPostgresSource(callback){
  return native593(...arguments);
}

const native594=fixedNativeSource(FROZEN594);
export async function withFrozen594CheckpointPostgresSource(callback){
  return native594(...arguments);
}

const native597=fixedNativeSource(FROZEN597);
export async function withFrozen597CheckpointPostgresSource(callback){
  return native597(...arguments);
}
