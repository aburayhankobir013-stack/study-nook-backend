const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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
    const all_bookings = all_roomsDB.collection("all_bookings");

    // LIMITED ROOMS ROUTE
    app.get("/", async (request, response) => {
      const limitedRooms = await all_rooms.find().limit(8).toArray();
      response.send(limitedRooms);
    });

    // ALL ROOMS ROTUE
    app.get("/rooms", async (request, response) => {
      const rooms = await all_rooms.find().toArray();
      response.send(rooms);
    });

    // SINGLE ROOM ROUTE
    app.get("/room_details/:roomId", async (request, response) => {
      const roomId = request.params.roomId;
      const query = { _id: new ObjectId(roomId) };
      const room = await all_rooms.findOne(query);
      response.send(room);
    });

    // PUST REQUEST HANDLE
    app.put("/room_details/:roomId", async (request, response) => {
      try {
        const { roomId } = request.params;
        const updatedData = request.body;

        if (!ObjectId.isValid(roomId)) {
          return response.status(400).json({
            success: false,
            message: "Invalid Room Id!",
          });
        }

        const result = await all_rooms.updateOne(
          { _id: new ObjectId(roomId) },
          { $set: updatedData },
        );

        if (result.matchedCount === 0) {
          return response.status(404).json({
            success: false,
            message: "Room not found!",
          });
        }

        return response.status(200).json({
          success: true,
          message: "Room successfully updated!",
          modifiedCount: result.modifiedCount,
        });
      } catch (error) {
        console.error(`Update room error: ${error}`);
        return response.status(500).json({
          success: false,
          message: "Internal server error!",
        });
      }
    });

    // DELETE ROUTE
    app.delete("/room_details/:roomId", async (request, response) => {
      try {
        const roomId = request.params.roomId;
        const query = { _id: new ObjectId(roomId) };
        const result = await all_rooms.deleteOne(query);
        const relatedBookingsDelete = await all_bookings.deleteMany({"roomDetails._id": new ObjectId(roomId)});
        response.json({
          success: true,
          message: "Successfully deleted room!",
        });
      } catch (error) {
        response.json({
          success: false,
          message: "Faild to delete room!",
        });
      }
    });

    // BOOKING ROUTE
    app.post("/room_details/:roomId", async (request, response) => {
      const {
        price,
        startTime,
        endTime,
        status,
        bookingDate,
        roomDetails: { _id, room_name, image_url },
        user: { sessionEmail },
      } = request.body;

      const storeBookingData = {
        price,
        startTime,
        endTime,
        status,
        bookingDate,
        roomDetails: {
          _id: new ObjectId(_id),
          room_name,
          image_url,
        },
        user: {
          sessionEmail,
        },
      };

      const existingBookings = await all_bookings.findOne({
        startTime,
        endTime,
        bookingDate,
        "roomDetails._id": new ObjectId(_id),
      });
      if (existingBookings) {
        return response.json({
          success: false,
          message: "Already booked!",
        });
      } else {
        const result = await all_bookings.insertOne(storeBookingData);
        return response.json({
          success: true,
          message: "Booking confirmed!",
        });
      }
    });

    // GET ALL BOOKINGS
    app.get("/my_bookings", async (request, response) => {
      const email = request.query.email;
      const query = { "user.sessionEmail": email };
      const result = await all_bookings.find(query).toArray();
      response.send(result);
    });

    // UPDATE STATUS ROUTE
    app.patch("/my_bookings/:bookingId", async (request, response) => {
      const { bookingId } = request.params;
      const updatedStatus = request.body;
      const result = await all_bookings.updateOne(
        { _id: new ObjectId(bookingId) },
        {
          $set: updatedStatus,
        },
      );
      return response.json({
        success: true,
        message: "Status updated!",
      });
    });

    // DELETE BOOKING ROUTE
    app.delete("/my_bookings/:bookingId", async (request, response) => {
      const {bookingId} = request.params;
      const query = {_id: new ObjectId(bookingId)};
      const result = await all_bookings.deleteOne(query);
      return response.json({
        success: true,
        message: "Booking successfully deleted!"
      }); 
    });

    // ROOM CREATION ROUTE
    app.post("/add_room", async (request, response) => {
      const roomData = request.body;
      const data = await all_rooms.insertOne(roomData);
      response.json({
        success: true,
        message: "Successfully room published",
        insertedId: data.insertedId,
      });
    });

    // MY LISTINGS ROUTE
    app.post("/my_listings", async (request, response) => {
      const userEmail = request.body.email;
      const query = { "user.email": userEmail };
      const emailBasedRooms = await all_rooms.find(query).toArray();
      response.send(emailBasedRooms);
    });
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);
