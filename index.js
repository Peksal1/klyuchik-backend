const express = require("express");
const app = express();
require("dotenv").config();
const PORT = process.env.PORT || 3001;
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { check, validationResult } = require("express-validator");
const { Sequelize } = require("sequelize");
const cors = require("cors");
const bodyParser = require("body-parser");
app.use(bodyParser.json());
const GUILD_NAME = "Ключик в дурку";
const SERVER_NAME = "Howling-Fjord";
const REGION = "eu"; // or "us" for US servers
const GUILD_API = `https://raider.io/api/v1/guilds/profile?region=${REGION}&realm=${SERVER_NAME}&name=${GUILD_NAME}`;
const PLAYER_API = `https://raider.io/api/v1/characters/profile?region=${REGION}&realm=${SERVER_NAME}`;
const BOT_TOKEN = process.env.BOT_TOKEN;
const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;
const session = require("express-session");
const passport = require("passport");
const cookieParser = require("cookie-parser");
const BnetStrategy = require("passport-bnet").Strategy;
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
  bnetId: {
    type: Sequelize.DECIMAL,
    allowNull: true,
    unique: true,
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
    unique: true,
  },
});

const GuideCategory = sequelize.define("GuideCategory", {
  name: {
    type: Sequelize.STRING,
    allowNull: false,
    unique: true,
  },
  description: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  tag: {
    type: Sequelize.STRING,
    allowNull: false,
  },
});

const Guide = sequelize.define("Guide", {
  title: {
    type: Sequelize.STRING,
    allowNull: false,
    unique: true,
  },
  description: {
    type: Sequelize.STRING,
    allowNull: false,
  },
});

const GuideFeature = sequelize.define("GuideFeature", {
  title: {
    type: Sequelize.STRING,
    allowNull: false,
    unique: true,
  },
  description: {
    type: Sequelize.STRING,
    allowNull: false,
  },
});

const GuideImage = sequelize.define("GuideImage", {
  url: {
    type: Sequelize.STRING,
    allowNull: false,
  },
});

GuideCategory.hasMany(Guide);
Guide.belongsTo(GuideCategory);

Guide.hasMany(GuideFeature);
GuideFeature.belongsTo(Guide);

Guide.hasMany(GuideImage);
GuideImage.belongsTo(Guide);

GuideCategory.hasMany(GuideImage);
GuideImage.belongsTo(GuideCategory);

const Boosting = sequelize.define("Boosting", {
  price: {
    type: Sequelize.DECIMAL,
    allowNull: false,
  },
  title: {
    type: Sequelize.STRING,
    allowNull: false,
    unique: true,
  },
  description: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  category: {
    type: Sequelize.STRING,
    allowNull: false,
  },
});

app.use(
  session({
    secret: process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session()); // Add this middleware

// Bnet auth

passport.use(
  new BnetStrategy(
    {
      clientID: process.env.BNET_ID,
      clientSecret: process.env.BNET_SECRET,
      callbackURL: "/auth/bnet/callback",
      region: "eu",
    },

    (accessToken, refreshToken, profile, done) => {
      done(null, { accessToken }); // pass accessToken to serializeUser
    }
  )
);

// Endpoint to create a new guide
app.post("/guides", async (req, res) => {
  try {
    const { title, description, image, categoryId } = req.body;
    const guide = await Guide.create({ title, description, image, categoryId });
    res.status(201).send(guide);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Failed to create guide" });
  }
});

// Endpoint to get all guides
app.get("/guides", async (req, res) => {
  try {
    const guides = await Guide.findAll({
      include: [
        {
          model: GuideFeature,
          include: [GuideImage],
        },
        GuideCategory,
      ],
    });
    res.send(guides);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Failed to fetch guides" });
  }
});

// Endpoint to create a new guide feature
app.post("/guide-features", async (req, res) => {
  try {
    const { title, description, image, guideId } = req.body;
    const guideFeature = await GuideFeature.create({
      title,
      description,
      image,
      guideId,
    });
    res.status(201).send(guideFeature);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Failed to create guide feature" });
  }
});

// Endpoint to get all guide features
app.get("/guide-features", async (req, res) => {
  try {
    const guideFeatures = await GuideFeature.findAll({
      include: [GuideImage, Guide],
    });
    res.send(guideFeatures);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Failed to fetch guide features" });
  }
});

// Endpoint to create a new guide image
app.post("/guide-images", async (req, res) => {
  try {
    const { url, altText, featureId } = req.body;
    const guideImage = await GuideImage.create({ url, altText, featureId });
    res.status(201).send(guideImage);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Failed to create guide image" });
  }
});

// Endpoint to get all guide images
app.get("/guide-images", async (req, res) => {
  try {
    const guideImages = await GuideImage.findAll({
      include: [GuideFeature],
    });
    res.send(guideImages);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Failed to fetch guide images" });
  }
});

// Endpoint to create a new guide category
app.post("/guide-categories", async (req, res) => {
  try {
    const { name, description, image } = req.body;
    const guideCategory = await GuideCategory.create({
      name,
      description,
      image,
    });
    res.status(201).send(guideCategory);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Failed to create guide category" });
  }
});

// Endpoint to get all guide categories
app.get("/guide-categories", async (req, res) => {
  try {
    const categories = await GuideCategory.findAll({
      include: [
        {
          model: Guide,
          as: "guides",
          include: [
            {
              model: GuideFeature,
              as: "features",
              include: [
                {
                  model: GuideImage,
                  as: "images",
                },
              ],
            },
            {
              model: GuideImage,
              as: "images",
            },
          ],
        },
      ],
    });
    res.send(categories);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Failed to get guide categories" });
  }
});

passport.serializeUser((user, done) => {
  done(null, user.accessToken); // store accessToken in cookie
});

passport.deserializeUser((accessToken, done) => {
  done(null, { accessToken }); // retrieve accessToken from cookie
});

app.use(cookieParser());

app.get("/auth/bnet", passport.authenticate("bnet"));

app.get(
  "/auth/bnet/callback",
  passport.authenticate("bnet", {
    failureRedirect: "/login",
  }),
  (req, res) => {
    // Redirect the user back to the React client without query parameters
    res.redirect("https://www.klyuchik.net/");
  }
);

app.get("/bnet/profile", async (req, res) => {
  const accessToken = req.cookies["connect.sid"];
  const fetch = await import("node-fetch");
  console.log(req.cookies);
  // Make API call to retrieve user's Battle.net profile information
  const response = await fetch.default(
    `https://eu.api.blizzard.com/profile/user/wow?namespace=profile-eu&locale=ru_RU&access_token=${accessToken}`
  );
  if (!response.ok) {
    throw new Error(
      `Failed to fetch Battle.net profile: ${response.statusText}`
    );
  }
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "https://www.klyuchik.net");
  const data = await response.json().catch((error) => {
    console.error(error);
    throw new Error("Failed to parse Battle.net profile JSON response");
  });
  console.log(data);
  res.send(data);
});

//bnet profile
app.get("/profile", async (req, res) => {
  try {
    const accessToken = req.cookies["connect.sid"]; // retrieve accessToken from cookie
    const user = await getUser(accessToken);
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get profile information" });
  }
});

async function getUser(accessToken) {
  return new Promise((resolve, reject) => {
    const strategy = new BnetStrategy(
      {
        clientID: process.env.BNET_ID,
        clientSecret: process.env.BNET_SECRET,
        callbackURL: "/auth/bnet/callback",
        region: "eu",
      },
      (accessToken, refreshToken, profile, done) => {
        done(null, profile);
      }
    );

    strategy.userProfile(accessToken, (err, profile) => {
      if (err) {
        reject(err);
      } else {
        resolve(profile);
      }
    });
  });
}

// Register user
app.post(
  "/register",
  [
    check("name").notEmpty(),
    check("email").isEmail(),
    check("password").isLength({ min: 6 }),
    check("role").notEmpty(),
    check("wow_nickname").notEmpty(),
  ],
  async (req, res) => {
    console.log(req.body);
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

      // Check if user already exists
      const existingNickname = await User.findOne({ where: { wow_nickname } });
      if (existingNickname) {
        return res.status(400).json({ error: "Character already exists" });
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

      // Add Access-Control-Allow-Origin header with the value of the requesting domain
      res.setHeader("Access-Control-Allow-Origin", "https://www.klyuchik.net");

      res.json({ token });
    } catch (error) {
      console.error(error);
      res.status(500).send({ error: "Error creating user" });
    }
  }
);

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find user by email
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    // Verify password
    const validPassword = bcrypt.compareSync(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    // Create JWT token
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);

    // Add Access-Control-Allow-Origin header with the value of the requesting domain
    res.setHeader("Access-Control-Allow-Origin", "https://www.klyuchik.net");

    res.json({ token });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Error logging in user" });
  }
});

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).send({ error: "Unauthorized" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (error, decoded) => {
    if (error) {
      return res.status(401).send({ error: "Unauthorized" });
    }
    req.userId = decoded.userId;
    next();
  });
}

app.post("/logout", authenticateToken, async (req, res) => {
  try {
    // Remove token from client-side
    res.clearCookie("token");

    res.json({ message: "Logout successful" });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Error logging out user" });
  }
});

// is streaming endpoint
app.get("/is-streaming/:username", async (req, res) => {
  const twitchUsername = req.params.username;
  const twitchApiEndpoint = `https://api.twitch.tv/helix/streams?user_login=${twitchUsername}`;
  const twitchClientId = TWITCH_CLIENT_ID;

  // Fetch access token
  const twitchAuthEndpoint = "https://id.twitch.tv/oauth2/token";
  const twitchAuthBody = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: twitchClientId,
    client_secret: process.env.TWITCH_CLIENT_SECRET,
  });

  try {
    const authResponse = await fetch(twitchAuthEndpoint, {
      method: "POST",
      body: twitchAuthBody,
    });
    const authData = await authResponse.json();

    // Make API request with access token
    const twitchApiAuthHeaders = {
      Authorization: `Bearer ${authData.access_token}`,
      "Client-ID": twitchClientId,
    };
    const response = await fetch(twitchApiEndpoint, {
      headers: twitchApiAuthHeaders,
    });
    const data = await response.json();

    if (data.data && data.data.length > 0) {
      res.json({ isStreaming: true });
      console.log(data);
    } else {
      res.json({ isStreaming: false });
      console.log(data);
    }
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Error checking Twitch stream status" });
  }
});
// Endpoint to create Boosting
app.post("/boosting", authenticateToken, async (req, res) => {
  // Check if user is admin
  const user = await User.findOne({ where: { id: req.userId } });
  if (user.role !== "admin") {
    return res.status(403).send({ error: "Unauthorized" });
  }

  // Create Boosting
  try {
    const { price, title, description, category } = req.body;
    const boosting = await Boosting.create({
      price,
      title,
      description,
      category,
    });
    res.json(boosting);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Error creating Boosting" });
  }
});

// Endpoint to get all Boosting
app.get("/boosting", async (req, res) => {
  try {
    const boosting = await Boosting.findAll();
    res.json(boosting);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Error getting Boosting" });
  }
});

app.get("/user", authenticateToken, async (req, res) => {
  try {
    // Find user by id
    const user = await User.findOne({ where: { id: req.userId } });
    if (!user) {
      return res.status(404).send({ error: "User not found" });
    }

    // Remove sensitive data from user object
    const { password, ...userInfo } = user.toJSON();

    // Add Access-Control-Allow-Origin header with the value of the requesting domain
    res.setHeader("Access-Control-Allow-Origin", "https://www.klyuchik.net");

    res.json(userInfo);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Error getting user info" });
  }
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
        `&fields=mythic_plus_weekly_highest_level_runs,mythic_plus_scores_by_season:current,raid_progression,gear` +
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
