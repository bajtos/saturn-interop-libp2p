import { createFromProtobuf } from '@libp2p/peer-id-factory'
import { randomUUID } from 'node:crypto'
import { once } from 'node:events'
import http from 'node:http'
import { createNode, defaultNodeConfig, SaturnProtocols } from './lib/helpers.js'

// FIXME: this should be provided via ENV vars
const PeerIdString =
  'CiYAJAgBEiDluNfV2GAg/vDcFs8wNmBR4vs8cSr2vd9iGdTki+H6YxIkCAESIOW419XYYCD+8NwWzzA2YFHi+zxxKva932IZ1OSL4fpjGkQIARJA+PpMIiIRRZKRK/7rT4eZKmJpqpZEu2wHFtQcYMnuP0/luNfV2GAg/vDcFs8wNmBR4vs8cSr2vd9iGdTki+H6Yw=='

const publicHostname = process.env.FLY_APP_NAME && `${process.env.FLY_APP_NAME}.fly.dev`
let url

const peerId = await createFromProtobuf(Buffer.from(PeerIdString, 'base64'))

const node = await createNode({
  ...defaultNodeConfig,
  peerId,
  addresses: {
    listen: ['/ip4/0.0.0.0/tcp/3030'],
    announce: publicHostname && [`/dns/${publicHostname}/tcp/3030/p2p/${peerId}`],
  },
})
await node.start()

// print out listening addresses
console.log('libp2p listening on addresses:')
node.getMultiaddrs().forEach((addr) => {
  console.log('  ', addr.toString())
})

const server = http.createServer(async (req, res) => {
  handle().catch((err) => {
    console.log('Unhandled error for %s %s:', req.method, req.path, err)
    replyError(500, err.message || err)
  })

  async function handle() {
    const peers = node.getConnections()
    const cid = req.url.slice(1) // remove the leading '/' character

    if (req.method !== 'GET') {
      return replyError(405, `Method ${req.method} is not allowed.`)
    }

    if (req.url === '/') {
      res.writeHead(200, { 'content-type': 'text/html' })
      res.write(`
<h1>Welcome to Saturn Link PoC</h1>
<h2>Connected L2 nodes</h2>
${peers.length ? peers.map((p) => `<p><code>${p.remotePeer}</code>`) : '<p>(none)'}
<h2>Example requests</h2>
<p><a href="${url}bafybeib36krhffuh3cupjml4re2wfxldredkir5wti3dttulyemre7xkni">${url}bafybeib36krhffuh3cupjml4re2wfxldredkir5wti3dttulyemre7xkni</a>
<p><a href="${url}bafybeigj5lcgh3zm4mdiyherixy7q6n4k5idj3jetetxfjwhbbuqyksyem">${url}bafybeigj5lcgh3zm4mdiyherixy7q6n4k5idj3jetetxfjwhbbuqyksyem</a>
`)
      res.end()
      return
    }

    if (!cid) {
      return replyError(404, `[ERROR] Not found: ${req.url} Missing CID in the requested path`)
    }

    if (!peers.length) {
      return replyError(500, '[ERROR] No L2 nodes are connected.')
    }

    console.log('Serving CID', cid)

    // TODO: use consistent hashing to select the L2 Node to ask for the content
    const targetPeer = peers[0].remotePeer

    const stream = await node.dialProtocol(targetPeer, SaturnProtocols.GetContent)
    const saturnReq = {
      requestId: randomUUID(),
      cid,
    }
    // console.log('Saturn content request', saturnReq)
    await stream.sink([Buffer.from(JSON.stringify(saturnReq))])

    console.log('Streaming back the response')
    res.writeHead(200)
    for await (const chunk of stream.source) {
      res.write(chunk.subarray())
    }
    res.end()
    console.log('Done.')
  }

  function replyError(statusCode, msg) {
    console.log('Request rejected:', statusCode, msg)
    res.writeHead(statusCode, { 'content-type': 'text/plain' })
    res.write(msg + '\n')
    res.end()
  }
})
server.listen(+process.env.PORT || 3000)
await once(server, 'listening')
url = publicHostname ? `https://${publicHostname}/` : `http://127.0.0.1:${server.address().port}/`
console.log('HTTP server listening on %s', url)
console.log(
  'Example requests:\n  %s%s\n  %s%s',
  url,
  'bafybeib36krhffuh3cupjml4re2wfxldredkir5wti3dttulyemre7xkni',
  url,
  'bafybeigj5lcgh3zm4mdiyherixy7q6n4k5idj3jetetxfjwhbbuqyksyem',
)

node.connectionManager.addEventListener('peer:connect', ({ detail: connection }) => {
  console.log('L2 Node connected', connection.remotePeer.toString())
})

node.connectionManager.addEventListener('peer:disconnect', ({ detail: connection }) => {
  console.log('L2 Node disconnected', connection.remotePeer.toString())
})

process.on('SIGINT', () => {
  shutdown().catch((err) => console.error('Cannot shut down:', err))
})

async function shutdown() {
  await node.stop()
  server.close()
  await once(server, 'close')
}
