import { Skeleton } from '@/components/ui/skeleton'
import { Logo } from '@/components/ui/logo'

export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header skeleton */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex">
            <Logo width={24} height={24} />
            <Skeleton className="ml-2 h-6 w-20" />
          </div>
          <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
            <div className="w-full flex-1 md:w-auto md:flex-none">
              <Skeleton className="h-9 w-64" />
            </div>
            <nav className="flex items-center space-x-2">
              <Skeleton className="h-9 w-9 rounded-md" />
              <Skeleton className="h-9 w-9 rounded-md" />
            </nav>
          </div>
        </div>
      </header>

      {/* Main content skeleton */}
      <div className="container mx-auto py-6">
        <div className="space-y-6">
          {/* Page title */}
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-96" />
          </div>

          {/* Main content area */}
          <div className="grid gap-6 md:grid-cols-3">
            {/* Sidebar */}
            <div className="space-y-4">
              <Skeleton className="h-32 w-full rounded-lg" />
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-40 w-full rounded-lg" />
            </div>

            {/* Main content */}
            <div className="md:col-span-2 space-y-4">
              <Skeleton className="h-48 w-full rounded-lg" />
              <div className="grid gap-4 md:grid-cols-2">
                <Skeleton className="h-32 w-full rounded-lg" />
                <Skeleton className="h-32 w-full rounded-lg" />
              </div>
              <Skeleton className="h-64 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </div>

      {/* Loading indicator */}
      <div className="fixed bottom-4 right-4">
        <div className="flex items-center space-x-2 bg-background border rounded-lg px-3 py-2 shadow-lg">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      </div>
    </div>
  )
}