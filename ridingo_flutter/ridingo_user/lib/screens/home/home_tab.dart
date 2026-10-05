import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../config/app_theme.dart';
import '../../models/trip_model.dart';
import '../../providers/auth_provider.dart';
import '../../providers/trip_provider.dart';
import '../booking/booking_sheet.dart';

class HomeTab extends ConsumerWidget {
  const HomeTab({super.key});

  void _openBooking(BuildContext context, String categoryKey) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => BookingBottomSheet(initialCategory: categoryKey),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider).value;
    final activeRide = ref.watch(activeRideProvider);
    final trips = ref.watch(tripsProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final firstName = (user?.name ?? 'Car Owner').split(' ').first;
    final upcomingTrips = trips.where((t) => t.status == 'pending' || t.status == 'assigned').toList();

    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          children: [
            // Top Header Row
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: AppColors.yellow,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(CupertinoIcons.car_fill, color: AppColors.onYellow, size: 20),
                    ),
                    const SizedBox(width: 10),
                    Text(
                      'Ridingo',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                        color: isDark ? AppColors.inkDark : AppColors.inkLight,
                      ),
                    ),
                  ],
                ),
                IconButton(
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Notifications: You are on the latest driver dispatch update.')),
                    );
                  },
                  icon: Icon(CupertinoIcons.bell, color: isDark ? AppColors.inkDark : AppColors.inkLight),
                ),
              ],
            ),
            const SizedBox(height: 14),

            // Greeting
            Text(
              'Hi, $firstName',
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.w800,
                letterSpacing: -0.5,
                color: isDark ? AppColors.inkDark : AppColors.inkLight,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Need a driver for your own car?',
              style: TextStyle(
                fontSize: 15,
                color: isDark ? AppColors.mutedDark : AppColors.mutedLight,
              ),
            ),
            const SizedBox(height: 18),

            // Active Ride Card (if present)
            if (activeRide != null) ...[
              _buildLiveHeroCard(context, activeRide, isDark),
              const SizedBox(height: 20),
            ],

            // Upcoming Trips Preview (if any)
            if (upcomingTrips.isNotEmpty) ...[
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Your Trips', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: isDark ? AppColors.inkDark : AppColors.inkLight)),
                  Text('${upcomingTrips.length} active', style: const TextStyle(fontSize: 13, color: AppColors.yellow, fontWeight: FontWeight.w700)),
                ],
              ),
              const SizedBox(height: 10),
              ...upcomingTrips.take(2).map((t) => _buildTripCard(context, t, isDark)),
              const SizedBox(height: 20),
            ],

            // Bento Grid Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Book a Driver', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: isDark ? AppColors.inkDark : AppColors.inkLight)),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(color: AppColors.yellow.withOpacity(0.18), borderRadius: BorderRadius.circular(6)),
                  child: const Text('Pay 30% now', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.yellow)),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Bento Grid: Featured Hourly Chauffeur
            InkWell(
              onTap: () => _openBooking(context, 'hourly'),
              borderRadius: BorderRadius.circular(16),
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: isDark
                        ? [const Color(0xFF26210A), AppColors.cardDark]
                        : [const Color(0xFFFFF9E6), AppColors.cardLight],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.yellow.withOpacity(0.4), width: 1.5),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(color: AppColors.yellow, borderRadius: BorderRadius.circular(6)),
                          child: const Text('Most Popular', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: AppColors.onYellow)),
                        ),
                        const Row(
                          children: [
                            Text('Book now', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.yellow)),
                            Icon(CupertinoIcons.chevron_right, size: 14, color: AppColors.yellow),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(color: AppColors.yellow.withOpacity(0.2), borderRadius: BorderRadius.circular(12)),
                          child: const Icon(CupertinoIcons.clock_fill, color: AppColors.yellow, size: 24),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Hourly Chauffeur', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: isDark ? AppColors.inkDark : AppColors.inkLight)),
                              const SizedBox(height: 2),
                              Text('Flexible duration for city errands, meetings & shopping', style: TextStyle(fontSize: 13, color: isDark ? AppColors.mutedDark : AppColors.mutedLight)),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Divider(color: isDark ? AppColors.lineDark : AppColors.lineLight),
                    const SizedBox(height: 6),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Min 2 hours · In-city', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: isDark ? AppColors.mutedDark : AppColors.mutedLight)),
                        const Text('From ₹199/hr', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: AppColors.yellow)),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),

            // Other Categories
            Row(
              children: [
                Expanded(child: _bentoSmallCard(context, 'airport', 'Airport Run', 'To/From Airport', CupertinoIcons.airplane, isDark)),
                const SizedBox(width: 12),
                Expanded(child: _bentoSmallCard(context, 'daily', 'Daily Chauffeur', 'Full day (8-12h)', CupertinoIcons.sun_max_fill, isDark)),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: _bentoSmallCard(context, 'outstation', 'Outstation Trip', 'Intercity one/round', CupertinoIcons.compass_fill, isDark)),
                const SizedBox(width: 12),
                Expanded(child: _bentoSmallCard(context, 'event', 'Event Chauffeur', 'Weddings & Parties', CupertinoIcons.sparkles, isDark)),
              ],
            ),
            const SizedBox(height: 24),

            // Customer Reviews Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Keys in Good Hands', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: isDark ? AppColors.inkDark : AppColors.inkLight)),
                    Text('Verified stories from car owners', style: TextStyle(fontSize: 13, color: isDark ? AppColors.mutedDark : AppColors.mutedLight)),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(color: AppColors.yellowSoftLight, borderRadius: BorderRadius.circular(8)),
                  child: const Text('4.9 ★', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: AppColors.onYellow)),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Reviews Horizontal Scroll
            SizedBox(
              height: 140,
              child: ListView(
                scrollDirection: Axis.horizontal,
                children: [
                  _reviewCard('Rohit Sharma', 'BMW 330i', 'Driver Suresh was punctual and drove with extreme care. Will book again.', isDark),
                  _reviewCard('Ananya Roy', 'Hyundai Creta', 'Seamless airport drop at 4 AM. Very polite and verified chauffeur.', isDark),
                  _reviewCard('Vikram Patel', 'Toyota Fortuner', 'Hired for a full day wedding. Stress-free parking and city driving.', isDark),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _bentoSmallCard(BuildContext context, String catKey, String title, String sub, IconData icon, bool isDark) {
    return InkWell(
      onTap: () => _openBooking(context, catKey),
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: isDark ? AppColors.cardDark : AppColors.cardLight,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: isDark ? AppColors.lineDark : AppColors.lineLight),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: AppColors.yellow, size: 24),
            const SizedBox(height: 12),
            Text(title, style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: isDark ? AppColors.inkDark : AppColors.inkLight)),
            const SizedBox(height: 2),
            Text(sub, style: TextStyle(fontSize: 12, color: isDark ? AppColors.mutedDark : AppColors.mutedLight)),
          ],
        ),
      ),
    );
  }

  Widget _buildLiveHeroCard(BuildContext context, TripModel trip, bool isDark) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? AppColors.cardDark : AppColors.cardLight,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.yellow, width: 1.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(color: AppColors.successBg, borderRadius: BorderRadius.circular(6)),
                child: const Text('● LIVE TRIP IN PROGRESS', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: AppColors.success)),
              ),
              Text(trip.id, style: const TextStyle(fontWeight: FontWeight.w700)),
            ],
          ),
          const SizedBox(height: 12),
          Text(trip.pickup, style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: isDark ? AppColors.inkDark : AppColors.inkLight)),
          if (trip.drop.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text('To: ${trip.drop}', style: TextStyle(fontSize: 14, color: isDark ? AppColors.mutedDark : AppColors.mutedLight)),
          ],
        ],
      ),
    );
  }

  Widget _buildTripCard(BuildContext context, TripModel trip, bool isDark) {
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(color: AppColors.yellow.withOpacity(0.2), borderRadius: BorderRadius.circular(10)),
              child: const Icon(CupertinoIcons.car_detailed, color: AppColors.yellow, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('${trip.cat.toUpperCase()} · ${trip.id}', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                  Text(trip.pickup, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 12, color: isDark ? AppColors.mutedDark : AppColors.mutedLight)),
                ],
              ),
            ),
            Text('₹${trip.fare}', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
          ],
        ),
      ),
    );
  }

  Widget _reviewCard(String name, String car, String quote, bool isDark) {
    return Container(
      width: 260,
      margin: const EdgeInsets.only(right: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isDark ? AppColors.cardDark : AppColors.cardLight,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: isDark ? AppColors.lineDark : AppColors.lineLight),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 14,
                backgroundColor: AppColors.yellow,
                child: Text(name[0], style: const TextStyle(color: AppColors.onYellow, fontWeight: FontWeight.w800, fontSize: 12)),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(name, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                    Text(car, style: const TextStyle(fontSize: 11, color: Colors.grey)),
                  ],
                ),
              ),
              const Text('5.0 ★', style: TextStyle(color: AppColors.yellow, fontWeight: FontWeight.w800, fontSize: 12)),
            ],
          ),
          const SizedBox(height: 8),
          Text('“$quote”', maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12, height: 1.3)),
        ],
      ),
    );
  }
}
