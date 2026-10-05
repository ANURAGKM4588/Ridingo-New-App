import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../config/app_theme.dart';
import '../../providers/auth_provider.dart';
import '../../providers/trip_provider.dart';
import '../../providers/wallet_provider.dart';

class BookingBottomSheet extends ConsumerStatefulWidget {
  final String initialCategory;
  const BookingBottomSheet({super.key, this.initialCategory = 'hourly'});

  @override
  ConsumerState<BookingBottomSheet> createState() => _BookingBottomSheetState();
}

class _BookingBottomSheetState extends ConsumerState<BookingBottomSheet> {
  late String _cat;
  int _qty = 2;
  final TextEditingController _pickupCtrl = TextEditingController(text: 'Edappally Toll, Kochi');
  final TextEditingController _dropCtrl = TextEditingController(text: 'Cochin International Airport (COK)');
  bool _isScheduled = false;

  final Map<String, Map<String, dynamic>> _catConfig = {
    'hourly': {'name': 'Hourly Chauffeur', 'base': 398, 'rate': 199, 'unit': 'hrs', 'min': 2, 'max': 12},
    'airport': {'name': 'Airport Transfer', 'base': 699, 'rate': 0, 'unit': 'trip', 'min': 1, 'max': 1},
    'daily': {'name': 'Daily Chauffeur', 'base': 1499, 'rate': 1499, 'unit': 'days', 'min': 1, 'max': 7},
    'outstation': {'name': 'Outstation Trip', 'base': 1899, 'rate': 1899, 'unit': 'days', 'min': 1, 'max': 14},
    'event': {'name': 'Event Chauffeur', 'base': 999, 'rate': 250, 'unit': 'hrs', 'min': 4, 'max': 8},
  };

  @override
  void initState() {
    super.initState();
    _cat = widget.initialCategory;
    _qty = _catConfig[_cat]?['min'] ?? 2;
  }

  int get _calculatedFare {
    final conf = _catConfig[_cat]!;
    if (_cat == 'airport') return conf['base'];
    if (_cat == 'hourly') return conf['base'] + (_qty > 2 ? (_qty - 2) * conf['rate'] as int : 0);
    if (_cat == 'daily' || _cat == 'outstation') return conf['rate'] * _qty;
    if (_cat == 'event') return conf['base'] + (_qty > 4 ? (_qty - 4) * conf['rate'] as int : 0);
    return 500;
  }

  int get _advanceRequired => (_calculatedFare * 0.30).round();
  int get _cashbackAmount => (_calculatedFare * 0.05).round();

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;
    final walletBal = ref.watch(walletBalanceProvider);
    final user = ref.watch(authProvider).value;

    final fare = _calculatedFare;
    final advance = _advanceRequired;
    final hasEnoughBalance = walletBal >= advance;

    return Container(
      padding: EdgeInsets.fromLTRB(20, 16, 20, 20 + bottomInset),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: isDark ? AppColors.lineDark : AppColors.lineLight,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),

            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Book a Driver', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: isDark ? AppColors.inkDark : AppColors.inkLight)),
                IconButton(onPressed: () => Navigator.pop(context), icon: const Icon(CupertinoIcons.xmark_circle_fill, size: 22, color: Colors.grey)),
              ],
            ),
            const SizedBox(height: 12),

            // Category Chips
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: _catConfig.keys.map((k) {
                  final isSel = _cat == k;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text(_catConfig[k]!['name'], style: TextStyle(fontSize: 12, fontWeight: isSel ? FontWeight.w700 : FontWeight.w500)),
                      selected: isSel,
                      selectedColor: AppColors.yellow,
                      onSelected: (_) {
                        setState(() {
                          _cat = k;
                          _qty = _catConfig[k]!['min'];
                        });
                      },
                    ),
                  );
                }).toList(),
              ),
            ),
            const SizedBox(height: 16),

            // Duration Quantity Selector
            if (_catConfig[_cat]!['min'] != _catConfig[_cat]!['max'])
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.fieldDark : AppColors.fieldLight,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Duration / Quantity', style: TextStyle(fontWeight: FontWeight.w600, color: isDark ? AppColors.inkDark : AppColors.inkLight)),
                    Row(
                      children: [
                        IconButton(
                          onPressed: _qty > _catConfig[_cat]!['min'] ? () => setState(() => _qty--) : null,
                          icon: const Icon(CupertinoIcons.minus_circle, size: 24),
                        ),
                        Text('$_qty ${_catConfig[_cat]!['unit']}', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                        IconButton(
                          onPressed: _qty < _catConfig[_cat]!['max'] ? () => setState(() => _qty++) : null,
                          icon: const Icon(CupertinoIcons.plus_circle, size: 24),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            const SizedBox(height: 14),

            // Pickup & Drop
            TextField(
              controller: _pickupCtrl,
              decoration: InputDecoration(
                prefixIcon: const Icon(CupertinoIcons.location_solid, color: AppColors.yellow, size: 20),
                labelText: 'Pickup Location',
                filled: true,
                fillColor: isDark ? AppColors.fieldDark : AppColors.fieldLight,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
              ),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _dropCtrl,
              decoration: InputDecoration(
                prefixIcon: const Icon(CupertinoIcons.placemark_solid, color: Colors.orange, size: 20),
                labelText: 'Destination (Optional)',
                filled: true,
                fillColor: isDark ? AppColors.fieldDark : AppColors.fieldLight,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
              ),
            ),
            const SizedBox(height: 16),

            // Fare Breakdown Card
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: isDark ? AppColors.fieldDark : AppColors.fieldLight,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: isDark ? AppColors.lineDark : AppColors.lineLight),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Total Estimated Fare'),
                      Text('₹$fare', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Advance Payable (30%)', style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.yellow)),
                      Text('₹$advance', style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.yellow, fontSize: 16)),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Wallet Balance: ₹$walletBal', style: TextStyle(fontSize: 12, color: hasEnoughBalance ? AppColors.success : AppColors.danger, fontWeight: FontWeight.w600)),
                      Text('Cashback: +₹$_cashbackAmount', style: const TextStyle(fontSize: 12, color: AppColors.success, fontWeight: FontWeight.w700)),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Submit Button
            SizedBox(
              height: 52,
              child: ElevatedButton(
                onPressed: () async {
                  if (!hasEnoughBalance) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Insufficient balance (₹$walletBal) for advance of ₹$advance. Please top up your wallet.')),
                    );
                    return;
                  }

                  final trip = await ref.read(tripsProvider.notifier).bookTrip(
                        cat: _cat,
                        qty: _qty,
                        pickup: _pickupCtrl.text.trim(),
                        drop: _dropCtrl.text.trim(),
                        when: DateTime.now().millisecondsSinceEpoch,
                        car: user?.car ?? {'model': 'Hyundai Creta', 'plate': 'KL 07 AB 4821'},
                        fare: fare,
                        advance: advance,
                        cashback: _cashbackAmount,
                      );

                  Navigator.pop(context);
                  showDialog(
                    context: context,
                    builder: (c) => AlertDialog(
                      title: const Text('🎉 Chauffeur Confirmed!'),
                      content: Text('Booking ${trip.id} is confirmed. A verified driver is being dispatched to ${_pickupCtrl.text}.'),
                      actions: [
                        TextButton(onPressed: () => Navigator.pop(c), child: const Text('OK')),
                      ],
                    ),
                  );
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.yellow,
                  foregroundColor: AppColors.onYellow,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                child: Text(
                  hasEnoughBalance ? 'Pay 30% Advance · Confirm (₹$advance)' : 'Top Up Wallet to Book',
                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
