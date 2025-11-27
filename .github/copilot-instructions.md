# Copilot Instructions for 10xSwap Algorand DEX

## Project Overview

10xSwap is a comprehensive Algorand ecosystem platform featuring:
- **AI-Powered DEX** with natural language trading and portfolio management
- **WaveBreak Token Launchpad** with bonding curves and anti-bot protection
- **X Token Rewards System** with quests, levels, streaks, and badges
- **Multi-DEX Aggregation** across Tinyman and Pact
- **Automated Trading** with Auto-Pilot rules for DCA, rebalancing, and rotation strategies

## Tech Stack

### Frontend
- **Framework**: Next.js 15+ with App Router
- **Language**: TypeScript (strict mode enabled)
- **UI**: React 18, Tailwind CSS, Shadcn UI components
- **State Management**: Redux Toolkit, React Query
- **Styling**: Tailwind CSS with dark mode support

### Backend
- **Runtime**: Node.js serverless functions (Next.js API routes)
- **Database**: SQLite with LibSQL client
- **AI**: LangChain, OpenAI

### Blockchain
- **Network**: Algorand (MainNet and TestNet)
- **Smart Contracts**: PyTeal (Python), Beaker framework
- **SDKs**: algosdk (TypeScript), py-algorand-sdk (Python)
- **DEX Integration**: Tinyman SDK, Pact SDK
- **Wallets**: Pera, Defly, MyAlgo, WalletConnect

## Project Structure

```
src/
├── app/                    # Next.js App Router (pages & API routes)
│   ├── (marketing)/        # Public pages
│   ├── (dashboard)/        # Protected dashboard pages
│   │   ├── agent/          # AI agent interface
│   │   ├── wallet/         # Wallet management
│   │   └── swap-demo/      # Token swap demo
│   ├── launchpad/          # WaveBreak token launchpad
│   ├── rewards/            # X Token rewards system
│   └── api/                # API routes (serverless functions)
├── components/             # React components
│   ├── features/           # Feature-specific components
│   ├── layout/             # Layout components
│   ├── ui/                 # Base UI components (Shadcn)
│   └── providers/          # React Context providers
├── lib/                    # Core business logic & utilities
│   ├── agent.ts            # AI agent configuration
│   ├── algorand.ts         # Algorand SDK functions
│   ├── launchpad/          # Launchpad business logic
│   └── rewards/            # Rewards system logic
├── hooks/                  # Custom React hooks
├── features/               # Redux slices
└── styles/                 # Global styles

Blockchain/                 # Smart contract projects
└── projects/10x_Swap/      # Algorand smart contracts (PyTeal)
```

## Coding Standards

### TypeScript
- Use strict TypeScript mode
- Prefer interfaces over types for object shapes
- Use type inference where possible
- Avoid `any` - use `unknown` or proper types
- Use path aliases: `@/` for `./src/`

### React/Next.js
- Use functional components with hooks
- Prefer server components by default, add `"use client"` only when needed
- Use Next.js App Router patterns (layouts, loading, error boundaries)
- Follow React best practices: proper key props, avoid inline functions in JSX
- Use React Query for data fetching and caching

### Styling
- Use Tailwind CSS utility classes
- Follow existing component patterns from Shadcn UI
- Support dark mode (use `dark:` variants)
- Ensure responsive design (use responsive prefixes: `sm:`, `md:`, `lg:`, `xl:`)

### Smart Contracts (Python/PyTeal)
- Follow Algorand smart contract best practices
- Use Beaker framework for ABI methods
- Include comprehensive error handling
- Test on TestNet before MainNet deployment
- Document all contract methods and state schema

## Development Commands

### Build and Run
```bash
npm run dev          # Start development server
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Testing
```bash
npm run test:algorand  # Test Algorand integration
npm run test:swap      # Test swap functionality
npm run test:agent     # Test AI agent
```

### Smart Contracts
```bash
# From Blockchain/projects/10x_Swap/
python smart_contracts/[contract]/deploy_config.py
```

## Key Patterns

### Algorand Integration
- Use `algosdk` for all Algorand operations
- Always handle transaction signing and confirmation
- Support multiple wallet providers via `@txnlab/use-wallet-react`
- Use proper error handling for blockchain operations

### API Routes
- Follow RESTful conventions
- Use proper HTTP status codes
- Return consistent JSON response format
- Include error handling and validation
- Use TypeScript for request/response types

### Database Operations
- Use LibSQL client for SQLite operations
- Follow existing schema patterns in `lib/*/schema.sql`
- Use prepared statements to prevent SQL injection
- Handle database errors gracefully

### AI Agent
- Use LangChain for AI agent orchestration
- Follow the agent pattern in `lib/agent.ts`
- Include context about user's portfolio and market data
- Handle AI failures gracefully with fallback responses

## Important Files

### Configuration
- `.env.example` - Environment variables template
- `tsconfig.json` - TypeScript configuration
- `next.config.mjs` - Next.js configuration
- `tailwind.config.ts` - Tailwind CSS configuration
- `.eslintrc.json` - ESLint rules

### Documentation
- `docs/SYSTEM_OVERVIEW.md` - Architecture and data flows
- `docs/DEVELOPER_GUIDE.md` - Setup and troubleshooting
- `docs/FILE_STRUCTURE.md` - Detailed codebase organization
- `docs/CONTRACTS_AND_DEPLOYMENT.md` - Smart contract details
- `docs/TOKEN_LAUNCHPAD.md` - WaveBreak launchpad documentation
- `docs/TOKEN_ECONOMICS.md` - X Token rewards system

## Security Best Practices

### General
- Never commit secrets or private keys to version control
- Use environment variables for sensitive data
- Validate all user inputs
- Sanitize data before database queries
- Use HTTPS for all API calls

### Blockchain
- Verify transaction parameters before signing
- Use atomic transactions for multi-step operations
- Check account balances before transactions
- Validate ASA (Algorand Standard Asset) IDs
- Use appropriate transaction fees

### Smart Contracts
- Include reentrancy protection
- Validate all inputs and state changes
- Use proper access controls
- Test edge cases thoroughly
- Follow Algorand's smart contract security guidelines

## Common Tasks

### Adding a New Component
1. Create component in appropriate `components/` subdirectory
2. Use TypeScript for props interface
3. Follow existing Shadcn UI patterns
4. Support dark mode
5. Make it responsive
6. Export from index file if needed

### Adding a New API Route
1. Create route handler in `src/app/api/`
2. Define TypeScript types for request/response
3. Add proper error handling
4. Include input validation
5. Use consistent response format
6. Document the endpoint

### Adding a New Feature
1. Plan the architecture and data flow
2. Update relevant documentation
3. Create database schema if needed
4. Implement backend API routes
5. Create frontend components
6. Add to navigation/routing
7. Write tests
8. Update README if it's a major feature

### Deploying a Smart Contract
1. Write contract in PyTeal using Beaker
2. Create deployment script in `Blockchain/projects/10x_Swap/`
3. Test thoroughly on TestNet
4. Document contract methods and state
5. Update frontend integration code
6. Add contract address to configuration

## Testing Guidelines

- Test on Algorand TestNet before MainNet
- Verify all blockchain transactions are confirmed
- Test wallet connection with multiple providers
- Check error handling and edge cases
- Test responsive design on different screen sizes
- Verify dark mode appearance
- Test API endpoints with various inputs

## Dependencies

### Key Dependencies
- `next` - Next.js framework
- `react` - React library
- `typescript` - TypeScript compiler
- `algosdk` - Algorand JavaScript SDK
- `@tinymanorg/tinyman-js-sdk` - Tinyman DEX SDK
- `@pactfi/pactsdk` - Pact DEX SDK
- `@txnlab/use-wallet-react` - Algorand wallet integration
- `@langchain/openai` - AI/LangChain integration
- `@libsql/client` - SQLite database client
- `tailwindcss` - Utility-first CSS framework
- `@radix-ui/*` - Shadcn UI primitives

### Install New Dependencies
```bash
npm install <package>        # Add production dependency
npm install -D <package>     # Add dev dependency
```

## Troubleshooting

### Common Issues
- **Build Errors**: Check `tsconfig.json` and type errors
- **Wallet Connection**: Verify wallet provider is installed and configured
- **Transaction Failures**: Check account balance, opt-in status, and transaction parameters
- **API Errors**: Check environment variables and database connection
- **Smart Contract Issues**: Verify contract deployment and ABI compatibility

### Debug Mode
- Enable verbose logging in development
- Use browser DevTools for frontend debugging
- Check `dev.log` and `server.log` for backend logs
- Use Algorand block explorer for transaction debugging

## Additional Resources

- [Algorand Developer Portal](https://developer.algorand.org/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Shadcn UI Components](https://ui.shadcn.com/)
- [Project Documentation](./docs/)

## Contributing

When making changes:
1. Follow the existing code style and patterns
2. Update relevant documentation
3. Test thoroughly on TestNet
4. Run linting before committing
5. Write clear commit messages
6. Keep changes focused and minimal

## Notes for AI Assistants

- Always check existing documentation before making changes
- Follow the established patterns in the codebase
- Be careful with blockchain operations - they're irreversible
- Test on TestNet before suggesting MainNet changes
- Consider security implications of all changes
- Respect the modular architecture
- Use type-safe patterns throughout
