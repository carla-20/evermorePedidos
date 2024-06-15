const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let pedidos = [];
let pedidoID = 1;

// Variables para los totales por tipo de pago
let totales = {
  efectivo: 0,
  digital: 0,
  consumicion: 0,
  general: 0
};

app.use(express.static('public'));

io.on('connection', (socket) => {
  console.log('Nuevo cliente conectado');

  // Enviar los totales y pedidos actuales al cliente recién conectado
  socket.emit('actualizar-totales', totales);
  socket.emit('pedidos-actuales', pedidos);

  // Manejar nuevo pedido
  socket.on('nuevo-pedido', (pedido) => {
    pedido.id = pedidoID++;
    pedidos.push(pedido);

    // Actualizar los totales por tipo de pago
    actualizarTotales();

    io.emit('pedido-confirmado', pedido);
    io.emit('actualizar-totales', totales);
  });

  // Manejar cambio de estado
  socket.on('cambiar-estado', (id) => {
    const pedido = pedidos.find(p => p.id === id);
    if (pedido) {
      pedido.entregado = !pedido.entregado;
      io.emit('estado-actualizado', pedido);
    }
  });

  // Manejar anulación de pedido
  socket.on('anular-pedido', (id) => {
    pedidos = pedidos.filter(p => p.id !== id);

    // Actualizar los totales por tipo de pago
    actualizarTotales();

    io.emit('pedido-anulado', id);
    io.emit('actualizar-totales', totales);
  });

  socket.on('disconnect', () => {
    console.log('Cliente desconectado');
  });
});

// Función para actualizar los totales por tipo de pago
function actualizarTotales() {
  totales.efectivo = calcularTotalPorMetodo('Efectivo');
  totales.digital = calcularTotalPorMetodo('Digital');
  totales.consumicion = calcularTotalPorMetodo('Consumición');
  totales.general = totales.efectivo + totales.digital + totales.consumicion;
}

// Función para calcular el total por método de pago
function calcularTotalPorMetodo(metodo) {
  return pedidos
    .filter(p => p.metodoPago === metodo)
    .reduce((total, p) => total + parseFloat(p.total), 0);
}

server.listen(3000, '0.0.0.0', () => {
  console.log('Servidor corriendo en puerto 3000');
});