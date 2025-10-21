import { Footer } from "@/components/layout/footer"
import HomePage from "@/components/pages/home-page"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <HomePage />
      <Footer />
    </div>
  )
}
