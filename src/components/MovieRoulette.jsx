import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

function MovieRoulette() {
  const [listUrl, setListUrl] = useState('')
  const [movies, setMovies] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedMovie, setSelectedMovie] = useState(null)
  const [isSpinning, setIsSpinning] = useState(false)

  const fetchMovies = async () => {
    if (!listUrl.trim()) {
      setError('Please enter a Letterboxd list URL')
      return
    }

    setLoading(true)
    setError('')
    setSelectedMovie(null)
    setMovies([])

    try {
      // Call our serverless function
      const response = await fetch('/api/fetch-list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: listUrl }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch movies')
      }

      if (data.movies.length === 0) {
        throw new Error('No movies found in this list')
      }

      setMovies(data.movies)
    } catch (err) {
      setError(err.message || 'An error occurred while fetching the list')
    } finally {
      setLoading(false)
    }
  }

  const spinRoulette = () => {
    if (movies.length === 0) return

    setIsSpinning(true)
    setSelectedMovie(null)

    // Spin animation duration
    const spinDuration = 2000
    const startTime = Date.now()

    const spin = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / spinDuration, 1)

      // Easing function for smooth deceleration
      const easeOut = 1 - Math.pow(1 - progress, 3)

      if (progress < 1) {
        // Random selection during spin (visual effect)
        setSelectedMovie(movies[Math.floor(Math.random() * movies.length)])
        requestAnimationFrame(spin)
      } else {
        // Final selection
        const randomIndex = Math.floor(Math.random() * movies.length)
        setSelectedMovie(movies[randomIndex])
        setIsSpinning(false)
      }
    }

    requestAnimationFrame(spin)
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Input Section */}
      <div className="bg-gray-800 rounded-lg p-6 mb-8 shadow-xl">
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            value={listUrl}
            onChange={(e) => setListUrl(e.target.value)}
            placeholder="https://letterboxd.com/username/list/list-name/"
            className="flex-1 px-4 py-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            onKeyPress={(e) => e.key === 'Enter' && fetchMovies()}
            disabled={loading}
          />
          <button
            onClick={fetchMovies}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading...' : 'Load List'}
          </button>
        </div>
        {error && (
          <div className="mt-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
            {error}
          </div>
        )}
      </div>

      {/* Movies Loaded Info */}
      {movies.length > 0 && (
        <div className="text-center mb-6">
          <p className="text-gray-300 text-lg">
            Loaded <span className="font-bold text-white">{movies.length}</span> movies
          </p>
        </div>
      )}

      {/* Roulette Section */}
      {movies.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-8 shadow-xl">
          <div className="text-center mb-6">
            <button
              onClick={spinRoulette}
              disabled={isSpinning}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold text-xl rounded-full transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
            >
              {isSpinning ? 'Spinning...' : '🎰 Spin the Roulette!'}
            </button>
          </div>

          {/* Selected Movie Display */}
          <AnimatePresence mode="wait">
            {selectedMovie && (
              <motion.div
                key={selectedMovie.title}
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3 }}
                className="bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg p-6 border border-gray-600"
              >
                <div className="flex flex-col md:flex-row gap-6">
                  {selectedMovie.poster && (
                    <img
                      src={selectedMovie.poster}
                      alt={selectedMovie.title}
                      className="w-full md:w-48 h-auto rounded-lg object-cover shadow-lg"
                    />
                  )}
                  <div className="flex-1">
                    <h2 className="text-3xl font-bold text-white mb-2">
                      {selectedMovie.title}
                    </h2>
                    {selectedMovie.year && (
                      <p className="text-gray-400 text-lg mb-4">
                        ({selectedMovie.year})
                      </p>
                    )}
                    {selectedMovie.director && (
                      <p className="text-gray-300 mb-2">
                        <span className="font-semibold">Director:</span> {selectedMovie.director}
                      </p>
                    )}
                    {selectedMovie.rating && (
                      <div className="flex items-center gap-2 mt-4">
                        <span className="text-yellow-400 text-xl">⭐</span>
                        <span className="text-gray-300">
                          {selectedMovie.rating}/5.0
                        </span>
                      </div>
                    )}
                    {selectedMovie.link && (
                      <a
                        href={selectedMovie.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                      >
                        View on Letterboxd →
                      </a>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Instructions */}
      {movies.length === 0 && !loading && (
        <div className="bg-gray-800 rounded-lg p-6 text-center">
          <p className="text-gray-400">
            Enter a public Letterboxd list URL above to get started
          </p>
        </div>
      )}
    </div>
  )
}

export default MovieRoulette