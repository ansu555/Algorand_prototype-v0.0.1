import logging
from algokit_utils import (
    Account,
    ApplicationClient,
    ApplicationSpecification,
    TransferAssetParameters,
    transfer_asset,
)
from algosdk.v2client.algod import AlgodClient
from algosdk.v2client.indexer import IndexerClient
from algosdk import transaction
from algosdk.atomic_transaction_composer import TransactionWithSigner

# Import the contract spec (assuming it's compiled to artifacts)
# In a real setup, you'd import the factory or spec from the build output
# For this script, we'll assume the user runs `algokit project deploy` or similar
# This is a template for the deployment logic

logger = logging.getLogger(__name__)

def deploy(
    algod_client: AlgodClient,
    indexer_client: IndexerClient,
    app_spec: ApplicationSpecification,
    deployer: Account,
) -> None:
    app_client = ApplicationClient(
        algod_client=algod_client,
        app_spec=app_spec,
        signer=deployer,
    )

    # 1. Deploy the app
    app_id, app_addr, tx_id = app_client.create()
    logger.info(f"Deployed app with ID: {app_id} Address: {app_addr}")

    # 2. Create a test ASA (Token)
    # In production, this would be the token created by the user
    sp = algod_client.suggested_params()
    txn = transaction.AssetConfigTxn(
        sender=deployer.address,
        sp=sp,
        total=1_000_000_000_000,
        decimals=6,
        default_frozen=False,
        unit_name="TEST",
        asset_name="Test Token",
    )
    signed_txn = txn.sign(deployer.private_key)
    tx_id = algod_client.send_transaction(signed_txn)
    result = transaction.wait_for_confirmation(algod_client, tx_id, 4)
    asa_id = result["asset-index"]
    logger.info(f"Created ASA with ID: {asa_id}")

    # 3. Fund the app with ALGO (for MBR and fees)
    # App needs MBR for opting into ASA + box storage
    app_client.fund(2_000_000) # 2 ALGO
    logger.info("Funded app with 2 ALGO")

    # 4. Configure the sale
    # Params:
    # total_supply=1M, tokens_for_sale=800k, start=0.1A, target=1A, bonding=1000A
    # curve=0 (Linear), max_tx=10k, max_user=50k, liq=80%, lock=30d
    
    tokens_for_sale = 800_000_000_000
    
    app_client.call(
        "configure",
        asa=asa_id,
        total_supply=1_000_000_000_000,
        tokens_for_sale=tokens_for_sale,
        start_price=100_000, # 0.1 ALGO (microAlgos)
        target_price=1_000_000, # 1 ALGO
        bonding_target=1_000_000_000, # 1000 ALGO
        curve_type=0, # Linear
        max_buy_per_tx=10_000_000_000, # 10k tokens
        max_buy_per_user=50_000_000_000, # 50k tokens
        liquidity_percent=80,
        liquidity_lock_days=30
    )
    logger.info("Configured sale parameters")

    # 5. Bootstrap (Opt-in to ASA)
    # Need to send some tokens to the app first? 
    # Actually, bootstrap opts the app in. Then we send tokens.
    
    app_client.call("bootstrap", asa=asa_id)
    logger.info("Bootstrapped (App opted-in to ASA)")
    
    # 6. Send tokens to App (Fund the sale)
    transfer_asset(
        algod_client,
        TransferAssetParameters(
            from_account=deployer,
            to_address=app_addr,
            asset_id=asa_id,
            amount=tokens_for_sale,
        )
    )
    logger.info(f"Sent {tokens_for_sale} tokens to App")
    
    logger.info("🚀 Launchpad is ready!")
