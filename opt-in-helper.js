// Quick opt-in helper for testnet assets
// Run this in browser console on your swap page

async function optInToAsset(assetId) {
  try {
    const response = await fetch('/api/asset/optin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assetId })
    });
    
    const result = await response.json();
    console.log(`Opt-in result for asset ${assetId}:`, result);
  } catch (error) {
    console.error(`Opt-in failed for asset ${assetId}:`, error);
  }
}

// Opt into USDC and USDT
optInToAsset(67395862); // USDC
optInToAsset(67396430); // USDT
