# Publishing @10xswap/sdk to NPM

## Prerequisites

1. **NPM Account**: Create an account at [npmjs.com](https://www.npmjs.com/signup)
2. **NPM CLI Login**: Run `npm login` in your terminal
3. **Package Name Availability**: The package name `@10xswap/sdk` must be available
   - If `@10xswap` scope doesn't exist, you'll need to create it or use a different name
   - Alternative: Use `10xswap-sdk` (without scope)

## Steps to Publish

### 1. Verify Package Name

Check if the package name is available:

```bash
npm view @10xswap/sdk
```

If you get an error (404), the name is available! If you see package info, the name is taken.

**Option A: Use scoped package (recommended)**
- Keep `"name": "@10xswap/sdk"` in package.json
- Create the `@10xswap` organization on npm

**Option B: Use unscoped package**
- Change `"name": "@10xswap/sdk"` to `"name": "10xswap-sdk"` in package.json

### 2. Login to NPM

```bash
npm login
```

Enter your npm credentials when prompted.

### 3. Build the Package

```bash
cd packages/sdk
npm run build
```

Make sure build completes successfully without errors.

### 4. Test the Package Locally (Optional)

Test the package in your main project before publishing:

```bash
# In packages/sdk directory
npm pack
```

This creates a `.tgz` file. You can install it in your main project:

```bash
# In your main project
npm install /path/to/10xswap-sdk-1.0.0.tgz
```

### 5. Update Version (If Needed)

```bash
# For first publish, you can keep 1.0.0
# For subsequent updates:
npm version patch  # 1.0.0 -> 1.0.1
npm version minor  # 1.0.0 -> 1.1.0
npm version major  # 1.0.0 -> 2.0.0
```

### 6. Publish to NPM

**For public package:**

```bash
npm publish --access public
```

**For scoped package (first time):**

```bash
npm publish --access public
```

**For updates:**

```bash
npm publish
```

### 7. Verify Publication

Check that your package is live:

```bash
npm view @10xswap/sdk
```

Visit: https://www.npmjs.com/package/@10xswap/sdk

### 8. Install Your Package

Now anyone can install it:

```bash
npm install @10xswap/sdk
```

## Publishing Workflow for Updates

After making changes to the SDK:

```bash
# 1. Navigate to SDK directory
cd packages/sdk

# 2. Make your changes to src/

# 3. Build
npm run build

# 4. Test locally
npm pack
# Install the .tgz in another project to test

# 5. Update version
npm version patch  # or minor/major

# 6. Publish
npm publish

# 7. Git commit and tag
git add .
git commit -m "chore: publish v1.0.1"
git tag v1.0.1
git push origin main --tags
```

## NPM Scripts Available

```bash
npm run build     # Build the package
npm run dev       # Build in watch mode
npm run lint      # Lint the code
npm test          # Run tests
```

## Package Contents

After building, these files will be included in the published package:

- `dist/` - Compiled JavaScript and TypeScript definitions
- `README.md` - Package documentation
- `LICENSE` - MIT license
- `package.json` - Package metadata

## Troubleshooting

### Error: "You do not have permission to publish"

- Make sure you're logged in: `npm whoami`
- For scoped packages, make sure you own the scope or are a member of the organization
- Try: `npm login` again

### Error: "Package name too similar to existing package"

- NPM may reject names too similar to existing packages
- Choose a different name

### Error: "You must verify your email"

- Check your email and verify your npm account
- Visit: https://www.npmjs.com/settings/your-username/profile

### Build Errors

```bash
# Clean and rebuild
rm -rf dist node_modules
npm install
npm run build
```

## Setting Up GitHub Actions (Optional)

Create `.github/workflows/publish.yml` to auto-publish on new tags:

```yaml
name: Publish Package

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'
      - run: cd packages/sdk && npm install
      - run: cd packages/sdk && npm run build
      - run: cd packages/sdk && npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

Then add your NPM token as a GitHub secret named `NPM_TOKEN`.

## Package Visibility

**Public Package (Free):**
- `npm publish --access public`
- Anyone can install and use
- Best for open-source

**Private Package (Paid):**
- Requires npm Pro or Teams subscription
- `npm publish` (without --access public)
- Only team members can install

## Next Steps After Publishing

1. Update your main project to use the published package:
   ```bash
   npm install @10xswap/sdk
   ```

2. Update documentation site to point to npm package

3. Create examples in a separate repo

4. Set up automated testing and CI/CD

5. Create GitHub releases matching npm versions

## Support

- [NPM Documentation](https://docs.npmjs.com/)
- [Publishing Packages](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages)
- [Version Management](https://docs.npmjs.com/about-semantic-versioning)
