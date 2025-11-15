import Database from 'better-sqlite3'
import path from 'path'

const dbPath = path.join(process.cwd(), 'data', 'rewards.sqlite')
const db = new Database(dbPath)

console.log('\n=== Testing UPDATE Statement ===\n')

// First, let's see the current state
console.log('BEFORE UPDATE:')
const before = db.prepare(`
  SELECT quest_id, status, claimed_at 
  FROM quest_progress 
  WHERE quest_id = 'daily_login'
`).get()
console.log(before)

// Now let's try the exact UPDATE statement from the code
console.log('\nRunning UPDATE...')
const result = db.prepare(`
  UPDATE quest_progress SET status = 'claimed', claimed_at = CURRENT_TIMESTAMP
  WHERE quest_id = 'daily_login' AND status = 'completed'
`).run()

console.log('Changes:', result.changes)

// Check the result
console.log('\nAFTER UPDATE:')
const after = db.prepare(`
  SELECT quest_id, status, claimed_at 
  FROM quest_progress 
  WHERE quest_id = 'daily_login'
`).get()
console.log(after)

db.close()
