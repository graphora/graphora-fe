import { useAuth0, withAuthenticationRequired } from "@auth0/auth0-react";
import { GraphVisualization } from "../components/GraphVisualisation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function Dashboard() {
  const { user } = useAuth0();

  const demoQuery = `
    MATCH (n)-[r]->(m)
    RETURN n, r, m
    LIMIT 100
  `;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Welcome, {user?.name}!</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This is your secure dashboard where you can visualize graph data.
          </p>
        </CardContent>
      </Card>

      <GraphVisualization 
        query={demoQuery}
        config={{
          physics: {
            enabled: true,
            solver: "forceAtlas2Based"
          }
        }}
      />
    </div>
  );
}

export default withAuthenticationRequired(Dashboard, {
  onRedirecting: () => (
    <div className="flex items-center justify-center min-h-screen">
      Loading...
    </div>
  ),
});
