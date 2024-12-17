import { useAuth0 } from "@auth0/auth0-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";

export function Layout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loginWithRedirect, logout } = useAuth0();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <Link href="/">
                  <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                    Home
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
              {isAuthenticated && (
                <>
                  <NavigationMenuItem>
                    <Link href="/dashboard">
                      <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                        Dashboard
                      </NavigationMenuLink>
                    </Link>
                  </NavigationMenuItem>
                  <NavigationMenuItem>
                    <Link href="/errors">
                      <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                        Error Logs
                      </NavigationMenuLink>
                    </Link>
                  </NavigationMenuItem>
                </>
              )}
              <NavigationMenuItem>
                {isAuthenticated ? (
                  <Button
                    variant="outline"
                    onClick={() => logout({ returnTo: window.location.origin })}
                  >
                    Log Out
                  </Button>
                ) : (
                  <Button onClick={() => loginWithRedirect()}>Log In</Button>
                )}
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>
      </header>
      <main className="flex-1 container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
