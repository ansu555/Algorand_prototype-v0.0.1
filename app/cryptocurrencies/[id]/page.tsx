import { Footer } from "@/components/footer"
import { CryptoDetail } from "@/components/crypto-detail"

export default function CryptoDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <CryptoDetail id={params.id} />
      </main>
      <Footer />
    </div>
  )
}
