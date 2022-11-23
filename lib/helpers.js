import { noise } from '@chainsafe/libp2p-noise'
import { mplex } from '@libp2p/mplex'
import { tcp } from '@libp2p/tcp'
export { createLibp2p as createNode } from 'libp2p'

export const ServerStateFile = '.l1-state'

/** @type {Libp2pOptions} */
export const defaultNodeConfig = {
  transports: [tcp()],
  connectionEncryption: [noise()],
  streamMuxers: [mplex()],
}
