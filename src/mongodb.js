const mongoose = require("mongoose")

//mogodb connection
mongoose.connect("mongodb://localhost:27017/Mini_Project")  //command is used to connect node to mongodb database
    .then(() => {
        console.log("mongodb connected");
    })
    .catch(() => {
        console.log("failed to connect");
    })

//contact schema
const ContactSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    subject: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    }
})

//defining schema for documents(i.e formate of the documents)
const LogInSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    }
})

//retail shop details
const RetailSchema = new mongoose.Schema({
    shopName: {
        type: String,
        required: true
    },
    ownerName: {
        type: String,
        required: true
    },
    contactNumber: {
        type: Number,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    shopAddress: {
        type: String,
        required: true
    },
    shopType: {
        type: String,
        required: true
    },
    registrationNumber: {
        type: String,
        required: true
    },
    taxId: {
        type: String,
        required: true
    },
    operatingYears: {
        type: Number,
        required: true
    },
    annualRevenue: {
        type: Number,
        required: true
    },
})

// Invoice schema
const InvoiceSchema = new mongoose.Schema({
    invoiceNumber: {
        type: String,
        required: true
    },
    userEmail: {
        type: String,
        required: true
    },
    items: [{
        description: String,
        quantity: Number,
        price: Number
    }],
    totalAmount: {
        type: Number,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const stockSchema = new mongoose.Schema({
    barcodeId: String,
    description: String,
    stockIn: Number,
    stockOut: Number,
    email: String,// Reference to the shop owner
    price: Number
});


// MongoDB Schema and Model for shopContact Form Data
const shopcontactSchema = new mongoose.Schema({
    name: String,
    email: String,
    message: String,
    date: { type: Date, default: Date.now }
});

// Admin schema
const AdminSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    }
});



//defining the colection part
const register = new mongoose.model("Register", LogInSchema)
const contact = new mongoose.model("Contact_info", ContactSchema)
const retail = new mongoose.model("Retail_info", RetailSchema)
const Invoice = new mongoose.model("Invoice", InvoiceSchema);
const Stock = mongoose.model("Stock", stockSchema);
const Shopcontact =new mongoose.model("shopcontact_info", shopcontactSchema);
const Admin = mongoose.model("Admin", AdminSchema);

module.exports = {
    register,
    contact,
    retail,
    Invoice,
    Stock,
    Shopcontact,
    Admin
};