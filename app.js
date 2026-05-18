const express = require("express");
const { MongoClient, ServerApiVersion } = require('mongodb');
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const PORT=process.env.PORT;
const MONGODB_URI=process.env.MONGODB_URI;

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
  }
});

async function run() {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    await client.close();
  }
}
run().catch(console.dir);