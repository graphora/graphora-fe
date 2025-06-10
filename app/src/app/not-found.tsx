'use client'

import { Search, Home, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Logo } from '@/components/ui/logo'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg text-center">
        <CardHeader>
          <div className="mx-auto mb-6 h-16 w-16">
            <Logo width={64} height={64} className="w-full h-full opacity-50" />
          </div>
          <CardTitle className="text-3xl font-bold">Page Not Found</CardTitle>
          <CardDescription className="text-lg">
            The page you're looking for doesn't exist or has been moved.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-center text-6xl font-bold text-muted-foreground/20">
            404
          </div>
          
          <div className="text-sm text-muted-foreground">
            <p>This might have happened because:</p>
            <ul className="mt-2 space-y-1 text-left">
              <li>• The URL was typed incorrectly</li>
              <li>• The page has been moved or deleted</li>
              <li>• You don't have permission to access this page</li>
              <li>• The link you followed is outdated</li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/" className="flex-1">
              <Button className="w-full" aria-label="Go to home page">
                <Home className="h-4 w-4 mr-2" />
                Go Home
              </Button>
            </Link>
            <Button variant="outline" onClick={() => window.history.back()} className="flex-1">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </div>

          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground mb-3">
              Looking for something specific?
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <Link href="/ontology" className="text-primary hover:underline">
                • Ontology Editor
              </Link>
              <Link href="/transform" className="text-primary hover:underline">
                • Transform Data
              </Link>
              <Link href="/merge" className="text-primary hover:underline">
                • Merge Graphs
              </Link>
              <Link href="/dashboard" className="text-primary hover:underline">
                • Dashboard
              </Link>
              <Link href="/config" className="text-primary hover:underline">
                • Configuration
              </Link>
              <Link href="/usage" className="text-primary hover:underline">
                • Usage Analytics
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}