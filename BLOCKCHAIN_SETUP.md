# Database Setup for Blockchain Integration

## Required Actions

### 1. Add Environment Variables

Add to `.env.local`:
```env
NEXT_PUBLIC_LAUNCHPAD_APP_ID=750316100
LAUNCHPAD_APP_ID=750316100
```

### 2. Apply Database Schema (if not already done)

If the Token Launchpad tables haven't been created yet:
```bash
# The schema is already written in src/lib/launchpad/schema.sql
# You'll need to apply it to your database when ready
```

### 3. Run Migration (if tables already exist)

If the Token Launchpad tables were already created but don't have the blockchain fields:
```bash
npx tsx scripts/migrate-launchpad-blockchain.ts
```

---

## Implementation Status

✅ **Blockchain Utilities** - Created `src/lib/launchpad/blockchain.ts`  
✅ **Environment Config** - Updated `.env.example`  
✅ **Database Schema** - Updated `schema.sql` with blockchain fields  
✅ **Migration Script** - Created for existing databases  

⏳ **Next:** Integrating blockchain calls into create and buy pages
