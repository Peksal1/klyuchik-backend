const express = require("express");
const app = express();
require("dotenv").config();
const PORT = process.env.PORT || 3001;

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
