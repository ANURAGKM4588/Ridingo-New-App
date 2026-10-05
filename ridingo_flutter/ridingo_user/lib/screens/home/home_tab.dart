import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../config/app_theme.dart';
import '../../models/trip_model.dart';
import '../../providers/auth_provider.dart';
import '../../providers/trip_provider.dart';
import '../booking/booking_sheet.dart';

// Mirrors the web app CATS definition
const _catsData = {
  'hourly': {'name': 'Hourly Chauffeur', 'blurb': 'Flexible duration for city errands, meetings & shopping'},
  'airport': {'name': 'Airport Transfer', 'blurb': 'To/from airport, any terminal'},
  'daily': {'name': 'Daily Chauffeur', 'blurb': 'Full day (8-12h) city driving'},
  'outstation': {'name': 'Outstation Trip', 'blurb': 'Intercity one-way or round trip'},
  'event': {'name': 'Event Chauffeur', 'blurb': 'Weddings, parties & celebrations'},
};

IconData _catIcon(String key) {
  switch (key) {
    case 'airport': return CupertinoIcons.airplane;
    case 'daily': return CupertinoIcons.sun_max_fill;
    case 'outstation': return CupertinoIcons.compass_fill;
    case 'event': return CupertinoIcons.sparkles;
    default: return CupertinoIcons.clock_fill;
  }
}

const _reviews = [
  {'name': 'Rohit Sharma', 'car': 'BMW 330i', 'init': 'R', 'quote': 'Driver Suresh was punctual and drove with extreme care. Will book again.'},
  {'name': 'Ananya Roy', 'car': 'Hyundai Creta', 'init': 'A', 'quote': 'Seamless airport drop at 4 AM. Very polite and verified chauffeur.'},
  {'name': 'Vikram Patel', 'car': 'Toyota Fortuner', 'init': 'V', 'quote': 'Hired for a full day wedding. Stress-free parking and city driving.'},
  {'name': 'Priya Das', 'car': 'Mercedes E-Class', 'init': 'P', 'quote': 'Outstanding professionalism. Our car was returned spotless. Highly recommend.'},
];

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
    final trips = ref.watch(tripsProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final firstName = (user?.name ?? 'Car Owner').split(' ').first;
    final activeStatuses = ['requested', 'accepted', 'scheduled', 'inprogress'];
    final activeTrips = trips.where((t) => activeStatuses.contains(t.status)).toList();
    final inProgress = trips.cast<TripModel?>().firstWhere(
      (t) => t?.status == 'inprogress',
      orElse: () => null,
    );
    final remainingActive = inProgress != null
        ? activeTrips.where((t) => t.id != inProgress.id).toList()
        : activeTrips;
    final completedTrips = trips.where((t) => t.status == 'completed').toList();

    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(18, 12, 18, 24),
          children: [
            // ── Header Row
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      width: 34,
                      height: 34,
                      decoration: BoxDecoration(color: AppColors.yellow, borderRadius: BorderRadius.circular(10)),
                      child: const Icon(CupertinoIcons.car_fill, color: AppColors.onYellow, size: 18),
                    ),
                    const SizedBox(width: 10),
                    Text(
                      'Ridingo',
                      style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, letterSpacing: -0.4, color: isDark ? AppColors.inkDark : AppColors.inkLight),
                    ),
                  ],
                ),
                IconButton(
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Notifications: You are on the latest driver dispatch update.')),
                    );
                  },
                  icon: Icon(CupertinoIcons.bell, color: isDark ? AppColors.inkDark : AppColors.inkLight, size: 22),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // ── Greeting (web: font 700 34px/1.1, letter-spacing -0.03em)
            Text(
              'Hi, $firstName',
              style: TextStyle(fontSize: 34, fontWeight: FontWeight.w700, height: 1.1, letterSpacing: -1.0, color: isDark ? AppColors.inkDark : AppColors.inkLight),
            ),
            const SizedBox(height: 4),
            Text('Need a driver for your own car?', style: TextStyle(fontSize: 15, color: isDark ? AppColors.mutedDark : AppColors.mutedLight)),
            const SizedBox(height: 16),

            // ── Search Bar (mirrors web uSearchBar)
            GestureDetector(
              onTap: () => _openBooking(context, 'hourly'),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.cardDark : AppColors.cardLight,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: isDark ? AppColors.lineDark : AppColors.lineLight),
                  boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 8, offset: const Offset(0, 2))],
                ),
                child: Row(
                  children: [
                    Icon(CupertinoIcons.search, color: isDark ? AppColors.mutedDark : AppColors.mutedLight, size: 18),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text('Where to? Search pickup location\u2026', style: TextStyle(fontSize: 14, color: isDark ? AppColors.mutedDark : AppColors.mutedLight)),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(color: AppColors.yellow, borderRadius: BorderRadius.circular(8)),
                      child: const Text('Book', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: AppColors.onYellow)),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // ── Live Trip Hero Card
            if (inProgress != null) ...[
              _liveHeroCard(inProgress, isDark),
              const SizedBox(height: 16),
            ],

            // ── Active Trips
            if (remainingActive.isNotEmpty) ...[
              _secHeader('Your trips', '${remainingActive.length} active', isDark),
              const SizedBox(height: 10),
              ...remainingActive.take(2).map((t) => _homeTripCard(t, isDark)),
            ],

            // ── Book a driver
            _secHeader('Book a driver', 'Pay 30% now', isDark),
            const SizedBox(height: 10),
            _bentoHero(context, isDark),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(child: _bentoCard(context, 'airport', isDark)),
                const SizedBox(width: 10),
                Expanded(child: _bentoCard(context, 'daily', isDark)),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(child: _bentoCard(context, 'outstation', isDark)),
                const SizedBox(width: 10),
                Expanded(child: _bentoCard(context, 'event', isDark)),
              ],
            ),

            // ── Popular rides (rebook)
            if (completedTrips.isNotEmpty) ...[
              _secHeader('Popular rides', 'Repeat booking', isDark),
              const SizedBox(height: 10),
              ...completedTrips.take(3).map((t) => _rebookCard(context, t, isDark)),
            ],

            // ── Reviews
            const SizedBox(height: 8),
            Padding(
              padding: const EdgeInsets.fromLTRB(4, 18, 4, 0),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Keys in good hands', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, letterSpacing: -0.5, color: isDark ? AppColors.inkDark : AppColors.inkLight)),
                      Text('Verified stories from car owners', style: TextStyle(fontSize: 12, color: isDark ? AppColors.mutedDark : AppColors.mutedLight)),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(color: AppColors.yellowSoftLight, borderRadius: BorderRadius.circular(8)),
                    child: const Text('4.9 \u2605', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: AppColors.onYellow)),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              height: 162,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                itemCount: _reviews.length,
                itemBuilder: (_, i) => _reviewCard(_reviews[i], isDark),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _secHeader(String title, String tag, bool isDark) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(4, 22, 4, 0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        crossAxisAlignment: CrossAxisAlignment.baseline,
        textBaseline: TextBaseline.alphabetic,
        children: [
          Text(title, style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, letterSpacing: -0.4, color: isDark ? AppColors.inkDark : AppColors.inkLight)),
          Text(tag, style: TextStyle(fontSize: 13.5, color: isDark ? AppColors.mutedDark : AppColors.mutedLight)),
        ],
      ),
    );
  }

  Widget _bentoHero(BuildContext context, bool isDark) {
    return InkWell(
      onTap: () => _openBooking(context, 'hourly'),
      borderRadius: BorderRadius.circular(22),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isDark ? AppColors.cardDark : AppColors.cardLight,
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: isDark ? AppColors.lineDark : AppColors.lineLight),
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
                    SizedBox(width: 3),
                    Icon(CupertinoIcons.chevron_right, size: 13, color: AppColors.yellow),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 14),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(color: AppColors.yellow.withOpacity(0.18), borderRadius: BorderRadius.circular(12)),
                  child: const Icon(CupertinoIcons.clock_fill, color: AppColors.yellow, size: 22),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Hourly Chauffeur driver', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: isDark ? AppColors.inkDark : AppColors.inkLight)),
                      const SizedBox(height: 2),
                      Text('Flexible duration for city errands, meetings & shopping', style: TextStyle(fontSize: 13, color: isDark ? AppColors.mutedDark : AppColors.mutedLight, height: 1.3)),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Divider(color: isDark ? AppColors.lineDark : AppColors.lineLight, height: 1),
            const SizedBox(height: 10),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Minimum 2 hours \u00b7 In-city', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: isDark ? AppColors.mutedDark : AppColors.mutedLight)),
                Text('Hire for your car', style: TextStyle(fontSize: 12, color: isDark ? AppColors.mutedDark : AppColors.mutedLight)),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _bentoCard(BuildContext context, String catKey, bool isDark) {
    final cat = _catsData[catKey]!;
    return InkWell(
      onTap: () => _openBooking(context, catKey),
      borderRadius: BorderRadius.circular(18),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: isDark ? AppColors.cardDark : AppColors.cardLight,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: isDark ? AppColors.lineDark : AppColors.lineLight),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(color: AppColors.yellow.withOpacity(0.15), borderRadius: BorderRadius.circular(10)),
                  child: Icon(_catIcon(catKey), color: AppColors.yellow, size: 19),
                ),
                Icon(CupertinoIcons.chevron_right, size: 12, color: isDark ? AppColors.mutedDark : AppColors.mutedLight),
              ],
            ),
            const SizedBox(height: 10),
            Text(cat['name']!, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: isDark ? AppColors.inkDark : AppColors.inkLight)),
            const SizedBox(height: 2),
            Text(cat['blurb']!, maxLines: 2, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 11.5, color: isDark ? AppColors.mutedDark : AppColors.mutedLight, height: 1.3)),
          ],
        ),
      ),
    );
  }

  Widget _liveHeroCard(TripModel trip, bool isDark) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? AppColors.cardDark : AppColors.cardLight,
        borderRadius: BorderRadius.circular(22),
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
                child: const Text('\u25cf LIVE TRIP IN PROGRESS', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: AppColors.success)),
              ),
              Text(trip.id, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12)),
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

  Widget _homeTripCard(TripModel trip, bool isDark) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? AppColors.cardDark : AppColors.cardLight,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: isDark ? AppColors.lineDark : AppColors.lineLight),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(color: AppColors.yellow.withOpacity(0.18), borderRadius: BorderRadius.circular(10)),
            child: const Icon(CupertinoIcons.car_fill, color: AppColors.yellow, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('${trip.cat.toUpperCase()} \u00b7 ${trip.id}', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                Text(trip.pickup, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 12, color: isDark ? AppColors.mutedDark : AppColors.mutedLight)),
              ],
            ),
          ),
          Text('\u20b9${trip.fare}', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
        ],
      ),
    );
  }

  Widget _rebookCard(BuildContext context, TripModel trip, bool isDark) {
    final catName = _catsData[trip.cat]?['name'] ?? trip.cat;
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isDark ? AppColors.cardDark : AppColors.cardLight,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: isDark ? AppColors.lineDark : AppColors.lineLight),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(color: AppColors.yellow.withOpacity(0.15), borderRadius: BorderRadius.circular(10)),
            child: Icon(_catIcon(trip.cat), color: AppColors.yellow, size: 18),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  trip.drop.isNotEmpty ? trip.drop : trip.pickup,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: isDark ? AppColors.inkDark : AppColors.inkLight),
                ),
                const SizedBox(height: 2),
                Text(
                  'From ${trip.pickup} \u00b7 $catName',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontSize: 12, color: isDark ? AppColors.mutedDark : AppColors.mutedLight),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          InkWell(
            onTap: () => _openBooking(context, trip.cat),
            borderRadius: BorderRadius.circular(999),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: isDark ? AppColors.fieldDark : AppColors.fieldLight,
                borderRadius: BorderRadius.circular(999),
                border: Border.all(color: isDark ? AppColors.lineDark : AppColors.lineLight),
              ),
              child: Row(
                children: [
                  Text('Rebook', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: isDark ? AppColors.inkDark : AppColors.inkLight)),
                  const SizedBox(width: 4),
                  Icon(CupertinoIcons.chevron_right, size: 11, color: isDark ? AppColors.mutedDark : AppColors.mutedLight),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _reviewCard(Map<String, String> r, bool isDark) {
    return Container(
      width: 265,
      margin: const EdgeInsets.only(right: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isDark ? AppColors.cardDark : AppColors.cardLight,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: isDark ? AppColors.lineDark : AppColors.lineLight),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 16,
                backgroundColor: AppColors.yellow,
                child: Text(r['init']!, style: const TextStyle(color: AppColors.onYellow, fontWeight: FontWeight.w800, fontSize: 13)),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(child: Text(r['name']!, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700), overflow: TextOverflow.ellipsis)),
                        Container(
                          width: 16,
                          height: 16,
                          decoration: const BoxDecoration(color: AppColors.success, shape: BoxShape.circle),
                          child: const Icon(CupertinoIcons.checkmark, size: 9, color: Colors.white),
                        ),
                      ],
                    ),
                    Text(r['car']!, style: const TextStyle(fontSize: 11, color: Colors.grey)),
                  ],
                ),
              ),
              const SizedBox(width: 6),
              const Row(
                children: [
                  Icon(CupertinoIcons.star_fill, size: 11, color: AppColors.yellow),
                  SizedBox(width: 2),
                  Text('5.0', style: TextStyle(color: AppColors.yellow, fontWeight: FontWeight.w800, fontSize: 12)),
                ],
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            '\u201c${r['quote']}\u201d',
            maxLines: 3,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 12, height: 1.4, fontStyle: FontStyle.italic),
          ),
        ],
      ),
    );
  }
}

