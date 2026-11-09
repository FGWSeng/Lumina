const DB_NAME = 'lumina-notes'
const DB_VERSION = 1
const STORE = 'shots'

let dbPromise = null

function openDB() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('indexedDB unavailable'))
        return
      }
      const req = indexedDB.open(DB_NAME, DB_VERSION)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: 'id' })
          store.createIndex('qid', 'qid', { unique: false })
        }
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  }
  return dbPromise
}

export async function addShot(qid, blob, name) {
  const db = await openDB()
  const id = `${qid}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put({ id, qid, blob, name: name || '', createdAt: Date.now() })
    tx.oncomplete = () => resolve(id)
    tx.onerror = () => reject(tx.error)
  })
}

export async function listShots(qid) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).index('qid').getAll(qid)
    req.onsuccess = () => {
      const list = (req.result || []).sort((a, b) => a.createdAt - b.createdAt)
      resolve(list)
    }
    req.onerror = () => reject(req.error)
  })
}

export async function deleteShot(id) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
