const { ordenServicio } = require('../controllers/ordenServicioControllers.js');
const { listaOrdenServicio } = require('../services/ordenServicioService.js');
const { dataValidaCliente, prepararDataPedidos, prepararDataPedidosDet } = require('../util/util.js');
const { obtenerPedidos, insertarPedidos } = require('../services/pedidosService.js');
const { insertarPedidosDetalle } = require('../services/pedidosDetalle.Service.js');
const { creaDocumento } = require('../services/creaDocumentoService.js');
const mock = require('../config/mock.js');

jest.mock('../services/pedidosService.js');
jest.mock('../services/pedidosDetalle.Service.js');
jest.mock('../services/creaDocumentoService.js');
jest.mock('../services/ordenServicioService.js');
jest.mock('../util/util.js');

describe('ordenServicio', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('no se encuentran pedidos pendientes para procesar 404 : ', async () => {
        // Mockear la respuesta de obtenerPedidos
        obtenerPedidos.mockResolvedValueOnce(mock.dataNotFound);

        

        // Simular solicitud y respuesta
        const req = {};
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        // Llamar a la función a probar
        await ordenServicio(req, res);

        // Verificar que la función responda con el estado 404 y el mensaje adecuado
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ mensaje: 'No se encontraron pedidos pendientes para procesar' });
    });

    it('se realiza el proceso exitoso 200', async () => {
      // Mockear la respuesta de obtenerPedidos
      obtenerPedidos.mockResolvedValueOnce(mock.obtenerPedidosControllers);

      // Mockear la respuesta de listaOrdenServicio
      listaOrdenServicio.mockResolvedValueOnce(mock.osListControllers);

      // Mockear la respuesta de dataValidaCliente
      dataValidaCliente.mockResolvedValueOnce(mock.dataValidaControllers);

      // Mockear la respuesta de prepararDataPedidos
      prepararDataPedidos.mockResolvedValueOnce(mock.prepararDataPedidosControllers);

      // Mockear la respuesta de insertarPedidos
      insertarPedidos.mockResolvedValueOnce(mock.insertarPedidosControllers);

      // Mockear la respuesta de prepararDataPedidosDet
      prepararDataPedidosDet.mockResolvedValueOnce(mock.prepararDataPedidosDetControllers);

      // Mockear la respuesta de insertarPedidosDetalle
      insertarPedidosDetalle.mockResolvedValueOnce(mock.insertarPedidosDetalleControllers);

      // Mockear la respuesta de creaDocumento
      creaDocumento.mockResolvedValueOnce(mock.creaDocumentoControllers);

      // Simular solicitud y respuesta
      const req = {};
      const res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
      };

      // Llamar a la función a probar
      await ordenServicio(req, res);

      // Verificar que la función responda con el estado 404 y el mensaje adecuado
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ response: "Se genero documento correctamente" });
    });

    it('dataOrdenServicio.mensaje es verdadero 404', async () => {
      // Mockear la respuesta de obtenerPedidos
      obtenerPedidos.mockResolvedValueOnce(mock.obtenerPedidosControllers);
  
      // Mockear la respuesta de listaOrdenServicio
      listaOrdenServicio.mockResolvedValueOnce(mock.osListControllers);
  
      // Mockear la respuesta de dataValidaCliente
      dataValidaCliente.mockResolvedValueOnce({ mensaje: 'Mensaje de error' }); // Simulamos que dataOrdenServicio.mensaje es verdadero
  
      // Simular solicitud y respuesta
      const req = {};
      const res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
      };
  
      // Llamar a la función a probar
      await ordenServicio(req, res);
  
      // Verificar que la función responda con el estado 404 y el mensaje adecuado
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ mensaje: 'Mensaje de error' });
    });

    it('arrayPedidos.length es igual a 0, se devuelve 500', async () => {
      // Mockear la respuesta de obtenerPedidos
      obtenerPedidos.mockResolvedValueOnce(mock.obtenerPedidosControllers);
  
      // Mockear la respuesta de listaOrdenServicio
      listaOrdenServicio.mockResolvedValueOnce(mock.osListControllers);
  
      // Mockear la respuesta de dataValidaCliente
      dataValidaCliente.mockResolvedValueOnce(mock.dataValidaControllers);
  
      // Mockear la respuesta de prepararDataPedidos para que devuelva un arreglo vacío
      prepararDataPedidos.mockResolvedValueOnce([]);
  
      // Simular solicitud y respuesta
      const req = {};
      const res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
      };
  
      // Llamar a la función a probar
      await ordenServicio(req, res);
  
      // Verificar que la función responda con el estado 500 y el mensaje adecuado
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ mensaje: "no data" });
    });

    it('maneja correctamente los errores', async () => {
      // Crear un spy para console.error
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  
      // Mockear la respuesta de obtenerPedidos para que arroje una excepción
      obtenerPedidos.mockRejectedValueOnce(new Error('Error al obtener pedidos'));
  
      // Simular solicitud y respuesta
      const req = {};
      const res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
      };
  
      // Llamar a la función a probar
      await ordenServicio(req, res);
  
      // Verificar que la función responda con el estado 500 y el mensaje adecuado
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ descripcion: 'Error al procesar la solicitud', status: 500 });
      
      // Verificar que console.error fue llamado con los argumentos adecuados
      expect(consoleSpy).toHaveBeenCalledWith('Error al procesar las Ordenes de Servicio [ordenServicioController]:', 'Error al obtener pedidos');
  
      // Restaurar la implementación original de console.error
      consoleSpy.mockRestore();
  });
  
  

    
});
