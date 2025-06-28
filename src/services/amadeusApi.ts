// Complete src/services/amadeusApi.ts
const AMADEUS_API_KEY = 'YMY34YgcMiHrh15VehjCQhqeDXYPj3TU';
const AMADEUS_API_SECRET = 'SUF1nvg0YuAArIcf';
const AMADEUS_BASE_URL = 'https://test.api.amadeus.com';

// Fixed EUR to MRU conversion rate
const EUR_TO_MRU_RATE = 450;

interface AmadeusTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface AmadeusFlightOffer {
  id: string;
  source: string;
  instantTicketingRequired: boolean;
  nonHomogeneous: boolean;
  oneWay: boolean;
  lastTicketingDate: string;
  numberOfBookableSeats: number;
  itineraries: Array<{
    duration: string;
    segments: Array<{
      departure: {
        iataCode: string;
        terminal?: string;
        at: string;
      };
      arrival: {
        iataCode: string;
        terminal?: string;
        at: string;
      };
      carrierCode: string;
      number: string;
      aircraft: {
        code: string;
      };
      operating?: {
        carrierCode: string;
      };
      duration: string;
      id: string;
      numberOfStops: number;
      blacklistedInEU: boolean;
    }>;
  }>;
  price: {
    currency: string;
    total: string;
    base: string;
    fees: Array<{
      amount: string;
      type: string;
    }>;
    grandTotal: string;
    totalMRU?: number;
    baseMRU?: number;
    conversionRate?: number;
  };
  pricingOptions: {
    fareType: string[];
    includedCheckedBagsOnly: boolean;
  };
  validatingAirlineCodes: string[];
  travelerPricings: Array<{
    travelerId: string;
    fareOption: string;
    travelerType: string;
    price: {
      currency: string;
      total: string;
      base: string;
    };
    fareDetailsBySegment: Array<{
      segmentId: string;
      cabin: string;
      fareBasis: string;
      brandedFare?: string;
      class: string;
      includedCheckedBags: {
        quantity: number;
      };
    }>;
  }>;
  bookingData?: any;
}

interface FlightSearchParams {
  originLocationCode: string;
  destinationLocationCode: string;
  departureDate: string;
  returnDate?: string;
  adults: number;
  children?: number;
  infants?: number;
  travelClass?: string;
  nonStop?: boolean;
  currencyCode?: string;
  max?: number;
}

interface AirlineInfo {
  iataCode: string;
  icaoCode: string;
  businessName: string;
  commonName: string;
}

interface LocationInfo {
  iataCode: string;
  name: string;
  address: {
    cityName: string;
    countryName: string;
  };
  geoCode: {
    latitude: number;
    longitude: number;
  };
}

interface CacheEntry {
  data: any;
  timestamp: number;
  expiresAt: number;
}

class AmadeusApiService {
  private accessToken: string | null = null;
  private tokenExpirationTime: number = 0;
  private cache: Map<string, CacheEntry> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Reference data caches
  private airlinesCache: Map<string, string> = new Map();
  private locationsCache: Map<string, string> = new Map();
  private referenceDataLoaded: boolean = false;

  private getCacheKey(params: any): string {
    return JSON.stringify(params);
  }

  private getFromCache(key: string): any | null {
    const entry = this.cache.get(key);
    if (entry && Date.now() < entry.expiresAt) {
      return entry.data;
    }
    if (entry) {
      this.cache.delete(key);
    }
    return null;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.CACHE_DURATION
    });
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpirationTime) {
      return this.accessToken;
    }

    try {
      const response = await fetch(`${AMADEUS_BASE_URL}/v1/security/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: AMADEUS_API_KEY,
          client_secret: AMADEUS_API_SECRET,
        }),
      });

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
      }

      const data: AmadeusTokenResponse = await response.json();
      this.accessToken = data.access_token;
      this.tokenExpirationTime = Date.now() + (data.expires_in * 1000) - 60000;

      return this.accessToken;
    } catch (error) {
      console.error('Amadeus authentication error:', error);
      throw new Error('Failed to authenticate with Amadeus API');
    }
  }

  async loadReferenceData(): Promise<void> {
    if (this.referenceDataLoaded) return;

    try {
      const token = await this.getAccessToken();
      
      // Load airlines data
      try {
        const airlinesResponse = await fetch(`${AMADEUS_BASE_URL}/v1/reference-data/airlines`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (airlinesResponse.ok) {
          const airlinesData = await airlinesResponse.json();
          airlinesData.data?.forEach((airline: AirlineInfo) => {
            this.airlinesCache.set(airline.iataCode, airline.commonName || airline.businessName);
          });
          console.log(`Loaded ${this.airlinesCache.size} airlines from Amadeus`);
        }
      } catch (error) {
        console.warn('Failed to load airlines data:', error);
      }

      // Load major airports data
      try {
        const locationsResponse = await fetch(`${AMADEUS_BASE_URL}/v1/reference-data/locations?subType=AIRPORT,CITY&page[limit]=500`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (locationsResponse.ok) {
          const locationsData = await locationsResponse.json();
          locationsData.data?.forEach((location: LocationInfo) => {
            this.locationsCache.set(location.iataCode, location.address.cityName);
          });
          console.log(`Loaded ${this.locationsCache.size} airports from Amadeus`);
        }
      } catch (error) {
        console.warn('Failed to load locations data:', error);
      }

      this.referenceDataLoaded = true;
    } catch (error) {
      console.error('Failed to load reference data:', error);
      // Continue with fallback data
    }
  }

  getAirlineName(carrierCode: string): string {
    // Try cache first
    const cached = this.airlinesCache.get(carrierCode);
    if (cached) return cached;

    // Fallback to comprehensive static data
    const airlines: { [key: string]: string } = {
      // Major International Airlines
      'AF': 'Air France', 'TK': 'Turkish Airlines', 'EK': 'Emirates',
      'LH': 'Lufthansa', 'BA': 'British Airways', 'KL': 'KLM',
      'QR': 'Qatar Airways', 'EY': 'Etihad Airways', 'SV': 'Saudi Arabian Airlines',
      
      // North American Airlines
      'DL': 'Delta Air Lines', 'AA': 'American Airlines', 'UA': 'United Airlines',
      'WN': 'Southwest Airlines', 'B6': 'JetBlue Airways', 'AS': 'Alaska Airlines',
      'NK': 'Spirit Airlines', 'F9': 'Frontier Airlines', 'G4': 'Allegiant Air',
      'SY': 'Sun Country Airlines', 'AC': 'Air Canada', 'WS': 'WestJet',
      
      // European Airlines
      'VS': 'Virgin Atlantic', 'IB': 'Iberia', 'LX': 'Swiss International',
      'OS': 'Austrian Airlines', 'SN': 'Brussels Airlines', 'AZ': 'ITA Airways',
      'TP': 'TAP Air Portugal', 'SK': 'SAS', 'AY': 'Finnair', 'DY': 'Norwegian',
      'FR': 'Ryanair', 'U2': 'easyJet', 'VY': 'Vueling', 'W6': 'Wizz Air',
      'HV': 'Transavia', 'BE': 'FlyBe', 'EW': 'Eurowings', 'BT': 'Air Baltic',
      
      // Asian Airlines
      'CX': 'Cathay Pacific', 'SQ': 'Singapore Airlines', 'TG': 'Thai Airways',
      'NH': 'ANA', 'JL': 'Japan Airlines', 'KE': 'Korean Air', 'OZ': 'Asiana Airlines',
      'CI': 'China Airlines', 'BR': 'EVA Air', 'PR': 'Philippine Airlines',
      'GA': 'Garuda Indonesia', 'MH': 'Malaysia Airlines', 'TZ': 'AirAsia X',
      'D7': 'AirAsia X', 'FD': 'Thai AirAsia', 'Z2': 'Philippines AirAsia',
      '3K': 'Jetstar Asia', 'TR': 'Scoot', 'MI': 'SilkAir', 'PG': 'Bangkok Airways',
      
      // Oceanian Airlines
      'QF': 'Qantas', 'JQ': 'Jetstar Airways', 'VA': 'Virgin Australia',
      'NZ': 'Air New Zealand', 'FJ': 'Fiji Airways',
      
      // African Airlines
      'SA': 'South African Airways', 'ET': 'Ethiopian Airlines', 'KQ': 'Kenya Airways',
      'RW': 'RwandAir', 'MS': 'EgyptAir', 'AT': 'Royal Air Maroc', 'TU': 'Tunisair',
      'AH': 'Air Algérie', 'HC': 'Mauritania Airlines', 'VN': 'TACV',
      
      // Middle Eastern Airlines
      'GF': 'Gulf Air', 'WY': 'Oman Air', 'ME': 'Middle East Airlines',
      'RJ': 'Royal Jordanian', 'IR': 'Iran Air', 'IY': 'Yemenia',
      
      // Turkish Airlines
      'PC': 'Pegasus Airlines', 'XQ': 'SunExpress',
      
      // Low Cost Carriers
      'VF': 'FlyDubai', 'G9': 'Air Arabia', 'NP': 'Nile Air', 'SM': 'Air Cairo',
      'XY': 'Flynas', 'J9': 'Jazeera Airways', 'KU': 'Kuwait Airways',
      
      // Regional Airlines
      'FB': 'Bulgaria Air', 'JU': 'Air Serbia', 'OU': 'Croatia Airlines',
      'JP': 'Adria Airways', 'YM': 'Montenegro Airlines', 'V7': 'Volotea',
      
      // Charter and Others
      'X3': 'TUIfly', 'BY': 'TUIfly Nordic', 'OR': 'TUI Airways',
      'MT': 'Thomas Cook Airlines', 'DE': 'Condor', 'LG': 'Luxair'
    };
    
    return airlines[carrierCode] || carrierCode;
  }

  getCityName(code: string): string {
    // Try cache first
    const cached = this.locationsCache.get(code);
    if (cached) return cached;

    // Fallback to comprehensive static data
    const cities: { [key: string]: string } = {
      // Africa
      'NKC': 'Nouakchott', 'DKR': 'Dakar', 'CMN': 'Casablanca', 'RAK': 'Marrakech',
      'TUN': 'Tunis', 'ALG': 'Algiers', 'CAI': 'Cairo', 'LXR': 'Luxor',
      'HRG': 'Hurghada', 'SSH': 'Sharm El Sheikh', 'ADD': 'Addis Ababa',
      'NBO': 'Nairobi', 'KGL': 'Kigali', 'DAR': 'Dar es Salaam', 'EBB': 'Entebbe',
      'CPT': 'Cape Town', 'JNB': 'Johannesburg', 'DUR': 'Durban', 'PLZ': 'Port Elizabeth',
      'LOS': 'Lagos', 'ABV': 'Abuja', 'KAN': 'Kano', 'ACC': 'Accra', 'ABJ': 'Abidjan',
      'COO': 'Cotonou', 'LFW': 'Lome', 'OUA': 'Ouagadougou', 'ROB': 'Monrovia',
      'FNA': 'Freetown', 'BJL': 'Banjul', 'BKO': 'Bamako', 'NIA': 'Niamey',
      'NDJ': 'N\'Djamena', 'BGF': 'Bangui', 'LBV': 'Libreville', 'DLA': 'Douala',
      'YAO': 'Yaounde', 'SSG': 'Malabo', 'SAO': 'Sao Tome', 'LUA': 'Luanda',
      'LAD': 'Luanda', 'WDH': 'Windhoek', 'GBE': 'Gaborone', 'MUB': 'Maun',
      'HRE': 'Harare', 'BUQ': 'Bulawayo', 'LUN': 'Lusaka', 'LLW': 'Lilongwe',
      'BLZ': 'Blantyre', 'MPM': 'Maputo', 'TNR': 'Antananarivo', 'MRU': 'Mauritius',
      'RUN': 'Saint-Denis', 'SEZ': 'Seychelles',
      
      // Europe
      'CDG': 'Paris', 'ORY': 'Paris', 'LHR': 'London', 'LGW': 'London',
      'STN': 'London', 'LTN': 'London', 'FRA': 'Frankfurt', 'MUC': 'Munich',
      'TXL': 'Berlin', 'SXF': 'Berlin', 'HAM': 'Hamburg', 'DUS': 'Düsseldorf',
      'CGN': 'Cologne', 'STR': 'Stuttgart', 'AMS': 'Amsterdam', 'RTM': 'Rotterdam',
      'BRU': 'Brussels', 'MAD': 'Madrid', 'BCN': 'Barcelona', 'VLC': 'Valencia',
      'SVQ': 'Seville', 'BIO': 'Bilbao', 'LIS': 'Lisbon', 'OPO': 'Porto',
      'FCO': 'Rome', 'MXP': 'Milan', 'LIN': 'Milan', 'NAP': 'Naples',
      'VCE': 'Venice', 'FLR': 'Florence', 'BOL': 'Bologna', 'PMO': 'Palermo',
      'CTA': 'Catania', 'CAG': 'Cagliari', 'ZUR': 'Zurich', 'GVA': 'Geneva',
      'BSL': 'Basel', 'VIE': 'Vienna', 'SZG': 'Salzburg', 'INN': 'Innsbruck',
      'CPH': 'Copenhagen', 'ARN': 'Stockholm', 'GOT': 'Gothenburg', 'OSL': 'Oslo',
      'BGO': 'Bergen', 'TRD': 'Trondheim', 'HEL': 'Helsinki', 'TMP': 'Tampere',
      'DUB': 'Dublin', 'ORK': 'Cork', 'SNN': 'Shannon', 'EDI': 'Edinburgh',
      'GLA': 'Glasgow', 'MAN': 'Manchester', 'BHX': 'Birmingham', 'LPL': 'Liverpool',
      'NCL': 'Newcastle', 'LBA': 'Leeds', 'BRS': 'Bristol', 'CWL': 'Cardiff',
      'ATH': 'Athens', 'THR': 'Santorini', 'HER': 'Heraklion', 'RHO': 'Rhodes',
      'CFU': 'Corfu', 'ZTH': 'Zakynthos', 'SKG': 'Thessaloniki',
      
      // North America
      'JFK': 'New York', 'LGA': 'New York', 'EWR': 'New York', 'LAX': 'Los Angeles',
      'SFO': 'San Francisco', 'SJC': 'San Jose', 'OAK': 'Oakland', 'ORD': 'Chicago',
      'MDW': 'Chicago', 'ATL': 'Atlanta', 'DFW': 'Dallas', 'DAL': 'Dallas',
      'IAH': 'Houston', 'HOU': 'Houston', 'PHX': 'Phoenix', 'DEN': 'Denver',
      'LAS': 'Las Vegas', 'SEA': 'Seattle', 'PDX': 'Portland', 'MSP': 'Minneapolis',
      'DTW': 'Detroit', 'BOS': 'Boston', 'BWI': 'Baltimore', 'DCA': 'Washington',
      'IAD': 'Washington', 'MIA': 'Miami', 'FLL': 'Fort Lauderdale', 'MCO': 'Orlando',
      'TPA': 'Tampa', 'PHL': 'Philadelphia', 'PIT': 'Pittsburgh', 'CLE': 'Cleveland',
      'YYZ': 'Toronto', 'YUL': 'Montreal', 'YVR': 'Vancouver', 'YYC': 'Calgary',
      'YEG': 'Edmonton', 'YWG': 'Winnipeg', 'YOW': 'Ottawa', 'YHZ': 'Halifax',
      
      // Asia
      'HKG': 'Hong Kong', 'SIN': 'Singapore', 'BKK': 'Bangkok', 'DMK': 'Bangkok',
      'NRT': 'Tokyo', 'HND': 'Tokyo', 'KIX': 'Osaka', 'ITM': 'Osaka',
      'NGO': 'Nagoya', 'CTS': 'Sapporo', 'FUK': 'Fukuoka', 'ICN': 'Seoul',
      'GMP': 'Seoul', 'PUS': 'Busan', 'PEK': 'Beijing', 'PVG': 'Shanghai',
      'SHA': 'Shanghai', 'CAN': 'Guangzhou', 'SZX': 'Shenzhen', 'CTU': 'Chengdu',
      'XIY': 'Xi\'an', 'KMG': 'Kunming', 'TPE': 'Taipei', 'KHH': 'Kaohsiung',
      'MNL': 'Manila', 'CEB': 'Cebu', 'DVO': 'Davao', 'CGK': 'Jakarta',
      'DPS': 'Bali', 'SUB': 'Surabaya', 'MDN': 'Medan', 'KUL': 'Kuala Lumpur',
      'PEN': 'Penang', 'JHB': 'Johor Bahru', 'DEL': 'Delhi', 'BOM': 'Mumbai',
      'BLR': 'Bangalore', 'MAA': 'Chennai', 'CCU': 'Kolkata', 'HYD': 'Hyderabad',
      'AMD': 'Ahmedabad', 'COK': 'Kochi', 'TRV': 'Trivandrum', 'GOI': 'Goa',
      'KTM': 'Kathmandu', 'CMB': 'Colombo', 'DAC': 'Dhaka', 'CXB': 'Cox\'s Bazar',
      'RGN': 'Yangon', 'MDL': 'Mandalay', 'PNH': 'Phnom Penh', 'REP': 'Siem Reap',
      'VTE': 'Vientiane', 'LPQ': 'Luang Prabang', 'HAN': 'Hanoi', 'SGN': 'Ho Chi Minh City',
      'DAD': 'Da Nang', 'BWN': 'Bandar Seri Begawan',
      
      // Middle East
      'DXB': 'Dubai', 'AUH': 'Abu Dhabi', 'SHJ': 'Sharjah', 'DOH': 'Doha',
      'KWI': 'Kuwait City', 'BAH': 'Manama', 'MCT': 'Muscat', 'SLL': 'Salalah',
      'RUH': 'Riyadh', 'JED': 'Jeddah', 'DMM': 'Dammam', 'MED': 'Medina',
      'BGW': 'Baghdad', 'BSR': 'Basra', 'EBL': 'Erbil', 'IKA': 'Tehran',
      'IFN': 'Isfahan', 'SYZ': 'Shiraz', 'MHD': 'Mashhad', 'BEY': 'Beirut',
      'AMM': 'Amman', 'AQJ': 'Aqaba', 'DAM': 'Damascus', 'ALP': 'Aleppo',
      'TLV': 'Tel Aviv', 'HFA': 'Haifa', 'ETH': 'Eilat', 'SAN': 'San\'a',
      'ADE': 'Aden',
      
      // Turkey
      'IST': 'Istanbul', 'SAW': 'Istanbul', 'ESB': 'Ankara', 'AYT': 'Antalya',
      'GZT': 'Gaziantep', 'ADB': 'Izmir', 'BJV': 'Bodrum', 'DLM': 'Dalaman',
      'TZX': 'Trabzon', 'VAN': 'Van', 'DIY': 'Diyarbakir', 'EZS': 'Elazig',
      'MLX': 'Malatya', 'ASR': 'Kayseri', 'KYA': 'Konya', 'USQ': 'Usak',
      
      // Oceania
      'SYD': 'Sydney', 'MEL': 'Melbourne', 'BNE': 'Brisbane', 'PER': 'Perth',
      'ADL': 'Adelaide', 'DRW': 'Darwin', 'CBR': 'Canberra', 'HBA': 'Hobart',
      'AKL': 'Auckland', 'WLG': 'Wellington', 'CHC': 'Christchurch', 'ZQN': 'Queenstown',
      'NAN': 'Nadi', 'SUV': 'Suva', 'NOU': 'Noumea', 'PPT': 'Papeete',
      'GUM': 'Guam', 'SPN': 'Saipan',
      
      // South America
      'GRU': 'São Paulo', 'GIG': 'Rio de Janeiro', 'BSB': 'Brasília',
      'SSA': 'Salvador', 'FOR': 'Fortaleza', 'REC': 'Recife', 'BEL': 'Belém',
      'MAO': 'Manaus', 'CWB': 'Curitiba', 'POA': 'Porto Alegre', 'FLN': 'Florianópolis',
      'EZE': 'Buenos Aires', 'AEP': 'Buenos Aires', 'COR': 'Córdoba',
      'MDZ': 'Mendoza', 'BRC': 'Bariloche', 'USH': 'Ushuaia', 'SCL': 'Santiago',
      'IPC': 'Easter Island', 'LIM': 'Lima', 'CUZ': 'Cusco', 'AQP': 'Arequipa',
      'BOG': 'Bogotá', 'MDE': 'Medellín', 'CTG': 'Cartagena', 'CLO': 'Cali',
      'UIO': 'Quito', 'GYE': 'Guayaquil', 'GPS': 'Galápagos', 'CCS': 'Caracas',
      'MAR': 'Maracaibo', 'GEO': 'Georgetown', 'PBM': 'Paramaribo', 'CAY': 'Cayenne',
      'ASU': 'Asunción', 'MVD': 'Montevideo', 'PDP': 'Punta del Este',
      'LPB': 'La Paz', 'VVI': 'Santa Cruz', 'CBB': 'Cochabamba'
    };
    
    return cities[code] || code;
  }

  async searchFlights(params: FlightSearchParams): Promise<AmadeusFlightOffer[]> {
    // Load reference data if not already loaded
    if (!this.referenceDataLoaded) {
      this.loadReferenceData().catch(console.warn);
    }

    // Check cache first
    const cacheKey = this.getCacheKey(params);
    const cachedResult = this.getFromCache(cacheKey);
    if (cachedResult) {
      console.log('Returning cached flight results');
      return cachedResult;
    }

    try {
      const token = await this.getAccessToken();
      
      const searchParams = new URLSearchParams({
        originLocationCode: params.originLocationCode,
        destinationLocationCode: params.destinationLocationCode,
        departureDate: params.departureDate,
        adults: params.adults.toString(),
        currencyCode: 'EUR',
        max: (params.max || 50).toString(),
      });

      if (params.returnDate) {
        searchParams.append('returnDate', params.returnDate);
      }
      if (params.children) {
        searchParams.append('children', params.children.toString());
      }
      if (params.infants) {
        searchParams.append('infants', params.infants.toString());
      }
      if (params.travelClass) {
        searchParams.append('travelClass', params.travelClass);
      }
      if (params.nonStop) {
        searchParams.append('nonStop', 'true');
      }

      const response = await fetch(`${AMADEUS_BASE_URL}/v2/shopping/flight-offers?${searchParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Flight search failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const flights = data.data || [];
      
      // Process flights to ensure all required fields are present
      const processedFlights = flights.map((flight: any) => this.processFlightOffer(flight));
      
      // Cache the results
      this.setCache(cacheKey, processedFlights);
      
      return processedFlights;
    } catch (error) {
      console.error('Amadeus flight search error:', error);
      
      if (error.message.includes('authentication')) {
        throw new Error('Authentication failed. Please check API credentials.');
      } else if (error.message.includes('429')) {
        throw new Error('API rate limit exceeded. Please try again later.');
      } else if (error.message.includes('400')) {
        throw new Error('Invalid search parameters. Please check your search criteria.');
      } else {
        throw new Error('Flight search failed. Please try again.');
      }
    }
  }

  private processFlightOffer(flight: any): AmadeusFlightOffer {
    const segments = flight.itineraries?.[0]?.segments || [];
    
    if (!segments.length) {
      throw new Error('Invalid flight data: missing segments');
    }

    // Convert EUR to MRU
    const eurPrice = parseFloat(flight.price?.total || '0');
    const mruPrice = Math.round(eurPrice * EUR_TO_MRU_RATE);

    return {
      ...flight,
      price: {
        ...flight.price,
        totalMRU: mruPrice,
        baseMRU: Math.round(parseFloat(flight.price?.base || '0') * EUR_TO_MRU_RATE),
        conversionRate: EUR_TO_MRU_RATE
      },
      bookingData: {
        segments: segments.map((segment: any) => ({
          departure: {
            iataCode: segment.departure?.iataCode,
            terminal: segment.departure?.terminal,
            at: segment.departure?.at
          },
          arrival: {
            iataCode: segment.arrival?.iataCode,
            terminal: segment.arrival?.terminal,
            at: segment.arrival?.at
          },
          carrierCode: segment.carrierCode,
          number: segment.number,
          aircraft: segment.aircraft?.code,
          duration: segment.duration,
          numberOfStops: segment.numberOfStops || 0
        }))
      }
    };
  }

  async searchAirports(keyword: string) {
    if (!keyword || keyword.length < 2) {
      return [];
    }

    const cacheKey = `airports_${keyword}`;
    const cachedResult = this.getFromCache(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    try {
      const token = await this.getAccessToken();
      
      const response = await fetch(`${AMADEUS_BASE_URL}/v1/reference-data/locations?subType=AIRPORT,CITY&keyword=${encodeURIComponent(keyword)}&page[limit]=10`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Airport search failed: ${response.status}`);
      }

      const data = await response.json();
      const results = data.data || [];
      
      this.setCache(cacheKey, results);
      return results;
    } catch (error) {
      console.error('Airport search error:', error);
      throw new Error('Airport search failed');
    }
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const amadeusApi = new AmadeusApiService();
export type { AmadeusFlightOffer, FlightSearchParams };