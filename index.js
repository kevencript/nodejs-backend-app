const express = require("express");
const Router = require("./routes/Router");
const bodyParser = require("body-parser");
const config = require("config");

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use("/", Router);

const PORT = process.env.PORT || config.get("expressPORT");

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
