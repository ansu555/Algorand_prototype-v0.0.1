# Environment Setup Required

## Action Needed

Please add these lines to your `.env.local` file:

```env
# Token Launchpad Contract (TestNet)
NEXT_PUBLIC_LAUNCHPAD_APP_ID=750316100
LAUNCHPAD_APP_ID=750316100

# Optional: Supabase storage for Launchpad logos (recommended for cross-device access)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_STORAGE_BUCKET=launchpad-logos
```

The configuration has already been added to `.env.example` as a template.

---

## What's Done

✅ Created `src/lib/launchpad/blockchain.ts` with all utility functions
✅ Updated `.env.example` with Launchpad config
✅ Ready to integrate with frontend pages

## Why add Supabase?

Uploading Launchpad token logos to a public Supabase Storage bucket makes them visible on every device automatically. Without these variables the app falls back to local storage, which only works on the machine that created the logo.

## Next Steps

Once you add the env variables, the implementation will continue with:
1. Integrating blockchain calls into the create page
2. Updating the buy flow
3. Syncing contract state with database
