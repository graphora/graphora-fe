/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config: any) => {
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      'bufferutil': 'commonjs bufferutil',
    })
    return config
  },
  async rewrites() {
    // Use environment variable for backend API URL, fallback to localhost for development
    const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:8000'
    
    return [
      {
        source: '/api/v1/:path*',
        destination: `${backendUrl}/api/v1/:path*`
      }
    ]
  }
}

module.exports = nextConfig