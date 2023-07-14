const asyncHandler = require("express-async-handler");
const query = require("../db");
const { body, validationResult } = require("express-validator");

// Book instance form
exports.bookinstance_create_get = asyncHandler( async (req, res, next) => {
  const allBooks = await query("SELECT * FROM books");
  res.render("bookinstance_form", {
    titel: "Bookinstance_form",
    book_list: allBooks.rows,
  });
});

// Handle BookInstance create on POST.
exports.bookinstance_create_post = [
  // Validate and sanitize fields.
  body("book", "Book must be specified").trim().isLength({ min: 1 }).escape(),
  body("imprint", "Imprint must be specified")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("status").escape(),
  body("due_back", "Invalid date")
    .optional({ values: "falsy" })
    .isISO8601()
    .toDate(),

  // Process request after validation and sanitization.
  asyncHandler(async (req, res, next) => {
    // Extract the validation errors from a request.
    const errors = validationResult(req);

    // Create a BookInstance object with escaped and trimmed data.
    const bookInstance = {
      book: req.body.book,
      imprint: req.body.imprint,
      status: req.body.status,
      due_back: req.body.due_back===""?null:req.body.due_back,
    };

    if (!errors.isEmpty()) {
      const allBooks = await query("SELECT * FROM books");

      res.render("bookinstance_form", {
        title: "Create BookInstance",
        book_list: allBooks.rows,
        selected_book: bookInstance.book,
        errors: errors.array(),
        bookinstance: bookInstance,
      });
      return;
    } else {
      // save data
      const result = await query('INSERT INTO book_instances (book_id, imprint, due_back, status) VALUES ($1, $2, $3, $4) RETURNING id', 
        [bookInstance.book, bookInstance.imprint, bookInstance.due_back, bookInstance.status]);
      const bookInstanceId = result.rows[0].id;
      res.redirect(`/catalog/bookinstance/${bookInstanceId}`);
    }
  }),
];


// Display list of all BookInstances.
exports.bookinstance_list = asyncHandler(async (req, res, next) => {
  const allBookInstances = await query('SELECT i.id, b.title, i.imprint, i.status,\
                                        TO_CHAR(i.due_back, \'Mon DD, YYYY\') AS due_back_formatted \
                                        FROM books b JOIN book_instances i ON b.id = i.book_id;');
  res.render("bookinstance_list", {
    title: "Book Instance List",
    bookinstance_list: allBookInstances.rows,
  });
});

// Display detail page for a specific BookInstance.
exports.bookinstance_detail = asyncHandler(async (req, res, next) => {
  const bookInstance = await query(`SELECT bi.id, bi.book_id, bi.imprint, bi.status,\
                                    TO_CHAR(bi.due_back, \'Mon DD YYYY\') AS due_back, b.title\
                                    FROM book_instances bi JOIN books b\
                                    ON bi.book_id = b.id\
                                    WHERE bi.id = ${req.params.id}`);

  if (bookInstance === null) {
    // No results.
    const err = new Error("Book copy not found");
    err.status = 404;
    return next(err);
  }

  res.render("bookinstance_detail", {
    title: "Book:",
    bookinstance: bookInstance.rows[0],
  });
});
// Book instance delete form
exports.bookinstance_delete_get = asyncHandler(async (req, res, next) => {
  const bookInstance = await query("SELECT *, TO_CHAR(due_back, 'YYYY-MM-DD') AS due_back_formatted\
                                    FROM book_instances WHERE id = $1", [req.params.id]);
  const bookInstance_book = await query("SELECT * FROM books WHERE id = $1", [bookInstance.rows[0].book_id]);

  if (bookInstance === null) {
    // No results.
    res.redirect("/catalog/bookinstances");
  }

  res.render("bookinstance_delete", {
    title: "Delete BookInstance",
    bookinstance: bookInstance.rows[0],
    book: bookInstance_book.rows[0],
  });

});

// Handle BookInstance delete on POST.
exports.bookinstance_delete_post = asyncHandler(async (req, res, next) => {
  // Assume valid BookInstance id in field.
  //delete
  await query("DELETE FROM book_instances WHERE id = $1", [req.params.id]);
  res.redirect("/catalog/bookinstances");
});

// Book instance update form on GET
exports.bookinstance_update_get = asyncHandler( async (req, res, next) => {
  const allBooks = await query("SELECT * FROM books");
  const  bookInstance = await query("SELECT * , TO_CHAR(due_back, 'YYYY-MM-DD') AS due_back\
                                     from book_instances WHERE id = $1",
                                     [req.params.id]);
  res.render("bookinstance_form", {
    titel: "Bookinstance_form",
    book_list: allBooks.rows,
    bookinstance: bookInstance.rows[0]
  });
});

// Handle BookInstance update on POST.
exports.bookinstance_update_post = [
  // Validate and sanitize fields.
  body("book", "Book must be specified").trim().isLength({ min: 1 }).escape(),
  body("imprint", "Imprint must be specified")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("status").escape(),
  body("due_back", "Invalid date")
    .optional({ values: "falsy" })
    .isISO8601()
    .toDate(),

  // Process request after validation and sanitization.
  asyncHandler(async (req, res, next) => {
    // Extract the validation errors from a request.
    const errors = validationResult(req);

    // Create a BookInstance object with escaped and trimmed data.
    const bookInstance = {
      book: req.body.book,
      imprint: req.body.imprint,
      status: req.body.status,
      due_back: req.body.due_back===""?null:req.body.due_back,
    };

    if (!errors.isEmpty()) {
      const allBooks = await query("SELECT * FROM books");

      res.render("bookinstance_form", {
        title: "Create BookInstance",
        book_list: allBooks.rows,
        selected_book: bookInstance.book,
        errors: errors.array(),
        bookinstance: bookInstance,
      });
      return;
    } else {
      // save data
      const result = await query('UPDATE book_instances SET book_id = $1, imprint = $2, due_back = $3, status = $4\
                                  WHERE id = $5 RETURNING id', 
        [bookInstance.book, bookInstance.imprint, bookInstance.due_back, bookInstance.status, req.params.id]);
      const bookInstanceId = result.rows[0].id;
      res.redirect(`/catalog/bookinstance/${bookInstanceId}`);
    }
  }),
];
