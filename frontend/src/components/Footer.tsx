import React from "react";

const COMPANY = {
  blurb:
    "Lorem Ipsum has been the industry's standard dummy text ever since the 1500s. It survived not only five centuries, but also the leap into electronic typesetting.",
  phone: "+1-234-567-890",
  email: "contact@example.com",
  name: "omarAli",
};

const Footer: React.FC = () => {
  return (
    <footer className="px-6 md:px-16 lg:px-36 mt-40 w-full text-gray-300">
      <div className="flex flex-col md:flex-row justify-between w-full gap-10 border-b border-gray-500 pb-14">
        <div className="md:max-w-96">
          <img
            alt="Company logo"
            className="h-11"
            src="../../assets/images/hLogo.svg"
          />
          <p className="mt-6 text-sm">{COMPANY.blurb}</p>
          <div className="flex items-center gap-2 mt-4">
            <img
              src="../../assets/images/googlePlay.svg"
              alt="Get it on Google Play"
              className="h-9 w-auto"
            />
            <img
              src="../../assets/images/appStore.svg"
              alt="Download on the App Store"
              className="h-9 w-auto"
            />
          </div>
        </div>

        <div className="flex-1 flex items-start md:justify-end gap-20 md:gap-40">
          <div>
            <h2 className="font-semibold mb-5">Company</h2>
            <ul className="text-sm space-y-2">
              <li>
                <a href="#">Home</a>
              </li>
              <li>
                <a href="#">About us</a>
              </li>
              <li>
                <a href="#">Contact us</a>
              </li>
              <li>
                <a href="#">Privacy policy</a>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="font-semibold mb-5">Get in touch</h2>
            <div className="text-sm space-y-2">
              <p>{COMPANY.phone}</p>
              <p>{COMPANY.email}</p>
            </div>
          </div>
        </div>
      </div>

      <p className="pt-4 text-center text-sm pb-5">
        Copyright {new Date().getFullYear()} © <a href="#">{COMPANY.name}</a>.
        All Right Reserved.
      </p>
    </footer>
  );
};

export default Footer;
