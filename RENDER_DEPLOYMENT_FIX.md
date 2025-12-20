# Render Deployment Fix

## Issue
`nest: not found` error during build on Render.com

## Root Cause
Render sets `NODE_ENV=production` during build, which can cause `npm install` to skip devDependencies in some cases. However, Render should install devDependencies during build by default. The issue is that the `nest` command might not be in PATH.

## Solution

### Option 1: Use `npx` (Recommended - Already Applied)
Using `npx nest build` ensures the nest CLI is found from node_modules even if it's in devDependencies.

**render.yaml:**
```yaml
buildCommand: npm install && npx nest build
```

### Option 2: Force Install Dev Dependencies
If Option 1 doesn't work, explicitly install dev dependencies:

**render.yaml:**
```yaml
buildCommand: npm ci --include=dev && npm run build
```

### Option 3: Use Direct TypeScript Compilation
As a fallback, you can use TypeScript compiler directly:

**render.yaml:**
```yaml
buildCommand: npm install && npm run build:direct
```

This uses the `build:direct` script which runs `tsc -p tsconfig.build.json` directly.

## Current Configuration

The `render.yaml` file has been updated to use:
```yaml
buildCommand: npm install && npx nest build
```

This should resolve the issue. The `npx` command will:
1. Look for `nest` in `node_modules/.bin/`
2. Use it even if it's in devDependencies
3. Work regardless of PATH settings

## Additional Notes

- Render installs devDependencies during build by default
- The `npx` approach is the most reliable as it doesn't depend on PATH
- If you still encounter issues, check Render's build logs for more details

## Testing Locally

To test the build command locally (simulating Render environment):
```bash
NODE_ENV=production npm install && npx nest build
```

