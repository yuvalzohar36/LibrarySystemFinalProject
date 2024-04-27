import express from 'express'; // Import express using ES module syntax
import cors from 'cors'; // Import cors using ES module syntax
import { db } from './db.js'
import { collection, query, where, getDocs, addDoc, doc, updateDoc, setDoc, getDoc, limit, startAfter, orderBy} from 'firebase/firestore/lite';
import { getFirestore, getCountFromServer } from 'firebase/firestore';

const app = express();
app.use(express.json());
let numberOfBooks = null;
const port = 3500;

// Use the cors middleware to enable CORS for all routes
app.use(cors());

// Define a route handler for the root route
app.get('/', (req, res) => {
  res.send('Hello, World from Server123!'); // Send a simple response for the root route
});

// Define a route handler for the '/api' endpoint
app.get('/api', (req, res) => {
  res.json({ message: 'Hello from the server123!' }); // Send a JSON response to the client
});

// Start the server
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});

// get a user by his id
app.get("/api/users/:uid", async (req, res) => {
  try {
    console.log("test")
    const { uid } = req.params;

    // Use `doc` and `getDoc` to fetch a document by ID in Firestore
    const userRef = doc(db, "users", uid);
    const userSnapshot = await getDoc(userRef);

    if (userSnapshot.exists()) {
      res.json(userSnapshot.data());
    } else {
      res.status(404).send("User not found");
    }
  } catch (error) {
    console.error("Error fetching user data", error);
    res.status(500).send("Server error");
  }
});


// // Handler for fetching user by UID
// app.get("/api/displaynames/:uid", async (req, res) => {
//   try {
//     console.log(
//       "123"
//     )
//     const { uid } = req.params;
//     const usersCollection = collection(db, "users");
//     const q = query(usersCollection, where("uid", "==", uid));
//     const querySnapshot = await getDocs(q);

//     if (!querySnapshot.empty) {
//       querySnapshot.forEach(doc => {
//         const user = doc.data();
//         res.status(200).send(user.displayName);
//       });
//     } else {
//       res.status(404).send("User not found");
//     }
//     console.log(
//       "123"
//     )
//   } catch (error) {
//     console.error("Error fetching user data", error);
//     res.status(500).send("Server error");
//   }
// });


// Handler for validating display name
app.get("/api/displaynames/:displayName", async (req, res) => {
  try {
    const { displayName } = req.params;

    // Create a query to find documents with matching display name
    const usersCollection = collection(db, "users");
    const q = query(usersCollection, where("displayName", "==", displayName));
    const querySnapshot = await getDocs(q);

    // If any documents match the display name, it's not valid
    if (!querySnapshot.empty) {
      res.json({ valid: false });
    } else {
      res.json({ valid: true });
    }
  } catch (error) {
    console.error("Error validating display name", error);
    res.status(500).send("Server error");
  }
});



// Handler for updating display name by UID
app.put("/api/displaynames/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    const { displayName } = req.body;

    // Reference the user document by UID
    const userRef = doc(db, "users", uid);

    // Update the displayName field in the user document
    await updateDoc(userRef, { displayName });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error updating user data", error);
    res.status(500).send("Server error");
  }
});



// Handler for user sign up
app.post("/api/users/signUp", async (req, res) => {
  try {
    console.log(req.body);
    const { uid } = req.body;
    const random = Math.floor(Math.random() * 1000000);

    // Reference to the "users" collection
    const usersCollection = collection(db, "users");

    // Set a new document in the "users" collection with the UID as the document ID
    const userRef = doc(usersCollection, uid);
    await setDoc(userRef, {
      uid: uid,
      displayName: "",
      random: random // assuming you want to insert the random number as well
    });

    // Respond with a success message
    res.status(200).json({ success: true });
  } catch (error) {
    // Handle errors
    console.error("Error creating user", error);
    res.status(500).send("Server error");
  }
});

app.get("/api/books/getAllBooks", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;

    const searchQuery = req.query.searchQuery || ""; // Search parameter
    const selectedCategories = req.query.categories ? req.query.categories.split(",") : []; // Category filter
    console.log(req.query)

    const selectedAuthors = req.query.authors ? req.query.authors.split(",") : []; // Author filter

    const booksCollection = collection(db, "books");

    // Base query with filters
    let booksQuery = query(booksCollection, orderBy("title")); // Base query

    // Apply category filter
    if (selectedCategories.length > 0) {
      booksQuery = query(booksQuery, where("category", "in", selectedCategories));
    }

    // Apply author filter
    if (selectedAuthors.length > 0) {
      booksQuery = query(booksQuery, where("author", "in", selectedAuthors));
    }

    // Apply search query
    if (searchQuery) {
      booksQuery = query(
        booksQuery,
        where("title", ">=", searchQuery),
        where("title", "<", searchQuery + "\uf8ff")
      );
    }

    // Apply pagination
    if (page === 1) {
      booksQuery = query(booksQuery, limit(pageSize));
    } else {
      const previousPageQuery = query(booksQuery, limit((page - 1) * pageSize));
      const previousPageSnapshot = await getDocs(previousPageQuery);

      if (!previousPageSnapshot.empty) {
        const lastDoc = previousPageSnapshot.docs[previousPageSnapshot.docs.length - 1];
        booksQuery = query(booksQuery, startAfter(lastDoc), limit(pageSize));
      }
    }

    const booksSnapshot = await getDocs(booksQuery);
    const books = booksSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const totalBookCount = await fetchTotalBookCount(searchQuery, selectedCategories, selectedAuthors); // Total count with filters
    console.log(totalBookCount)
    const totalPages = Math.ceil(totalBookCount / pageSize); // Ensure correct total pages

    res.status(200).json({
      books,
      totalItems: totalBookCount, // Ensure correct total book count
      totalPages, // Ensure correct pagination
    });
  } catch (error) {
    console.error("Error fetching books:", error);
    res.status(500).json({ error: "Server error" });
  }
});

const fetchTotalBookCount = async (searchQuery = "", selectedCategories = [], selectedAuthors = []) => {
  try {
    const booksCollection = collection(db, "books");
    let booksQuery = query(booksCollection);

    // Apply category filter
    if (selectedCategories.length > 0) {
      booksQuery = query(booksQuery, where("category", "in", selectedCategories));
    }
    console.log(selectedAuthors);

    // Apply author filter
    if (selectedAuthors.length > 0) {
      booksQuery = query(booksQuery, where("author", "in", selectedAuthors));
    }

    // Apply search query
    if (searchQuery) {
      booksQuery = query(
        booksQuery,
        where("title", ">=", searchQuery.toLowerCase()),
        where("title", "<", searchQuery.toLowerCase() + "\uf8ff")
      );
    }

    const booksSnapshot = await getDocs(booksQuery);
    const bookCount = booksSnapshot.size; // Correct count
    return bookCount;
  } catch (error) {
    console.error("Error fetching book count:", error);
    return 0; // Return zero if there's an error
  }
};



app.get('/api/books/getCategoriesAndAuthors', async (req, res) => {
  try {
    const booksCollection = collection(db, 'books');
    const booksSnapshot = await getDocs(booksCollection);

    const books = booksSnapshot.docs.map((doc) => doc.data());

    const categories = [...new Set(books.map((book) => book.category))].sort();
    const authors = [...new Set(books.map((book) => book.author))].sort();

    res.status(200).json({
      categories,
      authors,
    });
  } catch (error) {
    console.error('Error fetching categories and authors:', error);
    res.status(500).json({ error: 'Server error' });
  }
});





// const addBooksToFirestore = async (books) => {
//   const booksCollection = collection(db, "books");

//   const bookPromises = books.map((book) => {
//     const bookDoc = doc(booksCollection);
//     return setDoc(bookDoc, book);
//   });

//   await Promise.all(bookPromises);
//   console.log("Books added successfully.");
// };

// // Sample data for books
// const booksData = [
//   {
//     "author": "Jane Austen",
//     "bookNumber": "4",
//     "classification": "e",
//     "copies": 1,
//     "expenditure": "e",
//     "imageURL": "https://th.bing.com/th/id/R.9a1148dcd77be7ff4a134e9f8b0f9718?rik=%2bovZzx%2fuYQ%2bjSQ&pid=ImgRaw&r=0",
//     "locatorCode": "e",
//     "summary": "A romantic novel that depicts the character growth of Elizabeth Bennet.",
//     "title": "Pri1de a212nd Prej2123413u2dice",
//     "titleType": "books"
//   },
//   {
//     "author": "Jane Austen",
//     "bookNumber": "4",
//     "classification": "e",
//     "copies": 1,
//     "expenditure": "e",
//     "imageURL": "https://th.bing.com/th/id/R.9a1148dcd77be7ff4a134e9f8b0f9718?rik=%2bovZzx%2fuYQ%2bjSQ&pid=ImgRaw&r=0",
//     "locatorCode": "e",
//     "summary": "A romantic novel that depicts the character growth of Elizabeth Bennet.",
//     "title": "P12ri6de and514 Pre5j514u62dice",
//     "titleType": "books"
//   },
//   // Additional books...
// ];
// addBooksToFirestore(booksData);




import axios from 'axios';
import { Agent } from 'https';
import cheerio from 'cheerio'
import fs from 'fs';

axios.defaults.httpsAgent = new Agent({
  rejectUnauthorized: false,
});




import puppeteer from 'puppeteer';

async function fetchTitles(productId) {
  // Launch Puppeteer
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  try {
    // Navigate to the product page
    await page.goto(`https://www.e-vrit.co.il/Product/${productId}`);

    // Wait for the dynamically loaded content to appear
    await page.waitForSelector('.bottom-slider');

    // Extract the HTML content of the page
    const content = await page.content();

    // Load the HTML content into Cheerio
    const $ = cheerio.load(content);

    // Find the slider with the title "המלצות נוספות"
    const slider = $('.bottom-slider [slider-title="המלצות נוספות"]');

    // Extract titles under the slider
    const titles = [];
    slider.find('.slider-item-inner .product-name').each((index, element) => {
        titles.push($(element).text().trim());
    });

    // Log the titles
    console.log("Titles under 'המלצות נוספות':", titles);

    return titles;
  } catch (error) {
    console.error("Error fetching titles:", error.message);
    return [];
  } finally {
    // Close the browser
    await browser.close();
  }
}

async function extractProductId(searchResponseData) {
  const productListItemsIndex = searchResponseData.indexOf('"ProductListItems":[');
  if (productListItemsIndex !== -1) {
    const productListItemsEndIndex = searchResponseData.indexOf(']', productListItemsIndex);
    const productListItemsSubstring = searchResponseData.substring(productListItemsIndex, productListItemsEndIndex);
    const productNameMatch = /"Name":"([^"]+)"/.exec(productListItemsSubstring);
    if (productNameMatch) {
      const productName = productNameMatch[1];
      console.log("Found product name:", productName);

      // Extract product ID from the product list items
      const productIdMatch = /"ProductID":(\d+)/.exec(productListItemsSubstring);
      if (productIdMatch) {
        const productId = productIdMatch[1];
        console.log("Product ID:", productId);

        return productId;
      }
    } else {
      console.log("Product name not found in the product list items.");
    }
  } else {
    console.log("Product list items not found in the response data.");
  }

  return null;
}

async function fetchBookTitles(bookName) {
  console.log(bookName)
  const searchUrl = `https://www.e-vrit.co.il/Search/${encodeURIComponent(bookName)}`;

  try {
    // Step 1: Search for the book by name
    const searchResponse = await axios.get(searchUrl, { timeout: 10000 });
    console.log("HTTP Status:", searchResponse.status);

    // Step 2: Extract product ID from the response data
    const productId = await extractProductId(searchResponse.data);

    if (productId) {
      // Step 3: Fetch titles using the extracted product ID
      return await fetchTitles(productId);
    } else {
      console.log("Failed to extract product ID.");
    }
  } catch (error) {
    console.error("Error fetching book information:", error.message);
  }
  return null;
}


// (async () => {
//   const bookName = '1984';
//   await fetchBookTitles(bookName);
// })();



app.get("/api/books/getBooksMatchingTitles", async (req, res) => {
  try {
    const searchQuery = req.query.bookName || ""; // Book name search parameter
    
    // Call the function to fetch titles for the given book name
    const titles = await fetchBookTitles(searchQuery);
    
    // Remove duplicate titles and filter out the search query book name
    const uniqueTitles = Array.from(new Set(titles.filter(title => title !== searchQuery)));

    // Fetch books from the database that match the fetched titles
    const booksCollection = collection(db, "books");
    let booksQuery = query(booksCollection, orderBy("title"));
    
    if (uniqueTitles.length > 0) {
      booksQuery = query(
        booksQuery,
        where("title", "in", uniqueTitles.slice(0, 5)) // Limit to 5 unique titles
      );
    }

    // Execute the query
    const booksSnapshot = await getDocs(booksQuery);
    const books = booksSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Send the response with the matching books
    res.json(books);
  } catch (error) {
    console.error("Error fetching books:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});


// Handler for adding a new book
app.post("/api/books/add", async (req, res) => {
  try {
    const bookData = req.body; // Extract book data from request body

    // Reference to the "books" collection
    const booksCollection = collection(db, "books");

    // Create a new document in the "books" collection
    const docRef = await addDoc(booksCollection, bookData);

    // Respond with a success message and the new document ID
    res.status(200).json({ success: true, docId: docRef.id });
  } catch (error) {
    // Handle errors
    console.error("Error adding book:", error);
    res.status(500).send("Failed to add book");
  }
});

// Handler for updating an existing book
app.put("/api/books/update/:id", async (req, res) => {
  try {
    const { id } = req.params; // Get the book ID from the URL parameter
    const updatedData = req.body; // Extract updated book data from the request body

    // Reference to the specific book document
    const bookRef = doc(db, "books", id);

    // Update the book document with the new data
    await updateDoc(bookRef, updatedData);

    // Respond with a success message
    res.status(200).json({ success: true });
  } catch (error) {
    // Handle errors
    console.error("Error updating book:", error);
    res.status(500).send("Failed to update book");
  }
});

// Endpoint to get all book names
app.get("/api/books/names", async (req, res) => {
  try {
    const booksCollectionRef = collection(db, "books"); // Reference to the "books" collection
    const querySnapshot = await getDocs(booksCollectionRef); // Get all documents in the collection

    const bookNames = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      title: doc.data().title, // Book title
      author: doc.data().author, // Book author
      imageURL: doc.data().imageURL, // Book cover (image URL)
    })); // Extract book data
    
    res.status(200).json({ success: true, bookNames }); // Respond with the list of book names
  } catch (error) {
    console.error("Error fetching book names:", error);
    res.status(500).json({ success: false, message: "Failed to fetch book names" });
  }
});

// Endpoint to get a book's details by its ID
app.get("/api/books/:id", async (req, res) => {
  const { id } = req.params; // Get the book ID from the request parameters

  try {
    const bookRef = doc(db, "books", id); // Reference to the specific book document
    const docSnapshot = await getDoc(bookRef); // Fetch the book data

    if (docSnapshot.exists()) {
      const bookData = {
        id: docSnapshot.id,
        ...docSnapshot.data(),
        imageURL: docSnapshot.data().imageURL,
      }; // Extract the book data and keep the image URL

      res.status(200).json({ success: true, bookData }); // Respond with the book data
    } else {
      res.status(404).json({ success: false, message: "Book not found" }); // If the book doesn't exist
    }
  } catch (error) {
    console.error("Error fetching book by ID:", error);
    res.status(500).json({ success: false, message: "Failed to fetch book by ID" });
  }
});

