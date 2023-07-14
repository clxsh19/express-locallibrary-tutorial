const asyncHandler = require("express-async-handler");
const { body, validationResult } = require("express-validator");
const query = require("../db");

// Display list of all Genre.
exports.genre_list = asyncHandler(async (req, res, next) => {
  const allGenres = await query('SELECT * FROM genres');
  res.render("genre_list", {
    title: "Genre List",
    genre_list: allGenres.rows,
  });
});

// Display detail page for a specific Genre.
exports.genre_detail = asyncHandler(async (req, res, next) => {
  const [genre, booksInGenre] = await Promise.all([
    query(`SELECT name FROM genres WHERE id = ${req.params.id}`),
    query(`SELECT b.id, b.title, b.summary, g.name \
           FROM genres g\
           JOIN book_genre bg ON g.id = bg.genre_id\
           JOIN books b ON b.id = bg.book_id\
           WHERE g.id = ${req.params.id}`),
    ]);
  res.render("genre_detail", {
    title: "Genre Detail",
    genre: genre.rows,
    genre_books: booksInGenre.rows,
    });
});

// Display Genre create form on GET.
exports.genre_create_get = (req, res, next) => {
  res.render("genre_form", { title: "Create Genre" });
};

exports.genre_create_post = [
  body("name", "Genre name must contain at least 3 characters")
    .trim()
    .isLength({ min: 3})
    .escape(),
  
  asyncHandler( async(req, res, next) => {
    const errors = validationResult(req);
    const genre_name = req.body.name;
    if (!errors.isEmpty()) {
      res.render("genre_form", {
        title: "Create Genre",
        genre: { name: genre_name },
        errors: errors.array(),
      });
      return;
    } else {
      // no errors check if genre already exsits
      const genreExsits = await query(`SELECT * FROM genres WHERE name = \'${genre_name}\'`); 
      const genreResult = genreExsits.rows[0];
      if (genreResult) {
        res.redirect(`/catalog/genre/${genreResult.id}`);
      } else {
        await query(`INSERT INTO genres (name) VALUES (\'${genre_name}\')`);
        const newGenre = await query(`SELECT id FROM genres WHERE name = \'${genre_name}\'`);
        res.redirect(`/catalog/genre/${newGenre.rows[0].id}`);
      }
    }
  }),
]
