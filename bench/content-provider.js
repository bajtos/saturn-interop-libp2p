import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { multiaddr } from '@multiformats/multiaddr'
import { once } from 'node:events'
import fs from 'node:fs'
import { createServer } from 'node:https'
import {
  createNode,
  defaultNodeConfig,
  readStreamToBuffer,
  SaturnProtocols,
} from '../lib/helpers.js'
import { CacheDir, getCacheLocationForCid } from './helpers.js'

const remoteAddressString = process.env.REMOTE_ADDRESS
if (!remoteAddressString) {
  console.error('The environment variable REMOTE_ADDRESS must be set to multiaddr of the L1 node')
  process.exit(1)
}

const remoteAddress = multiaddr(remoteAddressString)

const node = await createNode({
  ...defaultNodeConfig,
  addresses: {
    // no address - we are not dialable
  },
})
await node.start()

// Setup content retrieval handler
node.handle(SaturnProtocols.GetContent, async function handleGetContent({ stream, connection }) {
  const req = JSON.parse(await readStreamToBuffer(stream.source))
  // console.log('Received request %s for %s', req.requestId, req.cid)

  const reader = fs.createReadStream(getCacheLocationForCid(req.cid))
  await stream.sink(reader)
  stream.close()
})

// Setup HTTPS server
const server = createServer(
  {
    key: fs.readFileSync(`${CacheDir}/server-key.pem`),
    cert: fs.readFileSync(`${CacheDir}/server-cert.pem`),
  },
  function httpRequestHandler(req, res) {
    try {
      const cid = req.url.slice(1) // remove the leading '/' character
      // console.log('serving CID', cid)
      const reader = fs.createReadStream(getCacheLocationForCid(cid))
      reader.on('error', handleError)
      res.writeHead(200)
      reader.pipe(res)
    } catch (err) {
      handleError(err)
    }

    function handleError(err) {
      console.log('Unexpected error:', err)
      if (res.headersSent) return
      res.writeHead(500)
      res.write('' + err)
      res.end()
    }
  },
)
server.listen(4000, 'localhost')
await once(server, 'listening')

// Ready to go!
await node.dial(remoteAddress)

// setInterval(() => node.ping(remoteAddress), 300)
