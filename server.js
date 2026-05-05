const express = require('express');
const app = express();
const port = 3000;

// Serve static files from "public"
app.use(express.static('public'));

// Home route
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Start server
app.listen(port, () => {
  console.log(`CineScope app listening at http://localhost:${port}`);
});
