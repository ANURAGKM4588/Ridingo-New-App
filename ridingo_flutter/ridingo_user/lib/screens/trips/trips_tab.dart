import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../config/app_theme.dart';
import '../../models/trip_model.dart';
import '../../providers/trip_provider.dart';

class TripsTab extends ConsumerStatefulWidget {
  const TripsTab({super.key});

  @override
  ConsumerState<TripsTab> createState() => _TripsTabState();
}

class _TripsTabState extends ConsumerState<TripsTab> {
  String _activeFilter = 'all';

  @override
  Widget build(BuildContext context) {
    final trips = ref.watch(tripsProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final filtered = trips.where((t) {
      if (_activeFilter == 'up') return t.status == 'pending' || t.status == 'assigned' || t.status == 'inprogress';
      if (_activeFilter == 'done') return t.status == 'completed';
      if (_activeFilter == 'cancel') return t.status == 'cancelled';
      return true;
    }).toList();

    return Scaffold(
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 6),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'History',
                    style: TextStyle(fontSize: 34, fontWeight: FontWeight.w700, height: 1.1, letterSpacing: -1.0, color: isDark ? AppColors.inkDark : AppColors.inkLight),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'All your driver bookings',
                    style: TextStyle(fontSize: 15, color: isDark ? AppColors.mutedDark : AppColors.mutedLight),
                  ),
                  const SizedBox(height: 14),

                  // Filter Chips
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        _filterChip('all', 'All Trips'),
                        const SizedBox(width: 8),
                        _filterChip('up', 'Upcoming'),
                        const SizedBox(width: 8),
                        _filterChip('done', 'Completed'),
                        const SizedBox(width: 8),
                        _filterChip('cancel', 'Cancelled'),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const Divider(height: 1),

            // Trips List
            Expanded(
              child: filtered.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(CupertinoIcons.clock, size: 48, color: isDark ? AppColors.mutedDark : AppColors.mutedLight),
                          const SizedBox(height: 12),
                          Text('No trips here yet', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: isDark ? AppColors.mutedDark : AppColors.mutedLight)),
                        ],
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: filtered.length,
                      itemBuilder: (ctx, i) => _buildTripCard(context, filtered[i], isDark),
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _filterChip(String key, String label) {
    final isSelected = _activeFilter == key;
    return ChoiceChip(
      label: Text(label, style: TextStyle(fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500)),
      selected: isSelected,
      onSelected: (_) => setState(() => _activeFilter = key),
      selectedColor: AppColors.yellow,
      backgroundColor: Colors.transparent,
      side: BorderSide(color: isSelected ? AppColors.yellow : Colors.grey.withOpacity(0.3)),
    );
  }

  Widget _buildTripCard(BuildContext context, TripModel trip, bool isDark) {
    Color badgeColor;
    String badgeText;

    if (trip.status == 'completed') {
      badgeColor = AppColors.success;
      badgeText = 'COMPLETED';
    } else if (trip.status == 'cancelled') {
      badgeColor = AppColors.danger;
      badgeText = 'CANCELLED';
    } else if (trip.status == 'inprogress') {
      badgeColor = AppColors.yellow;
      badgeText = 'IN PROGRESS';
    } else {
      badgeColor = Colors.orange;
      badgeText = 'CONFIRMED';
    }

    final isCancellable = trip.status == 'pending' || trip.status == 'assigned';

    return Card(
      margin: const EdgeInsets.only(bottom: 14),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(color: badgeColor.withOpacity(0.16), borderRadius: BorderRadius.circular(6)),
                  child: Text(badgeText, style: TextStyle(color: badgeColor, fontSize: 11, fontWeight: FontWeight.w800)),
                ),
                Text(trip.id, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
              ],
            ),
            const SizedBox(height: 12),
            Text(trip.pickup, style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: isDark ? AppColors.inkDark : AppColors.inkLight)),
            if (trip.drop.isNotEmpty) ...[
              const SizedBox(height: 4),
              Text('To: ${trip.drop}', style: TextStyle(fontSize: 13, color: isDark ? AppColors.mutedDark : AppColors.mutedLight)),
            ],
            const SizedBox(height: 12),
            Divider(color: isDark ? AppColors.lineDark : AppColors.lineLight),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Total Fare: ₹${trip.fare}', style: const TextStyle(fontWeight: FontWeight.w700)),
                    Text('Advance Paid: ₹${trip.advance}', style: const TextStyle(fontSize: 12, color: AppColors.success, fontWeight: FontWeight.w600)),
                  ],
                ),
                if (isCancellable)
                  TextButton(
                    onPressed: () async {
                      final confirm = await showDialog<bool>(
                        context: context,
                        builder: (c) => AlertDialog(
                          title: const Text('Cancel Booking?'),
                          content: Text('Your advance of ₹${trip.advance} will be refunded to your digital wallet immediately.'),
                          actions: [
                            TextButton(onPressed: () => Navigator.pop(c, false), child: const Text('Keep Booking')),
                            TextButton(onPressed: () => Navigator.pop(c, true), child: const Text('Cancel & Refund', style: TextStyle(color: AppColors.danger))),
                          ],
                        ),
                      );
                      if (confirm == true) {
                        await ref.read(tripsProvider.notifier).cancelTrip(trip.id);
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('Booking ${trip.id} cancelled. ₹${trip.advance} refunded.')),
                        );
                      }
                    },
                    child: const Text('Cancel Ride', style: TextStyle(color: AppColors.danger, fontWeight: FontWeight.w700)),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
