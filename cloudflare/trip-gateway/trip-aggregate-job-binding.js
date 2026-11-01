import { canonicalJson, sha256Hex } from '../../supabase/functions/_shared/trip-storage.js';
import { isExactCalibrationModelBinding } from '../../js/services/calibration-eligibility.js';

// Privat, uudstedt jobkontrakt. Kun den normale DB-læser kan udstede et job.
// Denne parser/opløsning giver ingen ret til at oprette, vælge eller frigive det.
export const LEGACY_JOB_BINDING_SOURCE = Object.freeze({
  file: 'supabase/migrations/20261022181403_assistant_later_h0_original_bound_successor.sql',
  bytes: 325470,
  sha256: 'b14ec45f920a86b9b055f4c30c716695fee767e25564249ac22ca448e1776fa7',
  branch: 'RAVSCORE_INTEGRATED_BINDING',
  tuples: 20,
});
// Alle ti felter kommer fra samme oprindelige SQL-case. Der kombineres ikke
// felter fra andre modeller. Hver hel tuple genmåles nedenfor mod sin digest.
const LEGACY_FIELDS = Object.freeze({
  "modelId": "RRS-COASTAL-PROCESS-INTEGRATED-1.1.0",
  "stateSchemaVersion": "6.0.0",
  "variantId": "COASTAL-SUPPLY-MOBILISATION-BOUNDED-WAVE-APPROACH-HUNTABILITY-2",
  "profileId": "cn-003-015-in10-out8-full24-cos48-gap3-wave4-48-historybounds12d-lastmileewma4-tail40-atten15-v5",
  "componentSchemaId": "ravscore-components-huntability-delivery-mobilisation-bounds-v5",
  "explanationSchemaId": "ravscore-explanation-integrated-bounds-v5",
  "rankingPolicyId": "direction-broad-19-history-tie-v2",
  "bestTimePolicyId": "score-history-water-tie-earliest-v3",
  "presentationPolicyId": "score-bands-35-55-75-exceptional90-v1",
  "modelContractSha256": "a226e7d10f5c9fa94e122c0e4e3dc1367f1d5e44e763593e4568ac8a3ed1b14b"
});
const LEGACY_ROWS = Object.freeze([
  [
    "70f45b3d485f6424d94e80483a98ce1492a9bf8bbb9d8e207f7483317988336f",
    "327b989b731e6e84bf05bdb6bd54707d47c04d5bdf80038d437332e84a4c8e01"
  ],
  [
    "294ffec91d1635970557327b98f5fc2de863ef325bb0a7839d36b76018b1a225",
    "14f3f0c9b1d91df0d23f94e1d56852a34f8d6a232e23da74590921be8f058904"
  ],
  [
    "2f66e89b7e95cbea28244ed2211ac2be9f422422feb1a3fd1d07d63bd33d5082",
    "dafee01903ccb643b59572539104f879d99903bd622be8997cb20d1cc25d729d"
  ],
  [
    "34c81b4c7b879542de60d60ea7a5ae40880eafb27a39d6779789b70f35b8d6fe",
    "2c26b855fc0e93754c5f0ba586f6d2a2864c6de17880717ab6cd6c8cbc3bcad7"
  ],
  [
    "76b6ef5483f7848075f499ab91f21d6130d74538a429cb3ba33ab5cf88ce65d1",
    "61ec54746fdf1ac58f3d7859d4d55a901fcc6376d0412acf2d6f4f418ae5c0a1"
  ],
  [
    "186902116824287b37f74fe5faa3a61555d52364c7f923b0ff7ae7def1cbe193",
    "c557f91a520ae64211f9441f25fc72a9c230691cdb7b48551ecb7286463420eb"
  ],
  [
    "819b3f7cfdf2727a93593af966aeb9abc8a6fd140b8a6ed47c05eae2e6aa8414",
    "3a14f458122f5bc0ea8a60c07abbcbd68d022c0322a87e77242891f21631c852"
  ],
  [
    "5b1cb610490590b692ff116dc3d5142ca13cad61c894ed15aef223f4bd6904b7",
    "29ea9a19647bf7d5edad0eee159267086d546f0d90a9f2778a77077351aad948"
  ],
  [
    "16a85e6b20aa7b175cc174b0f4f4f31c7e8788f8f3d761d4d4b0bacb2fb01e66",
    "4ebe158f68954f32b47cb71d5222ab0cf676faaf4b323d743f9d43bf34a63a51"
  ],
  [
    "325836f42a7c674b619433fe0b619679983e9f82a2905163891746ff6613e598",
    "ffc67b30f6018791f46e169ff039be8fba4c6935ba218d83f38340b886d2b9eb"
  ],
  [
    "85ecd25bb34eaa1b03a0f9ad6b97e0b1b42fa1cc9e5162fdd8c0ac420cf3e049",
    "249c7720512216b10ebcbd8bb29329760170a5c610c7cdfb618c92fb74787932"
  ],
  [
    "27274d83d2583450cafe3647f72a18446c55a9f513b9e472a4e12a8b5d951913",
    "c1ac9b32d6bfb6bfeda81bc10566f6906d7046ef2b1481981b3470bda4a427f5"
  ],
  [
    "9184bfd8973d493314858f35ec667391de37b588f69c5b618093e5aa09754fe4",
    "994da006e4c91a1fc759d5ed58b74de80a9ccaad6753274d5abb0cb07eaed399"
  ],
  [
    "e1db66f52374daa0c187c55e66db662b4102336286a9e25dc4bc889034b755f8",
    "aa1e364bf6a0962725b6633fdc3487c6e626d51373302d7135023547a93c9855"
  ],
  [
    "e12ad66a9e19053836cf2707de77c7be1df1b1f84195cc9764955affc26d2fa9",
    "84217430a712fec3e78c5c3115d86520a4011a388998af030d231a8433d52bb3"
  ],
  [
    "bfec213bdc752b9a172635d09c691e2ae0a993e781485a19754ba303c3014559",
    "038d9b0cdc50d36dd10f207c6f33e909ddedbdacb28c89adbca12121cb2c7f5f"
  ],
  [
    "688b3598ff72f6c5a017935e8ea3a1372f8d49f6ed30b2c8d0d53b93d5e5b1ec",
    "bb0da11642d1aff76fc4f821114d923aa9897c41abd543df0fa6166290075947"
  ],
  [
    "1dae8cfebba4707415c019c4854fc161f9d90024b2caa3c77fed9def237b30bd",
    "31bbb9a98f4df93804a9d4bcdff50fe5e9b1c880e04492d2c596079488a6bfa2"
  ],
  [
    "e6d83dcb3832dddd1134aadcc9be8fbac780cc2f082734e4780f07a7bab21baa",
    "6d8f7cca203b5f7ee5155f3c0cdb39403a02fd0eb30fecaca5070ef9f814a805"
  ],
  [
    "2418e680a9d2ed6bf1f3398665137d6591881b09e7fc71f17ad5f46c895b571a",
    "5584d8e59f8d21785fd08b32f9beb22cf879cdb4892a11ede24eb862d9a0dca2"
  ]
].map(row => Object.freeze(row)));
const SHA = /^[a-f0-9]{64}$/;
const fail = () => { throw new Error('AGGREGATE_JOB_ORIGINAL_BINDING_INVALID'); };

export async function readAggregateJobOriginalBinding(serialized, digest) {
  if (typeof digest !== 'string' || !SHA.test(digest)) fail();
  let binding;
  if (serialized === null) {
    // Kun gamle 005-rækker uden tuple bruger dette endelige overgangskatalog.
    // Ukendt hash hverken ommærkes, slettes, omgås eller får ny privatlivskvote.
    const rows = LEGACY_ROWS.filter(row => row[0] === digest);
    if (rows.length !== 1) fail();
    binding = { ...LEGACY_FIELDS, modelBundleSha256: rows[0][1] };
  } else {
    // Nye job er selvbærende gennem senere modelopdateringer. Aktuel model og
    // overgangskataloget bruges ikke som genfortolkning af de gemte bytes.
    if (typeof serialized !== 'string' || serialized.length < 1
      || new TextEncoder().encode(serialized).length > 4096) fail();
    try { binding = JSON.parse(serialized); } catch { fail(); }
    if (!isExactCalibrationModelBinding(binding) || canonicalJson(binding) !== serialized) fail();
  }
  if (!isExactCalibrationModelBinding(binding)
    || await sha256Hex(canonicalJson(binding)) !== digest) fail();
  return Object.freeze({ ...binding });
}
