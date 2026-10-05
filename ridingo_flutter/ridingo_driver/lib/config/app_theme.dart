import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class DriverColors {
  static const Color yellow = Color(0xFFFFC70A);
  static const Color onYellow = Color(0xFF15140F);
  static const Color ground = Color(0xFF0B0B0C);
  static const Color surface = Color(0xFF151518);
  static const Color card = Color(0xFF1C1C20);
  static const Color field = Color(0xFF24242A);
  static const Color ink = Color(0xFFF4F4F6);
  static const Color muted = Color(0xFF909099);
  static const Color line = Color(0xFF2C2C32);
  static const Color success = Color(0xFF27AE60);
  static const Color danger = Color(0xFFEB5757);
}

class DriverTheme {
  static ThemeData get theme {
    return ThemeData(
      brightness: Brightness.dark,
      primaryColor: DriverColors.yellow,
      scaffoldBackgroundColor: DriverColors.ground,
      colorScheme: const ColorScheme.dark(
        primary: DriverColors.yellow,
        onPrimary: DriverColors.onYellow,
        surface: DriverColors.surface,
        onSurface: DriverColors.ink,
        outline: DriverColors.line,
      ),
      textTheme: GoogleFonts.interTextTheme(ThemeData.dark().textTheme).apply(
        bodyColor: DriverColors.ink,
        displayColor: DriverColors.ink,
      ),
      cardTheme: CardTheme(
        color: DriverColors.card,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: DriverColors.line, width: 1),
        ),
      ),
    );
  }
}
