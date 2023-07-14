const { body, validationResult } = require("express-validator");
const asyncHandler = require("express-async-handler");
const query = require("../db");

// Display Author create form on GET.
exports.author_create_get = (req, res, next) => {
  res.render("author_form", { title: "Create Author" });
};
// create author on post
exports.author_create_post = [
  body("first_name")
    .trim()
    .escape()
    .isLength({ min: 1 })
    .withMessage("First name must be specified")
    .isAlphanumeric()
    .withMessage("First name must only have alphanumeric characters"),
  body("family_name")
    .trim()
    .isLength({ min: 1 })
    .escape()
    .withMessage("Family name must be specified.")
    .isAlphanumeric()
    .withMessage("Family name has non-alphanumeric characters."),
  body("date_of_birth", "Invalid date of birth")
    .optional({ values: "falsy" })
    .isISO8601()
    .toDate(),
  body("date_of_death", "Invalid date of death")
    .optional({ values: "falsy" })
    .isISO8601()
    .toDate(),

  // Process request after validation and sanitization.
  asyncHandler(async (req, res, next) => {
    const errors = validationResult(req);
    const author = {
      first_name: req.body.first_name,
      family_name: req.body.family_name,
      date_of_birth: req.body.date_of_birth,
      date_of_death: req.body.date_of_death===""?null:req.body.date_of_death,
    };

    if (!errors.isEmpty()) {
      res.render("author_form", {
        title: "Create Author",
        author: author,
        errors: errors.array(),
      });
      return;
    } else {
      // Save data
      await query(
        "INSERT INTO authors (first_name, family_name, date_of_birth, date_of_death) VALUES ($1, $2, $3, $4)",
        [author.first_name, author.family_name, author.date_of_birth, author.date_of_death]
      );
      const newAuthor = await query(
        "SELECT id FROM authors WHERE first_name = $1 AND family_name = $2 AND date_of_birth = $3",
        [author.first_name, author.family_name, author.date_of_birth]
      );
      res.redirect(`/catalog/author/${newAuthor.rows[0].id}`);
    }
  }),
];


exports.author_list = asyncHandler( async(req, res, next) => {
	const allAuthors = await query('SELECT id, first_name, \
		                           family_name, TO_CHAR(date_of_birth, \'Mon DD, YYYY\') AS date_of_birth, \
		                           TO_CHAR(date_of_death, \'Mon DD, YYYY\') AS date_of_death FROM authors');
	res.render("author_list", {
		title: "Author List",
		author_list: allAuthors.rows,
	});
});

exports.author_detail = asyncHandler( async(req, res, next) => {
	const [author, booksByAuthor] = await Promise.all([
		query(`SELECT id, first_name, family_name,\
		       TO_CHAR(date_of_birth, \'Mon DD, YYYY\') AS date_of_birth,\
		       TO_CHAR(date_of_death, \'Mon DD, YYYY\') AS date_of_death\
			   FROM authors WHERE id = ${req.params.id}`),
		query(`SELECT id, title, summary FROM books\
			   WHERE author_id = ${req.params.id}`),
	]);

	if (author === null) {
	    // No results.
	    const err = new Error("Author not found");
	    err.status = 404;
	    return next(err);
  };

	res.render('author_detail', {
		title: "Author detail",
		author: author.rows[0],
	  author_books: booksByAuthor.rows,
	});
});

exports.author_delete_get = asyncHandler( async( req, res, next) => {
  const [author, allBooksByAuthor] = await Promise.all([
    query("SELECT id, first_name, family_name,\
           TO_CHAR(date_of_birth, \'Mon DD, YYYY\') AS date_of_birth,\
           TO_CHAR(date_of_death, \'Mon DD, YYYY\') AS date_of_death\
           FROM authors WHERE id = $1", [req.params.id]),
    query("SELECT * FROM books WHERE author_id = $1",[req.params.id]),
  ]);

  if (author === null) {
    res.redirect("/catalog/authors");
  };
  res.render("author_delete", {
    title: "Delete Auhtor",
    author: author.rows[0],
    author_books: allBooksByAuthor.rows,
  });
});

exports.author_delete_post = asyncHandler( async(req, res, next) => {
  await query("DELETE FROM authors WHERE id = $1", [req.params.id]);
  res.redirect("/catalog/authors");
});

//Disaply author update on GET
exports.author_update_get = asyncHandler( async(req, res, next) => {
  // Get author
  const author = await query("SELECT *, TO_CHAR(date_of_birth, 'YYYY-MM-DD') AS date_of_birth,\
                              TO_CHAR(date_of_death, 'YYYY-MM-DD') AS date_of_death\
                              FROM authors WHERE id = $1", [req.params.id]);


  if (author === null) {
    // No results.
    const err = new Error("Book not found");
    err.status = 404;
    return next(err);
  };

  res.render("author_form", {
    title: "Update Author",
    author: author.rows[0],
  });
});

//  Auhtor update POST
exports.author_update_post = [
  body("first_name")
    .trim()
    .escape()
    .isLength({ min: 1 })
    .withMessage("First name must be specified")
    .isAlphanumeric()
    .withMessage("First name must only have alphanumeric characters"),
  body("family_name")
    .trim()
    .isLength({ min: 1 })
    .escape()
    .withMessage("Family name must be specified.")
    .isAlphanumeric()
    .withMessage("Family name has non-alphanumeric characters."),
  body("date_of_birth", "Invalid date of birth")
    .optional({ values: "falsy" })
    .isISO8601()
    .toDate(),
  body("date_of_death", "Invalid date of death")
    .optional({ values: "falsy" })
    .isISO8601()
    .toDate(),

  // Process request after validation and sanitization.
  asyncHandler(async (req, res, next) => {
    const errors = validationResult(req);
    const author = {
      first_name: req.body.first_name,
      family_name: req.body.family_name,
      date_of_birth: req.body.date_of_birth,
      date_of_death: req.body.date_of_death===""?null:req.body.date_of_death,
    };

    if (!errors.isEmpty()) {
      res.render("author_form", {
        title: "Create Author",
        author: author,
        errors: errors.array(),
      });
      return;
    } else {
      // Save data
      const result = await query("UPDATE authors SET first_name = $1, family_name = $2,\
                                   date_of_birth = $3, date_of_death = $4 WHERE id = $5\
                                   RETURNING id",
                                   [author.first_name, author.family_name, author.date_of_birth, author.date_of_death, req.params.id]);
      const author_id = result.rows[0].id;
      res.redirect(`/catalog/author/${author_id}`);
    }
  }),
];