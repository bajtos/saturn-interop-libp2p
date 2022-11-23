import { defaultNodeConfig, createNode } from './lib/helpers.js'
import { multiaddr } from 'multiaddr'

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

setInterval(ping, 500).unref()

async function ping() {
  console.log(`pinging remote peer at ${serverAddress}`)
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
