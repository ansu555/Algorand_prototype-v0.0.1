import Database from 'better-sqlite3'
import path from 'path'

const dbPath = path.join(process.cwd(), 'data', 'rewards.sqlite')
const db = new Database(dbPath)

console.log('\n=== Checking Quest Status in Database ===\n')

const quests = db.prepare(`
  SELECT quest_id, status, progress, completed_at, claimed_at, 
         datetime(claimed_at) as claimed_at_readable
  FROM quest_progress 
  WHERE quest_id = 'daily_login'
`).all()

if (quests.length === 0) {
  console.log('No daily_login quests found in database')
} else {
  quests.forEach((quest: any) => {
    console.log('Quest ID:', quest.quest_id)
    console.log('Status:', quest.status)
    console.log('Progress:', quest.progress)
    console.log('Completed At:', quest.completed_at)
    console.log('Claimed At:', quest.claimed_at)
    console.log('Claimed At (Readable):', quest.claimed_at_readable)
    console.log('---')
  })
}

db.close()
