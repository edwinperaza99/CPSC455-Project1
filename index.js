const fs = require('fs')
const os = require('os')

const express = require('express')
const morgan = require('morgan')
const cookieSession = require('cookie-session')
const bcrypt = require('bcrypt')
const Database = require('better-sqlite3')

const PORT = 8080
const app = express()

app.set('view engine', 'ejs')
app.use(morgan("dev"))
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(cookieSession({
  secret: 'cpsc455-project1',
  maxAge: 20 * 60 * 1000 // 20 minutes
}))
app.use((req, res, next) => {
    res.set("Content-Security-Policy", "frame-ancestors 'none'");
    next();
  });

const db = new Database(':memory:', { verbose: console.log })
db.pragma('foreign_keys = ON')

app.get('/', (req, res) => {
  res.redirect('/login')
})

app.get('/login', (req, res) => {
  res.render('login', { msg: null })
})

app.post('/login', (req, res) => {
  const username = req.body.username

  const stmt = db.prepare(`
      SELECT id, username, password
      FROM users
      WHERE username = ?
    `)

  const user = stmt.get(username)
  if (!user) {
    res.render('login', { msg: 'an incorrect username or password was entered' })
    return
  }

  bcrypt.compare(req.body.password, user.password, (err, result) => {
    if (err) {
      throw err
    }

    if (result) {
      req.session.user_id = user.id
      res.redirect('/balance')
    } else {
      res.render('login', { msg: 'an incorrect username or password was entered' })
    }
  })
})

app.get('/balance', (req, res) => {
  const userId = req.session.user_id

  if (!userId) {
    res.render('login', { msg: 'invalid session' })
    return
  }

  let stmt = db.prepare('SELECT username FROM users WHERE id = ?')
  const user = stmt.get(userId)

  stmt = db.prepare('SELECT id, balance FROM accounts WHERE user_id = ?')
  const accounts = stmt.all(userId)

  res.render('balance', { user, accounts })
})

app.get('/deposit', (req, res) => {
  const userId = req.session.user_id

  if (!userId) {
    res.render('login', { msg: 'invalid session' })
    return
  }

  let stmt = db.prepare('SELECT username FROM users WHERE id = ?')
  const user = stmt.get(userId)

  stmt = db.prepare('SELECT id, balance FROM accounts WHERE user_id = ?')
  const accounts = stmt.all(userId)

  res.render('deposit', { user, accounts })
})

app.post('/deposit', (req, res) => {
  const userId = req.session.user_id

  if (!userId) {
    res.render('login', { msg: 'invalid session' })
    return
  }

  const stmt = db.prepare(`
      UPDATE accounts
      SET balance = balance + ?
      WHERE id = ?
    `)

  for (const deposit of req.body.deposits) {
    stmt.run(deposit.amount, deposit.id)
  }

  res.redirect('/balance')
})

app.post('/logout', (req, res) => {
  req.session = null
  res.render('login', { msg: 'logged out' })
})

app.post('/transfer', (req, res) => {
  const stmt = db.prepare(`
    SELECT 1
    FROM accounts
    WHERE id = ?
      AND user_id = ?
  `)

  const valid = stmt.get(req.body.from, req.session.user_id)
  if (!valid) {
    res.status(401)
    res.json({ msg: 'invalid transfer' })
    return
  }

  const deposit = db.prepare(`
      UPDATE accounts
      SET balance = balance + ?
      WHERE id = ?
    `)

  const withdrawal = db.prepare(`
      UPDATE accounts
      SET balance = balance - ?
      WHERE id = ?
    `)

  const transfer = db.transaction((from, to, amount) => {
    withdrawal.run(amount, from)
    deposit.run(amount, to)
    res.json({ from, to, amount })
  })

  transfer(req.body.from, req.body.to, req.body.amount)
})

app.listen(PORT, () => {
  const setup = fs.readFileSync('./bank.sql', { encoding: 'utf-8' })
  db.exec(setup)

  console.log(`Server running at http://${os.hostname()}:${PORT}/`)
})
