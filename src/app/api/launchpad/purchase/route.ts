import { NextRequest, NextResponse } from 'next/server'
import { getPriceQuote, getQuoteForAlgo, validatePurchase, recordPurchase, getProject } from '@/lib/launchpad/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { projectId, buyerAddress, tokensAmount, algoAmount, action } = body

    if (!projectId || !buyerAddress) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: projectId and buyerAddress'
      }, { status: 400 })
    }

    // Handle ALGO-based quote (user enters ALGO amount)
    if (action === 'quoteForAlgo') {
      if (!algoAmount) {
        return NextResponse.json({
          success: false,
          error: 'Missing algoAmount for quoteForAlgo action'
        }, { status: 400 })
      }

      const algoAmountBigInt = BigInt(algoAmount)
      const quote = await getQuoteForAlgo(projectId, algoAmountBigInt)

      if (!quote) {
        return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 })
      }

      return NextResponse.json({
        success: true,
        data: {
          tokensAmount: quote.tokensAmount.toString(),
          totalCost: quote.totalCost.toString(),
          averagePrice: quote.averagePrice.toString(),
          priceImpact: quote.priceImpact,
          pointsToEarn: quote.pointsToEarn.toString(),
        }
      })
    }

    // For other actions, tokensAmount is required
    if (!tokensAmount) {
      return NextResponse.json({
        success: false,
        error: 'Missing tokensAmount'
      }, { status: 400 })
    }

    const tokensAmountBigInt = BigInt(tokensAmount)

    if (action === 'quote') {
      // Get price quote (legacy - by token amount)
      const quote = await getPriceQuote(projectId, tokensAmountBigInt)

      if (!quote) {
        return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 })
      }

      return NextResponse.json({
        success: true,
        data: {
          tokensAmount: quote.tokensAmount.toString(),
          totalCost: quote.totalCost.toString(),
          averagePrice: quote.averagePrice.toString(),
          priceImpact: quote.priceImpact,
          pointsToEarn: quote.pointsToEarn.toString(),
        }
      })
    }

    if (action === 'validate') {
      // Validate purchase (anti-bot checks)
      const currentRound = BigInt(body.currentRound || 0)
      const validation = await validatePurchase(projectId, buyerAddress, tokensAmountBigInt, currentRound)

      return NextResponse.json({
        success: true,
        data: validation
      })
    }

    if (action === 'record') {
      // Record completed purchase
      const { algoPaid, transactionId, blockRound } = body

      if (!algoPaid || !transactionId || !blockRound) {
        return NextResponse.json({
          success: false,
          error: 'Missing transaction details'
        }, { status: 400 })
      }

      const purchaseId = await recordPurchase(
        projectId,
        buyerAddress,
        tokensAmountBigInt,
        BigInt(algoPaid),
        transactionId,
        BigInt(blockRound)
      )

      // Check if graduation target reached
      const project = await getProject(projectId)
      if (project && project.algoRaised >= project.bondingTarget) {
        // TODO: Trigger graduation process
        console.log(`Project ${projectId} reached graduation target!`)
      }

      return NextResponse.json({
        success: true,
        data: { purchaseId },
        message: 'Purchase recorded successfully'
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action'
    }, { status: 400 })

  } catch (error: any) {
    console.error('Purchase error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
