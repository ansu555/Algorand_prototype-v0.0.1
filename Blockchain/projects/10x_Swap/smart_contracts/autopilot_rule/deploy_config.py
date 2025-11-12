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
    import base64
    from algosdk import account, mnemonic
    from algosdk.abi.method import Method
    from algosdk.v2client.algod import AlgodClient
    import algosdk.transaction
    import algosdk.logic
    
    # Load environment variables from project root
    import os
    from dotenv import load_dotenv
    from pathlib import Path
    
    # Load from project root .env
    # Path: autopilot_rule -> smart_contracts -> 10x_Swap -> projects -> Blockchain -> Algorand_prototype-v0.0.1
    env_path = Path(__file__).parent.parent.parent.parent.parent.parent / ".env"
    load_dotenv(env_path)
    
    # Connect to Algorand node
    algod_token = os.getenv("ALGOD_TOKEN", "a" * 64)
    algod_server = os.getenv("ALGOD_SERVER", "https://testnet-api.algonode.cloud")
    
    algod = AlgodClient(algod_token, algod_server)
    
    # Load deployer account
    deployer_mnemonic = os.getenv("ALGORAND_MNEMONIC")
    if not deployer_mnemonic:
        raise ValueError("ALGORAND_MNEMONIC not set in .env")
    
    deployer_private_key = mnemonic.to_private_key(deployer_mnemonic)
    deployer_address = account.address_from_private_key(deployer_private_key)
    
    deployer_account = algokit_utils.Account(
        private_key=deployer_private_key,
        address=deployer_address,
    )
    
    # Load application spec from root artifacts folder
    # Path: Algorand_prototype-v0.0.1/artifacts/autopilot_rule/
    # Go up: autopilot_rule -> smart_contracts -> 10x_Swap -> projects -> Blockchain -> Algorand_prototype-v0.0.1
    spec_path = Path(__file__).parent.parent.parent.parent.parent.parent / "artifacts" / "autopilot_rule" / "AutoPilotRuleContract.arc56.json"
    
    if not spec_path.exists():
        raise FileNotFoundError(f"App spec not found: {spec_path}\n   Please compile the contract first using: algokit compile py contract.py")
    
    with open(spec_path) as f:
        app_spec_dict = json.load(f)
    
    # Load approval and clear programs
    approval_path = spec_path.parent / "AutoPilotRuleContract.approval.teal"
    clear_path = spec_path.parent / "AutoPilotRuleContract.clear.teal"
    
    with open(approval_path) as f:
        approval_teal = f.read()
    with open(clear_path) as f:
        clear_teal = f.read()
    
    # Compile programs
    approval_result = algod.compile(approval_teal)
    clear_result = algod.compile(clear_teal)
    
    approval_program = base64.b64decode(approval_result["result"])
    clear_program = base64.b64decode(clear_result["result"])
    
    # Get suggested parameters
    params = algod.suggested_params()
    
    # Define state schema (from contract)
    global_schema = algosdk.transaction.StateSchema(
        num_uints=4,  # rule_counter, total_executions, protocol_fee_bps, is_paused
        num_byte_slices=1  # protocol_treasury
    )
    local_schema = algosdk.transaction.StateSchema(num_uints=0, num_byte_slices=0)
    
    # Create application
    txn = algosdk.transaction.ApplicationCreateTxn(
        sender=deployer_address,
        sp=params,
        on_complete=algosdk.transaction.OnComplete.NoOpOC,
        approval_program=approval_program,
        clear_program=clear_program,
        global_schema=global_schema,
        local_schema=local_schema,
        extra_pages=3,  # For larger contract
        app_args=[Method.from_signature("create_application()string").get_selector()],
    )
    
    # Sign and send
    signed_txn = txn.sign(deployer_private_key)
    tx_id = algod.send_transaction(signed_txn)
    print(f"Transaction sent: {tx_id}")
    
    # Wait for confirmation
    result = algosdk.transaction.wait_for_confirmation(algod, tx_id, 4)
    app_id = result["application-index"]
    
    print(f"\n✅ AutoPilot Rule Contract deployed!")
    print(f"   App ID: {app_id}")
    print(f"   Transaction: {tx_id}")
    
    # Calculate app address
    app_address = algosdk.logic.get_application_address(app_id)
    print(f"   App Address: {app_address}")
    
    # Fund the contract
    print(f"\n💰 Funding contract with 2 ALGO...")
    funding_txn = algosdk.transaction.PaymentTxn(
        sender=deployer_address,
        sp=algod.suggested_params(),
        receiver=app_address,
        amt=2_000_000,  # 2 ALGO for box storage and inner transactions
    )
    signed_funding = funding_txn.sign(deployer_private_key)
    funding_tx_id = algod.send_transaction(signed_funding)
    algosdk.transaction.wait_for_confirmation(algod, funding_tx_id, 4)
    print(f"   Funded! Transaction: {funding_tx_id}")
    
    # Save deployment info
    deployment_info = {
        "app_id": app_id,
        "app_address": app_address,
        "transaction_id": tx_id,
        "funding_transaction_id": funding_tx_id,
        "deployer": deployer_address,
        "network": algod_server,
        "timestamp": result.get("confirmed-round-time", 0)
    }
    
    # Save to files
    id_file = Path(__file__).parent / "deployed_app_id.txt"
    id_file.write_text(f"{app_id}\n")
    
    json_file = Path(__file__).parent / "deployed_autopilot.json"
    with open(json_file, "w") as f:
        json.dump(deployment_info, f, indent=2)
    
    print(f"\n📝 Deployment info saved:")
    print(f"   - {id_file}")
    print(f"   - {json_file}")
    print(f"\n🔗 View on AlgoExplorer:")
    print(f"   https://testnet.algoexplorer.io/application/{app_id}")
    print(f"\n✅ Deployment complete!")

