var express = require('express');
var router = express.Router();
/* GET home page. */
router.get('/', function(req, res, next) {
  res.redirect("/catalog");
});
// const query = require("../db");

// router.get('/', async (req, res, next) => {
//   try {
//     const results = await query('SELECT * FROM weather');
//     res.render('index', { title: results.rows });
//   } catch (error) {
//     console.error('Error executing query', error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });

module.exports = router;

