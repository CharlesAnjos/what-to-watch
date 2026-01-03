// Simple HTML entity decoder
function decodeHtmlEntities(text) {
  if (!text) return text
  return text
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&apos;/g, "'")
}

// Fetch movie poster from TMDB API
async function getPosterFromTMDB(title, year) {
  const apiKey = process.env.TMDB_API_KEY
  
  if (!apiKey) {
    return null // No API key, skip TMDB lookup
  }

  try {
    // Search for the movie
    const searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(title)}${year ? `&year=${year}` : ''}`
    
    const response = await fetch(searchUrl, {
      headers: {
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    
    if (data.results && data.results.length > 0) {
      // Get the first result (most likely match)
      const movie = data.results[0]
      
      if (movie.poster_path) {
        // Construct full poster URL (w500 is a good size)
        return `https://image.tmdb.org/t/p/w500${movie.poster_path}`
      }
    }
    
    return null
  } catch (error) {
    console.error('TMDB API error:', error)
    return null
  }
}

// Batch fetch posters from TMDB (with rate limiting)
async function enrichMoviesWithPosters(movies) {
  const apiKey = process.env.TMDB_API_KEY
  
  if (!apiKey || movies.length === 0) {
    return movies
  }

  // Process movies in batches to avoid rate limits
  const batchSize = 5
  const delay = 250 // 250ms delay between batches (TMDB allows ~40 requests per 10 seconds)
  
  for (let i = 0; i < movies.length; i += batchSize) {
    const batch = movies.slice(i, i + batchSize)
    
    // Process batch in parallel
    const promises = batch.map(async (movie) => {
      // Only fetch from TMDB if poster is missing or is a placeholder
      if (!movie.poster || movie.poster.includes('empty-poster') || movie.poster.includes('static/img/empty')) {
        const tmdbPoster = await getPosterFromTMDB(movie.title, movie.year)
        if (tmdbPoster) {
          movie.poster = tmdbPoster
        }
      }
      return movie
    })
    
    await Promise.all(promises)
    
    // Delay between batches to respect rate limits
    if (i + batchSize < movies.length) {
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  return movies
}

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { url } = req.body

  if (!url) {
    return res.status(400).json({ error: 'URL is required' })
  }

  // Validate Letterboxd URL
  const letterboxdRegex = /^https?:\/\/(www\.)?letterboxd\.com\/.+\/list\/.+/
  if (!letterboxdRegex.test(url)) {
    return res.status(400).json({ error: 'Invalid Letterboxd list URL' })
  }

  try {
    // Fetch the Letterboxd list page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch list: ${response.status}`)
    }

    const html = await response.text()

    // Parse the HTML to extract movie data
    // Letterboxd lists have data in script tags with JSON-LD or in data attributes
    const movies = []
    
    // Method 1: Try to extract from JSON-LD structured data
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)
    if (jsonLdMatch) {
      for (const match of jsonLdMatch) {
        try {
          const jsonStr = match.replace(/<\/?script[^>]*>/g, '')
          const data = JSON.parse(jsonStr)
          if (data['@type'] === 'ItemList' && data.itemListElement) {
            for (const item of data.itemListElement) {
              if (item.item) {
                let poster = item.item.image || ''
                // Fix poster URL - Letterboxd uses specific formats
                if (poster) {
                  // Replace small thumbnails with larger versions
                  poster = poster.replace(/\/0-230-0-345-crop/, '/0-500-0-750-crop')
                  // Ensure full URL
                  if (poster && !poster.startsWith('http')) {
                    poster = 'https://letterboxd.com' + poster
                  }
                  // Remove placeholder images - Letterboxd serves empty-poster images to prevent scraping
                  if (poster.includes('empty-poster') || poster.includes('static/img/empty')) {
                    poster = '' // Remove placeholder
                  }
                }
                movies.push({
                  title: decodeHtmlEntities(item.item.name || ''),
                  year: item.item.datePublished || '',
                  director: item.item.director?.name || '',
                  poster: poster,
                  link: item.item.url || '',
                })
              }
            }
          }
        } catch (e) {
          // Continue if JSON parsing fails
        }
      }
    }

    // Method 2: Fallback to parsing HTML directly
    if (movies.length === 0) {
      // Extract movie items from the list
      const moviePattern = /<li[^>]*class="[^"]*listitem[^"]*"[^>]*>[\s\S]*?<\/li>/g
      const movieMatches = html.match(moviePattern) || []

      for (const movieHtml of movieMatches) {
        // Extract title
        const titleMatch = movieHtml.match(/data-film-name="([^"]+)"/) ||
                          movieHtml.match(/<a[^>]*class="[^"]*film[^"]*"[^>]*>([^<]+)</)
        const title = titleMatch ? decodeHtmlEntities(titleMatch[1].trim()) : ''

        // Extract year
        const yearMatch = movieHtml.match(/data-film-release-year="(\d+)"/) ||
                         movieHtml.match(/<a[^>]*href="\/film\/[^\/]+\/(\d{4})\/"/)
        const year = yearMatch ? yearMatch[1] : ''

        // Extract poster image - try multiple patterns
        const posterMatch = movieHtml.match(/<img[^>]*src="([^"]+)"[^>]*class="[^"]*image[^"]*"/) ||
                           movieHtml.match(/<img[^>]*data-src="([^"]+)"/) ||
                           movieHtml.match(/<img[^>]*src="([^"]*\/film\/[^"]*)"[^>]*/) ||
                           movieHtml.match(/data-src="([^"]*\/film\/[^"]*)"/)
        let poster = posterMatch ? posterMatch[1] : ''
        if (poster) {
          // Fix poster URL - replace small thumbnails with larger versions
          poster = poster.replace(/\/0-230-0-345-crop/, '/0-500-0-750-crop')
          // Ensure full URL
          if (!poster.startsWith('http')) {
            poster = 'https://letterboxd.com' + poster
          }
          // Remove placeholder images - Letterboxd serves empty-poster images
          if (poster.includes('empty-poster') || poster.includes('static/img/empty')) {
            poster = '' // Remove placeholder, we'll handle this in the frontend
          }
        }

        // Extract link
        const linkMatch = movieHtml.match(/<a[^>]*href="(\/film\/[^"]+)"[^>]*class="[^"]*frame[^"]*"/)
        let link = linkMatch ? linkMatch[1] : ''
        if (link && !link.startsWith('http')) {
          link = 'https://letterboxd.com' + link
        }

        if (title) {
          movies.push({
            title,
            year,
            director: '', // Hard to extract from list view
            poster,
            link,
          })
        }
      }
    }

    // Method 3: Try parsing from ul.poster-list structure
    if (movies.length === 0) {
      const listMatch = html.match(/<ul[^>]*class="[^"]*poster-list[^"]*"[^>]*>([\s\S]*?)<\/ul>/)
      if (listMatch) {
        const listContent = listMatch[1]
        const itemMatches = listContent.match(/<li[^>]*>[\s\S]*?<\/li>/g) || []
        
        for (const item of itemMatches) {
          // Extract title from data attributes or alt text
          const titleMatch = item.match(/data-film-slug="([^"]+)"/) ||
                           item.match(/alt="([^"]+)"/)
          let title = titleMatch ? titleMatch[1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : ''
          title = decodeHtmlEntities(title)
          
          // Extract poster
          const posterMatch = item.match(/src="([^"]+)"/) || item.match(/data-src="([^"]+)"/)
          let poster = posterMatch ? posterMatch[1] : ''
          if (poster) {
            // Fix poster URL - replace small thumbnails with larger versions
            poster = poster.replace(/\/0-230-0-345-crop/, '/0-500-0-750-crop')
            if (!poster.startsWith('http')) {
              poster = 'https://letterboxd.com' + poster
            }
            // Remove placeholder images - Letterboxd serves empty-poster images to prevent scraping
            if (poster.includes('empty-poster') || poster.includes('static/img/empty')) {
              poster = '' // Remove placeholder
            }
          }

          // Extract link
          const linkMatch = item.match(/href="(\/film\/[^"]+)"/)
          let link = linkMatch ? linkMatch[1] : ''
          if (link && !link.startsWith('http')) {
            link = 'https://letterboxd.com' + link
          }

          if (title) {
            movies.push({
              title,
              year: '',
              director: '',
              poster,
              link,
            })
          }
        }
      }
    }

    if (movies.length === 0) {
      return res.status(404).json({ error: 'No movies found in this list. Make sure the list is public.' })
    }

    // Enrich movies with TMDB posters if API key is available
    const enrichedMovies = await enrichMoviesWithPosters(movies)

    return res.status(200).json({ movies: enrichedMovies })
  } catch (error) {
    console.error('Error fetching Letterboxd list:', error)
    return res.status(500).json({ 
      error: error.message || 'Failed to fetch the list. Please make sure the list is public and the URL is correct.' 
    })
  }
}