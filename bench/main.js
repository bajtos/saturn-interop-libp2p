import assert from 'node:assert'
import { fork } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { once } from 'node:events'
import fs from 'node:fs/promises'
import { Client } from 'undici'
import { createNode, defaultNodeConfig, SaturnProtocols } from '../lib/helpers.js'
import { getCacheLocationForCid, resolveImportRelative } from './helpers.js'

// A ~1.2GB directory from Project Apollo Archives
const LargeContentCid = 'QmTARpLZ6D4PerQ5LGZM4C9LdKBpTNZBR8gZebEyNZxvz1'
const LargeContentSize = 1183834285

// A ~1GB file from https://download.blender.org/durian/movies/
// See https://github.com/ipfs/kubo/issues/4588#issue-289148955
// const LargeContentCid = 'QmUwZFGPptdF5ZG58EdozjDSXYugPsxe1MwPZFQ4vZmAsb'

// Make sure we have the data file cached locally
const dataFile = getCacheLocationForCid(LargeContentCid)
try {
  await fs.access(dataFile)
} catch (err) {
  console.log('Fetching %s from the IPFS Gateway', LargeContentCid)
  const res = await fetch(`https://ipfs.io/ipfs/${LargeContentCid}/?format=car`)
  if (res.status !== 200) {
    console.error(`Cannot fetch ${LargeContentCid}: ${res.status}`)
    console.error(await res.text)
    process.exit(1)
  }
  console.log('  downloading the content...')
  await fs.writeFile(dataFile, res.body)
}

// Create our L1 node
const node = await createNode({
  ...defaultNodeConfig,
  addresses: {
    listen: ['/ip4/127.0.0.1/tcp/3000'],
  },
})
await node.start()
const address = node.getMultiaddrs()[0]
console.log('L1 node listening at', address.toString())

// Run the benchmark when a new L2 node connects
node.connectionManager.addEventListener('peer:connect', async ({ detail: connection }) => {
  // await node.ping(connection.remotePeer)
  await runBenchmark('libp2p', () => fetchLargeFileFromPeer(connection.remotePeer))
  await runBenchmark('HTTPS', () => fetchLargeFileFromHttp('https://localhost:4000/'))
  process.nextTick(shutdown)
})

// Spawn the content provider (an L2 node)
const child = fork(resolveImportRelative(import.meta.url, './content-provider.js'), {
  env: {
    REMOTE_ADDRESS: address,
    DEBUG: process.env.DEBUG,
  },
  stdio: 'pipe',
})
child.on('exit', () => console.log('Content provider exited.'))
process.on('exit', () => child.kill())

child.stdout.setEncoding('utf-8')
child.stdout.on('data', (chunk) => {
  console.log(decorateLines(chunk, '[L2]'))
})

child.stderr.setEncoding('utf-8')
child.stderr.on('data', (chunk) => {
  console.error(decorateLines(chunk, '[L2]'))
})

process.on('SIGINT', shutdown)

async function shutdown() {
  console.log('Shutting down...')
  if (child && child.exitCode === null) {
    child.kill()
    await once(child, 'exit')
  }
  await node.stop()
}

async function runBenchmark(name, fetchFn) {
  const size = LargeContentSize

  console.log('Benchmarking %s retrieval of %s with size %s bytes', name, LargeContentCid, size)
  for (let it = 0; it < 1; it++) {
    const res = await fetchFn()
    assert.equal(res.size, size)
  }

  // benchmark
  const durationsInMs = []
  for (let it = 0; it < 3; it++) {
    const res = await fetchFn()
    assert.equal(res.size, size)
    durationsInMs.push(res.durationInMs)
  }

  // report results
  let min,
    max,
    avg = 0
  for (const d of durationsInMs) {
    if (min === undefined || d < min) min = d
    if (max === undefined || d > max) max = d
    avg += d
  }
  avg = avg / durationsInMs.length

  console.log('Downloaded %s bytes in %s ms (min: %s ms, max %s ms)', size, avg, min, max)
  console.log('Average throughput: %s MB/second', ((size / avg) * 1000) / 1024 / 1024)
}

async function fetchLargeFileFromPeer(peerId) {
  const stream = await node.dialProtocol(peerId, SaturnProtocols.GetContent)
  const req = {
    requestId: randomUUID(),
    cid: LargeContentCid,
  }
  await stream.sink([Buffer.from(JSON.stringify(req))])

  const start = Date.now()
  let size = 0
  for await (const chunkList of stream.source) {
    size += chunkList.length
    // discard data
  }
  const durationInMs = Date.now() - start
  // console.log('Received %s data in %s ms.', size, durationInMs)
  // console.log('Closing the stream.')
  stream.close()

  return { durationInMs, size }
}

async function fetchLargeFileFromHttp(baseUrl) {
  const client = new Client(baseUrl, { connect: { rejectUnauthorized: false } })
  const res = await client.request({ method: 'GET', path: `/${LargeContentCid}` })
  assert.equal(res.statusCode, 200)
  const start = Date.now()
  let size = 0
  for await (const chunk of res.body) {
    size += chunk.length
    // discard data
  }
  const durationInMs = Date.now() - start
  return { durationInMs, size }
}

function decorateLines(chunk, prefix) {
  return chunk
    .split(/\n/g)
    .slice(0, -1)
    .map((line) => `${prefix} ${line}`)
    .join('\n')
}
