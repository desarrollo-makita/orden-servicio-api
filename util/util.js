const sql = require('mssql');
const { connectToDatabase, closeDatabaseConnection } = require('../config/database.js');
const logger = require('../config/logger.js');
const { insertarOrdenServicio } = require('../services/ordenServicioService.js');


/**
 * Consultamos base de datos telecontrol(makita)
 * @param {*} osArray 
 * @returns 
 */
async function validarDatos(newArray) {

    try {
        logger.info(`Iniciamos la funcion validarDatos`);
        let osDataList = [];
        await connectToDatabase('Telecontrol');
        for (const os of newArray) {

            const consulta = `SELECT * FROM OrdenesServicio where ID_OS = '${os.os}'`;
            const result = await sql.query(consulta);

            if(result.recordset.length === 0){
                osDataList.push(os);
            }
        }
        await closeDatabaseConnection();

        if(osDataList.length > 0 ){
            await insertarOrdenServicio(osDataList);
        }
        
        logger.info(`Fin a la funcion validarDatos`);
       
        return ;
    } catch (error) {
        console.error('Error al validar orden de servicio:', error.message);
        throw error;
    }
}

/**
 * Consulta Tabla entidad BD BdqMakita
 * @param {*} tabla 
 * @param {*} entidad 
 * @returns 
 */
async function validarCliente(tabla, entidad) {
    logger.info(`Iniciamos la funcion validarCliente`);
    let validacionCliente;
    try {

        // Conectarse a la base de datos 'BdQMakita'
        await connectToDatabase('BdQMakita');
        const consulta = `SELECT * FROM ${tabla} WHERE Entidad= '${entidad}' and tipoEntidad = 'cliente' and vigencia = 'S'`;
        const result = await sql.query(consulta);

        validacionCliente = result.recordset;

        await closeDatabaseConnection();
        logger.info(`Fin  la funcion validarCliente ${JSON.stringify(validacionCliente)}`);
        return validacionCliente;
    } catch (error) {
        logger.error('Error al validar datos del cliente:', error.message);
        throw error;
    }
}

/**
 * Enviamos Ordenes de servicio para verificar si servicio tecnico es usuario makita
 * @param {*} osArray 
 * @returns 
 */
async function dataValidaCliente(osArray) {
    
    logger.info(`Iniciamos la funcion dataValidaCliente`);
    let newArray = [];
    let newData;

    try {

        for (const os of osArray) {
            const codigoPosto = os.codigo_posto.trim();
            // Obtener data de tabla entidad para validar cliente
            let resultadoConsulta = await validarCliente(process.env.ENTIDAD_TABLE, codigoPosto);

            // recorremos las ordenes de servicio si el length es mayo a 0 es por que el clienteexiste en makita.
            if (resultadoConsulta.length > 0) {
                logger.info(`El dato  ${codigoPosto} se encuentra en nuestra lista de servicio tecnico.`);
                for (dataServicioTecnico of resultadoConsulta) {
                    os.direccion = dataServicioTecnico.Direccion;
                }
                newArray.push(os);

            }
        }
        if (newArray.length === 0) {
            logger.log( 'La data a procesar no es un servicio tecnico de makita');
            return newData = { mensaje: 'La data a procesar no es un servicio tecnico de makita' };
        }

        await validarDatos(newArray);// revisamos si la data que tenemos para ingresar se encuentra ingresada en la BD telecontrol


    } catch (error) {
        logger.error(`Error dataValidaCliente: ${error.message}` );
        throw error;
    }

    logger.info(`Fin de la funcion dataValidaCliente`);
    return newArray;
}


/**
 * Obtener fecha actual en formato YYY-MM-DD
 */
async function obtenerFechaActual() {

    const fecha = new Date();
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0'); // Agregar un 0 al mes si es necesario
    const day = String(fecha.getDate()).padStart(2, '0'); // Agregar un 0 al día si es necesario

    return `${year}-${month}-${day}`;
}


/**
 * Preparamos lista de pedidos para devolver solo con entiadad cliente maikita
 * @param {*} osList
 * @param {*} pedidosList  
 * @returns 
 */
async function prepararDataPedidos(osList, pedidosList) {
    logger.info(`Iniciamos la funcion prepararDataPedidos`);
    console.log("osList : " ,osList);
    console.log('pedidosList : ' , pedidosList);
    let arrayPedidosFormated = [];
    let arrayPedidosData = [];
    let arrayPedidosRepetidos = [];
    try {
        let dataOrdenServicio = await dataValidaCliente(osList);// Dejamos solo las OS que tienen los servicio tecnicos de makita
        for (let i = 0; i < pedidosList.length; i++) {
            for (let j = 0; j < dataOrdenServicio.length; j++) {
                if (pedidosList[i].pedido === dataOrdenServicio[j].idPedido) {
                    
                    let objetoComparacion = { ...pedidosList[i] };
                    objetoComparacion.codigo_posto = dataOrdenServicio[j].codigo_posto;
                    objetoComparacion.informeTecnico = dataOrdenServicio[j].defeito_reclamado;
                    objetoComparacion.modelo = dataOrdenServicio[j].referencia;
                    objetoComparacion.serie = dataOrdenServicio[j].serie;
                    objetoComparacion.nombreServicioTecnico = dataOrdenServicio[j].nome;
                    objetoComparacion.direccion = dataOrdenServicio[j].direccion;
                    objetoComparacion.fechaCompra = dataOrdenServicio[j].data_nf;
                    objetoComparacion.distribuidor = dataOrdenServicio[j].revenda;
                    objetoComparacion.numeroDocumento = dataOrdenServicio[j].nota_fiscal;
                    objetoComparacion.data = dataOrdenServicio[j].data_digitacao;

                    arrayPedidosFormated.push(objetoComparacion);
                }
            }
        }
        for (const objeto of arrayPedidosFormated) {
            let os_valor = objeto.itens[0].os;
            objeto.os = os_valor;

            let validaPedido = await validaDataPedidos(objeto);// revisa que el pedido no se haya ingresqado anteriormente
            if (validaPedido.length > 0) {
                
                arrayPedidosRepetidos.push(objeto);
            } else {
               
                arrayPedidosData.push(objeto);
            }
        }

        logger.info(`Pedidos Repetidos, ${(arrayPedidosRepetidos.length )}`);
        logger.info(`Pedidos para insertar , ${(arrayPedidosData.length)}` );
        logger.info(`Fin de la funcion prepararDataPedidos`);
        return arrayPedidosData;
    } catch (error) {
        logger.error('Error al validar pedido:', error.message);
        throw error;
    }

}

/**
 * Preparamos data para insertsar en tabla pedidosDet
 * @param {*} arrayPedidos 
 * @param {*} responsePedidos 
 */
async function prepararDataPedidosDet(arrayPedidos, responsePedidos) {
    logger.info(`Iniciamos la funcion prepararDataPedidosDet`);
    console.log("arrayPedidos : " , arrayPedidos);
    console.log("responsePedido" , responsePedidos);
    let data;
    let itemList = arrayPedidos.flatMap(elemento =>
        elemento.itens.map(item => ({
            ...item,
            pedido: elemento.pedido,
            tipoDocumento: elemento.tipoDocumento,
            folio: elemento.pedido,
            rutCliente: elemento.codigo_posto,
            observacion:elemento.observacao


        }))
    );

    // setear Correlativo a objeto item
    for (item of itemList) {
        const pedidoEncontrado = responsePedidos.find(pedido => pedido.idPedido === item.pedido);
        if (pedidoEncontrado) {
            item.ID = pedidoEncontrado.output.ID;
            let tipoItem = await obtenerTipoItem(item);
            item.tipoItem = tipoItem;

        }
    };

    // setear Correlativo a objeto pedidos
    arrayPedidos.forEach(item => {
        const pedidoEncontrado = responsePedidos.find(pedido => pedido.idPedido === item.pedido);
        if (pedidoEncontrado) {
            item.ID = pedidoEncontrado.output.ID;
        }
    });




    logger.debug(`Fin de la funcion prepararDataPedidosDet `);
    return data = { item: itemList, pedidos: arrayPedidos };
}


/**
 * Consultamos base de datos telecontrol(makita)
 * @param {*} objPedido 
 * @returns 
 */
async function validaDataPedidos(objPedido) {

    try {
        await connectToDatabase('Telecontrol');

        const consulta = `SELECT * FROM Pedidos where ID_Pedido = '${objPedido.pedido}'`;
        const result = await sql.query(consulta);

        await closeDatabaseConnection();

        return result.recordset;

    } catch (error) {
        console.error('Error al consultar pedidos por ID:', error.message);
        throw error;
    }
}

async function obtenerTipoItem(item) {

    try {

        await connectToDatabase('BdQMakita');
        let tipoItem;
        const consulta = `SELECT * FROM Item where item = '${item.referencia}'`;
        const result = await sql.query(consulta);

        if (result.recordset.length > 0) {
            for (repuesto of result.recordset) {
                tipoItem = repuesto.TipoItem;
            }
        }

        await closeDatabaseConnection();

        return tipoItem;

    } catch (error) {
        console.error('Error al consultar pedidos por ID:', error.message);
        throw error;
    }
}
module.exports = { validarDatos, validarCliente, obtenerFechaActual, dataValidaCliente, prepararDataPedidos, prepararDataPedidosDet };
