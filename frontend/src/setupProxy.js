const {createProxyMiddleware} = require('http-proxy-middleware')

module.exports = function (app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://0.0.0.0:8000',
      changeOrigin: false,
    })
  )
}
