const axios = require('axios');
const { obtenerPedidos, insertarPedidos  } = require('../services/pedidosService.js');
const { connectToDatabase, closeDatabaseConnection } = require('../config/database.js');
const sql = require('mssql');
const  mock  = require('../config/mock.js');

// Define la función formatDate
const formatDate = (date) => {
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
};
    

jest.mock('axios');
jest.mock('mssql');

describe('obtenerPedidos', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('servicio exitoso busca obtener pedidos', async () => {
        
       axios.get.mockResolvedValueOnce(mock.obtenerPedidosService);

        const response = await obtenerPedidos();
       
        expect(response).toEqual({
            itemList: expect.any(Array),
            pedidos: expect.any(Array),
        });
    });

    it('debería devolver un mensaje cuando no se encuentran pedidos pendientes', async () => {
        
        axios.get.mockResolvedValueOnce(mock.obtenerPedidosServiceEmpty);
 
        const response = await obtenerPedidos();
        
         // Verificar que la función devuelva el mensaje adecuado
        expect(response).toEqual({ mensaje: 'No se encontraron pedidos pendientes para procesar' });
     });

     xit('debería insertar pedidos correctamente', async () => {
        // Mockea la conexión a la base de datos y la solicitud
        const mockRequest = {
            input: jest.fn(),
            output: jest.fn(),
            execute: jest.fn().mockResolvedValueOnce({ recordset: [{ ID_Pedido: 1, TipoDocumento: 'NOTA VTA INTERNA' }] })
        };
        const mockConnection = {
            request: jest.fn().mockReturnValue(mockRequest)
        };
        sql.connect = jest.fn().mockResolvedValueOnce(mockConnection);
    
        // Define los datos de prueba
        const mockData = [{ pedido: 1, tipoDocumento: 'NOTA VTA INTERNA', /* Otros datos... */ }];
    
        // Llama a la función a probar
        const response = await insertarPedidos(mockData);
    
        // Verifica que la función haya interactuado correctamente con la base de datos
        expect(sql.connect).toHaveBeenCalled();
        expect(mockConnection.request).toHaveBeenCalled();
        expect(mockRequest.input).toHaveBeenCalledWith('ID_Pedido', /* Tipo de dato de ID_Pedido */ /* Valor de ID_Pedido */);
        // Asegúrate de verificar otros inputs aquí...
        expect(mockRequest.execute).toHaveBeenCalledWith('insertaPedidoSP');
        expect(response).toEqual([{ ID_Pedido: 1, TipoDocumento: 'NOTA VTA INTERNA' }]);
    });
    
    
    
    
    

    it('should throw an error if API call fails', async () => {
        const errorMessage = 'Failed to fetch data';
        axios.get.mockRejectedValueOnce(new Error(errorMessage));

        await expect(obtenerPedidos()).rejects.toThrow(errorMessage);
    });

    it('debería formatear la fecha correctamente', () => {
        const date = new Date('2024-05-06T12:34:56');
        const formattedDate = formatDate(date);
        expect(formattedDate).toBe('6/5/2024'); // Verifica si la fecha se formateó correctamente
    });


});
