import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../config/app_theme.dart';
import '../../providers/driver_provider.dart';

class DriverProfileTab extends ConsumerWidget {
  const DriverProfileTab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final driver = ref.watch(driverProvider);

    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          children: [
            const Text('Driver Partner Profile', style: TextStyle(fontSize: 26, fontWeight: FontWeight.w800)),
            const SizedBox(height: 18),

            // Profile Card
            Center(
              child: Column(
                children: [
                  CircleAvatar(
                    radius: 44,
                    backgroundColor: DriverColors.yellow,
                    child: Text(
                      driver.name.isNotEmpty ? driver.name[0] : 'D',
                      style: const TextStyle(fontSize: 34, fontWeight: FontWeight.w800, color: DriverColors.onYellow),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(driver.name, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
                      const SizedBox(width: 6),
                      const Icon(CupertinoIcons.checkmark_seal_fill, color: Colors.blue, size: 18),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text('${driver.phone} · Partner ID: ${driver.id}', style: const TextStyle(color: DriverColors.muted, fontSize: 13)),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(color: DriverColors.yellow.withOpacity(0.18), borderRadius: BorderRadius.circular(8)),
                    child: Text('${driver.rating} ★ · ${driver.tripsCount} Completed Rides', style: const TextStyle(color: DriverColors.yellow, fontWeight: FontWeight.w800, fontSize: 12)),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 28),

            const Text('Vehicle Transmission Preferences', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
            const SizedBox(height: 8),
            ...driver.vehicleCategories.keys.map((k) {
              return Card(
                margin: const EdgeInsets.only(bottom: 6),
                child: SwitchListTile(
                  value: driver.vehicleCategories[k] ?? true,
                  activeColor: DriverColors.yellow,
                  title: Text(k, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                  subtitle: Text('Accept rides in $k customer cars', style: const TextStyle(fontSize: 12, color: DriverColors.muted)),
                  onChanged: (val) => ref.read(driverProvider.notifier).updateCategories(k, val),
                ),
              );
            }),
            const SizedBox(height: 20),

            const Text('Driver Support', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
            const SizedBox(height: 8),
            Card(
              child: ListTile(
                leading: const Icon(CupertinoIcons.phone_fill, color: DriverColors.yellow),
                title: const Text('24/7 Driver Helpline', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                subtitle: const Text('1800-200-RIDE (Toll-Free)', style: TextStyle(fontSize: 12, color: DriverColors.muted)),
                trailing: const Icon(CupertinoIcons.chevron_right, size: 14),
                onTap: () {},
              ),
            ),
          ],
        ),
      ),
    );
  }
}
