import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../config/app_theme.dart';
import '../../providers/driver_provider.dart';

class DriverEarningsTab extends ConsumerWidget {
  const DriverEarningsTab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final driver = ref.watch(driverProvider);

    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          children: [
            const Text('Earnings & Payouts', style: TextStyle(fontSize: 26, fontWeight: FontWeight.w800)),
            const SizedBox(height: 2),
            const Text('Direct bank deposits every Tuesday', style: TextStyle(color: DriverColors.muted, fontSize: 13)),
            const SizedBox(height: 18),

            // Earnings Card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF221F10), DriverColors.card],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: DriverColors.yellow.withOpacity(0.4)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Available Driver Balance', style: TextStyle(color: DriverColors.muted, fontSize: 13)),
                  const SizedBox(height: 6),
                  Text('₹${driver.walletBalance}', style: const TextStyle(fontSize: 34, fontWeight: FontWeight.w900, color: DriverColors.yellow)),
                  const SizedBox(height: 18),
                  SizedBox(
                    width: double.infinity,
                    height: 44,
                    child: ElevatedButton.icon(
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Instant Payout request submitted! Crediting to your linked bank account.')),
                        );
                      },
                      icon: const Icon(CupertinoIcons.arrow_down_to_line_alt, size: 16),
                      label: const Text('Request Instant Payout', style: TextStyle(fontWeight: FontWeight.w700)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: DriverColors.yellow,
                        foregroundColor: DriverColors.onYellow,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            const Text('This Week\'s Performance', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
            const SizedBox(height: 12),

            _payoutRow('Monday Rides (4 trips)', '₹2,450', 'Completed'),
            _payoutRow('Sunday Outstation Bonus', '₹1,800', 'Completed'),
            _payoutRow('Weekly On-Time Incentive', '₹500', 'Bonus Credited'),
          ],
        ),
      ),
    );
  }

  Widget _payoutRow(String title, String amount, String status) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: DriverColors.card,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: DriverColors.line),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
              const SizedBox(height: 2),
              Text(status, style: const TextStyle(fontSize: 12, color: DriverColors.success, fontWeight: FontWeight.w600)),
            ],
          ),
          Text(amount, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
        ],
      ),
    );
  }
}
