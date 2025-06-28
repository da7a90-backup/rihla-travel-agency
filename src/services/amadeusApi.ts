
// Amadeus API Integration Service
const AMADEUS_API_KEY = 'YMY34YgcMiHrh15VehjCQhqeDXYPj3TU';
const AMADEUS_API_SECRET = 'SUF1nvg0YuAArIcf';
const AMADEUS_BASE_URL = 'https://test.api.amadeus.com';

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

class AmadeusApiService {
  private accessToken: string | null = null;
  private tokenExpirationTime: number = 0;

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpirationTime) {
      return this.accessToken;
    }

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
      throw new Error(`Failed to get access token: ${response.statusText}`);
    }

    const data: AmadeusTokenResponse = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpirationTime = Date.now() + (data.expires_in * 1000) - 60000; // Refresh 1 minute before expiration

    return this.accessToken;
  }

  async searchFlights(params: FlightSearchParams): Promise<AmadeusFlightOffer[]> {
    try {
      const token = await this.getAccessToken();
      
      const searchParams = new URLSearchParams({
        originLocationCode: params.originLocationCode,
        destinationLocationCode: params.destinationLocationCode,
        departureDate: params.departureDate,
        adults: params.adults.toString(),
        currencyCode: params.currencyCode || 'MRU',
        max: (params.max || 20).toString(),
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
        throw new Error(`Flight search failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Amadeus API Error:', error);
      throw error;
    }
  }

  async getAirportInfo(iataCode: string) {
    try {
      const token = await this.getAccessToken();
      
      const response = await fetch(`${AMADEUS_BASE_URL}/v1/reference-data/locations?subType=AIRPORT&keyword=${iataCode}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Airport info fetch failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Airport info error:', error);
      return [];
    }
  }

  async searchAirports(keyword: string) {
    try {
      const token = await this.getAccessToken();
      
      const response = await fetch(`${AMADEUS_BASE_URL}/v1/reference-data/locations?subType=AIRPORT,CITY&keyword=${keyword}&page[limit]=10`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Airport search failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Airport search error:', error);
      return [];
    }
  }
}

export const amadeusApi = new AmadeusApiService();
export type { AmadeusFlightOffer, FlightSearchParams };
