"""
AlgoKit smart contracts build and deployment entry point
"""
import logging
import sys
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)s: %(message)s",
)

logger = logging.getLogger(__name__)


def build() -> None:
    """Build all smart contracts in the project"""
    logger.info("Building smart contracts...")
    
    import subprocess
    
    # Get the smart contracts directory
    smart_contracts_dir = Path(__file__).parent
    artifacts_dir = smart_contracts_dir / "artifacts"
    artifacts_dir.mkdir(exist_ok=True)
    
    # Build AutoPilot Rule Contract
    autopilot_dir = smart_contracts_dir / "autopilot_rule"
    if (autopilot_dir / "contract.py").exists():
        logger.info("Building AutoPilot Rule Contract...")
        try:
            result = subprocess.run(
                [
                    "puyapy",
                    str(autopilot_dir / "contract.py"),
                    "--out-dir",
                    str(artifacts_dir / "autopilot_rule"),
                ],
                capture_output=True,
                text=True,
                check=True,
            )
            if result.stdout:
                logger.debug(result.stdout)
            logger.info("✅ AutoPilot Rule Contract built successfully")
        except subprocess.CalledProcessError as e:
            logger.error(f"❌ Failed to build AutoPilot Rule Contract:")
            logger.error(e.stderr)
            raise
        except Exception as e:
            logger.error(f"❌ Failed to build AutoPilot Rule Contract: {e}")
            raise
    
    # Build Multihop Swap Router
    multihop_dir = smart_contracts_dir / "multihop_swap"
    if (multihop_dir / "contract.py").exists():
        logger.info("Building Multihop Swap Router...")
        try:
            result = subprocess.run(
                [
                    "puyapy",
                    str(multihop_dir / "contract.py"),
                    "--out-dir",
                    str(artifacts_dir / "multihop_swap"),
                ],
                capture_output=True,
                text=True,
                check=True,
            )
            if result.stdout:
                logger.debug(result.stdout)
            logger.info("✅ Multihop Swap Router built successfully")
        except subprocess.CalledProcessError as e:
            logger.error(f"❌ Failed to build Multihop Swap Router:")
            logger.error(e.stderr)
        except Exception as e:
            logger.error(f"❌ Failed to build Multihop Swap Router: {e}")
    
    # Build Tinyman Adapter
    if (multihop_dir / "tinyman_adapter.py").exists():
        logger.info("Building Tinyman Adapter...")
        try:
            result = subprocess.run(
                [
                    "puyapy",
                    str(multihop_dir / "tinyman_adapter.py"),
                    "--out-dir",
                    str(artifacts_dir / "tinyman_adapter"),
                ],
                capture_output=True,
                text=True,
                check=True,
            )
            if result.stdout:
                logger.debug(result.stdout)
            logger.info("✅ Tinyman Adapter built successfully")
        except subprocess.CalledProcessError as e:
            logger.error(f"❌ Failed to build Tinyman Adapter:")
            logger.error(e.stderr)
        except Exception as e:
            logger.error(f"❌ Failed to build Tinyman Adapter: {e}")
    
    logger.info("🎉 Build complete!")
    logger.info(f"📁 Artifacts saved to: {artifacts_dir}")


def deploy() -> None:
    """Deploy smart contracts"""
    logger.info("Deploying smart contracts...")
    
    # Import deployment modules
    from algosdk.v2client.algod import AlgodClient
    from algosdk import account, mnemonic
    import os
    from dotenv import load_dotenv
    
    # Load environment variables
    load_dotenv()
    
    # Get network configuration
    network = os.getenv("ALGORAND_NETWORK", "testnet")
    
    if network == "testnet":
        algod_token = os.getenv("ALGOD_TOKEN", "a" * 64)
        algod_server = os.getenv("ALGOD_SERVER", "https://testnet-api.algonode.cloud")
    elif network == "mainnet":
        algod_token = os.getenv("ALGOD_TOKEN", "a" * 64)
        algod_server = os.getenv("ALGOD_SERVER", "https://mainnet-api.algonode.cloud")
    else:
        # LocalNet
        algod_token = "a" * 64
        algod_server = "http://localhost:4001"
    
    # Create Algod client
    algod_client = AlgodClient(algod_token, algod_server)
    
    # Get deployer account
    deployer_mnemonic = os.getenv("DEPLOYER_MNEMONIC")
    if not deployer_mnemonic:
        logger.error("❌ DEPLOYER_MNEMONIC not set in environment")
        logger.info("Please set DEPLOYER_MNEMONIC in your .env file")
        sys.exit(1)
    
    try:
        deployer_private_key = mnemonic.to_private_key(deployer_mnemonic)
        deployer_address = account.address_from_private_key(deployer_private_key)
    except Exception as e:
        logger.error(f"❌ Invalid deployer mnemonic: {e}")
        sys.exit(1)
    
    logger.info(f"Deploying to {network.upper()}")
    logger.info(f"Deployer address: {deployer_address}")
    
    # Check deployer balance
    try:
        account_info = algod_client.account_information(deployer_address)
        balance_algo = account_info["amount"] / 1_000_000
        logger.info(f"Deployer balance: {balance_algo:.6f} ALGO")
        
        if balance_algo < 1:
            logger.warning(f"⚠️  Low balance! You may need more ALGO for deployment")
            if network == "testnet":
                logger.info(f"Get testnet ALGO from: https://bank.testnet.algorand.network/?account={deployer_address}")
    except Exception as e:
        logger.error(f"❌ Could not check deployer balance: {e}")
        sys.exit(1)
    
    # Deploy contracts
    logger.info("\n" + "="*60)
    logger.info("Starting deployment...")
    logger.info("="*60 + "\n")
    
    # Here you can add deployment logic for each contract
    # For now, we'll just log what would be deployed
    logger.info("📦 AutoPilot Rule Contract - Ready for deployment")
    logger.info("📦 Multihop Swap Router - Ready for deployment")
    logger.info("📦 Tinyman Adapter - Ready for deployment")
    
    logger.info("\n" + "="*60)
    logger.info("To deploy, run the specific deployment scripts:")
    logger.info("  python smart_contracts/autopilot_rule/deploy_config.py")
    logger.info("  python deploy_tinyman_adapter.py")
    logger.info("="*60)


def main() -> None:
    """Main entry point"""
    if len(sys.argv) < 2:
        logger.error("Usage: python -m smart_contracts <command>")
        logger.error("Commands: build, deploy")
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "build":
        build()
    elif command == "deploy":
        deploy()
    else:
        logger.error(f"Unknown command: {command}")
        logger.error("Available commands: build, deploy")
        sys.exit(1)


if __name__ == "__main__":
    main()
