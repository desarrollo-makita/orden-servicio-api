const express = require('express');
const { connectToDatabase } = require('./config/database');
const routes = require('./routes/routes');
require('dotenv').config();
const logger = require('./config/logger.js');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(express.json());

app.use('/api', routes);

// Iniciar el servidor después de la conexión a la base de datos
connectToDatabase().then(() => {
    app.listen(PORT, () => {
        logger.info(`Servidor escuchando en el puerto ${PORT}`);
    });
}).catch(error => {
    logger.error(`Error al iniciar el servidor ${error}`);
    process.exit(1); // Termina el proceso con un código de error
});
