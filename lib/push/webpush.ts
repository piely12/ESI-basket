type WebPushSubscription = { endpoint: string; keys: { p256dh: string; auth: string } }

const encoder = new TextEncoder()
const asBuffer = (value: Uint8Array): ArrayBuffer => {
  const buffer = new ArrayBuffer(value.byteLength)
  new Uint8Array(buffer).set(value)
  return buffer
}
const decode = (value: string) => Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4)), (c) => c.charCodeAt(0))
const encode = (value: Uint8Array) => btoa(String.fromCharCode(...value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const concat = (...parts: Uint8Array[]) => {
  const output = new Uint8Array(parts.reduce((length, part) => length + part.length, 0))
  let offset = 0
  for (const part of parts) { output.set(part, offset); offset += part.length }
  return output
}

async function hmacKey(raw: Uint8Array) {
  return crypto.subtle.importKey('raw', asBuffer(raw), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
}

async function hkdf(secret: Uint8Array, salt: Uint8Array, info: Uint8Array, length: number) {
  const prk = new Uint8Array(await crypto.subtle.sign('HMAC', await hmacKey(salt), asBuffer(secret)))
  const key = await hmacKey(prk)
  let previous = new Uint8Array()
  let output = new Uint8Array()
  for (let counter = 1; output.length < length; counter++) {
    previous = new Uint8Array(await crypto.subtle.sign('HMAC', key, asBuffer(concat(previous, info, new Uint8Array([counter])))))
    output = concat(output, previous)
  }
  return output.slice(0, length)
}

async function authorization(endpoint: string, publicKey: string, privateKey: string) {
  const audience = new URL(endpoint).origin
  const header = encode(encoder.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  const now = Math.floor(Date.now() / 1000)
  const payload = encode(encoder.encode(JSON.stringify({ aud: audience, exp: now + 12 * 60 * 60, sub: process.env.VAPID_SUBJECT })))
  const unsigned = `${header}.${payload}`
  const pub = decode(publicKey)
  const priv = decode(privateKey)
  const key = await crypto.subtle.importKey('jwk', {
    kty: 'EC', crv: 'P-256', x: encode(pub.slice(1, 33)), y: encode(pub.slice(33, 65)), d: encode(priv),
    ext: true, key_ops: ['sign'],
  }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
  const signature = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, asBuffer(encoder.encode(unsigned))))
  return `vapid t=${unsigned}.${encode(signature)}, k=${publicKey}`
}

export async function sendWebPush(subscription: WebPushSubscription, message: string, publicKey: string, privateKey: string) {
  const subscriberPublic = decode(subscription.keys.p256dh)
  const authSecret = decode(subscription.keys.auth)
  const serverKeys = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])
  const serverPublic = new Uint8Array(await crypto.subtle.exportKey('raw', serverKeys.publicKey))
  const userKey = await crypto.subtle.importKey('raw', asBuffer(subscriberPublic), { name: 'ECDH', namedCurve: 'P-256' }, false, [])
  const sharedSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: userKey }, serverKeys.privateKey, 256))
  const inputKey = await hkdf(sharedSecret, authSecret, concat(encoder.encode('WebPush: info\0'), subscriberPublic, serverPublic), 32)
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const contentKey = await hkdf(inputKey, salt, encoder.encode('Content-Encoding: aes128gcm\0'), 16)
  const nonce = await hkdf(inputKey, salt, encoder.encode('Content-Encoding: nonce\0'), 12)
  const plaintext = concat(encoder.encode(message), new Uint8Array([2]))
  const aesKey = await crypto.subtle.importKey('raw', asBuffer(contentKey), 'AES-GCM', false, ['encrypt'])
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: asBuffer(nonce) }, aesKey, asBuffer(plaintext)))
  const recordSize = new Uint8Array([0, 0, 16, 0])
  const body = concat(salt, recordSize, new Uint8Array([serverPublic.length]), serverPublic, ciphertext)
  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      authorization: await authorization(subscription.endpoint, publicKey, privateKey),
      'content-encoding': 'aes128gcm',
      'content-type': 'application/octet-stream',
      ttl: '86400',
    },
    body,
  })
  if (!response.ok) throw Object.assign(new Error('Push service rejected the notification'), { statusCode: response.status })
}
