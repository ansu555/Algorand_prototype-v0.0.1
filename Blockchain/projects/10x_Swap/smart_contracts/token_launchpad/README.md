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

### Compilation & Deployment

1. **Compile**:
   Use `algokit` to compile the contract.
   ```bash
   algokit project run build
   ```

2. **Deploy**:
   Run the deployment script.
   ```bash
   python deploy.py
   ```

## Contract Methods

- `create()`: Initialize the application.
- `configure(...)`: Set sale parameters (Creator only, Prelaunch).
- `bootstrap(asa)`: Opt-in to the ASA (Creator only).
- `buy(quantity, payment)`: Buy tokens.
- `finalize()`: Trigger liquidity provision (Creator only, when completed).
