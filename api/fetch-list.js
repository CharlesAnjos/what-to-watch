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
                movies.push({
                  title: item.item.name || '',
                  year: item.item.datePublished || '',
                  director: item.item.director?.name || '',
                  poster: item.item.image || '',
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
        const title = titleMatch ? titleMatch[1].trim() : ''

        // Extract year
        const yearMatch = movieHtml.match(/data-film-release-year="(\d+)"/) ||
                         movieHtml.match(/<a[^>]*href="\/film\/[^\/]+\/(\d{4})\/"/)
        const year = yearMatch ? yearMatch[1] : ''

        // Extract poster image
        const posterMatch = movieHtml.match(/<img[^>]*src="([^"]+)"[^>]*class="[^"]*image[^"]*"/) ||
                           movieHtml.match(/<img[^>]*data-src="([^"]+)"/)
        let poster = posterMatch ? posterMatch[1] : ''
        if (poster && !poster.startsWith('http')) {
          poster = 'https://letterboxd.com' + poster
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
          
          // Extract poster
          const posterMatch = item.match(/src="([^"]+)"/) || item.match(/data-src="([^"]+)"/)
          let poster = posterMatch ? posterMatch[1] : ''
          if (poster && !poster.startsWith('http')) {
            poster = 'https://letterboxd.com' + poster
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

    return res.status(200).json({ movies })
  } catch (error) {
    console.error('Error fetching Letterboxd list:', error)
    return res.status(500).json({ 
      error: error.message || 'Failed to fetch the list. Please make sure the list is public and the URL is correct.' 
    })
  }
}