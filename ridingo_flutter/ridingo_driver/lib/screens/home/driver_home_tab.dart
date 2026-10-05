import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../config/app_theme.dart';
import '../../models/driver_model.dart';
import '../../providers/driver_provider.dart';

class DriverHomeTab extends ConsumerWidget {
  const DriverHomeTab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final driver = ref.watch(driverProvider);
    final trips = ref.watch(incomingTripsProvider);

    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          children: [
            // Top Driver Row
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: DriverColors.yellow,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(CupertinoIcons.car_fill, color: DriverColors.onYellow, size: 20),
                    ),
                    const SizedBox(width: 10),
                    const Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Ridingo Partner', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 17)),
                        Text('Driver Console', style: TextStyle(color: DriverColors.muted, fontSize: 11)),
                      ],
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: driver.online ? DriverColors.success.withOpacity(0.18) : Colors.grey.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 4,
                        backgroundColor: driver.online ? DriverColors.success : Colors.grey,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        driver.online ? 'ONLINE' : 'OFFLINE',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          color: driver.online ? DriverColors.success : Colors.grey,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Online Toggle Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: driver.online
                      ? [const Color(0xFF142B1B), DriverColors.card]
                      : [const Color(0xFF261818), DriverColors.card],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: driver.online ? DriverColors.success.withOpacity(0.4) : DriverColors.danger.withOpacity(0.4),
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        driver.online ? 'You are receiving trips' : 'You are offline',
                        style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        driver.online ? 'Stay ready for nearby car owner requests' : 'Switch online to accept ride bookings',
                        style: const TextStyle(fontSize: 12, color: DriverColors.muted),
                      ),
                    ],
                  ),
                  CupertinoSwitch(
                    value: driver.online,
                    activeColor: DriverColors.success,
                    onChanged: (_) => ref.read(driverProvider.notifier).toggleOnline(),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Today's Metrics Grid
            Row(
              children: [
                Expanded(
                  child: _metricCard('Today\'s Payout', '₹${driver.todayEarnings}', CupertinoIcons.money_dollar_circle_fill, DriverColors.yellow),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _metricCard('Trips Done', '${driver.tripsCount}', CupertinoIcons.checkmark_circle_fill, DriverColors.success),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _metricCard('Rating', '${driver.rating} ★', CupertinoIcons.star_fill, Colors.orange),
                ),
              ],
            ),
            const SizedBox(height: 22),

            // Incoming Trips Feed Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Available Trip Requests', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
                Text('${trips.length} available', style: const TextStyle(fontSize: 13, color: DriverColors.yellow, fontWeight: FontWeight.w700)),
              ],
            ),
            const SizedBox(height: 12),

            // Trips List
            if (!driver.online)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 40),
                child: Center(
                  child: Text('Go Online to receive live trip requests', style: TextStyle(color: DriverColors.muted)),
                ),
              )
            else if (trips.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 40),
                child: Center(
                  child: Text('Looking for nearby ride requests...', style: TextStyle(color: DriverColors.muted)),
                ),
              )
            else
              ...trips.map((t) => _buildTripRequestCard(context, ref, t, driver)),
          ],
        ),
      ),
    );
  }

  Widget _metricCard(String label, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: DriverColors.card,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: DriverColors.line),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(height: 8),
          Text(value, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
          const SizedBox(height: 2),
          Text(label, style: const TextStyle(fontSize: 11, color: DriverColors.muted)),
        ],
      ),
    );
  }

  Widget _buildTripRequestCard(BuildContext context, WidgetRef ref, Map<String, dynamic> trip, DriverModel driver) {
    final status = trip['status'] ?? 'pending';
    final rider = trip['rider'] != null ? Map<String, dynamic>.from(trip['rider']) : {};
    final car = trip['car'] != null ? Map<String, dynamic>.from(trip['car']) : {};

    final isAssigned = status == 'assigned';
    final isInProgress = status == 'inprogress';

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: DriverColors.card,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isAssigned || isInProgress ? DriverColors.yellow : DriverColors.line),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(color: DriverColors.yellow.withOpacity(0.18), borderRadius: BorderRadius.circular(6)),
                child: Text(
                  (trip['cat'] ?? 'hourly').toString().toUpperCase(),
                  style: const TextStyle(color: DriverColors.yellow, fontWeight: FontWeight.w800, fontSize: 11),
                ),
              ),
              Text('Total Fare: ₹${trip['fare']}', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
            ],
          ),
          const SizedBox(height: 12),
          Text(rider['name'] ?? 'Car Owner', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
          Text('Car: ${car['model'] ?? 'Customer Car'} (${car['plate'] ?? 'Verified'})', style: const TextStyle(color: DriverColors.muted, fontSize: 13)),
          const SizedBox(height: 10),
          Row(
            children: [
              const Icon(CupertinoIcons.location_solid, size: 16, color: DriverColors.yellow),
              const SizedBox(width: 6),
              Expanded(
                child: Text(trip['pickup'] ?? '', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              if (status == 'pending') ...[
                Expanded(
                  child: ElevatedButton(
                    onPressed: () async {
                      await ref.read(incomingTripsProvider.notifier).accept(trip['id']);
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('Trip ${trip['id']} accepted! Head to pickup location.')),
                      );
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: DriverColors.yellow,
                      foregroundColor: DriverColors.onYellow,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    child: const Text('Accept Trip', style: TextStyle(fontWeight: FontWeight.w700)),
                  ),
                ),
              ] else if (isAssigned) ...[
                Expanded(
                  child: ElevatedButton(
                    onPressed: () async {
                      await ref.read(incomingTripsProvider.notifier).start(trip['id']);
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: DriverColors.success,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    child: const Text('Start Trip', style: TextStyle(fontWeight: FontWeight.w700)),
                  ),
                ),
              ] else if (isInProgress) ...[
                Expanded(
                  child: ElevatedButton(
                    onPressed: () async {
                      await ref.read(incomingTripsProvider.notifier).complete(trip['id']);
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('Trip ${trip['id']} completed! Earnings credited.')),
                      );
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.blue,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    child: const Text('Complete Trip', style: TextStyle(fontWeight: FontWeight.w700)),
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }
}
