import { NextRequest, NextResponse } from 'next/server'
import { updateLaunchpadToken, getLaunchpadTokenById } from '@/lib/db'
import algosdk from 'algosdk'
import { getAlgodClient } from '@/lib/algorand'

const COOLDOWN_HOURS = 24 // 24 hour cooldown period after deployment

// POST /api/launchpad/deploy - Deploy a token to Algorand blockchain
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { tokenId, creatorAddress, mnemonic } = body

    if (!tokenId || !creatorAddress || !mnemonic) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get token from database
    const token = await getLaunchpadTokenById(tokenId)
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token not found' },
        { status: 404 }
      )
    }

    // Verify ownership
    if (token.creatorAddress.toLowerCase() !== creatorAddress.toLowerCase()) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Check if already deployed
    if (token.status === 'deployed' || token.assetId) {
      return NextResponse.json(
        { success: false, error: 'Token already deployed' },
        { status: 400 }
      )
    }

    // Create account from mnemonic
    let account: algosdk.Account
    try {
      account = algosdk.mnemonicToSecretKey(mnemonic)
      if (account.addr !== creatorAddress) {
        return NextResponse.json(
          { success: false, error: 'Mnemonic does not match creator address' },
          { status: 400 }
        )
      }
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid mnemonic' },
        { status: 400 }
      )
    }

    // Get Algod client
    const algodClient = getAlgodClient()

    // Get suggested params
    const suggestedParams = await algodClient.getTransactionParams().do()

    // Create asset creation transaction
    const totalSupply = BigInt(token.totalSupply)
    const decimals = token.decimals
    const defaultFrozen = false
    const assetName = token.name
    const unitName = token.symbol
    const assetURL = token.website || ''
    const manager = account.addr
    const reserve = account.addr
    const freeze = account.addr
    const clawback = account.addr

    const txn = algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject({
      sender: account.addr,
      total: totalSupply,
      decimals,
      defaultFrozen,
      manager,
      reserve,
      freeze,
      clawback,
      unitName,
      assetName,
      assetURL,
      suggestedParams
    })

    // Sign transaction
    const signedTxn = txn.signTxn(account.sk)

    // Submit transaction
    const txResponse = await algodClient.sendRawTransaction(signedTxn).do()
    const txId = txResponse.txid

    // Wait for confirmation
    const confirmedTxn = await algosdk.waitForConfirmation(algodClient, txId, 4)
    const assetId = confirmedTxn.assetIndex || (confirmedTxn as any)['asset-index']

    if (!assetId) {
      throw new Error('Asset creation failed - no asset ID returned')
    }

    // Calculate cooldown end time
    const cooldownEndTime = new Date(Date.now() + COOLDOWN_HOURS * 60 * 60 * 1000).toISOString()

    // Update token in database
    const updated = await updateLaunchpadToken(tokenId, {
      assetId,
      status: 'cooldown',
      cooldownEndTime,
      deployedAt: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      assetId,
      txId,
      cooldownEndTime,
      token: updated
    })
  } catch (error: any) {
    console.error('Error deploying token:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to deploy token' },
      { status: 500 }
    )
  }
}
