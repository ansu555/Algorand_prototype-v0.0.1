import { Footer } from "@/components/footer"
import HomePage from "@/components/home-page"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <HomePage />
      <Footer />
    </div>
  )
}
