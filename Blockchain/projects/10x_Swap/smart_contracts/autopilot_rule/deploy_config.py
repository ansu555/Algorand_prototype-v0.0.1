"""
Deployment configuration for AutoPilot Rule Contract
"""

import logging
from pathlib import Path

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
    Deploy the AutoPilot Rule Contract
    
    Args:
        algod_client: Algorand client
        indexer_client: Indexer client
        app_spec: Application specification
        deployer: Deployer account
    """
    
    from algokit_utils import (
        ApplicationClient,
        get_localnet_default_account,
    )
    
    logger.info("=== Deploying AutoPilot Rule Contract ===")
    
    # Create application client
    app_client = ApplicationClient(
        algod_client=algod_client,
        app_spec=app_spec,
        signer=deployer,
    )
    
    # Deploy application
    logger.info("Creating application...")
    app_client.create()
    
    logger.info(f"✅ AutoPilot Rule Contract deployed!")
    logger.info(f"   App ID: {app_client.app_id}")
    logger.info(f"   App Address: {app_client.app_address}")
    
    # Fund the contract with some ALGO for inner transactions
    logger.info("Funding contract...")
    from algosdk.transaction import PaymentTxn
    
    params = algod_client.suggested_params()
    funding_txn = PaymentTxn(
        sender=deployer.address,
        sp=params,
        receiver=app_client.app_address,
        amt=1_000_000,  # 1 ALGO for inner transaction fees
    )
    
    signed_txn = funding_txn.sign(deployer.private_key)
    txid = algod_client.send_transaction(signed_txn)
    
    from algosdk.transaction import wait_for_confirmation
    wait_for_confirmation(algod_client, txid, 4)
    
    logger.info("✅ Contract funded with 1 ALGO")
    
    # Log contract information
    logger.info("\n=== Contract Information ===")
    logger.info(f"App ID: {app_client.app_id}")
    logger.info(f"App Address: {app_client.app_address}")
    logger.info(f"Deployer: {deployer.address}")
    logger.info(f"Network: {algod_client.algod_address}")
    
    # Get contract stats
    try:
        result = app_client.call(
            "get_contract_stats",
        )
        logger.info(f"Contract Stats: {result.return_value}")
    except Exception as e:
        logger.warning(f"Could not fetch contract stats: {e}")
    
    logger.info("\n=== Deployment Complete ===")
    logger.info(f"Save this App ID for future use: {app_client.app_id}")
    
    # Save app ID to file
    config_path = Path(__file__).parent / "deployed_app_id.txt"
    config_path.write_text(f"{app_client.app_id}\n")
    logger.info(f"App ID saved to: {config_path}")


# If run directly
if __name__ == "__main__":
    import json
    from algosdk import account, mnemonic
    from algosdk.v2client.algod import AlgodClient
    
    # Load environment variables
    import os
    from dotenv import load_dotenv
    load_dotenv()
    
    # Connect to Algorand node
    algod_token = os.getenv("ALGOD_TOKEN", "a" * 64)
    algod_server = os.getenv("ALGOD_SERVER", "https://testnet-api.algonode.cloud")
    
    algod = AlgodClient(algod_token, algod_server)
    
    # Load deployer account
    deployer_mnemonic = os.getenv("DEPLOYER_MNEMONIC")
    if not deployer_mnemonic:
        raise ValueError("DEPLOYER_MNEMONIC not set in .env")
    
    deployer_private_key = mnemonic.to_private_key(deployer_mnemonic)
    deployer_address = account.address_from_private_key(deployer_private_key)
    
    deployer_account = algokit_utils.Account(
        private_key=deployer_private_key,
        address=deployer_address,
    )
    
    # Load application spec from root artifacts folder
    # Path: Algorand_prototype-v0.0.1/artifacts/autopilot_rule/
    # Go up: autopilot_rule -> smart_contracts -> 10x_Swap -> projects -> Blockchain -> Algorand_prototype-v0.0.1
    spec_path = Path(__file__).parent.parent.parent.parent.parent / "artifacts" / "autopilot_rule" / "AutoPilotRuleContract.arc56.json"
    
    if not spec_path.exists():
        raise FileNotFoundError(f"App spec not found: {spec_path}\n   Please compile the contract first using: algokit compile py contract.py")
    
    with open(spec_path) as f:
        app_spec_dict = json.load(f)
    
    app_spec = algokit_utils.ApplicationSpecification.from_json(app_spec_dict)
    
    # Deploy
    deploy(
        algod_client=algod,
        indexer_client=None,  # Not needed for deployment
        app_spec=app_spec,
        deployer=deployer_account,
    )
