# Environment Setup Required

## Action Needed

Please add these lines to your `.env.local` file:

```env
# Token Launchpad Contract (TestNet)
NEXT_PUBLIC_LAUNCHPAD_APP_ID=750316100
LAUNCHPAD_APP_ID=750316100
```

The configuration has already been added to `.env.example` as a template.

---

## What's Done

✅ Created `src/lib/launchpad/blockchain.ts` with all utility functions
✅ Updated `.env.example` with Launchpad config
✅ Ready to integrate with frontend pages

## Next Steps

Once you add the env variables, the implementation will continue with:
1. Integrating blockchain calls into the create page
2. Updating the buy flow
3. Syncing contract state with database
