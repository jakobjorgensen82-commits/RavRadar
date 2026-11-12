// TEST ONLY. Exact private Source613 Pages composition; no production/admission authority.
// Current Source caller/action/CLI predicates are read as raw actual bytes separately.
// Before RAW614: rebind only after actual M2 and normal614 version sync; retain UA614
// in the synthetic historical shape so the unchanged Source859 normalizer/guards run.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const frames = {
  ".github/workflows/reusable-weather-build.yml": {
    "before": {
      "bytes": 389397,
      "sha256": "2bdce8a682b3d350f347953930f1a25a80ae60055b96abc8b1c3c1172e952a7e"
    },
    "after": {
      "bytes": 389477,
      "sha256": "b662c21649b69182d68573e73d2682dd8a2c604ae030fcdf7d577602206dddcb"
    },
    "inverse": [
      [
        325495,
        40,
        "94029cb8f71094002cd359d9bd77191a8ba34be1382b9b602dc31423781b51dc",
        ""
      ],
      [
        324647,
        40,
        "94029cb8f71094002cd359d9bd77191a8ba34be1382b9b602dc31423781b51dc",
        ""
      ]
    ]
  },
  ".github/workflows/reusable-pages-deploy.yml": {
    "before": {
      "bytes": 74403,
      "sha256": "a77c062113259c8efd04d4c7c73c4b1fbf825eea1d69770b5f14dc75c27d96c7"
    },
    "after": {
      "bytes": 75396,
      "sha256": "c02eab5261f101a62872a35efca2bdacaa1c04158943c0584f7d519522deab12"
    },
    "inverse": [
      [
        40784,
        130,
        "9a7597725a1a7aab080286af24457d738b9ecde41d0363b34829b6e494089230",
        ""
      ],
      [
        39569,
        722,
        "f7fe50d3338bffd557fb5eb77b23d13d329d8cbbe322c5bd2e2e38db44c2f833",
        ""
      ],
      [
        27033,
        203,
        "1c9261f4cadbcb20fddd370b8dc0377c61de7c4a60b2fb3ba24ca94d1b8ede3a",
        "            --deployment-id \"pages-$GITHUB_RUN_ID-$GITHUB_RUN_ATTEMPT\" \\\n"
      ],
      [
        26066,
        40,
        "94029cb8f71094002cd359d9bd77191a8ba34be1382b9b602dc31423781b51dc",
        ""
      ],
      [
        25407,
        40,
        "94029cb8f71094002cd359d9bd77191a8ba34be1382b9b602dc31423781b51dc",
        ""
      ],
      [
        195,
        0,
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        "        required: false\n        type: boolean\n        default: false\n"
      ]
    ]
  },
  ".github/workflows/reusable-operational-reentry.yml": {
    "before": {
      "bytes": 117556,
      "sha256": "a318adebbfff2779acd8923c54021171965975bf6889c7dffe6f7e8816300baa"
    },
    "after": {
      "bytes": 119369,
      "sha256": "f83c4c633e325f7cf9369bc0d7cc6dcae45bfaf3994ef75594802183acc87225"
    },
    "inverse": [
      [
        68060,
        537,
        "166cb6ee912bae5ac34790719dcaae111313de32374fc10590e989e0967fd8fd",
        ""
      ],
      [
        65324,
        124,
        "d47c310396e0c136e4aa62a00edb672c829866ef60064d6bc4f31221be8a6641",
        "          node scripts/ravscore-operational-pages-recovery.mjs --read-protected-prepared-target \\\n"
      ],
      [
        49351,
        196,
        "83e91335a337630baf18f4e87895ffcfc1fea842e38966f9d00a62433e89049b",
        "            test \"$recovery_action\" = PRE_ACTIVATION_RESUME\n"
      ],
      [
        49097,
        55,
        "995b363295d55f446bf09b59f957e5b6787d8cd0071dd1f0aea0d0dc75d7df18",
        ""
      ],
      [
        10825,
        211,
        "85afb81fe6dea985739ada47bb348296ba684788a7d9db11097d24ba43d75744",
        ""
      ],
      [
        9987,
        71,
        "0d206d46ca15049dfe773ea4b4bc925c3b2cc6419fe80879a3a364b0f7ec0bee",
        ""
      ],
      [
        9432,
        55,
        "995b363295d55f446bf09b59f957e5b6787d8cd0071dd1f0aea0d0dc75d7df18",
        ""
      ],
      [
        6534,
        722,
        "c052561358794eb1737d62b01379b9a7d4c625ef057bbde1633bcd3949e51ce0",
        ""
      ]
    ]
  },
  ".github/actions/deploy-ravradar-pages/action.yml": {
    "before": {
      "bytes": 1537,
      "sha256": "9e954ec600f629befc82a65c37fe21c90f4337b00abb43c9ce0d0cb462bfae20"
    },
    "after": {
      "bytes": 1834,
      "sha256": "cfa8db3446bb7a337bf8bbb48b296f338ce8b4793c63b2a36c23bcc4d042d347"
    },
    "inverse": [
      [
        1504,
        124,
        "084062686be03b42a25d401ca02ebb72df7f4178603122668be3a39f02ec737f",
        ""
      ],
      [
        1380,
        50,
        "23b123d4c861723b7adf97e5ce9dbac70451b6ad2752e9e69e7e1794420b6f26",
        "      # Midlertidigt inaktiv: den nye botrute har en uafklaret deployregression.\n      # Bevar koden, indtil rettelse og faktisk drift er verificeret.\n      if: ${{ false }}\n"
      ],
      [
        1100,
        50,
        "0e98e7305d0ab5c325a39fbbd98b358952567ff6530d22084a7b9c8f83d953ad",
        ""
      ],
      [
        366,
        261,
        "b01ea1b0e4dab63e68e0fbcbe6f0c0f56e635636330d4507fc94b74dd21effa7",
        ""
      ],
      [
        47,
        80,
        "fc724fd89b44c3584dc632636ebad1b56e93819e954dde82986bad7b07658e96",
        "description: Bruger den officielle Pages-rute; samme-job-genfors\u00f8g er midlertidigt inaktivt.\n"
      ]
    ]
  }
};
const aliases = Object.freeze({build:'.github/workflows/reusable-weather-build.yml',
  deploy:'.github/workflows/reusable-pages-deploy.yml',recovery:'.github/workflows/reusable-operational-reentry.yml',
  action:'.github/actions/deploy-ravradar-pages/action.yml'});
export function projectSourcePagesClosureHistoricalTestInput(source, relative) {
  const selected = typeof relative === 'string' && Object.hasOwn(aliases, relative) ? aliases[relative]
    : typeof relative === 'string' && relative.startsWith('../') && Object.hasOwn(frames, relative.slice(3)) ? relative.slice(3) : relative;
  const row = typeof selected === 'string' && Object.hasOwn(frames, selected) ? frames[selected] : null;
  if (!row || typeof source !== 'string' || Buffer.byteLength(source) !== row.after.bytes
    || sha(source) !== row.after.sha256) return source;
  let bytes = Buffer.from(source);
  for (const [offset, length, afterSha256, original] of row.inverse) {
    assert.equal(sha(bytes.subarray(offset, offset + length)), afterSha256, 'SOURCE_PAGES_CLOSURE_TEST_EXACT_HUNK');
    bytes = Buffer.concat([bytes.subarray(0, offset), Buffer.from(original), bytes.subarray(offset + length)]);
  }
  assert.equal(bytes.length, row.before.bytes, 'SOURCE_PAGES_CLOSURE_TEST_EXACT_BEFORE_SIZE');
  assert.equal(sha(bytes), row.before.sha256, 'SOURCE_PAGES_CLOSURE_TEST_EXACT_BEFORE_SHA');
  return bytes.toString('utf8');
}
