import { useAuth0 } from "@auth0/auth0-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Network, ShieldCheck, Activity } from "lucide-react";

export default function Home() {
  const { loginWithRedirect, isAuthenticated } = useAuth0();

  return (
    <div className="space-y-8">
      <section className="text-center py-12">
        <h1 className="text-4xl font-bold mb-4">
          Secure Graph Visualization Platform
        </h1>
        <p className="text-xl text-muted-foreground mb-8">
          Visualize your graph data securely with Neo4j and Auth0
        </p>
        {!isAuthenticated && (
          <Button size="lg" onClick={() => loginWithRedirect()}>
            Get Started <ArrowRight className="ml-2" />
          </Button>
        )}
      </section>

      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <Network className="w-8 h-8 mb-2 text-primary" />
            <CardTitle>Graph Visualization</CardTitle>
          </CardHeader>
          <CardContent>
            Powerful Neo4j-based graph visualization with interactive features
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <ShieldCheck className="w-8 h-8 mb-2 text-primary" />
            <CardTitle>Secure Access</CardTitle>
          </CardHeader>
          <CardContent>
            Enterprise-grade security with Auth0 authentication
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Activity className="w-8 h-8 mb-2 text-primary" />
            <CardTitle>Real-time Monitoring</CardTitle>
          </CardHeader>
          <CardContent>
            Comprehensive error tracking and monitoring with Sentry
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
