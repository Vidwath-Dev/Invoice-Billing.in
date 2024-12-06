const express = require("express");
const bcrypt = require("bcrypt"); // Import bcrypt
const app = express();
const path = require("path");
const hbs = require("hbs");
const { contact, register,retail ,Invoice,Stock} = require("./mongodb");

const tempelatePath = path.join(__dirname, '../tempelates');
const publicPath = path.join(__dirname, '../public');


const session = require("express-session");


// Session middleware
app.use(session({
    secret: 'Muddu', // Change this to a secure random string
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using HTTPS
}));

// Other middleware and routes

app.use(express.json());

app.use((req, res, next) => {
    res.locals.session = req.session; // Make session data available in views
    next();
});

app.use(express.static(publicPath, {
    setHeaders: (res, filePath) => {
        if (path.extname(filePath) === '.css') {
            res.setHeader('Content-Type', 'text/css');
        }
    }
}));

app.set("view engine", "hbs");
app.set("views", tempelatePath);
app.use(express.urlencoded({ extended: false }));


// Register the eq helper
hbs.registerHelper('eq', function (a, b) {
    return a === b;
});

app.get("/", (req, res) => {
    res.render("index");
});

app.get("/latest", (req, res) => {
    res.render("latest");
});
app.get("/about", (req, res) => {
    res.render("about");
});

app.get("/contact", (req, res) => {
    res.render("contact");
});

app.get("/register", (req, res) => {
    res.render("register");
});

app.get("/retail", (req, res) => {
    const email = req.query.email || ''; // Get email from query parameter
    res.render("retail", { email }); // Pass email to the template
});

app.get("/home", async (req, res) => {
    const userEmail = req.query.email; // Assuming you pass the email as a query parameter
    const user = await register.findOne({ email: userEmail });
    const shopDetails = await retail.findOne({ email: userEmail });

    if (user && shopDetails) {
        res.render("home", {
            ownerName:shopDetails.ownerName,
            userEmail: user.email,
            shopName: shopDetails.shopName,
            shopAddress: shopDetails.shopAddress,
            contactNumber: shopDetails.contactNumber
        });
    } else {
        res.status(404).send("User  or shop not found");
    }
});

app.get("/edit-shop", async (req, res) => {
    const userEmail = req.query.email;
    
    
    const shopDetails = await retail.findOne({ email: userEmail });
    

    if (shopDetails) {
        res.render("edit-shop", { shopDetails });
    } else {
        res.status(404).send("Shop not found");
    }
});

app.get("/logout", (req, res) => {
    if (req.session) {
        req.session.destroy(err => {
            if (err) {
                return res.redirect("/home");
            }
            res.clearCookie("connect.sid"); // Clear the session cookie
            res.redirect("/register"); // Redirect to login page
        });
    } else {
        res.redirect("/register"); // If no session exists, just redirect
    }
});

app.get("/shopabout", async(req, res) => {

    const userEmail = req.query.email;
    const shopDetails = await retail.findOne({ email: userEmail });
    const ownerName = shopDetails.ownerName;
    res.render("shopabout",{ownerName,userEmail});
});

app.get("/shopcontact", async(req, res) => {
    const userEmail = req.query.email;
    const shopDetails = await retail.findOne({ email: userEmail });
    const ownerName = shopDetails.ownerName;
    res.render("shopcontact",{ownerName,userEmail});
});

app.get("/shopprofile", async (req, res) => {
    const userEmail = req.query.email; // Get the user's email from the query parameters
    const shopDetails = await retail.findOne({ email: userEmail });
    const stockItems = await Stock.find({ email: userEmail }); // Fetch stock items related to the shop

    if (shopDetails) {
        // Check stock levels and prepare alert messages
        const alerts = stockItems.map(item => {
            const totalStock = item.stockIn;
            const stockOut = item.stockOut;
            const remainingStock = totalStock - stockOut;

            if (remainingStock <= 0) {
                return { message: `Stock for ${item.description} is depleted!`, level: 'critical' };
            } else if (remainingStock <= totalStock * 0.05) {
                return { message: `Warning: Only ${remainingStock} left for ${item.description}.`, level: 'warning' };
            } else if (remainingStock <= totalStock * 0.1) {
                return { message: `Alert: Stock for ${item.description} is below 10%.`, level: 'alert' };
            } else if (remainingStock <= totalStock * 0.2) {
                return { message: `Caution: Stock for ${item.description} is below 20%.`, level: 'caution' };
            }
            return null; // No alert
        }).filter(alert => alert !== null); // Filter out null alerts

        res.render("shopprofile", {
            ownerName: shopDetails.ownerName,
            userEmail: userEmail,
            stockItems: stockItems,// Pass stock items to the template
            alerts: alerts // Pass alerts to the template
        });
    } else {
        res.status(404).send("Shop not found");
    }
});

app.get("/shoptrack", async (req, res) => {
    const userEmail = req.query.email;
    const shopDetails = await retail.findOne({ email: userEmail });
    
    // Assuming you have a way to get stock items based on barcode
    // You might need to adjust this according to your actual database structure
    const stockItems = await Stock.find({ email: userEmail }); // Fetch stock items related to the shop

    if (shopDetails) {
        res.render("shoptrack", {
            ownerName: shopDetails.ownerName,
            userEmail: userEmail,
            stockItems: stockItems // Pass stock items to the template
        });
    } else {
        res.status(404).send("Shop not found");
    }
});



app.get("/invoices", async (req, res) => {
    const userEmail = req.session.userEmail; // Get the user's email from the session
    const invoices = await Invoice.find({ userEmail });
    const shopDetails = await retail.findOne({ email: userEmail });
    const ownerName = shopDetails.ownerName;
    // Get the invoice ID from the query parameters
    const newInvoiceId = req.query.invoiceId;

    const { stockOut, stockIn } = req.body; // Assuming stockOut and stockIn are sent in the request

    if (stockOut >= stockIn) {
        return res.status(400).send("Invoice cannot be printed as stock is depleted.");
    }
    // Pass the newInvoiceId and all invoices to the template
    res.render("invoices", { invoices, newInvoiceId, shopDetails,ownerName}); 
});

app.get("/print-invoice", async (req, res) => {
    const invoiceId = req.query.invoiceId; // Get the invoice ID from the query parameters
    try {
        const invoice = await Invoice.findById(invoiceId).populate('items'); // Fetch the invoice details
        if (invoice) {
            res.render("print-invoice", { invoice }); // Render a new template for printing
        } else {
            res.status(404).send("Invoice not found");
        }
    } catch (error) {
        res.status(500).send("Error fetching invoice");
    }
});

app.post("/contact", async (req, res) => {
    const data = {
        name: req.body.name,
        email: req.body.email,
        subject: req.body.subject,
        message: req.body.message
    };

    try {
        await contact.insertMany([data]);
        res.send("Data submitted");
    } catch (error) {
        res.status(500).send("Error submitting data");
    }
});

app.post("/signup", async (req, res) => {
    const data = {
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword // Get confirm password
    };

    // Check if password and confirm password match
    if (data.password !== data.confirmPassword) {
        return res.status(400).send("Passwords do not match");
    }

    try {
        // Check if the email already exists in the database
        const existingUser  = await register.findOne({ email: data.email });
        if (existingUser ) {
            return res.status(400).send("Email already exists");
        }

        // Hash the password before saving it
        const hashedPassword = await bcrypt.hash(data.password, 10);
        data.password = hashedPassword;

        // Save the user data to MongoDB
        await register.insertMany([data]);

        // Redirect to /retail with the email as a query parameter
        res.redirect(`/retail?email=${encodeURIComponent(data.email)}`);
    } catch (error) {
        res.status(500).send("Error saving user data");
    }
});

app.post("/login", async (req, res) => {
    try {
        const user = await register.findOne({ email: req.body.email });

        if (user && await bcrypt.compare(req.body.password, user.password)) {
            // Initialize session data
            req.session.userId = user._id; // Store user ID or other relevant info
            req.session.userEmail = user.email; // Store user email
            res.redirect("/home?email=" + encodeURIComponent(user.email));
        } else {
            res.send("Wrong password");
        }
    } catch {
        res.send("Wrong details");
    }
});

app.post("/retail", async (req, res) => {
    const data = {
        shopName: req.body.shopName,
        ownerName: req.body.ownerName,
        contactNumber: req.body.contactNumber,
        email: req.body.email,
        shopAddress: req.body.shopAddress,
        shopType: req.body.shopType,
        registrationNumber: req.body.registrationNumber,
        taxId: req.body.taxId,
        operatingYears: req.body.operatingYears,
        annualRevenue: req.body.annualRevenue
    };

    try {
        await retail.insertMany([data]);
        res.render("register");
    }  catch (error) {
        console.error("Error inserting retail data:", error.message, error.stack);
        res.status(500).send("Error submitting data");
    }
});

app.post("/submit-invoice", async (req, res) => {
    const { invoiceNumber, items } = req.body;
    const userEmail = req.session.userEmail; // Get the user's email from the session

    // Parse items from the input
    const parsedItems = items.split('\n').map(item => {
        const [barcodeId, description, quantity, price] = item.split(',');
        const qty = Number(quantity);
        const prc = Number(price);

        // Validate quantity and price
        // if (isNaN(qty) || isNaN(prc) || qty <= 0 || prc < 0) {
        //     console.error(`Invalid item entry: ${item}`);
        //     return null; // Skip this item if invalid
        // }

        return { barcodeId, description, quantity: qty, price: prc };
    }).filter(item => item !== null); // Remove invalid items

    // Check if there are valid items
    if (parsedItems.length === 0) {
        return res.status(400).send("No valid items to process.");
    }

    // Check stock levels for each item
    for (const item of parsedItems) {
        const stockItem = await Stock.findOne({ barcodeId: item.barcodeId, email: userEmail });
        if (stockItem) {
            const remainingStock = stockItem.stockIn - stockItem.stockOut;
            if (item.quantity > remainingStock) {
                return res.status(400).send(`Insufficient stock for ${item.description}. Available: ${remainingStock}, Requested: ${item.quantity}`);
            }
        } else {
            return res.status(400).send(`Item with barcode ${item.barcodeId} not found in stock.`);
        }
    }

    // Calculate total amount
    const totalAmount = parsedItems.reduce((total, item) => total + (item.quantity * item.price), 0);

    try {
        const newInvoice = new Invoice({ invoiceNumber, userEmail, items: parsedItems, totalAmount });
        await newInvoice.save();

        // Update stockout for each item
        for (const item of parsedItems) {
            const { barcodeId, quantity } = item;
            await Stock.updateOne(
                { barcodeId, email: userEmail }, // Find the stock item by barcodeId and userEmail
                { $inc: { stockOut: quantity } } // Increment the stockOut by the quantity sold
            );
        }

        // Redirect to the invoices page with the new invoice ID as a query parameter
        res.redirect(`/invoices?invoiceId=${newInvoice._id.toHexString()}`); // Pass the ID in the query string
    } catch (error) {
        console.error("Error creating invoice:", error.message); // Log the error message
        res.status(500).send("Error creating invoice");
    }
});

app.post("/add-stock", async (req, res) => {
    const { barcodeId,description, stockIn, stockOut } = req.body;
    const userEmail = req.session.userEmail; // Get the user's email from the session

    const stockData = new Stock({
        barcodeId,
        description,
        stockIn,
        stockOut,
        email: userEmail // Associate stock with the shop
    });

    try {
        await stockData.save(); // Save the stock data to the database
        res.redirect(`/shoptrack?email=${encodeURIComponent(userEmail)}`); // Redirect back to shoptrack
    } catch (error) {
        console.error("Error saving stock data:", error.message);
        res.status(500).send("Error saving stock data");
    }
});

// For connection for port number 3000
app.listen(3000, () => {
    console.log("port connected");
});
// To run this file type => nodemon src/index.js