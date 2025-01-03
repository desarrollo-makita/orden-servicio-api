const axios = require("axios");
const logger = require("../config/logger.js");
const { sendEmailWithDB } = require("../config/email.js");
const { rolbackData } = require("../config/rolbackData.js");
require("dotenv").config();

/**
 * API que genera el proceso completo del servicio tecnico , crea nota de venta interna y nota de venta
 * @param {*} req
 * @param {*} res
 */
async function ordenServicio(req, res) {
  let pedidosInsertados = [];
  let pedidosNoInsertados = [];

  try {
    logger.info(`Iniciamos la funcion ordenServicio`);

    //microservicio obtener-pedidos-ms
    logger.info(`Ejecuta microservcio obtener-pedidos-ms`);
    const response = await axios.get(`http://172.16.1.206:${process.env.PORT_OBTENER_PEDIDOS}/ms/obtener-pedidos`);
    logger.debug(`Respuesta microservcio obtener-pedidos-ms ${JSON.stringify(response.data)}`);

    if (response.data.pedidos) {
      //microservicio obtener-orden-servicio-ms
      logger.info(`Ejecuta microservcio obtener-orden-servicio-ms`);
      const osList = await axios.post(
        `http://172.16.1.206:3007/ms/obtener-orden-servicio`,
        response.data
      );
      logger.debug(
        `Respuesta microservcio obtener-orden-servicio-ms ${JSON.stringify(
          osList.data
        )}`
      );

      //microservicio insertar-documentos-ms
      logger.info(`Ejecuta microservcio insertar-documentos-ms`);
      const responseDocumentos = await axios.post(
        `http://172.16.1.206:3023/ms/insertar-documentos`,
        osList.data
      );
      logger.debug(
        `Respuesta microservcio insertar-documentos-ms 
        )}`
      );

      if (osList.data.length > 0) {
        let data = {
          osList: osList.data,
          pedidosList: response.data.pedidos,
        };

        // microservicio preparar data pedidos
        logger.info(`Ejecuta microservcio preparar-pedidos-ms`);
        const arrayPedidos = await axios.post(
          `http://172.16.1.206:3008/ms/preparar-pedidos`,
          data
        );
        logger.debug(
          `Respuesta de microservicio preparar-pedidos ${JSON.stringify(
            arrayPedidos.data
          )}`
        );
        if (arrayPedidos.data.length > 0) {
          // microservicio insertar-pedidos-ms
          logger.info(`Ejecuta microservcio insertar-pedidos-ms`);
          console.log("Looooooooooooog :", arrayPedidos.data);
          const responsePedidos = await axios.post(
            `http://172.16.1.206:3009/ms/insertar-pedidos`,
            arrayPedidos.data
          );
          logger.debug(
            `Respuesta de microservicio insertar-pedidos ${JSON.stringify(
              responsePedidos.data
            )}`
          );
          for (resPedido of responsePedidos.data) {
            if (resPedido.output.Insertado === 0) {
              pedidosInsertados.push(resPedido.data);
            } else if (resPedido.output.Insertado === 1) {
              pedidosNoInsertados.push(resPedido.data);
            }
          }
          if (pedidosInsertados.length > 0) {
            let data = {
              arrayPedidos: pedidosInsertados,
              responsePedidos: responsePedidos.data,
            };

            // microservicio preparar-pedidos-detalle-ms
            logger.info(`Ejecuta microservcio preparar-pedidos-detalle-ms`);
            const arrayPedidosItem = await axios.post(
              `http://172.16.1.206:3010/ms/preparar-pedidos-detalle`,
              data
            );
            logger.debug(
              `Respuesta de microservicio preparar-pedidos-detalle-ms ${JSON.stringify(
                arrayPedidosItem.data
              )}`
            );

            // microservicio insertar-pedidos-detalle-ms
            logger.info(`Ejecuta microservcio insertar-pedidos-detalle-ms`);
            const responsePedidosDet = await axios.post(
              `http://172.16.1.206:3011/ms/insertar-pedidos-detalle`,
              arrayPedidosItem.data
            );
            logger.debug(
              `Respuesta de microservicio insertar-pedidos-detalle-ms ${JSON.stringify(
                responsePedidosDet.data
              )}`
            );

            // Crear un nuevo arreglo filtrado
            const filteredData = responsePedidosDet.data.filter(
              (value, index, self) =>
                // Usamos el `findIndex` para asegurarnos de que solo se quede el primer objeto con un `pedido` único
                index === self.findIndex((t) => t.pedido === value.pedido)
            );

            console.log(
              "filteredData0000000000000000000000000000000000001: ",
              filteredData
            );

            for (element of filteredData) {
              if (
                element.returnValue === 1 &&
                element.tipoDocumento === "NOTA DE VTA INTERNA"
              ) {
                // microservicio crear-documento-nvi-ms
                console.log("elemeeeeeeeeeeeeeeent : ", element);
                logger.info(`Ejecuta microservcio crear-documento-nvi-ms`);
                const crearDocumento = await axios.post(
                  `http://172.16.1.206:3015/ms/crear-documento-nvi`,
                  element
                );
                logger.debug(
                  `Respuesta de microservicio crear-documento-nvi-ms ${crearDocumento}`
                );
              } else if (
                element.returnValue === 1 &&
                element.tipoDocumento === "NOTA DE VENTA"
              ) {
                // microservicio crea-nota-venta
                logger.info(`Ejecuta microservcio crea-nota-venta-ms`);
                const crearDocumentoVenta = await axios.post(
                  `http://172.16.1.206:3015/ms/crear-documento-nota-venta`,
                  element
                );
                logger.debug(
                  `Respuesta de microservicio crea-nota-venta-ms ${crearDocumentoVenta}`
                );
              }
            }
            logger.info("Fin del proceso");
            res.status(200).json({
              listaPedidosInsertados: pedidosInsertados,
              pedidosRepetidos: pedidosNoInsertados,
            });
          } else {
            res
              .status(404)
              .json({ mensaje: "No existen pedidos para actualizar" });
          }
        } else {
          res.status(404).json({ mensaje: "No existen pedidos para procesar" });
        }
      }
    }
  } catch (error) {
    console.log("errorrrrrrrrrrrrr", error);
    logger.error(
      `Error al procesar las Ordenes de Servicio [ordenServicioController]: ${error.message}`
    );

    // Enviar el correo electrónico en caso de un problema
    // await sendEmailWithDB(error);
    // vuelve atras en caso de falla
    if (pedidosInsertados.length > 0) {
      await rolbackData(pedidosInsertados);
    }

    if (error.response && error.response.data) {
      const mensajeError =
        error.response.data.mensaje ||
        error.response.data.error ||
        "Error desconocido";
      res.status(error.response.status || 500).json({ error: mensajeError });
    } else {
      console.log("Error _ " , error);
      res.status(500).json({ error: `Error en el servidor: ${error.message}` });
    }
  }
}

module.exports = {
  ordenServicio,
};
