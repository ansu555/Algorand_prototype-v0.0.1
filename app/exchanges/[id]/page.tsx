import { Footer } from "@/components/footer"
import { ExchangeDetail } from "@/components/exchange-detail"

export default function ExchangeDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <ExchangeDetail id={params.id} />
      </main>
      <Footer />
    </div>
  )
}
