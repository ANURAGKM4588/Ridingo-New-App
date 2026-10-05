import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../config/app_theme.dart';
import '../../models/wallet_tx_model.dart';
import '../../providers/wallet_provider.dart';

class WalletTab extends ConsumerWidget {
  const WalletTab({super.key});

  void _openAddMoneySheet(BuildContext context, WidgetRef ref) {
    int selectedAmount = 1000;
    final ctrl = TextEditingController(text: '1000');

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        final isDark = Theme.of(ctx).brightness == Brightness.dark;
        final bottomInset = MediaQuery.of(ctx).viewInsets.bottom;

        return StatefulBuilder(
          builder: (context, setSheetState) {
            return Container(
              padding: EdgeInsets.fromLTRB(24, 20, 24, 20 + bottomInset),
              decoration: BoxDecoration(
                color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
              ),
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
                  const SizedBox(height: 18),
                  Text('Add Money to Wallet', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: isDark ? AppColors.inkDark : AppColors.inkLight)),
                  const SizedBox(height: 4),
                  Text('Used for instant 30% advance booking payments', style: TextStyle(color: isDark ? AppColors.mutedDark : AppColors.mutedLight, fontSize: 13)),
                  const SizedBox(height: 20),
                  TextField(
                    controller: ctrl,
                    keyboardType: TextInputType.number,
                    style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w800),
                    decoration: InputDecoration(
                      prefixText: '₹ ',
                      prefixStyle: const TextStyle(fontSize: 28, fontWeight: FontWeight.w800),
                      filled: true,
                      fillColor: isDark ? AppColors.fieldDark : AppColors.fieldLight,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
                    ),
                    onChanged: (v) {
                      setSheetState(() => selectedAmount = int.tryParse(v) ?? 0);
                    },
                  ),
                  const SizedBox(height: 14),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [500, 1000, 2000, 5000].map((amt) {
                      final isSel = selectedAmount == amt;
                      return ChoiceChip(
                        label: Text('+₹$amt', style: TextStyle(fontWeight: isSel ? FontWeight.w700 : FontWeight.w500)),
                        selected: isSel,
                        selectedColor: AppColors.yellow,
                        onSelected: (_) {
                          setSheetState(() {
                            selectedAmount = amt;
                            ctrl.text = amt.toString();
                          });
                        },
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    height: 50,
                    child: ElevatedButton(
                      onPressed: selectedAmount <= 0
                          ? null
                          : () async {
                              await ref.read(walletProvider.notifier).addFunds(selectedAmount);
                              Navigator.pop(ctx);
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text('₹$selectedAmount added to your digital wallet!'),
                                  backgroundColor: AppColors.success,
                                ),
                              );
                            },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.yellow,
                        foregroundColor: AppColors.onYellow,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                      child: Text('Proceed to Pay ₹$selectedAmount', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final balance = ref.watch(walletBalanceProvider);
    final txs = ref.watch(walletProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          children: [
            Text(
              'Wallet',
              style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800, color: isDark ? AppColors.inkDark : AppColors.inkLight),
            ),
            const SizedBox(height: 2),
            Text(
              'Advance payments and rewards',
              style: TextStyle(fontSize: 14, color: isDark ? AppColors.mutedDark : AppColors.mutedLight),
            ),
            const SizedBox(height: 16),

            // Digital Wallet Card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF1E1E24), Color(0xFF121215)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(color: Colors.black.withOpacity(0.2), blurRadius: 10, offset: const Offset(0, 4)),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Ridingo',
                        style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w800),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.yellow.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Text('Digital Wallet', style: TextStyle(color: AppColors.yellow, fontSize: 11, fontWeight: FontWeight.w700)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  const Text('Current Balance', style: TextStyle(color: Colors.white70, fontSize: 13)),
                  const SizedBox(height: 4),
                  Text(
                    '₹$balance',
                    style: const TextStyle(color: Colors.white, fontSize: 36, fontWeight: FontWeight.w900),
                  ),
                  const SizedBox(height: 20),
                  SizedBox(
                    width: double.infinity,
                    height: 44,
                    child: ElevatedButton.icon(
                      onPressed: () => _openAddMoneySheet(context, ref),
                      icon: const Icon(CupertinoIcons.add, size: 16),
                      label: const Text('Add Funds', style: TextStyle(fontWeight: FontWeight.w700)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.yellow,
                        foregroundColor: AppColors.onYellow,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        elevation: 0,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Transactions Header
            Text(
              'Recent Transactions',
              style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: isDark ? AppColors.inkDark : AppColors.inkLight),
            ),
            const SizedBox(height: 12),

            // Transactions List
            if (txs.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 40),
                child: Center(
                  child: Text('No transactions yet', style: TextStyle(color: isDark ? AppColors.mutedDark : AppColors.mutedLight)),
                ),
              )
            else
              ...txs.map((t) => _buildTxTile(t, isDark)),
          ],
        ),
      ),
    );
  }

  Widget _buildTxTile(WalletTxModel tx, bool isDark) {
    final isCredit = tx.amount > 0;
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: (isCredit ? AppColors.success : AppColors.danger).withOpacity(0.14),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                isCredit ? CupertinoIcons.arrow_down_left : CupertinoIcons.arrow_up_right,
                color: isCredit ? AppColors.success : AppColors.danger,
                size: 18,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(tx.title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                  Text(tx.sub, style: TextStyle(fontSize: 12, color: isDark ? AppColors.mutedDark : AppColors.mutedLight)),
                ],
              ),
            ),
            Text(
              '${isCredit ? '+' : ''}₹${tx.amount.abs()}',
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w800,
                color: isCredit ? AppColors.success : (isDark ? AppColors.inkDark : AppColors.inkLight),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
