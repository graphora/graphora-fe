import { Switch, Route } from "wouter";
import { Auth0Provider } from "@auth0/auth0-react";
import * as Sentry from "@sentry/react";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Layout } from "./components/Layout";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import ErrorDashboard from "./pages/ErrorDashboard";
import { useEffect } from "react";

function App() {
  useEffect(() => {
    // Apply dark/light mode to root element
    const root = window.document.documentElement;
    root.classList.add('light');
  }, []);

  const domain = import.meta.env.VITE_AUTH0_DOMAIN;
  const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;

  if (!domain || !clientId) {
    console.error('Auth0 configuration missing. Please check environment variables.');
    return <div>Error: Auth0 configuration missing</div>;
  }

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: window.location.origin
      }}
      onRedirectCallback={(appState) => {
        const targetUrl = appState?.returnTo || '/dashboard';
        // Clean URL and redirect
        window.history.replaceState({}, document.title, targetUrl);
      }}
      cacheLocation="localstorage"
    >
      <ErrorBoundary>
        <Layout>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/errors" component={ErrorDashboard} />
            {/* Auth0 will handle the callback automatically */}
            <Route>
              <div className="flex min-h-screen items-center justify-center">
                <h1 className="text-2xl font-bold">404 - Page Not Found</h1>
              </div>
            </Route>
          </Switch>
        </Layout>
      </ErrorBoundary>
    </Auth0Provider>
  );
}

export default Sentry.withProfiler(App);
