import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

function MovieRoulette() {
  const [listUrl, setListUrl] = useState('')
  const [movies, setMovies] = useState([])
  const [loading, setLoading] = useState(false)
  const [preloadingImages, setPreloadingImages] = useState(false)
  const [imageProgress, setImageProgress] = useState({ loaded: 0, total: 0 })
  const [error, setError] = useState('')
  const [selectedMovie, setSelectedMovie] = useState(null)
  const [isSpinning, setIsSpinning] = useState(false)
  const [spinningMovies, setSpinningMovies] = useState([])
  const [targetScrollPosition, setTargetScrollPosition] = useState(0)

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
      
      // Preload all poster images
      await preloadPosterImages(data.movies)
    } catch (err) {
      setError(err.message || 'An error occurred while fetching the list')
    } finally {
      setLoading(false)
      setPreloadingImages(false)
    }
  }

  // Preload all poster images
  const preloadPosterImages = async (moviesToPreload) => {
    const posters = moviesToPreload
      .map(movie => movie.poster)
      .filter(poster => poster && poster.trim() !== '')
    
    if (posters.length === 0) {
      return // No posters to preload
    }

    setPreloadingImages(true)
    setImageProgress({ loaded: 0, total: posters.length })

    const loadImage = (src) => {
      return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve()
        img.onerror = () => resolve() // Continue even if image fails
        img.src = src
      })
    }

    // Load images in batches to avoid overwhelming the browser
    const batchSize = 10
    for (let i = 0; i < posters.length; i += batchSize) {
      const batch = posters.slice(i, i + batchSize)
      await Promise.all(batch.map(loadImage))
      setImageProgress({ loaded: Math.min(i + batchSize, posters.length), total: posters.length })
      
      // Small delay between batches to prevent browser freezing
      if (i + batchSize < posters.length) {
        await new Promise(resolve => setTimeout(resolve, 50))
      }
    }

    setPreloadingImages(false)
  }

  const spinRoulette = () => {
    if (movies.length === 0) return

    setIsSpinning(true)
    setSelectedMovie(null)

    // Select the final movie FIRST
    const finalIndex = Math.floor(Math.random() * movies.length)
    const finalMovie = movies[finalIndex]
    
    // Create an array of movies to display during spin
    // We'll add random movies, then the final movie multiple times at the end
    // to ensure it's visible when animation stops
    const repeatedMovies = []
    
    // Add random movies for the spinning effect (about 40)
    for (let i = 0; i < 40; i++) {
      repeatedMovies.push(movies[Math.floor(Math.random() * movies.length)])
    }
    
    // Add the final movie multiple times at the end to ensure it's visible
    // This creates a "landing zone" where the animation will stop
    // Add more copies to ensure visibility
    for (let i = 0; i < 10; i++) {
      repeatedMovies.push(finalMovie)
    }
    
    setSpinningMovies(repeatedMovies)

    // Duration of the spin animation
    const spinDuration = 3000

    // Calculate the exact scroll position to show the final movie
    // Container has p-6 (24px padding on all sides) and height 200px
    // The motion.div is inside, so visible scrollable area accounts for padding
    // Each movie item: minHeight 80px + gap-2 (8px) = 88px
    const itemHeight = 88
    const containerPadding = 24 * 2 // p-6 = 24px top + 24px bottom
    const visibleHeight = 200 - containerPadding // 152px visible area
    const totalItems = repeatedMovies.length
    // We want to show one of the final movie instances (they start at index totalItems - 10)
    // Let's target the 3rd instance from the end (index totalItems - 3) to ensure visibility
    const targetMovieIndex = totalItems - 3
    
    // Calculate scroll position to show the target movie in the center of visible area
    // To center: scroll = -(index * itemHeight) + (visibleHeight / 2) - (itemHeight / 2)
    const targetY = -(targetMovieIndex * itemHeight) + (visibleHeight / 2) - (itemHeight / 2)
    setTargetScrollPosition(targetY)

    setTimeout(() => {
      setSelectedMovie(finalMovie)
      setIsSpinning(false)
      setSpinningMovies([])
    }, spinDuration)
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
            disabled={loading || preloadingImages}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {(loading || preloadingImages) && (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {loading && 'Loading list...'}
            {preloadingImages && `Preparing images... (${imageProgress.loaded}/${imageProgress.total})`}
            {!loading && !preloadingImages && 'Load List'}
          </button>
        </div>
        {error && (
          <div className="mt-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
            {error}
          </div>
        )}
        {(loading || preloadingImages) && (
          <div className="mt-4">
            <div className="bg-gray-700 rounded-full h-2 overflow-hidden">
              <motion.div
                className="bg-blue-600 h-full"
                initial={{ width: 0 }}
                animate={{
                  width: loading
                    ? '50%' // Show 50% while fetching list
                    : preloadingImages
                    ? `${(imageProgress.loaded / imageProgress.total) * 50 + 50}%` // 50-100% while preloading
                    : '0%'
                }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <p className="text-gray-400 text-sm mt-2 text-center">
              {loading && 'Fetching movies from Letterboxd...'}
              {preloadingImages && `Loading poster images... ${imageProgress.loaded} of ${imageProgress.total}`}
            </p>
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
              disabled={isSpinning || preloadingImages}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold text-xl rounded-full transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
            >
              {isSpinning ? 'Spinning...' : preloadingImages ? 'Preparing...' : '🎰 Spin the Roulette!'}
            </button>
          </div>

          {/* Spinning Wheel Display */}
          {isSpinning && spinningMovies.length > 0 && (
            <div className="relative overflow-hidden bg-gray-900 rounded-lg p-6 mb-6" style={{ height: '200px' }}>
              <motion.div
                className="flex flex-col gap-2"
                initial={{ y: 0 }}
                animate={{ 
                  y: targetScrollPosition,
                }}
                transition={{
                  duration: 3,
                  ease: [0.25, 0.1, 0.25, 1], // Custom easing for deceleration
                }}
              >
                {spinningMovies.map((movie, index) => (
                  <div
                    key={`${movie.title}-${index}`}
                    className="flex items-center gap-4 bg-gray-800 rounded-lg p-4 border border-gray-700"
                    style={{ minHeight: '80px' }}
                  >
                    {movie.poster && (
                      <img
                        src={movie.poster}
                        alt={movie.title}
                        className="w-16 h-20 object-cover rounded"
                        onError={(e) => {
                          e.target.style.display = 'none'
                        }}
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="text-white font-semibold text-lg">{movie.title}</h3>
                      {movie.year && (
                        <p className="text-gray-400 text-sm">({movie.year})</p>
                      )}
                    </div>
                  </div>
                ))}
              </motion.div>
            </div>
          )}

          {/* Selected Movie Display */}
          <AnimatePresence mode="wait">
            {selectedMovie && !isSpinning && (
              <motion.div
                key={selectedMovie.title}
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.5 }}
                className="bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg p-6 border border-gray-600"
              >
                <div className="flex flex-col md:flex-row gap-6">
                  {selectedMovie.poster && (
                    <img
                      src={selectedMovie.poster}
                      alt={selectedMovie.title}
                      className="w-full md:w-48 h-auto rounded-lg object-cover shadow-lg"
                      onError={(e) => {
                        e.target.style.display = 'none'
                      }}
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
