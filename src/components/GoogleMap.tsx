'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

interface Location {
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

interface GoogleMapProps {
  locations: Location[];
}

export default function GoogleMap({ locations }: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [directionsService, setDirectionsService] = useState<google.maps.DirectionsService | null>(null);
  const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer | null>(null);
  const [userLocation, setUserLocation] = useState<google.maps.LatLng | null>(null);
  const [showDirections, setShowDirections] = useState(false);
  const [activeDirectionIndex, setActiveDirectionIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locationPermissionDenied, setLocationPermissionDenied] = useState(false);

  // Initialize Google Maps
  useEffect(() => {
    const initMap = async () => {
      if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
        setError('Google Maps API key not found');
        setIsLoading(false);
        return;
      }

      try {
        const loader = new Loader({
          apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
          version: 'weekly',
          libraries: ['places', 'geometry'],
        });

        const { Map } = await loader.importLibrary('maps');
        
        if (!mapRef.current) return;

        const mapInstance = new Map(mapRef.current, {
          zoom: 13,
          center: { lat: 37.7749, lng: -122.4194 }, // Default to San Francisco
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: true,
          mapId: 'DEMO_MAP_ID', // Required for newer features
        });

        const directionsServiceInstance = new google.maps.DirectionsService();
        const directionsRendererInstance = new google.maps.DirectionsRenderer({
          draggable: true,
          panel: undefined,
        });

        directionsRendererInstance.setMap(mapInstance);

        setMap(mapInstance);
        setDirectionsService(directionsServiceInstance);
        setDirectionsRenderer(directionsRendererInstance);

        // Add markers for all locations using coordinates
        const addLocationMarkers = () => {
          if (locations.length === 0) {
            setError('No locations provided');
            setIsLoading(false);
            return;
          }

          const bounds = new google.maps.LatLngBounds();
          
          locations.forEach((location, index) => {
            const position = new google.maps.LatLng(
              location.coordinates.latitude,
              location.coordinates.longitude
            );

            // Create marker
            const marker = new google.maps.Marker({
              position: position,
              map: mapInstance,
              title: location.name,
              icon: {
                url: `https://maps.google.com/mapfiles/ms/icons/${index === 0 ? 'red' : 'blue'}-dot.png`,
                scaledSize: new google.maps.Size(32, 32),
              },
            });

            // Create info window
            const infoWindow = new google.maps.InfoWindow({
              content: `
                <div style="padding: 8px;">
                  <h3 style="margin: 0 0 8px 0; font-weight: bold;">${location.name}</h3>
                  <p style="margin: 0; color: #666;">${location.address}</p>
                  <p style="margin: 4px 0 0 0; color: #666;">${location.city}, ${location.state}, ${location.country}</p>
                </div>
              `,
            });

            // Add click listener to marker
            marker.addListener('click', () => {
              infoWindow.open(mapInstance, marker);
            });

            bounds.extend(position);
          });

          // Fit map to bounds if multiple locations, otherwise center on single location
          if (locations.length > 1) {
            mapInstance.fitBounds(bounds);
          } else {
            mapInstance.setCenter(bounds.getCenter());
            mapInstance.setZoom(15);
          }
          
          setIsLoading(false);
        };

        addLocationMarkers();

        // Get user's current location
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const userPos = new google.maps.LatLng(
                position.coords.latitude,
                position.coords.longitude
              );
              setUserLocation(userPos);
              setLocationPermissionDenied(false);
            },
            (error) => {
              console.log('Geolocation failed:', error.message);
              // Only set permission denied if it was actually denied, not for other errors
              if (error.code === error.PERMISSION_DENIED) {
                setLocationPermissionDenied(true);
              }
              // Don't set as error since the map still works without directions
            },
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 300000 // 5 minutes
            }
          );
        } else {
          setLocationPermissionDenied(true);
        }

      } catch (err) {
        setError('Failed to load Google Maps');
        setIsLoading(false);
      }
    };

    initMap();
  }, [locations]);

  // Calculate and display directions to a specific location
  const calculateDirectionsToLocation = (locationIndex: number) => {
    if (!directionsService || !directionsRenderer || !map) {
      alert('Map services not ready. Please try again.');
      return;
    }

    if (!userLocation) {
      // Prompt user to allow location access
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const userPos = new google.maps.LatLng(
              position.coords.latitude,
              position.coords.longitude
            );
            setUserLocation(userPos);
            setLocationPermissionDenied(false);
            
            // Now calculate directions to the selected location
            const selectedLocation = locations[locationIndex];
            const destination = new google.maps.LatLng(
              selectedLocation.coordinates.latitude,
              selectedLocation.coordinates.longitude
            );
            const request: google.maps.DirectionsRequest = {
              origin: userPos,
              destination: destination,
              travelMode: google.maps.TravelMode.DRIVING,
            };

            directionsService.route(request, (result, status) => {
              if (status === google.maps.DirectionsStatus.OK && result) {
                directionsRenderer.setDirections(result);
                setShowDirections(true);
                setActiveDirectionIndex(locationIndex);
              } else {
                alert('Directions request failed: ' + status);
              }
            });
          },
          (error) => {
            alert(`Unable to get your location: ${error.message}. Please enable location access in your browser settings.`);
            // Only set permission denied if it was actually denied
            if (error.code === error.PERMISSION_DENIED) {
              setLocationPermissionDenied(true);
            }
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000
          }
        );
      } else {
        alert('Geolocation is not supported by your browser.');
      }
      return;
    }

    const selectedLocation = locations[locationIndex];
    const destination = new google.maps.LatLng(
      selectedLocation.coordinates.latitude,
      selectedLocation.coordinates.longitude
    );
    const request: google.maps.DirectionsRequest = {
      origin: userLocation,
      destination: destination,
      travelMode: google.maps.TravelMode.DRIVING,
    };

    directionsService.route(request, (result, status) => {
      if (status === google.maps.DirectionsStatus.OK && result) {
        directionsRenderer.setDirections(result);
        setShowDirections(true);
        setActiveDirectionIndex(locationIndex);
      } else {
        alert('Directions request failed: ' + status);
      }
    });
  };

  const clearDirections = () => {
    if (directionsRenderer) {
      directionsRenderer.setDirections({ routes: [] } as google.maps.DirectionsResult);
      setShowDirections(false);
      setActiveDirectionIndex(null);
    }
  };

  if (error) {
    return (
      <div className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-2">Error loading map</p>
          <p className="text-sm text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {showDirections && (
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-gray-600">
            Showing directions to: <strong>{locations[activeDirectionIndex!]?.name}</strong>
          </p>
          <button
            onClick={clearDirections}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Clear Directions
          </button>
        </div>
      )}
      
      {locationPermissionDenied && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
          <p className="text-yellow-800 text-sm">
            <strong>Location Access Denied:</strong> To get directions, please allow location access in your browser settings and reload the page.
          </p>
        </div>
      )}

      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 bg-gray-100 rounded-lg flex items-center justify-center z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p>Loading map...</p>
            </div>
          </div>
        )}
        <div
          ref={mapRef}
          className="w-full h-96 rounded-lg border border-gray-300"
        />
      </div>

      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-semibold text-lg mb-4">
          {locations.length === 1 ? 'Location Details' : `${locations.length} Locations Found`}
        </h3>
        <div className="space-y-4">
          {locations.map((location, index) => (
            <div key={index} className="border-b border-gray-200 pb-3 last:border-b-0">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium text-md">{location.name}</h4>
                <div className="flex gap-2">
                  <button
                    onClick={() => calculateDirectionsToLocation(index)}
                    disabled={isLoading || !userLocation}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      activeDirectionIndex === index && showDirections
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed'
                    }`}
                  >
                    {activeDirectionIndex === index && showDirections ? 'Active Route' : 'Get Directions'}
                  </button>
                </div>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>Address:</strong> {location.address}</p>
                <p><strong>Location:</strong> {location.city}, {location.state}, {location.country}</p>
                <p><strong>Coordinates:</strong> {location.coordinates.latitude.toFixed(6)}, {location.coordinates.longitude.toFixed(6)}</p>
              </div>
              {!userLocation && (
                <p className="text-xs text-gray-500 mt-2">
                  Enable location access to get directions
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}