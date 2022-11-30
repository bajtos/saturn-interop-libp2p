import { noise } from '@chainsafe/libp2p-noise'
import { mplex } from '@libp2p/mplex'
import { tcp } from '@libp2p/tcp'
// import { plaintext } from 'libp2p/insecure'

export { createLibp2p as createNode } from 'libp2p'

/** @type {import('libp2p').Libp2pOptions} */
export const defaultNodeConfig = {
  transports: [tcp()],
  connectionEncryption: [noise()],
  // connectionEncryption: [plaintext()],
  streamMuxers: [mplex()],
}

/**
 * @param {Source<Uint8ArrayList>} source
 */
export async function readStreamToBuffer(source) {
  // FIXME: this is highly suboptimal. Use something like `bl` instead.
  // https://www.npmjs.com/package/bl
  const bytes = []
  for await (const c of source) bytes.push(...c.subarray())
  return Buffer.from(bytes)
}

export const SaturnProtocols = {
  GetContent: '/saturn:get-content/0.1.0',
}
