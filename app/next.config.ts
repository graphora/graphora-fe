const { execSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const resolveAppVersion = () => {
  // Allow manual overrides for preview deployments
  if (process.env.NEXT_PUBLIC_APP_VERSION) {
    return process.env.NEXT_PUBLIC_APP_VERSION
  }

  const repoRoot = path.resolve(__dirname, '..')

  try {
    const tag = execSync('git describe --tags --abbrev=0', {
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).toString().trim()

    if (tag) {
      return tag
    }
  } catch {
    // Swallow errors when tags are unavailable (e.g., fresh clones/CI artifacts)
  }

  try {
    const pkgPath = path.join(__dirname, 'package.json')
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))

    if (pkg.version) {
      return pkg.version
    }
  } catch {
    // Fall through to the default version below
  }

  return '0.0.0-dev'
}

const APP_VERSION = resolveAppVersion()

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_APP_VERSION: APP_VERSION,
  },
  webpack: (config: any) => {
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      'bufferutil': 'commonjs bufferutil',
    })
    
    // Fix for Neo4j NVL layout files
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      os: false,
    }
    
    // Ensure layout implementation files are included in the bundle
    config.resolve.alias = {
      ...config.resolve.alias,
      'cose-bilkent-layout-impl': require.resolve('cytoscape-cose-bilkent'),
      'dagre-layout-impl': require.resolve('cytoscape-dagre'),
    }
    
    return config
  },
  // API routes under app/api already proxy to the backend; no rewrites needed.
  // Add experimental features for better proxy handling
  experimental: {
    proxyTimeout: 60000, // 60 seconds timeout
  },
  // Add server runtime configuration
  serverRuntimeConfig: {
    // Will only be available on the server side
    proxyTimeout: 60000,
  },
}

module.exports = nextConfig
