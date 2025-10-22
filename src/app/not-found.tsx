import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Home, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="container max-w-2xl px-4 text-center space-y-8">
        {/* 404 Animation */}
        <div className="space-y-4">
          <h1 className="text-9xl font-bold text-primary dark:text-[#F3C623] animate-pulse">
            404
          </h1>
          <div className="h-1 w-32 mx-auto bg-gradient-to-r from-primary/20 via-primary to-primary/20 dark:from-[#F3C623]/20 dark:via-[#F3C623] dark:to-[#F3C623]/20 rounded-full" />
        </div>

        {/* Message */}
        <div className="space-y-4">
          <h2 className="text-3xl font-bold tracking-tight">
            Page Not Found
          </h2>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            Oops! The page you're looking for doesn't exist. It might have been moved or deleted.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button asChild size="lg" className="min-w-[160px]">
            <Link href="/" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              Go Home
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="min-w-[160px]">
            <Link href="javascript:history.back()" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </Link>
          </Button>
        </div>

        {/* Helpful Links */}
        <div className="pt-8 border-t">
          <p className="text-sm text-muted-foreground mb-4">
            Here are some helpful links instead:
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/cryptocurrencies" className="text-sm hover:text-primary dark:hover:text-[#F3C623] transition-colors">
              Cryptocurrencies
            </Link>
            <Link href="/algorand" className="text-sm hover:text-primary dark:hover:text-[#F3C623] transition-colors">
              Algorand
            </Link>
            <Link href="/(dashboard)/agent" className="text-sm hover:text-primary dark:hover:text-[#F3C623] transition-colors">
              Agent Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
