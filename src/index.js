const express = require("express");
const bcrypt = require("bcrypt"); // Import bcrypt
const app = express();
const path = require("path");
const hbs = require("hbs");
const nodemailer = require('nodemailer'); // Make sure to install nodemailer
const jwt = require('jsonwebtoken');
const { contact, register, retail, Invoice, Stock, Shopcontact ,Admin} = require("./mongodb");

const tempelatePath = path.join(__dirname, '../tempelates');
const publicPath = path.join(__dirname, '../public');


const session = require("express-session");



require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET; // Use the secret from the .env file



// Function to generate a reset token
function generateResetToken(user) {
    // Create a token with the user's email and an expiration time
    return jwt.sign({ email: user.email }, JWT_SECRET, { expiresIn: '1h' }); // Token expires in 1 hour
}

// Function to verify the reset token
function verifyResetToken(token) {
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return decoded; // Returns the decoded token if valid
    } catch (error) {
        return null; // Return null if the token is invalid
    }
}

// Function to send the reset email
async function sendResetEmail(email, resetLink) {
    // Create a transporter object using your email service
    const transporter = nodemailer.createTransport({
        service: 'gmail', // Use your email service (e.g., Gmail)
        auth: {
            user: process.env.EMAIL_USER,  // Your email address
            pass: process.env.EMAIL_PASS, // Your email password or app password
        },
    });

    
    
    // Email options
    const mailOptions = {
        from: process.env.EMAIL_USER, // Sender address
        to: email, // List of recipients
        subject: 'Password Reset Request', // Subject line
        text: `You requested a password reset. Click the link to reset your password: ${resetLink}`, // Plain text body
        html: `<p>You requested a password reset. Click the link to reset your password: <a href="${resetLink}">Reset Password</a></p>`, // HTML body
    };

    // Send the email
    await transporter.sendMail(mailOptions);
}

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

// Register a JSON helper
// In index.js
hbs.registerHelper('json', function (context) {
    return JSON.stringify(context);
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

app.get("/admin-login", (req, res) => {
    res.render("admin-login");
});

app.get("/forgot-password", (req, res) => {
    res.render("forgot-password"); // Create a new view for the forgot password page
});

app.get("/reset-password", (req, res) => {
    const { token } = req.query;
    // Verify the token (implement this function)
    res.render("reset-password", { token });
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
            ownerName: shopDetails.ownerName,
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
            res.redirect("/"); // Redirect to login page
        });
    } else {
        res.redirect("/"); // If no session exists, just redirect
    }
});

app.get("/shopabout", async (req, res) => {

    const userEmail = req.query.email;
    const shopDetails = await retail.findOne({ email: userEmail });
    const ownerName = shopDetails.ownerName;
    res.render("shopabout", { ownerName, userEmail });
});

app.get("/shopcontact", async (req, res) => {
    const userEmail = req.query.email;
    const shopDetails = await retail.findOne({ email: userEmail });

    // Check if shopDetails is found
    if (!shopDetails) {
        return res.status(404).send("Shop not found"); // or render an error page
    }

    const ownerName = shopDetails.ownerName;
    res.render("shopcontact", { ownerName, userEmail });
});

app.get("/shopprofile", async (req, res) => {
    const userEmail = req.query.email;
    const shopDetails = await retail.findOne({ email: userEmail });
    const stockItems = await Stock.find({ email: userEmail });

    // Ensure data is properly transformed
    const stockInData = stockItems.map(item => item.stockIn || 0);
    const stockOutData = stockItems.map(item => item.stockOut || 0);
    const labels = stockItems.map(item => item.description || 'Unknown');



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
            stockItems: stockItems,
            alerts: alerts,
            stockInData: stockInData,
            stockOutData: stockOutData,
            labels: labels
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
    res.render("invoices", { invoices, newInvoiceId, shopDetails, ownerName });
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

// barcode scanner
// Add this route to your existing index.js file
// Add this route to your existing index.js file
app.get("/get-product-details", async (req, res) => {
    const barcode = req.query.barcode;
    const userEmail = req.session.userEmail;

    try {
        // Find the stock item by barcode and email
        const stockItem = await Stock.findOne({ 
            barcodeId: barcode, 
            email: userEmail 
        });

        if (stockItem) {
            res.json({
                description: stockItem.description,
                price: stockItem.price || 0, // Add a price field to your Stock schema if not already present
                remainingStock: stockItem.stockIn - stockItem.stockOut
            });
        } else {
            res.status(404).json({ message: "Product not found" });
        }
    } catch (error) {
        console.error("Error fetching product details:", error);
        res.status(500).json({ message: "Error fetching product details" });
    }
});

app.get("/admin/dashboard", async (req, res) => {
    if (!req.session.adminId) {
        return res.redirect("/admin/login"); // Redirect to login if not authenticated
    }

    try {
        const contacts = await contact.find({});
        const users = await register.find({});
        const shops = await retail.find({});
        const invoices = await Invoice.find({});
        const stocks = await Stock.find({});

        res.render("admin-dashboard", {
            contacts,
            users,
            shops,
            invoices,
            stocks
        });
    } catch (error) {
        res.status(500).send("Error fetching data");
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
        res.json({ success: true, message: "Data submitted successfully!" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error submitting data." });
    }
});

app.post("/shopcontact", async (req, res) => {
    // console.log(req.body); // Log the request body
    const data = {
        name: req.body.name,
        email: req.body.email,
        message: req.body.message
    };

    try {
        await Shopcontact.insertMany([data]);
        res.json({ success: true, message: "Data submitted successfully!" });
    } catch (error) {
        // console.error("Error inserting data:", error); // Log the error
        res.status(500).json({ success: false, message: "Error submitting data." });
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
        const existingUser = await register.findOne({ email: data.email });
        if (existingUser) {
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
    } catch (error) {
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
    const { barcodeId, description, stockIn, stockOut } = req.body;
    const userEmail = req.session.userEmail; // Get the user's email from the session

    // Convert stockIn and stockOut to numbers
    const stockInValue = Number(stockIn);
    const stockOutValue = Number(stockOut);

    try {
        // Check if the stock item already exists
        const existingStock = await Stock.findOne({ barcodeId, email: userEmail });

        if (existingStock) {
            // If it exists, update the stockIn and stockOut values
            existingStock.stockIn += stockInValue; // Increment stockIn
            // existingStock.stockOut += stockOutValue; // Increment stockOut
            await existingStock.save(); // Save the updated stock item
        } else {
            // If it doesn't exist, create a new stock item
            const stockData = new Stock({
                barcodeId,
                description,
                stockIn: stockInValue, // Set stockIn
                stockOut: stockOutValue, // Set stockOut
                email: userEmail // Associate stock with the shop
            });
            await stockData.save(); // Save the new stock data to the database
        }

        res.redirect(`/shoptrack?email=${encodeURIComponent(userEmail)}`); // Redirect back to shoptrack
    } catch (error) {
        console.error("Error saving stock data:", error.message);
        res.status(500).send("Error saving stock data");
    }
});

app.post('/send-invoice', async (req, res) => {
    const { email, invoiceId } = req.body;

    try {
        // Fetch the invoice details from the database
        const invoice = await Invoice.findById(invoiceId).populate('items');

        if (!invoice) {
            return res.status(404).send('Invoice not found');
        }

        // Fetch shop details using the userEmail from the invoice
        const shopDetails = await retail.findOne({ email: invoice.userEmail });

        if (!shopDetails) {
            return res.status(404).send('Shop details not found');
        }

        // Set up nodemailer transporter
        const transporter = nodemailer.createTransport({
            service: 'gmail', // Use your email service
            auth: {
                user: process.env.EMAIL_USER, // Your email
                pass: process.env.EMAIL_PASS, // Your email password
            },
        });

        // Create a formatted HTML email content
        const htmlContent = `
            <h1>Invoice #${invoice._id}</h1>
            <p>Dear Customer,</p>
            <p>Thank you for your business! Please find your invoice details below:</p>
            <h3>Shop Details:</h3>
            <p><strong>Owner Name:</strong> ${shopDetails.ownerName}</p>
            <p><strong>Shop Name:</strong> ${shopDetails.shopName}</p>
            <p><strong>Address:</strong> ${shopDetails.shopAddress}</p>
            <p><strong>Contact Number:</strong> ${shopDetails.contactNumber}</p>
            <h3>Invoice Items:</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr>
                        <th style="border: 1px solid #ddd; padding: 8px;">Description</th>
                        <th style="border: 1px solid #ddd; padding: 8px;">Quantity</th>
                        <th style="border: 1px solid #ddd; padding: 8px;">Price</th>
                    </tr>
                </thead>
                <tbody>
                    ${invoice.items.map(item => `
                        <tr>
                            <td style="border: 1px solid #ddd; padding: 8px;">${item.description}</td>
                            <td style="border: 1px solid #ddd; padding: 8px;">${item.quantity}</td>
                            <td style="border: 1px solid #ddd; padding: 8px;">Rs:${item.price.toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <h3>Total Amount: Rs:${invoice.totalAmount.toFixed(2)}</h3>
            <p>If you have any questions regarding this invoice, please feel free to contact us.</p>
            <p>Best Regards,<br>Invenzzo</p>
        `;

        // Email options
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: `Customer Invoice`,
            text: `Here is your invoice: ${invoice._id}`, // Fallback text for email clients that do not support HTML
            html: htmlContent, // Use the formatted HTML content
        };

        // Send email
        await transporter.sendMail(mailOptions);
        res.status(200).send('Invoice sent successfully');
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).send('Error sending invoice');
    }
});

// Admin Registration
app.post("/admin/signup", async (req, res) => {
    const { username, password } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newAdmin = new Admin({ username, password: hashedPassword });
        await newAdmin.save();
        res.send("Admin registered successfully");
    } catch (error) {
        res.status(500).send("Error registering admin");
    }
});

// Create a Temporary Admin Registration Route .Add a new route in your index.js file that allows you to register an admin user. This route can be accessed via a simple HTTP request (e.g., using Postman or cURL).
// app.post("/admin/register", async (req, res) => {
//     const { username, password } = req.body;

//     if (!username || !password) {
//         return res.status(400).send("Username and password are required.");
//     }

//     try {
//         const existingAdmin = await Admin.findOne({ username });
//         if (existingAdmin) {
//             return res.status(400).send("Admin with this username already exists.");
//         }

//         const hashedPassword = await bcrypt.hash(password, 10);
//         const newAdmin = new Admin({ username, password: hashedPassword });
//         await newAdmin.save();

//         res.send("Admin registered successfully");
//     } catch (error) {
//         console.error("Error registering admin:", error);
//         res.status(500).send("Error registering admin");
//     }
// });
// Step 2: Use Postman or cURL to Register
// You can use Postman or cURL to send a POST request to the /admin/register endpoint to create a new admin user.

// Using Postman
// 1.Open Postman.
// 2.Set the request type to POST.
// 3.Enter the URL: http://localhost:3000/admin/register.
// 4.In the "Body" tab, select "raw" and choose "JSON" from the dropdown.
// 5.Enter the following JSON data:
// {
//     "username": "yourAdminUsername",
//     "password": "yourAdminPassword"
// }

// Admin Login
app.post("/admin/login", async (req, res) => {
    const { username, password } = req.body;

    try {
        const admin = await Admin.findOne({ username });
        if (admin && await bcrypt.compare(password, admin.password)) {
            req.session.adminId = admin._id; // Store admin ID in session
            res.redirect("/admin/dashboard"); // Redirect to admin dashboard
        } else {
            res.send("Invalid credentials");
        }
    } catch (error) {
        res.status(500).send("Error logging in");
    }
});

app.post("/send-reset-link", async (req, res) => {
    const { email } = req.body;

    // Check if the email exists in the database
    const user = await register.findOne({ email });
    if (!user) {
        return res.status(400).send("Email not found");
    }

    // Generate a password reset token (you can use JWT or any other method)
    const token = generateResetToken(user); // Implement this function

    // Send the reset link via email (using nodemailer)
    const resetLink = `http://localhost:3000/reset-password?token=${token}`;
    await sendResetEmail(email, resetLink); // Implement this function

    res.send("Password reset link sent to your email");
});

app.post("/update-password", async (req, res) => {
    const { token, newPassword } = req.body;

    // Verify the token and find the user
    const decoded = verifyResetToken(token); // Implement this function to decode the token
    if (!decoded) {
        return res.status(400).send("Invalid token");
    }

    // Find the user by email
    const user = await register.findOne({ email: decoded.email }); // Ensure this matches your schema

    if (!user) {
        return res.status(404).send("User  not found");
    }

    // Hash the new password and update the user
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword; // Update the password field

    try {
        await user.save(); // Save the updated user
        // console.log("User  found:", user); 
        res.json({ success: true, message: "Password has been updated successfully!" });
    } catch (error) {
        console.error("Error saving user:", error);
        res.status(500).json({ success: false, message: "Error updating password!" });
    }
});

// For connection for port number 3000
app.listen(3000, () => {
    console.log("port connected");
});
// To run this file type => nodemon src/index.js