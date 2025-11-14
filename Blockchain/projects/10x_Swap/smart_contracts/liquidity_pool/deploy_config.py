"""
Deployment configuration for Liquidity Pool Contract
"""

import logging
from pathlib import Path

from algosdk.v2client.algod import AlgodClient
from algosdk.transaction import PaymentTxn, wait_for_confirmation

logger = logging.getLogger(__name__)


def deploy(
    algod_client: AlgodClient,
    deployer_address: str,
    deployer_private_key: str,
    approval_program: bytes,
    clear_program: bytes,
) -> tuple[int, str]:
    """
    Deploy the Liquidity Pool Contract

    Args:
        algod_client: Algorand client
        deployer_address: Deployer account address
        deployer_private_key: Deployer private key
        approval_program: Compiled approval program
        clear_program: Compiled clear program

    Returns:
        Tuple of (app_id, app_address)
    """
    from algosdk.transaction import ApplicationCreateTxn, OnComplete, StateSchema

    logger.info("=== Deploying Liquidity Pool Contract ===")

    # Define schema (from contract: 7 uint64s + 1 bool = 8 global uints, 0 byte slices)
    global_schema = StateSchema(num_uints=8, num_byte_slices=0)
    local_schema = StateSchema(num_uints=0, num_byte_slices=0)

    # Get suggested params
    params = algod_client.suggested_params()

    # Create application transaction
    logger.info("Creating application...")
    txn = ApplicationCreateTxn(
        sender=deployer_address,
        sp=params,
        on_complete=OnComplete.NoOpOC,
        approval_program=approval_program,
        clear_program=clear_program,
        global_schema=global_schema,
        local_schema=local_schema,
    )

    # Sign and send
    signed_txn = txn.sign(deployer_private_key)
    tx_id = algod_client.send_transaction(signed_txn)

    # Wait for confirmation
    logger.info(f"Waiting for confirmation... (txid: {tx_id})")
    wait_for_confirmation(algod_client, tx_id, 4)

    # Get application ID from transaction
    ptx = algod_client.pending_transaction_info(tx_id)
    app_id = ptx["application-index"]
    app_address = algosdk.logic.get_application_address(app_id)

    logger.info(f"✅ Liquidity Pool Contract deployed!")
    logger.info(f"   App ID: {app_id}")
    logger.info(f"   App Address: {app_address}")

    # Fund the contract with ALGO for:
    # - Minimum balance
    # - Asset opt-ins (2x 0.1 ALGO)
    # - LP token creation (0.1 ALGO)
    # - Inner transaction fees
    logger.info("Funding contract...")

    params = algod_client.suggested_params()
    funding_amount = 5_000_000  # 5 ALGO
    funding_txn = PaymentTxn(
        sender=deployer_address,
        sp=params,
        receiver=app_address,
        amt=funding_amount,
    )

    signed_txn = funding_txn.sign(deployer_private_key)
    txid = algod_client.send_transaction(signed_txn)
    wait_for_confirmation(algod_client, txid, 4)

    logger.info(f"✅ Contract funded with {funding_amount / 1_000_000} ALGO")

    # Log contract information
    logger.info("\n=== Contract Information ===")
    logger.info(f"App ID: {app_id}")
    logger.info(f"App Address: {app_address}")
    logger.info(f"Deployer: {deployer_address}")
    logger.info(f"Network: {algod_client.algod_address}")

    # Save app ID to file
    config_path = Path(__file__).parent / "deployed_app_id.txt"
    config_path.write_text(f"{app_id}\n")
    logger.info(f"App ID saved to: {config_path}")

    logger.info("\n=== Deployment Complete ===")
    logger.info(f"Use this App ID in your frontend: {app_id}")

    return app_id, app_address


# If run directly
if __name__ == "__main__":
    import base64
    import os
    import algosdk
    from algosdk import account, mnemonic
    from algosdk.v2client.algod import AlgodClient
    from dotenv import load_dotenv

    # Setup logging
    logging.basicConfig(level=logging.INFO)

    # Load .env from project root (4 levels up from this script)
    env_path = Path(__file__).parent.parent.parent.parent.parent.parent / '.env'
    if env_path.exists():
        load_dotenv(env_path)
        logger.info(f"Loaded environment from {env_path}")
    else:
        logger.warning(f"No .env file found at {env_path}")

    # Load environment
    network = os.getenv("ALGORAND_NETWORK", "testnet")

    if network == "testnet":
        algod_address = "https://testnet-api.algonode.cloud"
        algod_token = ""
    else:
        # Localnet
        algod_address = "http://localhost:4001"
        algod_token = "a" * 64

    # Create client
    algod_client = AlgodClient(algod_token, algod_address)

    # Load deployer account
    # Hardcoded for deployment (REMOVE BEFORE COMMITTING TO GIT!)
    deployer_mnemonic = "observe churn system canvas damage endorse leopard flag globe bar device west craft glide bridge angry brother salad stadium argue olive remove version about ship"
    logger.info(f"Word count: {len(deployer_mnemonic.split())}")

    deployer_private_key = mnemonic.to_private_key(deployer_mnemonic)
    deployer_address = account.address_from_private_key(deployer_private_key)

    logger.info(f"Deployer address: {deployer_address}")

    # Load TEAL programs
    # Go up to project root: deploy_config.py -> liquidity_pool -> smart_contracts -> 10x_Swap -> projects -> Blockchain -> Algorand_prototype-v0.0.1
    artifacts_dir = Path(__file__).parent.parent.parent.parent.parent.parent / "artifacts" / "liquidity_pool"

    approval_teal_path = artifacts_dir / "LiquidityPoolContract.approval.teal"
    clear_teal_path = artifacts_dir / "LiquidityPoolContract.clear.teal"

    if not approval_teal_path.exists():
        logger.error(f"Approval program not found at {approval_teal_path}")
        logger.info("Run './compile_all.sh' first to compile the contract")
        exit(1)

    if not clear_teal_path.exists():
        logger.error(f"Clear program not found at {clear_teal_path}")
        logger.info("Run './compile_all.sh' first to compile the contract")
        exit(1)

    # Read TEAL source
    with open(approval_teal_path) as f:
        approval_teal = f.read()

    with open(clear_teal_path) as f:
        clear_teal = f.read()

    # Compile programs
    logger.info("Compiling TEAL programs...")
    approval_result = algod_client.compile(approval_teal)
    clear_result = algod_client.compile(clear_teal)

    approval_program = base64.b64decode(approval_result["result"])
    clear_program = base64.b64decode(clear_result["result"])

    # Deploy
    app_id, app_address = deploy(
        algod_client,
        deployer_address,
        deployer_private_key,
        approval_program,
        clear_program,
    )
