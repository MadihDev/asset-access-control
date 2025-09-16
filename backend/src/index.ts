import app from './app'
import { startKeyExpiryJob } from './jobs/keyExpiry.job'
import logger from './lib/logger'

const port = process.env.PORT || 5000

app.listen(port, () => {
  logger.info(`Server is listening on port ${port}`)
  if (process.env.NODE_ENV !== 'test') {
    startKeyExpiryJob()
    logger.info('Key expiry job started')
  }
})
