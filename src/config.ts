export interface TypstVersion {
  version: string;
  checksums: {
    "x86_64-unknown-linux-musl": string;
    "aarch64-unknown-linux-musl": string;
  };
}

export const TYPST_VERSIONS: TypstVersion[] = [
  {
    version: "0.15.1",
    checksums: {
      "x86_64-unknown-linux-musl":
        "a6d077d0a95eed5a2eba715b2dae06be954f624ccbf85758a03f389ded33118c",
      "aarch64-unknown-linux-musl":
        "5aa8d74a3d906e60ea12a66ac2f37f8eef1b14cbad7182a745e393a10c23dcee",
    },
  },
  {
    version: "0.15.0",
    checksums: {
      "x86_64-unknown-linux-musl":
        "59b207df01be2dab9f13e80f73d04d7ff8273ffd46b3dd1b9eef5c60f3eeabea",
      "aarch64-unknown-linux-musl":
        "cdf50ffc7b8ba759ed02200632eda3d78eb8b99aacb6611f4f75684990647620",
    },
  },
  {
    version: "0.14.2",
    checksums: {
      "x86_64-unknown-linux-musl":
        "a6044cbad2a954deb921167e257e120ac0a16b20339ec01121194ff9d394996d",
      "aarch64-unknown-linux-musl":
        "491b101aa40a3a7ea82a3f8a6232cabb4e6a7e233810082e5ac812d43fdcd47a",
    },
  },
  {
    version: "0.14.1",
    checksums: {
      "x86_64-unknown-linux-musl":
        "6ad7b794f71c781fec4a742fcdd105deac12b59e5e7a58db98ccae7f8408d141",
      "aarch64-unknown-linux-musl":
        "8da0a5978550ecf873c0d0c441e48a48eec351fac3b6f0c5460ca0547732a098",
    },
  },
  {
    version: "0.14.0",
    checksums: {
      "x86_64-unknown-linux-musl":
        "99816d2982de08d2b091bac56b59b2faa523a10e1378ad3cdd68e35b8eb74b3d",
      "aarch64-unknown-linux-musl":
        "3ad461772773256021ff38a0db3acf85f3ecdb00b93606a32f8c5ae043f6c62b",
    },
  },
  {
    version: "0.13.1",
    checksums: {
      "x86_64-unknown-linux-musl": "",
      "aarch64-unknown-linux-musl": "",
    },
  },
  {
    version: "0.13.0",
    checksums: {
      "x86_64-unknown-linux-musl": "",
      "aarch64-unknown-linux-musl": "",
    },
  },
  {
    version: "0.12.0",
    checksums: {
      "x86_64-unknown-linux-musl": "",
      "aarch64-unknown-linux-musl": "",
    },
  },
];

export const DEFAULT_VERSION = TYPST_VERSIONS[0].version;

export const BASE_DOWNLOAD_URL =
  "https://github.com/typst/typst/releases/download";
