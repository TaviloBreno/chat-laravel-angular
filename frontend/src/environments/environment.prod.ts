export const environment = {
  production: true,
  apiBaseUrl: 'https://your-api-domain.com/api',
  broadcastDriver: 'pusher',
  pusher: {
    key: 'your-production-pusher-key',
    cluster: 'mt1',
    forceTLS: true
  },
  wsAuthEndpoint: 'https://your-api-domain.com/broadcasting/auth'
};