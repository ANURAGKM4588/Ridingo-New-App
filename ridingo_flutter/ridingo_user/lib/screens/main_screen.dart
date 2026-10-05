import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../config/app_theme.dart';
import '../providers/auth_provider.dart';
import '../providers/theme_provider.dart';
import '../providers/trip_provider.dart';
import '../providers/wallet_provider.dart';
import 'home/home_tab.dart';
import 'trips/trips_tab.dart';
import 'wallet/wallet_tab.dart';
import 'profile/profile_tab.dart';

class MainScreen extends ConsumerStatefulWidget {
  const MainScreen({super.key});

  @override
  ConsumerState<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends ConsumerState<MainScreen> {
  int _activeTab = 0;

  final List<Widget> _tabs = const [
    HomeTab(),
    TripsTab(),
    WalletTab(),
    ProfileTab(),
  ];

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      body: IndexedStack(
        index: _activeTab,
        children: _tabs,
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
          border: Border(top: BorderSide(color: isDark ? AppColors.lineDark : AppColors.lineLight, width: 1)),
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _navButton(0, CupertinoIcons.car_fill, 'Rides', isDark),
                _navButton(1, CupertinoIcons.clock_fill, 'Trips', isDark),
                _navButton(2, CupertinoIcons.creditcard_fill, 'Wallet', isDark),
                _navButton(3, CupertinoIcons.person_fill, 'Profile', isDark),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _navButton(int index, IconData icon, String label, bool isDark) {
    final isSelected = _activeTab == index;
    return InkWell(
      onTap: () => setState(() => _activeTab = index),
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 22,
              color: isSelected ? AppColors.yellow : (isDark ? AppColors.mutedDark : AppColors.mutedLight),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                color: isSelected ? (isDark ? AppColors.inkDark : AppColors.inkLight) : (isDark ? AppColors.mutedDark : AppColors.mutedLight),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
