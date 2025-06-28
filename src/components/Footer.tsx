
import { Link } from "react-router-dom";
import { Plane, Phone, Mail, MapPin } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <Link to="/" className="flex items-center space-x-2 mb-6">
              <div className="bg-gradient-to-r from-blue-600 to-sky-600 p-2 rounded-lg">
                <Plane className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold">Rihla Travel</span>
            </Link>
            <p className="text-gray-400 mb-6 max-w-md">
              Your trusted travel partner in Mauritania. We provide premium flight booking services 
              with competitive prices and exceptional customer support.
            </p>
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-gray-400">
                <MapPin className="h-5 w-5 mr-2" />
                <span>Nouakchott, Mauritania</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-6">Quick Links</h3>
            <ul className="space-y-3">
              <li><Link to="/" className="text-gray-400 hover:text-white transition-colors">Home</Link></li>
              <li><Link to="/search" className="text-gray-400 hover:text-white transition-colors">Search Flights</Link></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">About Us</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Terms & Conditions</a></li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-6">Contact Info</h3>
            <ul className="space-y-3">
              <li className="flex items-center text-gray-400">
                <Phone className="h-5 w-5 mr-2" />
                <span>+222 XX XX XX XX</span>
              </li>
              <li className="flex items-center text-gray-400">
                <Mail className="h-5 w-5 mr-2" />
                <span>info@rihlatravel.mr</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-12 pt-8 text-center">
          <p className="text-gray-400">
            © 2024 Rihla Travel. All rights reserved. | Prices displayed in Mauritanian Ouguiya (MRU)
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
