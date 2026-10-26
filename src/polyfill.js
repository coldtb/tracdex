import { Buffer } from 'buffer';

if (typeof window !== 'undefined') {
  window.Buffer = Buffer;
  globalThis.Buffer = Buffer;
  window.global = window;
  if (!window.process) {
    window.process = { env: {} };
  }
}
