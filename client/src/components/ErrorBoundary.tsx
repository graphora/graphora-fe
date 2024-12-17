import * as Sentry from "@sentry/react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export function ErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <Sentry.ErrorBoundary
      fallback={({ error, resetError }) => (
        <div className="container mx-auto p-4 flex items-center justify-center min-h-screen">
          <Alert variant="destructive" className="max-w-lg">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              <p className="mb-4">{error.message}</p>
              <Button onClick={resetError} variant="outline">
                Try again
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}
    >
      {children}
    </Sentry.ErrorBoundary>
  );
}
