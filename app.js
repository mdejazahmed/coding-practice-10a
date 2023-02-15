const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "covid19IndiaPortal.db");

let database;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server is running");
    });
  } catch (err) {
    console.log(err.message);
    process.exit(1);
  }
};
initializeDbAndServer();

function authentication(req, res, next) {
  let jwtToken;
  const authHeader = req.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    res.status(401);
    res.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "merimaa", async (err, payload) => {
      if (err) {
        res.status(401);
        res.send("Invalid JWT Token");
      } else {
        console.log(req.body);
        req.username = payload.username;
        next();
      }
    });
  }
}

app.post("/login/", async (req, res) => {
  const { username, password } = req.body;

  const existingUserQuery = `
SELECT
    *
FROM
    user
WHERE username='${username}';`;

  const user = await database.get(existingUserQuery);

  if (user !== undefined) {
    const isValidPassword = bcrypt.compare(password, user.password);
    if (isValidPassword) {
      const payload = { username };
      const jwtToken = jwt.sign(payload, "merimaa");
      res.send({ jwtToken });
    } else {
      res.status(400);
      res.send("Invalid password");
    }
  } else {
    res.status(400);
    res.send("Invalid user");
  }
});

app.get("/states/", authentication, async (req, res) => {
  const getStatesQuery = `
    SELECT
        *
    FROM
        state;`;

  const statesArray = await database.all(getStatesQuery);
  res.send(statesArray);
});

app.get("/states/:stateId/", authentication, async (req, res) => {
  const { stateId } = req.params;
  console.log(stateId);
  const getStateQuery = `
SELECT
    *
FROM
    state
WHERE
    state_id=${stateId};`;

  const state = await database.get(getStateQuery);
  res.send(state);
});

app.post("/districts/", authentication, async (req, res) => {
  const { districtName, stateId, cases, cured, active, deaths } = req.body;
  console.log(req.body);
  const addDistrictQuery = `
INSERT INTO
    district (district_name,state_id,cases,cured,active,deaths)
VALUES
    ('${districtName}',${stateId},${cases},${cured},${active},${deaths});`;

  await database.run(addDistrictQuery);
  res.send("District Successfully");
});
