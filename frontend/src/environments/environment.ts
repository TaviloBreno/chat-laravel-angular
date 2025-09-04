export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:8000/api',
  broadcastDriver: 'pusher',
  pusher: {
    key: 'your-pusher-key',
    cluster: 'mt1',
    forceTLS: true
  },
  wsAuthEndpoint: 'http://localhost:8000/broadcasting/auth'
};