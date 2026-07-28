import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:geocoding/geocoding.dart';

class UserLocation {
  final double lat;
  final double lng;
  final String address;
  
  UserLocation({required this.lat, required this.lng, required this.address});
}

final userLocationProvider = StreamProvider<UserLocation?>((ref) {
  final user = FirebaseAuth.instance.currentUser;
  if (user == null) return Stream.value(null);

  return FirebaseFirestore.instance
      .collection('users')
      .doc(user.uid)
      .snapshots()
      .map((doc) {
    if (!doc.exists) return null;
    final data = doc.data()!;
    if (data.containsKey('lastKnownLocation')) {
      final loc = data['lastKnownLocation'];
      return UserLocation(
        lat: loc['lat'] ?? 0.0,
        lng: loc['lng'] ?? 0.0,
        address: loc['address'] ?? '',
      );
    }
    return null;
  });
});

Future<bool> requestAndSaveLocation() async {
  bool serviceEnabled;
  LocationPermission permission;

  serviceEnabled = await Geolocator.isLocationServiceEnabled();
  if (!serviceEnabled) {
    return false;
  }

  permission = await Geolocator.checkPermission();
  if (permission == LocationPermission.denied) {
    permission = await Geolocator.requestPermission();
    if (permission == LocationPermission.denied) {
      return false;
    }
  }

  if (permission == LocationPermission.deniedForever) {
    return false;
  }

  try {
    Position position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high);
    
    String address = "Unknown Location";
    try {
      List<Placemark> placemarks = await placemarkFromCoordinates(
          position.latitude, position.longitude);
      if (placemarks.isNotEmpty) {
        Placemark place = placemarks.first;
        // Build a clean, Swiggy-like address string like "Koramangala, Bangalore"
        List<String> parts = [];
        if (place.subLocality != null && place.subLocality!.isNotEmpty) parts.add(place.subLocality!);
        if (place.locality != null && place.locality!.isNotEmpty) parts.add(place.locality!);
        if (parts.isEmpty && place.street != null && place.street!.isNotEmpty) parts.add(place.street!);
        
        if (parts.isNotEmpty) {
          address = parts.join(", ");
        }
      }
    } catch (e) {
      // Geocoding failed (network issue, unsupported region, etc.)
      // Fall back to raw coordinates
      address = "${position.latitude.toStringAsFixed(4)}, ${position.longitude.toStringAsFixed(4)}";
      print("Geocoding failed, using raw coordinates: $e");
    }

    final user = FirebaseAuth.instance.currentUser;
    if (user != null) {
      await FirebaseFirestore.instance.collection('users').doc(user.uid).set({
        'lastKnownLocation': {
          'lat': position.latitude,
          'lng': position.longitude,
          'address': address,
          'updatedAt': FieldValue.serverTimestamp(),
        }
      }, SetOptions(merge: true));
      return true;
    }
  } catch (e) {
    print("Error getting location: $e");
  }
  return false;
}
