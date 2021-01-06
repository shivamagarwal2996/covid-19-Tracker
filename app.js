const express = require('express');
const cors = require('cors');
const handleQuery = require('./controller');

const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static('public'))

app.get('/coronavirus', handleQuery);


const PORT = 4000 || process.env.PORT;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));