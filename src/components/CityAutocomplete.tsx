
import { useState, useEffect } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { MapPin, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

// Mock city data - In real app, this would come from an API
const cities = [
  { code: "NKC", name: "Nouakchott", country: "Mauritania" },
  { code: "CDG", name: "Paris", country: "France" },
  { code: "IST", name: "Istanbul", country: "Turkey" },
  { code: "DXB", name: "Dubai", country: "UAE" },
  { code: "CMN", name: "Casablanca", country: "Morocco" },
  { code: "LHR", name: "London", country: "United Kingdom" },
  { code: "JFK", name: "New York", country: "United States" },
  { code: "DOH", name: "Doha", country: "Qatar" },
  { code: "CAI", name: "Cairo", country: "Egypt" },
  { code: "DKR", name: "Dakar", country: "Senegal" }
];

interface CityAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

const CityAutocomplete = ({ value, onChange, placeholder }: CityAutocompleteProps) => {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const filteredCities = cities.filter(city =>
    city.name.toLowerCase().includes(searchValue.toLowerCase()) ||
    city.code.toLowerCase().includes(searchValue.toLowerCase()) ||
    city.country.toLowerCase().includes(searchValue.toLowerCase())
  );

  const selectedCity = cities.find(city => city.code === value);

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
            {selectedCity ? (
              <span>{selectedCity.name}, {selectedCity.country}</span>
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
            placeholder="Search cities..." 
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            <CommandEmpty>No city found.</CommandEmpty>
            <CommandGroup>
              {filteredCities.map((city) => (
                <CommandItem
                  key={city.code}
                  value={city.code}
                  onSelect={() => {
                    onChange(city.code);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === city.code ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div>
                    <p className="font-medium">{city.name}</p>
                    <p className="text-sm text-gray-500">{city.country} ({city.code})</p>
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
