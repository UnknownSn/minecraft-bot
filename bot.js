const express = require("express");
const mineflayer = require('mineflayer');
const pvp = require('mineflayer-pvp').plugin;
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const armorManager = require('mineflayer-armor-manager');

const app = express();
app.use(express.json());

// Ruta principal para UptimeRobot
app.get("/", (_, res) => {
  res.send("Bot activo");
});

// Iniciar el servidor HTTP
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});

// Función para mover el bot en un patrón
function moveInPattern(bot) {
  if (bot.pvp.target) return; // No mover si está en combate

  const initialPos = bot.entity.position.clone();
  const positions = [
    initialPos.offset(2, 0, 0), // Adelante
    initialPos.offset(2, 0, 2), // Derecha
    initialPos.offset(0, 0, 2), // Atrás
    initialPos.offset(0, 0, 0), // Izquierda (posición inicial)
  ];

  let index = 0;
  const move = () => {
    if (index >= positions.length) index = 0;
    const pos = positions[index];
    bot.pathfinder.setGoal(new goals.GoalBlock(pos.x, pos.y, pos.z));
    index++;
    setTimeout(move, 2000); // Mover cada 2 segundos
  };
  move();
}

function createBot() {
  const bot = mineflayer.createBot({
    host: 'hambre.falixsrv.me', // Dirección del servidor
    port: 20935, // Puerto del servidor
    username: 'Unknown', // Nombre del bot
    version: false, // Versión de Minecraft (false = automático)
  });

  bot.loadPlugin(pvp);
  bot.loadPlugin(armorManager);
  bot.loadPlugin(pathfinder);

  // Contraseña para registro y login
  const password = 'bot112022'; // Cambia esto por la contraseña que desees

  // Escuchar mensajes del servidor
  bot.on('message', (message) => {
    const msg = message.toString(); // Convierte el mensaje a texto

    // Detectar si el servidor pide registro
    if (msg.includes('/register') || msg.includes('registrarse')) {
      console.log('Servidor pide registro. Registrando bot...');
      bot.chat(`/register ${password} ${password}`); // Registra al bot
    }

    // Detectar si el servidor pide login
    if (msg.includes('/login') || msg.includes('iniciar sesión')) {
      console.log('Servidor pide inicio de sesión. Iniciando sesión...');
      bot.chat(`/login ${password}`); // Inicia sesión
    }
  });

  // Eventos y lógica del bot
  bot.on('playerCollect', (collector, itemDrop) => {
    if (collector !== bot.entity) return;
    setTimeout(() => {
      const sword = bot.inventory.items().find(item => item.name.includes('sword'));
      if (sword) bot.equip(sword, 'hand');
    }, 150);
  });

  bot.on('playerCollect', (collector, itemDrop) => {
    if (collector !== bot.entity) return;
    setTimeout(() => {
      const shield = bot.inventory.items().find(item => item.name.includes('shield'));
      if (shield) bot.equip(shield, 'off-hand');
    }, 250);
  });

  let guardPos = null;

  function guardArea(pos) {
    guardPos = pos.clone();
    if (!bot.pvp.target) moveToGuardPos();
  }

  function stopGuarding() {
    guardPos = null;
    bot.pvp.stop();
    bot.pathfinder.setGoal(null);
  }

  function moveToGuardPos() {
    const mcData = require('minecraft-data')(bot.version);
    bot.pathfinder.setMovements(new Movements(bot, mcData));
    bot.pathfinder.setGoal(new goals.GoalBlock(guardPos.x, guardPos.y, guardPos.z));
  }

  bot.on('stoppedAttacking', () => {
    if (guardPos) moveToGuardPos();
  });

  bot.on('physicTick', () => {
    if (bot.pvp.target) return;
    if (bot.pathfinder.isMoving()) return;
    const entity = bot.nearestEntity();
    if (entity) bot.lookAt(entity.position.offset(0, entity.height, 0));
  });

  bot.on('physicTick', () => {
    if (!guardPos) return;
    const filter = e => e.type === 'mob' && e.position.distanceTo(bot.entity.position) < 16 &&
      e.mobType !== 'Armor Stand';
    const entity = bot.nearestEntity(filter);
    if (entity) bot.pvp.attack(entity);
  });

  bot.on('chat', (username, message) => {
    if (message === 'guard') {
      const player = bot.players[username];
      if (player) {
        bot.chat('I will!');
        guardArea(player.entity.position);
      }
    }
    if (message === 'stop') {
      bot.chat('I will stop!');
      stopGuarding();
    }
  });

  bot.on('kicked', console.log);
  bot.on('error', console.log);
  bot.on('end', createBot);

  // Mueve el bot en un patrón cada 2.5 minutos
  setInterval(() => {
    moveInPattern(bot);
  }, 150000); // 150000 milisegundos = 2.5 minutos
}

createBot();
