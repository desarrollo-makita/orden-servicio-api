const axios = require('axios');
const logger = require('../config/logger.js');
const { sendEmailWithDB } = require('../config/email.js');
require('dotenv').config();


/**
 * API que genera el proceso completo del servicio tecnico , crea nota de venta interna y nota de venta
 * @param {*} req 
 * @param {*} res 
 */
async function ordenServicio(req, res) {
    
    try {
        
        logger.info(`Iniciamos la funcion ordenServicio`); 
        
        //microservicio obtener-pedidos
        logger.info(`Ejecuta microservcio obtener-pedidos-ms`); 
        const response = await axios.get(`http://172.16.1.206:${process.env.PORT_OBTENER_PEDIDOS}/ms/obtener-pedidos`);
        logger.debug(`Respuesta microservcio obtener-pedidos-ms ${JSON.stringify(response.data)}`); 
       
        if(response.data.pedidos){   
           
            //microservicio obtener-pedidos
            logger.info(`Ejecuta microservcio obtener-orden-servicio-ms`); 
            const osList = await axios.post(`http://172.16.1.206:${process.env.PORT_OBTENER_ORDENES}/ms/obtener-orden-servicio`, response.data);
            logger.debug(`Respuesta microservcio obtener-orden-servicio-ms ${JSON.stringify(osList.data)}`); 
            
            if(osList.data.length > 0){

                let data = {
                    osList : osList.data,
                    pedidosList: response.data.pedidos
                }
                
                // microservicio preparar data pedidos
                logger.info(`Ejecuta microservcio preparar-pedidos-ms`); 
                const arrayPedidos = await axios.post(`http://172.16.1.206:${process.env.PORT_PREPARAR_PEDIDOS}/ms/preparar-pedidos`,data);
                logger.debug(`Respuesta de microservicio preparar-pedidos ${JSON.stringify(arrayPedidos.data)}`);
                
                if(arrayPedidos.data.length > 0)
                {
                    // microservicio insertar-pedidos-ms
                    logger.info(`Ejecuta microservcio insertar-pedidos-ms`); 
                    const responsePedidos = await axios.post(`http://172.16.1.206:${process.env.PORT_INSERTAR_PEDIDOS}/ms/insertar-pedidos`,arrayPedidos.data);
                    logger.debug(`Respuesta de microservicio insertar-pedidos ${JSON.stringify(responsePedidos.data)}`);
                  
                    if (responsePedidos.data.length > 0) {
                        let data = {
                            arrayPedidos : arrayPedidos.data,
                            responsePedidos: responsePedidos.data
                        }
                        
                        // microservicio preparar-pedidos-detalle-ms
                        logger.info(`Ejecuta microservcio preparar-pedidos-detalle-ms`); 
                        const arrayPedidosItem = await axios.post(`http://172.16.1.206:${process.env.PORT_PREPARAR_PEDIDOS_DETALLE}/ms/preparar-pedidos-detalle`, data);
                        logger.debug(`Respuesta de microservicio preparar-pedidos-detalle-ms ${JSON.stringify(arrayPedidosItem.data)}`);
                         
                        // microservicio preparar-pedidos-detalle-ms
                        logger.info(`Ejecuta microservcio insertar-pedidos-detalle-ms`); 
                        const responsePedidosDet = await axios.post(`http://172.16.1.206:${process.env.PORT_INSERTAR_PEDIDOS_DETALLE}/ms/insertar-pedidos-detalle`, arrayPedidosItem.data );
                        logger.debug(`Respuesta de microservicio insertar-pedidos-detalle-ms ${JSON.stringify(responsePedidosDet.data)}`);
                        
                        for(element of responsePedidosDet.data){
                            if (element.returnValue === 1 && element.tipoDocumento === 'NOTA DE VTA INTERNA') {
                                 // microservicio crear-documento-nvi-ms
                                logger.info(`Ejecuta microservcio crear-documento-nvi-ms`); 
                                const crearDocumento = await axios.post(`http://172.16.1.206:${process.env.PORT_CREAR_DOC_NVI}/ms/crear-documento-nvi`, element );
                                logger.debug(`Respuesta de microservicio crear-documento-nvi-ms ${crearDocumento}`);
                            }else{
                                // microservicio crea-nota-venta
                                logger.info(`Ejecuta microservcio crea-nota-venta-ms`); 
                                const crearDocumentoVenta = await axios.post(`http://localhost:${process.env.PORT_CREAR_DOC_NV}/ms/crear-documento-nota-venta`, element );
                                logger.debug(`Respuesta de microservicio crea-nota-venta-ms ${crearDocumentoVenta}`);
                                
                            }
                        }
                        
                        res.status(200).json({mensaje : "Se generaron los Documentos con exito"});
                        logger.info(`Fin del proceso `);                         
                    }
                   
                }else
                {
                    res.status(404).json({mensaje : "No existen pedidos para actualizar"});
                }
            }
        }
    } catch (error) {
        logger.error(`Error al procesar las Ordenes de Servicio [ordenServicioController]: ${error.message}`);
        
        // Enviar el correo electrónico en caso de un problema
        await sendEmailWithDB(error);
        
        if (error.response && error.response.data) {
            const mensajeError = error.response.data.mensaje || error.response.data.error || 'Error desconocido';
            res.status(error.response.status || 500).json({ error: mensajeError });
        } else {
            res.status(500).json({ error: `Error en el servidor: ${error.message}` });
        }
        
    }
    
}

module.exports = {
    ordenServicio
};
