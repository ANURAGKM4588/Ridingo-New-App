import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/driver_model.dart';
import '../services/driver_supabase_service.dart';

final driverProvider = StateNotifierProvider<DriverNotifier, DriverModel>((ref) {
  return DriverNotifier();
});

class DriverNotifier extends StateNotifier<DriverModel> {
  DriverNotifier()
      : super(
          const DriverModel(
            id: 'DRV-7841',
            name: 'Manoj Kumar',
            phone: '+91 98400 55432',
          ),
        );

  void toggleOnline() {
    state = state.copyWith(online: !state.online);
  }

  void updateCategories(String cat, bool value) {
    final updated = Map<String, bool>.from(state.vehicleCategories);
    updated[cat] = value;
    state = state.copyWith(vehicleCategories: updated);
  }
}

final incomingTripsProvider = StateNotifierProvider<IncomingTripsNotifier, List<Map<String, dynamic>>>((ref) {
  final driver = ref.watch(driverProvider);
  return IncomingTripsNotifier(driver);
});

class IncomingTripsNotifier extends StateNotifier<List<Map<String, dynamic>>> {
  final DriverModel driver;

  IncomingTripsNotifier(this.driver) : super([]) {
    loadTrips();
    DriverSupabaseService.subscribeToDriverTrips(() {
      loadTrips();
    });
  }

  Future<void> loadTrips() async {
    final list = await DriverSupabaseService.fetchIncomingTrips();
    state = list;
  }

  Future<void> accept(String tripId) async {
    await DriverSupabaseService.acceptTrip(tripId, {
      'id': driver.id,
      'name': driver.name,
      'phone': driver.phone,
      'rating': driver.rating,
      'car': 'Customer Vehicle Verified',
    });
    await loadTrips();
  }

  Future<void> start(String tripId) async {
    await DriverSupabaseService.startTrip(tripId);
    await loadTrips();
  }

  Future<void> complete(String tripId) async {
    await DriverSupabaseService.completeTrip(tripId);
    await loadTrips();
  }
}
