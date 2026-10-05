import 'dart:math';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/trip_model.dart';
import '../services/supabase_service.dart';
import 'auth_provider.dart';
import 'wallet_provider.dart';

final tripsProvider = StateNotifierProvider<TripsNotifier, List<TripModel>>((ref) {
  final user = ref.watch(authProvider).value;
  return TripsNotifier(ref, user?.phone ?? '');
});

final activeRideProvider = Provider<TripModel?>((ref) {
  final trips = ref.watch(tripsProvider);
  try {
    return trips.firstWhere((t) => t.status == 'inprogress' || t.status == 'assigned' || t.status == 'arrived');
  } catch (_) {
    return null;
  }
});

class TripsNotifier extends StateNotifier<List<TripModel>> {
  final Ref ref;
  final String userPhone;

  TripsNotifier(this.ref, this.userPhone) : super([]) {
    if (userPhone.isNotEmpty) {
      loadTrips();
      _initRealtime();
    }
  }

  void _initRealtime() {
    SupabaseService.subscribeToTrips(
      onInsertOrUpdate: (incoming) {
        final digits = userPhone.replaceAll(RegExp(r'\D'), '');
        final last10 = digits.length >= 10 ? digits.substring(digits.length - 10) : '';

        final byDigits = incoming.by.replaceAll(RegExp(r'\D'), '');
        final isMine = (last10.isNotEmpty && byDigits.endsWith(last10)) ||
            (incoming.rider['phone'] != null && incoming.rider['phone'].toString().replaceAll(RegExp(r'\D'), '').endsWith(last10));

        if (isMine) {
          final idx = state.indexWhere((t) => t.id == incoming.id);
          if (idx >= 0) {
            final copy = List<TripModel>.from(state);
            copy[idx] = incoming;
            state = copy;
          } else {
            state = [incoming, ...state];
          }
        }
      },
    );
  }

  Future<void> loadTrips() async {
    final list = await SupabaseService.fetchUserTrips(userPhone);
    state = list;
  }

  Future<TripModel> bookTrip({
    required String cat,
    required int qty,
    required String pickup,
    required String drop,
    required int when,
    required Map<String, dynamic> car,
    required int fare,
    required int advance,
    required int cashback,
  }) async {
    final tripId = 'TR-${(Random().nextInt(9000) + 1000)}';
    final user = ref.read(authProvider).value;

    final trip = TripModel(
      id: tripId,
      cat: cat,
      qty: qty,
      pickup: pickup,
      drop: drop,
      when: when,
      mine: true,
      rider: {
        'name': user?.name ?? 'Car Owner',
        'rating': 4.9,
        'phone': user?.phone ?? '',
      },
      car: car,
      fare: fare,
      advance: advance,
      status: 'pending',
      cashback: cashback,
      by: user?.phone ?? '',
    );

    // Optimistic insert
    state = [trip, ...state];

    // Deduct advance from wallet
    ref.read(walletProvider.notifier).deductAdvance(advance, tripId, cat);

    // Save to Supabase
    await SupabaseService.bookTrip(trip);

    return trip;
  }

  Future<void> cancelTrip(String tripId) async {
    final trip = state.firstWhere((t) => t.id == tripId, orElse: () => throw Exception('Trip not found'));
    final updated = trip.copyWith(status: 'cancelled');

    state = state.map((t) => t.id == tripId ? updated : t).toList();

    // Refund advance to wallet
    ref.read(walletProvider.notifier).refundAdvance(trip.advance, tripId);

    // Update Supabase
    await SupabaseService.updateTripStatus(tripId, 'cancelled');
  }
}
