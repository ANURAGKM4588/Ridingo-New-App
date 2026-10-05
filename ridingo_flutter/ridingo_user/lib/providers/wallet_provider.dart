import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/wallet_tx_model.dart';
import '../services/supabase_service.dart';
import 'auth_provider.dart';

final walletProvider = StateNotifierProvider<WalletNotifier, List<WalletTxModel>>((ref) {
  final user = ref.watch(authProvider).value;
  return WalletNotifier(user?.phone ?? '');
});

final walletBalanceProvider = Provider<int>((ref) {
  final txs = ref.watch(walletProvider);
  return txs.fold<int>(0, (sum, item) => sum + item.amount);
});

class WalletNotifier extends StateNotifier<List<WalletTxModel>> {
  final String userPhone;

  WalletNotifier(this.userPhone) : super([]) {
    if (userPhone.isNotEmpty) {
      loadTransactions();
    }
  }

  Future<void> loadTransactions() async {
    final list = await SupabaseService.fetchWalletTransactions(userPhone);
    state = list;
  }

  Future<void> addFunds(int amount) async {
    final tx = WalletTxModel(
      ts: DateTime.now().millisecondsSinceEpoch,
      type: 'deposit',
      amount: amount,
      title: 'Wallet Top-up',
      sub: 'Instant UPI / NetBanking',
      to: 'Ridingo Balance',
    );

    state = [tx, ...state];
    await SupabaseService.addWalletTransaction(userPhone, tx);
  }

  Future<void> deductAdvance(int advance, String tripId, String catName) async {
    final tx = WalletTxModel(
      ts: DateTime.now().millisecondsSinceEpoch,
      type: 'payment',
      amount: -advance,
      title: 'Advance: ${catName.toUpperCase()} Driver',
      sub: 'Booking ID $tripId · 30% advance',
      to: 'Ridingo Escrow',
    );

    state = [tx, ...state];
    await SupabaseService.addWalletTransaction(userPhone, tx);
  }

  Future<void> refundAdvance(int advance, String tripId) async {
    final tx = WalletTxModel(
      ts: DateTime.now().millisecondsSinceEpoch,
      type: 'refund',
      amount: advance,
      title: 'Advance Refund: $tripId',
      sub: 'Trip cancelled · 100% refund credited',
      to: 'Ridingo Balance',
    );

    state = [tx, ...state];
    await SupabaseService.addWalletTransaction(userPhone, tx);
  }
}
