import { defaultNodeConfig, createNode, readStreamToBuffer } from './lib/helpers.js'
import { createFromProtobuf } from '@libp2p/peer-id-factory'
import { randomUUID } from 'node:crypto'

// FIXME: this should be provided via ENV vars
const PeerIdString =
  'CiYAJAgBEiDi/KnMUa/JNs6QMdbutR8dj+nN0dwg8m91QcHMPeYRDhIkCAESIOL8qcxRr8k2zpAx1u61Hx2P6c3R3CDyb3VBwcw95hEOGkQIARJAiiPvAQeLsqMRsUzYOk56jQ+kKawzy62jQIRSEgoQcQXi/KnMUa/JNs6QMdbutR8dj+nN0dwg8m91QcHMPeYRDg=='

const peerId = await createFromProtobuf(Buffer.from(PeerIdString, 'base64'))

const node = await createNode({
  ...defaultNodeConfig,
  peerId,
  addresses: {
    listen: ['/ip4/0.0.0.0/tcp/3000'],
    announce: ['/dns/localhost/tcp/3000'],
  },
})
await node.start()

// print out listening addresses
console.log('listening on addresses:')
node.getMultiaddrs().forEach((addr) => {
  console.log('  ', addr.toString())
})

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
  setTimeout(async () => {
    if (connection.stat.status !== 'OPEN') return

    const stream = await node.dialProtocol(connection.remotePeer, '/saturn:get-content/0.1.0')
    const req = {
      requestId: randomUUID(),
      // cid: 'bafybeigj5lcgh3zm4mdiyherixy7q6n4k5idj3jetetxfjwhbbuqyksyem',
      cid: 'bafybeib36krhffuh3cupjml4re2wfxldredkir5wti3dttulyemre7xkni',
    }
    console.log('Fetching', req.cid)
    await stream.sink([Buffer.from(JSON.stringify(req))])

    const res = await readStreamToBuffer(stream.source)
    console.log('==RESPONSE==\n%s', res.toString())
    console.log('==EOF==')
  }, 100)
})

node.connectionManager.addEventListener('peer:disconnect', ({ detail: connection }) => {
  console.log('disconnected:', connection.id)
})

async function shutdown() {
  await node.stop()
}
