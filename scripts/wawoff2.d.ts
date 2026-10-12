// wawoff2 ships without types. The one function the share images use: a WOFF2
// font unpacked to the TrueType it was made from, which is what satori reads.
declare module 'wawoff2' {
  export function decompress(input: Uint8Array): Promise<Uint8Array>;
}
