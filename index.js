const express = require("express");
const app = express();
const PORT = process.env.PORT || 3001;

const GUILD_NAME = "Ключик в дурку";
const SERVER_NAME = "Howling Fjord";
const REGION = "eu"; // or "us" for US servers
const API_URL = `https://raider.io/api/v1/guilds/profile?region=${REGION}&realm=${SERVER_NAME}&name=${GUILD_NAME}`;

// add this middleware to allow requests from any domain
app.use(function (req, res, next) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

// Endpoint to fetch guild members
app.get("/guild-members", async (req, res) => {
  try {
    const fetch = await import("node-fetch");
    const response = await fetch.default(API_URL + "&fields=members");
    const data = await response.json();
    res.send(data.members);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Failed to fetch guild members" });
  }
});

// Endpoint to fetch guild raid progression
app.get("/guild", async (req, res) => {
  try {
    const fetch = await import("node-fetch");
    const response = await fetch.default(API_URL + "&fields=raid_progression");
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
