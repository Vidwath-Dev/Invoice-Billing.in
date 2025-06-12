# Mini Project - Shop Management System

1.Overview

This project is a Shop Management System that allows users to manage their retail shops, including functionalities for user registration, shop details management, invoice generation, and stock tracking. The application is built using Node.js, Express, MongoDB, and various front-end technologies.

2.Features

1.User registration and login
2.Shop details management
3.Invoice generation and management
4.Stock tracking and management
5.Contact form for user inquiries
6.Admin dashboard for managing users and shops

3.Technologies Used

1.Node.js
2.Express.js
3.MongoDB
4.Mongoose
5.Handlebars (hbs)
6.Bcrypt for password hashing
7.Nodemailer for email functionality
8.HTML5, CSS3 for front-end design

4.Getting Started

Prerequisites

Before you begin, ensure you have met the following requirements:

1.Node.js: Make sure you have Node.js installed on your machine. You can download it from Node.js official website.
2.MongoDB: You need to have MongoDB installed and running. You can download it from MongoDB official website.

Clone the Repository

1.Open your terminal or command prompt.
2.Clone the repository using the following command:

Insert Code

git clone https://github.com/yourusername/Mini-Project-Final-Phase.git

3.Navigate into the project directory:

Insert Code

cd Mini-Project-Final-Phase


Install Dependencies

1.Install the required dependencies using npm:

Insert Code

npm install

Environment Variables

1.Create a .env file in the root directory of the project.
2.Add the following environment variables to the .env file:

Insert Code

JWT_SECRET=your_jwt_secret
EMAIL_USER=your_email@example.com
EMAIL_PASS=your_email_password

Replace your_jwt_secret, your_email@example.com, and your_email_password with your actual values.

Start the Server

1.To start the server, run the following command:

Insert Code

npm start

Alternatively, you can use nodemon for automatic server restarts during development:

Insert Code

npx nodemon src/index.js

The server will start on http://localhost:3000. You can access the application by opening this URL in your web browser.

5.Usage

1.Navigate to the home page to register or log in.
2.After logging in, you can manage your shop details, view invoices, and track stock.
3.Admin users can access the admin dashboard to manage users and shops.

6.Contributing
Contributions are welcome! If you have suggestions for improvements or new features, feel free to create an issue or submit a pull request.

7.License
This project is licensed under the MIT License - see the LICENSE file for details.

8.Acknowledgments
Thanks to the contributors and the open-source community for their support and resources.
