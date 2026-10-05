import 'package:supabase_flutter/supabase_flutter.dart';

class DriverSupabaseService {
  static const String supabaseUrl = 'https://xxmcjgonsxpjrgdxchwl.supabase.co';
  static const String supabaseAnonKey = 'sb_publishable_xsxb_nMEozSSKCReR_DzkA_aXJIp--c';

  static SupabaseClient get client => Supabase.instance.client;

  static Future<void> initialize() async {
    try {
      await Supabase.initialize(
        url: supabaseUrl,
        anonKey: supabaseAnonKey,
      );
    } catch (_) {}
  }

  static Future<List<Map<String, dynamic>>> fetchIncomingTrips() async {
    try {
      final res = await client
          .from('trips')
          .select()
          .inFilter('status', ['pending', 'assigned', 'inprogress'])
          .order('created_at', ascending: false);
      return List<Map<String, dynamic>>.from(res as List);
    } catch (e) {
      return [];
    }
  }

  static Future<void> acceptTrip(String tripId, Map<String, dynamic> driverData) async {
    try {
      await client.from('trips').update({
        'status': 'assigned',
        'driver': driverData,
        'updated_at': DateTime.now().toIso8601String(),
      }).eq('id', tripId);
    } catch (_) {}
  }

  static Future<void> startTrip(String tripId) async {
    try {
      await client.from('trips').update({
        'status': 'inprogress',
        'updated_at': DateTime.now().toIso8601String(),
      }).eq('id', tripId);
    } catch (_) {}
  }

  static Future<void> completeTrip(String tripId) async {
    try {
      await client.from('trips').update({
        'status': 'completed',
        'done_ts': DateTime.now().millisecondsSinceEpoch,
        'updated_at': DateTime.now().toIso8601String(),
      }).eq('id', tripId);
    } catch (_) {}
  }

  static RealtimeChannel subscribeToDriverTrips(Function() onRefresh) {
    final channel = client.channel('public:driver_trips');
    channel.onPostgresChanges(
      event: PostgresChangeEvent.all,
      schema: 'public',
      table: 'trips',
      callback: (_) => onRefresh(),
    ).subscribe();
    return channel;
  }
}
