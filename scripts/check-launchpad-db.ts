import Database from 'better-sqlite3'
import path from 'path'

const dbPath = path.join(process.cwd(), 'data', 'launchpad.sqlite')

console.log('Database path:', dbPath)

const db = new Database(dbPath, { readonly: true })

// Check if tables exist
const tables = db.prepare(`
  SELECT name FROM sqlite_master 
  WHERE type='table' 
  ORDER BY name
`).all()

console.log('\nTables in database:', tables)

// Check launch_projects table
const projects = db.prepare('SELECT * FROM launch_projects').all()

console.log('\nNumber of projects:', projects.length)
console.log('\nProjects:', JSON.stringify(projects, (key, value) =>
  typeof value === 'bigint' ? value.toString() : value
, 2))

db.close()
