import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'config/app_theme.dart';
import 'screens/main_driver_screen.dart';
import 'services/driver_supabase_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await DriverSupabaseService.initialize();

  runApp(
    const ProviderScope(
      child: RidingoDriverApp(),
    ),
  );
}

class RidingoDriverApp extends StatelessWidget {
  const RidingoDriverApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Ridingo Driver',
      debugShowCheckedModeBanner: false,
      theme: DriverTheme.theme,
      home: const MainDriverScreen(),
    );
  }
}
