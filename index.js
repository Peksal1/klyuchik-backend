const express = require("express");
const app = express();
require("dotenv").config();
const PORT = process.env.PORT || 3001;
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { check, validationResult } = require("express-validator");
const { Sequelize } = require("sequelize");
const cors = require("cors");

const GUILD_NAME = "Ключик в дурку";
const SERVER_NAME = "Howling-Fjord";
const REGION = "eu"; // or "us" for US servers
const GUILD_API = `https://raider.io/api/v1/guilds/profile?region=${REGION}&realm=${SERVER_NAME}&name=${GUILD_NAME}`;
const PLAYER_API = `https://raider.io/api/v1/characters/profile?region=${REGION}&realm=${SERVER_NAME}`;
const BOT_TOKEN = process.env.BOT_TOKEN;
const DISCORD_GUILD_ID = "712008432944939182";
app.use(
  cors({
    origin: "https://www.klyuchik.net",
  })
);
const sequelize = new Sequelize(process.env.JAWSDB_URL, {
  dialect: "mysql",
});

const User = sequelize.define("User", {
  name: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  email: {
    type: Sequelize.STRING,
    allowNull: false,
    unique: true,
  },
  password: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  role: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  wow_nickname: {
    type: Sequelize.STRING,
    allowNull: false,
  },
});

// Sync User model with database
sequelize.sync();

// Register user
app.post(
  "/register",
  // [
  //   check("name").notEmpty(),
  //   check("email").isEmail(),
  //   check("password").isLength({ min: 6 }),
  //   check("role").notEmpty(),
  //   check("wow_nickname").notEmpty(),
  // ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const { name, email, password, role, wow_nickname } = req.body;

    try {
      // Check if user already exists
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ error: "User already exists" });
      }

      // Hash password
      const hashedPassword = bcrypt.hashSync(password, 10);

      // Create user
      const user = await User.create({
        name,
        email,
        password: hashedPassword,
        role,
        wow_nickname,
      });

      // Create JWT token
      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);

      res.json({ token });
    } catch (error) {
      console.error(error);
      res.status(500).send({ error: "Error creating user" });
    }
  }
);

// Login endpoint
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if user exists
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Create JWT token
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);

    // Set JWT token in cookie
    res.cookie("token", token, { httpOnly: true });

    res.json({ message: "Login successful" });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Server error" });
  }
});

// Middleware function to verify JWT token
const authenticateUser = async (req, res, next) => {
  const token = req.cookies.token;

  try {
    if (!token) {
      throw new Error();
    }

    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user object to request
    const user = await User.findOne({ where: { id: decodedToken.userId } });
    req.user = user;

    next();
  } catch (error) {
    console.error(error);
    res.status(401).send({ error: "Unauthorized" });
  }
};

// Protected endpoint to get current user info
app.get("/me", authenticateUser, (req, res) => {
  const { name, email, role, wow_nickname } = req.user;
  res.json({ name, email, role, wow_nickname });
});

// add this middleware to allow requests from any domain
app.use(function (req, res, next) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
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

// Endpoint to fetch a specific guild members weekly keys
app.get("/guild-members/weekly-keys/:name", async (req, res) => {
  try {
    const memberName = encodeURIComponent(req.params.name);
    const fetch = await import("node-fetch");
    const response = await fetch.default(
      PLAYER_API +
        `&fields=mythic_plus_weekly_highest_level_runs,mythic_plus_scores_by_season:current,raid_progression` +
        `&name=${memberName}`
    );
    const data = await response.json();
    res.send(data);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .send({ error: "Failed to fetch guild members weekly keys" });
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

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
