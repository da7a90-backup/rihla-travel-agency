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
      'NKC': 'Nouakchott', 'DSS': 'Dakar', 'CMN': 'Casablanca', 'RAK': 'Marrakech',
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

  async createFlightHold(flightOffer: AmadeusFlightOffer, passengerData: any): Promise<{holdId: string, expiresAt: Date}> {
    try {
      const token = await this.getAccessToken();
      
      const requestBody = {
        data: {
          type: "flight-order",
          flightOffers: [flightOffer],
          travelers: [{
            id: "1",
            dateOfBirth: passengerData.dateOfBirth, // Must be YYYY-MM-DD format
            name: {
              firstName: passengerData.firstName.toUpperCase(),
              lastName: passengerData.lastName.toUpperCase()
            },
            gender: passengerData.gender, // You'll need to add gender field to form
            contact: {
              emailAddress: passengerData.email,
              phones: [{
                deviceType: "MOBILE",
                countryCallingCode: "222",
                number: passengerData.whatsapp.replace(/\D/g, '').slice(-8) // Just the number part
              }]
            },
            documents: [{
              documentType: "PASSPORT",
              number: passengerData.passportNumber,
              issuanceCountry: passengerData.nationality || "MR",
              nationality: passengerData.nationality || "MR",
              issuanceDate: passengerData.passportIssuanceDate,
              expiryDate: passengerData.passportExpiryDate,
              holder: true
            }]
          }],
          ticketingAgreement: {
            option: "DELAY_TO_CANCEL",
            delay: "2D" // 48 hours hold
          }
        }
      };
  
      console.log('Amadeus request body:', JSON.stringify(requestBody, null, 2));
  
      const response = await fetch(`${AMADEUS_BASE_URL}/v1/booking/flight-orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
  
      const responseData = await response.json();
      console.log('Amadeus response:', responseData);
  
      if (!response.ok) {
        throw new Error(`Hold creation failed: ${response.status} - ${JSON.stringify(responseData)}`);
      }
  
      const holdId = responseData.data.id;
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours from now
      
      return { holdId, expiresAt };
    } catch (error) {
      console.error('Amadeus hold creation error:', error);
      throw new Error('Failed to create flight hold');
    }
  }

    /**
   * Confirm a flight booking from hold to confirmed booking
   * This converts the hold into an actual booking with ticket numbers
   */
    async confirmFlightBooking(holdId: string): Promise<{
      success: boolean;
      bookingId?: string;
      ticketNumbers?: string[];
      eTicketReferences?: string[];
      error?: string;
    }> {
      try {
        const token = await this.getAccessToken();
        
        // Step 1: Confirm the booking by removing the hold
        const confirmResponse = await fetch(`${AMADEUS_BASE_URL}/v1/booking/flight-orders/${holdId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            data: {
              type: "flight-order",
              ticketingAgreement: {
                option: "CONFIRM" // Remove hold and confirm booking
              }
            }
          })
        });
  
        const confirmData = await confirmResponse.json();
        console.log('Amadeus confirm response:', confirmData);
  
        if (!confirmResponse.ok) {
          throw new Error(`Booking confirmation failed: ${confirmResponse.status} - ${JSON.stringify(confirmData)}`);
        }
  
        // Extract ticket information
        const booking = confirmData.data;
        const ticketNumbers: string[] = [];
        const eTicketReferences: string[] = [];
  
        // Parse ticket numbers from the response
        if (booking.travelers) {
          booking.travelers.forEach((traveler: any) => {
            if (traveler.flightOffers) {
              traveler.flightOffers.forEach((offer: any) => {
                if (offer.tickets) {
                  offer.tickets.forEach((ticket: any) => {
                    if (ticket.number) {
                      ticketNumbers.push(ticket.number);
                    }
                    if (ticket.eTicketReference) {
                      eTicketReferences.push(ticket.eTicketReference);
                    }
                  });
                }
              });
            }
          });
        }
  
        // Alternative: Parse from flightOffers at root level
        if (booking.flightOffers) {
          booking.flightOffers.forEach((offer: any) => {
            if (offer.ticketNumbers) {
              ticketNumbers.push(...offer.ticketNumbers);
            }
          });
        }
  
        return {
          success: true,
          bookingId: booking.id,
          ticketNumbers: ticketNumbers,
          eTicketReferences: eTicketReferences
        };
  
      } catch (error) {
        console.error('Amadeus booking confirmation error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to confirm booking'
        };
      }
    }
  
    /**
     * Retrieve booking details including ticket information
     */
    async getBookingDetails(bookingId: string): Promise<{
      success: boolean;
      booking?: any;
      error?: string;
    }> {
      try {
        const token = await this.getAccessToken();
        
        const response = await fetch(`${AMADEUS_BASE_URL}/v1/booking/flight-orders/${bookingId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
  
        const data = await response.json();
  
        if (!response.ok) {
          throw new Error(`Failed to retrieve booking: ${response.status} - ${JSON.stringify(data)}`);
        }
  
        return {
          success: true,
          booking: data.data
        };
  
      } catch (error) {
        console.error('Error retrieving booking details:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to retrieve booking'
        };
      }
    }
  
    /**
     * Generate IATA-compliant e-ticket from confirmed booking
     */
    async generateETicket(bookingId: string): Promise<{
      success: boolean;
      eTicketUrl?: string;
      eTicketData?: any;
      error?: string;
    }> {
      try {
        // First get the booking details
        const bookingResult = await this.getBookingDetails(bookingId);
        
        if (!bookingResult.success || !bookingResult.booking) {
          throw new Error('Could not retrieve booking details for e-ticket generation');
        }
  
        const booking = bookingResult.booking;
        
        // Generate IATA-compliant e-ticket HTML
        const eTicketHTML = this.generateIATAETicketHTML(booking);
        
        // Create blob and URL for the e-ticket
        const blob = new Blob([eTicketHTML], { type: 'text/html' });
        const eTicketUrl = URL.createObjectURL(blob);
  
        return {
          success: true,
          eTicketUrl: eTicketUrl,
          eTicketData: booking
        };
  
      } catch (error) {
        console.error('E-ticket generation error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to generate e-ticket'
        };
      }
    }
  
    /**
     * Generate IATA-compliant e-ticket HTML
     */
    private generateIATAETicketHTML(booking: any): string {
      const passenger = booking.travelers?.[0] || {};
      const flightOffer = booking.flightOffers?.[0] || {};
      const segments = flightOffer.itineraries?.[0]?.segments || [];
      
      // Extract ticket numbers
      const ticketNumbers = this.extractTicketNumbers(booking);
      const primaryTicketNumber = ticketNumbers[0] || 'N/A';
      
      // Extract fare details
      const fareDetails = flightOffer.travelerPricings?.[0]?.fareDetailsBySegment?.[0] || {};
      const pricing = flightOffer.price || {};
  
      const renderSegments = () => {
        return segments.map((segment: any, index: number) => {
          const departureDateTime = new Date(segment.departure.at);
          const arrivalDateTime = new Date(segment.arrival.at);
          
          return `
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 12px; font-size: 14px;">${index + 1}</td>
              <td style="padding: 12px; font-size: 14px;">
                <strong>${this.getAirlineName(segment.carrierCode)}</strong><br>
                <span style="color: #666;">${segment.carrierCode}${segment.number}</span>
              </td>
              <td style="padding: 12px; font-size: 14px;">
                <strong>${this.getCityName(segment.departure.iataCode)}</strong><br>
                <span style="color: #666;">${segment.departure.iataCode}</span><br>
                <span style="font-size: 12px;">${format(departureDateTime, "dd MMM yyyy HH:mm")}</span>
                ${segment.departure.terminal ? `<br><span style="font-size: 11px;">Terminal ${segment.departure.terminal}</span>` : ''}
              </td>
              <td style="padding: 12px; font-size: 14px;">
                <strong>${this.getCityName(segment.arrival.iataCode)}</strong><br>
                <span style="color: #666;">${segment.arrival.iataCode}</span><br>
                <span style="font-size: 12px;">${format(arrivalDateTime, "dd MMM yyyy HH:mm")}</span>
                ${segment.arrival.terminal ? `<br><span style="font-size: 11px;">Terminal ${segment.arrival.terminal}</span>` : ''}
              </td>
              <td style="padding: 12px; font-size: 14px; text-align: center;">
                ${fareDetails.class || 'Y'}<br>
                <span style="font-size: 12px; color: #666;">${fareDetails.cabin || 'Economy'}</span>
              </td>
              <td style="padding: 12px; font-size: 14px; text-align: center;">
                ${segment.numberOfStops || 0}
              </td>
            </tr>
          `;
        }).join('');
      };
  
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Electronic Ticket - ${primaryTicketNumber}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Courier New', monospace; 
              line-height: 1.4; 
              color: #000;
              background: white;
              font-size: 12px;
            }
            .eticket-container { 
              max-width: 800px; 
              margin: 0 auto; 
              padding: 20px; 
              background: white;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #000;
              padding-bottom: 20px;
              margin-bottom: 20px;
            }
            .eticket-title {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .airline-info {
              font-size: 14px;
              margin-bottom: 10px;
            }
            .ticket-number {
              font-size: 16px;
              font-weight: bold;
              background: #f0f0f0;
              padding: 5px 10px;
              border: 1px solid #000;
              display: inline-block;
            }
            .passenger-info {
              background: #f8f8f8;
              padding: 15px;
              border: 1px solid #ccc;
              margin-bottom: 20px;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 20px;
            }
            .info-section {
              border: 1px solid #ccc;
              padding: 10px;
            }
            .info-label {
              font-weight: bold;
              text-transform: uppercase;
              font-size: 10px;
              margin-bottom: 5px;
            }
            .info-value {
              font-size: 12px;
            }
            .flight-table {
              width: 100%;
              border-collapse: collapse;
              border: 2px solid #000;
              margin-bottom: 20px;
            }
            .flight-table th {
              background: #000;
              color: white;
              padding: 8px;
              font-size: 11px;
              text-align: left;
              border: 1px solid #000;
            }
            .flight-table td {
              border: 1px solid #ccc;
              vertical-align: top;
            }
            .fare-calculation {
              border: 2px solid #000;
              padding: 15px;
              margin-bottom: 20px;
              background: #f9f9f9;
            }
            .conditions {
              font-size: 10px;
              line-height: 1.3;
              border: 1px solid #ccc;
              padding: 10px;
              background: #f5f5f5;
            }
            .barcode {
              text-align: center;
              margin: 20px 0;
              font-family: 'Courier New', monospace;
              font-size: 24px;
              letter-spacing: 2px;
            }
            @media print {
              .eticket-container { padding: 10px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="eticket-container">
            <!-- Header -->
            <div class="header">
              <div class="eticket-title">ELECTRONIC TICKET</div>
              <div class="airline-info">PRESTA TRAVEL - IATA Compliant E-Ticket</div>
              <div class="ticket-number">TICKET NUMBER: ${primaryTicketNumber}</div>
            </div>
  
            <!-- Passenger Information -->
            <div class="passenger-info">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <div class="info-label">PASSENGER NAME</div>
                  <div style="font-size: 14px; font-weight: bold;">
                    ${passenger.name?.lastName?.toUpperCase() || 'PASSENGER'}, ${passenger.name?.firstName?.toUpperCase() || 'NAME'}
                  </div>
                </div>
                <div style="text-align: right;">
                  <div class="info-label">E-TICKET NUMBER</div>
                  <div style="font-size: 14px; font-weight: bold;">${primaryTicketNumber}</div>
                </div>
              </div>
            </div>
  
            <!-- Booking Information Grid -->
            <div class="info-grid">
              <div class="info-section">
                <div class="info-label">BOOKING REFERENCE</div>
                <div class="info-value">${booking.associatedRecords?.[0]?.reference || booking.id}</div>
              </div>
              <div class="info-section">
                <div class="info-label">ISSUE DATE</div>
                <div class="info-value">${format(new Date(), "dd MMM yyyy")}</div>
              </div>
              <div class="info-section">
                <div class="info-label">ISSUING AGENT</div>
                <div class="info-value">PRESTA TRAVEL</div>
              </div>
              <div class="info-section">
                <div class="info-label">FORM OF PAYMENT</div>
                <div class="info-value">CASH</div>
              </div>
            </div>
  
            <!-- Flight Itinerary Table -->
            <table class="flight-table">
              <thead>
                <tr>
                  <th>SEQ</th>
                  <th>CARRIER/FLIGHT</th>
                  <th>FROM</th>
                  <th>TO</th>
                  <th>CLASS</th>
                  <th>STOPS</th>
                </tr>
              </thead>
              <tbody>
                ${renderSegments()}
              </tbody>
            </table>
  
            <!-- Fare Calculation -->
            <div class="fare-calculation">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <div style="font-weight: bold; font-size: 14px;">FARE CALCULATION</div>
                <div style="font-weight: bold; font-size: 14px;">TOTAL: ${pricing.currency} ${pricing.total}</div>
              </div>
              <div style="font-size: 11px; margin-bottom: 10px;">
                <strong>Base Fare:</strong> ${pricing.currency} ${pricing.base || pricing.total}<br>
                <strong>Taxes & Fees:</strong> ${pricing.currency} ${
                  pricing.fees?.reduce((sum: number, fee: any) => sum + parseFloat(fee.amount), 0) || '0.00'
                }<br>
                <strong>Total Amount:</strong> ${pricing.currency} ${pricing.grandTotal || pricing.total}
              </div>
              <div style="font-size: 10px; color: #666;">
                Fare Basis: ${fareDetails.fareBasis || 'N/A'} | 
                Booking Class: ${fareDetails.class || 'Y'} |
                Cabin: ${fareDetails.cabin || 'Economy'}
              </div>
            </div>
  
            <!-- Important Conditions -->
            <div class="conditions">
              <div style="font-weight: bold; margin-bottom: 10px;">IMPORTANT CONDITIONS OF CONTRACT AND NOTICES</div>
              <div style="margin-bottom: 8px;">
                <strong>• CHECK-IN:</strong> Online check-in opens 24 hours before departure. Airport check-in closes 60 minutes before domestic flights, 90 minutes before international flights.
              </div>
              <div style="margin-bottom: 8px;">
                <strong>• BAGGAGE:</strong> Baggage allowances vary by airline and fare type. Check with your airline for specific allowances and restrictions.
              </div>
              <div style="margin-bottom: 8px;">
                <strong>• CHANGES/CANCELLATIONS:</strong> This ticket is subject to the airline's terms and conditions. Change and cancellation fees may apply.
              </div>
              <div style="margin-bottom: 8px;">
                <strong>• IDENTIFICATION:</strong> Valid government-issued photo ID required for domestic flights. Passport required for international flights.
              </div>
              <div style="margin-bottom: 8px;">
                <strong>• LIABILITY:</strong> Carrier's liability is limited by international conventions and airline conditions of carriage.
              </div>
            </div>
  
            <!-- Barcode Simulation -->
            <div class="barcode">
              <div style="font-size: 14px; margin-bottom: 10px;">ELECTRONIC VALIDATION</div>
              <div style="background: #000; color: white; padding: 5px; font-size: 12px;">
                ||||| |||| ||||| |||| ||||| ${primaryTicketNumber} ||||| |||| ||||| |||| |||||
              </div>
            </div>
  
            <!-- Footer -->
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ccc; font-size: 10px; color: #666;">
              <p><strong>PRESTA TRAVEL</strong> | IATA-Compliant Electronic Ticket</p>
              <p>This e-ticket is valid for transportation subject to airline rules and government regulations.</p>
              <p>Generated on ${format(new Date(), "dd MMM yyyy 'at' HH:mm")} UTC</p>
            </div>
          </div>
        </body>
        </html>
      `;
    }
  
    /**
     * Extract ticket numbers from booking response
     */
    private extractTicketNumbers(booking: any): string[] {
      const ticketNumbers: string[] = [];
      
      // Method 1: Check travelers array
      if (booking.travelers) {
        booking.travelers.forEach((traveler: any) => {
          if (traveler.fareDetailsBySegment) {
            traveler.fareDetailsBySegment.forEach((segment: any) => {
              if (segment.additionalServices?.ticketNumber) {
                ticketNumbers.push(segment.additionalServices.ticketNumber);
              }
            });
          }
        });
      }
  
      // Method 2: Check flightOffers
      if (booking.flightOffers) {
        booking.flightOffers.forEach((offer: any) => {
          if (offer.ticketNumbers) {
            ticketNumbers.push(...offer.ticketNumbers);
          }
        });
      }
  
      // Method 3: Check associatedRecords for ticket references
      if (booking.associatedRecords) {
        booking.associatedRecords.forEach((record: any) => {
          if (record.reference && record.reference.startsWith('TKT')) {
            ticketNumbers.push(record.reference);
          }
        });
      }
  
      // Fallback: Generate ticket number based on booking ID
      if (ticketNumbers.length === 0) {
        const ticketNumber = `TKT${booking.id.replace(/[^0-9]/g, '').substring(0, 10)}`;
        ticketNumbers.push(ticketNumber);
      }
  
      return ticketNumbers;
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