# AutoPilot Rule Listing UI - Complete Guide

## Overview
The Rule Listing UI displays all autopilot rules for a connected wallet, fetched directly from the Algorand blockchain. Users can view, manage, pause, resume, cancel, and delete their rules.

## Components Created

### 1. `AutoPilotRulesList` Component
**File:** `src/components/features/rules/autopilot-rules-list.tsx`

A comprehensive table-based UI component that displays all rules for the connected wallet.

**Features:**
- ✅ Automatic rule fetching on wallet connection
- ✅ Real-time status badges (Active, Paused, Cancelled)
- ✅ Execution statistics (count, total spent)
- ✅ Pause/Resume/Cancel actions
- ✅ Delete rule functionality with MBR refund
- ✅ Refresh button for manual updates
- ✅ Loading states with skeleton loaders
- ✅ Error handling and display
- ✅ AlgoExplorer integration
- ✅ Responsive table layout

### 2. AutoPilot Page
**File:** `src/app/(dashboard)/autopilot/page.tsx`

A dedicated page combining rule creation and listing.

**Features:**
- ✅ "Create Rule" button with modal
- ✅ Rules list with auto-refresh after creation
- ✅ Clean, professional layout

## Architecture

### Data Flow

```
User Wallet Connect
    ↓
AutoPilotRuleClient.listUserRules()
    ↓
Query Application Boxes (box storage)
    ↓
Filter boxes by owner address
    ↓
Fetch box contents for each rule
    ↓
Decode RuleData from bytes
    ↓
Display in table
```

### Box Storage Structure

**Box Name Format:** `owner_address (32 bytes) + rule_id (8 bytes)`

**Box Contents:** Encoded RuleData struct
- rule_type (1 byte)
- target_assets (dynamic array)
- rotate_top_n (1 byte)
- max_spend_microalgos (8 bytes)
- max_slippage_bps (2 bytes)
- cooldown_minutes (2 bytes)
- trigger_type (1 byte)
- threshold_bps (2 bytes)
- window_hours (2 bytes)
- status (1 byte)
- last_executed (8 bytes)
- execution_count (8 bytes)
- total_spent (8 bytes)

## Implementation Details

### Client Methods

#### `listUserRules(owner: string)`
Queries all application boxes and filters by owner address.

```typescript
const userRules = await autopilotClient.listUserRules(activeAccount.address)
// Returns: Array<{ ruleId: bigint; data: Uint8Array }>
```

#### `getRule(ruleId: bigint, owner: string)`
Fetches and decodes a specific rule from box storage.

```typescript
const ruleData = await autopilotClient.getRule(ruleId, owner)
// Returns: RuleData (decoded struct)
```

#### `decodeRuleData(data: Uint8Array)`
Private method that decodes the binary box data into a RuleData object.

**Decoding Process:**
1. Extract rule_type (1 byte)
2. Extract target_assets length (2 bytes)
3. Extract each asset ID (8 bytes each)
4. Extract remaining fields sequentially
5. Construct RuleData object

### UI Components

#### Table Columns

| Column | Data | Format |
|--------|------|--------|
| Rule ID | `rule_id` | `#123` |
| Type | `rule_type` | Badge (DCA/Rebalance/Rotate) |
| Trigger | `trigger.trigger_type` | Name + threshold + window |
| Status | `status` | Badge (Active/Paused/Cancelled) |
| Max Spend | `max_spend_microalgos` | `10.000000 ALGO` |
| Executions | `total_executions` | Count |
| Total Spent | `total_spent_microalgos` | `5.250000 ALGO` |
| Actions | - | Dropdown menu |

#### Actions Menu

**Active Rules:**
- Pause Rule
- Cancel Rule
- View on Explorer
- Delete Rule

**Paused Rules:**
- Resume Rule
- Cancel Rule
- View on Explorer
- Delete Rule

**Cancelled Rules:**
- View on Explorer
- Delete Rule

### Status Badge Colors

```typescript
const getStatusBadgeVariant = (status: number) => {
  switch (status) {
    case STATUS_ACTIVE: return 'default'    // Blue
    case STATUS_PAUSED: return 'secondary'  // Gray
    case STATUS_CANCELLED: return 'destructive' // Red
    default: return 'outline'
  }
}
```

## User Workflow

### Viewing Rules

1. **Navigate to /autopilot**
2. **Connect wallet** (if not connected)
3. **Rules automatically fetch** from blockchain
4. **View table** with all rule details

### Managing Rules

#### Pause a Rule
1. Click **⋮** (more actions)
2. Select **"Pause Rule"**
3. Approve transaction in wallet
4. Rule status updates to "Paused"

#### Resume a Rule
1. Click **⋮** on paused rule
2. Select **"Resume Rule"**
3. Approve transaction
4. Rule status updates to "Active"

#### Cancel a Rule
1. Click **⋮**
2. Select **"Cancel Rule"**
3. Approve transaction
4. Rule status updates to "Cancelled"
5. Rule will not execute again

#### Delete a Rule
1. Click **⋮**
2. Select **"Delete Rule"**
3. **Confirm** deletion in dialog
4. Approve transaction
5. Rule removed from blockchain
6. **0.165 ALGO MBR refunded** to wallet

### Refreshing Data

**Automatic:**
- On wallet connection
- After creating new rule
- After status update
- After deletion

**Manual:**
- Click "Refresh" button (top-right)

## Error Handling

### Common Errors

**"No autopilot rules found"**
- User has not created any rules yet
- Display: Empty state with CTA

**"Failed to fetch rules"**
- Network error or API down
- Display: Error alert with retry button

**Box not found**
- Rule was deleted externally
- Skip and continue loading other rules

**Transaction failed**
- User rejected signature
- Insufficient balance
- Invalid state transition
- Display: Toast error with details

## Testing

### Manual Testing Steps

1. **Setup**
   ```bash
   npm run dev
   # Navigate to http://localhost:3000/autopilot
   ```

2. **Create Test Rules**
   - Create 3-5 rules with different configurations
   - Mix of DCA, Rebalance, and Rotate
   - Different trigger types

3. **Verify Display**
   - ✅ All rules appear in table
   - ✅ Correct rule IDs
   - ✅ Accurate status badges
   - ✅ Proper formatting (ALGO amounts, percentages)

4. **Test Actions**
   - ✅ Pause an active rule
   - ✅ Resume a paused rule
   - ✅ Cancel a rule
   - ✅ Delete a cancelled rule
   - ✅ Verify MBR refund

5. **Test Refresh**
   - ✅ Manual refresh updates data
   - ✅ Creating new rule triggers refresh
   - ✅ Deleting rule removes from list

### Blockchain Verification

After each action, verify on AlgoExplorer:

1. **View Application**
   - `https://testnet.algoexplorer.io/application/749361072`

2. **Check Box Storage**
   - Navigate to "Box Storage" tab
   - Verify boxes exist for your rules
   - Confirm deletion removes box

3. **Check Transactions**
   - Verify updateRuleStatus transactions
   - Verify deleteRule transactions
   - Confirm payment back to user (MBR refund)

## Performance Considerations

### Optimization Strategies

1. **Lazy Loading**
   - Only fetch on wallet connection
   - Don't refetch on every render

2. **Caching**
   - Store rules in component state
   - Refresh only on explicit actions

3. **Batch Decoding**
   - Decode all rules in parallel
   - Use Promise.all for concurrency

4. **Error Recovery**
   - Skip failed decodings
   - Continue loading remaining rules

### Current Limitations

- ❌ No pagination (loads all rules)
- ❌ No search/filter functionality
- ❌ No sorting capabilities
- ❌ No real-time updates (requires manual refresh)

### Future Enhancements

1. **Pagination**
   - Load 10 rules per page
   - "Load More" button

2. **Filtering**
   - Filter by status
   - Filter by type
   - Filter by trigger

3. **Sorting**
   - Sort by ID
   - Sort by total spent
   - Sort by execution count

4. **Real-time Updates**
   - WebSocket integration
   - Auto-refresh on block confirmation
   - Live execution notifications

5. **Detailed View**
   - Click rule to see full details
   - Execution history timeline
   - Performance charts

## API Reference

### AutoPilotRuleClient Methods

```typescript
// List all user rules
async listUserRules(owner: string): Promise<Array<{ ruleId: bigint; data: Uint8Array }>>

// Get specific rule
async getRule(ruleId: bigint, owner: string): Promise<RuleData>

// Update rule status
async updateRuleStatus(signer: WalletSigner, ruleId: bigint, newStatus: RuleStatus): Promise<string>

// Delete rule
async deleteRule(signer: WalletSigner, ruleId: bigint): Promise<string>

// Get app ID
getAppId(): number

// Get app address
getAppAddress(): string
```

### Helper Functions

```typescript
// Format rule status
formatRuleStatus(status: RuleStatus): string

// Convert microalgos to ALGO
microalgosToAlgo(microalgos: number | bigint): string

// Convert basis points to percentage
bpsToPercent(bps: number): string
```

## Troubleshooting

### Rules Not Appearing

**Check:**
1. Wallet connected?
2. On correct network (testnet)?
3. Rules exist on blockchain?
4. Check browser console for errors

**Fix:**
- Click "Refresh" button
- Disconnect and reconnect wallet
- Check AlgoExplorer for app boxes

### Delete Not Working

**Possible Causes:**
- Insufficient balance for transaction fee
- Rule already deleted
- Network congestion

**Fix:**
- Ensure 0.01+ ALGO for tx fee
- Check AlgoExplorer for rule status
- Wait and retry

### Status Update Failing

**Possible Causes:**
- Invalid status transition
- Rule already in that status
- Contract logic rejection

**Fix:**
- Check current status
- Verify allowed transitions
- Review contract documentation

## Resources

- **Component:** `src/components/features/rules/autopilot-rules-list.tsx`
- **Client:** `src/lib/contracts/autopilot-client.ts`
- **Types:** `src/lib/contracts/autopilot-types.ts`
- **Helpers:** `src/lib/contracts/autopilot-helpers.ts`
- **Page:** `src/app/(dashboard)/autopilot/page.tsx`
- **Contract:** App ID 749361072 (testnet)
- **Explorer:** https://testnet.algoexplorer.io/application/749361072
