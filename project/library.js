const express = require('express');

const app = express();


const methodOverride = require('method-override');




const { MongoClient, ObjectId } = require('mongodb');
const { get } = require('mongoose');




//app.use(express.static('public'));

app.use(express.json());

app.use(methodOverride('_method'));


app.use(express.urlencoded({ extended: false }));

app.set("view engine", "ejs");



// MongoDB Connection




//const dbName = "yourdatabasename";

async function getConnection() {

    const client = new MongoClient('mongodb://127.0.0.1:27017/Library_system', {

        useNewUrlParser: true,

        useUnifiedTopology: true,

    });

    console.log("before client connect");

    return (await client.connect());

}




// Connect to MongoDB

async function connectToMongoDB() {

    let connection;

    try {

        connection = await getConnection();

        console.log('Connected to MongoDB');

    } catch (error) {

        console.error('Error connecting to MongoDB:', error);

    } finally {

        await connection.close();

    }

}




// Serve the index.html file

app.get('/addBook', (req, res) => {

    res.sendFile(__dirname + "/index.html");

});



app.get('/addMembers', (req, res) => {

    res.sendFile(__dirname + "/addMeb.html");

});




app.get('/updateMember/:id', async (req, res) => {
    let id = req.params.id;
    let connection;
    console.log(id);
    try {
        connection = await getConnection();
        let member = await connection.db().collection("members").findOne({ _id: new ObjectId(id) });
        console.log(`member ${JSON.stringify(member)}`);
        res.render(__dirname + "/updateMeb", member);
    } catch (error) {
        console.error('Error updating member: ', error);

    } finally {
        await connection.close();
    }

});


app.post('/deleteMember', async (req, res) => {
    let memberId = req.body.id; let connection;
    try {
        connection = await getConnection();
        let members = await connection.db().collection("members").deleteOne({ _id: new ObjectId(memberId) });
        console.log(members);
        res.redirect("/listMember");
    } catch (error) {
        console.error('Error updating member: ', error);
        res.sendStatus(500);
    } finally {
        await connection.close();
    }

});

app.get('/listMember', async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        let query = {};
        if (req.query.phoneNumber) {
            query.Phone = req.query.phoneNumber;
        }
        if (req.query.name) {
            query.Name = req.query.name;
        }
        console.log(`query: ${JSON.stringify(query)}`)
        let members = await connection.db().collection("members").find(query).toArray();
        console.log(members);
        res.render(__dirname + "/listMembers", { members: members, query: query });
    } catch (error) {
        console.error('Error updating member: ', error);
        res.sendStatus(500);
    } finally {
        await connection.close();
    }
})


// Retrieve all members

// app.get('/getmembers', async (req, res) => {

//     try {

//         const members = await database.collection('members').find().toArray();

//         res.json(members);

//     } catch (error) {

//         console.error('Error retrieving members:', error);

//         res.sendStatus(500);

//     }

// });
















// Add a new book

app.post('/addBook', async (req, res) => {

    let connection;

    const { bookId, ISBN, Title, Author, PublisherID, Description, Catagory, Location, LibraryID } = req.body;




    try {

        connection = await getConnection();

        await connection.db().collection('book').insertOne({

            bookId,

            ISBN,

            Title,

            Author,

            PublisherID,

            Description,

            Catagory,

            Location,

            LibraryID,

        });

        console.log('Book added successfully');

        //res.redirect("/user.html");

    } catch (error) {

        console.error('Error adding book:', error);

        res.sendStatus(500);

    } finally {

        await connection.close();

    }

});

//Add member




app.post('/addMembers', async (req, res) => {
    let connection;
    const { MemberID, Name, Address, Phone, Payment, Role, Age } = req.body;



    try {

        connection = await getConnection();

        await connection.db().collection('members').insertOne({

            MemberID, Name, Address, Phone, Payment, Role, Age

        });

        console.log('member added successfully');
        res.redirect("/addMembers");



    } catch (error) {

        console.error('Error adding book:', error);

        res.sendStatus(500);

    } finally {

        await connection.close();

    }




});



// update 


app.post('/updateMember', async (req, res) => {
    let connection;
    const updatedMember = {
        MemberID: req.body.MemberID,
        Name: req.body.Name,
        Address: req.body.Address,
        Phone: req.body.Phone,
        Payment: req.body.Payment,
        Role: req.body.Role,
        Age: req.body.Age
    };
    let memberId = req.body._id;
    console.log(`memberId ${memberId}`)
    try {
        connection = await getConnection();
        const result = await connection
            .db()
            .collection('members')
            .updateOne({ _id: new ObjectId(memberId) }, { $set: updatedMember });

        if (result.modifiedCount === 0) {
            console.log('No member found for update');
            res.sendStatus(404);
        } else {
            console.log('Member updated successfully');
            res.redirect("listMember");
        }
    } catch (error) {
        console.error('Error updating member:', error);
        res.sendStatus(500);
    } finally {
        await connection.close();
    }
});


//delete 


app.delete('/deleteMember/:id', async (req, res) => {
    let connection;
    const memberId = req.params.id;

    try {
        connection = await getConnection();

        const result = await connection
            .db()
            .collection('members')
            .deleteOne({ MemberID: memberId });

        if (result.deletedCount === 0) {
            console.log('No member found for deletion');
            res.sendStatus(404);
        } else {
            console.log('Member deleted successfully');
            res.sendStatus(200);
        }
    } catch (error) {
        console.error('Error deleting member:', error);
        res.sendStatus(500);
    } finally {
        await connection.close();
    }
});



















// Start the server

async function startServer() {

    console.log("before connect to mongodb");

    await connectToMongoDB();

    console.log("after connect to mongodb");

    const PORT = process.env.PORT || 8080;

    app.listen(PORT, () => {

        console.log(`Server running on port ${PORT}`);

    });

}

console.log("before start server");

startServer();