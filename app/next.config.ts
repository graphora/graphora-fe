/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
  async rewrites() {
    // Use environment variable for backend API URL, fallback to localhost for development
    const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:8000'
    
    console.log('Backend API URL configured as:', backendUrl)
    
    return [
      {
        source: '/api/v1/:path*',
        destination: `${backendUrl}/api/v1/:path*`
      }
    ]
  },
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