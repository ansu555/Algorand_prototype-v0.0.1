import { NextRequest, NextResponse } from 'next/server'
import { getAllProjects, getProject, createProject } from '@/lib/launchpad/db'
import type { ProjectStatus } from '@/lib/launchpad/types'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const status = searchParams.get('status') as ProjectStatus | null

    if (projectId) {
      // Get single project
      const project = await getProject(projectId)

      if (!project) {
        return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 })
      }

      return NextResponse.json({
        success: true,
        data: {
          ...project,
          // Convert BigInts to strings for JSON
          totalSupply: project.totalSupply.toString(),
          basePrice: project.basePrice.toString(),
          maxPrice: project.maxPrice.toString(),
          bondingTarget: project.bondingTarget.toString(),
          tokensForSale: project.tokensForSale.toString(),
          tokensSold: project.tokensSold.toString(),
          algoRaised: project.algoRaised.toString(),
          lpLockDuration: project.lpLockDuration.toString(),
          asaId: project.asaId?.toString(),
          appId: project.appId?.toString(),
          launchRound: project.launchRound?.toString(),
          graduationRound: project.graduationRound?.toString(),
        }
      })
    }

    // Get all projects (optionally filtered by status)
    const projects = await getAllProjects(status || undefined)

    return NextResponse.json({
      success: true,
      data: projects.map(p => ({
        ...p,
        totalSupply: p.totalSupply.toString(),
        basePrice: p.basePrice.toString(),
        maxPrice: p.maxPrice.toString(),
        bondingTarget: p.bondingTarget.toString(),
        tokensForSale: p.tokensForSale.toString(),
        tokensSold: p.tokensSold.toString(),
        algoRaised: p.algoRaised.toString(),
        lpLockDuration: p.lpLockDuration.toString(),
        asaId: p.asaId?.toString(),
        appId: p.appId?.toString(),
        launchRound: p.launchRound?.toString(),
        graduationRound: p.graduationRound?.toString(),
      }))
    })
  } catch (error: any) {
    console.error('Get projects error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      creatorAddress,
      tokenName,
      tokenSymbol,
      tokenDecimals = 6,
      totalSupply,
      description,
      logoUrl,
      logoData,
      logoMimeType,
      websiteUrl,
      twitterUrl,
      telegramUrl,
      curveType = 'sigmoid',
      basePrice,
      maxPrice,
      bondingTarget,
      tokensForSale,
      liquidityPercentage = 80,
      lpLockDuration = '15552000', // 6 months
      dexPlatform = 'tinyman',
    } = body

    // Convert base64 logo data to data URL if provided
    let finalLogoUrl = logoUrl
    if (logoData && logoMimeType) {
      finalLogoUrl = `data:${logoMimeType};base64,${logoData}`
    }

    // Validation
    if (!creatorAddress || !tokenName || !tokenSymbol || !totalSupply || !basePrice || !maxPrice || !bondingTarget || !tokensForSale) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 })
    }

    const projectId = await createProject({
      creatorAddress,
      tokenName,
      tokenSymbol,
      tokenDecimals,
      totalSupply: BigInt(totalSupply),
      description,
      logoUrl: finalLogoUrl,
      websiteUrl,
      twitterUrl,
      telegramUrl,
      curveType,
      basePrice: BigInt(basePrice),
      maxPrice: BigInt(maxPrice),
      bondingTarget: BigInt(bondingTarget),
      tokensForSale: BigInt(tokensForSale),
      status: 'pending',
      tokensSold: 0n,
      algoRaised: 0n,
      participantCount: 0,
      liquidityPercentage,
      lpLockDuration: BigInt(lpLockDuration),
      dexPlatform,
    })

    return NextResponse.json({
      success: true,
      data: { projectId },
      message: 'Project created successfully'
    })
  } catch (error: any) {
    console.error('Create project error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
