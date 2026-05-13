/**

 * Node globals for Passport / nested readable-stream + hash-base.

 * Top-level runs as soon as this module loads — before other `main.tsx` imports execute.

 */

import { Buffer } from "buffer";

import process from "process";



type WithNodeGlobals = typeof globalThis & {

  Buffer: typeof Buffer;

  process: typeof process;

};



const g = globalThis as WithNodeGlobals;

g.Buffer = Buffer;

g.process = process;



if (typeof window !== "undefined") {

  const w = window as Window & WithNodeGlobals;

  w.Buffer = Buffer;

  w.process = process;

}


