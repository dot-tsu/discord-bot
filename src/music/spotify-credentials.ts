import process from 'node:process'

const clientId = process.env.SPOTIFY_CLIENT_ID
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET

export const spotifyApiCredentials = clientId && clientSecret
  ? { clientId, clientSecret }
  : undefined
