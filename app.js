const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const app = express();

// Create MySQL connection
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'habit_hub'
});

connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL database');
});

// Set up view engine
app.set('view engine', 'ejs');

// Enable static files
app.use(express.static('public'));

// Use body-parser middleware
app.use(bodyParser.urlencoded({ extended: false }));

// Use express-session middleware
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true,
}));

// Middleware to check if the user is logged in
function checkAuth(req, res, next) {
    if (req.session.userId) {
        next();
    } else {
        res.redirect('/login');
    }
}

// Route to display the registration form
app.get('/register', (req, res) => {
    res.render('register');
});

// Route to handle registration form submission
app.post('/register', (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 10);
    const sql = 'INSERT INTO users (username, password) VALUES (?, ?)';
    connection.query(sql, [username, hashedPassword], (error, results) => {
        if (error) {
            console.error('Error registering user:', error);
            res.redirect('/register');
        } else {
            res.redirect('/login');
        }
    });
});

// Route to display the login form
app.get('/login', (req, res) => {
    res.render('login');
});

// Route to handle login form submission
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const sql = 'SELECT * FROM users WHERE username = ?';
    connection.query(sql, [username], (error, results) => {
        if (error) {
            console.error('Error logging in:', error);
            res.redirect('/login');
        } else if (results.length > 0 && bcrypt.compareSync(password, results[0].password)) {
            req.session.userId = results[0].id;
            res.redirect('/');
        } else {
            res.redirect('/login');
        }
    });
});

// Route to handle logout
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error logging out:', err);
        }
        res.redirect('/login');
    });
});

// Define routes for the main application
app.get('/', checkAuth, (req, res) => {
    const showPopup = req.session.showPopup || false;
    req.session.showPopup = false; // Reset the flag
    connection.query('SELECT * FROM habits', (error, results) => {
        if (error) throw error;
        res.render('index', { results, showPopup }); // Render HTML page with data
    });
});

// Route to display the habit addition form
app.get('/add-habit', checkAuth, (req, res) => {
    res.render('add-habit');
});

// Route to handle habit addition form submission
app.post('/add-habit', checkAuth, (req, res) => {
    const { title, description, frequency } = req.body;
    const sql = 'INSERT INTO habits (title, description, target_frequency) VALUES (?, ?, ?)';
    connection.query(sql, [title, description, frequency], (error, results) => {
        if (error) throw error;
        res.redirect('/');
    });
});

// Route to display the habit edit form
app.get('/edit-habit/:id', checkAuth, (req, res) => {
    const habitId = req.params.id;
    const sql = 'SELECT * FROM habits WHERE id = ?';
    connection.query(sql, [habitId], (error, results) => {
        if (error) throw error;
        res.render('edit-habit', { habit: results[0] });
    });
});

// Route to handle habit edit form submission
app.post('/edit-habit/:id', checkAuth, (req, res) => {
    const habitId = req.params.id;
    const { title, description, frequency } = req.body;
    const sql = 'UPDATE habits SET title = ?, description = ?, target_frequency = ? WHERE id = ?';
    connection.query(sql, [title, description, frequency, habitId], (error, results) => {
        if (error) throw error;
        res.redirect('/');
    });
});

// Route to handle habit completion
app.post('/complete-habit/:id', checkAuth, (req, res) => {
    const habitId = req.params.id;
    const sql = 'UPDATE habits SET streak = streak + 1 WHERE id = ?';
    connection.query(sql, [habitId], (error, results) => {
        if (error) throw error;

        connection.query('SELECT * FROM habits WHERE id = ?', [habitId], (error, results) => {
            if (error) throw error;
            const habit = results[0];
            if (habit.streak % 5 === 0) {
                req.session.showPopup = true;
            }
            res.redirect('/');
        });
    });
});

// Route to handle habit deletion
app.post('/delete-habit/:id', checkAuth, (req, res) => {
    const habitId = req.params.id;
    const sql = 'DELETE FROM habits WHERE id = ?';
    connection.query(sql, [habitId], (error, results) => {
        if (error) throw error;
        res.redirect('/');
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));











