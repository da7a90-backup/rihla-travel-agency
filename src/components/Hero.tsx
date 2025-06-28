
import { Plane, Star, Users, Shield } from "lucide-react";

const Hero = () => {
  return (
    <section className="relative bg-gradient-to-br from-blue-600 via-sky-600 to-blue-800 text-white py-24 overflow-hidden">
      <div className="absolute inset-0 opacity-20">
        <div className="w-full h-full" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat'
        }}></div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            Your Journey
            <span className="block bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
              Starts Here
            </span>
          </h1>
          <p className="text-xl md:text-2xl mb-12 text-blue-100 max-w-3xl mx-auto leading-relaxed">
            Discover amazing destinations with Presta Travel. Book your flights with confidence and explore the world with our premium travel services.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto mt-16">
            <div className="flex flex-col items-center p-6 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
              <Star className="h-8 w-8 text-yellow-300 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Best Prices</h3>
              <p className="text-blue-100 text-center">Competitive rates in Mauritanian Ouguiya</p>
            </div>
            
            <div className="flex flex-col items-center p-6 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
              <Users className="h-8 w-8 text-green-300 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Expert Support</h3>
              <p className="text-blue-100 text-center">24/7 customer service via WhatsApp</p>
            </div>
            
            <div className="flex flex-col items-center p-6 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
              <Shield className="h-8 w-8 text-purple-300 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Secure Booking</h3>
              <p className="text-blue-100 text-center">Safe and reliable ticket processing</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
