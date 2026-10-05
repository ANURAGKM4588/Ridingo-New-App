import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import '../../config/app_theme.dart';
import 'home/driver_home_tab.dart';
import 'earnings/driver_earnings_tab.dart';
import 'profile/driver_profile_tab.dart';

class MainDriverScreen extends StatefulWidget {
  const MainDriverScreen({super.key});

  @override
  State<MainDriverScreen> createState() => _MainDriverScreenState();
}

class _MainDriverScreenState extends State<MainDriverScreen> {
  int _activeTab = 0;

  final List<Widget> _tabs = const [
    DriverHomeTab(),
    DriverEarningsTab(),
    DriverProfileTab(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _activeTab,
        children: _tabs,
      ),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: DriverColors.surface,
          border: Border(top: BorderSide(color: DriverColors.line, width: 1)),
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _navButton(0, CupertinoIcons.car_fill, 'Trips'),
                _navButton(1, CupertinoIcons.money_dollar_circle_fill, 'Earnings'),
                _navButton(2, CupertinoIcons.person_fill, 'Account'),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _navButton(int index, IconData icon, String label) {
    final isSelected = _activeTab == index;
    return InkWell(
      onTap: () => setState(() => _activeTab = index),
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 6),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 22,
              color: isSelected ? DriverColors.yellow : DriverColors.muted,
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                color: isSelected ? DriverColors.ink : DriverColors.muted,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
