import { useEffect, useState } from "react";
import { withAuthenticationRequired } from "@auth0/auth0-react";
import * as Sentry from "@sentry/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { AlertCircle } from "lucide-react";

interface ErrorData {
  timestamp: string;
  count: number;
}

function ErrorDashboard() {
  const [errorData, setErrorData] = useState<ErrorData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize Sentry performance monitoring
    const span = Sentry.getCurrentHub()
      .getScope()
      ?.getTransaction()
      ?.startChild({ op: "ErrorDashboard.load" });

    async function fetchErrorStats() {
      try {
        // This is a mock implementation - replace with real Sentry API call
        const mockData: ErrorData[] = Array.from({ length: 7 }, (_, i) => ({
          timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toLocaleDateString(),
          count: Math.floor(Math.random() * 10)
        })).reverse();
        
        setErrorData(mockData);
      } catch (error) {
        console.error('Failed to fetch error statistics:', error);
        Sentry.captureException(error);
      } finally {
        setLoading(false);
        span?.finish();
      }
    }

    fetchErrorStats();
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-destructive" />
            Error Trend Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-[400px] flex items-center justify-center">
              Loading error statistics...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={errorData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="timestamp"
                  label={{ value: 'Date', position: 'insideBottom', offset: -5 }}
                />
                <YAxis
                  label={{ 
                    value: 'Error Count', 
                    angle: -90, 
                    position: 'insideLeft',
                    offset: 10
                  }}
                />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="hsl(var(--destructive))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--destructive))" }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default withAuthenticationRequired(ErrorDashboard, {
  onRedirecting: () => (
    <div className="flex items-center justify-center min-h-screen">
      Loading...
    </div>
  ),
});
