
import { useState, useEffect } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { MapPin, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { amadeusApi } from "@/services/amadeusApi";

interface Location {
  iataCode: string;
  name: string;
  address: {
    cityName: string;
    countryName: string;
  };
  subType: string;
}

interface CityAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

const CityAutocomplete = ({ value, onChange, placeholder }: CityAutocompleteProps) => {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);

  // Fallback cities for when API is not available
  const fallbackCities = [
    { iataCode: "NKC", name: "Nouakchott", address: { cityName: "Nouakchott", countryName: "Mauritania" } },
    { iataCode: "CDG", name: "Paris Charles de Gaulle", address: { cityName: "Paris", countryName: "France" } },
    { iataCode: "IST", name: "Istanbul Airport", address: { cityName: "Istanbul", countryName: "Turkey" } },
    { iataCode: "DXB", name: "Dubai International", address: { cityName: "Dubai", countryName: "UAE" } },
    { iataCode: "CMN", name: "Casablanca Mohammed V", address: { cityName: "Casablanca", countryName: "Morocco" } },
    { iataCode: "LHR", name: "London Heathrow", address: { cityName: "London", countryName: "United Kingdom" } },
    { iataCode: "JFK", name: "John F. Kennedy International", address: { cityName: "New York", countryName: "United States" } },
    { iataCode: "DOH", name: "Hamad International", address: { cityName: "Doha", countryName: "Qatar" } },
    { iataCode: "CAI", name: "Cairo International", address: { cityName: "Cairo", countryName: "Egypt" } },
    { iataCode: "DKR", name: "Blaise Diagne International", address: { cityName: "Dakar", countryName: "Senegal" } }
  ];

  useEffect(() => {
    const searchLocations = async () => {
      if (searchValue.length < 2) {
        setLocations(fallbackCities);
        return;
      }

      setLoading(true);
      try {
        const results = await amadeusApi.searchAirports(searchValue);
        setLocations(results.length > 0 ? results : fallbackCities);
      } catch (error) {
        console.error('Airport search error:', error);
        // Filter fallback cities based on search
        const filtered = fallbackCities.filter(city =>
          city.name.toLowerCase().includes(searchValue.toLowerCase()) ||
          city.iataCode.toLowerCase().includes(searchValue.toLowerCase()) ||
          city.address.cityName.toLowerCase().includes(searchValue.toLowerCase()) ||
          city.address.countryName.toLowerCase().includes(searchValue.toLowerCase())
        );
        setLocations(filtered);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchLocations, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchValue]);

  const selectedLocation = locations.find(location => location.iataCode === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-12 border-gray-200 hover:border-blue-500"
        >
          <div className="flex items-center">
            <MapPin className="mr-2 h-5 w-5 text-blue-600" />
            {selectedLocation ? (
              <span>{selectedLocation.address.cityName}, {selectedLocation.address.countryName}</span>
            ) : (
              <span className="text-gray-500">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput 
            placeholder="Search cities and airports..." 
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            <CommandEmpty>
              {loading ? "Searching..." : "No location found."}
            </CommandEmpty>
            <CommandGroup>
              {locations.map((location) => (
                <CommandItem
                  key={location.iataCode}
                  value={location.iataCode}
                  onSelect={() => {
                    onChange(location.iataCode);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === location.iataCode ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div>
                    <p className="font-medium">{location.address.cityName}</p>
                    <p className="text-sm text-gray-500">
                      {location.name} - {location.address.countryName} ({location.iataCode})
                    </p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default CityAutocomplete;
