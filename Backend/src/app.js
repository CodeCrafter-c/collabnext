require("dotenv").config();

// node modules
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");

const app = express();
const port = process.env.Port || 4000;

// self created modules
const { connection } = require("./database/connection");
const { UserRouter } = require("./routes/user");

//------------------------------- gloabal middlewares
// gloabal errror handler
const { errorHandler } = require("./utils/errorHandler");
app.use(errorHandler);

app.use(express.json({ limit: "20kb" }));

app.use(
  express.urlencoded({ extended: true, limit: "20kb", parameterLimit: 50 })
);

app.use(cookieParser());

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
.split(",")
.map((origin) => {
  return origin.trim();
})
.filter(Boolean);

const mode = process.env.MODE;

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin && process.env.MODE !== "production") {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);

// routing

app.use("/api/v1/user",UserRouter)



// db connwction
connection()
  .then(() => {
    app.listen(port, () => {
      console.log("server is running at port: ", port);
    });
  })
  .catch((err) => {
    console.log("Err: ", err);
  });
