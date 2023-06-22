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


//list books

app.get('/listbook', async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        let query = {};
        if (req.query.ISBN) {
            query.ISBN = req.query.ISBN;
        }

        if (req.query.Author) {
            query.Author = req.query.Author;
        }

        let sort = {};

        if (req.query.SortByAuthor) {
            sort.Author = req.query.SortByAuthor === 'asc' ? 1 : -1;
        }

        if (req.query.SortByTitle) {
            sort.Title = req.query.SortByTitle === 'asc' ? 1 : -1;
        }

        if (req.query.SortByCategory) {
            sort.Catagory = req.query.SortByCategory === 'asc' ? 1 : -1;
        }

        console.log(`query: ${JSON.stringify(query)}`)
        let booklist = await connection.db().collection("book").find(query).sort(sort).toArray();
        //console.log(members);
        res.render(__dirname + "/listbooks", { listbook: booklist, query: query, ...req.query });
    } catch (error) {
        console.error('Error listing books: ', error);
        res.sendStatus(500);
    } finally {
        await connection.close();
    }
})



app.get('/checkoutbook', async (req, res) => {
    res.render('checkout');

    try {
        const connection = await getConnection();

        // Fetch all checked out books
        const checkedOutBooks = await connection.db().collection('books').find({ checkedOut: true }).toArray();

        // Render the view and pass the checked out books as data
        res.render('checkedout', { checkedOutbooks: checkedOutBooks });

    } catch (error) {
        console.error('Error retrieving checked out books:', error);
        res.sendStatus(500);

    } finally {
        await connection.close();
    }



});
app.post('/checkin', async (req, res) => {
    ISBN = req.body.ISBN;
    let connection;
    try {
        connection = await getConnection();
        console.log(`isbn ${ISBN}`)
        let checkOutInfo = await connection.db().collection("CheckedOutBooks").findOne({ ISBN: ISBN, isReturned: false });
        let member = await connection.db().collection("members").findOne({ MemberID: checkOutInfo.memberID });
        let book = await connection.db().collection("book").findOne({ ISBN });
        await connection.db().collection("book").updateOne({ ISBN: checkOutInfo.ISBN }, { $set: { isCheckedOut: false } });
        await connection.db().collection("members").updateOne({ MemberID: checkOutInfo.memberID }, { $set: { hasCheckedOutBook: false } });
        await connection.db().collection("CheckedOutBooks").updateOne({ _id: checkOutInfo._id }, { $set: { isReturned: true } })
        res.redirect("listbook")
    } catch (error) {
        console.error('Error checking out book:', error);
    } finally {
        await connection.close();
    }
})
app.get('/checkin', async (req, res) => {
    ISBN = req.query.ISBN;
    let connection;
    try {
        connection = await getConnection();
        console.log(`isbn ${ISBN}`)
        let checkOutInfo = await connection.db().collection("CheckedOutBooks").findOne({ ISBN: ISBN, isReturned: false });
        let member = await connection.db().collection("members").findOne({ MemberID: checkOutInfo.memberID });
        console.log(JSON.stringify(checkOutInfo));
        console.log(JSON.stringify(member));
        let maxCheckoutDays = 0;
        let overdueFee = 0.0;

        if (member.Role === 'Standard') {
            maxCheckoutDays = 21;
            overdueFee = 0.25;
        } else if (member.Role === 'Staff') {
            maxCheckoutDays = 21;
            overdueFee = 0.10;
        } else if (member.Role === 'Senior') {
            maxCheckoutDays = 42;
            overdueFee = 0.05;
        }
        const checkedOutDate = checkOutInfo.checkOutDate;
        const checkinDate = new Date();
        const diffTime = Math.abs(checkinDate - checkedOutDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        let fee = diffDays > maxCheckoutDays ? overdueFee * (diffDays - maxCheckoutDays) : 0;
        console.log(diffDays);
        console.log(`maxCheckoutDays: ${maxCheckoutDays} overdueFee: ${overdueFee}`);
        res.render(__dirname + '/checkin', { checkOutInfo: { ...checkOutInfo, fee } });

    } catch (error) {
        console.error('Error checking out book:', error);
    } finally {
        await connection.close();
    }
})

app.post('/checkout', async (req, res) => {
    const { MemberID, ISBN } = req.body;
    let connection;
    let error = null;
    let message = null;

    try {
        connection = await getConnection();
        console.log(`member id ${MemberID}`)
        const member = await connection.db().collection("members").findOne({ MemberID: MemberID });
        const book = await connection.db().collection("book").findOne({ ISBN: ISBN });
        console.log(`book ${JSON.stringify(book)} member ${JSON.stringify(member)}`)
        if (!member || !book) {
            console.log('Member or book not found');
            error = "Member or book not found";
        }
        else if (member.hasCheckedOutBook || member.feesOwed >= 100) {
            console.log('Member cannot check out a book due to overdue books or fee limit exceeded');
            error = 'Member cannot check out a book due to overdue books or fee limit exceeded';
        }
        else {
            let checkOutInfo = {
                memberID: member.MemberID,
                ISBN: ISBN,
                checkOutDate: new Date(),
                isReturned: false
            }
            member.hasCheckedOutBook = true;
            book.isCheckedOut = true;
            await connection.db().collection('members').updateOne(
                { MemberID: member.MemberID },
                { $set: { hasCheckedOutBook: true } }
            );
            await connection.db().collection('book').updateOne(
                { ISBN: book.ISBN },
                { $set: { isCheckedOut: true } }
            )
            await connection.db().collection('CheckedOutBooks').insertOne(checkOutInfo);
            message = "successfully checked out book!"

        }

    } catch (error) {
        console.error('Error checking out book:', error);
        res.sendStatus(500);
    } finally {
        await connection.close();
        res.redirect(`listbook?error=${error ? error : ""}&message=${message ? message : ""}`)
    }
})

// Check out a book
// app.post('/checkoutBook', async (req, res) => {
//     const { MemberID, ISBN } = req.body;
//     let connection;

//     try {
//         connection = await getConnection();

//         // Get the member and book from the database
//         const member = await connection.db().collection("members").findOne({ _id: new ObjectId(MemberID) });
//         const book = await connection.db().collection("book").findOne({ _id: new ObjectId(ISBN) });

//         if (!member || !book) {
//             console.log('Member or book not found');
//             res.sendStatus(404);
//             return;
//         }

//         // Check if the member has any overdue books or exceeds the fee limit
//         if (member.overdueBooks.length > 0 || member.feesOwed >= 100) {
//             console.log('Member cannot check out a book due to overdue books or fee limit exceeded');
//             res.sendStatus(403);
//             return;
//         }

//         // Calculate the due date based on member type
//         let maxCheckoutDays = 0;
//         let overdueFee = 0.0;

//         if (member.Role === 'Standard') {
//             maxCheckoutDays = 21;
//             overdueFee = 0.25;
//         } else if (member.Role === 'Staff') {
//             maxCheckoutDays = 21;
//             overdueFee = 0.10;
//         } else if (member.Role === 'Senior') {
//             maxCheckoutDays = 42;
//             overdueFee = 0.05;
//         }

//         const currentDate = new Date();
//         const dueDate = new Date();
//         dueDate.setDate(currentDate.getDate() + maxCheckoutDays);

//         // Update the member's checkedOutBooks array with the book details
//         member.checkedOutBooks.push({
//             ISBN: book.ISBN,
//             Title: book.Title,
//             dueDate
//         });

//         // Update the member's record in the database
//         await connection.db().collection('members').updateOne(
//             { _id: new ObjectId(MemberID) },
//             { $set: { checkedOutBooks: member.checkedOutBooks } }
//         );

//         console.log('Book checked out successfully');
//         res.sendStatus(200);
//     } catch (error) {
//         console.error('Error checking out book:', error);
//         res.sendStatus(500);
//     } finally {
//         await connection.close();
//     }
// });



app.post('/checkoutBook', async (req, res) => {
    const { memberId, bookId, dueDate } = req.body;
    let connection;



    try {
        connection = await getConnection();



        // Find the member and book in the database
        const member = await connection.db().collection('members').findOne({ MemberID: memberId });
        const book = await connection.db().collection('book').findOne({ bookId });



        // Check if the member and book exist
        if (!member) {
            console.log('Member not found');
            res.sendStatus(404);
            return;
        }
        if (!book) {
            console.log('Book not found');
            res.sendStatus(404);
            return;
        }



        // Create a new checked out book object
        const checkedOutBook = {
            ISBN: book.ISBN,
            Title: book.Title,
            dueDate: dueDate
        };



        // Add the checked out book to the member's checkedOutBooks array
        member.checkedOutBooks.push(checkedOutBook);



        // Update the member in the database
        await connection.db().collection('members').updateOne({ MemberID: memberId }, { $set: member });



        console.log('Book checked out successfully');
        res.sendStatus(200);
    } catch (error) {
        console.error('Error checking out book:', error);
        res.sendStatus(500);
    } finally {
        await connection.close();
    }
});












///
// app.get('/checkedOutBooks', async (req, res) => {
//     let connection;

//     try {
//         connection = await getConnection();

//         // Find all members with checked out books
//         const members = await connection.db().collection("members").find({ checkedOutBooks: { $exists: true, $ne: [] } }).toArray();

//         // Create an array to store the checked out books
//         const checkedOutBooks = [];

//         // Iterate over each member and their checked out books
//         for (const member of members) {
//             for (const checkedOutBook of member.checkedOutBooks) {
//                 checkedOutBooks.push({
//                     memberId: member._id,
//                     memberName: member.Name,
//                     bookId: checkedOutBook.bookId,
//                     title: checkedOutBook.title,
//                     dueDate: checkedOutBook.dueDate
//                 });
//             }
//         }

//         console.log('Checked out books:', checkedOutBooks);
//         res.render(__dirname + "/checkedOutBooks", { checkedOutBooks });
//     } catch (error) {
//         console.error('Error retrieving checked out books:', error);
//         res.sendStatus(500);
//     } finally {
//         await connection.close();
//     }
// });




//listbook



app.get('/borrowedBooks/:memberId', async (req, res) => {
    const memberId = req.params.memberId;
    let connection;

    try {
        connection = await getConnection();

        // Find the member with the given memberId
        const member = await connection.db().collection("members").findOne({ _id: new ObjectId(memberId) });

        if (!member) {
            console.log('Member not found');
            res.sendStatus(404);
            return;
        }

        console.log('Borrowed books:', member.checkedOutBooks);
        res.render(__dirname + "/borrowedBooks", { member });
    } catch (error) {
        console.error('Error retrieving borrowed books:', error);
        res.sendStatus(500);
    } finally {
        await connection.close();
    }
});






app.get('/overdueMembers', async (req, res) => {
    let connection;

    try {
        connection = await getConnection();
        let overDraftInfo = [];
        // Find members with overdue books
        const checkedOutBooks = await connection.db().collection("CheckedOutBooks").find({ isReturned: false }).toArray();
        for (let checkedOutBook of checkedOutBooks) {
            let member = await connection.db().collection("members").findOne({ MemberID: checkedOutBook.memberID });
            let book = await connection.db().collection("book").findOne({ ISBN: checkedOutBook.ISBN });
            let maxCheckoutDays = 0;
            let overdueFee = 0.0;

            if (member.Role === 'Standard') {
                maxCheckoutDays = 21;
                overdueFee = 0.25;
            } else if (member.Role === 'Staff') {
                maxCheckoutDays = 21;
                overdueFee = 0.10;
            } else if (member.Role === 'Senior') {
                maxCheckoutDays = 42;
                overdueFee = 0.05;
            }
            const checkedOutDate = checkedOutBook.checkOutDate;
            const checkinDate = new Date();
            const diffTime = Math.abs(checkinDate - checkedOutDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays > maxCheckoutDays) {
                let fee = overdueFee * (diffDays - maxCheckoutDays);
                overDraftInfo.push({ book, member, fee, diffDays });
            }
        }
        res.render(__dirname + "/overdueMembers", { overDraftInfo });
    } catch (error) {
        console.error('Error retrieving members with overdue books:', error);
        res.sendStatus(500);
    } finally {
        await connection.close();
    }
});



app.get('/overdueAmount/:memberId', async (req, res) => {
    const memberId = req.params.memberId;
    let connection;

    try {
        connection = await getConnection();

        // Find the member with the given memberId
        const member = await connection.db().collection("members").findOne({ _id: new ObjectId(memberId) });

        if (!member) {
            console.log('Member not found');
            res.sendStatus(404);
            return;
        }

        let totalOverdueAmount = 0;

        // Calculate the total overdue amount for the member
        for (const overdueBook of member.overdueBooks) {
            const dueDate = new Date(overdueBook.dueDate);
            const currentDate = new Date();

            const daysOverdue = Math.ceil((currentDate - dueDate) / (1000 * 60 * 60 * 24));
            const overdueFee = overdueBook.overdueFee;

            const bookOverdueAmount = daysOverdue * overdueFee;
            totalOverdueAmount += bookOverdueAmount;
        }

        console.log('Total overdue amount:', totalOverdueAmount);
        res.render(__dirname + "/overdueAmount", { member, totalOverdueAmount });
    } catch (error) {
        console.error('Error retrieving overdue amount:', error);
        res.sendStatus(500);
    } finally {
        await connection.close();
    }
});





























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