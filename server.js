require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const mysql = require('mysql');
const bcrypt = require('bcryptjs');

const app = express();

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true
}));

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

db.connect(err => {
  if (err) {
    console.error('Database connection error: ', err);
  } else {
    console.log('Database connected');
  }
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.get('/', (req, res) => {
  res.render('login', { message: null });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  db.query('SELECT * FROM users WHERE username = ?', [username], (err, results) => {
    if (err) {
      res.render('login', { message: 'Server error' });
    } else if (results.length === 0) {
      res.render('login', { message: 'Invalid credentials' });
    } else {
      const user = results[0];
      bcrypt.compare(password, user.password, (err, match) => {
        if (err) {
          res.render('login', { message: 'Server error' });
        } else if (match) {
          req.session.userId = user.id;
          req.session.username = user.username;
          req.session.isAdmin = user.isAdmin;
          res.redirect('/main');
        } else {
          res.render('login', { message: 'Invalid credentials' });
        }
      });
    }
  });
});

app.get('/main', (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/');
  }
  res.render('main', { username: req.session.username, isAdmin: req.session.isAdmin });
});

app.get('/admin', (req, res) => {
  if (!req.session.isAdmin) {
    return res.redirect('/main');
  }
  res.render('admin', { message: null }); // 수정된 부분
});

app.post('/create-account', (req, res) => {
  const { username, password, isAdmin } = req.body;
  bcrypt.hash(password, 10, (err, hash) => {
    if (err) {
      return res.render('admin', { message: 'Server error' }); // 수정된 부분
    }
    db.query('INSERT INTO users (username, password, isAdmin) VALUES (?, ?, ?)', [username, hash, isAdmin], (err, results) => {
      if (err) {
        res.render('admin', { message: 'Server error' }); // 수정된 부분
      } else {
        res.render('admin', { message: 'Account created successfully' }); // 수정된 부분
      }
    });
  });
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
