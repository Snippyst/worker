export interface TypstVersion {
  version: string;
  checksums: {
    'x86_64-unknown-linux-musl': string;
    'aarch64-unknown-linux-musl': string;
  };
}

export const TYPST_VERSIONS: TypstVersion[] = [
  {
    version: '0.14.0',
    checksums: {
      'x86_64-unknown-linux-musl': '99816d2982de08d2b091bac56b59b2faa523a10e1378ad3cdd68e35b8eb74b3d',
      'aarch64-unknown-linux-musl': '3ad461772773256021ff38a0db3acf85f3ecdb00b93606a32f8c5ae043f6c62b',
    },
  },
  {
    version: '0.13.1',
    checksums: {
      'x86_64-unknown-linux-musl': '',
      'aarch64-unknown-linux-musl': '',
    },
  },
  {
    version: '0.13.0',
    checksums: {
      'x86_64-unknown-linux-musl': '',
      'aarch64-unknown-linux-musl': '',
    },
  },
  {
    version: '0.12.0',
    checksums: {
      'x86_64-unknown-linux-musl': '',
      'aarch64-unknown-linux-musl': '',
    },
  },
];

export const DEFAULT_VERSION = TYPST_VERSIONS[0].version;

export const BASE_DOWNLOAD_URL = 'https://github.com/typst/typst/releases/download';
