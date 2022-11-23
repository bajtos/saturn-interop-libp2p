import { defaultNodeConfig, createNode, ServerStateFile } from './lib/helpers.js'
import { writeFile, rm } from 'node:fs/promises'

const node = await createNode({
  ...defaultNodeConfig,
  addresses: {
    listen: ['/ip4/0.0.0.0/tcp/0'],
  },
})
await node.start()

// print out listening addresses
console.log('listening on addresses:')
node.getMultiaddrs().forEach((addr) => {
  console.log('  ', addr.toString())
})

writeFile(
  ServerStateFile,
  JSON.stringify({ addresses: node.getMultiaddrs().map((addr) => addr.toString()) }),
)

process.on('SIGINT', () => {
  shutdown().then(
    (ok) => console.log('libp2p has stopped'),
    (err) => console.error('Cannot stop libp2p node:', err),
  )
})

node.connectionManager.addEventListener('peer:connect', ({ detail: connection }) => {
  console.log('new connection', {
    id: connection.id,
    remoteAddr: connection.remoteAddr,
    remotePeer: connection.remotePeer.toString(),
    tags: connection.tags,
    stat: connection.stat,
  })
})

node.connectionManager.addEventListener('peer:disconnect', ({ detail: connection }) => {
  console.log('disconnected:', connection.id)
})

async function shutdown() {
  await rm(ServerStateFile)
  await node.stop()
}
