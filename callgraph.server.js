const express = require("express");

const app = express();
app.use(express.static("static"));
const port = 8080;
app.listen(port);
console.log("Listening on " + port)