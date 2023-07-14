const { body, validationResult } = require("express-validator");
const asyncHandler = require("express-async-handler");
const query = require("../db");

exports.index = asyncHandler(async (req, res, next) => {
  const [
    numBooks,
    numBookInstances,
    numAvailableBookInstances,
    numAuthors,
    numGenres,
  ] = await Promise.all([
    query('SELECT COUNT(*) FROM books'),
    query('SELECT COUNT(*) FROM book_instances'),
    query('SELECT COUNT(*) FROM book_instances WHERE status = \'Available\' '),
    query('SELECT COUNT(*) FROM authors'),
    query('SELECT COUNT(*) FROM genres'),
  ]);
  res.render("index", {
    title: "Local Library Home",
    book_count: numBooks.rows[0].count,
    book_instance_count: numBookInstances.rows[0].count,
    book_instance_available_count: numAvailableBookInstances.rows[0].count,
    author_count: numAuthors.rows[0].count,
    genre_count: numGenres.rows[0].count,
  });
});

// Display list of all books.
exports.book_list = asyncHandler(async (req, res, next) => {
  const allBooks = await query('SELECT b.id, b.title, a.first_name, a.family_name FROM books b JOIN authors a ON b.author_id = a.id');
  // console.log(allBooks.rows);
  res.render("book_list", { title: "Book List", book_list: allBooks.rows });
});

// Display detail page for a specific book.
exports.book_detail = asyncHandler(async (req, res, next) => {
  const [book, allGenres, bookInstances] = await Promise.all([
    query(`SELECT b.id, b.title, b.summary, b.isbn, b.author_id, a.first_name, a.family_name\
           FROM books b JOIN authors a ON b.author_id = a.id\
           WHERE b.id = ${req.params.id}`),
    query(`SELECT g.id, g.name\
           FROM genres g JOIN book_genre bg ON g.id = bg.genre_id\
           WHERE bg.book_id = ${req.params.id}`),
    query(`SELECT id, imprint, status, TO_CHAR(due_back, \'Mon DD, YYYY\') AS due_back FROM book_instances WHERE book_id = ${req.params.id}`)
    ]);
  res.render("book_detail", {
    title: book.rows.title,
    book: book.rows[0],
    genres: allGenres.rows,
    book_instances: bookInstances.rows,
  });
});

//Display create book form.
exports.book_create_get  = asyncHandler( async(req, res, next) => {
  const [allAuthors, allGenres] = await Promise.all([
    query('SELECT * FROM authors'),
    query('SELECT * FROM genres'),
  ]);
  res.render("book_form", {
    title: "Create_book",
    authors: allAuthors.rows,
    genres: allGenres.rows,
  });
});

exports.book_create_post = [
  // Convert the genre to an array.
   (req, res, next) => {
    if (!(req.body.genre instanceof Array)) {
      if (typeof req.body.genre === "undefined") req.body.genre = [];
      else req.body.genre = new Array(req.body.genre);
    }
    next();
  },

  // Validate and sanitize fields.
  body("title", "Title must not be empty.")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("author", "Author must not be empty.")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("summary", "Summary must not be empty.")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("isbn", "ISBN must not be empty").trim().isLength({ min: 10 }).escape(),
  body("genre.*").escape(),

  asyncHandler( async( req, res, next) => {
    const errors = validationResult(req);

    // Create a Book object with escaped and trimmed data.
    const book = {
      title: req.body.title,
      author: req.body.author,
      summary: req.body.summary,
      isbn: req.body.isbn,
      genre: req.body.genre,
    };

    if (!errors.isEmpty()) {
      // Errors so render form with sanatized data and errors.
      const [allAuthors, allGenres] = await Promise.all([
        query('SELECT * FROM authors'),
        query('SELECT * FROM genres'),
      ]);

      for (const genre of allGenres.rows) {
        if (book.genre.indexOf(genre.id) > -1) {
          console.log('hey');
          genre.checked = "true";
        } else genre.checked = "false";
      };

      res.render("book_form", {
        title:"Create Book",
        authors: allAuthors.rows,
        genres: allGenres.rows,
        book: book,
        errors: errors.array(),
      });
    } else {
      const result = await query(
        "INSERT INTO books (title, author_id, summary, isbn) VALUES ($1, $2, $3, $4) RETURNING id",
        [book.title, book.author, book.summary, book.isbn]
      );
      const bookId = result.rows[0].id;
      for ( const genreId of book.genre ) {
        await query("INSERT INTO book_genre (genre_id, book_id) VALUES ($1, $2)",
        [genreId, bookId]);
      }
      res.redirect(`/catalog/book/${bookId}`);
    }
  }),
];

exports.book_delete_get = asyncHandler(async (req, res, next) => {
  const [book, bookInstances] = await Promise.all([
    query("SELECT * FROM books WHERE id = $1", [req.params.id]),
    query(
      "SELECT id, book_id, imprint, status, TO_CHAR(due_back, 'Mon DD, YYYY') AS due_back FROM book_instances WHERE book_id = $1",
      [req.params.id]
    ),
  ]);
  const bookAuthor = await query(
    "SELECT id, first_name, family_name FROM authors WHERE id = $1",
    [book.rows[0].author_id]
  );

  if (book === null) {
    res.redirect("/catalog/books");
  }
  res.render("book_delete", {
    title: "Delete Book",
    book: book.rows[0],
    book_instances: bookInstances.rows,
    book_author: bookAuthor.rows[0],
  });
});

exports.book_delete_post = asyncHandler(async(req, res, next) => {
  await query("DELETE FROM book_genre WHERE book_id = $1", [req.params.id]);
  await query("DELETE FROM books WHERE id = $1", [req.params.id]);
  res.redirect("/catalog/books");
})

//Disaply book update on GET
exports.book_update_get = asyncHandler( async(req, res, next) => {
  // Get book, authors and genres for form.
  const [book, allAuthors, allGenres, bookGenres] = await Promise.all([
    query("SELECT * FROM books WHERE id = $1",[req.params.id]),
    query("SELECT * FROM authors"),
    query("SELECT * FROM genres"),
    query("SELECT genre_id FROM book_genre WHERE book_id = $1",[req.params.id]),
  ]);

  if (book === null) {
    // No results.
    const err = new Error("Book not found");
    err.status = 404;
    return next(err);
  };

  for (const genre of allGenres.rows) {
    for (const book_g of bookGenres.rows) {
      if (genre.id.toString() === book_g.genre_id.toString() ) {
        genre.checked = "true";
      }
    }
  };

  res.render("book_form", {
    title: "Update Book",
    authors: allAuthors.rows,
    genres: allGenres.rows,
    book: book.rows[0],
  });
});

  // Handle book update on POST.
exports.book_update_post = [
  // Convert the genre to an array.
  (req, res, next) => {
    if (!(req.body.genre instanceof Array)) {
      if (typeof req.body.genre === "undefined") {
        req.body.genre = [];
      } else {
        req.body.genre = new Array(req.body.genre);
      }
    }
    next();
  },

  // Validate and sanitize fields.
  body("title", "Title must not be empty.")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("author", "Author must not be empty.")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("summary", "Summary must not be empty.")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("isbn", "ISBN must not be empty").trim().isLength({ min: 1 }).escape(),
  body("genre.*").escape(),

  asyncHandler( async(req, res, next) => {
    const  errors = validationResult(req);
    
     // Create a Book object with escaped/trimmed data and old id.
    const book = {
      title: req.body.title,
      author: req.body.author,
      summary: req.body.summary,
      isbn: req.body.isbn,
    };

    if (!errors.isEmpty()) {
      const [allAuthors, allGenres] = await Promise.all([
        query("SELECT * FROM authors"),
        query("SELECT * FROM genres"),
      ]);

      for (const genre of allGenres) {
        if (req.body.genre.indexOf(genre.id) > -1) {
          genre.checked = "true";
        }
      }
      res.render("book_form", {
        title: "Update Book",
        authors: allAuthors,
        genres: allGenres,
        book: book,
        errors: errors.array(),
      });
      return;
    } else {
      // console.log(req.params);
      // console.log(req.body);
      const result = await query("UPDATE books SET title = $1, author_id = $2,\
                                  summary = $3, isbn = $4 WHERE id = $5\
                                  RETURNING id", [book.title, book.author, book.summary,
                                  book.isbn, req.params.id]);
      const bookId = result.rows[0].id;
      await query("DELETE FROM book_genre WHERE book_id = $1", [bookId]);

      for (const genreId of req.body.genre) {
        await query("INSERT INTO book_genre (book_id, genre_id) VALUES ($1, $2)", [bookId, genreId]);
      };
     res.redirect(`/catalog/book/${bookId}`);
    };
  }),
]


