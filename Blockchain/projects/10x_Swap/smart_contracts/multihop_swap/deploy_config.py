import logging
from collections.abc import Callable

import algokit_utils
from algosdk.v2client.algod import AlgodClient
from algosdk.v2client.indexer import IndexerClient

logger = logging.getLogger(__name__)


def deploy(
    algod_client: AlgodClient,
    indexer_client: IndexerClient,
    app_spec: algokit_utils.ApplicationSpecification,
    deployer: algokit_utils.Account,
) -> None:
    """
    Deploy the multihop swap router contract
    """
    
    from smart_contracts.artifacts.multihop_swap.MultihopSwapRouter import (
        MultihopSwapRouter,
    )
    
    app_client = algokit_utils.ApplicationClient(
        algod_client,
        app_spec,
        signer=deployer,
    )
    
    # Deploy the contract
    app_client.deploy(
        on_schema_break=algokit_utils.OnSchemaBreak.AppendApp,
        on_update=algokit_utils.OnUpdate.AppendApp,
    )
    
    logger.info(
        f"Deployed Multihop Swap Router with app ID: {app_client.app_id} "
        f"at address: {app_client.app_address}"
    )
    
    # Fund the contract with some ALGO for fees
    algod_client.send_payment(
        deployer.address,
        app_client.app_address,
        1_000_000,  # 1 ALGO
    )
    
    logger.info("Funded contract with 1 ALGO for transaction fees")
    
    # Opt the contract into common testnet assets
    # You'll need to add the testnet asset IDs here
    testnet_assets = [
        31566704,  # USDC testnet
        # Add more testnet asset IDs
    ]
    
    for asset_id in testnet_assets:
        try:
            app_client.call(
                MultihopSwapRouter.opt_into_asset,
                asset=asset_id,
            )
            logger.info(f"Opted into asset {asset_id}")
        except Exception as e:
            logger.warning(f"Failed to opt into asset {asset_id}: {e}")
