module.exports = {
  instagram: {
    oauthAuthorize: 'https://api.instagram.com/oauth/authorize',
    accessToken: 'https://api.instagram.com/oauth/access_token',
    graphApi: 'https://graph.instagram.com',
  },
  facebook: {
    oauthAuthorize: 'https://www.facebook.com/v21.0/dialog/oauth',
    graphApi: 'https://graph.facebook.com/v21.0',
  },
  twitter: {
    apiBase: 'https://api.twitter.com/2',
    uploadBase: 'https://upload.twitter.com/1.1',
  },
  linkedin: {
    oauthAuthorize: 'https://www.linkedin.com/oauth/v2/authorization',
    accessToken: 'https://www.linkedin.com/oauth/v2/accessToken',
    apiBase: 'https://api.linkedin.com',
  },
  groq: {
    chatCompletions: 'https://api.groq.com/openai/v1/chat/completions',
  },
  image: {
    loremFlickr: 'https://loremflickr.com',
  },
  recommender: require('./recommender')(),
};
