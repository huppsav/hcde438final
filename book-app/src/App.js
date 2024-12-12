import './App.css';
import { useEffect, useState } from 'react';
import { Route, Routes, BrowserRouter as Router, useNavigate, Link } from 'react-router-dom';

import { collection, addDoc, doc, query, where, getDocs} from "firebase/firestore";
import { db } from './firebase';
import { auth } from "./firebase";
import { createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home/>} />
        <Route path="/login" element={<LoginComponent/>} />
        <Route path="/signup" element={<SignUpComponent/>} />
      </Routes>
    </Router>
  );
}

function Home() {
  const [books, setBooks] = useState([]);
  const[search, setSearch] = useState("");
  const[wishlist, setWishlist] = useState([]);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
      } else {
        setUser(null);
        navigate("/login");
      }
    });
  }, [])

  useEffect(() => {
    async function getWishlistFromDb() {
      if (!user) {
        return;
      }
      try {
        const q = query(collection(db, "wishlist"), where("userId", "==", user.uid));
        const querySnapshot = await getDocs(q); 
        const fetchWishlist = querySnapshot.docs.map((wishlist) => ({
          ...wishlist.data(), id: wishlist.id }));
        setWishlist(fetchWishlist);
      } catch (e) {
        console.error("Error with wishlist" + e);
      }
    }
    getWishlistFromDb();
  }, [user]);

  // select value/ option
  // rating, genre, author?
  const fetchData = async (search) => {
    try {
      setBooks([]);
      const genreToSearch = search ? `${search}` : "";
      const response = await fetch(`https://openlibrary.org/search.json?q=${genreToSearch}`);
      const jsonData = await response.json();
  
      const allGivenBook = jsonData.docs.map((book, index) => ({
        id: index,
        Image: book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg` : 'default.jpg',
        title: book.title,
        author: book.author_name?.[0]
      }));

      const randomBooksArray = [];
      const randomSet = new Set();
      while (randomSet.size < 20) {
        const random_index = Math.floor(Math.random() * allGivenBook.length);
        if (!(randomSet.has(random_index))) {
          randomSet.add(random_index);
          randomBooksArray.push(allGivenBook[random_index]);
        }
      }
      
      setBooks(randomBooksArray);
 
    } catch (error) {
      console.error(error);
    }
  };

  async function searchForBooks() {
    if (search !== "genre") {
      fetchData(search);
    } else {
      console.log("please select genre")
    }
  }

  async function addToWishlist(book) {

    if (user) {
      try{
        const wishlistItem = await addDoc(collection(db, "wishlist"), {
          title:book.title, 
          author: book.author, 
          Image: book.Image,
          userId: user.uid
        });
        setWishlist((oldBook) => [...oldBook, book]);
      } catch (e) {
        console.error(e);
      }
    }
  };

  function signUserOut() {
    signOut(auth).then(() => {
      // Sign-out successful.
    }).catch((error) => {
      console.error("Error");
    });
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>Genre</h1>
        <select value={search} onChange={(e) => setSearch(e.target.value)}>
          <option value="genre">Select a Genre</option>
          <option value="Romance">Romance</option>
          <option value="Mystery">Mystery</option>
          <option value="Humor">Humor</option>
          <option value="Fantasy">Fantasy</option>
          <option value="Fiction">Fiction</option>
        </select>
        <button onClick={searchForBooks}>search</button>
        <button onClick={signUserOut} id="sign-out-button">Sign Out</button>
      </header>
      <main>
        <h2>Recommended Books</h2>
        <div className=" container searched-books">
          {
            books.map((book) => (
            <BookComponent 
              key={book.id} 
              bookId={book.id}
                Image={book.Image}
                  title={book.title}
                    author={book.author}
                    addToList={() => addToWishlist(book)}/>
          ))}
        </div>
        <h3>Wishlist</h3>
          <WishlistComponent books={wishlist}/>
      </main>
    </div>
  );

}

function BookComponent({Image, title, author, addToList, bookId}) {
  return (
    <div className="books" id={bookId}>
      <img src={Image} alt="Book Cover" id="image"/>
      <p> {title} </p>
      <p>{author}</p>
      <button onClick={addToList}>Add to Wishlist</button>
    </div>
  );
}

function WishlistComponent({books}) {
  return (
    <div className="added-books">
      {books.map((book, index) => (
        <div key={index}>
          <img src={book.Image} alt="Book Cover" />
          <p>{book.title}</p>
          <p>{book.author}</p>
          </div>
        ))}
    </div>
  );
}

function SignUpComponent() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function signUpUser(e) {
    e.preventDefault();
    createUserWithEmailAndPassword(auth, email, password)
      .then((user) => {
        // Signed up 
        navigate("/login");
      })
      .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        console.error(errorCode, errorMessage);
      });
    }

  return (
    <form id="signUp">
      <h1>Sign Up</h1>
      <label htmlFor="email">Email: </label>
      <input value={email}
        type="email" id="email" name="email"
        onChange={(e) => setEmail(e.target.value)}
      />
      <label htmlFor="password">Password: </label>
      <input value={password}
        type="password" id="password" name="password"
        onChange={(e) => setPassword(e.target.value)}
      />
      <button type="submit" onClick={signUpUser}>
        Sign up
      </button>
    </form>
  );
}

function LoginComponent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const navigate = useNavigate();

  function loginUser(e) {
    e.preventDefault();
    signInWithEmailAndPassword(auth, email, password)
    .then((user) => {
        // Signed in
        navigate("/")
    })
    .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        console.log(errorCode, errorMessage)
    });
  }

  return (
    <form id="logIn">
      <h1>Log In</h1>
      <label htmlFor="email">Email: </label>
      <input value={email}
        type="email" id="email" name="email"
        onChange={(e) => setEmail(e.target.value)}
      />
      <label htmlFor="password">Password: </label>
      <input value={password}
        type="password" id="password" name="password"
        onChange={(e) => setPassword(e.target.value)}
      />
      <button type="submit" onClick={loginUser}>
        Log in
      </button>
      <h2>New user? Sign up <Link to="/signUp">{"here"}</Link>
      </h2>
    </form>
  );
}

export default App;
