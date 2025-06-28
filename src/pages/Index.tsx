
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, MapPin, Users, Plane } from "lucide-react";
import { format } from "date-fns";
import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import FeaturedDestinations from "@/components/FeaturedDestinations";
import Footer from "@/components/Footer";

const Index = () => {
  const navigate = useNavigate();
  const [searchData, setSearchData] = useState({
    from: "",
    to: "",
    departDate: undefined as Date | undefined,
    returnDate: undefined as Date | undefined,
    passengers: 1,
    tripType: "round-trip"
  });

  const handleSearch = () => {
    console.log("Search data:", searchData);
    navigate("/search", { state: searchData });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white">
      <Navigation />
      <Hero />
      
      {/* Search Section */}
      <section className="py-12 px-4 -mt-20 relative z-10">
        <div className="max-w-6xl mx-auto">
          <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
            <CardContent className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 items-end">
                <div className="space-y-2">
                  <Label htmlFor="from" className="text-gray-700 font-medium">From</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-5 w-5 text-blue-600" />
                    <Input
                      id="from"
                      placeholder="Departure city"
                      value={searchData.from}
                      onChange={(e) => setSearchData({...searchData, from: e.target.value})}
                      className="pl-10 h-12 border-gray-200 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="to" className="text-gray-700 font-medium">To</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-5 w-5 text-blue-600" />
                    <Input
                      id="to"
                      placeholder="Destination city"
                      value={searchData.to}
                      onChange={(e) => setSearchData({...searchData, to: e.target.value})}
                      className="pl-10 h-12 border-gray-200 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium">Departure</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full h-12 justify-start text-left font-normal border-gray-200 hover:border-blue-500"
                      >
                        <CalendarIcon className="mr-2 h-5 w-5 text-blue-600" />
                        {searchData.departDate ? format(searchData.departDate, "PPP") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={searchData.departDate}
                        onSelect={(date) => setSearchData({...searchData, departDate: date})}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium">Passengers</Label>
                  <div className="relative">
                    <Users className="absolute left-3 top-3 h-5 w-5 text-blue-600" />
                    <Input
                      type="number"
                      min="1"
                      max="9"
                      value={searchData.passengers}
                      onChange={(e) => setSearchData({...searchData, passengers: parseInt(e.target.value) || 1})}
                      className="pl-10 h-12 border-gray-200 focus:border-blue-500"
                    />
                  </div>
                </div>

                <Button 
                  onClick={handleSearch}
                  className="h-12 bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 text-white font-semibold px-8"
                >
                  <Plane className="mr-2 h-5 w-5" />
                  Search Flights
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <FeaturedDestinations />
      <Footer />
    </div>
  );
};

export default Index;
