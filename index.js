const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const uri =
  `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qr87ub2.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if(!authorization){
    return res.status(403).send({error: 1, message: 'unauthorized access'});
  }
  const token = authorization.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
    if(error){
      return res.status(401).send({error: 1, message:'CHOR access'})
    }
    req.decoded = decoded;
    next();
  })
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const serviceCollection = client.db('carDoctor').collection('services');
    const orderCollection = client.db('carDoctor').collection('orders');

    //? JWT token
    app.post('/jwt', (req, res) => {
      const user = req.body;
      console.log(user)
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h'})
      res.send({token});
    }) 

    //? get all services
    app.get('/services', async(req, res) => {  
        const cursor = serviceCollection.find();
        const result = await cursor.toArray();
        res.send(result);
    })

    //? get an individual service by id
    app.get('/services/:id', async(req, res) =>{
        const id = req.params.id;
        console.log(req.params)
        const query = { _id: new ObjectId(id)};

        const options = {
            // Include only the `title` and `imdb` fields in each returned document
            projection: {  title: 1, price: 1, img:1 },
          };

        const result = await serviceCollection.findOne(query, options);
        res.send(result);
    })

    //? Read service orders
    app.get('/orders', verifyJWT ,async(req, res) =>{
      const decoded = req.decoded;
      console.log('came back after verify', decoded);

      if(decoded.email !== req.query.email){
        return res.status(403).send({error: true, message: 'forbidden access'})
      }

      let query = {};
      if(req.query?.email){
        query = {email: req.query.email}
      }
      const result = await orderCollection.find(query).toArray();
      res.send(result);
    })
    
    //? Creating service order
    app.post('/orders', async(req, res)=>{
      const order = req.body;
      const result = await orderCollection.insertOne(order);
      res.send(result);
    })

    //? Updating a service order
    app.patch('/orders/:id', async (req, res)=>{
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)} 
      const updatedBooking = req.body; 
      const updateDoc = {
        $set: {
          status: updatedBooking.status
        },
      };
      const result = await orderCollection.updateOne(filter, updateDoc)
      res.send(result);
    })

    //? Deleting a service order
    app.delete('/orders/:id', async(req, res) =>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await orderCollection.deleteOne(query);
      res.send(result);
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close(); 
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("doctor is there");
});

app.listen(port, () => {
  console.log(`Car-doc server is running on ${port}`);
});
