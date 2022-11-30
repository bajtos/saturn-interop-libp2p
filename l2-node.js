import { defaultNodeConfig, createNode, readStreamToBuffer } from './lib/helpers.js'
import { multiaddr } from '@multiformats/multiaddr'

const serverAddress =
  '/dns/localhost/tcp/3000/p2p/12D3KooWR6RmLLNVoZd3csiqEMcWqsTydNayMEtYcbumZ9Febt7f'
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

node.handle('/saturn:get-content/0.1.0', async ({ stream, connection }) => {
  const req = JSON.parse(await readStreamToBuffer(stream.source))
  console.log('Received request:', req)

  const gwUrl = `https://ipfs.io/ipfs/${req.cid}`
  console.log('fetching', gwUrl)
  const res = await fetch(gwUrl)
  console.log('GW response:', res.status)
  // TODO: handle errors

  for await (const chunk of res.body) {
    stream.sink([chunk])
  }

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
