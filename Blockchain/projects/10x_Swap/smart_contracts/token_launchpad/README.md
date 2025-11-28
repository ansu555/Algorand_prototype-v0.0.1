# Token Launchpad Smart Contract

This directory contains the Algorand smart contract for the Token Launchpad.

## Structure

- `contract.py`: The main smart contract logic using Algorand Python (Puya).
- `deploy.py`: Deployment script using AlgoKit Utils.

## Features

- **Bonding Curves**: Supports Linear, Exponential (Cubic approximation), and Sigmoid (Quadratic) pricing.
- **Fair Launch**: No pre-sale, equal opportunity.
- **Anti-Bot**: Configurable max buy per transaction and per user.
- **Liquidity**: Automatically manages funds for liquidity provision (placeholder logic in prototype).

## Usage

### Prerequisites
- AlgoKit installed
- Python 3.10+
- Docker (for LocalNet)

## Development Workflow

### 1. Compile Contract

Compile the contract to generate TEAL and ABI files:

```bash
# Option 1: Use the helper script (recommended)
./compile.sh

# Option 2: Use algokit directly
algokit compile py contract.py --out-dir ../../../../../../artifacts/token_launchpad
```

**Artifacts are saved to**: `/artifacts/token_launchpad/`
- `TokenLaunchpad.approval.teal` - Approval program
- `TokenLaunchpad.clear.teal` - Clear state program
- `TokenLaunchpad.arc56.json` - ABI specification (ARC-56 format)
- `*.puya.map` - Source maps for debugging

### 2. Deploy to TestNet

```bash
python3 deploy_testnet.py
```

The script will:
- Load TEAL files from `/artifacts/token_launchpad/`
- Deploy the contract to Algorand TestNet
- Save deployment info to `/artifacts/token_launchpad/deployment_testnet.json`

### 3. Update Frontend

After deployment, update your frontend `.env` file:

```bash
NEXT_PUBLIC_LAUNCHPAD_APP_ID=<your_app_id>
```

Or the fallback will use the App ID from `deployment_testnet.json`.

## Contract Methods

- `create()`: Initialize the application.
- `configure(...)`: Set sale parameters (Creator only, Prelaunch).
- `bootstrap(asa)`: Opt-in to the ASA (Creator only).
- `buy(quantity, payment)`: Buy tokens.
- `finalize()`: Trigger liquidity provision (Creator only, when completed).
