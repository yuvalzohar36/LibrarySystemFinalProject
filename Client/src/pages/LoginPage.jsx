import React from "react";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../components/Auth";
import useUser from "../hooks/useUser";
import GoogleLogin from "../components/GoogleLogin";
import { FaSpinner } from "react-icons/fa";
import { MoreInfoPage } from "../components/MoreInfoPage";

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [showAddMoreInfo, setShowAddMoreInfo] = useState(false);

  const logIn = async () => {
    setIsLoading(true);
    let logStatus = await login(email, password);
    if (logStatus) {
    } else {
      setError("Invalid email or password");
      console.log("error in login");
    }
    setIsLoading(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(""); // clear error message state

    // Check if form data is valid
    if (!email || !password) {
      setError("Please enter valid email and password");
      return;
    }

    try {
      await logIn(); // wait for login to complete
    } catch (error) {
      console.log(error);
      setError(error.message.replace("Firebase:", "").trim()); // set error message state
    }
  };

  useEffect(() => {
    if (user && !showAddMoreInfo) {
      navigate("/"); // navigate to home page on successful login
    }
  }, [user]);

  return (
    <>
      {showAddMoreInfo ? (
        <MoreInfoPage userProp={user} />
      ) : (
        <div className="mt-8 ">
          <div className="flex items-center justify-center ">
            <form
              className="bg-bg-navbar-custom shadow-2xl rounded md:px-8 px-2 pt-6 pb-8  w-full sm:w-1/2  lg:w-1/3  "
              onSubmit={handleSubmit}
            >
              <div className="text-center flex justify-center mb-3">
                <h1 className="text-3xl text-gray-50 font-bold mb-5"> 
                  Sign in
                </h1>
              </div>

              <div className="border-2 bg-gray-700 rounded-lg p-4 mb-4">
                <div className="mb-4">
                  <label className="block text-gray-50 text-sm  mb-2">
                    Email Address
                  </label>
                  <input
                    className="bg-bg-navbar-custom shadow appearance-none border rounded w-full py-2 px-3
                         text-gray-50 leading-tight focus:outline-none focus:shadow-outline
                           focus:border-blue-500"
                    type="text"
                    placeholder="Insert Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="mb-3">
                  <label className="block text-gray-50 text-sm mb-2">
                    Password
                  </label>
                  <input
                    className="bg-bg-navbar-custom shadow appearance-none border rounded w-full py-2 px-3
                 text-gray-50 mb-3 leading-tight focus:outline-none focus:shadow-outline
                  focus:border-blue-500 "
                    type="password"
                    placeholder="********"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                {isLoading ? (
                  <button
                    className="bg-green-500 hover:bg-green-400 text-white font-bold py-2 px-4 w-full rounded "
                    type="button"
                    onClick={handleSubmit}
                    disabled={true}
                  >
                    <FaSpinner className="animate-spin inline-block h-7 w-7 text-white mr-2" />
                    Loading...
                  </button>
                ) : (
                  <button
                    className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 w-full rounded focus:outline-none focus:shadow-outline"
                    type="button"
                    onClick={handleSubmit}
                  >
                    Sign In
                  </button>
                )}
              </div>
              {error && (
                <p className="bg-red-100 border border-red-400 text-red-700 mb-4 px-4 py-3 rounded relative select-none hover:bg-red-200 text-center">
                  {error}
                </p>
              )}
              <div className="flex flex-col items-center justify-center">
                <h2 className="text-center mb-2 text-gray-50">
                  Or... Login with
                </h2>
                <div className="flex space-x-8">
                  <GoogleLogin setShowAddMoreInfo={setShowAddMoreInfo} />
                </div>
              </div>
              <div className="flex flex-col items-center justify-center md:flex-row md:justify-center md:items-center space-y-4 md:space-x-4 md:space-y-0 mt-4 border-2 border-gray-600 rounded-md py-4">
                <h2 className="text-gray-50 ">New reader ?</h2>
                <Link
                  className="text-blue-500  rounded focus:outline-none focus:shadow-outline"
                  to="/signup"
                >
                  Create an account.
                </Link>
              </div>

              <div className=" mt-2"></div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default LoginPage;