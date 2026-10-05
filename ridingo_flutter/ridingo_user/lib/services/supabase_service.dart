import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/trip_model.dart';
import '../models/user_model.dart';
import '../models/wallet_tx_model.dart';

class SupabaseService {
  static const String supabaseUrl = 'https://xxmcjgonsxpjrgdxchwl.supabase.co';
  static const String supabaseAnonKey = 'sb_publishable_xsxb_nMEozSSKCReR_DzkA_aXJIp--c';

  static SupabaseClient get client => Supabase.instance.client;

  static Future<void> initialize() async {
    try {
      await Supabase.initialize(
        url: supabaseUrl,
        anonKey: supabaseAnonKey,
      );
    } catch (e) {
      // Ignore if already initialized
    }
  }

  // --- Profile Sync & Fetch ---
  static Future<void> syncProfile(UserModel user) async {
    try {
      final phone = user.phone;
      if (phone.isEmpty) return;
      await client.from('profiles').upsert({
        'phone': phone,
        'name': user.name,
        'email': user.email,
        'car': user.car,
        'avatar': user.avatar,
        'settings': user.toJson(),
        'updated_at': DateTime.now().toIso8601String(),
      }, onConflict: 'phone');
    } catch (e) {
      // Offline fallback
    }
  }

  static Future<UserModel?> fetchProfile(String phoneOrEmail) async {
    try {
      final cleanDigits = phoneOrEmail.replaceAll(RegExp(r'\D'), '');
      final isEmail = phoneOrEmail.contains('@');

      if (!isEmail && cleanDigits.length >= 10) {
        final last10 = cleanDigits.substring(cleanDigits.length - 10);
        final res = await client.from('profiles').select().ilike('phone', '%$last10%').limit(1);
        if (res.isNotEmpty) {
          return UserModel.fromJson(res.first);
        }
      } else {
        final res = await client.from('profiles').select().ilike('email', phoneOrEmail.trim().toLowerCase()).limit(1);
        if (res.isNotEmpty) {
          return UserModel.fromJson(res.first);
        }
      }
    } catch (e) {
      // Handled
    }
    return null;
  }

  // --- Trips Operations ---
  static Future<List<TripModel>> fetchUserTrips(String phone) async {
    try {
      final cleanDigits = phone.replaceAll(RegExp(r'\D'), '');
      if (cleanDigits.length < 10) return [];
      final last10 = cleanDigits.substring(cleanDigits.length - 10);

      final res = await client
          .from('trips')
          .select()
          .or('by_who.ilike.%$last10%,rider->>phone.ilike.%$last10%')
          .order('created_at', ascending: false);

      return (res as List).map((row) => TripModel.fromJson(row)).toList();
    } catch (e) {
      return [];
    }
  }

  static Future<void> bookTrip(TripModel trip) async {
    try {
      await client.from('trips').insert({
        'id': trip.id,
        'cat': trip.cat,
        'qty': trip.qty,
        'pickup': trip.pickup,
        'drop_loc': trip.drop,
        'when_ts': trip.when,
        'done_ts': trip.done,
        'rider': trip.rider,
        'car': trip.car,
        'fare': trip.fare,
        'advance': trip.advance,
        'status': trip.status,
        'cashback': trip.cashback,
        'by_who': trip.by,
      });
    } catch (e) {
      // Handled
    }
  }

  static Future<void> updateTripStatus(String tripId, String newStatus) async {
    try {
      await client.from('trips').update({
        'status': newStatus,
        'updated_at': DateTime.now().toIso8601String(),
      }).eq('id', tripId);
    } catch (e) {
      // Handled
    }
  }

  // --- Realtime Subscription ---
  static RealtimeChannel subscribeToTrips({
    required Function(TripModel trip) onInsertOrUpdate,
  }) {
    final channel = client.channel('public:trips');
    channel.onPostgresChanges(
      event: PostgresChangeEvent.all,
      schema: 'public',
      table: 'trips',
      callback: (payload) {
        if (payload.newRecord.isNotEmpty) {
          final trip = TripModel.fromJson(payload.newRecord);
          onInsertOrUpdate(trip);
        }
      },
    ).subscribe();
    return channel;
  }

  // --- Wallet Operations ---
  static Future<List<WalletTxModel>> fetchWalletTransactions(String phone) async {
    try {
      final cleanDigits = phone.replaceAll(RegExp(r'\D'), '');
      if (cleanDigits.length < 10) return [];
      final last10 = cleanDigits.substring(cleanDigits.length - 10);

      final res = await client
          .from('wallet_transactions')
          .select()
          .ilike('user_phone', '%$last10%')
          .order('ts', ascending: false);

      return (res as List).map((row) => WalletTxModel.fromJson(row)).toList();
    } catch (e) {
      return [];
    }
  }

  static Future<void> addWalletTransaction(String phone, WalletTxModel tx) async {
    try {
      await client.from('wallet_transactions').insert({
        'user_phone': phone,
        'ts': tx.ts,
        'type': tx.type,
        'amount': tx.amount,
        'title': tx.title,
        'sub': tx.sub,
        'to_dest': tx.to,
      });
    } catch (e) {
      // Handled
    }
  }
}
