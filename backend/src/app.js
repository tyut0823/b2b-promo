const express = require('express');
const cors = require('cors');

const app = express();

app.use(express.json());
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173' }));

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

if (process.env.NODE_ENV !== 'production') {
  const swaggerUi = require('swagger-ui-express');
  const swaggerDocument = require('../../docs/swagger.json');
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
}

app.use(require('./routes'));

const errorHandler = require('./middlewares/errorHandler');
app.use(errorHandler);

module.exports = app;
