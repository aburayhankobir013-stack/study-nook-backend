const express = require("express");
const { MongoClient, ServerApiVersion } = require("mongodb");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const PORT = process.env.PORT;
const MONGODB_URI = process.env.MONGODB_URI;

const app = express();
app.use(cors());
app.use(express.json());

app.listen(PORT, () => {
  console.log(`Server started on port: ${PORT}`);
});

const client = new MongoClient(MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    const all_roomsDB = client.db("all_roomsDB");
    const all_rooms = all_roomsDB.collection("all_rooms");
    app.get("/", async (request, response) => {
      const limitedRooms = await all_rooms.find().limit(8).toArray();
      response.send(limitedRooms);
    });
    app.post("/add_room", async (request, response) => {
      const roomData = request.body;
      const data = await all_rooms.insertOne(roomData);
      response.json({
        success: true,
        message: "Successfully room published",
        insertedId: data.insertedId,
      });
    });
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);
