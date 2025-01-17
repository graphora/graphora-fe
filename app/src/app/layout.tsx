import {
  ClerkProvider,
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton
} from '@clerk/nextjs'
import './globals.css'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <header className="p-4 flex justify-end items-center border-b">
            <SignedOut>
              <SignInButton />
            </SignedOut>
            <SignedIn>
              <UserButton afterSignOutUrl="/"/>
            </SignedIn>
          </header>
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}