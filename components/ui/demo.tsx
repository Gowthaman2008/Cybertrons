import * as React from "react"
import { DarkGradientBg } from "@/components/ui/elegant-dark-pattern"
import { CommitsGrid } from "@/components/ui/commits-grid"

export default function DemoHome() {
  return (
    <DarkGradientBg>
      <div className="flex flex-col items-center justify-center min-h-screen gap-8 p-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-white font-display">Dark Gradient Background</h1>
          <p className="text-lg text-gray-300 max-w-md font-sans">
            A clean, dark gradient background with subtle patterns and textures.
          </p>
        </div>
        
        <div className="flex flex-col items-center gap-4">
          <h2 className="text-xl font-bold text-white font-display">Commits Grid Intro Demo</h2>
          <CommitsGrid text="21st" />
        </div>
      </div>
    </DarkGradientBg>
  )
}

const CommitsGridDemo = () => {
    return <CommitsGrid text="21st" />
}

export { CommitsGridDemo }
