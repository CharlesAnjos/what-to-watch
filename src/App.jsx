import { useState } from 'react'
import MovieRoulette from './components/MovieRoulette'

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-2">
            🎬 WhatToWatch
          </h1>
          <p className="text-gray-400 text-lg">
            Spin the roulette and let fate decide your next movie
          </p>
        </header>
        <MovieRoulette />
      </div>
    </div>
  )
}

export default App