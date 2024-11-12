require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const cors = require('cors');
const pool = require('./database');

const app = express();
app.use(bodyParser.json());
const allowedOrigins = ['http://127.0.0.1:3000', 'http://localhost:3000'];

const jwtSecret = process.env.SECRET_KEY || 'default_secret_key';  // Подключаем секретный ключ из .env

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,  // Для работы с cookies и токенами
}));

function authenticateToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) {
    return res.status(403).send('Token is missing');
  }

  jwt.verify(token, jwtSecret, (err, decoded) => {
    if (err) {
      return res.status(403).send('Invalid token');
    }
    req.user = decoded;  // Сохраняем информацию о пользователе в запросе
    next();
  });
}

// Регистрация пользователя
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;

  try {
    const userExists = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (userExists.rows.length > 0) {
      return res.status(400).send('User already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query('INSERT INTO users (username, password) VALUES ($1, $2) RETURNING *', [username, hashedPassword]);
    res.status(201).send('User registered');
  } catch (err) {
    console.error(err.message);
    res.status(400).send('Error registering user');
  }
});

// Авторизация пользователя
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (user.rows.length === 0) {
      return res.status(401).send('User not found');
    }

    const validPassword = await bcrypt.compare(password, user.rows[0].password);
    if (!validPassword) {
      return res.status(401).send('Invalid credentials');
    }

    const token = jwt.sign({ id: user.rows[0].id }, jwtSecret, { expiresIn: '1h' });
    res.json({ token });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Получение списка доходов и расходов
app.get('/api/transactions', authenticateToken, async (req, res) => {
  const transactions = await pool.query(
    'SELECT id, type, amount, description, to_char(date, \'DD-MM-YYYY\') AS date FROM transactions WHERE user_id = $1',
    [req.user.id]
  );
  res.json(transactions.rows);
});

// Добавление новой записи дохода или расхода
app.post('/api/transactions', authenticateToken, async (req, res) => {
  const { type, amount, description, date } = req.body;

  const newTransaction = await pool.query(
    'INSERT INTO transactions (type, amount, description, date, user_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [type, amount, description, date, req.user.id]
  );
  res.json(newTransaction.rows[0]);
});

// Обновление записи дохода или расхода
app.put('/api/transactions/:id', authenticateToken, async (req, res) => {
  const transactionId = req.params.id;
  const { type, amount, description, date } = req.body;

  const updatedTransaction = await pool.query(
    'UPDATE transactions SET type = $1, amount = $2, description = $3, date = $4 WHERE id = $5 AND user_id = $6 RETURNING *',
    [type, amount, description, date, transactionId, req.user.id]
  );

  res.json(updatedTransaction.rows[0]);
});


// Запуск сервера
app.listen(5000, () => {
  console.log('Server is running on http://localhost:5000');
});

module.exports = app;