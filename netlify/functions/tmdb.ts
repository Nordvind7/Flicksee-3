import type { Handler, HandlerEvent } from "@netlify/functions";

const handler: Handler = async (event: HandlerEvent) => {
  const { TMDB_API_KEY } = process.env;
  const TMDB_API_BASE_URL = 'https://api.themoviedb.org/3';

  if (!TMDB_API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'TMDB API key is not configured in Netlify environment variables.' }),
    };
  }

  // Get the resource path from the request, e.g., /discover/movie
  const path = event.path.replace('/api/', '');

  // Construct the full TMDB API URL
  const url = new URL(`${TMDB_API_BASE_URL}/${path}`);
  
  // Add the secure API key
  url.searchParams.set('api_key', TMDB_API_KEY);

  // Append original query parameters from the client request
  for (const [key, value] of Object.entries(event.queryStringParameters || {})) {
      // FIX: Argument of type 'unknown' is not assignable to parameter of type 'string'.
      // The `value` from `Object.entries` on `queryStringParameters` can be inferred as `unknown`.
      // Using a `typeof` check correctly narrows the type to 'string'.
      if (typeof value === 'string') {
          url.searchParams.set(key, value);
      }
  }

  try {
    const response = await fetch(url.toString());
    const data = await response.json();

    if (!response.ok) {
        return {
            statusCode: response.status,
            body: JSON.stringify(data),
        };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error('Error proxying request to TMDB:', error);
    return {
      statusCode: 502,
      body: JSON.stringify({ error: 'Failed to fetch data from TMDB API.' }),
    };
  }
};

export { handler };