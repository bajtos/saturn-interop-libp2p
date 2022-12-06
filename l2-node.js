import {
  defaultNodeConfig,
  createNode,
  readStreamToBuffer,
  SaturnProtocols,
} from './lib/helpers.js'
import { multiaddr } from '@multiformats/multiaddr'

const serverAddress =
  '/dns/localhost/tcp/3000/p2p/12D3KooWRH71QRJe5vrMp6zZXoH4K7z5MDSWwTXXPriG9dK8HQXk'
const l1node = multiaddr(serverAddress)

const node = await createNode({
  ...defaultNodeConfig,
  addresses: {
    // no address - we are not dialable
  },
})
await node.start()

// print out listening addresses
console.log('listening on addresses:')
node.getMultiaddrs().forEach((addr) => {
  console.log('  ', addr.toString())
})
if (node.getMultiaddrs().length < 1) {
  console.log('   (none)')
}

node.handle(SaturnProtocols.GetContent, async ({ stream, connection }) => {
  const req = JSON.parse(await readStreamToBuffer(stream.source))
  console.log('Received request:', req)

  const gwUrl = `https://ipfs.io/ipfs/${req.cid}`
  console.log('fetching', gwUrl)
  const res = await fetch(gwUrl)
  console.log('GW response:', res.status)
  // TODO: handle errors

  await stream.sink(res.body)

  stream.close()
})

setInterval(ping, 1000).unref()

async function ping() {
  const latency = await node.ping(l1node)
  console.log(`pinged ${l1node} in ${latency}ms`)
}

process.on('SIGINT', () => {
  // stop libp2p
  node.stop().then(
    (ok) => console.log('libp2p has stopped'),
    (err) => console.error('Cannot stop libp2p node:', err),
  )
})
