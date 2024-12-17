import { useEffect, useRef } from 'react';
import NeoVis from 'neovis.js';
import { Card } from '@/components/ui/card';

interface GraphVisualizationProps {
  query: string;
  config?: Record<string, any>;
}

export function GraphVisualization({ query, config = {} }: GraphVisualizationProps) {
  const visRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!visRef.current) return;

    const neoViz = new NeoVis({
      container: visRef.current,
      server_url: import.meta.env.VITE_NEO4J_URI || '',
      server_user: import.meta.env.VITE_NEO4J_USER || '',
      server_password: import.meta.env.VITE_NEO4J_PASSWORD || '',
      labels: {
        Node: {
          caption: 'name',
          size: 'pagerank',
          community: 'community'
        }
      },
      relationships: {
        RELATES_TO: {
          thickness: 'weight',
          caption: false
        }
      },
      initial_cypher: query,
      ...config
    });

    neoViz.render();

    return () => {
      neoViz.clearNetwork();
    };
  }, [query, config]);

  return (
    <Card className="w-full h-[600px] relative">
      <div ref={visRef} className="w-full h-full" />
    </Card>
  );
}
