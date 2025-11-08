# Smart Contracts - Artifacts Organization

This directory contains all the smart contracts for the 10x_Swap project with a centralized artifacts structure.

## Directory Structure

```
smart_contracts/
├── artifacts/                    # 📦 All compiled contract artifacts
│   ├── multihop_swap/           # MultihopSwapRouter & Adapters artifacts
│   │   ├── MultihopSwapRouter.approval.teal
│   │   ├── MultihopSwapRouter.clear.teal
│   │   ├── MultihopSwapRouter.arc56.json
│   │   ├── PactPoolAdapter.approval.teal
│   │   ├── PactPoolAdapter.clear.teal
│   │   ├── PactPoolAdapter.arc56.json
│   │   └── ...
│   └── autopilot_rule/          # AutoPilot contract artifacts
│       ├── AutoPilotRuleContract.approval.teal
│       ├── AutoPilotRuleContract.clear.teal
│       ├── AutoPilotRuleContract.arc56.json
│       └── ...
│
├── multihop_swap/               # 🔄 MultihopSwapRouter source code
│   ├── contract.py              # Main router contract
│   ├── pact_adapter.py          # Pact DEX adapter
│   ├── tinyman_adapter.py       # Tinyman DEX adapter
│   ├── deploy_pact_adapter.py   # Deployment script
│   └── opt_in_adapter_assets.py # Asset opt-in helper
│
├── autopilot_rule/              # 🤖 AutoPilot Rule Engine source
│   ├── contract.py              # AutoPilot contract
│   └── deploy_config.py         # Deployment configuration
│
├── compile_all.sh               # 🔨 Compile all contracts script
└── __main__.py
```

## Compiling Contracts

### Compile All Contracts (Recommended)

```bash
cd smart_contracts
./compile_all.sh
```

This script will:
1. Compile all contracts (MultihopSwapRouter, PactPoolAdapter, TinymanPoolAdapter, AutoPilotRuleContract)
2. Automatically move all artifacts to the centralized `artifacts/` directory
3. Organize them by contract type

### Compile Individual Contracts

```bash
# Compile MultihopSwapRouter
cd multihop_swap
algokit compile py contract.py
# Then manually move *.teal, *.arc56.json, *.puya.map to ../artifacts/multihop_swap/

# Compile PactPoolAdapter
cd multihop_swap
algokit compile py pact_adapter.py
# Then manually move artifacts to ../artifacts/multihop_swap/

# Compile AutoPilotRuleContract
cd autopilot_rule
algokit compile py contract.py
# Then manually move artifacts to ../artifacts/autopilot_rule/
```

## Deploying Contracts

All deployment scripts automatically look for artifacts in the centralized `artifacts/` directory.

### Deploy Pact Pool Adapter

```bash
cd multihop_swap
python3 deploy_pact_adapter.py
```

The deployment script will automatically:
- Load compiled artifacts from `../artifacts/multihop_swap/`
- Read deployer mnemonic from `.env.local`
- Deploy to Algorand testnet
- Fund the contract
- Save deployment info

### Opt Adapter into Assets

```bash
cd multihop_swap
python3 opt_in_adapter_assets.py
```

## Benefits of Centralized Artifacts

✅ **Organized**: All compiled outputs in one place  
✅ **Clean**: Source directories stay clean  
✅ **Version Control**: Easier to `.gitignore` all artifacts  
✅ **Deployment**: Scripts know exactly where to find artifacts  
✅ **Maintenance**: Easy to clean and rebuild all artifacts  

## Cleaning Artifacts

To clean all compiled artifacts:

```bash
rm -rf artifacts/multihop_swap/* artifacts/autopilot_rule/*
```

Then recompile with `./compile_all.sh`

## Notes

- All `.teal`, `.arc56.json`, and `.puya.map` files are stored in `artifacts/`
- Source `.py` files remain in their respective directories
- Deployment scripts are co-located with their source contracts
- The `compile_all.sh` script handles the organization automatically
