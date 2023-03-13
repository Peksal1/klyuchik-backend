const express = require("express");
const app = express();
const { authenticateToken } = require("./auth"); // import the middleware function
require("dotenv").config();
const PORT = process.env.PORT || 3001;
const mysql = require("mysql");

const connection = mysql.createConnection(process.env.JAWSDB_URL);

connection.connect(function (err) {
  if (err) {
    console.error("error connecting: " + err.stack);
    return;
  }

  console.log("connected as id " + connection.threadId);
});

const GUILD_NAME = "Ключик в дурку";
const SERVER_NAME = "Howling-Fjord";
const REGION = "eu"; // or "us" for US servers
const GUILD_API = `https://raider.io/api/v1/guilds/profile?region=${REGION}&realm=${SERVER_NAME}&name=${GUILD_NAME}`;
const PLAYER_API = `https://raider.io/api/v1/characters/profile?region=${REGION}&realm=${SERVER_NAME}`;
const BOT_TOKEN = process.env.BOT_TOKEN;
const DISCORD_GUILD_ID = "712008432944939182";

// add this middleware to allow requests from any domain
app.use(function (req, res, next) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

// Endpoint to register a new user
app.post("/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if the email is already registered
    const emailCheckSql = `
      SELECT * FROM users WHERE email = ?;
    `;
    connection.query(emailCheckSql, [email], (error, results, fields) => {
      if (error) {
        console.error(error);
        res.status(500).send({ error: "Failed to register user" });
        return;
      }

      if (results.length > 0) {
        res.status(400).send({ error: "Email already registered" });
        return;
      }

      // Insert the new user into the database
      const registerSql = `
        INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?);
      `;
      connection.query(
        registerSql,
        [name, email, password, role],
        (error, results, fields) => {
          if (error) {
            console.error(error);
            res.status(500).send({ error: "Failed to register user" });
            return;
          }

          res.send({ message: "User registered successfully" });
        }
      );
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Failed to register user" });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if the email and password match a registered user
    const loginSql = `
      SELECT * FROM users WHERE email = ? AND password = ?;
    `;
    connection.query(loginSql, [email, password], (error, results, fields) => {
      if (error) {
        console.error(error);
        res.status(500).send({ error: "Failed to log in user" });
        return;
      }

      if (results.length === 0) {
        res.status(400).send({ error: "Incorrect email or password" });
        return;
      }

      // User is authenticated, generate and return an access token
      const token = generateAccessToken(results[0].id, results[0].role);
      res.send({ token });
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Failed to log in user" });
  }
});
// Endpoint to get the current logged in user
app.get("/user", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Retrieve the user data
    const getUserSql = `
      SELECT * FROM users WHERE id = ?;
    `;
    connection.query(getUserSql, [userId], (error, results, fields) => {
      if (error) {
        console.error(error);
        res.status(500).send({ error: "Failed to retrieve user data" });
        return;
      }

      if (results.length === 0) {
        res.status(400).send({ error: "User not found" });
        return;
      }

      // Return the user data
      const user = results[0];
      res.send({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      });
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Failed to retrieve user data" });
  }
});

// Endpoint to fetch guild members
app.get("/guild-members", async (req, res) => {
  try {
    const fetch = await import("node-fetch");
    const response = await fetch.default(GUILD_API + "&fields=members");
    const data = await response.json();
    res.send(data.members);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Failed to fetch guild members" });
  }
});

// Endpoint to fetch a specific guild member
app.get("/guild-members/:name", async (req, res) => {
  try {
    const memberName = encodeURIComponent(req.params.name);
    const fetch = await import("node-fetch");
    const response = await fetch.default(PLAYER_API + `&name=${memberName}`);
    const data = await response.json();
    res.send(data);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Failed to fetch guild member" });
  }
});

app.get("/online-users", async (req, res) => {
  try {
    const fetch = await import("node-fetch");
    const response = await fetch.default(
      `https://discord.com/api/guilds/${DISCORD_GUILD_ID}/members`,
      {
        headers: {
          Authorization: `Bot ${BOT_TOKEN}`,
        },
      }
    );
    const data = await response.json();
    res.send(data);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Failed to fetch online users" });
  }
});

// Endpoint to fetch server stats
app.get("/server-stats", async (req, res) => {
  try {
    const fetch = await import("node-fetch");
    const response = await fetch.default(
      `https://discord.com/api/guilds/${DISCORD_GUILD_ID}/widget.json`,
      {
        headers: {
          Authorization: `Bot ${BOT_TOKEN}`,
        },
      }
    );
    const data = await response.json();
    res.send(data);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Failed to fetch server stats" });
  }
});

// Endpoint to fetch current Mythic+ affixes
app.get("/mythic-affixes", async (req, res) => {
  try {
    const fetch = await import("node-fetch");
    const response = await fetch.default(
      "https://raider.io/api/v1/mythic-plus/affixes?region=eu"
    );
    const data = await response.json();
    res.send(data);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Failed to fetch Mythic+ affixes" });
  }
});

// Endpoint to fetch guild raid progression
app.get("/guild", async (req, res) => {
  try {
    const fetch = await import("node-fetch");
    const response = await fetch.default(
      GUILD_API + "&fields=raid_progression"
    );
    const data = await response.json();
    res.send(data);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Failed to fetch guild data" });
  }
});

const createTableSql = `
  CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('user', 'admin') NOT NULL DEFAULT 'user'
  )
`;
connection.query(createTableSql, (error, results, fields) => {
  if (error) {
    console.error(error);
    return;
  }

  console.log("Table created successfully");
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
