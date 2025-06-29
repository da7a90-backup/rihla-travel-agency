// src/components/ReservationPDFGenerator.tsx
import React from 'react';
import { Button } from "@/components/ui/button";
import { Download, FileText, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { amadeusApi } from "@/services/amadeusApi";

interface ReservationPDFGeneratorProps {
  booking: {
    id: string;
    booking_reference: string;
    tracking_token: string;
    created_at: string;
    status: string;
    passenger_first_name: string;
    passenger_last_name: string;
    passenger_email: string;
    passenger_phone: string;
    passenger_whatsapp: string;
    flight_data: any;
    origin_code: string;
    destination_code: string;
    departure_date: string;
    return_date: string | null;
    trip_type: string;
    passengers_count: number;
    total_amount_mru: number;
    currency: string;
    amadeus_hold_id?: string;
    hold_expires_at?: string;
  };
  onPDFGenerated?: (pdfUrl: string) => void;
}

const ReservationPDFGenerator: React.FC<ReservationPDFGeneratorProps> = ({ 
  booking, 
  onPDFGenerated 
}) => {
  const [generating, setGenerating] = React.useState(false);

  const generateQRCodeURL = (data: string) => {
    // Using QR Server API for QR code generation
    return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(data)}`;
  };

  const generateReservationHTML = () => {
    const flightData = booking.flight_data;
    const isRoundTrip = booking.trip_type === 'round-trip';
    
    // QR Code data
    const qrData = JSON.stringify({
      ref: booking.booking_reference,
      passenger: `${booking.passenger_first_name} ${booking.passenger_last_name}`,
      tracking: booking.tracking_token
    });

    const renderFlightSegment = (flight: any, title: string) => {
      const segments = flight.itineraries[0]?.segments || [];
      if (!segments.length) return '';

      const firstSegment = segments[0];
      const lastSegment = segments[segments.length - 1];
      
      const departureTime = format(new Date(firstSegment.departure.at), "HH:mm");
      const arrivalTime = format(new Date(lastSegment.arrival.at), "HH:mm");
      const departureDate = format(new Date(firstSegment.departure.at), "EEE, MMM dd, yyyy");
      const arrivalDate = format(new Date(lastSegment.arrival.at), "EEE, MMM dd, yyyy");
      
      const airline = amadeusApi.getAirlineName(firstSegment.carrierCode);
      const duration = flight.itineraries[0]?.duration || '';
      const stops = segments.length - 1;

      return `
        <div class="flight-segment">
          <h3 style="color: #1e40af; margin-bottom: 15px; font-size: 18px; font-weight: bold;">
            ${title}
          </h3>
          
          <div class="flight-summary" style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
              <div>
                <div style="font-weight: bold; font-size: 16px;">${airline}</div>
                <div style="color: #64748b; font-size: 14px;">Flight ${firstSegment.carrierCode}${firstSegment.number}</div>
              </div>
              <div style="text-align: right;">
                <div style="background: #e2e8f0; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                  ${flight.travelerPricings?.[0]?.fareDetailsBySegment?.[0]?.cabin || 'Economy'}
                </div>
              </div>
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div style="text-align: center; flex: 1;">
                <div style="font-size: 24px; font-weight: bold; color: #059669; margin-bottom: 5px;">
                  ${departureTime}
                </div>
                <div style="font-size: 14px; color: #64748b; margin-bottom: 5px;">
                  ${departureDate}
                </div>
                <div style="font-weight: bold;">
                  ${amadeusApi.getCityName(firstSegment.departure.iataCode)}
                </div>
                <div style="color: #64748b; font-size: 12px;">
                  ${firstSegment.departure.iataCode}${firstSegment.departure.terminal ? `, Terminal ${firstSegment.departure.terminal}` : ''}
                </div>
              </div>
              
              <div style="text-align: center; flex: 1; padding: 0 20px;">
                <div style="border-top: 2px solid #cbd5e1; position: relative; margin: 10px 0;">
                  <div style="position: absolute; top: -8px; left: 50%; transform: translateX(-50%); background: white; padding: 0 10px;">
                    ✈️
                  </div>
                </div>
                <div style="color: #64748b; font-size: 12px; margin-top: 15px;">
                  ${duration.replace('PT', '').replace('H', 'h ').replace('M', 'm')}
                </div>
                ${stops > 0 ? `<div style="color: #dc2626; font-size: 11px;">${stops} stop${stops > 1 ? 's' : ''}</div>` : '<div style="color: #059669; font-size: 11px;">Direct</div>'}
              </div>
              
              <div style="text-align: center; flex: 1;">
                <div style="font-size: 24px; font-weight: bold; color: #dc2626; margin-bottom: 5px;">
                  ${arrivalTime}
                </div>
                <div style="font-size: 14px; color: #64748b; margin-bottom: 5px;">
                  ${arrivalDate}
                </div>
                <div style="font-weight: bold;">
                  ${amadeusApi.getCityName(lastSegment.arrival.iataCode)}
                </div>
                <div style="color: #64748b; font-size: 12px;">
                  ${lastSegment.arrival.iataCode}${lastSegment.arrival.terminal ? `, Terminal ${lastSegment.arrival.terminal}` : ''}
                </div>
              </div>
            </div>
          </div>
          
          ${segments.length > 1 ? `
            <div class="segments-detail" style="margin-bottom: 20px;">
              <h4 style="color: #374151; font-size: 14px; margin-bottom: 10px;">Flight Segments:</h4>
              ${segments.map((segment, index) => `
                <div style="padding: 10px; border-left: 3px solid #e5e7eb; margin-bottom: 8px; padding-left: 15px;">
                  <div style="font-weight: bold; font-size: 14px;">
                    ${index + 1}. ${amadeusApi.getCityName(segment.departure.iataCode)} → ${amadeusApi.getCityName(segment.arrival.iataCode)}
                  </div>
                  <div style="color: #64748b; font-size: 12px;">
                    ${format(new Date(segment.departure.at), "HH:mm")} - ${format(new Date(segment.arrival.at), "HH:mm")} • 
                    ${amadeusApi.getAirlineName(segment.carrierCode)} ${segment.carrierCode}${segment.number}
                  </div>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      `;
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Flight Reservation - ${booking.booking_reference}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            line-height: 1.5; 
            color: #1f2937;
            background: white;
          }
          .container { 
            max-width: 800px; 
            margin: 0 auto; 
            padding: 40px 20px; 
          }
          .header {
            text-align: center;
            border-bottom: 3px solid #2563eb;
            padding-bottom: 30px;
            margin-bottom: 30px;
          }
          .company-name {
            font-size: 28px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 5px;
          }
          .document-type {
            font-size: 18px;
            color: #64748b;
            margin-bottom: 15px;
          }
          .status-badge {
            display: inline-block;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: bold;
            text-transform: uppercase;
          }
          .status-confirmed {
            background: #dcfce7;
            color: #166534;
          }
          .status-pending {
            background: #fef3c7;
            color: #92400e;
          }
          .reservation-info {
            background: #f1f5f9;
            padding: 25px;
            border-radius: 10px;
            margin-bottom: 30px;
          }
          .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
          }
          .info-item {
            padding: 15px;
            background: white;
            border-radius: 8px;
            border-left: 4px solid #2563eb;
          }
          .info-label {
            font-size: 12px;
            color: #64748b;
            text-transform: uppercase;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .info-value {
            font-size: 16px;
            font-weight: bold;
            color: #1f2937;
          }
          .qr-section {
            text-align: center;
            margin: 30px 0;
            padding: 20px;
            background: #f8fafc;
            border-radius: 10px;
          }
          .important-notice {
            background: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 8px;
            padding: 20px;
            margin: 30px 0;
          }
          .important-notice h4 {
            color: #dc2626;
            margin-bottom: 10px;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #64748b;
            font-size: 12px;
          }
          @media print {
            .container { padding: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- Header -->
          <div class="header">
            <div class="company-name">PRESTA TRAVEL</div>
            <div class="document-type">Flight Reservation Confirmation</div>
            <span class="status-badge ${booking.status === 'payment_screenshot_uploaded' || booking.status === 'payment_validated' || booking.status === 'ticketed' ? 'status-confirmed' : 'status-pending'}">
              ${booking.status === 'pending' ? 'Pending Payment' : 
                booking.status === 'payment_screenshot_uploaded' ? 'Payment Under Review' :
                booking.status === 'payment_validated' ? 'Payment Confirmed' :
                booking.status === 'ticketed' ? 'Ticketed' : 'Reserved'}
            </span>
          </div>

          <!-- Reservation Info -->
          <div class="reservation-info">
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Booking Reference</div>
                <div class="info-value">${booking.booking_reference}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Passenger Name</div>
                <div class="info-value">${booking.passenger_first_name} ${booking.passenger_last_name}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Trip Type</div>
                <div class="info-value">${booking.trip_type.replace('-', ' ').toUpperCase()}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Total Amount</div>
                <div class="info-value">MRU ${booking.total_amount_mru.toLocaleString()}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Issue Date</div>
                <div class="info-value">${format(new Date(booking.created_at), "PPP")}</div>
              </div>
              ${booking.amadeus_hold_id ? `
              <div class="info-item">
                <div class="info-label">Hold Reference</div>
                <div class="info-value">${booking.amadeus_hold_id}</div>
              </div>
              ` : ''}
            </div>
          </div>

          <!-- QR Code -->
          <div class="qr-section">
            <h4 style="margin-bottom: 15px; color: #374151;">Booking QR Code</h4>
            <img src="${generateQRCodeURL(qrData)}" alt="Booking QR Code" style="border: 1px solid #e5e7eb; border-radius: 8px;">
            <p style="margin-top: 10px; font-size: 12px; color: #64748b;">
              Scan this code to quickly access your booking details
            </p>
          </div>

          <!-- Flight Details -->
          <div style="margin: 30px 0;">
            ${renderFlightSegment(flightData.outbound, isRoundTrip ? 'Outbound Flight' : 'Flight Details')}
            
            ${isRoundTrip && flightData.return ? renderFlightSegment(flightData.return, 'Return Flight') : ''}
          </div>

          <!-- Important Notice -->
          <div class="important-notice">
            <h4>⚠️ Important Notice</h4>
            <ul style="margin-left: 20px; color: #374151;">
              <li>This is a <strong>reservation confirmation</strong>, not an official e-ticket</li>
              <li>Your official e-ticket will be issued after payment verification</li>
              <li>Please arrive at the airport at least 2-3 hours before departure</li>
              <li>Bring a valid passport and any required visas</li>
              <li>Check baggage allowances with the airline</li>
              ${booking.amadeus_hold_id && booking.hold_expires_at ? `
              <li style="color: #dc2626;"><strong>Hold expires:</strong> ${format(new Date(booking.hold_expires_at), "PPP 'at' HH:mm")}</li>
              ` : ''}
            </ul>
          </div>

          <!-- Contact Info -->
          <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 30px 0;">
            <h4 style="color: #374151; margin-bottom: 15px;">Contact Information</h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;">
              <div>
                <div style="font-weight: bold; color: #1f2937;">Email:</div>
                <div style="color: #64748b;">${booking.passenger_email}</div>
              </div>
              <div>
                <div style="font-weight: bold; color: #1f2937;">WhatsApp:</div>
                <div style="color: #64748b;">${booking.passenger_whatsapp}</div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="footer">
            <p><strong>PRESTA TRAVEL</strong> - Your trusted travel partner in Mauritania</p>
            <p>WhatsApp: +222 36 30 26 30 | Email: info@prestatravel.mr</p>
            <p style="margin-top: 10px;">
              Generated on ${format(new Date(), "PPP 'at' HH:mm")} | 
              Tracking: ${booking.tracking_token}
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  const generatePDF = async () => {
    setGenerating(true);
    try {
      const htmlContent = generateReservationHTML();
      
      // Create a new window/tab with the formatted content
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        
        // Wait for content to load then focus
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.focus();
            // User can then use Ctrl+P to print or save as PDF
          }, 500);
        };
      }

      // Create downloadable HTML file as backup
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      
      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = `Reservation_${booking.booking_reference}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      if (onPDFGenerated) {
        onPDFGenerated(url);
      }

    } catch (error) {
      console.error('PDF generation error:', error);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-3">
      <Button
        onClick={generatePDF}
        disabled={generating}
        className="w-full bg-blue-600 hover:bg-blue-700"
      >
        {generating ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <FileText className="h-4 w-4 mr-2" />
            Generate Reservation PDF
          </>
        )}
      </Button>
      
      <p className="text-xs text-gray-500 text-center">
        Professional reservation confirmation with QR code and flight details
      </p>
    </div>
  );
};

export default ReservationPDFGenerator;