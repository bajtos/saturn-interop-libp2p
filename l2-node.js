import {
  defaultNodeConfig,
  createNode,
  readStreamToBuffer,
  SaturnProtocols,
} from './lib/helpers.js'
import { multiaddr } from '@multiformats/multiaddr'

const serverAddress =
  // '/ip4/127.0.0.1/tcp/3030/p2p/12D3KooWRH71QRJe5vrMp6zZXoH4K7z5MDSWwTXXPriG9dK8HQXk'
  '/dns/saturn-link-poc.fly.dev/tcp/3030/p2p/12D3KooWRH71QRJe5vrMp6zZXoH4K7z5MDSWwTXXPriG9dK8HQXk'

const l1node = multiaddr(serverAddress)

const node = await createNode({
  ...defaultNodeConfig,
  addresses: {
    // no address - we are not dialable
  },
})
await node.start()

console.log('My peerId:\n  %s', node.peerId)

// print out listening addresses
console.log('listening on addresses:')
node.getMultiaddrs().forEach((addr) => {
  console.log('  ', addr.toString())
})
if (node.getMultiaddrs().length < 1) {
  console.log('  (none)')
}

node.handle(SaturnProtocols.GetContent, async ({ stream, connection }) => {
  try {
    const req = JSON.parse(await readStreamToBuffer(stream.source))
    console.log('Received request:', req)

    const gwUrl = `https://ipfs.io/ipfs/${req.cid}`
    console.log('Fetching', gwUrl)
    const res = await fetch(gwUrl)
    console.log('GW response:', res.status)
    // TODO: handle errors

    await stream.sink(res.body)
  } catch (err) {
    console.log('Cannot handle incoming request.', err)
  } finally {
    stream.close()
  }
})

console.log('Connecting to L1 node %s', l1node)
await node.dial(l1node)
console.log('Ready to serve')

setInterval(
  () => node.ping(l1node).catch((err) => console.error('L1 ping failed.', err)),
  200,
).unref()

/*
process.on('SIGINT', () => {
  console.log('Stopping...')
  // stop libp2p
  node.stop().then(
    (ok) => console.log('libp2p has stopped'),
    (err) => console.error('Cannot stop libp2p node:', err),
  )
})
*/
