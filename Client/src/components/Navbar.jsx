import React, { useState, useEffect, useContext } from "react";
import { Link } from "react-router-dom";
import useUser from "../hooks/useUser";
import { MdOutlineDeliveryDining } from "react-icons/md";
import DropDown from "./DropDown";
import NavHeaders from "./NavHeaders";
import axios from "axios";
import UserContext from "../contexts/UserContext";

import { GiBookmarklet } from "react-icons/gi";

const NavBar = () => {
  const { navBarDisplayName } =
    useContext(UserContext);
  const { user } = useUser();
  const registeredUserNavLinks = [
    { name: "Contact Us", path: "/contactus" },
    { name: "My profile", path: "/profile" },


  ];
  const unRegisteredUserNavLinks = [
    { name: "Info", path: "/contactus" },
    { name: "Login", path: "/login" },
    { name: "Signup", path: "/signup" },
  ];
  const registeredDropDownLinks = [
    { name: "My Profile", path: "/profile" },
    { name: "Basic Info", path: "/contactus" },
  ];
  const unRegisteredDropDownLinks = [];
  const [userDetails, setUserDetails] = useState({
    displayName: "",
  });
  const [navBgColor, setNavBgColor] = useState("bg-gray-700");

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        const response = await axios.get(`/api/users/${user.uid}`);
        console.log(response);
        setUserDetails(response.data);
      } catch (error) {
        console.error("Error fetching user data", error);
      }
    };
    fetchData();
  }, [user]);

  let userDisplay = navBarDisplayName
    ? navBarDisplayName
    : userDetails
    ? userDetails.displayName
    : user
    ? user.displayName || user.email
    : "";


  return (
    <nav className={`fixed top-0 w-full ${navBgColor} transition-colors`}>
      <div className="flex justify-between items-center sm:px-4 py-3 md:px-10 md:py-5">
        <div className="flex items-center">
          <Link
            to="/"
            className="text-white hover:animate-pulse hover:bg-gray-700 sm:px-3 rounded-md text-sm font-medium"
          >
            <GiBookmarklet size={48} className="text-white" />
          </Link>

          { (
            <div className="flex flex-col ml-4">
              <div className="flex flex-row items-center">
                <h1 className="text-gray-200 text-sm md:text-2xl font-medium">
                  <Link to="/">Moshav Kanaf</Link>
                </h1>
              </div>

            </div>
          )}
        </div>

        <div className="flex items-center">
          {user ? (
            <NavHeaders navBarLinks={registeredUserNavLinks} />
          ) : (
            <NavHeaders navBarLinks={unRegisteredUserNavLinks} />
          )}

          {user ? (
            <DropDown
              dropDownLinks={registeredDropDownLinks}
              navBarLinks={registeredUserNavLinks}
              user={user}
              userDetails={userDetails}
              userDisplayName={navBarDisplayName}
            />
          ) : (
            <DropDown
              dropDownLinks={unRegisteredDropDownLinks}
              navBarLinks={unRegisteredUserNavLinks}
              user={user}
            />
          )}
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
