const WebSocket = require("ws");
const Redis = require("ioredis");

const redis = new Redis({ host: "redis", port: 6379 });

const wss = new WebSocket.Server({ port: 7001 });

console.log("Driver WS running on 7001");

wss.on("connection", (ws, req) => {
  console.log("Driver Connected");

  ws.on("message", async (msg) => {
    const data = JSON.parse(msg);

    // DRIVER GO ONLINE
    if (data.type === "ONLINE") {
      const { driverId, zone } = data;

      await redis.sadd(`zone:${zone}`, driverId);
      await redis.set(`driver:${driverId}:zone`, zone);
      await redis.set(`driver:${driverId}:socket`, driverId);

      ws.driverId = driverId;

      console.log(`Driver ${driverId} online in ${zone}`);
    }

    // DRIVER ACCEPT RIDE
    if (data.type === "ACCEPT_RIDE") {
      const { rideId, driverId } = data;

      const lock = await redis.setnx(`ride:${rideId}:lock`, driverId);

      if (lock === 1) {
        await redis.hset(`ride:${rideId}`, "status", "BOOKED", "driverId", driverId);

        ws.send(JSON.stringify({
          type: "RIDE_CONFIRMED",
          rideId
        }));

        console.log(`Ride ${rideId} booked by ${driverId}`);
      } else {
        ws.send(JSON.stringify({
          type: "RIDE_ALREADY_TAKEN",
          rideId
        }));
      }
    }
  });

  ws.on("close", async () => {
    if (ws.driverId) {
      const zone = await redis.get(`driver:${ws.driverId}:zone`);
      await redis.srem(`zone:${zone}`, ws.driverId);
      console.log(`Driver ${ws.driverId} offline`);
    }
  });
});


// Driver-Service Listen for Ride Events

const sub = new Redis({ host: "redis", port: 6379 });

sub.subscribe("ride_requests");

sub.on("message", async (_, message) => {
  const ride = JSON.parse(message);

  const drivers = await redis.smembers(`zone:${ride.zone}`);

  drivers.forEach(driverId => {
    wss.clients.forEach(client => {
      if (client.driverId == driverId) {
        client.send(JSON.stringify({
          type: "NEW_RIDE",
          ride
        }));
      }
    });
  });
});
